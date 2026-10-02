import { it, expect, vi, beforeAll, afterAll, beforeEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * El profesorado de una clase y la autoría de lo que hace en ella: añadir por
 * correo, cambiar perfil y nivel, quitar, salir, traspasar la propiedad (con
 * `Class.teacherId` y la fila del propietario siempre de acuerdo), borrar una
 * cuenta que es propietaria de clases, los avisos a quien afecta, el registro
 * de acciones y su historial, y lo que el alumnado ve de quién hizo qué.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Solo se simula lo que sale de la máquina.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendPasswordChangedEmail: vi.fn(async () => {}),
  sendNotificationEmail: vi.fn(async () => {}),
}))

vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  saveUpload: vi.fn(async (path: string) => `/uploads/${path}`),
  deleteUpload: vi.fn(async () => {}),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { submissionsRoutes } from '../../src/modules/submissions/submissions.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { profileRoutes } from '../../src/modules/profile/profile.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { hashPassword } from '../../src/utils/password.js'
import { recordRateLimit, resetRateLimits } from '../../src/utils/rate-limit.js'

type Who = { id: string; role: string | null }
type Access = 'read' | 'edit' | 'admin'
type Profile = 'titular' | 'sustituto' | 'practicas'

const PASSWORD = 'contraseña-de-prueba'

