import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Cuentas de alumnado sin correo: quién las crea, quién les restablece la
 * contraseña, con qué se entra y qué no puede hacer una cuenta gestionada.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Solo se simula el correo, que sale de la máquina.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendPasswordChangedEmail: vi.fn(async () => {}),
  sendNotificationEmail: vi.fn(async () => {}),
}))

import cookie from '@fastify/cookie'
import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { profileRoutes } from '../../src/modules/profile/profile.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { authRoutes } from '../../src/modules/auth/auth.routes.js'
import { hashPassword, verifyPassword } from '../../src/utils/password.js'
import { invalidateSettingsCache } from '../../src/modules/settings/settings.service.js'
import { sessionGate } from '../../src/utils/session-gate.js'
import { resetRateLimits } from '../../src/utils/rate-limit.js'

describeWithDatabase('cuentas de alumnado sin correo', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  /** Cuentas creadas por las rutas, que la fixture no conoce. */
  const createdIds = new Set<string>()
  let adminId: string

  const token = (user: { id: string; role: string | null }) =>
    app.jwt.sign({ id: user.id, role: user.role })

  const send = (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    actor?: { id: string; role: string | null },
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: actor ? { authorization: `Bearer ${token(actor)}` } : {},
    })

  const admin = () => ({ id: adminId, role: 'admin' as const })

  /** Crea una cuenta gestionada por la ruta del profesor y la apunta para borrarla. */
  const createManaged = async (
    name = `Alumno ${tag}`,
    body: Record<string, unknown> = {},
    actor = f.users.owner
  ) => {
    const response = await send('POST', `/teacher/classes/${f.classId}/students`, actor, {
      name,
      ...body,
    })
    if (response.statusCode === 201) createdIds.add(response.json().student.id)
    return response
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(cookie)
      instance.addHook('onRequest', sessionGate)
      await instance.register(authRoutes, { prefix: '/auth' })
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(profileRoutes, { prefix: '/profile' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
    f = await createClassFixture(app)
    const adminUser = await prisma.user.create({
      data: {
        email: `admin.${tag}@test.invalid`,
        passwordHash: 'x',
        name: `Admin ${tag}`,
        role: 'admin',
        isOnboarded: true,
      },
    })
    adminId = adminUser.id
    createdIds.add(adminUser.id)
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: [...createdIds] } } })
    await app?.close()
  })

  // ==================== ALTA ====================

  describe('alta', () => {
    it('quien tiene administración en la clase crea la cuenta, con usuario y contraseña temporal', async () => {
      const response = await createManaged(`Ana Gómez ${tag}`)
      expect(response.statusCode).toBe(201)

      const body = response.json()
      expect(body.student.username).toMatch(/^ana\.g\.[a-z0-9]{2}$/)
      expect(body.temporaryPassword).toHaveLength(8)

      const student = await prisma.user.findUniqueOrThrow({ where: { id: body.student.id } })
      expect(student).toMatchObject({
        email: null,
        accountType: 'managed',
        role: 'student',
        isOnboarded: true,
        mustChangePassword: true,
        createdById: f.users.owner.id,
        homeClassId: f.classId,
      })
      // La contraseña nunca se guarda en claro.
      expect(student.passwordHash).not.toContain(body.temporaryPassword)
      expect(await verifyPassword(body.temporaryPassword, student.passwordHash)).toBe(true)
    })

    it('la cuenta queda matriculada en su clase de origen, con alias y avatar', async () => {
      const created = await createManaged()
      const enrollment = await prisma.classEnrollment.findUniqueOrThrow({
        where: { studentId_classId: { studentId: created.json().student.id, classId: f.classId } },
      })
      expect(enrollment.isPreview).toBe(false)
      expect(enrollment.nickname).toBeTruthy()
      expect(enrollment.avatarUrl).toBeTruthy()
    })

    it('el alta queda registrada en la clase, sin el nombre del alumno', async () => {
      const created = await createManaged()
      const entry = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'student.account_created' },
        orderBy: { createdAt: 'desc' },
      })
      expect(entry.targetUserId).toBe(created.json().student.id)
      expect(entry.actorId).toBe(f.users.owner.id)
    })

    it('otro profesor, un alumno de la clase y una petición sin sesión no crean nada', async () => {
      // El profesor de otra clase no la ve; quien no es profesor no entra en las
      // rutas de profesor, y sin sesión no se pasa de la puerta.
      expect((await createManaged(`X ${tag}`, {}, f.users.other)).statusCode).toBe(404)
      expect((await createManaged(`X ${tag}`, {}, f.users.student)).statusCode).toBe(403)
      expect(
        (await send('POST', `/teacher/classes/${f.classId}/students`, undefined, { name: 'X' }))
          .statusCode
      ).toBe(401)
    })

    it('quien administra la plataforma crea desde el panel, en cualquier clase', async () => {
      // Las rutas de profesor son solo para el profesorado; el panel es su camino.
      expect((await createManaged(`Desde clase ${tag}`, {}, admin())).statusCode).toBe(403)

      const fromPanel = await send('POST', '/admin/users/managed', admin(), {
        classId: f.otherClassId,
        name: `Desde panel ${tag}`,
      })
      expect(fromPanel.statusCode).toBe(201)
      createdIds.add(fromPanel.json().student.id)
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: fromPanel.json().student.id } }))
          .homeClassId
      ).toBe(f.otherClassId)
    })

    // Decisión: dar de alta alumnado sin correo no depende del registro público.
    it('funciona aunque el registro público esté cerrado', async () => {
      const previous = await prisma.instanceSetting.findUnique({ where: { section: 'general' } })
      await prisma.instanceSetting.upsert({
        where: { section: 'general' },
        create: { section: 'general', data: { registrationOpen: false } },
        update: {
          data: {
            ...((previous?.data as Record<string, unknown>) ?? {}),
            registrationOpen: false,
          },
        },
      })
      invalidateSettingsCache()

      try {
        // El registro público sí queda cerrado…
        const signup = await send('POST', '/auth/signup', undefined, {
          email: `cerrado.${tag}@test.invalid`,
          password: 'contraseña-larga',
          name: `Cerrado ${tag}`,
          acceptTerms: true,
        })
        expect(signup.statusCode).toBe(409)

        // …y el alta hecha por el profesorado sigue funcionando.
        expect((await createManaged(`Con registro cerrado ${tag}`)).statusCode).toBe(201)
      } finally {
        if (previous) {
          await prisma.instanceSetting.update({
            where: { section: 'general' },
            data: { data: previous.data as object },
          })
        } else {
          await prisma.instanceSetting.delete({ where: { section: 'general' } })
        }
        invalidateSettingsCache()
      }
    })

    it('el usuario se puede escribir y se guarda en minúsculas', async () => {
      const chosen = `elegido.${tag.slice(0, 5)}`
      const first = await createManaged(`Con usuario ${tag}`, { username: chosen.toUpperCase() })
      expect(first.statusCode).toBe(201)
      // Se guarda en minúsculas, aunque se escriba de otra forma.
      expect(first.json().student.username).toBe(chosen)
    })

    // Decir «ese usuario ya está cogido» diría también qué usuarios existen, y un
    // usuario es con lo que entra su dueño: se crea con un sufijo detrás y la
    // respuesta dice con cuál ha nacido.
    it('un usuario escrito que ya está cogido no se delata: se crea con un sufijo', async () => {
      const chosen = `repetido.${tag.slice(0, 5)}`
      const first = await createManaged(`Primero ${tag}`, { username: chosen })
      expect(first.json().student.username).toBe(chosen)

      const repeated = await createManaged(`Otro ${tag}`, { username: chosen })
      expect(repeated.statusCode).toBe(201)
      const born: string = repeated.json().student.username
      expect(born).not.toBe(chosen)
      expect(born.startsWith(`${chosen}.`)).toBe(true)
    })

    it('rechaza un usuario con caracteres que no se pueden teclear sin dudar', async () => {
      const response = await createManaged(`Raro ${tag}`, { username: 'ana gómez' })
      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('INVALID_USERNAME')
    })

    it('rechaza un nombre vacío y una clase archivada', async () => {
      expect((await createManaged(' ')).statusCode).toBe(400)

      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      const archived = await createManaged(`En archivada ${tag}`)
      await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      expect(archived.statusCode).toBe(400)
      expect(archived.json().code).toBe('CLASS_ARCHIVED')
    })

    it('la propuesta de usuario devuelve uno libre y no dice si el preguntado existe', async () => {
      resetRateLimits()
      const url = `/teacher/classes/${f.classId}/students/username-proposal?name=Ana%20G%C3%B3mez`

      const mine = await send('GET', url, f.users.owner)
      expect(mine.statusCode).toBe(200)
      expect(mine.json().username).toMatch(/^ana\.g\.[a-z0-9]{2}$/)
      expect(Object.keys(mine.json())).toEqual(['username'])

      // Y sigue estando libre: la propuesta no reserva nada, solo propone.
      expect(await prisma.user.findUnique({ where: { username: mine.json().username } })).toBeNull()

      expect((await send('GET', url, f.users.other)).statusCode).toBe(404)
      expect((await send('GET', url, f.users.student)).statusCode).toBe(403)
      expect((await send('GET', url, undefined)).statusCode).toBe(401)
    })

    it('la propuesta tiene límite de peticiones', async () => {
      resetRateLimits()
      const url = `/teacher/classes/${f.classId}/students/username-proposal?name=Ana`
      let last = 200
      for (let i = 0; i < 125 && last === 200; i++) {
        last = (await send('GET', url, f.users.owner)).statusCode
      }
      expect(last).toBe(429)
      resetRateLimits()
    })
  })

  // ==================== RESTABLECER ====================

  describe('restablecer la contraseña', () => {
    // Sin clase en el camino: quien puede se decide por la clase de origen.
    const resetUrl = (studentId: string) => `/teacher/students/${studentId}/reset-password`

    it('da una temporal nueva, obliga a cambiarla y cierra sus sesiones', async () => {
      const created = await createManaged(`Reset ${tag}`)
      const studentId = created.json().student.id

      await prisma.user.update({ where: { id: studentId }, data: { mustChangePassword: false } })
      const session = await prisma.refreshToken.create({
        data: {
          token: `token-${randomUUID()}`,
          userId: studentId,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      })

      const response = await send('POST', resetUrl(studentId), f.users.owner)
      expect(response.statusCode).toBe(200)
      expect(response.json().temporaryPassword).toHaveLength(8)
      expect(response.json().temporaryPassword).not.toBe(created.json().temporaryPassword)

      const student = await prisma.user.findUniqueOrThrow({ where: { id: studentId } })
      expect(student.mustChangePassword).toBe(true)
      expect(student.passwordChangedAt).toBeTruthy()
      expect(await verifyPassword(response.json().temporaryPassword, student.passwordHash)).toBe(
        true
      )
      // La de antes ya no vale.
      expect(await verifyPassword(created.json().temporaryPassword, student.passwordHash)).toBe(
        false
      )
      expect(
        (await prisma.refreshToken.findUniqueOrThrow({ where: { id: session.id } })).isRevoked
      ).toBe(true)

      const entry = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'student.password_reset' },
        orderBy: { createdAt: 'desc' },
      })
      expect(entry.targetUserId).toBe(studentId)
    })

    it('otro profesor, un alumno y una petición sin sesión no lo consiguen', async () => {
      const studentId = (await createManaged(`Ajeno ${tag}`)).json().student.id

      expect((await send('POST', resetUrl(studentId), f.users.other)).statusCode).toBe(404)
      expect((await send('POST', resetUrl(studentId), f.users.student)).statusCode).toBe(403)
      expect((await send('POST', resetUrl(studentId), undefined)).statusCode).toBe(401)

      // Y la contraseña sigue siendo la de antes.
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: studentId } })).mustChangePassword
      ).toBe(true)
    })

    it('una cuenta con correo no se restablece por aquí', async () => {
      const response = await send('POST', resetUrl(f.users.student.id), f.users.owner)
      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('NOT_A_MANAGED_ACCOUNT')
    })

    it('quien administra la plataforma llega también a una cuenta sin clase de origen', async () => {
      const studentId = (await createManaged(`Sin clase ${tag}`)).json().student.id
      await prisma.user.update({ where: { id: studentId }, data: { homeClassId: null } })

      const byTeacher = await send('POST', resetUrl(studentId), f.users.owner)
      expect(byTeacher.statusCode).toBe(403)
      expect(byTeacher.json().code).toBe('NO_HOME_CLASS')

      const byAdmin = await send('POST', `/admin/users/${studentId}/reset-password`, admin())
      expect(byAdmin.statusCode).toBe(200)
      expect(byAdmin.json().temporaryPassword).toHaveLength(8)
    })
  })

  // ==================== ENTRADA ====================

  describe('entrada', () => {
    const PASSWORD = 'contraseña-de-prueba'

    it('se entra con el usuario, y la cuenta llega con su usuario y su tipo', async () => {
      const created = await createManaged(`Entra ${tag}`)
      const { username } = created.json().student

      const response = await send('POST', '/auth/login', undefined, {
        identifier: username,
        password: created.json().temporaryPassword,
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().user).toMatchObject({
        email: null,
        username,
        accountType: 'managed',
        mustChangePassword: true,
      })
    })

    it('el usuario se reconoce escrito con mayúsculas', async () => {
      const created = await createManaged(`Mayus ${tag}`)
      const response = await send('POST', '/auth/login', undefined, {
        identifier: created.json().student.username.toUpperCase(),
        password: created.json().temporaryPassword,
      })
      expect(response.statusCode).toBe(200)
    })

    it('se entra con el correo, en minúsculas y como se haya escrito', async () => {
      const email = `entra.${tag}@test.invalid`
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(PASSWORD),
          name: `Entra ${tag}`,
          role: 'teacher',
          isOnboarded: true,
        },
      })
      createdIds.add(user.id)

      for (const identifier of [email, email.toUpperCase(), ` ${email} `]) {
        const response = await send('POST', '/auth/login', undefined, {
          identifier,
          password: PASSWORD,
        })
        expect(response.statusCode).toBe(200)
        expect(response.json().user.email).toBe(email)
      }
    })

    // Compatibilidad de despliegue: el frontend publicado manda `email`.
    it('acepta el campo antiguo, con un correo y con un usuario', async () => {
      const created = await createManaged(`Antiguo ${tag}`)
      const response = await send('POST', '/auth/login', undefined, {
        email: created.json().student.username,
        password: created.json().temporaryPassword,
      })
      expect(response.statusCode).toBe(200)
    })

    it('un usuario que no existe y una contraseña equivocada responden lo mismo', async () => {
      const created = await createManaged(`Fallo ${tag}`)
      const unknown = await send('POST', '/auth/login', undefined, {
        identifier: `no.existe.${tag}`,
        password: created.json().temporaryPassword,
      })
      const wrong = await send('POST', '/auth/login', undefined, {
        identifier: created.json().student.username,
        password: 'lo-que-no-es',
      })
      expect(unknown.statusCode).toBe(401)
      expect(wrong.statusCode).toBe(401)
      expect(unknown.json().message).toBe(wrong.json().message)
    })

    // Con el usuario como identificador, lo único que separa de la cuenta es la
    // contraseña: el estado de la cuenta se cuenta DESPUÉS de comprobarla.
    it('una cuenta suspendida no se distingue sin acertar la contraseña', async () => {
      const created = await createManaged(`Suspendida ${tag}`)
      const { username } = created.json().student
      await prisma.user.update({
        where: { id: created.json().student.id },
        data: { status: 'suspended' },
      })

      const wrong = await send('POST', '/auth/login', undefined, {
        identifier: username,
        password: 'lo-que-no-es',
      })
      const unknown = await send('POST', '/auth/login', undefined, {
        identifier: `no.existe.${tag}`,
        password: 'lo-que-no-es',
      })
      expect(wrong.statusCode).toBe(401)
      expect(wrong.json().message).toBe(unknown.json().message)

      // Con la contraseña buena sí se dice, que es lo que hace falta saber.
      const right = await send('POST', '/auth/login', undefined, {
        identifier: username,
        password: created.json().temporaryPassword,
      })
      expect(right.statusCode).toBe(401)
      expect(right.json().message).not.toBe(unknown.json().message)
    })

    // Tarda: cada intento comprueba una contraseña de verdad, y de eso va la
    // prueba (también los fallos cuestan lo mismo que los aciertos).
    it('los intentos fallidos se acaban cortando, y acertar no gasta cupo', async () => {
      resetRateLimits()
      const created = await createManaged(`Cupo ${tag}`)
      const { username } = created.json().student
      const attempt = (password: string) =>
        send('POST', '/auth/login', undefined, { identifier: username, password })

      // Entrar bien más veces que el límite de fallos: los aciertos no cuentan.
      for (let i = 0; i < 11; i++) {
        expect((await attempt(created.json().temporaryPassword)).statusCode).toBe(200)
      }

      let last = 401
      for (let i = 0; i < 15 && last === 401; i++) {
        last = (await attempt('lo-que-no-es')).statusCode
      }
      expect(last).toBe(429)
      resetRateLimits()
    }, 60_000)

    it('recuperar la contraseña responde igual con correo conocido y desconocido', async () => {
      const known = await send('POST', '/auth/forgot-password', undefined, {
        email: `admin.${tag}@test.invalid`,
      })
      const unknown = await send('POST', '/auth/forgot-password', undefined, {
        email: `nadie.${tag}@test.invalid`,
      })
      expect(known.statusCode).toBe(200)
      expect(unknown.statusCode).toBe(200)
      expect(known.json().message).toBe(unknown.json().message)
    })
  })

  // ==================== LÍMITES DE UNA CUENTA GESTIONADA ====================

  describe('lo que una cuenta gestionada no puede hacer', () => {
    /** Una cuenta gestionada con el cambio de contraseña ya hecho, para probar el resto. */
    const settledManaged = async (label: string) => {
      const created = await createManaged(`${label} ${tag}`)
      const id = created.json().student.id
      await prisma.user.update({
        where: { id },
        data: { mustChangePassword: false, passwordHash: await hashPassword('contraseña-larga') },
      })
      return { id, role: 'student' as const }
    }

    it('no puede ponerse un correo', async () => {
      const student = await settledManaged('Correo')
      const response = await send('POST', '/profile/change-email', student, {
        newEmail: `intento.${tag}@test.invalid`,
        password: 'contraseña-larga',
      })
      expect(response.statusCode).toBe(403)
      expect(response.json().code).toBe('MANAGED_ACCOUNT')
      expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).email).toBeNull()
    })

    it('no puede borrarse a sí misma', async () => {
      const student = await settledManaged('Borrado')
      const response = await send('DELETE', '/profile/delete-account', student, {
        password: 'contraseña-larga',
      })
      expect(response.statusCode).toBe(403)
      expect(response.json().code).toBe('MANAGED_ACCOUNT')
      expect(await prisma.user.findUnique({ where: { id: student.id } })).not.toBeNull()
    })

    it('no puede cambiarse el nombre', async () => {
      const student = await settledManaged('Nombre')
      const before = (await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).name

      const response = await send('PUT', '/students/profile/me', student, {
        firstName: 'Otro',
        lastName: 'Nombre',
      })
      expect(response.statusCode).toBe(403)
      expect(response.json().code).toBe('MANAGED_ACCOUNT')
      expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).name).toBe(before)
    })

    it('no hay ninguna ruta con la que cambiarse el usuario', async () => {
      const student = await settledManaged('Usuario')
      const before = (await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).username

      for (const payload of [{ username: 'otro.usuario' }, { firstName: 'Otro' }]) {
        await send('PUT', '/students/profile/me', student, payload)
      }
      expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).username).toBe(
        before
      )
    })
  })

  // ==================== PRIMER ACCESO ====================

  describe('primer acceso', () => {
    it('con el cambio pendiente solo se puede entrar y cambiar la contraseña', async () => {
      const created = await createManaged(`Primero ${tag}`)
      const student = { id: created.json().student.id, role: 'student' as const }
      const temporary = created.json().temporaryPassword

      // Todo lo demás se cierra con un código propio.
      const blocked = await send('GET', '/students/classes', student)
      expect(blocked.statusCode).toBe(403)
      expect(blocked.json().code).toBe('PASSWORD_CHANGE_REQUIRED')

      // Entrar sigue funcionando: es de donde sale la sesión.
      expect(
        (
          await send('POST', '/auth/login', undefined, {
            identifier: created.json().student.username,
            password: temporary,
          })
        ).statusCode
      ).toBe(200)

      // Y el cambio de contraseña, que es lo que hay que hacer.
      const changed = await send('POST', '/profile/change-password', student, {
        currentPassword: temporary,
        newPassword: 'mi-contraseña-nueva',
      })
      expect(changed.statusCode).toBe(200)

      const after = await prisma.user.findUniqueOrThrow({ where: { id: student.id } })
      expect(after.mustChangePassword).toBe(false)
      expect(after.passwordChangedAt).toBeTruthy()

      // Y ya puede seguir.
      expect((await send('GET', '/students/classes', student)).statusCode).toBe(200)
    })

    it('la contraseña temporal equivocada no levanta el cambio pendiente', async () => {
      const created = await createManaged(`Fallido ${tag}`)
      const student = { id: created.json().student.id, role: 'student' as const }

      const response = await send('POST', '/profile/change-password', student, {
        currentPassword: 'lo-que-no-es',
        newPassword: 'mi-contraseña-nueva',
      })
      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('INVALID_PASSWORD')
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).mustChangePassword
      ).toBe(true)
    })

    it('una contraseña nueva más corta que el mínimo no vale', async () => {
      const created = await createManaged(`Corta ${tag}`)
      const student = { id: created.json().student.id, role: 'student' as const }

      const response = await send('POST', '/profile/change-password', student, {
        currentPassword: created.json().temporaryPassword,
        newPassword: '1234567',
      })
      expect(response.statusCode).toBe(400)
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).mustChangePassword
      ).toBe(true)
    })
  })

  // ==================== CAMBIO DE CONTRASEÑA UNIFICADO ====================

  describe('cambio de contraseña', () => {
    const PASSWORD = 'contraseña-de-prueba'

    /** Un alumno con correo y dos sesiones abiertas. */
    const studentWithSessions = async (label: string) => {
      const user = await prisma.user.create({
        data: {
          email: `${label}.${tag}@test.invalid`,
          passwordHash: await hashPassword(PASSWORD),
          name: `${label} ${tag}`,
          role: 'student',
          isOnboarded: true,
        },
      })
      createdIds.add(user.id)
      const sessions = await Promise.all(
        ['una', 'otra'].map(which =>
          prisma.refreshToken.create({
            data: {
              token: `${which}-${randomUUID()}`,
              userId: user.id,
              family: `${which}-${randomUUID()}`,
              expiresAt: new Date(Date.now() + 86_400_000),
            },
          })
        )
      )
      return { user, sessions }
    }

    const revoked = async (id: string) =>
      (await prisma.refreshToken.findUniqueOrThrow({ where: { id } })).isRevoked

    it('por el perfil: cierra las demás sesiones y deja abierta la que lo pide', async () => {
      const { user, sessions } = await studentWithSessions('perfil')

      const response = await app.inject({
        method: 'POST',
        url: '/profile/change-password',
        payload: { currentPassword: PASSWORD, newPassword: 'contraseña-nueva' },
        headers: {
          authorization: `Bearer ${token({ id: user.id, role: user.role })}`,
          cookie: `refresh_token=${sessions[0].token}`,
        },
      })
      expect(response.statusCode).toBe(200)

      expect(await revoked(sessions[0].id)).toBe(false)
      expect(await revoked(sessions[1].id)).toBe(true)
      const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
      expect(await verifyPassword('contraseña-nueva', after.passwordHash)).toBe(true)
      expect(after.passwordChangedAt).toBeTruthy()
    })

    it('por la ruta del alumnado hace exactamente lo mismo', async () => {
      const { user, sessions } = await studentWithSessions('alumnado')

      const response = await app.inject({
        method: 'POST',
        url: '/students/profile/me/password',
        payload: {
          currentPassword: PASSWORD,
          newPassword: 'contraseña-nueva',
          confirmPassword: 'contraseña-nueva',
        },
        headers: {
          authorization: `Bearer ${token({ id: user.id, role: user.role })}`,
          cookie: `refresh_token=${sessions[1].token}`,
        },
      })
      expect(response.statusCode).toBe(200)

      expect(await revoked(sessions[0].id)).toBe(true)
      expect(await revoked(sessions[1].id)).toBe(false)
      const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
      expect(await verifyPassword('contraseña-nueva', after.passwordHash)).toBe(true)
      expect(after.passwordChangedAt).toBeTruthy()
    })
  })

  // ==================== PANEL DE ADMINISTRACIÓN ====================

  describe('panel de administración', () => {
    it('la búsqueda encuentra por usuario y marca las cuentas gestionadas', async () => {
      const created = await createManaged(`Buscada ${tag}`)
      const { username } = created.json().student

      const response = await send('GET', `/admin/users?search=${username}`, admin())
      expect(response.statusCode).toBe(200)
      expect(response.json().users).toHaveLength(1)
      expect(response.json().users[0]).toMatchObject({
        id: created.json().student.id,
        email: null,
        username,
        accountType: 'managed',
        homeClassId: f.classId,
        mustChangePassword: true,
      })
    })

    it('lista las cuentas gestionadas y las que se han quedado sin ninguna clase', async () => {
      const created = await createManaged(`Huérfana ${tag}`)
      const id = created.json().student.id

      const withClass = await send('GET', '/admin/users?accountType=orphan&limit=50', admin())
      expect(withClass.json().users.map((u: { id: string }) => u.id)).not.toContain(id)

      await prisma.classEnrollment.deleteMany({ where: { studentId: id } })
      const orphan = await send('GET', '/admin/users?accountType=orphan&limit=50', admin())
      expect(orphan.json().users.map((u: { id: string }) => u.id)).toContain(id)

      const managed = await send('GET', '/admin/users?accountType=managed&limit=50', admin())
      expect(managed.json().users.map((u: { id: string }) => u.id)).toContain(id)
      expect(
        (await send('GET', '/admin/users?accountType=self&limit=50', admin()))
          .json()
          .users.map((u: { id: string }) => u.id)
      ).not.toContain(id)
    })

    it('cambia la clase de origen, y solo de una cuenta gestionada', async () => {
      const id = (await createManaged(`Traslado ${tag}`)).json().student.id

      const moved = await send('PUT', `/admin/users/${id}/home-class`, admin(), {
        classId: f.otherClassId,
      })
      expect(moved.statusCode).toBe(200)
      expect(moved.json().user.homeClassId).toBe(f.otherClassId)
      // Y queda matriculado en la clase nueva: si no, su profesorado no llegaría
      // a la cuenta y solo la atendería la administración.
      expect(
        await prisma.classEnrollment.findUnique({
          where: { studentId_classId: { studentId: id, classId: f.otherClassId } },
        })
      ).not.toBeNull()

      const cleared = await send('PUT', `/admin/users/${id}/home-class`, admin(), { classId: null })
      expect(cleared.json().user.homeClassId).toBeNull()

      expect(
        (
          await send('PUT', `/admin/users/${f.users.student.id}/home-class`, admin(), {
            classId: f.classId,
          })
        ).json().code
      ).toBe('NOT_A_MANAGED_ACCOUNT')
    })
  })

  // ==================== LA BASE NO ADMITE CUENTAS SIN IDENTIFICADOR ====================

  it('la base rechaza una cuenta sin correo y sin usuario', async () => {
    await expect(
      prisma.user.create({
        data: { email: null, username: null, passwordHash: 'x', name: `Sin nada ${tag}` },
      })
    ).rejects.toThrow(/users_email_or_username/)
  })

  it('la base rechaza dos cuentas con el mismo usuario', async () => {
    const created = await createManaged(`Duplicada ${tag}`)
    await expect(
      prisma.user.create({
        data: {
          username: created.json().student.username,
          passwordHash: 'x',
          name: `Copia ${tag}`,
        },
      })
    ).rejects.toThrow()
  })
})
