import { it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'

/**
 * El asistente y los generadores solo trabajan con el contexto de una misión o
 * una clase a la que quien pregunta tiene acceso: el profesorado, las de sus
 * clases; el alumnado, aquellas en las que está matriculado. Necesita
 * TEST_DATABASE_URL (ver tests/helpers/test-db.ts). El proveedor de IA se
 * simula y guarda lo que se le pide.
 */

const provider = vi.hoisted(() => ({
  prompts: [] as string[],
}))

vi.mock('../../src/modules/ai/providers/index.js', () => ({
  getAIProvider: () => ({
    generateText: async (prompt: string) => {
      provider.prompts.push(prompt)
      return 'Respuesta simulada'
    },
    generateTextStream: async function* (prompt: string) {
      provider.prompts.push(prompt)
      yield 'Respuesta '
      yield 'simulada'
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
import { chatRoutes } from '../../src/modules/chat/chat.routes.js'
import { aiRoutes } from '../../src/modules/ai/ai.routes.js'
import { registerTeacherTools } from '../../src/modules/ai/tools/teacher-tools.js'
import { getTool } from '../../src/modules/ai/tools/tool-registry.js'

const MISSION_CONTEXT = 'CURRENT MISSION CONTEXT'

describeWithDatabase('contexto de misión y de clase en el asistente', () => {
  let app: FastifyInstance
  let f: ClassFixture
  let missionId: string

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(chatRoutes, { prefix: '/chat' })
      await instance.register(aiRoutes, { prefix: '/ai' })
    })
    f = await createClassFixture(app)
    missionId = await f.newMission()
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  beforeEach(() => {
    provider.prompts.length = 0
  })

  const post = (url: string, actor: Actor | undefined, payload: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url,
      payload,
      headers: actor ? { authorization: `Bearer ${f.token(actor)}` } : {},
    })

  const create = async (actor: Actor | undefined, context: Record<string, string>) =>
    (await post('/chat/conversations', actor, { message: 'Hola', ...context })).statusCode

  it('POST /chat/conversations con missionId → profesorado y alumnado de la clase 201; el resto 404; sin sesión 401', async () => {
    expect(await create(undefined, { missionId })).toBe(401)
    expect(await create('owner', { missionId })).toBe(201)
    expect(await create('student', { missionId })).toBe(201)
    expect(await create('other', { missionId })).toBe(404)
    expect(await create('outsider', { missionId })).toBe(404)

    expect(
      await prisma.chatConversation.count({
        where: { missionId, userId: { in: [f.users.other.id, f.users.outsider.id] } },
      })
    ).toBe(0)
  })

  it('POST /chat/conversations con classId → profesorado y alumnado de la clase 201; el resto 404', async () => {
    const classId = f.classId
    expect(await create('owner', { classId })).toBe(201)
    expect(await create('student', { classId })).toBe(201)
    expect(await create('other', { classId })).toBe(404)
    expect(await create('outsider', { classId })).toBe(404)
    // Una misión propia no abre una clase ajena: se comprueban las dos.
    expect(
      await create('other', {
        missionId: await f.newMission(f.otherClassId),
        classId,
      })
    ).toBe(404)
  })

  it('POST /chat/conversations sin contexto sigue abierto a cualquiera con sesión', async () => {
    expect(await create('outsider', {})).toBe(201)
    expect(await create('other', {})).toBe(201)
  })

  it('al responder, el contexto de la misión solo se carga para quien puede verla', async () => {
    const ask = async (actor: Actor) => {
      // La conversación ya existe con esa misión (p. ej. de cuando sí tenía acceso).
      const conversation = await prisma.chatConversation.create({
        data: { userId: f.users[actor].id, assistantId: 'atenea', missionId },
      })
      provider.prompts.length = 0
      const response = await post(`/chat/conversations/${conversation.id}/messages`, actor, {
        content: 'Necesito una pista',
      })
      expect(response.statusCode).toBe(200)
      return provider.prompts.some(prompt => prompt.includes(MISSION_CONTEXT))
    }

    expect(await ask('student')).toBe(true)
    expect(await ask('owner')).toBe(true)
    expect(await ask('outsider')).toBe(false)
    expect(await ask('other')).toBe(false)

    // Al alumno se le cierra también con la misión bloqueada.
    await prisma.mission.update({ where: { id: missionId }, data: { status: 'bloqueada' } })
    try {
      expect(await ask('student')).toBe(false)
      expect(await ask('owner')).toBe(true)
    } finally {
      await prisma.mission.update({ where: { id: missionId }, data: { status: 'activa' } })
    }
  })

  it('POST /ai/generate/narrative con classId → solo el profesorado de la clase; el nombre de la clase llega al generador', async () => {
    const narrative = (actor: Actor | undefined, classId?: string) =>
      post('/ai/generate/narrative', actor, { prompt: 'Una historia de piratas', classId })

    expect((await narrative(undefined, f.classId)).statusCode).toBe(401)
    expect((await narrative('other', f.classId)).statusCode).toBe(404)
    expect((await narrative('student', f.classId)).statusCode).toBe(404)
    expect(provider.prompts).toHaveLength(0)

    const own = await narrative('owner', f.classId)
    expect(own.statusCode).toBe(200)
    const { name } = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
    expect(provider.prompts[0]).toContain(`Clase actual: ${name}`)

    // Sin clase no hay nada que comprobar.
    expect((await narrative('other')).statusCode).toBe(200)
  })

  it('POST /ai/mission-assistant y su versión en flujo con classId → solo el profesorado de la clase', async () => {
    for (const url of ['/ai/mission-assistant', '/ai/mission-assistant/stream']) {
      const payload = { message: 'Una misión sobre redes', classId: f.classId }
      expect((await post(url, 'other', payload)).statusCode).toBe(404)
      expect(provider.prompts).toHaveLength(0)
      expect((await post(url, 'owner', payload)).statusCode).toBe(200)
      provider.prompts.length = 0
    }
  })

  it('POST /ai/generate/narrative y /ai/mission-assistant con classId → también el profesorado añadido, mientras su acceso siga vigente', async () => {
    const tag = f.classId.slice(0, 8)
    const teachers = await Promise.all(
      [
        { label: 'lectura', endsAt: null },
        { label: 'vencido', endsAt: new Date(Date.now() - 60_000) },
      ].map(async ({ label, endsAt }) => {
        const user = await prisma.user.create({
          data: {
            email: `co-ia-${label}.${tag}@test.invalid`,
            passwordHash: 'x',
            name: `Co IA ${label}`,
            role: 'teacher',
            isOnboarded: true,
          },
        })
        await prisma.classTeacher.create({
          data: {
            classId: f.classId,
            userId: user.id,
            access: 'read',
            profile: 'practicas',
            addedById: f.users.owner.id,
            endsAt,
          },
        })
        return { id: user.id, token: app.jwt.sign({ id: user.id, role: 'teacher' }) }
      })
    )
    const [reader, expired] = teachers
    const postAs = (url: string, token: string, payload: Record<string, unknown>) =>
      app.inject({ method: 'POST', url, payload, headers: { authorization: `Bearer ${token}` } })
    const calls: Array<[string, Record<string, unknown>]> = [
      ['/ai/generate/narrative', { prompt: 'Una historia de piratas', classId: f.classId }],
      ['/ai/mission-assistant', { message: 'Una misión sobre redes', classId: f.classId }],
      ['/ai/mission-assistant/stream', { message: 'Una misión sobre redes', classId: f.classId }],
    ]

    try {
      for (const [url, payload] of calls) {
        expect((await postAs(url, expired.token, payload)).statusCode, url).toBe(404)
        expect(provider.prompts, url).toHaveLength(0)
        expect((await postAs(url, reader.token, payload)).statusCode, url).toBe(200)
        provider.prompts.length = 0
      }
    } finally {
      await prisma.classTeacher.deleteMany({ where: { userId: { in: teachers.map(t => t.id) } } })
      await prisma.user.deleteMany({ where: { id: { in: teachers.map(t => t.id) } } })
    }
  })

  it('el asistente del profesor y su herramienta de clases cuentan las clases a las que tiene acceso; el código, solo con administración', async () => {
    const cls = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
    const co = await prisma.user.create({
      data: {
        email: `co-asistente.${f.classId.slice(0, 8)}@test.invalid`,
        passwordHash: 'x',
        name: 'Co asistente',
        role: 'teacher',
        isOnboarded: true,
      },
    })
    await prisma.classTeacher.create({
      data: {
        classId: f.classId,
        userId: co.id,
        access: 'read',
        profile: 'practicas',
        addedById: f.users.owner.id,
      },
    })
    const promptFor = async (userId: string) => {
      const conversation = await prisma.chatConversation.create({
        data: { userId, assistantId: 'atenea' },
      })
      provider.prompts.length = 0
      const response = await app.inject({
        method: 'POST',
        url: `/chat/conversations/${conversation.id}/messages`,
        payload: { content: '¿Qué clases tengo?' },
        headers: { authorization: `Bearer ${app.jwt.sign({ id: userId, role: 'teacher' })}` },
      })
      expect(response.statusCode).toBe(200)
      return provider.prompts.join('\n')
    }

    try {
      expect(await promptFor(co.id)).toContain(cls.name)
      expect(await promptFor(f.users.other.id)).not.toContain(cls.name)

      registerTeacherTools()
      const listClasses = getTool('list_classes')!
      const forCo = await listClasses.execute({ _userId: co.id })
      expect(forCo).toContain(cls.name)
      expect(forCo).not.toContain(cls.invitationCode)
      expect(await listClasses.execute({ _userId: f.users.owner.id })).toContain(cls.invitationCode)
      expect(await listClasses.execute({ _userId: f.users.other.id })).not.toContain(cls.name)
    } finally {
      await prisma.chatConversation.deleteMany({ where: { userId: co.id } })
      await prisma.user.delete({ where: { id: co.id } })
    }
  })
})
