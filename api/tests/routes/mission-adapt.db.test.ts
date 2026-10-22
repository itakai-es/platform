import { it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'

/**
 * «Adaptar con IA» (`mission.adapt` en POST /ai/prompt/stream): la API lee la
 * misión y su clase, solo para quien puede editarla, y con eso arma el prompt.
 * Proponer no escribe nada. Necesita TEST_DATABASE_URL (ver
 * tests/helpers/test-db.ts). El proveedor de IA se simula y guarda lo que se le pide.
 */

const provider = vi.hoisted(() => ({
  prompts: [] as string[],
  fail: false,
}))

vi.mock('../../src/modules/ai/providers/index.js', () => ({
  getAIProvider: () => ({
    generateText: async (prompt: string) => {
      provider.prompts.push(prompt)
      return '{}'
    },
    generateTextStream: async function* (prompt: string) {
      provider.prompts.push(prompt)
      if (provider.fail) throw new Error('IA caída')
      yield '{"title":"Propuesta",'
      yield '"description":"Historia","enigmas":[]}'
    },
  }),
  getLastUsedProvider: () => 'spark',
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { aiRoutes } from '../../src/modules/ai/ai.routes.js'

describeWithDatabase('adaptar una misión con IA (mission.adapt)', () => {
  let app: FastifyInstance
  let f: ClassFixture
  let missionId: string
  let lockedEnigmaId: string

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(aiRoutes, { prefix: '/ai' })
    })
    f = await createClassFixture(app)
    // La clase de destino: datos de verdad y maná apagado (las monedas, encendidas).
    await prisma.class.update({
      where: { id: f.classId },
      data: {
        subject: 'Matemáticas',
        educationLevel: 'Educación Primaria',
        language: 'Galego',
        narrative: 'Un barco pirata que navega entre islas de números.',
        settings: { mana: false },
      },
    })
    missionId = await f.newMission()
    await prisma.mission.update({
      where: { id: missionId },
      data: { title: 'Misión original', description: 'Historia original' },
    })
    lockedEnigmaId = await f.newEnigma(missionId)
    await prisma.missionEnigma.update({
      where: { id: lockedEnigmaId },
      data: { title: 'Enigma con entregas', xpReward: 40, coinReward: 20, manaReward: 10 },
    })
    await f.newSubmission(lockedEnigmaId)
    await prisma.studentEnigmaProgress.create({
      data: { enigmaId: lockedEnigmaId, studentId: f.users.student.id, xpEarned: 40 },
    })
    const freeEnigma = await f.newEnigma(missionId)
    await prisma.missionEnigma.update({
      where: { id: freeEnigma },
      data: { title: 'Enigma libre', orderIndex: 1 },
    })
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  beforeEach(() => {
    provider.prompts.length = 0
    provider.fail = false
  })

  const adapt = (actor: Actor | undefined, params: Record<string, string>) =>
    app.inject({
      method: 'POST',
      url: '/ai/prompt/stream',
      payload: { type: 'mission.adapt', locale: 'es', params },
      headers: actor ? { authorization: `Bearer ${f.token(actor)}` } : {},
    })

  it('quien edita la misión recibe la propuesta; el prompt lleva la clase de destino y lo bloqueado', async () => {
    const res = await adapt('owner', { missionId, brief: 'Para 3.º, más corta' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('"type":"chunk"')
    expect(res.body).toContain('"error":false')

    expect(provider.prompts).toHaveLength(1)
    const prompt = provider.prompts[0]!
    expect(prompt).toContain('Misión original')
    expect(prompt).toContain('Historia original')
    expect(prompt).toContain('Asignatura: Matemáticas | Nivel educativo: Educación Primaria')
    expect(prompt).toContain('Un barco pirata')
    expect(prompt).toContain('Escribe todo el texto en Galego')
    // Lo que pide su docente, en el brief que manda sobre todo lo demás.
    expect(prompt).toContain('Para 3.º, más corta')
    // Lenguaje inclusivo, como el resto de prompts en castellano.
    expect(prompt).toContain('LENGUAJE INCLUSIVO')
    // El enigma con entregas no se quita y sus recompensas no bajan.
    expect(prompt).toContain('"tieneEntregas": true')
    expect(prompt).toContain('"recompensasNoPuedenBajar": true')
    // Monedas sí, maná no: la clase lo tiene apagado.
    expect(prompt).toContain('"coins"')
    expect(prompt).not.toContain('"mana"')
    expect(prompt).not.toMatch(/maná/i)
  })

  it('al pedir otro cambio, el prompt lleva la propuesta anterior y el feedback', async () => {
    const res = await adapt('owner', {
      missionId,
      previousProposal: '{"title":"Primera propuesta"}',
      feedback: 'Menos piratas',
    })
    expect(res.statusCode).toBe(200)
    expect(provider.prompts[0]).toContain('Primera propuesta')
    expect(provider.prompts[0]).toContain('Menos piratas')
  })

  it('sin permiso de edición no hay propuesta: 403 con solo lectura, 404 fuera de la clase, 401 sin sesión', async () => {
    const readOnly = await prisma.classTeacher.create({
      data: { classId: f.classId, userId: f.users.other.id, access: 'read', profile: 'practicas' },
    })
    try {
      expect((await adapt('other', { missionId })).statusCode).toBe(403)
    } finally {
      await prisma.classTeacher.delete({ where: { id: readOnly.id } })
    }
    expect((await adapt('other', { missionId })).statusCode).toBe(404)
    expect((await adapt('student', { missionId })).statusCode).toBe(404)
    expect((await adapt(undefined, { missionId })).statusCode).toBe(401)
    expect((await adapt('owner', {})).statusCode).toBe(400)
    expect(provider.prompts).toHaveLength(0)
  })

  it('proponer no escribe nada, y si la IA falla avisa por el flujo y la misión no cambia', async () => {
    const before = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { enigmas: { orderBy: { orderIndex: 'asc' } } },
    })
    provider.fail = true
    const res = await adapt('owner', { missionId })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('"type":"error"')
    expect(res.body).toContain('"error":true')

    const after = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { enigmas: { orderBy: { orderIndex: 'asc' } } },
    })
    expect(after).toEqual(before)
  })
})
