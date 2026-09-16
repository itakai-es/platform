import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { adminHelpRoutes, publicHelpRoutes } from '../../src/modules/help/help.routes.js'
import { HttpError } from '../../src/utils/errors.js'

/**
 * Rutas del centro de ayuda: lo que el servicio recibe desde la URL, cómo
 * responde cuando no hay nada y qué entra y qué no por validación. El
 * servicio va mockeado entero; aquí solo se prueba la frontera HTTP.
 */

vi.mock('../../src/modules/help/help.service.js', () => ({
  getPublicIndex: vi.fn(),
  searchArticles: vi.fn(),
  getPublicArticle: vi.fn(),
  registerView: vi.fn(),
  rateArticle: vi.fn(),
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategories: vi.fn(),
  listArticles: vi.fn(),
  getArticleById: vi.fn(),
  getArticlePreview: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  reorderArticles: vi.fn(),
  saveHelpImage: vi.fn(),
}))

import * as help from '../../src/modules/help/help.service.js'

/** El mismo criterio que el manejador global de index.ts, reducido a lo que usan estas rutas. */
async function buildApp(role: string | null = 'admin') {
  const app = Fastify()
  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ message: error.message, code: error.code })
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({ message: error.errors[0]?.message || 'Datos inválidos', code: 'VALIDATION_ERROR' })
    }
    return reply.status(500).send({ message: 'Error' })
  })
  // Como el `authenticate` real: sin sesión responde 401 y no puebla `request.user`.
  app.decorate('authenticate', async (request: any, reply: any) => {
    if (role === null) return reply.status(401).send({ message: 'No autorizado' })
    request.user = { id: 'u1', role }
  })
  await app.register(publicHelpRoutes, { prefix: '/public/help' })
  await app.register(adminHelpRoutes, { prefix: '/admin/help' })
  await app.ready()
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(help.getPublicIndex).mockResolvedValue({ categories: [], featured: [] } as any)
  vi.mocked(help.searchArticles).mockResolvedValue([])
  vi.mocked(help.getArticlePreview).mockResolvedValue(null)
  vi.mocked(help.createArticle).mockImplementation(async data => ({ id: 'a1', ...data }) as any)
  vi.mocked(help.updateArticle).mockImplementation(async (id, data) => ({ id, ...data }) as any)
  vi.mocked(help.reorderCategories).mockResolvedValue({ success: true, total: 2 })
})

