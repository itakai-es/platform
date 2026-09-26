import { it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Firma y fecha de publicación del blog (bloque 3, B2). La firma es texto
 * libre y la fecha se puede corregir desde el panel, las dos solo en el blog:
 * la ayuda ni las acepta ni las enseña, y su fecha la sigue poniendo el
 * sistema. En público, el índice, el artículo y la búsqueda del blog las
 * devuelven; los de la ayuda salen como siempre.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Las categorías llevan la etiqueta de esta
 * ejecución y se borran al acabar (sus artículos caen en cascada).
 */

import { buildApp, prisma } from '../helpers/class-fixture.js'
import { adminHelpRoutes, publicHelpRoutes } from '../../src/modules/help/help.routes.js'

describeWithDatabase('firma y fecha de publicación del blog', () => {
  let app: FastifyInstance
  const tag = randomUUID().slice(0, 8)
  /** Una palabra que solo está en los cuerpos de esta ejecución, para la búsqueda. */
  const keyword = `xilofon${tag.replace(/\d/g, '')}`
  let adminId: string
  let blogCategory: { id: string; slug: string }
  let helpCategory: { id: string; slug: string }

  const admin = (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) =>
    app.inject({
      method,
      url,
      payload: payload as Record<string, unknown> | undefined,
      headers: { authorization: `Bearer ${app.jwt.sign({ id: adminId, role: 'admin' })}` },
    })

  const publicGet = async (url: string) => {
    const response = await app.inject({ method: 'GET', url })
    expect(response.statusCode).toBe(200)
    return response.json()
  }

  let counter = 0
  /** Un artículo nuevo por el panel; devuelve la respuesta tal cual. */
  const create = (categoryId: string, extra: Record<string, unknown> = {}) =>
    admin('POST', '/admin/help/articles', {
      categoryId,
      title: `Entrada ${tag} ${++counter}`,
      body: `Texto de la entrada con ${keyword}.`,
      ...extra,
    })

  const created = async (categoryId: string, extra: Record<string, unknown> = {}) => {
    const response = await create(categoryId, extra)
    expect(response.statusCode).toBe(201)
    return response.json().article as {
      id: string
      slug: string
      authorName: string | null
      publishedAt: string | null
    }
  }

  const newCategory = async (name: string, area: 'ayuda' | 'blog') => {
    const response = await admin('POST', '/admin/help/categories', { name, area })
    expect(response.statusCode).toBe(201)
    return response.json().category as { id: string; slug: string }
  }

  const march = '2024-03-10T12:00:00.000Z'

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(publicHelpRoutes, { prefix: '/public/help' })
      await instance.register(adminHelpRoutes, { prefix: '/admin/help' })
    })
    const user = await prisma.user.create({
      data: {
        email: `admin.${tag}@test.invalid`,
        passwordHash: 'x',
        name: `Admin ${tag}`,
        role: 'admin',
        isOnboarded: true,
      },
    })
    adminId = user.id
    blogCategory = await newCategory(`Blog pruebas ${tag}`, 'blog')
    helpCategory = await newCategory(`Ayuda pruebas ${tag}`, 'ayuda')
  })

  afterAll(async () => {
    await prisma.helpCategory.deleteMany({
      where: { id: { in: [blogCategory?.id, helpCategory?.id].filter(Boolean) } },
    })
    if (adminId) await prisma.user.delete({ where: { id: adminId } })
    await app?.close()
  })

  it('al crear una entrada guarda la firma (sin espacios) y la fecha elegida', async () => {
    const article = await created(blogCategory.id, {
      status: 'publicado',
      authorName: '  Equipo ITAKAI  ',
      publishedAt: march,
    })
    expect(article.authorName).toBe('Equipo ITAKAI')
    expect(article.publishedAt).toBe(march)

    // El listado del panel las trae para pintarlas en la fila.
    const list = await admin('GET', `/admin/help/articles?area=blog&categoryId=${blogCategory.id}`)
    expect(list.statusCode).toBe(200)
    expect(list.json().articles.find((a: { id: string }) => a.id === article.id)).toMatchObject({
      authorName: 'Equipo ITAKAI',
      publishedAt: march,
    })
  })

  it('sin fecha, la pone el sistema al publicar; sin firma, no hay firma', async () => {
    const before = Date.now()
    const published = await created(blogCategory.id, { status: 'publicado', authorName: '   ' })
    expect(published.authorName).toBeNull()
    expect(new Date(published.publishedAt!).getTime()).toBeGreaterThanOrEqual(before - 1000)

    const draft = await created(blogCategory.id, { authorName: 'Ana' })
    expect(draft).toMatchObject({ authorName: 'Ana', publishedAt: null })
  })

  it('al editar cambia firma y fecha; lo que no viene no se toca', async () => {
    const article = await created(blogCategory.id, {
      status: 'publicado',
      authorName: 'Ana',
      publishedAt: march,
    })

    let response = await admin('PATCH', `/admin/help/articles/${article.id}`, {
      authorName: 'Luis',
      publishedAt: '2025-01-15T12:00:00+01:00',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().article).toMatchObject({
      authorName: 'Luis',
      publishedAt: '2025-01-15T11:00:00.000Z',
    })

    // Un cambio de título no toca ni la firma ni la fecha.
    response = await admin('PATCH', `/admin/help/articles/${article.id}`, { title: `Otro ${tag}` })
    expect(response.json().article).toMatchObject({
      authorName: 'Luis',
      publishedAt: '2025-01-15T11:00:00.000Z',
    })

    // Retirar y volver a publicar conserva la fecha corregida.
    await admin('PATCH', `/admin/help/articles/${article.id}`, { status: 'borrador' })
    response = await admin('PATCH', `/admin/help/articles/${article.id}`, { status: 'publicado' })
    expect(response.json().article.publishedAt).toBe('2025-01-15T11:00:00.000Z')

    // Retirada, la fecha se puede seguir corrigiendo: ya se publicó una vez.
    await admin('PATCH', `/admin/help/articles/${article.id}`, { status: 'borrador' })
    response = await admin('PATCH', `/admin/help/articles/${article.id}`, { publishedAt: march })
    expect(response.statusCode).toBe(200)
    expect(response.json().article.publishedAt).toBe(march)

    // `null` quita la firma.
    response = await admin('PATCH', `/admin/help/articles/${article.id}`, { authorName: null })
    expect(response.json().article.authorName).toBeNull()
  })

  it('un borrador que nunca se ha publicado toma la fecha al publicarse con ella', async () => {
    const draft = await created(blogCategory.id)
    const response = await admin('PATCH', `/admin/help/articles/${draft.id}`, {
      status: 'publicado',
      publishedAt: march,
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().article).toMatchObject({ status: 'publicado', publishedAt: march })
  })

  it('rechaza fechas que no tienen sentido y firmas demasiado largas', async () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    for (const publishedAt of [future, '1999-12-31T12:00:00Z']) {
      const response = await create(blogCategory.id, { status: 'publicado', publishedAt })
      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('HELP_PUBLISHED_AT_INVALID')
    }

    // Formato que no es fecha y hora ISO con zona, y una fecha vacía.
    for (const publishedAt of ['10/03/2024', '2024-03-10', null]) {
      const response = await create(blogCategory.id, { status: 'publicado', publishedAt })
      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('VALIDATION_ERROR')
    }

    const long = await create(blogCategory.id, { authorName: 'a'.repeat(121) })
    expect(long.statusCode).toBe(400)

    // Hoy mismo, aunque sea un poco más tarde que el reloj del servidor, sí vale.
    const soon = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    const today = await create(blogCategory.id, { status: 'publicado', publishedAt: soon })
    expect(today.statusCode).toBe(201)
  })

  it('un borrador que nunca se ha publicado no admite fecha', async () => {
    const response = await create(blogCategory.id, { publishedAt: march })
    expect(response.statusCode).toBe(400)
    expect(response.json().code).toBe('HELP_PUBLISHED_AT_UNPUBLISHED')

    const draft = await created(blogCategory.id)
    const patch = await admin('PATCH', `/admin/help/articles/${draft.id}`, { publishedAt: march })
    expect(patch.statusCode).toBe(400)
    expect(patch.json().code).toBe('HELP_PUBLISHED_AT_UNPUBLISHED')
  })

  it('la ayuda no acepta firma ni fecha a mano, y su fecha la sigue poniendo el sistema', async () => {
    for (const extra of [{ authorName: 'Ana' }, { publishedAt: march }]) {
      const response = await create(helpCategory.id, { status: 'publicado', ...extra })
      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('HELP_BLOG_ONLY_FIELD')
    }

    const article = await created(helpCategory.id, { status: 'publicado', authorName: null })
    expect(article.authorName).toBeNull()
    expect(article.publishedAt).not.toBeNull()

    const patch = await admin('PATCH', `/admin/help/articles/${article.id}`, { authorName: 'Ana' })
    expect(patch.statusCode).toBe(400)
    expect(patch.json().code).toBe('HELP_BLOG_ONLY_FIELD')

    // Mover una entrada del blog a la ayuda pidiendo firma tampoco cuela.
    const post = await created(blogCategory.id, { status: 'publicado' })
    const move = await admin('PATCH', `/admin/help/articles/${post.id}`, {
      categoryId: helpCategory.id,
      authorName: 'Ana',
    })
    expect(move.statusCode).toBe(400)
    expect(move.json().code).toBe('HELP_BLOG_ONLY_FIELD')
  })

  it('en público, la ayuda no enseña firma ni fecha de publicación aunque la base la tenga', async () => {
    const article = await created(helpCategory.id, { status: 'publicado', featured: true })
    // Una firma que solo podría haber llegado a mano (o de una entrada movida del blog).
    await prisma.helpArticle.update({ where: { id: article.id }, data: { authorName: 'Oculta' } })

    const index = await publicGet('/public/help')
    const card = index.categories
      .find((c: { slug: string }) => c.slug === helpCategory.slug)
      ?.articles.find((a: { id: string }) => a.id === article.id)
    expect(card).toBeDefined()
    expect(card).not.toHaveProperty('authorName')
    expect(card).not.toHaveProperty('publishedAt')
    const featured = index.featured.find((a: { id: string }) => a.id === article.id)
    expect(featured).toBeDefined()
    expect(featured).not.toHaveProperty('authorName')

    const view = await publicGet(`/public/help/${helpCategory.slug}/${article.slug}`)
    expect(view.article).not.toHaveProperty('authorName')
    expect(view.article).not.toHaveProperty('publishedAt')
    for (const sibling of view.siblings) expect(sibling).not.toHaveProperty('authorName')

    const search = await publicGet(`/public/help/buscar?q=${keyword}`)
    const hit = search.results.find((r: { id: string }) => r.id === article.id)
    expect(hit).toBeDefined()
    expect(hit).not.toHaveProperty('authorName')
  })

  it('en público, el blog devuelve firma y fecha en el índice, el artículo y la búsqueda', async () => {
    const article = await created(blogCategory.id, {
      status: 'publicado',
      featured: true,
      authorName: 'Equipo ITAKAI',
      publishedAt: march,
    })
    const expected = { authorName: 'Equipo ITAKAI', publishedAt: march }

    const index = await publicGet('/public/help?area=blog')
    const category = index.categories.find((c: { slug: string }) => c.slug === blogCategory.slug)
    expect(category.articles.find((a: { id: string }) => a.id === article.id)).toMatchObject(expected)
    expect(index.featured.find((a: { id: string }) => a.id === article.id)).toMatchObject(expected)

    const view = await publicGet(`/public/help/${blogCategory.slug}/${article.slug}?area=blog`)
    expect(view.article).toMatchObject(expected)
    expect(view.category.area).toBe('blog')
    expect(view.siblings.find((a: { id: string }) => a.id === article.id)).toMatchObject(expected)
    // Las entradas sin firma la traen vacía, no la omiten.
    for (const sibling of view.siblings) expect(sibling).toHaveProperty('authorName')

    const search = await publicGet(`/public/help/buscar?q=${keyword}&area=blog`)
    expect(search.results.find((r: { id: string }) => r.id === article.id)).toMatchObject(expected)

    // Sin `?area=blog`, una entrada del blog no se sirve por la ruta de la ayuda.
    const wrongArea = await app.inject({
      method: 'GET',
      url: `/public/help/${blogCategory.slug}/${article.slug}`,
    })
    expect(wrongArea.statusCode).toBe(404)
  })

  it('la previsualización del panel lleva firma y fecha, también en borrador', async () => {
    const draft = await created(blogCategory.id, { authorName: 'Ana' })
    const response = await admin('GET', `/admin/help/articles/${draft.id}/preview`)
    expect(response.statusCode).toBe(200)
    expect(response.json().article).toMatchObject({ authorName: 'Ana', publishedAt: null })
  })
})
