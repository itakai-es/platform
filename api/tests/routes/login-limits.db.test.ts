import { it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import { buildApp, prisma } from '../helpers/class-fixture.js'
import {
  authRoutes,
  LOGIN_FAILURE_BY_IDENTIFIER,
  LOGIN_FAILURE_BY_ORIGIN,
} from '../../src/modules/auth/auth.routes.js'
import { hashPassword } from '../../src/utils/password.js'
import { recordRateLimit, resetRateLimits } from '../../src/utils/rate-limit.js'

/**
 * Cuántos fallos de entrada se aguantan: diez por identificador y trescientos
 * por origen cada cuarto de hora. El de origen es ancho porque todo un centro
 * suele salir a internet por la misma dirección, y pasado el límite no entra
 * nadie desde ahí, tampoco quien acierta. Necesita TEST_DATABASE_URL (ver
 * tests/helpers/test-db.ts).
 */

describeWithDatabase('límite de intentos de entrada', () => {
  let app: FastifyInstance
  const tag = randomUUID().slice(0, 8)
  const userIds: string[] = []
  const PASSWORD = 'contraseña-de-prueba'

  const SCHOOL = '203.0.113.20'
  const HOME = '203.0.113.21'
  const FIFTEEN_MINUTES = 15 * 60 * 1000

  const login = (identifier: string, password: string, from: string) =>
    app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { identifier, password },
      remoteAddress: from,
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
    return user.email!
  }

  /** Fallos que ya lleva el origen en esta ventana, sin hacer las peticiones. */
  const failedFrom = (origin: string, count: number) =>
    recordRateLimit(`login:origin:${origin}`, LOGIN_FAILURE_BY_ORIGIN, count)

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(cookie)
      await instance.register(authRoutes, { prefix: '/auth' })
    })
  })

  beforeEach(() => resetRateLimits())

  afterAll(async () => {
    resetRateLimits()
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await app?.close()
  })

  it('diez fallos por identificador y trescientos por origen, cada quince minutos', () => {
    expect(LOGIN_FAILURE_BY_IDENTIFIER).toEqual({ max: 10, windowMs: FIFTEEN_MINUTES })
    expect(LOGIN_FAILURE_BY_ORIGIN).toEqual({ max: 300, windowMs: FIFTEEN_MINUTES })
  })

  it('un centro con más de cien fallos a primera hora sigue entrando', async () => {
    const email = await newUser('centro')
    failedFrom(SCHOOL, 150)

    expect((await login(email, PASSWORD, SCHOOL)).statusCode).toBe(200)
    expect((await login(`nadie.${tag}`, 'lo-que-sea', SCHOOL)).statusCode).toBe(401)
  })

  it('pasados los trescientos se corta el origen, también a quien acierta', async () => {
    const email = await newUser('cortado')
    failedFrom(SCHOOL, LOGIN_FAILURE_BY_ORIGIN.max - 1)

    // El último fallo que cabe todavía se contesta como un fallo más.
    expect((await login(`nadie.${tag}`, 'lo-que-sea', SCHOOL)).statusCode).toBe(401)

    expect((await login(email, PASSWORD, SCHOOL)).statusCode).toBe(429)
    // Desde otro sitio la misma cuenta entra.
    expect((await login(email, PASSWORD, HOME)).statusCode).toBe(200)
  })

  // Una docena de comprobaciones de contraseña: más que los cinco segundos por defecto.
  it('una cuenta se corta a los diez fallos aunque al origen le quede cupo', async () => {
    const email = await newUser('cuenta')
    const neighbour = await newUser('vecina')

    for (let i = 0; i < LOGIN_FAILURE_BY_IDENTIFIER.max; i++) {
      expect((await login(email, 'no-es-esta', SCHOOL)).statusCode).toBe(401)
    }
    expect((await login(email, PASSWORD, SCHOOL)).statusCode).toBe(429)

    // Al resto del centro no le afecta.
    expect((await login(neighbour, PASSWORD, SCHOOL)).statusCode).toBe(200)
  }, 30_000)
})
