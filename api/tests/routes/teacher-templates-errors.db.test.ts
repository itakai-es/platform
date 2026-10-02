import { it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * El catálogo de plantillas del profesorado lee la consulta como el público:
 * lo que no tiene la forma esperada (un filtro repetido, un byte nulo, un valor
 * larguísimo) se ignora en vez de llegar a la base y acabar en un 500 con el
 * texto de Postgres. Un filtro repetido vale por cualquiera de sus valores.
 * Ante un fallo interno, el listado, la ficha y publicar responden un 500 sin
 * el detalle; los 4xx de verdad siguen igual (404 de la plantilla que no está,
 * 400 de validación).
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts).
 */

/** Consultas del catálogo que fallan, para ver qué responde la ruta. */
const failing = vi.hoisted(() => ({ list: false, detail: false }))
const SECRET = 'detalle interno de la base que no debe salir'

vi.mock('../../src/modules/templates/templates.service.js', async importOriginal => {
  const original =
    await importOriginal<typeof import('../../src/modules/templates/templates.service.js')>()
  return {
    ...original,
    findTemplates: async (...args: Parameters<typeof original.findTemplates>) => {
      if (failing.list) throw new Error(SECRET)
      return original.findTemplates(...args)
    },
    findTemplate: async (...args: [string, string]) => {
      if (failing.detail) throw new Error(SECRET)
      return original.findTemplate(...args)
    },
  }
})

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

