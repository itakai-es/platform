import { it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Plantillas recomendadas (bloque 3, E12). Solo la administración de la
 * instancia marca o desmarca una plantilla, y se apunta en el registro de la
 * clase. Las recomendadas salen primero en el orden de serie de los dos
 * catálogos (sin tocar los otros órdenes) y se pueden pedir solas; el catálogo
 * público solo dice si lo está, nunca quién la marcó ni cuándo. Retirar la
 * plantilla o enviar su clase a la papelera le quita la marca, y no vuelve
 * sola al publicarla otra vez. El panel lista las plantillas del catálogo con
 * su autoría, que solo ve la administración.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Las plantillas llevan la etiqueta de esta
 * ejecución en el nombre y las búsquedas se acotan con ella.
 */

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { publicTemplateRoutes } from '../../src/modules/templates/templates.routes.js'
import { resetRateLimits } from '../../src/utils/rate-limit.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

describeWithDatabase('plantillas recomendadas', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  let adminId: string
  let adminName: string

  /** Las plantillas de esta ejecución: la más antigua, primero. */
  const t = {} as Record<'old' | 'middle' | 'fresh', string>

  const adminToken = () => app.jwt.sign({ id: adminId, role: 'admin' })

  /** Sin `token`, sin sesión. */
  const send = (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    { token, payload }: { token?: string; payload?: Record<string, unknown> } = {}
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })

  const recommend = (classId: string, recommended: boolean, token = adminToken()) =>
    send('PATCH', `/admin/templates/${classId}/recommend`, { token, payload: { recommended } })

  const publicIds = async (params: Record<string, string> = {}) => {
    const response = await send('GET', `/public/templates?${new URLSearchParams({ q: tag, ...params })}`)
    expect(response.statusCode).toBe(200)
    return (response.json().templates as { id: string }[]).map(card => card.id)
  }

  const teacherList = async () => {
    const response = await send('GET', `/teacher/templates?q=${tag}`, { token: f.token('other') })
    expect(response.statusCode).toBe(200)
    return response.json().templates as { id: string; recommended: boolean }[]
  }

  const logOf = (classId: string) =>
    prisma.classActionLog.findMany({
      where: {
        classId,
        action: { in: ['class.template_recommended', 'class.template_unrecommended'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { action: true, actorId: true, actorName: true },
    })

  /** Una plantilla publicada de esta ejecución, tocada en `updatedAt`. */
  const newTemplate = async (label: string, updatedAt: Date) => {
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        {
          name: `Plantilla ${tag} ${label}`,
          invitationCode: randomUUID().slice(0, 6).toUpperCase(),
          isTemplate: true,
          subject: 'Matemáticas',
          educationLevel: 'Bachillerato',
          language: 'Castellano',
        },
        f.users.owner.id
      )
    )
    await prisma.class.update({ where: { id: cls.id }, data: { updatedAt } })
    return cls.id
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(adminRoutes, { prefix: '/admin' })
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(publicTemplateRoutes, { prefix: '/public/templates' })
    })
    f = await createClassFixture(app)
    adminName = `Admin ${tag}`
    adminId = (
      await prisma.user.create({
        data: {
          email: `admin.${tag}@test.invalid`,
          passwordHash: 'x',
          name: adminName,
          role: 'admin',
          isOnboarded: true,
        },
      })
    ).id
  })

  beforeEach(async () => {
    resetRateLimits()
    // Cada prueba parte de tres plantillas nuevas, sin recomendar.
    await prisma.class.deleteMany({ where: { name: { startsWith: `Plantilla ${tag}` } } })
    t.old = await newTemplate('antigua', new Date('2026-01-01T00:00:00Z'))
    t.middle = await newTemplate('media', new Date('2026-02-01T00:00:00Z'))
    t.fresh = await newTemplate('nueva', new Date('2026-03-01T00:00:00Z'))
  })

  afterAll(async () => {
    resetRateLimits()
    await f?.cleanup()
    if (adminId) await prisma.user.delete({ where: { id: adminId } })
    await app?.close()
  })

  // ---- Quién puede ----

  it('solo la administración marca o desmarca: sin sesión 401, profesorado y alumnado 403', async () => {
    const url = `/admin/templates/${t.old}/recommend`
    const payload = { recommended: true }
    expect((await send('PATCH', url, { payload })).statusCode).toBe(401)
    // Ni el propietario de la plantilla.
    expect((await send('PATCH', url, { token: f.token('owner'), payload })).statusCode).toBe(403)
    expect((await send('PATCH', url, { token: f.token('student'), payload })).statusCode).toBe(403)
    expect((await send('GET', '/admin/templates', { token: f.token('owner') })).statusCode).toBe(
      403
    )

    const row = await prisma.class.findUniqueOrThrow({ where: { id: t.old } })
    expect(row.recommendedAt).toBeNull()
    expect(await logOf(t.old)).toEqual([])
  })

  it('marca, apunta en el registro quién lo hizo y desmarca; repetir no cambia nada', async () => {
    const res = await recommend(t.old, true)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ recommended: true })

    const row = await prisma.class.findUniqueOrThrow({ where: { id: t.old } })
    expect(row.recommendedAt).toBeInstanceOf(Date)
    expect(row.recommendedById).toBe(adminId)

    // Otra vez: ni se mueve la fecha (ordena las recomendadas) ni se apunta.
    expect((await recommend(t.old, true)).statusCode).toBe(200)
    const again = await prisma.class.findUniqueOrThrow({ where: { id: t.old } })
    expect(again.recommendedAt).toEqual(row.recommendedAt)

    expect((await recommend(t.old, false)).json()).toEqual({
      recommended: false,
      recommendedAt: null,
    })
    expect((await recommend(t.old, false)).statusCode).toBe(200)
    const cleared = await prisma.class.findUniqueOrThrow({ where: { id: t.old } })
    expect(cleared.recommendedAt).toBeNull()
    expect(cleared.recommendedById).toBeNull()

    expect(await logOf(t.old)).toEqual([
      { action: 'class.template_recommended', actorId: adminId, actorName: adminName },
      { action: 'class.template_unrecommended', actorId: adminId, actorName: adminName },
    ])
  })

  it('solo se recomienda una plantilla del catálogo; el cuerpo tiene que decir sí o no', async () => {
    // Una clase que no es plantilla, una archivada, un id que no existe y otro con otra forma.
    expect((await recommend(f.classId, true)).statusCode).toBe(404)
    await prisma.class.update({ where: { id: t.middle }, data: { archived: true } })
    expect((await recommend(t.middle, true)).statusCode).toBe(404)
    expect((await recommend(randomUUID(), true)).statusCode).toBe(404)
    expect((await recommend('no-es-un-id', true)).statusCode).toBe(404)
    expect(await logOf(f.classId)).toEqual([])
    expect(await logOf(t.middle)).toEqual([])

    const bad = await send('PATCH', `/admin/templates/${t.old}/recommend`, {
      token: adminToken(),
      payload: { recommended: 'sí' },
    })
    expect(bad.statusCode).toBe(400)
  })

  // ---- Los catálogos ----

  it('las recomendadas salen primero en el orden de serie de los dos catálogos', async () => {
    // Sin ninguna, el de serie es el de las últimas tocadas.
    expect(await publicIds()).toEqual([t.fresh, t.middle, t.old])

    await recommend(t.old, true)
    await new Promise(resolve => setTimeout(resolve, 5))
    await recommend(t.middle, true)

    // La última marcada, la primera; después, las demás como en «recientes».
    const recommendedFirst = [t.middle, t.old, t.fresh]
    expect(await publicIds()).toEqual(recommendedFirst)
    expect(await publicIds({ sort: 'recommended' })).toEqual(recommendedFirst)
    // Los otros órdenes, como siempre.
    expect(await publicIds({ sort: 'recent' })).toEqual([t.fresh, t.middle, t.old])
    expect(await publicIds({ sort: 'name-asc' })).toEqual([t.old, t.middle, t.fresh])

    // Solo las recomendadas.
    expect(await publicIds({ recommended: 'true' })).toEqual([t.middle, t.old])
    expect(await publicIds({ recommended: '1' })).toEqual([t.middle, t.old])
    // Cualquier otra cosa no filtra.
    expect(await publicIds({ recommended: 'no' })).toHaveLength(3)

    // El del profesorado, en el mismo orden y con la marca.
    const teacher = await teacherList()
    expect(teacher.map(card => card.id)).toEqual(recommendedFirst)
    expect(teacher.map(card => card.recommended)).toEqual([true, true, false])
  })

  it('el catálogo público solo dice si está recomendada: ni quién ni cuándo', async () => {
    await recommend(t.old, true)

    const list = await send('GET', `/public/templates?q=${tag}`)
    // Cada tarjeta dice la suya: solo la marcada sale recomendada.
    const cards = list.json().templates as Array<{ id: string; recommended: unknown }>
    expect(cards.map(c => [c.id, c.recommended])).toEqual([
      [t.old, true],
      [t.fresh, false],
      [t.middle, false],
    ])
    const detail = await send('GET', `/public/templates/${t.old}`)
    expect(detail.json().recommended).toBe(true)
    expect((await send('GET', `/public/templates/${t.fresh}`)).json().recommended).toBe(false)

    for (const body of [list.body, detail.body]) {
      expect(body).not.toContain('recommendedAt')
      expect(body).not.toContain('recommendedBy')
      expect(body).not.toContain(adminId)
      expect(body).not.toContain(adminName)
    }
  })

  // ---- Lo que le quita la marca ----

  it('retirarla le quita la marca, que no vuelve sola al publicarla otra vez', async () => {
    await recommend(t.old, true)
    const publish = (value: boolean) =>
      send('POST', `/teacher/classes/${t.old}/publish-template`, {
        token: f.token('owner'),
        payload: { publish: value },
      })

    expect((await publish(false)).statusCode).toBe(200)
    const retired = await prisma.class.findUniqueOrThrow({ where: { id: t.old } })
    expect(retired).toMatchObject({ isTemplate: false, recommendedAt: null, recommendedById: null })

    expect((await publish(true)).statusCode).toBe(200)
    const republished = await prisma.class.findUniqueOrThrow({ where: { id: t.old } })
    expect(republished).toMatchObject({ isTemplate: true, recommendedAt: null })
    expect(await publicIds({ recommended: 'true' })).toEqual([])
  })

  it('enviarla a la papelera le quita la marca, y restaurarla no se la devuelve', async () => {
    await recommend(t.old, true)
    const owner = f.token('owner')

    const trashed = await send('DELETE', `/teacher/classes/${t.old}`, { token: owner })
    expect(trashed.statusCode).toBe(200)
    expect(await prisma.class.findUniqueOrThrow({ where: { id: t.old } })).toMatchObject({
      isTemplate: false,
      recommendedAt: null,
      recommendedById: null,
    })

    // En la papelera tampoco se puede recomendar.
    expect((await recommend(t.old, true)).statusCode).toBe(404)

    const restored = await send('POST', `/teacher/classes/${t.old}/restore`, { token: owner })
    expect(restored.statusCode).toBe(200)
    expect(
      (await prisma.class.findUniqueOrThrow({ where: { id: t.old } })).recommendedAt
    ).toBeNull()
  })

  // ---- El panel ----

  it('el panel lista las plantillas del catálogo con su autoría, filtra y ordena', async () => {
    await recommend(t.old, true)
    // Una archivada no está en el catálogo: tampoco aquí.
    await prisma.class.update({ where: { id: t.middle }, data: { archived: true } })

    const get = async (params: Record<string, string> = {}) => {
      const response = await send(
        'GET',
        `/admin/templates?${new URLSearchParams({ search: tag, ...params })}`,
        { token: adminToken() }
      )
      expect(response.statusCode).toBe(200)
      return response.json()
    }

    const body = await get()
    expect(body).toMatchObject({ total: 2, page: 1, totalPages: 1 })
    expect(body.templates.map((row: { id: string }) => row.id)).toEqual([t.old, t.fresh])
    const ownerName = (await prisma.user.findUniqueOrThrow({ where: { id: f.users.owner.id } }))
      .name
    expect(body.templates[0]).toMatchObject({
      id: t.old,
      name: `Plantilla ${tag} antigua`,
      subject: 'Matemáticas',
      educationLevel: 'Bachillerato',
      teacherName: ownerName,
      missionCount: 0,
      recommended: true,
    })
    expect(body.templates[1]).toMatchObject({ recommended: false, recommendedAt: null })

    expect((await get({ recommended: 'recommended' })).templates).toHaveLength(1)
    expect(
      (await get({ recommended: 'not-recommended' })).templates.map((r: { id: string }) => r.id)
    ).toEqual([t.fresh])
    expect((await get({ sort: 'recent' })).templates.map((r: { id: string }) => r.id)).toEqual([
      t.fresh,
      t.old,
    ])
    // Por el nombre de quien la publicó, y sin tildes en el de la plantilla.
    expect((await get({ search: ownerName })).total).toBeGreaterThanOrEqual(2)
    const noAccent = await send(
      'GET',
      `/admin/templates?search=${encodeURIComponent(`plantilla ${tag} antígua`)}`,
      { token: adminToken() }
    )
    expect(noAccent.json().templates.map((r: { id: string }) => r.id)).toEqual([t.old])
  })
})
