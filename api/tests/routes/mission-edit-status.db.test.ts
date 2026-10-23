import { it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { describeWithDatabase } from '../helpers/test-db.js'
import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'

describeWithDatabase('editar una misión no cambia su estado si no se pide', () => {
  let app: FastifyInstance
  let f: ClassFixture

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f.cleanup()
    await app.close()
  })

  it('guardar solo la historia de una misión bloqueada la deja bloqueada', async () => {
    const missionId = await f.newMission()
    await prisma.mission.update({ where: { id: missionId }, data: { status: 'bloqueada' } })

    const res = await app.inject({
      method: 'PUT',
      url: `/teacher/missions/${missionId}`,
      headers: { authorization: `Bearer ${f.token('owner')}` },
      payload: { description: 'Nueva historia' },
    })
    expect(res.statusCode).toBe(200)
    const saved = await prisma.mission.findUniqueOrThrow({ where: { id: missionId } })
    expect(saved.description).toBe('Nueva historia')
    expect(saved.status).toBe('bloqueada')
  })

  it('con estado en la petición, sí lo cambia', async () => {
    const missionId = await f.newMission()
    await prisma.mission.update({ where: { id: missionId }, data: { status: 'bloqueada' } })

    await app.inject({
      method: 'PUT',
      url: `/teacher/missions/${missionId}`,
      headers: { authorization: `Bearer ${f.token('owner')}` },
      payload: { status: 'activa' },
    })
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: missionId } })).status).toBe('activa')
  })

  it('la ruta antigua de completar un enigma ya no existe', async () => {
    const missionId = await f.newMission()
    const enigmaId = await f.newEnigma(missionId)
    const res = await app.inject({
      method: 'POST',
      url: `/missions/${missionId}/enigmas/${enigmaId}/complete`,
      headers: { authorization: `Bearer ${f.token('student')}` },
      payload: {},
    })
    expect(res.statusCode).toBe(404)
    expect(await prisma.enigmaSubmission.count({ where: { enigmaId } })).toBe(0)
  })
})