/** Espera a que `read` cumpla `done`: para lo que la API hace sin esperar (los avisos). */
async function eventually<T>(read: () => Promise<T>, done: (value: T) => boolean): Promise<T> {
  for (let i = 0; i < 50; i++) {
    const value = await read()
    if (done(value)) return value
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  return read()
}

describeWithDatabase('profesorado de una clase y autoría', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  /** Usuarios creados aquí, fuera de la fixture. */
  const extraUsers = new Set<string>()
  let passwordHash: string

  const send = (
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    actor?: Who,
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: actor ? { authorization: `Bearer ${app.jwt.sign(actor)}` } : {},
    })

  const newUser = async (
    role: 'teacher' | 'student' | 'admin',
    label: string,
    extra: { status?: 'active' | 'suspended' } = {}
  ) => {
    const user = await prisma.user.create({
      data: {
        email: `${label}-${randomUUID().slice(0, 8)}.${tag}@test.invalid`,
        passwordHash,
        name: `${label} ${tag}`,
        role,
        isOnboarded: true,
        ...extra,
      },
    })
    extraUsers.add(user.id)
    return { id: user.id, role, name: user.name, email: user.email! }
  }

  const join = (
    userId: string,
    access: Access,
    {
      classId = f.classId,
      profile = 'sustituto' as Profile,
      createdAt = undefined as Date | undefined,
    } = {}
  ) =>
    prisma.classTeacher.create({
      data: { classId, userId, access, profile, addedById: f.users.owner.id, createdAt },
    })

  const newClass = async (ownerId: string, name = 'Clase') =>
    prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `${name} ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        ownerId
      )
    )

  const logs = (classId: string, action: string) =>
    prisma.classActionLog.findMany({ where: { classId, action }, orderBy: { createdAt: 'asc' } })

  const notices = (userId: string, type: string) =>
    prisma.notification.findMany({ where: { userId, type: type as never } })

  const owner = () => f.users.owner as Who
  const url = (path = '') => `/teacher/classes/${f.classId}${path}`

  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD)
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(submissionsRoutes, { prefix: '/submissions' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(profileRoutes, { prefix: '/profile' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
    f = await createClassFixture(app)
  })

  beforeEach(() => {
    resetRateLimits()
  })

  afterAll(async () => {
    const ids = [...extraUsers]
    await prisma.studentBadge.deleteMany({ where: { badge: { teacherId: { in: ids } } } })
    await prisma.badge.deleteMany({ where: { teacherId: { in: ids } } })
    await prisma.class.deleteMany({ where: { teacherId: { in: ids } } })
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
    await app?.close()
  })

  // ==================== AÑADIR ====================

  describe('añadir por correo', () => {
    it('entra al momento con el nivel de su perfil, queda registrado y le llega un aviso', async () => {
      const teacher = await newUser('teacher', 'nuevo')

      const response = await send('POST', url('/teachers'), owner(), {
        email: teacher.email.toUpperCase(),
        profile: 'sustituto',
      })
      expect(response.statusCode).toBe(201)
      expect(response.json().teacher).toMatchObject({
        id: teacher.id,
        profile: 'sustituto',
        access: 'edit',
        isOwner: false,
      })

      // Ya puede entrar en la clase, con edición.
      const detail = await send('GET', url(), teacher)
      expect(detail.statusCode).toBe(200)
      expect(detail.json().class.myAccess).toMatchObject({ access: 'edit', profile: 'sustituto' })

      const [entry] = await logs(f.classId, 'teacher.added')
      expect(entry).toMatchObject({
        actorId: f.users.owner.id,
        targetUserId: teacher.id,
        metadata: { profile: 'sustituto', access: 'edit' },
      })

      const [notice] = await eventually(
        () => notices(teacher.id, 'class_teacher_added'),
        rows => rows.length > 0
      )
      expect(notice.metadata).toMatchObject({ classId: f.classId })
      expect(notice.actionUrl).toBe(`/profesor/clases/${f.classId}`)
      expect(notice.message).toContain('«Sustitución»')
      expect(notice.message).toContain('edición')
    })

    it('el nivel que da el perfil se puede cambiar al añadir', async () => {
      const teacher = await newUser('teacher', 'practicas')
      const response = await send('POST', url('/teachers'), owner(), {
        email: teacher.email,
        profile: 'practicas',
        access: 'edit',
      })
      expect(response.statusCode).toBe(201)
      expect(response.json().teacher).toMatchObject({ profile: 'practicas', access: 'edit' })
    })

    it('un correo sin cuenta, de alumnado o de una cuenta suspendida da el mismo error', async () => {
      const student = await newUser('student', 'alumno')
      const suspended = await newUser('teacher', 'suspendido', { status: 'suspended' })
      const bodies = []
      for (const email of [`nadie-${tag}@test.invalid`, student.email, suspended.email]) {
        const response = await send('POST', url('/teachers'), owner(), {
          email,
          profile: 'titular',
        })
        expect(response.statusCode).toBe(400)
        bodies.push(response.json())
      }
      expect(bodies[1]).toEqual(bodies[0])
      expect(bodies[2]).toEqual(bodies[0])
      expect(bodies[0].code).toBe('TEACHER_NOT_ADDABLE')
      expect(
        await prisma.classTeacher.count({
          where: { classId: f.classId, userId: { in: [student.id, suspended.id] } },
        })
      ).toBe(0)
    })

    it('quien ya está en la clase no entra dos veces', async () => {
      const teacher = await newUser('teacher', 'repetido')
      await join(teacher.id, 'read')
      const response = await send('POST', url('/teachers'), owner(), {
        email: teacher.email,
        profile: 'titular',
      })
      expect(response.statusCode).toBe(409)
      expect(
        (
          await prisma.classTeacher.findUniqueOrThrow({
            where: { classId_userId: { classId: f.classId, userId: teacher.id } },
          })
        ).access
      ).toBe('read')
    })

    it('los intentos tienen límite, salgan bien o mal', async () => {
      recordRateLimit(`class-teacher-add:${f.users.owner.id}`, { max: 20, windowMs: 3_600_000 }, 20)
      const response = await send('POST', url('/teachers'), owner(), {
        email: `otro-${tag}@test.invalid`,
        profile: 'titular',
      })
      expect(response.statusCode).toBe(429)
    })
  })

  // ==================== CAMBIAR, QUITAR, SALIR ====================

  describe('cambiar, quitar y salir', () => {
    it('cambiar el perfil lleva al nivel de ese perfil; el nivel se puede fijar aparte', async () => {
      const teacher = await newUser('teacher', 'cambia')
      await join(teacher.id, 'read', { profile: 'practicas' })

      const byProfile = await send('PATCH', url(`/teachers/${teacher.id}`), owner(), {
        profile: 'titular',
      })
      expect(byProfile.statusCode).toBe(200)
      expect(byProfile.json().teacher).toMatchObject({ profile: 'titular', access: 'admin' })

      const byLevel = await send('PATCH', url(`/teachers/${teacher.id}`), owner(), {
        access: 'read',
      })
      expect(byLevel.json().teacher).toMatchObject({ profile: 'titular', access: 'read' })

      const entries = (await logs(f.classId, 'teacher.changed')).filter(
        e => e.targetUserId === teacher.id
      )
      expect(entries.map(e => e.metadata)).toEqual([
        {
          before: { profile: 'practicas', access: 'read' },
          after: { profile: 'titular', access: 'admin' },
        },
        {
          before: { profile: 'titular', access: 'admin' },
          after: { profile: 'titular', access: 'read' },
        },
      ])
      const received = await eventually(
        () => notices(teacher.id, 'class_teacher_changed'),
        rows => rows.length >= 2
      )
      expect(received).toHaveLength(2)
    })

    it('al propietario no le cambia ni le quita nadie, tampoco quien tiene administración', async () => {
      const admin = await newUser('teacher', 'admin-clase')
      await join(admin.id, 'admin', { profile: 'titular' })

      for (const actor of [admin, owner()]) {
        expect(
          (await send('PATCH', url(`/teachers/${f.users.owner.id}`), actor, { access: 'read' }))
            .statusCode
        ).toBe(403)
        expect((await send('DELETE', url(`/teachers/${f.users.owner.id}`), actor)).statusCode).toBe(
          403
        )
      }
      expect(
        await prisma.classTeacher.findUniqueOrThrow({
          where: { classId_userId: { classId: f.classId, userId: f.users.owner.id } },
        })
      ).toMatchObject({ isOwner: true, access: 'admin' })

      // Tampoco sale por su cuenta: antes pasa la clase.
      const leave = await send('POST', url('/leave'), owner())
      expect(leave.statusCode).toBe(403)
      expect(leave.json().code).toBe('CLASS_OWNER_CANNOT_LEAVE')
    })

    it('quitar a un profesor borra su vista previa y sus avisos de esa clase, no los de otras', async () => {
      const teacher = await newUser('teacher', 'quitado')
      await join(teacher.id, 'edit')
      await join(teacher.id, 'read', { classId: f.otherClassId })
      await prisma.classEnrollment.create({
        data: { classId: f.classId, studentId: teacher.id, isPreview: true },
      })
      await prisma.activity.create({
        data: {
          userId: teacher.id,
          type: 'class_joined',
          description: 'Vista previa',
          classId: f.classId,
        },
      })
      const notice = (classId: string) =>
        prisma.notification.create({
          data: {
            userId: teacher.id,
            type: 'submission_received',
            title: 'Aviso',
            message: 'Aviso',
            metadata: { classId },
          },
        })
      const here = await notice(f.classId)
      const there = await notice(f.otherClassId)

      const response = await send('DELETE', url(`/teachers/${teacher.id}`), owner())
      expect(response.statusCode).toBe(200)

      expect(
        await prisma.classTeacher.count({ where: { classId: f.classId, userId: teacher.id } })
      ).toBe(0)
      expect(
        await prisma.classEnrollment.count({ where: { classId: f.classId, studentId: teacher.id } })
      ).toBe(0)
      expect(
        await prisma.activity.count({ where: { userId: teacher.id, classId: f.classId } })
      ).toBe(0)
      expect(await prisma.notification.findUnique({ where: { id: here.id } })).toBeNull()
      expect(await prisma.notification.findUnique({ where: { id: there.id } })).not.toBeNull()
      // En la otra clase sigue.
      expect(
        await prisma.classTeacher.count({ where: { classId: f.otherClassId, userId: teacher.id } })
      ).toBe(1)

      const [entry] = (await logs(f.classId, 'teacher.removed')).filter(
        e => e.targetUserId === teacher.id
      )
      expect(entry.metadata).toEqual({ profile: 'sustituto', access: 'edit' })
      const [removed] = await eventually(
        () => notices(teacher.id, 'class_teacher_removed'),
        rows => rows.length > 0
      )
      expect(removed.actionUrl).toBeNull()

      // Ya no entra.
      expect((await send('GET', url(), teacher)).statusCode).toBe(404)
    })
  })

  // ==================== TRASPASO ====================

  describe('traspaso de la propiedad', () => {
    /** Una clase del propietario de la fixture con un administrador y alguien con edición. */
    const classWithStaff = async () => {
      const cls = await newClass(f.users.owner.id, 'Traspaso')
      const admin = await newUser('teacher', 'heredero')
      const editor = await newUser('teacher', 'editor')
      await join(admin.id, 'admin', { classId: cls.id, profile: 'titular' })
      await join(editor.id, 'edit', { classId: cls.id })
      return { classId: cls.id, admin, editor }
    }

    /** `Class.teacherId` y la única fila `isOwner` nombran a la misma persona. */
    const expectOwner = async (classId: string, userId: string) => {
      const cls = await prisma.class.findUniqueOrThrow({
        where: { id: classId },
        include: { teachers: { where: { isOwner: true } } },
      })
      expect(cls.teacherId).toBe(userId)
      expect(cls.teachers).toHaveLength(1)
      expect(cls.teachers[0]).toMatchObject({ userId, access: 'admin', endsAt: null })
    }

    it('el propietario la pasa a alguien con administración; las dos escrituras van juntas', async () => {
      const { classId, admin, editor } = await classWithStaff()
      const transfer = (actor: Who, userId: string) =>
        send('POST', `/teacher/classes/${classId}/transfer`, actor, { userId })

      // Con edición no se recibe; un administrador que no es el propietario no la pasa.
      const toEditor = await transfer(owner(), editor.id)
      expect(toEditor.statusCode).toBe(400)
      expect(toEditor.json().code).toBe('TRANSFER_TARGET_NOT_ADMIN')
      expect((await transfer(admin, admin.id)).statusCode).toBe(403)
      await expectOwner(classId, f.users.owner.id)

      const done = await transfer(owner(), admin.id)
      expect(done.statusCode).toBe(200)
      await expectOwner(classId, admin.id)
      // El anterior se queda, con administración.
      expect(
        await prisma.classTeacher.findUniqueOrThrow({
          where: { classId_userId: { classId, userId: f.users.owner.id } },
        })
      ).toMatchObject({ isOwner: false, access: 'admin' })
      expect(done.json().teachers[0]).toMatchObject({ id: admin.id, isOwner: true })

      const [entry] = await logs(classId, 'class.ownership_transferred')
      expect(entry).toMatchObject({
        actorId: f.users.owner.id,
        targetUserId: admin.id,
        metadata: { fromUserId: f.users.owner.id, byPlatformAdmin: false },
      })
      await eventually(
        () => notices(admin.id, 'class_ownership_received'),
        rows => rows.length > 0
      )

      // Lo que es solo del propietario pasa con la clase.
      const publish = (actor: Who) =>
        send('POST', `/teacher/classes/${classId}/publish-template`, actor, { publish: false })
      expect((await publish(owner())).statusCode).toBe(403)
      expect((await publish(admin)).statusCode).toBe(200)
    })

    it('desde el panel, la administración de la plataforma la pasa a cualquiera del profesorado', async () => {
      const { classId, editor } = await classWithStaff()
      const platform = await newUser('admin', 'plataforma')

      expect((await send('GET', `/admin/classes/${classId}/teachers`, owner())).statusCode).toBe(
        403
      )
      const list = await send('GET', `/admin/classes/${classId}/teachers`, platform)
      expect(list.statusCode).toBe(200)
      expect(list.json().teachers).toHaveLength(3)

      const done = await send('POST', `/admin/classes/${classId}/transfer`, platform, {
        userId: editor.id,
      })
      expect(done.statusCode).toBe(200)
      // Sube a administración al recibirla.
      await expectOwner(classId, editor.id)
      const [entry] = await logs(classId, 'class.ownership_transferred')
      expect(entry).toMatchObject({
        actorId: platform.id,
        metadata: { fromUserId: f.users.owner.id, byPlatformAdmin: true },
      })

      // A quien no es profesorado de la clase, no.
      const stranger = await newUser('teacher', 'ajeno')
      expect(
        (
          await send('POST', `/admin/classes/${classId}/transfer`, platform, {
            userId: stranger.id,
          })
        ).statusCode
      ).toBe(404)
    })

    it('la administración encuentra una clase por su código, sin cargarlas todas', async () => {
      const { classId } = await classWithStaff()
      const platform = await newUser('admin', 'plataforma-busca')
      const { invitationCode } = await prisma.class.findUniqueOrThrow({
        where: { id: classId },
        select: { invitationCode: true },
      })

      const found = await send(
        'GET',
        `/admin/classes?limit=8&search=${encodeURIComponent(invitationCode.toLowerCase())}`,
        platform
      )
      expect(found.statusCode).toBe(200)
      expect(found.json().classes.map((c: { id: string }) => c.id)).toEqual([classId])
    })
  })

  // ==================== BORRAR UNA CUENTA ====================

  describe('borrar una cuenta de profesorado', () => {
    it('sus clases pasan al administrador más antiguo, con las insignias de sus misiones; lo demás se queda sin autor', async () => {
      const leaving = await newUser('teacher', 'se-va')
      const cls = await newClass(leaving.id, 'Heredada')
      const oldEditor = await newUser('teacher', 'editor-antiguo')
      const oldestAdmin = await newUser('teacher', 'admin-antiguo')
      const newerAdmin = await newUser('teacher', 'admin-nuevo')
      await join(oldEditor.id, 'edit', { classId: cls.id, createdAt: new Date('2020-01-01') })
      await join(oldestAdmin.id, 'admin', { classId: cls.id, createdAt: new Date('2021-01-01') })
      await join(newerAdmin.id, 'admin', { classId: cls.id, createdAt: new Date('2022-01-01') })
      // Y da clase, con edición, en la del propietario de la fixture.
      await join(leaving.id, 'edit')

      const missionHere = await prisma.mission.create({ data: { classId: cls.id, title: 'M' } })
      const missionThere = await f.newMission()
      const badge = (missionId: string | null) =>
        prisma.badge.create({ data: { name: 'Insignia', teacherId: leaving.id, missionId } })
      const badgeHere = await badge(missionHere.id)
      const badgeThere = await badge(missionThere)
      const loose = await badge(null)

      // Lo que hizo como profesor en la clase de la fixture.
      const enigmaId = await f.newEnigma(missionThere)
      const submission = await prisma.enigmaSubmission.create({
        data: {
          enigmaId,
          studentId: f.users.student.id,
          status: 'aprobada',
          reviewedById: leaving.id,
        },
      })
      const activity = await prisma.activity.create({
        data: {
          userId: f.users.student.id,
          type: 'behavior_applied',
          description: 'Comportamiento',
          classId: f.classId,
          actorId: leaving.id,
          actorName: leaving.name,
        },
      })
      const application = await prisma.behaviorApplication.create({
        data: {
          classId: f.classId,
          teacherId: leaving.id,
          studentId: f.users.student.id,
          kind: 'positive',
          name: 'Participa',
          xpDelta: 1,
          coinDelta: 0,
          lifeDelta: 0,
        },
      })

      const check = await send('GET', '/profile/delete-account/check', leaving)
      expect(check.json()).toEqual({
        canDelete: true,
        blockingClasses: [],
        transfers: [
          {
            classId: cls.id,
            className: cls.name,
            toUser: { id: oldestAdmin.id, name: oldestAdmin.name },
          },
        ],
        trashedClasses: [],
      })

      const deleted = await send('DELETE', '/profile/delete-account', leaving, {
        password: PASSWORD,
      })
      expect(deleted.statusCode).toBe(200)
      expect(await prisma.user.findUnique({ where: { id: leaving.id } })).toBeNull()

      const heir = await prisma.class.findUniqueOrThrow({
        where: { id: cls.id },
        include: { teachers: { where: { isOwner: true } } },
      })
      expect(heir.teacherId).toBe(oldestAdmin.id)
      expect(heir.teachers.map(t => t.userId)).toEqual([oldestAdmin.id])

      // Las insignias de misiones pasan al propietario de cada clase; la suelta se va.
      expect(
        (await prisma.badge.findUniqueOrThrow({ where: { id: badgeHere.id } })).teacherId
      ).toBe(oldestAdmin.id)
      expect(
        (await prisma.badge.findUniqueOrThrow({ where: { id: badgeThere.id } })).teacherId
      ).toBe(f.users.owner.id)
      expect(await prisma.badge.findUnique({ where: { id: loose.id } })).toBeNull()

      // Lo que hizo se conserva, sin autor; el nombre copiado se queda.
      expect(
        (await prisma.enigmaSubmission.findUniqueOrThrow({ where: { id: submission.id } }))
          .reviewedById
      ).toBeNull()
      expect(await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } })).toMatchObject(
        { actorId: null, actorName: leaving.name }
      )
      expect(
        (await prisma.behaviorApplication.findUniqueOrThrow({ where: { id: application.id } }))
          .teacherId
      ).toBeNull()

      const [entry] = await logs(cls.id, 'class.ownership_transferred')
      expect(entry).toMatchObject({
        actorId: null,
        actorName: leaving.name,
        targetUserId: oldestAdmin.id,
        metadata: { fromUserId: leaving.id, reason: 'account_deleted' },
      })
      await eventually(
        () => notices(oldestAdmin.id, 'class_ownership_received'),
        rows => rows.length > 0
      )
    })

    it('la clase no pasa a una cuenta suspendida: se salta y, si no queda otra, no se borra', async () => {
      const leaving = await newUser('teacher', 'se-va-relevo')
      const cls = await newClass(leaving.id, 'Relevo activo')
      const suspended = await newUser('teacher', 'admin-suspendido', { status: 'suspended' })
      const active = await newUser('teacher', 'admin-activo')
      await join(suspended.id, 'admin', { classId: cls.id, createdAt: new Date('2020-01-01') })
      await join(active.id, 'admin', { classId: cls.id, createdAt: new Date('2021-01-01') })

      const check = (await send('GET', '/profile/delete-account/check', leaving)).json()
      expect(check.transfers).toEqual([
        { classId: cls.id, className: cls.name, toUser: { id: active.id, name: active.name } },
      ])

      // Sin la activa, solo queda la suspendida: la cuenta no se puede borrar.
      await prisma.classTeacher.delete({
        where: { classId_userId: { classId: cls.id, userId: active.id } },
      })
      const blocked = (await send('GET', '/profile/delete-account/check', leaving)).json()
      expect(blocked).toMatchObject({
        canDelete: false,
        blockingClasses: [{ id: cls.id, name: cls.name }],
      })
      const attempt = await send('DELETE', '/profile/delete-account', leaving, {
        password: PASSWORD,
      })
      expect(attempt.statusCode).toBe(409)
      expect((await prisma.class.findUniqueOrThrow({ where: { id: cls.id } })).teacherId).toBe(
        leaving.id
      )
    })

    it('una insignia suelta que un alumno ya ganó pasa al propietario de su clase y el alumno la conserva', async () => {
      const leaving = await newUser('teacher', 'se-va-sueltas')
      await join(leaving.id, 'edit')
      const outsider = await newUser('student', 'fuera')
      const loose = (name: string) => prisma.badge.create({ data: { name, teacherId: leaving.id } })
      const earnedHere = await loose('Ganada aquí')
      const earnedElsewhere = await loose('Ganada fuera')
      const unearned = await loose('Sin ganar')
      await prisma.studentBadge.create({
        data: { studentId: f.users.student.id, badgeId: earnedHere.id },
      })
      // Quien la ganó ya no está en ninguna clase suya: no hay quién la conserve.
      await prisma.studentBadge.create({
        data: { studentId: outsider.id, badgeId: earnedElsewhere.id },
      })

      const platform = await newUser('admin', 'plataforma-sueltas')
      expect((await send('DELETE', `/admin/users/${leaving.id}`, platform)).statusCode).toBe(200)

      expect(
        (await prisma.badge.findUniqueOrThrow({ where: { id: earnedHere.id } })).teacherId
      ).toBe(f.users.owner.id)
      expect(
        await prisma.studentBadge.findUnique({
          where: {
            studentId_badgeId: { studentId: f.users.student.id, badgeId: earnedHere.id },
          },
        })
      ).not.toBeNull()
      expect(await prisma.badge.findUnique({ where: { id: earnedElsewhere.id } })).toBeNull()
      expect(await prisma.badge.findUnique({ where: { id: unearned.id } })).toBeNull()
      await prisma.studentBadge.deleteMany({ where: { badgeId: earnedHere.id } })
      await prisma.badge.delete({ where: { id: earnedHere.id } })
    })

    it('si en una clase no queda nadie con administración, no se borra nada y se dice cuál', async () => {
      const blocked = await newUser('teacher', 'bloqueado')
      const cls = await newClass(blocked.id, 'Sin relevo')
      const editor = await newUser('teacher', 'solo-edita')
      await join(editor.id, 'edit', { classId: cls.id })
      const loose = await prisma.badge.create({ data: { name: 'Suelta', teacherId: blocked.id } })
      const platform = await newUser('admin', 'plataforma')

      const expected = {
        canDelete: false,
        blockingClasses: [{ id: cls.id, name: cls.name }],
        transfers: [],
        trashedClasses: [],
      }
      expect((await send('GET', '/profile/delete-account/check', blocked)).json()).toEqual(expected)
      expect(
        (await send('GET', `/admin/users/${blocked.id}/deletion-check`, platform)).json()
      ).toEqual(expected)

      for (const attempt of [
        send('DELETE', '/profile/delete-account', blocked, { password: PASSWORD }),
        send('DELETE', `/admin/users/${blocked.id}`, platform),
      ]) {
        const response = await attempt
        expect(response.statusCode).toBe(409)
        expect(response.json()).toMatchObject({
          code: 'OWNS_CLASSES_WITHOUT_SUCCESSOR',
          classes: [{ id: cls.id, name: cls.name }],
        })
      }
      // Nada ha cambiado: ni la cuenta, ni la clase, ni sus insignias.
      expect(await prisma.user.findUnique({ where: { id: blocked.id } })).not.toBeNull()
      expect((await prisma.class.findUniqueOrThrow({ where: { id: cls.id } })).teacherId).toBe(
        blocked.id
      )
      expect(await prisma.badge.findUnique({ where: { id: loose.id } })).not.toBeNull()

      // Pasada la clase desde el panel, ya se puede.
      expect(
        (
          await send('POST', `/admin/classes/${cls.id}/transfer`, platform, {
            userId: editor.id,
          })
        ).statusCode
      ).toBe(200)
      expect((await send('DELETE', `/admin/users/${blocked.id}`, platform)).statusCode).toBe(200)
      expect(await prisma.user.findUnique({ where: { id: blocked.id } })).toBeNull()
      expect(await prisma.badge.findUnique({ where: { id: loose.id } })).toBeNull()
    })
  })

  // ==================== AUTORÍA Y REGISTRO ====================

  describe('autoría y registro de acciones', () => {
    it('aprobar una entrega deja quién la revisó: en la entrega, en el feed del alumno y en el registro', async () => {
      const reviewer = await newUser('teacher', 'revisa')
      await join(reviewer.id, 'edit')
      const missionId = await f.newMission()
      const enigmaId = await f.newEnigma(missionId)
      await f.newEnigma(missionId)
      const submissionId = await f.newSubmission(enigmaId)

      const approved = await send('POST', `/submissions/${submissionId}/approve`, reviewer, {
        percentage: 50,
      })
      expect(approved.statusCode).toBe(200)

      expect(
        (await prisma.enigmaSubmission.findUniqueOrThrow({ where: { id: submissionId } }))
          .reviewedById
      ).toBe(reviewer.id)
      const [entry] = (await logs(f.classId, 'submission.approved')).filter(
        e => e.entityId === submissionId
      )
      expect(entry).toMatchObject({
        actorId: reviewer.id,
        actorName: reviewer.name,
        targetUserId: f.users.student.id,
        metadata: expect.objectContaining({ percentage: 50, xpAwarded: 5, enigmaId, missionId }),
      })

      const feed = await send(
        'GET',
        `/students/classes/${f.classId}/activities?limit=20`,
        f.users.student
      )
      const item = feed
        .json()
        .activities.find(
          (a: { type: string; metadata: { enigmaId?: string } }) =>
            a.type === 'enigma_completed' && a.metadata?.enigmaId === enigmaId
        )
      expect(item.actor).toEqual({ id: reviewer.id, name: reviewer.name, avatar: null })
    })

    it('aplicar un comportamiento queda a nombre de quien lo aplica, también en el feed', async () => {
      const behaviorId = await f.newBehavior()
      const applied = await send('POST', url(`/behaviors/${behaviorId}/apply`), owner(), {
        studentId: f.users.student.id,
      })
      expect(applied.statusCode).toBe(200)

      const [entry] = (await logs(f.classId, 'behavior.applied')).filter(
        e => e.entityId === behaviorId
      )
      expect(entry).toMatchObject({
        actorId: f.users.owner.id,
        targetUserId: f.users.student.id,
        metadata: { title: 'Participa', kind: 'positive', xpDelta: 5, coinDelta: 0, lifeDelta: 0 },
      })
      const activity = await prisma.activity.findFirstOrThrow({
        where: { userId: f.users.student.id, type: 'behavior_applied', classId: f.classId },
        orderBy: { createdAt: 'desc' },
      })
      expect(activity.actorId).toBe(f.users.owner.id)
    })

    it('subir las recompensas de un enigma ya completado registra el reparto a quien lo hizo', async () => {
      const missionId = await f.newMission()
      const enigmaId = await f.newEnigma(missionId)
      await prisma.studentEnigmaProgress.create({
        data: { studentId: f.users.student.id, enigmaId, xpEarned: 10, percentage: 100 },
      })

      // El formulario manda el título siempre; sin cambiarlo, solo cambian las recompensas.
      const response = await send('PUT', `/missions/${missionId}/enigmas/${enigmaId}`, owner(), {
        title: 'Enigma',
        xp: 30,
      })
      expect(response.statusCode).toBe(200)

      const [entry] = (await logs(f.classId, 'enigma.rewards_changed')).filter(
        e => e.entityId === enigmaId
      )
      expect(entry.metadata).toEqual({
        title: 'Enigma',
        missionId,
        before: { xp: 10, coins: 0, mana: 0 },
        after: { xp: 30, coins: 0, mana: 0 },
        affectedCount: 1,
      })
      // Sin cambiar nada más, no hay entrada de edición.
      expect(
        (await logs(f.classId, 'enigma.updated')).filter(e => e.entityId === enigmaId)
      ).toHaveLength(0)
    })

    it('lo que se cambia en la clase, su contenido, su tienda y sus comportamientos queda registrado', async () => {
      const since = new Date()
      const as = owner()

      const item = await send('POST', url('/shop/items'), as, { name: 'Pase', price: 3 })
      await send('PUT', url(`/shop/items/${item.json().id}`), as, { price: 4 })
      await send('DELETE', url(`/shop/items/${item.json().id}`), as)
      const behavior = await send('POST', url('/behaviors'), as, {
        kind: 'negative',
        name: 'Llega tarde',
        lives: 1,
      })
      await send('PUT', url(`/behaviors/${behavior.json().id}`), as, { lives: 2 })
      await send('DELETE', url(`/behaviors/${behavior.json().id}`), as)
      await send('PUT', url(), as, { narrative: `Otra narrativa ${tag}` })
      await send('PUT', url(), as, { settings: { shop: true } })
      await send('PUT', url('/guide'), as, { content: 'Guía' })
      await send('PATCH', url('/archive'), as, { archived: true })
      await send('PATCH', url('/archive'), as, { archived: false })
      await prisma.class.update({
        where: { id: f.classId },
        data: { subject: 'informatica', educationLevel: 'fp_medio', language: 'es' },
      })
      await send('POST', url('/publish-template'), as, { publish: true })
      await send('POST', url('/publish-template'), as, { publish: false })
      const mission = await send('POST', '/missions', as, {
        title: 'Misión registrada',
        classId: f.classId,
        enigmas: [{ title: 'Primero' }, { title: 'Segundo' }],
      })
      const missionId = mission.json().mission.id
      await send('PATCH', `/missions/${missionId}`, as, { status: 'bloqueada' })
      const enigma = await send('POST', `/missions/${missionId}/enigmas`, as, { title: 'Tercero' })
      await send('PUT', `/missions/${missionId}/enigmas/${enigma.json().enigma.id}`, as, {
        title: 'Tercero bis',
      })
      await send('DELETE', `/missions/${missionId}/enigmas/${enigma.json().enigma.id}`, as)
      const copy = await send('POST', url('/duplicate'), as, {})

      const actions = (
        await prisma.classActionLog.findMany({
          where: { classId: f.classId, createdAt: { gte: since } },
          orderBy: { createdAt: 'asc' },
        })
      ).map(e => e.action)
      expect(actions).toEqual([
        'shop.item_created',
        'shop.item_updated',
        'shop.item_deleted',
        'behavior.created',
        'behavior.updated',
        'behavior.deleted',
        'class.updated',
        'class.settings_changed',
        'class.guide_updated',
        'class.archived',
        'class.unarchived',
        'class.template_published',
        'class.template_unpublished',
        'mission.created',
        'mission.updated',
        'enigma.created',
        'enigma.updated',
        'enigma.deleted',
        'class.duplicated',
      ])
      // La copia es otra clase: en la de origen queda cuál.
      expect((await logs(f.classId, 'class.duplicated')).map(e => e.entityId)).toContain(
        copy.json().class.id
      )
      const blocked = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'mission.updated', entityId: missionId },
      })
      expect(blocked.metadata).toEqual({
        title: 'Misión registrada',
        fields: ['status'],
        status: 'bloqueada',
      })
    })

    it('el historial: por páginas, por profesor y por tipo, con claves y datos y sin nombres de alumnos en lo guardado', async () => {
      // Lee lo que han dejado en el registro los casos de arriba: la entrega
      // aprobada, la tienda, los comportamientos.
      const reader = await newUser('teacher', 'lector')
      await join(reader.id, 'read', { profile: 'practicas' })
      const history = (query: string, actor: Who = reader) =>
        send('GET', url(`/history?${query}`), actor)

      const first = await history('page=1&limit=2')
      expect(first.statusCode).toBe(200)
      const page = first.json()
      expect(page.entries).toHaveLength(2)
      expect(page.total).toBeGreaterThan(2)
      expect(page.totalPages).toBe(Math.ceil(page.total / 2))
      expect(page.filters.types).toContain('submission')
      expect(page.filters.actors.map((a: { id: string }) => a.id)).toContain(f.users.owner.id)
      const second = (await history('page=2&limit=2')).json()
      expect(second.entries[0].id).not.toBe(page.entries[0].id)

      const shop = (await history('type=shop&limit=50')).json()
      expect(shop.entries.length).toBeGreaterThan(0)
      for (const entry of shop.entries) {
        expect(entry.action.startsWith('shop.')).toBe(true)
        expect(entry.type).toBe('shop')
        expect(entry.params).toHaveProperty('title')
      }

      const byOwner = (await history(`actorId=${f.users.owner.id}&limit=50`)).json()
      expect(
        byOwner.entries.every((e: { actor: { id: string } }) => e.actor.id === f.users.owner.id)
      ).toBe(true)

      // La persona sobre la que recae se resuelve al leer.
      const approval = (await history('type=submission&limit=1')).json().entries[0]
      expect(approval).toMatchObject({
        action: 'submission.approved',
        target: { id: f.users.student.id, role: 'student' },
        params: expect.objectContaining({ percentage: 50 }),
      })

      expect((await history('type=otra')).statusCode).toBe(400)

      // Nada de lo guardado lleva el nombre, el alias o el correo del alumno.
      const student = await prisma.user.findUniqueOrThrow({ where: { id: f.users.student.id } })
      const enrollment = await prisma.classEnrollment.findUniqueOrThrow({
        where: { studentId_classId: { studentId: student.id, classId: f.classId } },
      })
      const stored = JSON.stringify(
        await prisma.classActionLog.findMany({
          where: { classId: f.classId },
          select: { metadata: true },
        })
      )
      for (const value of [student.name, student.email, enrollment.nickname]) {
        if (value) expect(stored).not.toContain(value)
      }
    })
    it('el historial no da el nombre de un alumno que ya no está en la clase', async () => {
      const gone = await newUser('student', 'alumna-que-se-va')
      await prisma.classEnrollment.create({ data: { studentId: gone.id, classId: f.classId } })
      const removed = await send('DELETE', url(`/students/${gone.id}`), owner())
      expect(removed.statusCode).toBe(200)

      // Quien entra después solo ve que era un alumno.
      const newcomer = await newUser('teacher', 'recien-llegado')
      await join(newcomer.id, 'read', { profile: 'practicas' })
      const response = await send('GET', url('/history?type=student&limit=50'), newcomer)
      expect(response.statusCode).toBe(200)
      expect(response.body).not.toContain(gone.name)
      const entry = response
        .json()
        .entries.find((e: { action: string }) => e.action === 'student.removed')
      expect(entry.target).toEqual({ id: null, name: null, role: 'student' })

      // De quien sigue en la clase sí sale el nombre.
      const approval = (await send('GET', url('/history?type=submission&limit=1'), newcomer)).json()
        .entries[0]
      expect(approval.target).toMatchObject({ id: f.users.student.id, name: expect.any(String) })
    })

    it('crear, editar y archivar una clase devuelven el acceso propio, como el listado', async () => {
      const creator = await newUser('teacher', 'crea')
      const created = await send('POST', '/teacher/classes', creator, { name: `Nueva ${tag}` })
      expect(created.statusCode).toBe(201)
      const cls = created.json().class
      const ownerAccess = { access: 'admin', profile: 'titular', isOwner: true }
      expect(cls.myAccess).toEqual(ownerAccess)
      expect(cls.teachers).toEqual([{ id: creator.id, name: creator.name, ...ownerAccess }])

      const editor = await newUser('teacher', 'edita-clase')
      await join(editor.id, 'edit', { classId: cls.id })
      const updated = await send('PUT', `/teacher/classes/${cls.id}`, editor, {
        narrative: 'Otra',
      })
      expect(updated.json().class.myAccess).toEqual({
        access: 'edit',
        profile: 'sustituto',
        isOwner: false,
      })
      const archived = await send('PATCH', `/teacher/classes/${cls.id}/archive`, creator, {
        archived: true,
      })
      expect(archived.json().class.myAccess).toEqual(ownerAccess)
    })

    it('el filtro de profesorado trae a cada uno una vez, con su último nombre', async () => {
      const renamed = await newUser('teacher', 'renombrado')
      await join(renamed.id, 'admin')
      await send('PUT', url('/guide'), renamed, { content: 'Guía 1' })
      await prisma.user.update({ where: { id: renamed.id }, data: { name: `Nuevo ${tag}` } })
      await send('PUT', url('/guide'), renamed, { content: 'Guía 2' })

      const actors = (await send('GET', url('/history?limit=1'), owner())).json().filters.actors
      const mine = actors.filter((a: { id: string }) => a.id === renamed.id)
      expect(mine).toEqual([{ id: renamed.id, name: `Nuevo ${tag}` }])
    })
  })

  // ==================== LO QUE VE EL ALUMNO ====================

  describe('lo que ve el alumno', () => {
    it('la clase trae su profesorado, también quien está en prácticas, con nombre y perfil', async () => {
      const trainee = await newUser('teacher', 'en-practicas')
      await join(trainee.id, 'read', { profile: 'practicas' })

      const response = await send('GET', `/students/classes/${f.classId}`, f.users.student)
      expect(response.statusCode).toBe(200)
      const teachers = response.json().class.teachers
      expect(teachers[0]).toEqual({
        name: expect.stringContaining('owner'),
        profile: 'titular',
        isOwner: true,
      })
      expect(teachers).toContainEqual({ name: trainee.name, profile: 'practicas', isOwner: false })
      // Ni correos ni niveles de acceso.
      for (const teacher of teachers)
        expect(Object.keys(teacher).sort()).toEqual(['isOwner', 'name', 'profile'])
    })
  })
})