describeWithDatabase('catálogo de plantillas del profesorado: consulta laxa y errores', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const ids = {} as Record<'maths' | 'physics' | 'wood', string>

  const get = (url: string) =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${f.token('other')}` } })

  /** El listado con estos parámetros (los repetidos, en array), acotado a esta ejecución. */
  const list = (params: Record<string, string | string[]>) => {
    const query = new URLSearchParams({ q: tag })
    for (const [key, value] of Object.entries(params)) {
      for (const one of Array.isArray(value) ? value : [value]) query.append(key, one)
    }
    return get(`/teacher/templates?${query}`)
  }
  const listedIds = (body: { templates: { id: string }[] }) =>
    body.templates.map(tpl => tpl.id).sort()

  const newTemplate = async (label: string, subject: string) =>
    (
      await prisma.$transaction(tx =>
        createClassWithOwner(
          tx,
          {
            name: `Plantilla ${tag} ${label}`,
            invitationCode: randomUUID().slice(0, 6).toUpperCase(),
            isTemplate: true,
            subject,
            educationLevel: 'Bachillerato',
            language: 'Castellano',
          },
          f.users.owner.id
        )
      )
    ).id

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)
    ids.maths = await newTemplate('mates', 'Matemáticas')
    ids.physics = await newTemplate('física', 'Física y Química')
    ids.wood = await newTemplate('madera', 'Madera, Mueble y Corcho')
  })

  afterEach(() => {
    failing.list = false
    failing.detail = false
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  it('un filtro repetido vale por cualquiera de sus valores, sin 500', async () => {
    const both = await list({ subject: ['Matemáticas', 'Madera, Mueble y Corcho'] })
    expect(both.statusCode).toBe(200)
    expect(listedIds(both.json())).toEqual([ids.maths, ids.wood].sort())

    // Uno solo, como siempre.
    const one = await list({ subject: 'Física y Química' })
    expect(one.statusCode).toBe(200)
    expect(listedIds(one.json())).toEqual([ids.physics])
    expect(one.json().total).toBe(1)

    // Repetidos todos los filtros a la vez.
    const all = await list({
      subject: ['Matemáticas', 'Física y Química'],
      educationLevel: ['Bachillerato', 'Primaria'],
      language: ['Castellano', 'Català'],
    })
    expect(all.statusCode).toBe(200)
    expect(listedIds(all.json())).toEqual([ids.maths, ids.physics].sort())
  })

  it('lo que no tiene la forma esperada se ignora: un byte nulo, un valor larguísimo, la búsqueda repetida', async () => {
    const everything = [ids.maths, ids.physics, ids.wood].sort()

    for (const [label, query] of [
      ['byte nulo en el filtro', `q=${tag}&subject=%00`],
      ['byte nulo en un valor de varios', `q=${tag}&subject=Matem%C3%A1ticas&subject=a%00b`],
      ['filtro larguísimo', `q=${tag}&province=${'x'.repeat(5000)}`],
    ] as const) {
      const response = await get(`/teacher/templates?${query}`)
      expect(response.statusCode, label).toBe(200)
      expect(response.body, label).not.toContain('invalid byte sequence')
      if (label === 'byte nulo en un valor de varios') {
        expect(listedIds(response.json()), label).toEqual([ids.maths])
      } else {
        expect(listedIds(response.json()), label).toEqual(everything)
      }
    }

    // La búsqueda con un byte nulo o repetida no filtra: sale el catálogo (y sin 500).
    for (const query of ['q=%00', `q=${tag}&q=otra`, 'q[]=x']) {
      const response = await get(`/teacher/templates?${query}`)
      expect(response.statusCode, query).toBe(200)
      expect(Array.isArray(response.json().templates), query).toBe(true)
    }
  })

  it('las respuestas buenas no cambian de forma', async () => {
    const body = (await list({})).json()
    expect(Object.keys(body).sort()).toEqual(['templates', 'total'])
    const card = body.templates.find((tpl: { id: string }) => tpl.id === ids.maths)
    expect(Object.keys(card).sort()).toEqual(
      [
        'backgroundImage',
        'educationLevel',
        'id',
        'isOwn',
        'language',
        'missionCount',
        'name',
        'narrative',
        'province',
        'subject',
        'teacherName',
      ].sort()
    )
  })

  it('ante un fallo interno, el listado y la ficha dan un 500 sin el detalle', async () => {
    failing.list = true
    const listed = await list({})
    expect(listed.statusCode).toBe(500)
    expect(listed.json()).toEqual({ message: 'Error interno' })
    expect(listed.body).not.toContain(SECRET)

    failing.detail = true
    const detail = await get(`/teacher/templates/${ids.maths}`)
    expect(detail.statusCode).toBe(500)
    expect(detail.json()).toEqual({ message: 'Error interno' })
  })

  it('la plantilla que no está sigue dando su 404', async () => {
    // Un id con un byte nulo ni llega a la base (allí haría fallar la consulta).
    for (const id of [randomUUID(), 'no-es-un-uuid', '%00', f.classId]) {
      const response = await get(`/teacher/templates/${id}`)
      expect(response.statusCode, id).toBe(404)
      expect(response.json(), id).toEqual({ message: 'Plantilla no encontrada', code: 'NOT_FOUND' })
    }
    expect((await get(`/teacher/templates/${ids.maths}`)).statusCode).toBe(200)

    // Importar, igual.
    for (const id of ['no-es-un-uuid', '%00']) {
      const response = await app.inject({
        method: 'POST',
        url: `/teacher/templates/${id}/import`,
        payload: {},
        headers: { authorization: `Bearer ${f.token('other')}` },
      })
      expect(response.statusCode, id).toBe(404)
      expect(response.json(), id).toEqual({ message: 'Plantilla no encontrada', code: 'NOT_FOUND' })
    }
  })

  it('publicar: sin metadatos, 400 con su mensaje; ante un fallo interno, 500 sin el detalle', async () => {
    const publish = (payload: unknown) =>
      app.inject({
        method: 'POST',
        url: `/teacher/classes/${f.classId}/publish-template`,
        payload: payload as Record<string, unknown>,
        headers: { authorization: `Bearer ${f.token('owner')}` },
      })

    const missing = await publish({ publish: true })
    expect(missing.statusCode).toBe(400)
    expect(missing.json()).toEqual({
      message:
        'Completa los metadatos de la clase (asignatura, nivel e idioma) antes de publicarla como plantilla.',
      code: 'VALIDATION_ERROR',
    })
    expect((await publish({ publish: 'sí' })).statusCode).toBe(400)

    vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error(SECRET))
    const broken = await publish({ publish: false })
    expect(broken.statusCode).toBe(500)
    expect(broken.json()).toEqual({ message: 'Error interno' })

    expect((await publish({ publish: false })).statusCode).toBe(200)
  })
})
