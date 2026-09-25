import { it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { buildApp, prisma } from '../helpers/class-fixture.js'
import { profileRoutes } from '../../src/modules/profile/profile.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { hashPassword } from '../../src/utils/password.js'

/**
 * Cambiar el correo pide la contraseña actual, y suspender una cuenta cierra sus
 * sesiones. Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

describeWithDatabase('cuenta: cambio de correo y suspensión', () => {
  let app: FastifyInstance
  const tag = randomUUID().slice(0, 8)
  const userIds: string[] = []
  const PASSWORD = 'contraseña-de-prueba'

  const newUser = async (
    label: string,
    role: 'teacher' | 'student' | 'admin',
    passwordHash: string
  ) => {
    const user = await prisma.user.create({
      data: {
        email: `${label}.${tag}@test.invalid`,
        passwordHash,
        name: `${label} ${tag}`,
        role,
        isOnboarded: true,
      },
    })
    userIds.push(user.id)
    return user
  }

  const tokenFor = (user: { id: string; role: string | null }) =>
    app.jwt.sign({ id: user.id, role: user.role })

  const send = (
    method: 'POST' | 'PUT',
    url: string,
    user?: { id: string; role: string | null },
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: user ? { authorization: `Bearer ${tokenFor(user)}` } : {},
    })

  const emailOf = async (id: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { id } })).email

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(profileRoutes, { prefix: '/profile' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await app?.close()
  })

  it('POST /profile/change-email → pide la contraseña actual, y que sea la buena', async () => {
    const user = await newUser('correo', 'teacher', await hashPassword(PASSWORD))
    const newEmail = `nuevo.${tag}@test.invalid`

    expect((await send('POST', '/profile/change-email', undefined, { newEmail })).statusCode).toBe(
      401
    )

    const missing = await send('POST', '/profile/change-email', user, { newEmail })
    expect(missing.statusCode).toBe(400)
    expect(missing.json().code).toBe('PASSWORD_REQUIRED')

    const empty = await send('POST', '/profile/change-email', user, { newEmail, password: '' })
    expect(empty.json().code).toBe('PASSWORD_REQUIRED')

    const wrong = await send('POST', '/profile/change-email', user, {
      newEmail,
      password: 'otra-cosa',
    })
    expect(wrong.statusCode).toBe(400)
    expect(wrong.json().code).toBe('INVALID_PASSWORD')
    expect(await emailOf(user.id)).toBe(user.email)

    const ok = await send('POST', '/profile/change-email', user, { newEmail, password: PASSWORD })
    expect(ok.statusCode).toBe(200)
    expect(await emailOf(user.id)).toBe(newEmail)
  })

  it('POST /profile/change-email → con la contraseña buena, un correo que ya usa otra cuenta se rechaza', async () => {
    const user = await newUser('ocupado-a', 'student', await hashPassword(PASSWORD))
    const taken = await newUser('ocupado-b', 'student', await hashPassword(PASSWORD))

    const response = await send('POST', '/profile/change-email', user, {
      newEmail: taken.email,
      password: PASSWORD,
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().code).toBe('EMAIL_IN_USE')
    expect(await emailOf(user.id)).toBe(user.email)
  })

  it('POST /profile/change-email → una cuenta sin contraseña no cambia el correo hasta crearse una', async () => {
    const user = await newUser('solo-google', 'student', '')

    for (const password of [undefined, '', 'cualquiera']) {
      const response = await send('POST', '/profile/change-email', user, {
        newEmail: `google.${tag}@test.invalid`,
        password,
      })
      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('PASSWORD_NOT_SET')
    }
    expect(await emailOf(user.id)).toBe(user.email)
  })

  it('PUT /admin/users/:userId/suspend → suspende, cierra sus sesiones y no toca las de los demás', async () => {
    const admin = await newUser('admin', 'admin', 'x')
    const target = await newUser('suspendido', 'teacher', 'x')
    const bystander = await newUser('ajeno', 'student', 'x')
    const session = (userId: string) =>
      prisma.refreshToken.create({
        data: { token: randomUUID(), userId, expiresAt: new Date(Date.now() + 60_000) },
      })
    await session(target.id)
    await session(target.id)
    await session(bystander.id)
    const openSessions = (userId: string) =>
      prisma.refreshToken.count({ where: { userId, isRevoked: false } })

    const url = `/admin/users/${target.id}/suspend`
    expect((await send('PUT', url)).statusCode).toBe(401)
    expect((await send('PUT', url, bystander)).statusCode).toBe(403)
    expect((await send('PUT', url, target)).statusCode).toBe(403)
    expect(await openSessions(target.id)).toBe(2)

    const response = await send('PUT', url, admin)
    expect(response.statusCode).toBe(200)
    expect(response.json().user.status).toBe('suspended')
    expect(await openSessions(target.id)).toBe(0)
    expect(await openSessions(bystander.id)).toBe(1)

    // Reactivar devuelve el estado, no las sesiones: tendrá que volver a entrar.
    const activated = await send('PUT', `/admin/users/${target.id}/activate`, admin)
    expect(activated.statusCode).toBe(200)
    expect(activated.json().user.status).toBe('active')
    expect(await openSessions(target.id)).toBe(0)
  })

  it('PUT /admin/users/:userId/suspend → ni a otro administrador, ni a uno mismo, ni a quien no existe', async () => {
    const admin = await newUser('admin-a', 'admin', 'x')
    const otherAdmin = await newUser('admin-b', 'admin', 'x')
    await prisma.refreshToken.create({
      data: {
        token: randomUUID(),
        userId: otherAdmin.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    })

    expect((await send('PUT', `/admin/users/${otherAdmin.id}/suspend`, admin)).statusCode).toBe(403)
    expect((await send('PUT', `/admin/users/${admin.id}/suspend`, admin)).statusCode).toBe(400)
    expect((await send('PUT', `/admin/users/${randomUUID()}/suspend`, admin)).statusCode).toBe(404)

    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: otherAdmin.id } })
    expect(untouched.status).toBe('active')
    expect(
      await prisma.refreshToken.count({ where: { userId: otherAdmin.id, isRevoked: false } })
    ).toBe(1)
  })
})
