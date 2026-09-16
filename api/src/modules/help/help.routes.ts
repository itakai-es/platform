import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import * as help from './help.service.js'
import { NotFoundError } from '../../utils/errors.js'

/**
 * Rutas del centro de ayuda (Fase 3, punto 17).
 *
 * Dos módulos: uno público —el primero de la plataforma que sirve contenido sin
 * sesión— y otro de administración detrás del rol admin.
 */

// ==================== VALIDACIÓN ====================

const audienceEnum = z.enum(['profesor', 'alumno', 'ambos'])
const kindEnum = z.enum(['guia', 'tutorial', 'faq', 'video'])
const areaEnum = z.enum(['ayuda', 'blog'])
const statusEnum = z.enum(['borrador', 'publicado'])
/** Los cuatro acentos que entiende la tarjeta de categoría del frontend. */
const accentEnum = z.enum(['ia', 'stats', 'clases', 'pending'])

/** Devuelve el valor si es uno de los admitidos; cualquier otro se ignora sin error. */
function pickOne<const T extends readonly string[]>(allowed: T, value: unknown): T[number] | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : undefined
}

/**
 * Un parámetro de texto libre, o nada si no es una cadena: con la clave
 * repetida (`?locale=es&locale=en`) Fastify entrega un array, que llegaría a
 * Prisma o a `.trim()` y acabaría en 500.
 */
function str(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

/** Audiencia que se puede pedir desde fuera. `ambos` no se pide: siempre se incluye. */
function parseAudience(query: { audience?: string }) {
  return pickOne(['profesor', 'alumno'] as const, query.audience)
}

function parseArea(query: { area?: string }) {
  return pickOne(areaEnum.options, query.area)
}

// ==================== PÚBLICO ====================

interface PublicQuery {
  locale?: string
  audience?: string
  area?: string
}

export async function publicHelpRoutes(fastify: FastifyInstance) {
  /** Índice completo: categorías con sus artículos y los destacados. */
  fastify.get('/', async (request: FastifyRequest<{ Querystring: PublicQuery }>) => {
    return help.getPublicIndex({
      locale: str(request.query.locale),
      audience: parseAudience(request.query),
      area: parseArea(request.query),
    })
  })

  /** Búsqueda de texto completo. */
  fastify.get(
    '/buscar',
    async (request: FastifyRequest<{ Querystring: PublicQuery & { q?: string } }>) => {
      const results = await help.searchArticles(str(request.query.q) ?? '', {
        locale: str(request.query.locale),
        audience: parseAudience(request.query),
        area: parseArea(request.query),
      })
      return { results, total: results.length }
    }
  )

  /** Un artículo por su ruta legible. */
  fastify.get(
    '/:categorySlug/:articleSlug',
    async (
      request: FastifyRequest<{
        Params: { categorySlug: string; articleSlug: string }
        Querystring: { locale?: string; audience?: string; area?: string }
      }>,
      reply: FastifyReply
    ) => {
      const { categorySlug, articleSlug } = request.params
      const found = await help.getPublicArticle(categorySlug, articleSlug, {
        locale: str(request.query.locale),
        audience: parseAudience(request.query),
        area: parseArea(request.query),
      })

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
  accent: accentEnum.optional(),
  area: areaEnum.optional(),
  orderIndex: z.number().int().min(0).optional(),
})

const articleSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(160),
  /** `null` lo vacía; ausente no lo toca. */
  summary: z.string().max(300).nullable().optional(),
  coverImage: z.string().max(500).nullable().optional(),
  body: z.string().min(1),
  status: statusEnum.optional(),
  featured: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
  audience: audienceEnum.optional(),
  kind: kindEnum.optional(),
  /** `null` la vacía; ausente no la toca. Mismo contrato que `coverImage`. */
  videoUrl: z.string().url().max(500).regex(/^https:\/\//).nullable().optional(),
})

const orderSchema = z.object({ orderedIds: z.array(z.string().uuid()) })

interface AdminArticlesQuery {
  categoryId?: string
  status?: string
  search?: string
  audience?: string
  kind?: string
  area?: string
}

export async function adminHelpRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply)
    if (reply.sent) return
    const user = request.user as { role: string | null }
    if (user.role !== 'admin') {
      return reply.status(403).send({ message: 'Solo los administradores pueden editar la ayuda' })
    }
  })

  // ---- categorías ----

  fastify.get(
    '/categories',
    async (request: FastifyRequest<{ Querystring: { area?: string } }>) => ({
      categories: await help.listCategories(parseArea(request.query)),
    })
  )

  fastify.post('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = categorySchema.parse(request.body)
    return reply.status(201).send({ category: await help.createCategory(data) })
  })

  /** Orden de las categorías en la portada. Va antes de `/categories/:id/order`. */
  fastify.put('/categories/order', async (request: FastifyRequest) => {
    const { orderedIds } = orderSchema.parse(request.body)
    return help.reorderCategories(orderedIds)
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
    async (request: FastifyRequest<{ Querystring: AdminArticlesQuery }>) => {
      return {
        articles: await help.listArticles({
          categoryId: str(request.query.categoryId),
          search: str(request.query.search),
          status: pickOne(statusEnum.options, request.query.status),
          audience: pickOne(audienceEnum.options, request.query.audience),
          kind: pickOne(kindEnum.options, request.query.kind),
          area: parseArea(request.query),
        }),
      }
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

  /** La vista pública de un artículo, esté publicado o no, para revisarlo antes de publicar. */
  fastify.get(
    '/articles/:id/preview',
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const found = await help.getArticlePreview(request.params.id)
      if (!found) throw new NotFoundError('Artículo no encontrado')
      return found
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
      const { orderedIds } = orderSchema.parse(request.body)
      return help.reorderArticles(request.params.id, orderedIds)
    }
  )
}
