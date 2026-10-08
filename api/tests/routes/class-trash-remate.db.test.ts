import { it, expect, vi, beforeAll, afterAll, beforeEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

/**
 * Remate de la papelera de clases: el aviso de cortesía a quien tiene la
 * propiedad unos días antes de la purga (una sola vez por envío, en su plazo,
 * nunca de una clase restaurada) y el respaldo de la administración, que ve la
 * papelera de toda la instancia y restaura o borra ya clases ajenas, con su
 * rastro en el registro de la clase y en el del sistema.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Solo se simula lo que sale de la máquina.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

// Los de verdad, salvo cuando una prueba se mete en medio del aviso.
vi.mock('../../src/modules/notifications/notifications.service.js', async importOriginal => {
  const original =
    await importOriginal<typeof import('../../src/modules/notifications/notifications.service.js')>()
  return { ...original, notifyMany: vi.fn(original.notifyMany) }
})

vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  deleteUpload: vi.fn(async () => true),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { runJobNow } from '../../src/utils/scheduler.js'
import { sendNotificationEmail } from '../../src/utils/email.js'
import { notifyMany } from '../../src/modules/notifications/notifications.service.js'
import {
  CLASS_TRASH_WARNING_DAYS,
  registerClassTrashJobs,
  runClassTrashWarnings,
} from '../../src/modules/teachers/class-trash.jobs.js'
import { CLASS_TRASH_DAYS, restoreClass } from '../../src/modules/teachers/class-trash.service.js'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

describeWithDatabase('remate de la papelera de clases', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = `remate${randomUUID().slice(0, 6)}`
  const extraUsers: string[] = []
  let admin: { id: string; token: string }
  /** Propietaria con un correo al que sí se escribe. */
  let mailOwner: { id: string; token: string }
  let coAdmin: { id: string; token: string }

  const newUser = async (label: string, role: 'teacher' | 'admin', email?: string) => {
    const user = await prisma.user.create({
      data: {
        email: email ?? `${label}.${randomUUID().slice(0, 6)}@test.invalid`,
        passwordHash: 'x',
        name: `${label} ${tag}`,
        role,
        isOnboarded: true,
      },
    })
    extraUsers.push(user.id)
    return { id: user.id, token: app.jwt.sign({ id: user.id, role }) }
  }

  /** Clase nueva; con `trashedAgo` (ms), en la papelera desde hace tanto. */
  const newClass = async (
    name: string,
    { ownerId = f.users.owner.id, trashedAgo }: { ownerId?: string; trashedAgo?: number } = {}
  ) => {
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        {
          name: `${name} ${tag}`,
          invitationCode: randomUUID().slice(0, 6).toUpperCase(),
        },
        ownerId
      )
    )
    if (trashedAgo !== undefined) await trashSince(cls.id, trashedAgo, ownerId)
    return cls.id
  }

  const trashSince = (classId: string, ago: number, by = f.users.owner.id) =>
    prisma.class.update({
      where: { id: classId },
      data: {
        deletedAt: new Date(Date.now() - ago),
        deletedById: by,
        archived: true,
      },
    })

  const warnings = (classId: string) =>
    prisma.notification.findMany({
      where: {
        type: 'class_purge_soon',
        metadata: { path: ['classId'], equals: classId },
      },
    })

  const send = (method: 'GET' | 'POST', url: string, token: string) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` } })

  /** Ya dentro del plazo del aviso, con una hora de margen. */
  const IN_WINDOW = (CLASS_TRASH_DAYS - CLASS_TRASH_WARNING_DAYS) * DAY + HOUR

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
    f = await createClassFixture(app)
    admin = await newUser('admin', 'admin')
    mailOwner = await newUser('mail-owner', 'teacher', `mail-owner.${tag}@example.org`)
    coAdmin = await newUser('co-admin', 'teacher')
    registerClassTrashJobs()
  })

  beforeEach(() => {
    vi.mocked(sendNotificationEmail).mockClear()
  })

  afterAll(async () => {
    await prisma.class.deleteMany({ where: { teacherId: { in: extraUsers } } })
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await app?.close()
  })

  describe('aviso antes de la purga', () => {
    it('avisa una vez a quien tiene la propiedad, con el enlace a la papelera y su correo', async () => {
      const classId = await newClass('Aviso', {
        ownerId: mailOwner.id,
        trashedAgo: IN_WINDOW,
      })
      // Quien imparte la clase con administración no puede restaurarla: no se le avisa.
      await prisma.classTeacher.create({
        data: {
          classId,
          userId: coAdmin.id,
          access: 'admin',
          profile: 'titular',
          addedById: mailOwner.id,
        },
      })

      await runJobNow('class-trash-warning')

      const sent = await warnings(classId)
      expect(sent).toHaveLength(1)
      const [notice] = sent
      expect(notice).toMatchObject({
        userId: mailOwner.id,
        priority: 'high',
        actionUrl: '/profesor/clases/papelera',
        metadata: { classId, dedupeKey: `class-trash:${classId}` },
      })
      // El título es genérico; el nombre de la clase va en el mensaje.
      expect(notice!.title).toBe('Una clase de tu papelera se borrará pronto')
      expect(notice!.message).toContain(`«Aviso ${tag}»`)
      // La fecha de la purga, escrita y en hora de Madrid.
      const purgeAt = new Date(Date.now() - IN_WINDOW + CLASS_TRASH_DAYS * DAY)
      const date = new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'long',
        timeZone: 'Europe/Madrid',
      }).format(purgeAt)
      expect(notice!.message).toContain(date)
      expect(notice!.expiresAt?.getTime()).toBeCloseTo(purgeAt.getTime(), -4)

      const mails = vi
        .mocked(sendNotificationEmail)
        .mock.calls.filter(([to]) => to === `mail-owner.${tag}@example.org`)
      expect(mails).toHaveLength(1)
      expect(mails[0]![2]).toMatchObject({ actionLabel: 'Ver la papelera' })
      expect(String(mails[0]![2].actionUrl)).toMatch(/\/profesor\/clases\/papelera$/)

      const cls = await prisma.class.findUniqueOrThrow({
        where: { id: classId },
      })
      expect(cls.trashWarnedAt).not.toBeNull()
    })

    it('no repite: ni en la pasada siguiente ni aunque se borre la notificación', async () => {
      const classId = await newClass('Una vez', { trashedAgo: IN_WINDOW })
      await runJobNow('class-trash-warning')
      await runJobNow('class-trash-warning')
      expect(await warnings(classId)).toHaveLength(1)

      await prisma.notification.deleteMany({
        where: {
          type: 'class_purge_soon',
          metadata: { path: ['classId'], equals: classId },
        },
      })
      await runJobNow('class-trash-warning')
      expect(await warnings(classId)).toHaveLength(0)
    })

    it('solo en su plazo: ni antes ni cuando ya toca purgarla', async () => {
      const early = await newClass('Pronto', {
        trashedAgo: (CLASS_TRASH_DAYS - CLASS_TRASH_WARNING_DAYS) * DAY - HOUR,
      })
      const fresh = await newClass('Recién', { trashedAgo: DAY })
      const live = await newClass('Viva')

      await runJobNow('class-trash-warning')

      for (const classId of [early, fresh, live]) {
        expect(await warnings(classId), classId).toHaveLength(0)
        const cls = await prisma.class.findUniqueOrThrow({
          where: { id: classId },
        })
        expect(cls.trashWarnedAt).toBeNull()
      }

      // La vencida, con el reloj de la tarea adelantado y no con una clase
      // vencida de verdad, que la purga de otra prueba se llevaría a la vez.
      // En ese futuro, el plazo del aviso solo cubre clases que aún no existen.
      const later = new Date(Date.now() + CLASS_TRASH_DAYS * DAY + HOUR)
      await runClassTrashWarnings({ now: later })
      expect(await warnings(fresh)).toHaveLength(0)
      expect(
        (await prisma.class.findUniqueOrThrow({ where: { id: fresh } })).trashWarnedAt
      ).toBeNull()
    })

    it('a una propietaria con la cuenta sin acceso no se le avisa ni se marca; si vuelve a tiempo, sí', async () => {
      const suspended = await newUser('cuenta-sin-acceso', 'teacher')
      const classId = await newClass('Sin acceso', {
        ownerId: suspended.id,
        trashedAgo: IN_WINDOW,
      })
      await prisma.user.update({ where: { id: suspended.id }, data: { status: 'suspended' } })
      // Y una sin nadie con la propiedad.
      const ownerless = await newClass('Sin propiedad', { trashedAgo: IN_WINDOW })
      await prisma.classTeacher.deleteMany({ where: { classId: ownerless } })

      await runJobNow('class-trash-warning')
      for (const id of [classId, ownerless]) {
        expect(await warnings(id), id).toHaveLength(0)
        expect((await prisma.class.findUniqueOrThrow({ where: { id } })).trashWarnedAt).toBeNull()
      }

      await prisma.user.update({ where: { id: suspended.id }, data: { status: 'active' } })
      await runJobNow('class-trash-warning')
      const sent = await warnings(classId)
      expect(sent.map(n => n.userId)).toEqual([suspended.id])
      await prisma.class.delete({ where: { id: ownerless } })
    })

    it('si la restauran mientras se avisa, el aviso recién creado se quita', async () => {
      const classId = await newClass('Restaurada en medio', { trashedAgo: IN_WINDOW })
      const original = vi.mocked(notifyMany).getMockImplementation()!
      // Restaurar justo después de la marca y antes del aviso: no ve nada que quitar.
      vi.mocked(notifyMany).mockImplementation(async inputs => {
        if (inputs.some(input => input.metadata?.classId === classId)) {
          await restoreClass({ id: f.users.owner.id, role: 'teacher' }, classId)
        }
        return original(inputs)
      })
      try {
        await runJobNow('class-trash-warning')
      } finally {
        vi.mocked(notifyMany).mockImplementation(original)
      }

      expect(await warnings(classId)).toHaveLength(0)
      const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } })
      expect(cls.deletedAt).toBeNull()
      expect(cls.trashWarnedAt).toBeNull()

      // Y el siguiente envío se avisa: la clave quedó libre.
      await trashSince(classId, IN_WINDOW)
      await runJobNow('class-trash-warning')
      expect(await warnings(classId)).toHaveLength(1)
    })

    it('una clase restaurada no se avisa, y su aviso de antes se quita', async () => {
      const restoredFirst = await newClass('Restaurada', {
        trashedAgo: IN_WINDOW,
      })
      const res = await send('POST', `/teacher/classes/${restoredFirst}/restore`, f.token('owner'))
      expect(res.statusCode).toBe(200)
      await runJobNow('class-trash-warning')
      expect(await warnings(restoredFirst)).toHaveLength(0)

      // Avisada y restaurada después: el aviso ya no es verdad y se va.
      const warned = await newClass('Avisada', { trashedAgo: IN_WINDOW })
      await runJobNow('class-trash-warning')
      expect(await warnings(warned)).toHaveLength(1)
      expect(
        (await send('POST', `/teacher/classes/${warned}/restore`, f.token('owner'))).statusCode
      ).toBe(200)
      expect(await warnings(warned)).toHaveLength(0)
      const cls = await prisma.class.findUniqueOrThrow({
        where: { id: warned },
      })
      expect(cls.trashWarnedAt).toBeNull()
    })

    it('si vuelve a la papelera, se avisa de nuevo', async () => {
      const classId = await newClass('Otra vez')
      // Primer envío por la ruta, que deja la marca a cero; se adelanta su fecha.
      expect(
        (
          await app.inject({
            method: 'DELETE',
            url: `/teacher/classes/${classId}`,
            headers: { authorization: `Bearer ${f.token('owner')}` },
          })
        ).statusCode
      ).toBe(200)
      await trashSince(classId, IN_WINDOW)
      await runJobNow('class-trash-warning')
      expect(await warnings(classId)).toHaveLength(1)

      await send('POST', `/teacher/classes/${classId}/restore`, f.token('owner'))
      await app.inject({
        method: 'DELETE',
        url: `/teacher/classes/${classId}`,
        headers: { authorization: `Bearer ${f.token('owner')}` },
      })
      expect(
        (await prisma.class.findUniqueOrThrow({ where: { id: classId } })).trashWarnedAt
      ).toBeNull()
      await trashSince(classId, IN_WINDOW)
      await runJobNow('class-trash-warning')
      expect(await warnings(classId)).toHaveLength(1)
    })

    it('la purga se lleva el aviso con la clase', async () => {
      const classId = await newClass('Purgada', { trashedAgo: IN_WINDOW })
      await runJobNow('class-trash-warning')
      expect(await warnings(classId)).toHaveLength(1)
      expect(
        (await send('POST', `/teacher/classes/${classId}/purge`, f.token('owner'))).statusCode
      ).toBe(200)
      expect(await warnings(classId)).toHaveLength(0)
    })
  })

  describe('papelera de la administración', () => {
    it('solo la administración la ve, restaura y borra: el profesorado, 403', async () => {
      const classId = await newClass('Ajena', { trashedAgo: DAY })
      for (const [method, url] of [
        ['GET', '/admin/classes/trash'],
        ['GET', `/admin/classes/${classId}/deletion-impact`],
        ['POST', `/admin/classes/${classId}/restore`],
        ['POST', `/admin/classes/${classId}/purge`],
      ] as const) {
        expect((await send(method, url, f.token('owner'))).statusCode, `${method} ${url}`).toBe(403)
        expect((await send(method, url, f.token('student'))).statusCode, `${method} ${url}`).toBe(
          403
        )
      }
      const cls = await prisma.class.findUniqueOrThrow({
        where: { id: classId },
      })
      expect(cls.deletedAt).not.toBeNull()
    })

    it('lista las clases en la papelera de toda la instancia, la que antes se borra primero, y dice si la propietaria puede actuar', async () => {
      const older = await newClass('Antigua', { trashedAgo: 20 * DAY })
      const newer = await newClass('Nueva', { trashedAgo: 2 * DAY })
      const orphanOwner = await newUser('suspendida', 'teacher')
      const orphan = await newClass('Huérfana', {
        ownerId: orphanOwner.id,
        trashedAgo: 5 * DAY,
      })
      await prisma.user.update({
        where: { id: orphanOwner.id },
        data: { status: 'suspended' },
      })
      const live = await newClass('Viva')

      const res = await send('GET', `/admin/classes/trash?search=${tag}&limit=100`, admin.token)
      expect(res.statusCode).toBe(200)
      const body = res.json()
      const ids = body.classes.map((c: { id: string }) => c.id)
      expect(ids).not.toContain(live)
      expect(ids.indexOf(older)).toBeLessThan(ids.indexOf(orphan))
      expect(ids.indexOf(orphan)).toBeLessThan(ids.indexOf(newer))
      expect(body.purgeDays).toBe(CLASS_TRASH_DAYS)

      const byId = new Map(body.classes.map((c: { id: string }) => [c.id, c]))
      const ownerName = (await prisma.user.findUniqueOrThrow({ where: { id: f.users.owner.id } }))
        .name
      expect(byId.get(older)).toMatchObject({
        ownerName,
        ownerCanAct: true,
        daysLeft: CLASS_TRASH_DAYS - 20,
        studentCount: 0,
        missionCount: 0,
      })
      expect(byId.get(orphan)).toMatchObject({
        ownerName: `suspendida ${tag}`,
        ownerCanAct: false,
      })

      // Se busca también por la persona propietaria.
      const byOwner = await send(
        'GET',
        `/admin/classes/trash?search=suspendida ${tag}`,
        admin.token
      )
      expect(byOwner.json().classes.map((c: { id: string }) => c.id)).toEqual([orphan])
      // Las de la papelera siguen fuera del listado de clases.
      const listed = await send('GET', `/admin/classes?search=${tag}&limit=100`, admin.token)
      const listedIds = listed.json().classes.map((c: { id: string }) => c.id)
      expect(listedIds).toContain(live)
      expect(listedIds).not.toContain(orphan)
    })

    it('restaura una clase ajena: vuelve archivada, con su rastro en el registro de la clase y en el del sistema', async () => {
      const classId = await newClass('Rescatada', { trashedAgo: IN_WINDOW })
      await runJobNow('class-trash-warning')

      const impact = await send('GET', `/admin/classes/${classId}/deletion-impact`, admin.token)
      expect(impact.statusCode).toBe(200)
      expect(impact.json()).toMatchObject({ classId, inTrash: true })

      const res = await send('POST', `/admin/classes/${classId}/restore`, admin.token)
      expect(res.statusCode).toBe(200)
      expect(res.json().class).toMatchObject({
        id: classId,
        archived: true,
        isTemplate: false,
      })

      const cls = await prisma.class.findUniqueOrThrow({
        where: { id: classId },
      })
      expect(cls.deletedAt).toBeNull()
      expect(await warnings(classId)).toHaveLength(0)

      const log = await prisma.classActionLog.findFirstOrThrow({
        where: { classId, action: 'class.restored' },
      })
      expect(log.actorId).toBe(admin.id)
      expect(log.metadata).toMatchObject({ byPlatformAdmin: true })
      const system = await prisma.systemLog.findMany({
        where: {
          service: 'class-trash',
          metadata: { path: ['classId'], equals: classId },
        },
      })
      expect(system).toHaveLength(1)
      expect(system[0]!.metadata).toMatchObject({ classId, actorId: admin.id })

      // Fuera de la papelera, otra vez: 409.
      expect(
        (await send('POST', `/admin/classes/${classId}/restore`, admin.token)).statusCode
      ).toBe(409)
    })

    it('la propietaria que restaura no deja rastro en el registro del sistema', async () => {
      const classId = await newClass('Propia', { trashedAgo: DAY })
      expect(
        (await send('POST', `/teacher/classes/${classId}/restore`, f.token('owner'))).statusCode
      ).toBe(200)
      const system = await prisma.systemLog.findMany({
        where: {
          service: 'class-trash',
          metadata: { path: ['classId'], equals: classId },
        },
      })
      expect(system).toHaveLength(0)
    })

    it('borra ya una clase ajena, aunque su propietaria no pueda actuar, y lo apunta en el registro del sistema', async () => {
      const orphanOwner = await newUser('inactiva', 'teacher')
      const classId = await newClass('Borrada', {
        ownerId: orphanOwner.id,
        trashedAgo: DAY,
      })
      await prisma.user.update({
        where: { id: orphanOwner.id },
        data: { status: 'inactive' },
      })

      const res = await send('POST', `/admin/classes/${classId}/purge`, admin.token)
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ purged: true, classId })
      expect(await prisma.class.findUnique({ where: { id: classId } })).toBeNull()

      const system = await prisma.systemLog.findFirstOrThrow({
        where: {
          service: 'class-trash',
          metadata: { path: ['classId'], equals: classId },
        },
      })
      expect(system.metadata).toMatchObject({
        reason: 'admin',
        actorId: admin.id,
        byPlatformAdmin: true,
      })
    })

    it('no borra ni restaura lo que no está en la papelera, ni lo que no existe', async () => {
      const live = await newClass('Intacta')
      expect((await send('POST', `/admin/classes/${live}/purge`, admin.token)).statusCode).toBe(409)
      expect((await send('POST', `/admin/classes/${live}/restore`, admin.token)).statusCode).toBe(
        409
      )
      expect(await prisma.class.findUnique({ where: { id: live } })).not.toBeNull()
      const ghost = randomUUID()
      expect((await send('POST', `/admin/classes/${ghost}/purge`, admin.token)).statusCode).toBe(
        404
      )
      expect((await send('POST', `/admin/classes/${ghost}/restore`, admin.token)).statusCode).toBe(
        404
      )
    })
  })
})
