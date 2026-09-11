import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import * as help from './help.service.js'

/**
 * Rutas del centro de ayuda (Fase 3, punto 17).
 *
 * Dos módulos: uno público —el primero de la plataforma que sirve contenido sin
 * sesión— y otro de administración detrás del rol admin.
 */

// ==================== PÚBLICO ====================

export async function publicHelpRoutes(fastify: FastifyInstance) {
  /** Índice completo: categorías con sus artículos y los destacados. */
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { locale?: string } }>) => {
    return help.getPublicIndex(request.query.locale)
  })

  /** Búsqueda de texto completo. */
  fastify.get(
    '/buscar',
    async (request: FastifyRequest<{ Querystring: { q?: string; locale?: string } }>) => {
      const results = await help.searchArticles(request.query.q ?? '', request.query.locale)
      return { results, total: results.length }
    }
  )

  /** Un artículo por su ruta legible. */
  fastify.get(
    '/:categorySlug/:articleSlug',
    async (
      request: FastifyRequest<{
        Params: { categorySlug: string; articleSlug: string }
        Querystring: { locale?: string }
      }>,
      reply: FastifyReply
    ) => {
      const { categorySlug, articleSlug } = request.params
      const found = await help.getPublicArticle(categorySlug, articleSlug, request.query.locale)

      if (!found) return reply.status(404).send({ message: 'Artículo no encontrado' })

      // La visita no bloquea la respuesta: si falla, el lector no se entera.
      void help.registerView(found.article.id)

      return found
    }
  )

  /** «¿Te ha resultado útil?». Anónimo a propósito. */
  fastify.post(
    '/:articleId/util',
    async (
      request: FastifyRequest<{ Params: { articleId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const { helpful } = z.object({ helpful: z.boolean() }).parse(request.body)
      try {
        const counters = await help.rateArticle(request.params.articleId, helpful)
        return { success: true, ...counters }
      } catch {
        return reply.status(404).send({ message: 'Artículo no encontrado' })
      }
    }
  )
}

// ==================== ADMINISTRACIÓN ====================

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  icon: z.string().max(40).optional(),
  accent: z.string().max(24).optional(),
  orderIndex: z.number().int().min(0).optional(),
})

const articleSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(160),
  summary: z.string().max(300).optional(),
  coverImage: z.string().max(500).nullable().optional(),
  body: z.string().min(1),
  status: z.enum(['borrador', 'publicado']).optional(),
  featured: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export async function adminHelpRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply)
    const user = request.user as { role: string | null }
    if (user.role !== 'admin') {
      return reply.status(403).send({ message: 'Solo los administradores pueden editar la ayuda' })
    }
  })

  // ---- categorías ----

  fastify.get('/categories', async () => ({ categories: await help.listCategories() }))

  fastify.post('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = categorySchema.parse(request.body)
    return reply.status(201).send({ category: await help.createCategory(data) })
  })

  fastify.patch(
    '/categories/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const data = categorySchema.partial().parse(request.body)
      return { category: await help.updateCategory(request.params.id, data) }
    }
  )

  fastify.delete(
    '/categories/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      return help.deleteCategory(request.params.id)
    }
  )

  // ---- artículos ----

  fastify.get(
    '/articles',
    async (
      request: FastifyRequest<{
        Querystring: { categoryId?: string; status?: 'borrador' | 'publicado'; search?: string }
      }>
    ) => {
      const { categoryId, status, search } = request.query
      return { articles: await help.listArticles({ categoryId, status, search }) }
    }
  )

  fastify.get(
    '/articles/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const article = await help.getArticleById(request.params.id)
      if (!article) return reply.status(404).send({ message: 'Artículo no encontrado' })
      return { article }
    }
  )

  fastify.post('/articles', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = articleSchema.parse(request.body)
    return reply.status(201).send({ article: await help.createArticle(data) })
  })

  fastify.patch('/articles/:id', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const data = articleSchema.partial().parse(request.body)
    return { article: await help.updateArticle(request.params.id, data) }
  })

  fastify.delete('/articles/:id', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    return help.deleteArticle(request.params.id)
  })

  // ---- imágenes ----

  /**
   * Sube una imagen para un artículo (portada o ilustración del cuerpo) y
   * devuelve su URL. El navegador manda el fichero ya leído como `data:` URL,
   * igual que en las portadas de misión y las insignias.
   */
  fastify.post('/imagenes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { image } = z.object({ image: z.string().min(1).max(8_000_000) }).parse(request.body)
    try {
      return { url: await help.saveHelpImage(image) }
    } catch {
      return reply.status(400).send({ message: 'Formato de imagen no admitido' })
    }
  })

  fastify.put(
    '/categories/:id/order',
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const { orderedIds } = z.object({ orderedIds: z.array(z.string().uuid()) }).parse(request.body)
      return help.reorderArticles(request.params.id, orderedIds)
    }
  )
}