describe('público', () => {
  it('GET /context/:key ya no es una ruta propia: cae en la de artículo y da 404', async () => {
    vi.mocked(help.getPublicArticle).mockResolvedValue(null)
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: '/public/help/context/x' })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('Artículo no encontrado')
    expect(vi.mocked(help.getPublicArticle).mock.calls[0].slice(0, 2)).toEqual(['context', 'x'])
  })

  // Con el servicio mockeado no se puede ver un 500 del servicio real: lo que
  // se comprueba es que el valor repetido no le llega como lista.
  it('un parámetro de texto repetido llega al servicio como ausente, no como lista', async () => {
    vi.mocked(help.listArticles).mockResolvedValue([])
    vi.mocked(help.getPublicArticle).mockResolvedValue(null)
    const app = await buildApp()

    const index = await app.inject({ method: 'GET', url: '/public/help/?locale=es&locale=en' })
    expect(index.statusCode).toBe(200)
    expect(vi.mocked(help.getPublicIndex).mock.calls[0][0]).toMatchObject({ locale: undefined })

    const search = await app.inject({ method: 'GET', url: '/public/help/buscar?q=clase&q=otra' })
    expect(search.statusCode).toBe(200)
    expect(vi.mocked(help.searchArticles).mock.calls[0][0]).toBe('')

    const admin = await app.inject({ method: 'GET', url: '/admin/help/articles?search=a&search=b' })
    expect(admin.statusCode).toBe(200)
    expect(vi.mocked(help.listArticles).mock.calls[0][0]).toMatchObject({ search: undefined })

    await app.inject({ method: 'GET', url: '/admin/help/articles?categoryId=a&categoryId=b' })
    expect(vi.mocked(help.listArticles).mock.calls[1][0]).toMatchObject({ categoryId: undefined })

    const article = await app.inject({ method: 'GET', url: '/public/help/clases/x?locale=es&locale=en' })
    expect(article.statusCode).toBe(404)
    expect(vi.mocked(help.getPublicArticle).mock.calls[0][2]).toMatchObject({ locale: undefined })
  })

  it('GET / acepta audience y area y descarta valores desconocidos', async () => {
    const app = await buildApp()

    await app.inject({ method: 'GET', url: '/public/help?audience=alumno&area=blog' })
    expect(help.getPublicIndex).toHaveBeenLastCalledWith({
      locale: undefined,
      audience: 'alumno',
      area: 'blog',
    })

    await app.inject({ method: 'GET', url: '/public/help?audience=ambos&area=nada&locale=es' })
    expect(help.getPublicIndex).toHaveBeenLastCalledWith({
      locale: 'es',
      audience: undefined,
      area: undefined,
    })
  })

  it('GET /buscar pasa los mismos filtros a la búsqueda', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/public/help/buscar?q=misiones&audience=profesor',
    })

    expect(response.statusCode).toBe(200)
    expect(help.searchArticles).toHaveBeenCalledWith('misiones', {
      locale: undefined,
      audience: 'profesor',
      area: undefined,
    })
    expect(response.json()).toEqual({ results: [], total: 0 })
  })

  it('GET /:categoria/:articulo pasa la audiencia para el lateral', async () => {
    vi.mocked(help.getPublicArticle).mockResolvedValue({
      article: { id: 'a1' },
      category: {},
      siblings: [],
      related: [],
    } as any)
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/public/help/clases/la-guia-de-clase?audience=alumno',
    })

    expect(response.statusCode).toBe(200)
    expect(help.getPublicArticle).toHaveBeenCalledWith('clases', 'la-guia-de-clase', {
      locale: undefined,
      audience: 'alumno',
      area: undefined,
    })
    expect(help.registerView).toHaveBeenCalledWith('a1')
  })

  it('GET /:categoria/:articulo da 404 sin sumar visita si el artículo no está en el área', async () => {
    vi.mocked(help.getPublicArticle).mockResolvedValue(null)
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: '/public/help/novedades/una-entrada' })

    expect(response.statusCode).toBe(404)
    expect(help.registerView).not.toHaveBeenCalled()
  })

  it('GET /:categoria/:articulo pasa el área pedida expresamente', async () => {
    vi.mocked(help.getPublicArticle).mockResolvedValue(null)
    const app = await buildApp()

    await app.inject({ method: 'GET', url: '/public/help/novedades/una-entrada?area=blog' })

    expect(vi.mocked(help.getPublicArticle).mock.calls[0][2]).toMatchObject({ area: 'blog' })
  })
})

