import { it, expect, vi, beforeAll, afterAll, beforeEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Importar una plantilla: crea una clase nueva de quien importa con la
 * historia, las funcionalidades, la tienda y los comportamientos de la
 * plantilla y, solo si lo pide (`{ missions: true }`), sus misiones con sus
 * enigmas: cada una en el estado que tiene en la plantilla, sin fecha límite,
 * sin documentos y sin insignia, sin progreso ni entregas. Sin cuerpo, como
 * siempre: sin misiones. Las portadas, solo si son ficheros públicos de la
 * plataforma. Un cuerpo con otras opciones da 400; una plantilla retirada o
 * archivada, 404; y si algo falla a medias, no queda nada y da 500.
 *
 * Duplicar una clase usa la misma copia y sigue como siempre: las misiones con
 * su estado y su fecha límite tal cual.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts).
 */

/**
 * Copias de misión que fallan, por el título de la misión de origen: fallan
 * después de escribirla, para ver que lo ya copiado también se deshace.
 */
const copy = vi.hoisted(() => ({ failing: new Set<string>() }))

vi.mock('../../src/modules/teachers/mission-copy.js', async importOriginal => {
  const original =
    await importOriginal<typeof import('../../src/modules/teachers/mission-copy.js')>()
  return {
    ...original,
    copyMissionInto: async (...args: Parameters<typeof original.copyMissionInto>) => {
      const result = await original.copyMissionInto(...args)
      const { title } = args[1]
      if (copy.failing.has(title)) throw new Error(`Fallo simulado al copiar ${title}`)
      return result
    },
  }
})

