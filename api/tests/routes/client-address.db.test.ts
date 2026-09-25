import { it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import { buildApp, prisma } from '../helpers/class-fixture.js'
import { authRoutes, LOGIN_FAILURE_BY_ORIGIN } from '../../src/modules/auth/auth.routes.js'
import { hashPassword } from '../../src/utils/password.js'
import { recordRateLimit, resetRateLimits } from '../../src/utils/rate-limit.js'
import { rateLimitOrigin, resolveTrustProxy } from '../../src/utils/trust-proxy.js'

/**
 * Con la configuración por defecto, la entrada ve la dirección real del cliente
 * que le pasa el proxy: la guarda con la sesión y cuenta con ella los intentos
 * fallidos por origen. Quien llega directamente no puede cambiarla con la
 * cabecera. Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

describeWithDatabase('dirección del cliente tras el proxy', () => {
  let app: FastifyInstance
  const tag = randomUUID().slice(0, 8)
  const userIds: string[] = []
  const PASSWORD = 'contraseña-de-prueba'

  const PROXY = '172.18.0.5'
  const CLIENT = '203.0.113.7'
  const OTHER_CLIENT = '203.0.113.8'
  const FORGED = '198.51.100.99'

  const login = (identifier: string, password: string, peer: string, forwardedFor?: string) =>
    app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { identifier, password },
      remoteAddress: peer,
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    })

  const newUser = async (label: string) => {
    const user = await prisma.user.create({
      data: {
        email: `${label}.${tag}@test.invalid`,
        passwordHash: await hashPassword(PASSWORD),
        name: `${label} ${tag}`,
        role: 'student',
        isOnboarded: true,
      },
    })
    userIds.push(user.id)
    return user
  }

  const lastSessionAddress = async (userId: string) =>
    (
      await prisma.refreshToken.findFirstOrThrow({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
    ).ipAddress

  beforeAll(async () => {
    app = await buildApp(
      async instance => {
        await instance.register(cookie)
        await instance.register(authRoutes, { prefix: '/auth' })
      },
      { trustProxy: resolveTrustProxy(undefined) }
    )
  })

  beforeEach(() => resetRateLimits())

  afterAll(async () => {
    resetRateLimits()
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await app?.close()
  })

  it('la sesión guarda la dirección que da el proxy, no la que escribe el cliente', async () => {
    const user = await newUser('sesion')

    expect((await login(user.email!, PASSWORD, PROXY, CLIENT)).statusCode).toBe(200)
    expect(await lastSessionAddress(user.id)).toBe(CLIENT)

    // Lo que el cliente mandó antes de pasar por el proxy se queda fuera.
    expect((await login(user.email!, PASSWORD, PROXY, `${FORGED}, ${CLIENT}`)).statusCode).toBe(200)
    expect(await lastSessionAddress(user.id)).toBe(CLIENT)

    // Directamente, sin proxy: la cabecera no cuenta.
    expect((await login(user.email!, PASSWORD, CLIENT, FORGED)).statusCode).toBe(200)
    expect(await lastSessionAddress(user.id)).toBe(CLIENT)
  })

  it('los fallos por origen se cuentan por cliente, no para todos los que pasan por el proxy', async () => {
    // El origen CLIENT ya agotó su cupo de fallos.
    recordRateLimit(`login:origin:${CLIENT}`, LOGIN_FAILURE_BY_ORIGIN, LOGIN_FAILURE_BY_ORIGIN.max)

    const blocked = await login(`nadie.${tag}`, 'lo-que-sea', PROXY, CLIENT)
    expect(blocked.statusCode).toBe(429)

    // Otro alumno detrás del mismo proxy sigue pudiendo intentarlo.
    const other = await login(`nadie.${tag}`, 'lo-que-sea', PROXY, OTHER_CLIENT)
    expect(other.statusCode).toBe(401)

    // Y sin cabecera, el proxy no hereda el bloqueo de nadie.
    expect((await login(`nadie.${tag}`, 'lo-que-sea', PROXY)).statusCode).toBe(401)
  })

  it('un cliente directo no se libra del límite cambiando la cabecera', async () => {
    recordRateLimit(`login:origin:${CLIENT}`, LOGIN_FAILURE_BY_ORIGIN, LOGIN_FAILURE_BY_ORIGIN.max)

    for (const forged of [FORGED, OTHER_CLIENT, '127.0.0.1']) {
      const response = await login(`nadie.${tag}`, 'lo-que-sea', CLIENT, forged)
      expect(response.statusCode, forged).toBe(429)
    }
  })

  it('una IPv6 cuenta por su /64: estrenar dirección dentro de él no da más intentos', async () => {
    recordRateLimit(
      `login:origin:${rateLimitOrigin('2001:db8:1:2::1')}`,
      LOGIN_FAILURE_BY_ORIGIN,
      LOGIN_FAILURE_BY_ORIGIN.max
    )

    const sameNetwork = await login(`nadie.${tag}`, 'lo-que-sea', PROXY, '2001:db8:1:2:abcd::99')
    expect(sameNetwork.statusCode).toBe(429)

    const otherNetwork = await login(`nadie.${tag}`, 'lo-que-sea', PROXY, '2001:db8:1:3::1')
    expect(otherNetwork.statusCode).toBe(401)
  })
})
