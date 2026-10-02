import type { FastifyInstance, FastifyRequest } from 'fastify'
import * as templates from './templates.service.js'
import { pickOne, str } from '../../utils/query-params.js'
import { consumeRateLimit } from '../../utils/rate-limit.js'
import { rateLimitOrigin } from '../../utils/trust-proxy.js'

/**
 * Catálogo público de plantillas: se consulta sin sesión, para que el enlace a
 * una plantilla se abra sin cuenta. Cuelga de `/public` a propósito: como la
 * ayuda, sigue visible con la plataforma en mantenimiento.
 */

/**
 * Peticiones por origen (la IP, o el /64 de una IPv6) y por ruta cada cinco
 * minutos. Quien mira el catálogo hace unas pocas por minuto (cada filtro o
 * página es una), pero un centro educativo sale entero a internet por la misma
 * dirección: con 300 caben un claustro mirando a la vez y una ráfaga de clics,
 * y un script que recorra el catálogo en bucle se corta enseguida. Como todo
 * límite en memoria, no frena un ataque repartido (ver utils/rate-limit.ts).
 */
export const PUBLIC_TEMPLATES_LIMIT = { max: 300, windowMs: 5 * 60 * 1000 }

/** Plantillas por página si no se pide otra cosa: llena la rejilla de 1, 2, 3 o 4 columnas. */
export const PUBLIC_TEMPLATES_PAGE_SIZE = 12
/** Más de esto no se sirve en una página: se recorta en vez de fallar. */
export const PUBLIC_TEMPLATES_MAX_PAGE_SIZE = 48
/** Última página que se puede pedir: más allá, el salto no cabe en la consulta. */
const MAX_PAGE = 10_000

/**
 * De cada filtro se leen como mucho tantos valores y de este largo, holgados
 * para las listas cerradas del frontend (la más larga, las asignaturas de todos
 * los niveles, no llega a 80; ningún valor pasa de 50 caracteres).
 */
const MAX_FILTER_VALUES = 100
const MAX_FILTER_LENGTH = 120
const MAX_SEARCH_LENGTH = 100

interface PublicTemplatesQuery {
  subject?: unknown
  educationLevel?: unknown
  language?: unknown
  province?: unknown
  q?: unknown
  sort?: unknown
  page?: unknown
  limit?: unknown
}

/**
 * Los valores de un filtro de metadato. Los filtros del catálogo son de
 * selección múltiple: se repite la clave (`?subject=Física&subject=Química`) y
 * Fastify la entrega como array, que aquí sí se acepta. No van separados por
 * comas porque hay asignaturas que las llevan («Madera, Mueble y Corcho»). Lo
 * que no es texto se ignora sin error, como en el resto de la consulta.
 */
function strList(value: unknown): string[] | undefined {
  const values = (Array.isArray(value) ? value : [value])
    .map(item => str(item)?.trim())
    .filter((item): item is string => !!item && item.length <= MAX_FILTER_LENGTH)
    .slice(0, MAX_FILTER_VALUES)
  return values.length > 0 ? values : undefined
}

/** Lo que se busca, recortado. Cómo se busca lo dice `listPublicTemplates`. */
function searchTerm(value: unknown) {
  return str(value)?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined
}

/**
 * Página pedida (desde 1) y tamaño, ya dentro de límites: lo que pasa de ellos
 * se recorta y lo que no es un número cuenta como no puesto.
 */
function pageOf(query: PublicTemplatesQuery) {
  const int = (value: unknown) => Number.parseInt(str(value) ?? '', 10)
  const page = Math.min(MAX_PAGE, Math.max(1, int(query.page) || 1))
  const limit = Math.min(
    PUBLIC_TEMPLATES_MAX_PAGE_SIZE,
    Math.max(1, int(query.limit) || PUBLIC_TEMPLATES_PAGE_SIZE)
  )
  return { page, limit }
}

export async function publicTemplateRoutes(fastify: FastifyInstance) {
  /** El catálogo: las plantillas disponibles, filtradas, ordenadas y por páginas. */
  fastify.get('/', async (request: FastifyRequest<{ Querystring: PublicTemplatesQuery }>) => {
    consumeRateLimit(`public-templates:list:${rateLimitOrigin(request.ip)}`, PUBLIC_TEMPLATES_LIMIT)
    const { query } = request
    return templates.listPublicTemplates(
      {
        subject: strList(query.subject),
        educationLevel: strList(query.educationLevel),
        language: strList(query.language),
        province: strList(query.province),
        q: searchTerm(query.q),
      },
      { sort: pickOne(templates.TEMPLATE_SORTS, query.sort), ...pageOf(query) }
    )
  })

  /** La ficha de una plantilla: adonde lleva un enlace compartido. */
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    consumeRateLimit(
      `public-templates:detail:${rateLimitOrigin(request.ip)}`,
      PUBLIC_TEMPLATES_LIMIT
    )
    return templates.getPublicTemplate(request.params.id)
  })
}
