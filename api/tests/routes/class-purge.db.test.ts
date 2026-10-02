import { it, expect, vi, beforeAll, afterAll, beforeEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

/**
 * Purga de la papelera de clases: la tarea programada, «Borrar ya» y el borrado
 * de una cuenta con clases en la papelera, que comparten la misma rutina. Que
 * se va todo lo de la clase (también lo que no tiene clave ajena: avisos,
 * historial, conversaciones, e insignias de sus misiones con las ganadas), que
 * las cuentas sin correo siguen la regla de quitar a un alumno, que los
 * ficheros compartidos con otra clase se quedan, que la tarea solo toca lo
 * vencido, que una segunda pasada no hace nada y que una clase restaurada a
 * tiempo no se purga.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). El borrado de ficheros se simula: no se toca
 * ninguno de verdad.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendPasswordChangedEmail: vi.fn(async () => {}),
  sendNotificationEmail: vi.fn(async () => {}),
}))

vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => {
  const original =
    await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()
  return {
    ...original,
    saveUpload: vi.fn(async (path: string) => `/uploads/${path}`),
    deleteUpload: vi.fn(async () => true),
    // Los de verdad, salvo cuando una prueba los cambia.
    uploadResolver: vi.fn(original.uploadResolver),
    publicUploadResolver: vi.fn(original.publicUploadResolver),
  }
})

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { profileRoutes } from '../../src/modules/profile/profile.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import {
  deleteUpload,
  publicUploadResolver,
  uploadResolver,
} from '../../src/modules/storage/storage.service.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { hashPassword } from '../../src/utils/password.js'
import { resetRateLimits } from '../../src/utils/rate-limit.js'
import { runJobNow } from '../../src/utils/scheduler.js'
import { registerClassTrashJobs } from '../../src/modules/teachers/class-trash.jobs.js'
import {
  purgeClassInTx,
  purgeTrashedClass,
} from '../../src/modules/teachers/class-purge.service.js'
import { CLASS_TRASH_DAYS, restoreClass } from '../../src/modules/teachers/class-trash.service.js'

const DAY = 24 * 60 * 60 * 1000
const PASSWORD = 'contraseña-de-prueba'

type Level = 'read' | 'edit' | 'admin'
const PROFILE = { read: 'practicas', edit: 'sustituto', admin: 'titular' } as const

describeWithDatabase('purga de la papelera de clases', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = `purga${randomUUID().slice(0, 6)}`
  /** Cuentas creadas aquí, que la fixture no conoce. */
  const extraUsers: string[] = []
  let passwordHash: string

  const unique = () => randomUUID()

  const newUser = async (
    label: string,
    role: 'teacher' | 'student' | 'admin',
    data: { accountType?: 'managed'; homeClassId?: string } = {}
  ) => {
    const user = await prisma.user.create({
      data: {
        ...(data.accountType ? { username: `${label}-${unique().slice(0, 8)}` } : {}),
        email: data.accountType ? null : `${label}.${unique().slice(0, 8)}@test.invalid`,
        passwordHash,
        name: `${label} ${tag}`,
        role,
        isOnboarded: true,
        ...data,
      },
    })
    extraUsers.push(user.id)
    return { id: user.id, role, name: user.name, token: app.jwt.sign({ id: user.id, role }) }
  }

  /** Clase nueva de `ownerId`; con `trashedDaysAgo`, en la papelera desde hace tantos días. */
  const newClass = async (
    name: string,
    {
      ownerId = f.users.owner.id,
      trashedDaysAgo,
      backgroundImage,
    }: {
      ownerId?: string
      trashedDaysAgo?: number
      backgroundImage?: string
    } = {}
  ) => {
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        {
          name: `${name} ${tag}`,
          invitationCode: unique().slice(0, 6).toUpperCase(),
          backgroundImage,
        },
        ownerId
      )
    )
    if (trashedDaysAgo !== undefined) {
      await prisma.class.update({
        where: { id: cls.id },
        data: {
          deletedAt: new Date(Date.now() - trashedDaysAgo * DAY),
          deletedById: ownerId,
          archived: true,
        },
      })
    }
    return cls.id
  }

  const send = (method: 'GET' | 'POST' | 'DELETE', url: string, token: string, payload?: object) =>
    app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } })

  const purgeLogs = (classId: string) =>
    prisma.systemLog.findMany({
      where: { category: 'maintenance', metadata: { path: ['classId'], equals: classId } },
      orderBy: { createdAt: 'asc' },
    })

  const deletedFiles = () => vi.mocked(deleteUpload).mock.calls.map(([url]) => url)

  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD)
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(profileRoutes, { prefix: '/profile' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
    f = await createClassFixture(app)
    registerClassTrashJobs()
  })

  beforeEach(() => {
    vi.mocked(deleteUpload).mockClear()
    vi.mocked(deleteUpload).mockImplementation(async () => true)
    resetRateLimits()
  })

  afterAll(async () => {
    await f?.cleanup()
    // Clases que han pasado a cuentas de aquí (un traspaso al borrar una cuenta).
    await prisma.studentBadge.deleteMany({ where: { badge: { teacherId: { in: extraUsers } } } })
    await prisma.badge.deleteMany({ where: { teacherId: { in: extraUsers } } })
    await prisma.class.deleteMany({ where: { teacherId: { in: extraUsers } } })
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await app?.close()
  })

  describe('la tarea programada', () => {
    it('purga la clase vencida entera, deja la que aún no y respeta lo que comparte otra clase', async () => {
      const files = {
        classCover: `/uploads/covers/${unique()}.png`,
        missionCover: `/uploads/ai-generated/covers/covers-${unique()}.png`,
        sharedCover: `/uploads/covers/${unique()}.png`,
        ownDocument: `/uploads/documents/${unique()}.pdf`,
        sharedDocument: `/uploads/documents/${unique()}.pdf`,
        submission: `/uploads/submissions/${unique()}.pdf`,
        // Una portada que apunta a una imagen de otra carpeta no es de la clase.
        foreignImage: `/uploads/help/${unique()}.png`,
      }

      const expired = await newClass('Vencida', {
        trashedDaysAgo: CLASS_TRASH_DAYS + 1,
        backgroundImage: files.classCover,
      })
      const notYet = await newClass('Aún no', { trashedDaysAgo: CLASS_TRASH_DAYS - 1 })
      // La copia (duplicada o importada): comparte portada y documento.
      const copy = await newClass('Copia', { backgroundImage: files.sharedCover })

      const mission = await prisma.mission.create({
        data: { classId: expired, title: 'Misión', backgroundImage: files.missionCover },
      })
      const sharedMission = await prisma.mission.create({
        data: { classId: expired, title: 'Compartida', backgroundImage: files.sharedCover },
      })
      const otherMission = await prisma.mission.create({
        data: { classId: expired, title: 'Ajena', backgroundImage: files.foreignImage },
      })
      const copyMission = await prisma.mission.create({
        data: { classId: copy, title: 'Importada' },
      })
      const document = (missionId: string, fileUrl: string) =>
        prisma.missionDocument.create({
          data: {
            missionId,
            name: 'Apuntes',
            fileUrl,
            fileName: 'apuntes.pdf',
            fileSize: 10,
            mimeType: 'application/pdf',
          },
        })
      await document(mission.id, files.ownDocument)
      await document(sharedMission.id, files.sharedDocument)
      await document(copyMission.id, files.sharedDocument)

      // Alumnado: uno con correo y entrega; dos cuentas sin correo nacidas aquí.
      const student = await newUser('alumna', 'student')
      const unusedAccount = await newUser('sin-usar', 'student', {
        accountType: 'managed',
        homeClassId: expired,
      })
      const usedAccount = await newUser('usada', 'student', {
        accountType: 'managed',
        homeClassId: expired,
      })
      for (const id of [student.id, unusedAccount.id, usedAccount.id]) {
        await prisma.classEnrollment.create({ data: { classId: expired, studentId: id } })
      }
      // La usada inició sesión alguna vez y además está en otra clase.
      await prisma.refreshToken.create({
        data: { token: unique(), userId: usedAccount.id, expiresAt: new Date(Date.now() + DAY) },
      })
      await prisma.classEnrollment.create({ data: { classId: copy, studentId: usedAccount.id } })

      const enigma = await prisma.missionEnigma.create({
        data: { missionId: mission.id, title: 'Enigma', xpReward: 10 },
      })
      const submission = await prisma.enigmaSubmission.create({
        data: { enigmaId: enigma.id, studentId: student.id, fileUrl: files.submission },
      })
      const item = await prisma.shopItem.create({ data: { classId: expired, name: 'P', price: 1 } })
      await prisma.shopPurchase.create({
        data: { classId: expired, itemId: item.id, studentId: student.id, price: 1, itemName: 'P' },
      })

      // Insignia de una misión, ganada.
      const badge = await prisma.badge.create({
        data: { name: 'Insignia', teacherId: f.users.owner.id, missionId: mission.id },
      })
      await prisma.studentBadge.create({ data: { studentId: student.id, badgeId: badge.id } })

      // Sin clave ajena: avisos, historial y conversaciones.
      const notice = (userId: string, metadata: Record<string, string>) =>
        prisma.notification.create({
          data: { userId, type: 'system_announcement', title: 'Aviso', message: 'Aviso', metadata },
        })
      await notice(student.id, { classId: expired })
      await notice(student.id, { missionId: mission.id })
      await notice(f.users.owner.id, { submissionId: submission.id })
      const keptNotice = await notice(student.id, { classId: copy })
      await prisma.activity.create({
        data: { userId: student.id, type: 'class_joined', description: 'Entra', classId: expired },
      })
      const keptActivity = await prisma.activity.create({
        data: { userId: student.id, type: 'class_joined', description: 'Entra', classId: copy },
      })
      await prisma.chatConversation.create({
        data: { userId: student.id, assistantId: 'atenea', classId: expired },
      })
      await prisma.chatConversation.create({
        data: { userId: f.users.owner.id, assistantId: 'atenea', missionId: mission.id },
      })
      const keptChat = await prisma.chatConversation.create({
        data: { userId: student.id, assistantId: 'atenea', classId: copy },
      })

      const result = await runJobNow('class-trash-purge')
      expect(result).toMatchObject({ filesFailed: 0, failed: 0 })
      expect((result as { purged: number }).purged).toBeGreaterThanOrEqual(1)

      // La vencida no está; la que aún no y la copia, sí.
      expect(await prisma.class.findUnique({ where: { id: expired } })).toBeNull()
      expect(await prisma.class.findUnique({ where: { id: notYet } })).not.toBeNull()
      expect(await prisma.class.findUnique({ where: { id: copy } })).not.toBeNull()

      // Lo de la cascada.
      expect(await prisma.mission.count({ where: { classId: expired } })).toBe(0)
      expect(await prisma.enigmaSubmission.count({ where: { id: submission.id } })).toBe(0)
      expect(await prisma.classEnrollment.count({ where: { classId: expired } })).toBe(0)
      expect(await prisma.shopPurchase.count({ where: { classId: expired } })).toBe(0)
      expect(await prisma.classTeacher.count({ where: { classId: expired } })).toBe(0)

      // Lo que va a mano: insignias con las ganadas, avisos, historial y conversaciones.
      expect(await prisma.badge.findUnique({ where: { id: badge.id } })).toBeNull()
      expect(await prisma.studentBadge.count({ where: { badgeId: badge.id } })).toBe(0)
      const left = await prisma.notification.findMany({
        where: { userId: { in: [student.id, f.users.owner.id] } },
        select: { id: true },
      })
      expect(left.map(n => n.id)).toEqual([keptNotice.id])
      expect(
        (await prisma.activity.findMany({ where: { userId: student.id } })).map(a => a.id)
      ).toEqual([keptActivity.id])
      expect(
        (
          await prisma.chatConversation.findMany({
            where: { userId: { in: [student.id, f.users.owner.id] } },
          })
        ).map(c => c.id)
      ).toEqual([keptChat.id])

      // Cuentas sin correo: la que nunca se usó, entera; la usada, sin clase de origen.
      expect(await prisma.user.findUnique({ where: { id: unusedAccount.id } })).toBeNull()
      const used = await prisma.user.findUniqueOrThrow({ where: { id: usedAccount.id } })
      expect(used.homeClassId).toBeNull()
      expect(await prisma.classEnrollment.count({ where: { studentId: used.id } })).toBe(1)
      // La cuenta con correo sigue, sin la clase.
      expect(await prisma.user.findUnique({ where: { id: student.id } })).not.toBeNull()

      // Ficheros: la entrega y lo que solo usaba ella; lo compartido y lo ajeno, no.
      const deleted = deletedFiles()
      expect(deleted).toEqual(
        expect.arrayContaining([
          files.submission,
          files.ownDocument,
          files.classCover,
          files.missionCover,
        ])
      )
      expect(deleted).not.toContain(files.sharedCover)
      expect(deleted).not.toContain(files.sharedDocument)
      expect(deleted).not.toContain(files.foreignImage)
      expect((await prisma.class.findUniqueOrThrow({ where: { id: copy } })).backgroundImage).toBe(
        files.sharedCover
      )
      expect(await prisma.missionDocument.count({ where: { fileUrl: files.sharedDocument } })).toBe(
        1
      )

      // El rastro: en el registro del sistema, con números y sin nombres.
      const [log, ...more] = await purgeLogs(expired)
      expect(more).toHaveLength(0)
      expect(log).toMatchObject({ level: 'info', service: 'class-trash' })
      expect(log!.metadata).toMatchObject({
        classId: expired,
        reason: 'expired',
        students: 3,
        missions: 3,
        submissions: 1,
        documents: 2,
        shopPurchases: 1,
        badges: 1,
        studentBadges: 1,
        notifications: 3,
        activities: 1,
        conversations: 2,
        managedAccountsDeleted: 1,
        managedAccountsUnmanaged: 1,
      })
      const written = JSON.stringify(log)
      for (const name of [student.name, unusedAccount.name, usedAccount.name, tag]) {
        expect(written).not.toContain(name)
      }
      void otherMission

      // Segunda pasada: no queda nada vencido de esta prueba, no hace nada.
      vi.mocked(deleteUpload).mockClear()
      expect(await runJobNow('class-trash-purge')).toEqual({ purged: 0, filesFailed: 0, failed: 0 })
      expect(deleteUpload).not.toHaveBeenCalled()
      expect(await purgeLogs(expired)).toHaveLength(1)
      expect(await prisma.class.findUnique({ where: { id: notYet } })).not.toBeNull()

      await prisma.class.deleteMany({ where: { id: { in: [notYet, copy] } } })
    })

    it('una clase restaurada entre la búsqueda y la purga no se purga', async () => {
      const cls = await newClass('Restaurada a tiempo', { trashedDaysAgo: CLASS_TRASH_DAYS + 2 })
      const cutoff = new Date(Date.now() - CLASS_TRASH_DAYS * DAY)
      // La tarea ya la ha encontrado; la restauran antes de que llegue a ella.
      await restoreClass({ id: f.users.owner.id, role: 'teacher' }, cls)

      expect(await purgeTrashedClass(cls, { reason: 'expired', olderThan: cutoff })).toBeNull()
      const kept = await prisma.class.findUniqueOrThrow({ where: { id: cls } })
      expect(kept.deletedAt).toBeNull()
      expect(await purgeLogs(cls)).toHaveLength(0)

      // Y una que aún no ha vencido tampoco, aunque se le pida.
      await prisma.class.update({ where: { id: cls }, data: { deletedAt: new Date() } })
      expect(await purgeTrashedClass(cls, { reason: 'expired', olderThan: cutoff })).toBeNull()
      expect(await prisma.class.findUnique({ where: { id: cls } })).not.toBeNull()
      await prisma.class.delete({ where: { id: cls } })
    })

    it('cuenta los ficheros que no se han podido borrar y lo deja en el registro', async () => {
      const cover = `/uploads/covers/${unique()}.png`
      const cls = await newClass('Almacenamiento caído', {
        trashedDaysAgo: CLASS_TRASH_DAYS + 3,
        backgroundImage: cover,
      })
      const mission = await prisma.mission.create({ data: { classId: cls, title: 'M' } })
      const enigma = await prisma.missionEnigma.create({
        data: { missionId: mission.id, title: 'E' },
      })
      const submission = `/uploads/submissions/${unique()}.pdf`
      await prisma.enigmaSubmission.create({
        data: { enigmaId: enigma.id, studentId: f.users.student.id, fileUrl: submission },
      })
      // Uno falla diciendo que no ha podido y otro lanzando.
      vi.mocked(deleteUpload).mockImplementation(async url => {
        if (url === cover) return false
        if (url === submission) throw new Error('almacenamiento caído')
        return true
      })

      const result = await runJobNow('class-trash-purge')
      expect(result).toMatchObject({ filesFailed: 2, failed: 0 })
      expect(await prisma.class.findUnique({ where: { id: cls } })).toBeNull()
      const logs = await purgeLogs(cls)
      expect(logs.map(l => l.level)).toEqual(['info', 'warning'])
      expect(logs[1]!.metadata).toMatchObject({ classId: cls, filesFailed: 2 })
      // Con sus claves, para limpiarlos a mano: la clase ya no está.
      const failedKeys = (logs[1]!.metadata as { failedKeys: string[] }).failedKeys
      expect([...failedKeys].sort()).toEqual(
        [submission, cover].map(url => url.replace('/uploads/', '')).sort()
      )
    })

    it('si la fase de ficheros falla entera, la clase cuenta como purgada y quedan sus claves', async () => {
      const cover = `/uploads/ai-generated/covers/covers-${unique()}.png`
      const cls = await newClass('Ajustes caídos', {
        trashedDaysAgo: CLASS_TRASH_DAYS + 4,
        backgroundImage: cover,
      })
      const mission = await prisma.mission.create({ data: { classId: cls, title: 'M' } })
      const enigma = await prisma.missionEnigma.create({
        data: { missionId: mission.id, title: 'E' },
      })
      const submission = `/uploads/submissions/${unique()}.pdf`
      await prisma.enigmaSubmission.create({
        data: { enigmaId: enigma.id, studentId: f.users.student.id, fileUrl: submission },
      })
      // Falla al leer la configuración, ya confirmada la purga.
      vi.mocked(uploadResolver).mockRejectedValueOnce(new Error('fallo leyendo ajustes'))

      const result = await runJobNow('class-trash-purge')
      expect(result).toMatchObject({ failed: 0, filesFailed: 2 })
      expect((result as { purged: number }).purged).toBeGreaterThanOrEqual(1)
      expect(await prisma.class.findUnique({ where: { id: cls } })).toBeNull()
      expect(deleteUpload).not.toHaveBeenCalled()
      const logs = await purgeLogs(cls)
      expect(logs.map(l => l.level)).toEqual(['info', 'warning'])
      const metadata = logs[1]!.metadata as { failedKeys: string[] }
      expect(metadata).toMatchObject({
        classId: cls,
        filesFailed: 2,
        error: 'fallo leyendo ajustes',
      })
      expect([...metadata.failedKeys].sort()).toEqual(
        [submission, cover].map(url => url.replace('/uploads/', '')).sort()
      )
    })
  })

  describe('«Borrar ya»', () => {
    const co = {} as Record<Level, { id: string; token: string }>
    let platformAdmin: { id: string; token: string }

    beforeAll(async () => {
      for (const level of ['read', 'edit', 'admin'] as Level[]) {
        co[level] = await newUser(`co-${level}`, 'teacher')
      }
      platformAdmin = await newUser('admin-plataforma', 'admin')
    })

    const withTeachers = async (classId: string) => {
      for (const level of ['read', 'edit', 'admin'] as Level[]) {
        await prisma.classTeacher.create({
          data: {
            classId,
            userId: co[level].id,
            access: level,
            profile: PROFILE[level],
            addedById: f.users.owner.id,
          },
        })
      }
      await prisma.classEnrollment.create({ data: { classId, studentId: f.users.student.id } })
    }

    it('solo el propietario, solo desde la papelera; cotitulares 403, ajenos 404, alumnado 403', async () => {
      const cover = `/uploads/covers/${unique()}.png`
      const cls = await newClass('Borrar ya', { trashedDaysAgo: 1, backgroundImage: cover })
      await withTeachers(cls)
      const url = `/teacher/classes/${cls}/purge`

      for (const level of ['read', 'edit', 'admin'] as Level[]) {
        expect((await send('POST', url, co[level].token)).statusCode).toBe(403)
      }
      expect((await send('POST', url, f.token('other'))).statusCode).toBe(404)
      expect((await send('POST', url, f.token('student'))).statusCode).toBe(403)
      // Administración de la instancia no tiene respaldo aquí: no es suya.
      expect((await send('POST', url, platformAdmin.token)).statusCode).toBe(403)
      expect(await prisma.class.findUnique({ where: { id: cls } })).not.toBeNull()
      expect(deleteUpload).not.toHaveBeenCalled()

      const done = await send('POST', url, f.token('owner'))
      expect(done.statusCode).toBe(200)
      expect(done.json()).toMatchObject({ purged: true, classId: cls, filesFailed: 0 })
      expect(await prisma.class.findUnique({ where: { id: cls } })).toBeNull()
      expect(deletedFiles()).toEqual([cover])
      const [log] = await purgeLogs(cls)
      expect(log!.metadata).toMatchObject({
        reason: 'owner',
        actorId: f.users.owner.id,
        students: 1,
      })
      // El alumno sigue, sin la clase.
      expect(await prisma.user.findUnique({ where: { id: f.users.student.id } })).not.toBeNull()

      // Ya no está: 404.
      expect((await send('POST', url, f.token('owner'))).statusCode).toBe(404)
    })

    it('si la fase de ficheros falla, responde 200 y lo deja en el registro', async () => {
      const cls = await newClass('Borrar ya sin ajustes', { trashedDaysAgo: 1 })
      const mission = await prisma.mission.create({ data: { classId: cls, title: 'M' } })
      const enigma = await prisma.missionEnigma.create({
        data: { missionId: mission.id, title: 'E' },
      })
      const submission = `/uploads/submissions/${unique()}.pdf`
      await prisma.enigmaSubmission.create({
        data: { enigmaId: enigma.id, studentId: f.users.student.id, fileUrl: submission },
      })
      vi.mocked(uploadResolver).mockRejectedValueOnce(new Error('fallo leyendo ajustes'))

      const done = await send('POST', `/teacher/classes/${cls}/purge`, f.token('owner'))
      expect(done.statusCode).toBe(200)
      expect(done.json()).toMatchObject({ purged: true, classId: cls, filesFailed: 1 })
      expect(await prisma.class.findUnique({ where: { id: cls } })).toBeNull()
      const logs = await purgeLogs(cls)
      expect(logs.map(l => l.level)).toEqual(['info', 'warning'])
      expect(logs[1]!.metadata).toMatchObject({
        filesFailed: 1,
        failedKeys: [submission.replace('/uploads/', '')],
      })
    })

    it('fuera de la papelera, 409 y no se toca nada', async () => {
      const cls = await newClass('Viva')
      const response = await send('POST', `/teacher/classes/${cls}/purge`, f.token('owner'))
      expect(response.statusCode).toBe(409)
      expect(response.json()).toMatchObject({ code: 'CLASS_NOT_IN_TRASH' })
      expect(await prisma.class.findUnique({ where: { id: cls } })).not.toBeNull()
      expect(await purgeLogs(cls)).toHaveLength(0)
    })
  })

  describe('copias a la vez que la purga', () => {
    /**
     * Purga `classId` en una transacción que se queda abierta (la clase ya
     * borrada, sin confirmar) hasta llamar a `release`.
     */
    const holdPurge = async (classId: string) => {
      let release!: () => void
      const gate = new Promise<void>(resolve => (release = resolve))
      let ready!: () => void
      const locked = new Promise<void>(resolve => (ready = resolve))
      const purge = prisma.$transaction(
        async tx => {
          const purged = await purgeClassInTx(tx, classId, {
            reason: 'owner',
            ownerId: f.users.owner.id,
          })
          ready()
          await gate
          return purged
        },
        { timeout: 20_000 }
      )
      await locked
      return { release, purge }
    }
    /** Lo justo para que la copia llegue a esperar el bloqueo. */
    const settle = () => new Promise(resolve => setTimeout(resolve, 400))

    it('duplicar la clase mientras se purga espera y no deja una copia con su portada', async () => {
      const cover = `/uploads/covers/${unique()}.png`
      const cls = await newClass('Origen de copia', { trashedDaysAgo: 1, backgroundImage: cover })
      await prisma.mission.create({
        data: { classId: cls, title: 'M', backgroundImage: cover },
      })
      const { release, purge } = await holdPurge(cls)

      const copy = send('POST', `/teacher/classes/${cls}/duplicate`, f.token('owner'), {})
      await settle()
      release()
      expect(await purge).not.toBeNull()
      const response = await copy
      expect(response.statusCode).toBe(404)
      // Nadie apunta a la portada que la purga va a borrar.
      expect(await prisma.class.count({ where: { backgroundImage: cover } })).toBe(0)
      expect(await prisma.mission.count({ where: { backgroundImage: cover } })).toBe(0)
    })

    it('importar una plantilla que se borra ya mientras se copia no deja la copia con su portada', async () => {
      const cover = `/uploads/covers/${unique()}.png`
      const tpl = await newClass('Plantilla que se va', { backgroundImage: cover })
      await prisma.class.update({ where: { id: tpl }, data: { isTemplate: true } })
      await prisma.mission.create({ data: { classId: tpl, title: 'M', backgroundImage: cover } })
      const { publicUploadResolver: realResolver } = await vi.importActual<
        typeof import('../../src/modules/storage/storage.service.js')
      >('../../src/modules/storage/storage.service.js')

      // Ya leída la plantilla y antes de copiarla, la envían a la papelera y la borran ya.
      let held: Awaited<ReturnType<typeof holdPurge>> | undefined
      vi.mocked(publicUploadResolver).mockImplementationOnce(async () => {
        await prisma.class.update({
          where: { id: tpl },
          data: { deletedAt: new Date(), archived: true, isTemplate: false },
        })
        held = await holdPurge(tpl)
        return realResolver()
      })

      const imported = send('POST', `/teacher/templates/${tpl}/import`, f.token('other'), {
        missions: true,
      })
      while (!held) await settle()
      await settle()
      held.release()
      expect(await held.purge).not.toBeNull()
      expect((await imported).statusCode).toBe(404)
      expect(await prisma.class.count({ where: { backgroundImage: cover } })).toBe(0)
      expect(await prisma.mission.count({ where: { backgroundImage: cover } })).toBe(0)
    })

    it('importar una misión suya mientras se purga espera y no se importa', async () => {
      const cover = `/uploads/covers/${unique()}.png`
      const cls = await newClass('Origen de misión', { trashedDaysAgo: 1 })
      const mission = await prisma.mission.create({
        data: { classId: cls, title: 'M', backgroundImage: cover },
      })
      const { release, purge } = await holdPurge(cls)

      const imported = send('POST', `/teacher/missions/${mission.id}/import`, f.token('owner'), {
        targetClassId: f.classId,
      })
      await settle()
      release()
      expect(await purge).not.toBeNull()
      expect((await imported).statusCode).toBe(404)
      expect(await prisma.mission.count({ where: { backgroundImage: cover } })).toBe(0)
    })
  })

  describe('borrar una cuenta con clases en la papelera', () => {
    it('las de la papelera se purgan con ella (no bloquean ni se traspasan) y el aviso las nombra', async () => {
      const leaving = await newUser('se-va', 'teacher')
      const heir = await newUser('relevo', 'teacher')
      const live = await newClass('Viva con relevo', { ownerId: leaving.id })
      await prisma.classTeacher.create({
        data: { classId: live, userId: heir.id, access: 'admin', profile: 'titular' },
      })
      // En la papelera y sin nadie más con administración: antes habría bloqueado.
      const cover = `/uploads/covers/${unique()}.png`
      const trashed = await newClass('En la papelera', {
        ownerId: leaving.id,
        trashedDaysAgo: 2,
        backgroundImage: cover,
      })
      const mission = await prisma.mission.create({ data: { classId: trashed, title: 'M' } })
      const badge = await prisma.badge.create({
        data: { name: 'De la misión', teacherId: leaving.id, missionId: mission.id },
      })
      const trashedName = (await prisma.class.findUniqueOrThrow({ where: { id: trashed } })).name

      const check = await send('GET', '/profile/delete-account/check', leaving.token)
      expect(check.json()).toMatchObject({
        canDelete: true,
        blockingClasses: [],
        transfers: [{ classId: live, toUser: { id: heir.id } }],
        trashedClasses: [{ id: trashed, name: trashedName }],
      })

      const deleted = await send('DELETE', '/profile/delete-account', leaving.token, {
        password: PASSWORD,
      })
      expect(deleted.statusCode).toBe(200)
      expect(await prisma.user.findUnique({ where: { id: leaving.id } })).toBeNull()
      expect(await prisma.class.findUnique({ where: { id: trashed } })).toBeNull()
      expect(await prisma.badge.findUnique({ where: { id: badge.id } })).toBeNull()
      expect((await prisma.class.findUniqueOrThrow({ where: { id: live } })).teacherId).toBe(
        heir.id
      )
      expect(deletedFiles()).toEqual([cover])
      const [log] = await purgeLogs(trashed)
      expect(log!.metadata).toMatchObject({ reason: 'account_deleted', actorId: leaving.id })
    })

    it('si otra clase lo impide, no se borra nada: tampoco se purga la de la papelera', async () => {
      const blocked = await newUser('bloqueada', 'teacher')
      const platformAdmin = await newUser('admin-cuentas', 'admin')
      const live = await newClass('Sin relevo', { ownerId: blocked.id })
      const trashed = await newClass('Papelera intacta', { ownerId: blocked.id, trashedDaysAgo: 1 })

      const check = (
        await send('GET', `/admin/users/${blocked.id}/deletion-check`, platformAdmin.token)
      ).json()
      expect(check).toMatchObject({
        canDelete: false,
        blockingClasses: [{ id: live }],
        trashedClasses: [{ id: trashed }],
      })
      const attempt = await send('DELETE', `/admin/users/${blocked.id}`, platformAdmin.token)
      expect(attempt.statusCode).toBe(409)
      expect(attempt.json()).toMatchObject({ code: 'OWNS_CLASSES_WITHOUT_SUCCESSOR' })
      expect(await prisma.user.findUnique({ where: { id: blocked.id } })).not.toBeNull()
      expect(await prisma.class.findUnique({ where: { id: trashed } })).not.toBeNull()
      expect(await purgeLogs(trashed)).toHaveLength(0)
      expect(deleteUpload).not.toHaveBeenCalled()
    })
  })
})