describe('administración', () => {
  const article = {
    categoryId: '0f4b1c1e-2d3a-4e5f-8a9b-0c1d2e3f4a5b',
    title: 'Título',
    body: 'Cuerpo',
  }

  it('POST /articles rechaza una URL de vídeo que no sea https', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/admin/help/articles',
      payload: { ...article, kind: 'video', videoUrl: 'http://vimeo.com/1' },
    })

    expect(response.statusCode).toBe(400)
    expect(help.createArticle).not.toHaveBeenCalled()
  })

  it('POST /articles acepta audiencia, tipo y vídeo bien formados', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/admin/help/articles',
      payload: {
        ...article,
        audience: 'ambos',
        kind: 'video',
        videoUrl: 'https://www.youtube-nocookie.com/embed/x',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(help.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: 'ambos',
        kind: 'video',
        videoUrl: 'https://www.youtube-nocookie.com/embed/x',
      })
    )
  })

  it('PATCH /articles/:id admite null en videoUrl', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/help/articles/a1',
      payload: { videoUrl: null },
    })

    expect(response.statusCode).toBe(200)
    expect(help.updateArticle).toHaveBeenCalledWith('a1', { videoUrl: null })
  })

  it('PATCH /articles/:id traduce la regla del vídeo a un 400 con código', async () => {
    const { ValidationError } = await import('../../src/utils/errors.js')
    vi.mocked(help.updateArticle).mockRejectedValue(
      new ValidationError('Un artículo de tipo vídeo necesita la URL del vídeo para publicarse', 'HELP_VIDEO_URL_REQUIRED')
    )
    const app = await buildApp()

    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/help/articles/a1',
      payload: { status: 'publicado' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().code).toBe('HELP_VIDEO_URL_REQUIRED')
  })

  it('PATCH /articles/:id responde 404 si el artículo no existe', async () => {
    const { NotFoundError } = await import('../../src/utils/errors.js')
    vi.mocked(help.updateArticle).mockRejectedValue(new NotFoundError('Artículo no encontrado'))
    const app = await buildApp()

    const response = await app.inject({ method: 'PATCH', url: '/admin/help/articles/nada', payload: { title: 'X' } })

    expect(response.statusCode).toBe(404)
  })

  it('POST /imagenes responde 400 si el servicio rechaza la imagen', async () => {
    vi.mocked(help.saveHelpImage).mockRejectedValueOnce(new Error('Formato de imagen no admitido'))
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/admin/help/imagenes',
      payload: { image: 'data:image/svg+xml;base64,PHN2Zz4=' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('GET /articles/:id/preview devuelve 404 si no existe', async () => {
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: '/admin/help/articles/nada/preview' })

    expect(response.statusCode).toBe(404)
    expect(response.json().message).toBe('Artículo no encontrado')
  })

  it('GET /articles/:id/preview devuelve la vista completa', async () => {
    vi.mocked(help.getArticlePreview).mockResolvedValue({
      article: { id: 'a1' },
      category: {},
      siblings: [],
      related: [],
    } as any)
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: '/admin/help/articles/a1/preview' })

    expect(response.statusCode).toBe(200)
    expect(response.json().article.id).toBe('a1')
    expect(help.registerView).not.toHaveBeenCalled()
  })

  it('GET /articles descarta filtros con valores desconocidos', async () => {
    vi.mocked(help.listArticles).mockResolvedValue([])
    const app = await buildApp()

    await app.inject({
      method: 'GET',
      url: '/admin/help/articles?audience=ambos&kind=pelicula&area=blog&status=publicado',
    })

    expect(help.listArticles).toHaveBeenCalledWith({
      categoryId: undefined,
      search: undefined,
      status: 'publicado',
      audience: 'ambos',
      kind: undefined,
      area: 'blog',
    })
  })

  it('PUT /categories/order exige uuids', async () => {
    const app = await buildApp()

    const rejected = await app.inject({
      method: 'PUT',
      url: '/admin/help/categories/order',
      payload: { orderedIds: ['c1', 'c2'] },
    })
    expect(rejected.statusCode).toBe(400)
    expect(help.reorderCategories).not.toHaveBeenCalled()

    const ids = ['0f4b1c1e-2d3a-4e5f-8a9b-0c1d2e3f4a5b', '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d']
    const accepted = await app.inject({
      method: 'PUT',
      url: '/admin/help/categories/order',
      payload: { orderedIds: ids },
    })
    expect(accepted.statusCode).toBe(200)
    expect(help.reorderCategories).toHaveBeenCalledWith(ids)
    expect(help.reorderArticles).not.toHaveBeenCalled()
  })

  it('POST /categories limita el acento y el área a los valores conocidos', async () => {
    vi.mocked(help.createCategory).mockResolvedValue({ id: 'c1' } as any)
    const app = await buildApp()

    const rejected = await app.inject({
      method: 'POST',
      url: '/admin/help/categories',
      payload: { name: 'Nueva', accent: 'purple' },
    })
    expect(rejected.statusCode).toBe(400)

    const accepted = await app.inject({
      method: 'POST',
      url: '/admin/help/categories',
      payload: { name: 'Nueva', accent: 'ia', area: 'blog' },
    })
    expect(accepted.statusCode).toBe(201)
    expect(help.createCategory).toHaveBeenCalledWith({ name: 'Nueva', accent: 'ia', area: 'blog' })
  })

  // Solo comprueba la respuesta y que el servicio no se llama; la guarda
  // `if (reply.sent)` del preHandler no es observable desde aquí.
  it('sin sesión recibe 401 y no llama al servicio', async () => {
    const app = await buildApp(null)

    const response = await app.inject({ method: 'GET', url: '/admin/help/articles' })

    expect(response.statusCode).toBe(401)
    expect(help.listArticles).not.toHaveBeenCalled()
  })

  it('PATCH /articles/:id admite null para vaciar el resumen', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/help/articles/a1',
      payload: { summary: null },
    })

    expect(response.statusCode).toBe(200)
    expect(help.updateArticle).toHaveBeenCalledWith('a1', expect.objectContaining({ summary: null }))
  })

  it('un usuario no admin recibe 403', async () => {
    const app = await buildApp('profesor')

    const response = await app.inject({ method: 'GET', url: '/admin/help/articles' })

    expect(response.statusCode).toBe(403)
    expect(help.listArticles).not.toHaveBeenCalled()
  })
})
