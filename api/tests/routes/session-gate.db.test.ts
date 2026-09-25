import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * La sesión deja de valer en cuanto la cuenta deja de estar activa o cambia su
 * contraseña, sin esperar a que caduque el token de acceso. Necesita
 * TEST_DATABASE_URL (ver tests/helpers/test-db.ts). Solo se simula el correo.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendPasswordChangedEmail: vi.fn(async () => {}),
  sendNotificationEmail: vi.fn(async () => {}),
}))

import cookie from '@fastify/cookie'
import { buildApp, prisma } from '../helpers/class-fixture.js'
import { authRoutes } from '../../src/modules/auth/auth.routes.js'
import { profileRoutes } from '../../src/modules/profile/profile.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { hashPassword } from '../../src/utils/password.js'
import { resetRateLimits } from '../../src/utils/rate-limit.js'
import { sendPasswordResetEmail } from '../../src/utils/email.js'
import {
  sessionGate,
  ACCOUNT_SUSPENDED,
  SESSION_REVOKED,
  PASSWORD_CHANGE_REQUIRED,
} from '../../src/utils/session-gate.js'

describeWithDatabase('la sesión sigue el estado de la cuenta', () => {
  let app: FastifyInstance
  const tag = randomUUID().slice(0, 8)
  const userIds: string[] = []
  const PASSWORD = 'contraseña-de-prueba'
  let passwordHash: string

  const newUser = async (
    label: string,
    role: 'teacher' | 'student' | 'admin' = 'teacher',
    data: Record<string, unknown> = {}
  ) => {
    const user = await prisma.user.create({
      data: {
        email: `${label}.${tag}@test.invalid`,
        passwordHash,
        name: `${label} ${tag}`,
        role,
        isOnboarded: true,
        ...data,
      },
    })
    userIds.push(user.id)
    return user
  }

  /** Token de acceso; con `secondsAgo`, emitido hace ese tiempo. */
  const tokenFor = (user: { id: string; role: string | null }, secondsAgo = 0) =>
    app.jwt.sign({
      id: user.id,
      role: user.role,
      iat: Math.floor(Date.now() / 1000) - secondsAgo,
    })

  const request = (
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    token?: string,
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })

  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD)
    app = await buildApp(async instance => {
      await instance.register(cookie)
      instance.addHook('onRequest', sessionGate)
      await instance.register(authRoutes, { prefix: '/auth' })
      await instance.register(profileRoutes, { prefix: '/profile' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
  })

  afterAll(async () => {
    resetRateLimits()
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await app?.close()
  })

  it('suspender corta al momento el token que ya tenía, y reactivar lo devuelve', async () => {
    const admin = await newUser('admin', 'admin')
    const target = await newUser('suspendida')
    const token = tokenFor(target)

    expect((await request('GET', '/profile', token)).statusCode).toBe(200)

    const suspended = await request('PUT', `/admin/users/${target.id}/suspend`, tokenFor(admin))
    expect(suspended.statusCode).toBe(200)

    for (const url of ['/profile', '/auth/me', '/auth/sessions']) {
      const response = await request('GET', url, token)
      expect(response.statusCode, url).toBe(401)
      expect(response.json().code, url).toBe(ACCOUNT_SUSPENDED)
    }

    const activated = await request('PUT', `/admin/users/${target.id}/activate`, tokenFor(admin))
    expect(activated.statusCode).toBe(200)
    expect((await request('GET', '/profile', token)).statusCode).toBe(200)
  })

  it('una cuenta inactiva tampoco pasa', async () => {
    const user = await newUser('inactiva', 'student', { status: 'inactive' })
    const response = await request('GET', '/profile', tokenFor(user))
    expect(response.statusCode).toBe(401)
    expect(response.json().code).toBe(ACCOUNT_SUSPENDED)
  })

  it('un token emitido antes del último cambio de contraseña ya no vale; uno posterior, sí', async () => {
    const user = await newUser('cambio', 'teacher', { passwordChangedAt: new Date() })

    const before = await request('GET', '/profile', tokenFor(user, 60))
    expect(before.statusCode).toBe(401)
    expect(before.json().code).toBe(SESSION_REVOKED)

    expect((await request('GET', '/profile', tokenFor(user))).statusCode).toBe(200)
  })

  it('cambiar la contraseña invalida también el token con el que se hizo el cambio', async () => {
    const user = await newUser('propio')
    const token = tokenFor(user, 5)
    expect((await request('GET', '/profile', token)).statusCode).toBe(200)

    const changed = await request('POST', '/profile/change-password', token, {
      currentPassword: PASSWORD,
      newPassword: 'otra-contraseña-nueva',
    })
    expect(changed.statusCode).toBe(200)

    const after = await request('GET', '/profile', token)
    expect(after.statusCode).toBe(401)
    expect(after.json().code).toBe(SESSION_REVOKED)
  })

  it('una cuenta sin fecha de cambio de contraseña no se ve afectada', async () => {
    const user = await newUser('sin-fecha', 'student', { passwordChangedAt: null })
    expect((await request('GET', '/profile', tokenFor(user, 600))).statusCode).toBe(200)
  })

  it('un token firmado sin cuenta, o de una cuenta que ya no existe, no es una sesión', async () => {
    const withoutAccount = app.jwt.sign({ userId: randomUUID(), type: 'password_reset' } as never)
    const gone = tokenFor({ id: randomUUID(), role: 'teacher' })

    for (const token of [withoutAccount, gone]) {
      const response = await request('GET', '/profile', token)
      expect(response.statusCode).toBe(401)
      expect(response.json().code).toBe(SESSION_REVOKED)
    }
  })

  it('entrar y salir funcionan aunque el cliente mande un token que ya no vale', async () => {
    const user = await newUser('reentrar', 'teacher', { passwordChangedAt: new Date() })
    const stale = tokenFor(user, 60)

    const login = await request('POST', '/auth/login', stale, {
      identifier: user.email,
      password: PASSWORD,
    })
    expect(login.statusCode).toBe(200)

    expect((await request('POST', '/auth/logout', stale)).statusCode).toBe(200)
    // Sin sesión, las rutas protegidas responden como siempre.
    expect((await request('GET', '/auth/me')).statusCode).toBe(401)
  })

  it('la barrera decide por la ruta, no por cómo venga escrita la URL', async () => {
    const suspended = await newUser('escapes', 'teacher', { status: 'suspended' })
    const token = tokenFor(suspended)
    const encoded = [
      ['GET', '/auth/%6De'],
      ['GET', '/auth/%73essions'],
      ['POST', '/auth/logout-%61ll'],
    ] as const
    for (const [method, url] of encoded) {
      const response = await request(method, url, token)
      expect(response.statusCode, url).toBe(401)
      expect(response.json().code, url).toBe(ACCOUNT_SUSPENDED)
    }

    const changed = await newUser('escapes-cambio', 'teacher', { passwordChangedAt: new Date() })
    const stale = await request('GET', '/auth/%6De', tokenFor(changed, 60))
    expect(stale.statusCode).toBe(401)
    expect(stale.json().code).toBe(SESSION_REVOKED)
  })

  it('el enlace de recuperación no abre ninguna ruta con sesión y sirve una sola vez', async () => {
    const user = await newUser('recuperar', 'teacher', { passwordChangedAt: new Date() })
    resetRateLimits()
    const forgot = await request('POST', '/auth/forgot-password', undefined, { email: user.email })
    expect(forgot.statusCode).toBe(200)
    const resetToken = forgot.json().resetToken as string
    expect(resetToken).toBeTruthy()
    // El correo lleva a la página de la app que pide la contraseña nueva, no a la ruta de la API.
    const link = vi.mocked(sendPasswordResetEmail).mock.calls.at(-1)?.[1] as string
    expect(new URL(link).pathname).toBe('/auth/restablecer-password')
    expect(new URL(link).searchParams.get('token')).toBe(resetToken)

    for (const url of ['/auth/me', '/auth/sessions', '/auth/%73essions', '/profile']) {
      expect((await request('GET', url, resetToken)).statusCode, url).toBe(401)
    }
    expect((await request('POST', '/auth/logout-%61ll', resetToken)).statusCode).toBe(401)

    const first = await request('POST', '/auth/reset-password', undefined, {
      token: resetToken,
      password: 'primera-contraseña-nueva',
    })
    expect(first.statusCode).toBe(200)

    const again = await request('POST', '/auth/reset-password', undefined, {
      token: resetToken,
      password: 'segunda-contraseña-nueva',
    })
    expect(again.statusCode).toBe(401)

    resetRateLimits()
    const login = await request('POST', '/auth/login', undefined, {
      identifier: user.email,
      password: 'primera-contraseña-nueva',
    })
    expect(login.statusCode).toBe(200)
  })

  it('con el cambio pendiente, /auth/me sigue abierta y lo demás no', async () => {
    const user = await newUser('pendiente', 'student', { mustChangePassword: true })
    const token = tokenFor(user)

    expect((await request('GET', '/auth/me', token)).statusCode).toBe(200)
    const blocked = await request('GET', '/profile', token)
    expect(blocked.statusCode).toBe(403)
    expect(blocked.json().code).toBe(PASSWORD_CHANGE_REQUIRED)
  })
})
