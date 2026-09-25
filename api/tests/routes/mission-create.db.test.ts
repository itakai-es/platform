import { it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'

/**
 * Alta de misiones desde el asistente del profesorado: lo que manda el
 * asistente tiene que quedar guardado tal cual, portada incluida. La ruta
 * copia los campos del cuerpo uno a uno, y la portada se quedó fuera de esa
 * copia durante meses: cada misión nacía sin imagen.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts).
 */

import { buildApp, createClassFixture, prisma, type ClassFixture } from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'

describeWithDatabase('alta de misiones', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const created: string[] = []

  const create = async (payload: Record<string, unknown>) => {
    const response = await app.inject({
      method: 'POST',
      url: '/teacher/missions',
      payload,
      headers: { authorization: `Bearer ${f.token('owner')}` },
    })
    expect(response.statusCode).toBe(201)
    const { mission } = response.json()
    created.push(mission.id)
    return mission
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await prisma.mission.deleteMany({ where: { id: { in: created } } })
    await f?.cleanup()
    await app?.close()
  })

  it('guarda la portada y las recompensas que manda el asistente', async () => {
    const cover = '/uploads/ai-generated/covers/covers-prueba.png'
    const mission = await create({
      title: 'Misión con portada',
      classId: f.classId,
      rarity: 'comun',
      backgroundImage: cover,
      enigmas: [{ title: 'Enigma', xp: 20, coins: 10, mana: 5 }],
    })
    expect(mission.backgroundImage).toBe(cover)

    const saved = await prisma.mission.findUnique({
      where: { id: mission.id },
      include: { enigmas: true },
    })
    expect(saved?.backgroundImage).toBe(cover)
    expect(saved?.enigmas).toHaveLength(1)
    expect(saved?.enigmas[0]).toMatchObject({ xpReward: 20, coinReward: 10, manaReward: 5 })
  })

  it('sin portada, la misión queda sin imagen', async () => {
    const mission = await create({
      title: 'Misión sin portada',
      classId: f.classId,
      enigmas: [{ title: 'Enigma' }],
    })
    expect(mission.backgroundImage).toBeNull()
  })
})
