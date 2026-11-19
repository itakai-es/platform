import { it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'

/**
 * Dos guardados de la misma clase a la vez (dos pestañas, dos docentes, o una pantalla
 * que guarda cada interruptor al pulsarlo): ninguno pisa al otro. Cada guardado mezcla
 * su cambio con lo que hay y escribe el resultado, así que lo que se mezcla tiene que
 * leerse con la clase quieta. Se repite porque la carrera no sale siempre. Necesita
 * TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

import { buildApp, createClassFixture, prisma, type ClassFixture } from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { Prisma } from '../../src/generated/prisma/client.js'

const ROUNDS = 20

describeWithDatabase('guardados de una clase a la vez', () => {
  let app: FastifyInstance
  let f: ClassFixture

  const url = () => `/teacher/classes/${f.classId}`
  const put = async (path: string, payload: object) => {
    const res = await app.inject({
      method: 'PUT',
      url: path,
      headers: { authorization: `Bearer ${f.token('owner')}` },
      payload,
    })
    expect(res.statusCode, res.body).toBe(200)
  }
  const reset = (settings: object = {}) =>
    prisma.class.update({
      where: { id: f.classId },
      data: { settings, rankingConfig: Prisma.JsonNull },
    })
  const stored = () => prisma.class.findUniqueOrThrow({ where: { id: f.classId } })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)
  })

  afterEach(() => reset())

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  it('dos cambios del ranking: se quedan los dos', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      await reset()
      await Promise.all([
        put(url(), { rankingConfig: { mode: 'position' } }),
        put(url(), { rankingConfig: { compare: false } }),
      ])
      expect((await stored()).rankingConfig, `ronda ${round}`).toMatchObject({
        mode: 'position',
        compare: false,
      })
    }
  })

  it('apagar el ranking mientras otro guarda su configuración: no vuelve a encenderse', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      await reset({ rankings: true })
      await Promise.all([
        put(url(), { settings: { rankings: false } }),
        put(url(), { rankingConfig: { topN: 3 } }),
      ])
      const { settings, rankingConfig } = await stored()
      expect(settings, `ronda ${round}`).toMatchObject({ rankings: false })
      expect(rankingConfig, `ronda ${round}`).toMatchObject({ topN: 3 })
    }
  })

  it('dos interruptores distintos: se quedan los dos', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      await reset()
      await Promise.all([
        put(url(), { settings: { sounds: false } }),
        put(url(), { settings: { visualEffects: false } }),
      ])
      expect((await stored()).settings, `ronda ${round}`).toMatchObject({
        sounds: false,
        visualEffects: false,
      })
    }
  })

  it('los ajustes solo se escriben si cambian', async () => {
    await reset({ sounds: false })
    await put(url(), { rankingConfig: { mode: 'top' } })
    // Quien solo toca el ranking no los rellena: siguen siendo lo que había.
    expect((await stored()).settings).toEqual({ sounds: false })
    await put(url(), { settings: { sounds: false, xp: true } })
    expect((await stored()).settings).toEqual({ sounds: false })
    await put(url(), { name: 'Otro nombre' })
    expect((await stored()).settings).toEqual({ sounds: false })

    // Se quedan sin ningún tipo disponible (solo XP, con la XP apagada): el interruptor
    // se apaga, aunque el guardado solo traiga el ranking.
    await reset({ xp: false, shop: false, coins: false, mana: false, behaviors: false, lives: false })
    await put(url(), { rankingConfig: { types: ['xp'] } })
    expect((await stored()).settings).toMatchObject({ rankings: false })
  })
})