import {
  buildApp,
  createClassFixture,
  prisma,
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

const DEADLINE = new Date('2031-05-20T10:00:00.000Z')
const COVER = '/uploads/covers/plantilla-origen.png'
const MISSION_COVER = '/uploads/covers/mision-origen.png'

describeWithDatabase('importar una plantilla', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const name = `Plantilla ${tag}`
  /** Sus misiones, de la más antigua a la más reciente. */
  const titles = [`Primera ${tag}`, `Segunda ${tag}`, `Tercera ${tag}`]
  let templateId: string

  const importTemplate = (payload?: unknown, actor: Actor = 'other', id = templateId) =>
    app.inject({
      method: 'POST',
      url: `/teacher/templates/${id}/import`,
      ...(payload === undefined ? {} : { payload: payload as object }),
      headers: { authorization: `Bearer ${f.token(actor)}` },
    })

  /** Cuántas clases tiene `actor`: importar le crea una. */
  const classCount = (actor: Actor) =>
    prisma.class.count({ where: { teacherId: f.users[actor].id } })

  /** Las misiones de `classId`, con todo lo que se podría haber copiado, por título. */
  const missionsOf = (classId: string) =>
    prisma.mission.findMany({
      where: { classId },
      include: {
        enigmas: { orderBy: { orderIndex: 'asc' }, include: { progress: true, submissions: true } },
        documents: true,
        badges: true,
        progress: true,
      },
      orderBy: { title: 'asc' },
    })

  /** Lo copiado, campo a campo, sin ids ni fechas de creación. */
  const enigmaRows = (enigmas: Awaited<ReturnType<typeof missionsOf>>[number]['enigmas']) =>
    enigmas.map(e => [
      e.title,
      e.description,
      e.objectives,
      e.isOptional,
      e.orderIndex,
      e.xpReward,
      e.coinReward,
      e.manaReward,
    ])

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)

    // La plantilla, del propietario, con todo lo que se lleva quien la importa.
    templateId = (
      await prisma.$transaction(tx =>
        createClassWithOwner(
          tx,
          {
            name,
            invitationCode: randomUUID().slice(0, 6).toUpperCase(),
            isTemplate: true,
            narrative: 'Una historia para copiar.',
            backgroundImage: COVER,
            settings: { mana: false },
            subject: 'Matemáticas',
            educationLevel: 'Bachillerato',
            language: 'Castellano',
          },
          f.users.owner.id
        )
      )
    ).id
    await prisma.shopItem.create({ data: { classId: templateId, name: 'Pluma', price: 5 } })
    await prisma.shopItem.create({
      data: { classId: templateId, name: 'Pergamino', price: 30, active: false },
    })
    await prisma.behaviorTemplate.create({
      data: { classId: templateId, kind: 'positive', name: 'Ayuda', xpDelta: 5 },
    })

    // Primera: activa, con fecha límite, portada, dos enigmas (desordenados al
    // crearlos), un documento, su insignia y lo que ha hecho un alumno con ella.
    const first = await prisma.mission.create({
      data: {
        classId: templateId,
        title: titles[0],
        description: 'Descubre quién se llevó el mapa',
        status: 'activa',
        rarity: 'epica',
        deadline: DEADLINE,
        backgroundImage: MISSION_COVER,
        createdAt: new Date('2026-01-01T09:00:00Z'),
      },
    })
    const second = await prisma.missionEnigma.create({
      data: {
        missionId: first.id,
        title: 'Segundo',
        objectives: ['Leer', 'Resumir'],
        xpReward: 30,
        coinReward: 4,
        manaReward: 2,
        orderIndex: 1,
      },
    })
    const firstEnigma = await prisma.missionEnigma.create({
      data: {
        missionId: first.id,
        title: 'Primero',
        description: 'Empieza aquí',
        isOptional: true,
        xpReward: 10,
        orderIndex: 0,
      },
    })
    await prisma.missionDocument.create({
      data: {
        missionId: first.id,
        name: 'Apuntes',
        fileUrl: `/uploads/documents/${tag}.pdf`,
        fileName: 'apuntes.pdf',
        fileSize: 1,
        mimeType: 'application/pdf',
      },
    })
    const badge = await prisma.badge.create({
      data: { name: 'Cartógrafa', teacherId: f.users.owner.id, missionId: first.id },
    })
    await prisma.studentMissionProgress.create({
      data: { studentId: f.users.student.id, missionId: first.id, progress: 50 },
    })
    await prisma.studentEnigmaProgress.create({
      data: { studentId: f.users.student.id, enigmaId: firstEnigma.id, xpEarned: 10 },
    })
    await prisma.enigmaSubmission.create({
      data: { enigmaId: second.id, studentId: f.users.student.id },
    })
    await prisma.studentBadge.create({ data: { studentId: f.users.student.id, badgeId: badge.id } })

    // Segunda: bloqueada, con fecha límite y sin enigmas. Tercera: activa, con uno.
    await prisma.mission.create({
      data: {
        classId: templateId,
        title: titles[1],
        status: 'bloqueada',
        deadline: DEADLINE,
        createdAt: new Date('2026-01-02T09:00:00Z'),
      },
    })
    const third = await prisma.mission.create({
      data: {
        classId: templateId,
        title: titles[2],
        rarity: 'rara',
        createdAt: new Date('2026-01-03T09:00:00Z'),
      },
    })
    await prisma.missionEnigma.create({
      data: { missionId: third.id, title: 'Único', xpReward: 20, coinReward: 1 },
    })
  })

  beforeEach(() => copy.failing.clear())

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  describe('sin sus misiones, como siempre', () => {
    it('sin cuerpo, con uno vacío o con missions: false llega la clase sin sus misiones', async () => {
      for (const payload of [undefined, {}, { missions: false }]) {
        const response = await importTemplate(payload)
        expect(response.statusCode, JSON.stringify(payload)).toBe(200)
        const body = response.json()
        expect(body).toEqual({
          class: { id: expect.any(String), name: `${name} (copia)` },
          missions: 0,
          message: 'Plantilla importada como nueva clase',
        })

        const created = await prisma.class.findUniqueOrThrow({
          where: { id: body.class.id },
          include: { shopItems: { orderBy: { price: 'asc' } }, behaviorTemplates: true },
        })
        expect(created).toMatchObject({
          teacherId: f.users.other.id,
          isTemplate: false,
          narrative: 'Una historia para copiar.',
          backgroundImage: COVER,
          settings: { mana: false },
        })
        expect(created.shopItems.map(s => [s.name, s.active])).toEqual([
          ['Pluma', true],
          ['Pergamino', false],
        ])
        expect(created.behaviorTemplates.map(b => b.name)).toEqual(['Ayuda'])
        expect(await prisma.mission.count({ where: { classId: created.id } })).toBe(0)
      }
    })
  })

  describe('con sus misiones', () => {
    it('llegan con sus enigmas y su estado, sin fecha límite, documentos, insignias ni progreso', async () => {
      const otherBadges = await prisma.badge.count({ where: { teacherId: f.users.other.id } })

      const response = await importTemplate({ missions: true })
      expect(response.statusCode).toBe(200)
      // Dice cuántas ha copiado: las que tiene la plantilla al importarla.
      expect(response.json()).toEqual({
        class: { id: expect.any(String), name: `${name} (copia)` },
        missions: titles.length,
        message: 'Plantilla importada como nueva clase',
      })
      const classId = response.json().class.id

      const copies = await missionsOf(classId)
      expect(copies.map(m => [m.title, m.status, m.rarity, m.deadline])).toEqual([
        [titles[0], 'activa', 'epica', null],
        [titles[1], 'bloqueada', 'comun', null],
        [titles[2], 'activa', 'rara', null],
      ])
      expect(copies[0]).toMatchObject({
        description: 'Descubre quién se llevó el mapa',
        backgroundImage: MISSION_COVER,
      })
      // Los enigmas, en su orden y con lo que dan.
      expect(enigmaRows(copies[0].enigmas)).toEqual([
        ['Primero', 'Empieza aquí', [], true, 0, 10, 0, 0],
        ['Segundo', null, ['Leer', 'Resumir'], false, 1, 30, 4, 2],
      ])
      expect(copies[1].enigmas).toEqual([])
      expect(enigmaRows(copies[2].enigmas)).toEqual([['Único', null, [], false, 0, 20, 1, 0]])

      // Nada de documentos, insignias, progreso ni entregas.
      for (const mission of copies) {
        expect(mission.documents, mission.title).toEqual([])
        expect(mission.badges, mission.title).toEqual([])
        expect(mission.progress, mission.title).toEqual([])
        for (const enigma of mission.enigmas) {
          expect(enigma.progress).toEqual([])
          expect(enigma.submissions).toEqual([])
        }
      }
      expect(await prisma.badge.count({ where: { teacherId: f.users.other.id } })).toBe(otherBadges)

      // Se crean de la más antigua a la más reciente, como en la plantilla: la
      // clase nueva las ordena igual.
      const created = new Map(copies.map(m => [m.title, m.createdAt.getTime()]))
      const times = titles.map(title => created.get(title)!)
      expect(times).toEqual([...times].sort((a, b) => a - b))

      // La plantilla, intacta.
      const template = await missionsOf(templateId)
      expect(template.map(m => [m.title, m.deadline])).toEqual(
        titles.map((title, i) => [title, i < 2 ? DEADLINE : null])
      )
      expect(template[0].documents).toHaveLength(1)
      expect(template[0].badges).toHaveLength(1)
      expect(template[0].progress).toHaveLength(1)
    })

    it('las portadas de fuera de la plataforma no llegan: ni la de la clase ni las de sus misiones', async () => {
      const outside = 'https://rastreador.invalid/pixel.gif'
      const [first, second] = await prisma.mission.findMany({
        where: { classId: templateId },
        orderBy: { createdAt: 'asc' },
        take: 2,
      })
      try {
        await prisma.class.update({ where: { id: templateId }, data: { backgroundImage: outside } })
        await prisma.mission.update({
          where: { id: second.id },
          data: { backgroundImage: outside },
        })

        const response = await importTemplate({ missions: true })
        expect(response.statusCode).toBe(200)
        const classId = response.json().class.id
        const created = await prisma.class.findUniqueOrThrow({ where: { id: classId } })
        expect(created.backgroundImage).toBeNull()
        // La de la plataforma, sí.
        const copies = await missionsOf(classId)
        expect(copies.map(m => [m.title, m.backgroundImage])).toEqual([
          [first.title, MISSION_COVER],
          [second.title, null],
          [titles[2], null],
        ])
      } finally {
        await prisma.class.update({ where: { id: templateId }, data: { backgroundImage: COVER } })
        await prisma.mission.update({ where: { id: second.id }, data: { backgroundImage: null } })
      }
    })

    it('quien la publicó también puede importarla con sus misiones', async () => {
      const response = await importTemplate({ missions: true }, 'owner')
      expect(response.statusCode).toBe(200)
      const copies = await missionsOf(response.json().class.id)
      expect(copies.map(m => m.title)).toEqual(titles)
      // Su insignia sigue siendo una sola: la de la plantilla.
      expect(
        await prisma.badge.count({ where: { name: 'Cartógrafa', teacherId: f.users.owner.id } })
      ).toBe(1)
    })
  })

  describe('lo que no vale', () => {
    it('un cuerpo con otras opciones o con missions que no es un booleano: 400, y no se crea nada', async () => {
      const before = await classCount('other')
      const invalid = [
        { missions: 'true' },
        { missions: 1 },
        { missions: null },
        // Otros nombres para la opción no se descartan en silencio.
        { withMissions: true },
        { missions: true, documents: true },
        [],
      ]
      for (const payload of invalid) {
        const response = await importTemplate(payload)
        expect(response.statusCode, JSON.stringify(payload)).toBe(400)
      }
      expect(await classCount('other')).toBe(before)
    })

    it('una plantilla retirada o con la clase archivada: 404, también con sus misiones', async () => {
      const before = await classCount('other')
      const expectMissing = async () => {
        for (const payload of [undefined, { missions: true }]) {
          const response = await importTemplate(payload)
          expect(response.statusCode, JSON.stringify(payload)).toBe(404)
          expect(response.json()).toEqual({ message: 'Plantilla no encontrada', code: 'NOT_FOUND' })
        }
      }

      try {
        await prisma.class.update({ where: { id: templateId }, data: { isTemplate: false } })
        await expectMissing()
        await prisma.class.update({
          where: { id: templateId },
          data: { isTemplate: true, archived: true },
        })
        await expectMissing()
      } finally {
        await prisma.class.update({
          where: { id: templateId },
          data: { isTemplate: true, archived: false },
        })
      }
      // Una que no existe, igual.
      for (const id of [randomUUID(), 'no-es-un-uuid']) {
        const missing = await importTemplate({ missions: true }, 'other', id)
        expect(missing.statusCode, id).toBe(404)
      }
      expect(await classCount('other')).toBe(before)
    })

    it('si algo falla a medias, no queda nada (ni la clase, ni sus misiones, ni su tienda) y da un 500 sin el detalle', async () => {
      const otherClasses = { teacherId: f.users.other.id }
      const counts = async () => ({
        classes: await classCount('other'),
        missions: await prisma.mission.count({ where: { class: otherClasses } }),
        enigmas: await prisma.missionEnigma.count({ where: { mission: { class: otherClasses } } }),
        shopItems: await prisma.shopItem.count({ where: { class: otherClasses } }),
        behaviors: await prisma.behaviorTemplate.count({ where: { class: otherClasses } }),
      })
      const before = await counts()

      // Falla la primera misión que se copia y la última.
      for (const title of [titles[0], titles[2]]) {
        copy.failing.add(title)
        const response = await importTemplate({ missions: true })
        copy.failing.clear()
        // No es que la plantilla no esté: un 500, sin el mensaje interno del fallo.
        expect(response.statusCode, title).toBe(500)
        expect(response.json(), title).toEqual({ message: 'Error interno' })
        expect(await counts(), title).toEqual(before)
      }

      // Y después, sin fallos, se importa entera.
      expect((await importTemplate({ missions: true })).statusCode).toBe(200)
      expect((await counts()).missions).toBe(before.missions + titles.length)
    })
  })

  describe('duplicar una clase, como siempre', () => {
    it('copia sus misiones con estado y fecha límite tal cual, sin documentos ni insignia', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/teacher/classes/${templateId}/duplicate`,
        payload: {},
        headers: { authorization: `Bearer ${f.token('owner')}` },
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body).toEqual({
        class: { id: expect.any(String), name: `${name} (copia)` },
        message: 'Clase duplicada',
      })

      const copies = await missionsOf(body.class.id)
      expect(copies.map(m => [m.title, m.status, m.deadline])).toEqual([
        [titles[0], 'activa', DEADLINE],
        [titles[1], 'bloqueada', DEADLINE],
        [titles[2], 'activa', null],
      ])
      expect(enigmaRows(copies[0].enigmas)).toEqual([
        ['Primero', 'Empieza aquí', [], true, 0, 10, 0, 0],
        ['Segundo', null, ['Leer', 'Resumir'], false, 1, 30, 4, 2],
      ])
      for (const mission of copies) {
        expect(mission.documents, mission.title).toEqual([])
        expect(mission.badges, mission.title).toEqual([])
      }
      expect(await prisma.shopItem.count({ where: { classId: body.class.id } })).toBe(2)

      // Y queda en el registro de la clase de origen, con lo que se eligió copiar.
      const logged = await prisma.classActionLog.findFirst({
        where: { classId: templateId, action: 'class.duplicated', entityId: body.class.id },
      })
      expect(logged?.metadata).toEqual({
        narrative: true,
        features: true,
        shop: true,
        behaviors: true,
        missions: true,
      })
    })
  })
})
