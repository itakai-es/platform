import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

/**
 * Papelera de clases: enviar, restaurar, el listado de la papelera y el aviso
 * de impacto. Quién puede (solo el propietario; quien administra la instancia
 * de respaldo), qué queda en el registro, que la clase desaparece de cada
 * listado (uno a uno) y vuelve archivada al restaurarla, que la plantilla no
 * se vuelve a publicar sola y que el impacto cuenta lo que hay.
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

vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  saveUpload: vi.fn(async (path: string) => `/uploads/${path}`),
  deleteUpload: vi.fn(),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { submissionsRoutes } from '../../src/modules/submissions/submissions.routes.js'
import { classesRoutes } from '../../src/modules/classes/classes.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { publicTemplateRoutes } from '../../src/modules/templates/templates.routes.js'
import { registerTeacherTools } from '../../src/modules/ai/tools/teacher-tools.js'
import { getTool } from '../../src/modules/ai/tools/tool-registry.js'
import { TeacherAgent } from '../../src/modules/ai/agents/teacher-agent.js'
import { teachersService } from '../../src/modules/teachers/teachers.service.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { resetRateLimits } from '../../src/utils/rate-limit.js'
import {
  classDeletionImpact,
  restoreClass,
  trashClass,
  trashDaysLeft,
} from '../../src/modules/teachers/class-trash.service.js'

type Level = 'read' | 'edit' | 'admin'
const LEVELS: Level[] = ['read', 'edit', 'admin']
const PROFILE = { read: 'practicas', edit: 'sustituto', admin: 'titular' } as const

describeWithDatabase('papelera de clases', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = `papelera${randomUUID().slice(0, 6)}`
  /** Cuentas creadas aquí, que la fixture no conoce. */
  const extraUsers: string[] = []
  const co = {} as Record<Level, { id: string; token: string }>
  let admin: { id: string; token: string }

  const newUser = async (
    label: string,
    role: 'teacher' | 'student' | 'admin',
    data: { accountType?: 'managed'; homeClassId?: string } = {}
  ) => {
    const user = await prisma.user.create({
      data: {
        ...(data.accountType ? { username: `${label}-${randomUUID().slice(0, 6)}` } : {}),
        email: data.accountType ? null : `${label}.${randomUUID().slice(0, 6)}@test.invalid`,
        passwordHash: 'x',
        name: `${label} ${tag}`,
        role,
        isOnboarded: true,
        ...data,
      },
    })
    extraUsers.push(user.id)
    return { id: user.id, token: app.jwt.sign({ id: user.id, role }) }
  }

  /** Una clase nueva del propietario de la fixture. */
  const newClass = async (name: string) =>
    (
      await prisma.$transaction(tx =>
        createClassWithOwner(
          tx,
          {
            name: `${name} ${tag}`,
            invitationCode: randomUUID().slice(0, 6).toUpperCase(),
          },
          f.users.owner.id
        )
      )
    ).id

  const send = (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    token: string,
    payload?: Record<string, unknown>
  ) => app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } })

  const owner = () => f.token('owner')

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(submissionsRoutes, { prefix: '/submissions' })
      await instance.register(classesRoutes, { prefix: '/classes' })
      await instance.register(adminRoutes, { prefix: '/admin' })
      await instance.register(publicTemplateRoutes, { prefix: '/public/templates' })
    })
    f = await createClassFixture(app)
    for (const level of LEVELS) {
      co[level] = await newUser(`co-${level}`, 'teacher')
      await prisma.classTeacher.create({
        data: {
          classId: f.classId,
          userId: co[level].id,
          access: level,
          profile: PROFILE[level],
          addedById: f.users.owner.id,
        },
      })
    }
    admin = await newUser('admin', 'admin')
    registerTeacherTools()
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await app?.close()
  })

  describe('permisos', () => {
    it('solo el propietario envía a la papelera, restaura y ve el impacto: cotitulares 403, ajenos 404, alumnado 403', async () => {
      const urls = [
        ['DELETE', `/teacher/classes/${f.classId}`],
        ['POST', `/teacher/classes/${f.classId}/restore`],
        ['GET', `/teacher/classes/${f.classId}/deletion-impact`],
      ] as const
      for (const [method, url] of urls) {
        const got = {
          read: (await send(method, url, co.read.token)).statusCode,
          edit: (await send(method, url, co.edit.token)).statusCode,
          admin: (await send(method, url, co.admin.token)).statusCode,
          other: (await send(method, url, f.token('other'))).statusCode,
          student: (await send(method, url, f.token('student'))).statusCode,
        }
        expect(got, `${method} ${url}`).toEqual({
          read: 403,
          edit: 403,
          admin: 403,
          other: 404,
          student: 403,
        })
      }
      const cls = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
      expect(cls.deletedAt).toBeNull()
    })

    it('una clase que no existe da 404', async () => {
      const ghost = randomUUID()
      for (const [method, url] of [
        ['DELETE', `/teacher/classes/${ghost}`],
        ['POST', `/teacher/classes/${ghost}/restore`],
        ['GET', `/teacher/classes/${ghost}/deletion-impact`],
      ] as const) {
        expect((await send(method, url, owner())).statusCode).toBe(404)
      }
    })

    it('quien administra la instancia la envía y la restaura de respaldo, y queda dicho en el registro', async () => {
      const classId = await newClass('Respaldo')
      const actor = { id: admin.id, role: 'admin' }
      await trashClass(actor, classId)
      await restoreClass(actor, classId)
      const log = await prisma.classActionLog.findMany({
        where: { classId, action: { in: ['class.trashed', 'class.restored'] } },
        orderBy: { createdAt: 'asc' },
      })
      expect(log.map(l => [l.action, l.actorId, (l.metadata as any)?.byPlatformAdmin])).toEqual([
        ['class.trashed', admin.id, true],
        ['class.restored', admin.id, true],
      ])
      // Sin respaldo para el profesorado: un profesor ajeno no llega.
      await expect(
        trashClass({ id: f.users.other.id, role: 'teacher' }, classId)
      ).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  describe('a la papelera y de vuelta', () => {
    it('enviar archiva, retira la plantilla y lo apunta; repetir da 409 sin tocar la fecha', async () => {
      const classId = await newClass('Ciclo')
      await prisma.class.update({
        where: { id: classId },
        data: { subject: 'informatica', educationLevel: 'fp_medio', language: 'es' },
      })
      expect(
        (
          await send('POST', `/teacher/classes/${classId}/publish-template`, owner(), {
            publish: true,
          })
        ).statusCode
      ).toBe(200)

      const res = await send('DELETE', `/teacher/classes/${classId}`, owner())
      expect(res.statusCode).toBe(200)
      expect(res.json().class).toMatchObject({ id: classId, daysLeft: 30 })

      const trashed = await prisma.class.findUniqueOrThrow({ where: { id: classId } })
      expect(trashed).toMatchObject({
        archived: true,
        isTemplate: false,
        deletedById: f.users.owner.id,
      })
      expect(trashed.deletedAt).toBeInstanceOf(Date)

      const again = await send('DELETE', `/teacher/classes/${classId}`, owner())
      expect(again.statusCode).toBe(409)
      expect(again.json().code).toBe('CLASS_IN_TRASH')
      const still = await prisma.class.findUniqueOrThrow({ where: { id: classId } })
      expect(still.deletedAt).toEqual(trashed.deletedAt)

      const log = await prisma.classActionLog.findMany({
        where: { classId, action: 'class.trashed' },
      })
      expect(log).toHaveLength(1)
      expect(log[0]).toMatchObject({
        actorId: f.users.owner.id,
        entityType: 'class',
        entityId: classId,
        metadata: { wasArchived: false, wasTemplate: true },
      })
    })

    it('en la papelera no se publica, ni se retira, ni se archiva o desarchiva: 409', async () => {
      const classId = await newClass('Bloqueos')
      await prisma.class.update({
        where: { id: classId },
        data: { subject: 'informatica', educationLevel: 'fp_medio', language: 'es' },
      })
      await send('DELETE', `/teacher/classes/${classId}`, owner())
      for (const [url, payload] of [
        [`/teacher/classes/${classId}/publish-template`, { publish: true }],
        [`/teacher/classes/${classId}/publish-template`, { publish: false }],
      ] as const) {
        const res = await send('POST', url, owner(), payload)
        expect(res.statusCode).toBe(409)
        expect(res.json().code).toBe('CLASS_IN_TRASH')
      }
      for (const archived of [false, true]) {
        const res = await send('PATCH', `/teacher/classes/${classId}/archive`, owner(), {
          archived,
        })
        expect(res.statusCode).toBe(409)
      }
      const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } })
      expect(cls).toMatchObject({ archived: true, isTemplate: false })
    })

    it('restaurar la deja archivada y sin publicar, lo apunta y repetir da 409', async () => {
      const classId = await newClass('Restaurar')
      await prisma.class.update({
        where: { id: classId },
        data: { subject: 'informatica', educationLevel: 'fp_medio', language: 'es' },
      })
      await send('POST', `/teacher/classes/${classId}/publish-template`, owner(), { publish: true })
      await send('DELETE', `/teacher/classes/${classId}`, owner())

      const res = await send('POST', `/teacher/classes/${classId}/restore`, owner())
      expect(res.statusCode).toBe(200)
      expect(res.json().class).toMatchObject({ id: classId, archived: true, isTemplate: false })
      const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } })
      expect(cls).toMatchObject({
        deletedAt: null,
        deletedById: null,
        archived: true,
        isTemplate: false,
      })

      const again = await send('POST', `/teacher/classes/${classId}/restore`, owner())
      expect(again.statusCode).toBe(409)
      expect(again.json().code).toBe('CLASS_NOT_IN_TRASH')

      const actions = await prisma.classActionLog.findMany({
        where: { classId, action: { in: ['class.trashed', 'class.restored'] } },
        orderBy: { createdAt: 'asc' },
        select: { action: true, actorId: true },
      })
      expect(actions).toEqual([
        { action: 'class.trashed', actorId: f.users.owner.id },
        { action: 'class.restored', actorId: f.users.owner.id },
      ])

      // Ya fuera de la papelera, se desarchiva como cualquier otra.
      const unarchive = await send('PATCH', `/teacher/classes/${classId}/archive`, owner(), {
        archived: false,
      })
      expect(unarchive.statusCode).toBe(200)
    })

    it('GET /teacher/classes/trash: las del propietario, con los días que quedan y quién la envió, sin correos', async () => {
      const mine = await newClass('Mía')
      const byAdmin = await newClass('Del respaldo')
      await send('DELETE', `/teacher/classes/${mine}`, owner())
      await trashClass({ id: admin.id, role: 'admin' }, byAdmin)
      // Una que lleva 29 días y medio: le queda uno.
      await prisma.class.update({
        where: { id: byAdmin },
        data: { deletedAt: new Date(Date.now() - 29.5 * 24 * 60 * 60 * 1000) },
      })

      const res = await send('GET', '/teacher/classes/trash', owner())
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.purgeDays).toBe(30)
      const byId = new Map(body.classes.map((c: any) => [c.id, c]))
      expect(byId.get(mine)).toMatchObject({
        daysLeft: 30,
        deletedBy: { isMe: true, name: expect.any(String) },
      })
      expect(byId.get(byAdmin)).toMatchObject({
        daysLeft: 1,
        deletedBy: { isMe: false, name: `admin ${tag}` },
      })
      expect(JSON.stringify(body)).not.toMatch(/@/)

      // Una restaurada ya no está; a quien no es propietario no le sale ninguna.
      await send('POST', `/teacher/classes/${mine}/restore`, owner())
      const after = (await send('GET', '/teacher/classes/trash', owner())).json()
      expect(after.classes.map((c: any) => c.id)).not.toContain(mine)
      await prisma.classTeacher.create({
        data: { classId: byAdmin, userId: co.admin.id, access: 'admin', profile: 'titular' },
      })
      const forCo = (await send('GET', '/teacher/classes/trash', co.admin.token)).json()
      expect(forCo.classes).toEqual([])
    })

    it('los días que quedan se cuentan hacia arriba y no bajan de cero', () => {
      const now = new Date('2026-10-02T12:00:00Z')
      const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
      expect(trashDaysLeft(daysAgo(0), now)).toBe(30)
      expect(trashDaysLeft(daysAgo(0.5), now)).toBe(30)
      expect(trashDaysLeft(daysAgo(29.9), now)).toBe(1)
      expect(trashDaysLeft(daysAgo(30), now)).toBe(0)
      expect(trashDaysLeft(daysAgo(45), now)).toBe(0)
    })
  })

  describe('listados', () => {
    // Una clase con de todo, de la fixture: su alumno, una misión con una
    // entrega y una entrada de actividad, publicada como plantilla.
    let missionId: string
    let code: string
    const studentToken = () => f.token('student')

    const ids = (list: { id: string }[]) => list.map(x => x.id)

    /** Lo que el alumnado abre de su clase por id: con la clase viva, todo 200. */
    const studentClassRoutes = () =>
      ['ranking', 'guide', 'shop', 'badges', 'activities', 'gamification', 'missions'].map(
        path => `/students/classes/${f.classId}/${path}`
      )
    const studentStatuses = async () =>
      Object.fromEntries(
        await Promise.all(
          studentClassRoutes().map(
            async url => [url, (await send('GET', url, studentToken())).statusCode] as const
          )
        )
      )
    const allStatuses = (code: number) =>
      Object.fromEntries(studentClassRoutes().map(url => [url, code]))

    /** Cada listado, con si la clase (o lo suyo) sale en él. */
    const listings: Record<string, () => Promise<boolean>> = {
      'GET /teacher/classes (activas)': async () =>
        ids((await send('GET', '/teacher/classes', owner())).json().classes).includes(f.classId),
      'GET /teacher/classes?archived=all (selector de clases)': async () =>
        ids(
          (await send('GET', '/teacher/classes?archived=all', co.read.token)).json().classes
        ).includes(f.classId),
      'GET /teacher/stats': async () =>
        // Solo esta clase del propietario tiene misiones activas.
        (await send('GET', '/teacher/stats', owner())).json().activeMissions > 0,
      'GET /teacher/missions (Mis misiones)': async () =>
        ids((await send('GET', '/teacher/missions', owner())).json().missions).includes(missionId),
      'GET /teacher/students?archived=all': async () =>
        ids(
          (await send('GET', '/teacher/students?archived=all', owner())).json().students
        ).includes(f.users.student.id),
      'GET /teacher/students/:studentId': async () =>
        (await send('GET', `/teacher/students/${f.users.student.id}`, owner())).statusCode === 200,
      'GET /teacher/activities': async () =>
        (await send('GET', '/teacher/activities', owner()))
          .json()
          .activities.some((a: any) => a.studentId === f.users.student.id),
      'GET /teacher/templates (marketplace)': async () =>
        ids(
          (await send('GET', `/teacher/templates?q=${tag}`, f.token('other'))).json().templates
        ).includes(f.classId),
      'GET /teacher/templates/:id': async () =>
        (await send('GET', `/teacher/templates/${f.classId}`, f.token('other'))).statusCode === 200,
      'GET /public/templates': async () => {
        resetRateLimits()
        const res = await app.inject({ method: 'GET', url: `/public/templates?q=${tag}` })
        return ids(res.json().templates).includes(f.classId)
      },
      'GET /public/templates/:id': async () => {
        resetRateLimits()
        return (
          (await app.inject({ method: 'GET', url: `/public/templates/${f.classId}` }))
            .statusCode === 200
        )
      },
      'GET /admin/classes': async () =>
        ids(
          (await send('GET', `/admin/classes?search=${tag}`, admin.token)).json().classes
        ).includes(f.classId),
      'GET /admin/missions': async () =>
        ids(
          (await send('GET', `/admin/missions?search=${tag}`, admin.token)).json().missions
        ).includes(missionId),
      'list_classes del asistente': async () =>
        String(await getTool('list_classes')!.execute({ _userId: f.users.owner.id })).includes(
          `Clase ${tag}`
        ),
      'GET /students/classes (alumnado)': async () =>
        ids((await send('GET', '/students/classes', studentToken())).json().classes).includes(
          f.classId
        ),
      'GET /students/missions (alumnado)': async () =>
        ids((await send('GET', '/students/missions', studentToken())).json().missions).includes(
          missionId
        ),
      'GET /missions (alumnado)': async () =>
        ids((await send('GET', '/missions', studentToken())).json().missions).includes(missionId),
      'GET /submissions/my (alumnado)': async () =>
        (await send('GET', '/submissions/my', studentToken())).json().submissions.length > 0,
      'GET /classes/by-code/:code': async () =>
        (await app.inject({ method: 'GET', url: `/classes/by-code/${code}` })).statusCode === 200,
    }

    beforeAll(async () => {
      await prisma.class.update({
        where: { id: f.classId },
        data: {
          name: `Clase ${tag}`,
          subject: 'informatica',
          educationLevel: 'fp_medio',
          language: 'es',
        },
      })
      code = (await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })).invitationCode
      expect(
        (
          await send('POST', `/teacher/classes/${f.classId}/publish-template`, owner(), {
            publish: true,
          })
        ).statusCode
      ).toBe(200)
      missionId = await f.newMission()
      await prisma.mission.update({
        where: { id: missionId },
        data: { title: `Misión ${tag}`, status: 'activa' },
      })
      const enigmaId = await f.newEnigma(missionId)
      await prisma.enigmaSubmission.create({
        data: { enigmaId, studentId: f.users.student.id, fileUrl: '/uploads/submissions/x.pdf' },
      })
      await prisma.activity.create({
        data: {
          userId: f.users.student.id,
          classId: f.classId,
          type: 'enigma_submitted',
          description: 'Entrega',
        },
      })
    })

    afterAll(async () => {
      await prisma.class.update({
        where: { id: f.classId },
        data: { deletedAt: null, deletedById: null, archived: false },
      })
    })

    it('antes de enviarla, la clase y lo suyo salen en todos', async () => {
      for (const [name, shows] of Object.entries(listings)) {
        expect(await shows(), name).toBe(true)
      }
      expect(await studentStatuses()).toEqual(allStatuses(200))
    })

    it('en la papelera no sale en ninguno; unirse con el código responde como archivada', async () => {
      expect((await send('DELETE', `/teacher/classes/${f.classId}`, owner())).statusCode).toBe(200)
      for (const [name, shows] of Object.entries(listings)) {
        expect(await shows(), name).toBe(false)
      }
      expect(
        ids((await send('GET', '/teacher/classes?archived=archived', owner())).json().classes)
      ).not.toContain(f.classId)
      expect(
        (await app.inject({ method: 'GET', url: `/classes/by-code/${code}` })).statusCode
      ).toBe(410)
      expect(
        (await app.inject({ method: 'GET', url: `/public/templates/${f.classId}` })).statusCode
      ).toBe(410)
      const join = await send('POST', '/students/classes/join', f.token('outsider'), { code })
      expect(join.statusCode).toBe(400)
      expect(join.json().message).toMatch(/archivada/)

      // Quien la tiene en la papelera aún puede abrirla (solo lectura por la interfaz).
      const detail = await send('GET', `/teacher/classes/${f.classId}`, owner())
      expect(detail.statusCode).toBe(200)
      expect(detail.json().class.deletedAt).toEqual(expect.any(String))

      // El alumnado matriculado tampoco la abre por id: ni ranking, ni guía, ni tienda…
      expect(await studentStatuses()).toEqual(allStatuses(404))
    })

    it('restaurada vuelve a los listados del profesorado como archivada; la plantilla no vuelve sola', async () => {
      expect(
        (await send('POST', `/teacher/classes/${f.classId}/restore`, owner())).statusCode
      ).toBe(200)

      const archived = (await send('GET', '/teacher/classes?archived=archived', owner())).json()
        .classes
      expect(archived.find((c: any) => c.id === f.classId)).toMatchObject({ archived: true })
      expect(await listings['GET /teacher/classes?archived=all (selector de clases)']()).toBe(true)
      expect(await listings['GET /teacher/classes (activas)']()).toBe(false)
      expect(await listings['GET /admin/classes']()).toBe(true)
      expect(await listings['GET /teacher/students/:studentId']()).toBe(true)
      expect(await listings['list_classes del asistente']()).toBe(true)

      for (const name of [
        'GET /teacher/templates (marketplace)',
        'GET /teacher/templates/:id',
        'GET /public/templates',
      ]) {
        expect(await listings[name](), name).toBe(false)
      }
      expect((await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })).isTemplate).toBe(
        false
      )

      // Archivada, el alumnado sigue sin verla hasta que se desarchiva.
      expect(await listings['GET /students/classes (alumnado)']()).toBe(false)
      await send('PATCH', `/teacher/classes/${f.classId}/archive`, owner(), { archived: false })
      expect(await listings['GET /students/classes (alumnado)']()).toBe(true)
      expect(await listings['GET /submissions/my (alumnado)']()).toBe(true)
      expect(await studentStatuses()).toEqual(allStatuses(200))
    })
  })

  describe('a la vez que se envía', () => {
    // Las guardas comprueban antes de escribir; la papelera puede llegar entre
    // medias. Se repite para que la carrera tenga ocasión de darse.
    const ROUNDS = 10

    /** Una clase que se pueda publicar, con un cotitular de administración. */
    const raceClass = async (name: string, data: { archived?: boolean } = {}) => {
      const classId = await newClass(name)
      await prisma.class.update({
        where: { id: classId },
        data: { subject: 'informatica', educationLevel: 'fp_medio', language: 'es', ...data },
      })
      await prisma.classTeacher.create({
        data: { classId, userId: co.admin.id, access: 'admin', profile: 'titular' },
      })
      return classId
    }
    const ownerUser = () => ({ id: f.users.owner.id, role: 'teacher' })

    it('desarchivar mientras se envía no la deja en la papelera sin archivar', async () => {
      for (let i = 0; i < ROUNDS; i++) {
        const classId = await raceClass(`Carrera archivo ${i}`, { archived: true })
        const [trash, unarchive] = await Promise.allSettled([
          trashClass(ownerUser(), classId),
          teachersService.setClassArchived(co.admin.id, classId, false),
        ])
        expect(trash.status).toBe('fulfilled')
        if (unarchive.status === 'rejected') {
          expect(unarchive.reason).toMatchObject({ statusCode: 409, code: 'CLASS_IN_TRASH' })
        }
        const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } })
        expect(cls.deletedAt).toBeInstanceOf(Date)
        expect(cls.archived, `ronda ${i}`).toBe(true)
      }
    })

    it('publicar mientras se envía no la deja publicada en la papelera', async () => {
      for (let i = 0; i < ROUNDS; i++) {
        const classId = await raceClass(`Carrera plantilla ${i}`)
        const [trash, publish] = await Promise.allSettled([
          trashClass(ownerUser(), classId),
          teachersService.publishTemplate(f.users.owner.id, classId, true),
        ])
        expect(trash.status).toBe('fulfilled')
        if (publish.status === 'rejected') {
          expect(publish.reason).toMatchObject({ statusCode: 409, code: 'CLASS_IN_TRASH' })
        }
        const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } })
        expect(cls.deletedAt).toBeInstanceOf(Date)
        expect(cls.isTemplate, `ronda ${i}`).toBe(false)
      }
    })

    it('restaurar la deja sin publicar aunque estuviera publicada en la papelera', async () => {
      const classId = await raceClass('Restaurar publicada')
      await trashClass(ownerUser(), classId)
      await prisma.class.update({ where: { id: classId }, data: { isTemplate: true } })
      const res = await send('POST', `/teacher/classes/${classId}/restore`, owner())
      expect(res.statusCode).toBe(200)
      expect(await prisma.class.findUniqueOrThrow({ where: { id: classId } })).toMatchObject({
        deletedAt: null,
        archived: true,
        isTemplate: false,
      })
    })
  })

  describe('en la papelera aunque siga publicada y sin archivar', () => {
    // El estado que dejaría una carrera o un cambio a mano: ni archivada ni
    // retirada. Los filtros que miran `deletedAt` tienen que bastar solos.
    let teacher: { id: string; token: string }
    let classId: string
    const name = () => `Incoherente ${tag}`
    const missionTitle = () => `Misión incoherente ${tag}`

    /** El recuento de misiones activas de /admin/stats, pero solo de esta clase. */
    const adminStatsCountsIt = async () => {
      const spy = vi.spyOn(prisma.mission, 'count')
      try {
        expect((await send('GET', '/admin/stats', admin.token)).statusCode).toBe(200)
        const where = spy.mock.calls
          .map(([args]) => args?.where)
          .find(w => (w as { status?: string } | undefined)?.status === 'activa')
        expect(where).toBeDefined()
        return (await prisma.mission.count({ where: { AND: [where!, { classId }] } })) > 0
      } finally {
        spy.mockRestore()
      }
    }

    const listings: Record<string, () => Promise<boolean>> = {
      'GET /teacher/templates': async () =>
        (await send('GET', `/teacher/templates?q=${tag}`, f.token('other')))
          .json()
          .templates.some((t: { id: string }) => t.id === classId),
      'GET /teacher/templates/:id': async () =>
        (await send('GET', `/teacher/templates/${classId}`, f.token('other'))).statusCode === 200,
      'GET /public/templates': async () => {
        resetRateLimits()
        // Por su nombre, que es solo suyo: ni la tarjeta ni el total la cuentan.
        const url = `/public/templates?q=${encodeURIComponent(name())}`
        const body = (await app.inject({ method: 'GET', url })).json()
        return body.total > 0 || body.templates.some((t: { id: string }) => t.id === classId)
      },
      'GET /public/templates/:id': async () => {
        resetRateLimits()
        return (
          (await app.inject({ method: 'GET', url: `/public/templates/${classId}` })).statusCode ===
          200
        )
      },
      'GET /admin/stats (misiones activas)': adminStatsCountsIt,
      'prompt del asistente docente': async () => {
        const agent = new TeacherAgent({} as never, 'teacher')
        const prompt: string = await (
          agent as unknown as { buildPrompt: (c: unknown) => Promise<string> }
        ).buildPrompt({
          userId: teacher.id,
          role: 'teacher',
          assistantId: 'default',
          message: 'hola',
          locale: 'es',
        })
        return prompt.includes(name()) || prompt.includes(missionTitle())
      },
    }

    beforeAll(async () => {
      teacher = await newUser('incoherente', 'teacher')
      classId = (
        await prisma.$transaction(tx =>
          createClassWithOwner(
            tx,
            { name: name(), invitationCode: randomUUID().slice(0, 6).toUpperCase() },
            teacher.id
          )
        )
      ).id
      await f.newMission(classId)
      await prisma.mission.updateMany({
        where: { classId },
        data: { title: missionTitle(), status: 'activa' },
      })
      await prisma.class.update({
        where: { id: classId },
        data: {
          subject: 'informatica',
          educationLevel: 'fp_medio',
          language: 'es',
          isTemplate: true,
          archived: false,
          deletedAt: new Date(),
          deletedById: teacher.id,
        },
      })
    })

    afterAll(async () => {
      await prisma.class.deleteMany({ where: { id: classId } })
    })

    it('no sale en el marketplace, el catálogo público, el recuento de admin ni el asistente, y no se importa', async () => {
      for (const [label, shows] of Object.entries(listings)) {
        expect(await shows(), label).toBe(false)
      }
      const imported = await send(
        'POST',
        `/teacher/templates/${classId}/import`,
        f.token('other'),
        {}
      )
      expect(imported.statusCode).toBe(404)
    })

    it('fuera de la papelera, sí (los filtros miran deletedAt y nada más)', async () => {
      await prisma.class.update({ where: { id: classId }, data: { deletedAt: null } })
      for (const [label, shows] of Object.entries(listings)) {
        expect(await shows(), label).toBe(true)
      }
    })
  })

  describe('impacto', () => {
    it('cuenta alumnado, entregas con fichero, cuentas gestionadas, misiones, compras y si es plantilla', async () => {
      const classId = await newClass('Impacto')
      const elsewhere = await newClass('Otra del propietario')
      await prisma.class.update({ where: { id: classId }, data: { isTemplate: true } })

      // Alumnado: uno con correo, tres cuentas gestionadas nacidas aquí y la vista previa, que no cuenta.
      const withEmail = await newUser('con-correo', 'student')
      const unused = await newUser('sin-usar', 'student', {
        accountType: 'managed',
        homeClassId: classId,
      })
      const used = await newUser('usada', 'student', {
        accountType: 'managed',
        homeClassId: classId,
      })
      const twoClasses = await newUser('en-dos', 'student', {
        accountType: 'managed',
        homeClassId: classId,
      })
      // Nacida aquí pero ya sin matrícula en ella: tampoco se borraría.
      const moved = await newUser('movida', 'student', {
        accountType: 'managed',
        homeClassId: classId,
      })
      for (const s of [withEmail, unused, used, twoClasses]) {
        await prisma.classEnrollment.create({ data: { classId, studentId: s.id } })
      }
      await prisma.classEnrollment.create({
        data: { classId: elsewhere, studentId: twoClasses.id },
      })
      await prisma.classEnrollment.create({ data: { classId: elsewhere, studentId: moved.id } })
      await prisma.classEnrollment.create({
        data: { classId, studentId: f.users.owner.id, isPreview: true },
      })
      await prisma.refreshToken.create({
        data: {
          token: randomUUID(),
          userId: used.id,
          isRevoked: true,
          expiresAt: new Date(Date.now() + 60_000),
        },
      })

      // Dos misiones; tres entregas, dos con fichero.
      const m1 = await f.newMission(classId)
      await f.newMission(classId)
      const enigma = await f.newEnigma(m1)
      for (const [studentId, fileUrl] of [
        [withEmail.id, '/uploads/submissions/a.pdf'],
        [unused.id, '/uploads/submissions/b.pdf'],
        [used.id, null],
      ] as const) {
        await prisma.enigmaSubmission.create({ data: { enigmaId: enigma, studentId, fileUrl } })
      }
      // Una compra.
      await prisma.shopPurchase.create({
        data: { classId, studentId: withEmail.id, itemName: 'Premio', price: 5 },
      })
      // Un cotitular vigente y uno que ya terminó.
      await prisma.classTeacher.create({
        data: { classId, userId: co.edit.id, access: 'edit', profile: 'sustituto' },
      })
      await prisma.classTeacher.create({
        data: {
          classId,
          userId: co.read.id,
          access: 'read',
          profile: 'practicas',
          endsAt: new Date(Date.now() - 60_000),
        },
      })

      const res = await send('GET', `/teacher/classes/${classId}/deletion-impact`, owner())
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({
        classId,
        name: `Impacto ${tag}`,
        inTrash: false,
        isTemplate: true,
        students: 4,
        submissionsWithFile: 2,
        missions: 2,
        shopPurchases: 1,
        otherTeachers: 1,
        managedAccounts: { deleted: 1, unmanaged: 3 },
        purgeDays: 30,
      })

      // Solo cuenta: no ha borrado nada. Y en la papelera sigue contando lo mismo.
      expect(
        await prisma.user.count({ where: { id: { in: [unused.id, used.id, moved.id] } } })
      ).toBe(3)
      await send('DELETE', `/teacher/classes/${classId}`, owner())
      const inTrash = await classDeletionImpact({ id: f.users.owner.id, role: 'teacher' }, classId)
      expect(inTrash).toMatchObject({ inTrash: true, isTemplate: false, students: 4 })
    })
  })
})
