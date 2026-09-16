import { randomUUID } from 'crypto'
import { prisma } from '../../config/database.js'
import { saveUpload } from '../storage/storage.service.js'
import { Prisma } from '../../generated/prisma/client.js'
import type {
  HelpArea,
  HelpArticleKind,
  HelpArticleStatus,
  HelpAudience,
} from '../../generated/prisma/client.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'

/**
 * Centro de ayuda (Fase 3, punto 17).
 *
 * Dos superficies sobre el mismo contenido: la pública, que no pide sesión y
 * cuelga de la landing, y la del panel de administración, que escribe.
 *
 * La búsqueda va con el índice de texto de Postgres (`search_vector`, una
 * columna generada con configuración castellana sin tildes). No hace falta
 * ningún servicio externo, que es lo que permite que funcione igual en una
 * instancia auto-hospedada.
 *
 * Cada artículo lleva audiencia (profesorado, alumnado o ambos) y tipo
 * editorial; el área (ayuda o blog) vive en la categoría y los artículos la
 * heredan por relación, así ninguno puede contradecir a la suya.
 */

const DEFAULT_LOCALE = 'es'

/**
 * Slugs que no puede tener una categoría porque son rutas fijas de la ayuda
 * pública (portadas por rol y búsqueda) y taparían a la categoría.
 */
export const RESERVED_CATEGORY_SLUGS = ['profesor', 'alumno', 'blog', 'buscar']

/** Convierte un título en slug: sin tildes, sin signos y con guiones. */
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    // Se recorta antes de limpiar los extremos: si el corte cae en un
    // separador, el slug no puede acabar en guion (ni el sufijo salir `--2`).
    .slice(0, 80)
    .replace(/^-+|-+$/g, '')
}

const ARTICLE_CARD = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  coverImage: true,
  orderIndex: true,
  updatedAt: true,
  audience: true,
  kind: true,
} as const

// ==================== SUPERFICIE PÚBLICA ====================

/** Audiencia que se puede pedir desde fuera. `ambos` no se pide: se incluye siempre. */
export type PublicAudience = 'profesor' | 'alumno'

export interface PublicFilters {
  locale?: string
  audience?: PublicAudience
  area?: HelpArea
}

/** Un artículo para «ambos» sale en las dos portadas, así que entra en cualquier filtro. */
function audienceWhere(audience?: PublicAudience): Prisma.HelpArticleWhereInput {
  return audience ? { audience: { in: [audience, 'ambos'] } } : {}
}

/**
 * Todo lo que necesita la portada de una vez: categorías ordenadas con sus
 * artículos publicados y los destacados. Una sola llamada, porque el índice
 * completo son unos pocos kilobytes y así el buscador puede filtrar por título
 * en el navegador sin ir al servidor en cada tecla.
 *
 * El filtro de audiencia se aplica dentro de los artículos de cada categoría,
 * así el recuento y la ocultación de categorías vacías siguen siendo coherentes.
 */
export async function getPublicIndex(filters: PublicFilters = {}) {
  const { locale = DEFAULT_LOCALE, audience, area = 'ayuda' } = filters
  const articleWhere: Prisma.HelpArticleWhereInput = {
    status: 'publicado',
    locale,
    ...audienceWhere(audience),
  }

  const categories = await prisma.helpCategory.findMany({
    where: { area },
    orderBy: { orderIndex: 'asc' },
    include: {
      articles: {
        where: articleWhere,
        orderBy: { orderIndex: 'asc' },
        select: ARTICLE_CARD,
      },
    },
  })

  const visible = categories
    .filter(category => category.articles.length > 0)
    .map(category => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      icon: category.icon,
      accent: category.accent,
      area: category.area,
      total: category.articles.length,
      articles: category.articles,
    }))

  const featured = await prisma.helpArticle.findMany({
    where: { ...articleWhere, featured: true, category: { area } },
    orderBy: { orderIndex: 'asc' },
    select: {
      ...ARTICLE_CARD,
      category: { select: { slug: true, name: true, icon: true, accent: true } },
    },
  })

  return { categories: visible, featured }
}

type ArticleWithCategory = Prisma.HelpArticleGetPayload<{ include: { category: true } }>
type ArticleCard = Prisma.HelpArticleGetPayload<{ select: typeof ARTICLE_CARD }>

/**
 * Monta la vista de un artículo tal y como la pinta la página pública. La
 * comparten la ruta pública y la previsualización del panel, así que lo que
 * ve quien corrige es exactamente lo que se publicará.
 */
function buildArticleView(article: ArticleWithCategory, siblings: ArticleCard[]) {
  return {
    article: {
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      coverImage: article.coverImage,
      body: article.body,
      updatedAt: article.updatedAt,
      helpful: article.helpful,
      audience: article.audience,
      kind: article.kind,
      videoUrl: article.videoUrl,
    },
    category: {
      slug: article.category.slug,
      name: article.category.name,
      icon: article.category.icon,
      accent: article.category.accent,
      area: article.category.area,
    },
    siblings,
    related: siblings.filter(sibling => sibling.id !== article.id).slice(0, 3),
  }
}

export type HelpArticleView = ReturnType<typeof buildArticleView>

/**
 * Un artículo con lo que necesita su página: hermanos para el lateral y
 * relacionados. Se sirve siempre que esté publicado: un enlace directo nunca
 * da 404 por audiencia. La audiencia solo recorta el lateral, y el propio
 * artículo siempre está en él.
 */
export async function getPublicArticle(
  categorySlug: string,
  articleSlug: string,
  filters: PublicFilters = {}
) {
  const { locale = DEFAULT_LOCALE, audience, area = 'ayuda' } = filters

  // El área filtra como en el índice: un artículo de blog no se sirve por la
  // ruta de ayuda si no se pide su área expresamente.
  const article = await prisma.helpArticle.findFirst({
    where: {
      slug: articleSlug,
      locale,
      status: 'publicado',
      category: { slug: categorySlug, area },
    },
    include: { category: true },
  })

  if (!article) return null

  const siblings = await prisma.helpArticle.findMany({
    where: {
      categoryId: article.categoryId,
      status: 'publicado',
      locale,
      ...(audience ? { OR: [audienceWhere(audience), { id: article.id }] } : {}),
    },
    orderBy: { orderIndex: 'asc' },
    select: ARTICLE_CARD,
  })

  return buildArticleView(article, siblings)
}

interface SearchRow {
  id: string
  slug: string
  title: string
  summary: string | null
  cover_image: string | null
  audience: HelpAudience
  kind: HelpArticleKind
  category_slug: string
  category_name: string
  category_icon: string | null
  category_accent: string
  snippet: string
  rank: number
}

/**
 * Búsqueda de texto completo. `websearch_to_tsquery` entiende lo que la gente
 * escribe de verdad (varias palabras, comillas, `-palabra`) sin petar cuando la
 * consulta está a medio teclear, que es justo lo que pasa mientras se escribe.
 *
 * Área y audiencia viajan como parámetros con su cast al enum de Postgres,
 * nunca interpolados como texto.
 */
export async function searchArticles(query: string, filters: PublicFilters = {}, limit = 12) {
  const term = query.trim()
  if (term.length < 2) return []

  const { locale = DEFAULT_LOCALE, audience, area = 'ayuda' } = filters
  const audienceClause = audience
    ? Prisma.sql`AND a.audience IN (${audience}::"HelpAudience", 'ambos')`
    : Prisma.empty

  const rows = await prisma.$queryRaw<SearchRow[]>`
    SELECT a.id,
           a.slug,
           a.title,
           a.summary,
           a.cover_image,
           a.audience,
           a.kind,
           c.slug AS category_slug,
           c.name AS category_name,
           c.icon AS category_icon,
           c.accent AS category_accent,
           ts_headline(
             'itakai_es'::regconfig,
             a.body,
             websearch_to_tsquery('itakai_es'::regconfig, ${term}),
             'MaxWords=28, MinWords=12, ShortWord=3, MaxFragments=1, StartSel=<em>, StopSel=</em>'
           ) AS snippet,
           ts_rank(a.search_vector, websearch_to_tsquery('itakai_es'::regconfig, ${term})) AS rank
    FROM help_articles a
    JOIN help_categories c ON c.id = a.category_id
    WHERE a.status = 'publicado'
      AND a.locale = ${locale}
      AND c.area = ${area}::"HelpArea"
      ${audienceClause}
      AND a.search_vector @@ websearch_to_tsquery('itakai_es'::regconfig, ${term})
    ORDER BY rank DESC, a.order_index ASC
    LIMIT ${limit}
  `

  return rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverImage: row.cover_image,
    audience: row.audience,
    kind: row.kind,
    snippet: row.snippet,
    category: {
      slug: row.category_slug,
      name: row.category_name,
      icon: row.category_icon,
      accent: row.category_accent,
    },
  }))
}

/** Suma una visita. No bloquea la respuesta ni le importa fallar. */
export async function registerView(articleId: string) {
  await prisma.helpArticle
    .update({ where: { id: articleId }, data: { views: { increment: 1 } } })
    .catch(() => undefined)
}

/** «¿Te ha resultado útil?». Anónimo: solo cuenta, no guarda quién. */
export async function rateArticle(articleId: string, helpful: boolean) {
  const article = await prisma.helpArticle.update({
    where: { id: articleId },
    data: helpful ? { helpful: { increment: 1 } } : { notHelpful: { increment: 1 } },
    select: { helpful: true, notHelpful: true },
  })
  return article
}

// ==================== SUPERFICIE DE ADMINISTRACIÓN ====================

export async function listCategories(area?: HelpArea) {
  const categories = await prisma.helpCategory.findMany({
    where: area ? { area } : {},
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { articles: true } } },
  })

  return categories.map(category => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    icon: category.icon,
    accent: category.accent,
    area: category.area,
    orderIndex: category.orderIndex,
    articles: category._count.articles,
  }))
}

export interface CategoryInput {
  name: string
  description?: string
  icon?: string
  accent?: string
  area?: HelpArea
  orderIndex?: number
}

export async function createCategory(data: CategoryInput) {
  return prisma.helpCategory.create({
    data: {
      slug: await uniqueCategorySlug(slugify(data.name)),
      name: data.name,
      description: data.description,
      icon: data.icon,
      accent: data.accent ?? 'stats',
      area: data.area ?? 'ayuda',
      orderIndex: data.orderIndex ?? (await nextCategoryOrder()),
    },
  })
}

export async function updateCategory(id: string, data: Partial<CategoryInput>) {
  return prisma.helpCategory.update({ where: { id }, data })
}

/** Borra la categoría y, en cascada, sus artículos. La ruta avisa antes. */
export async function deleteCategory(id: string) {
  await prisma.helpCategory.delete({ where: { id } })
  return { success: true }
}

/** Reordena de una tirada las categorías, igual que los artículos dentro de una. */
/**
 * Pares (id, posición) para reordenar con una sola sentencia.
 *
 * Cambiar el orden no es editar: con `update`, Prisma renovaría `updated_at`,
 * que en los artículos es la fecha «Actualizado el…» que ve el público y que con
 * el arrastre del panel cambiaría a cada rato. Por eso se reordena con SQL que
 * solo toca `order_index`.
 */
function orderRows(orderedIds: string[]) {
  return Prisma.join(orderedIds.map((id, index) => Prisma.sql`(${id}, ${index}::int)`))
}

/** `total` es el número de categorías que se han movido de verdad: un id que no existe no cuenta. */
export async function reorderCategories(orderedIds: string[]) {
  const total = orderedIds.length
    ? await prisma.$executeRaw`
      UPDATE "help_categories" AS c SET "order_index" = v.idx
      FROM (VALUES ${orderRows(orderedIds)}) AS v(id, idx)
      WHERE c."id" = v.id`
    : 0
  return { success: true, total }
}

async function nextCategoryOrder() {
  const last = await prisma.helpCategory.findFirst({ orderBy: { orderIndex: 'desc' } })
  return (last?.orderIndex ?? -1) + 1
}

/** Los slugs reservados cuentan como ocupados: una categoría «Profesor» nace como `profesor-2`. */
async function uniqueCategorySlug(base: string) {
  // La raíz de respaldo también vale para los sufijos: un nombre sin letras
  // latinas (solo signos, o en griego) no puede acabar en `-2`.
  const root = base || 'categoria'
  let slug = root
  let n = 2
  while (RESERVED_CATEGORY_SLUGS.includes(slug) || (await prisma.helpCategory.findUnique({ where: { slug } }))) {
    slug = `${root}-${n++}`
  }
  return slug
}

async function uniqueArticleSlug(categoryId: string, locale: string, base: string, ignoreId?: string) {
  const root = base || 'articulo'
  let slug = root
  let n = 2
  for (;;) {
    const existing = await prisma.helpArticle.findFirst({
      where: { categoryId, locale, slug, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    })
    if (!existing) return slug
    slug = `${root}-${n++}`
  }
}

export interface ArticleFilters {
  categoryId?: string
  status?: HelpArticleStatus
  search?: string
  audience?: HelpAudience
  kind?: HelpArticleKind
  area?: HelpArea
}

export async function listArticles(filters: ArticleFilters = {}) {
  const where: Prisma.HelpArticleWhereInput = {}
  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.status) where.status = filters.status
  if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' }
  if (filters.audience) where.audience = filters.audience
  if (filters.kind) where.kind = filters.kind
  if (filters.area) where.category = { area: filters.area }

  const articles = await prisma.helpArticle.findMany({
    where,
    orderBy: [{ category: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      coverImage: true,
      status: true,
      featured: true,
      audience: true,
      kind: true,
      videoUrl: true,
      orderIndex: true,
      views: true,
      helpful: true,
      notHelpful: true,
      updatedAt: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true, area: true } },
    },
  })

  return articles
}

export async function getArticleById(id: string) {
  return prisma.helpArticle.findUnique({ where: { id }, include: { category: true } })
}

/**
 * La misma vista que la página pública, sin exigir que esté publicado: es lo
 * que ve quien corrige un borrador desde el panel. Los hermanos son los
 * publicados de su categoría más él mismo. No cuenta como visita.
 */
export async function getArticlePreview(id: string) {
  const article = await prisma.helpArticle.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!article) return null

  const siblings = await prisma.helpArticle.findMany({
    where: {
      categoryId: article.categoryId,
      locale: article.locale,
      OR: [{ status: 'publicado' }, { id }],
    },
    orderBy: { orderIndex: 'asc' },
    select: ARTICLE_CARD,
  })

  return buildArticleView(article, siblings)
}

export interface ArticleInput {
  categoryId: string
  title: string
  /** `null` lo vacía; ausente no lo toca. */
  summary?: string | null
  /** URL de la portada, tal y como la devuelve la capa de almacenamiento. */
  coverImage?: string | null
  body: string
  status?: HelpArticleStatus
  featured?: boolean
  orderIndex?: number
  locale?: string
  audience?: HelpAudience
  kind?: HelpArticleKind
  /** Solo se guarda si el tipo es vídeo; para el resto se vacía. */
  videoUrl?: string | null
}

/**
 * La URL de vídeo que se guarda dado el estado final del artículo: vacía si
 * no es un vídeo, y obligatoria para publicar uno. Un vídeo en borrador puede
 * esperar sin URL a que el vídeo esté listo.
 */
function videoUrlFor(kind: HelpArticleKind, status: HelpArticleStatus, videoUrl: string | null) {
  if (kind !== 'video') return null
  if (status === 'publicado' && !videoUrl) {
    throw new ValidationError(
      'Un artículo de tipo vídeo necesita la URL del vídeo para publicarse',
      'HELP_VIDEO_URL_REQUIRED'
    )
  }
  return videoUrl
}

export async function createArticle(data: ArticleInput) {
  const locale = data.locale ?? DEFAULT_LOCALE
  const status = data.status ?? 'borrador'
  const kind = data.kind ?? 'guia'
  const videoUrl = videoUrlFor(kind, status, data.videoUrl ?? null)

  return prisma.helpArticle.create({
    data: {
      categoryId: data.categoryId,
      slug: await uniqueArticleSlug(data.categoryId, locale, slugify(data.title)),
      title: data.title,
      summary: data.summary,
      coverImage: data.coverImage ?? null,
      body: data.body,
      locale,
      status,
      featured: data.featured ?? false,
      audience: data.audience ?? 'profesor',
      kind,
      videoUrl,
      orderIndex: data.orderIndex ?? (await nextArticleOrder(data.categoryId)),
      publishedAt: status === 'publicado' ? new Date() : null,
    },
  })
}

export async function updateArticle(id: string, data: Partial<ArticleInput>) {
  const current = await prisma.helpArticle.findUnique({ where: { id } })
  if (!current) throw new NotFoundError('Artículo no encontrado')

  const categoryId = data.categoryId ?? current.categoryId

  // La regla del vídeo se evalúa sobre el estado fusionado: también salta al
  // publicar desde el listado, cuando solo cambia el estado.
  const kind = data.kind ?? current.kind
  const status = data.status ?? current.status
  const videoUrl = videoUrlFor(
    kind,
    status,
    data.videoUrl === undefined ? current.videoUrl : data.videoUrl
  )

  const patch: Prisma.HelpArticleUpdateInput = {
    title: data.title,
    summary: data.summary,
    coverImage: data.coverImage,
    body: data.body,
    featured: data.featured,
    orderIndex: data.orderIndex,
    audience: data.audience,
    kind: data.kind,
    videoUrl,
  }

  const categoryChanged = Boolean(data.categoryId && data.categoryId !== current.categoryId)
  if (categoryChanged) {
    patch.category = { connect: { id: data.categoryId } }
  }

  // El slug sigue al título mientras el artículo no se haya publicado nunca
  // (`publishedAt` vacío: un retirado lo conserva). Una vez publicado se queda
  // quieto, cambiarlo rompería los enlaces que ya circulan. La excepción es el
  // cambio de categoría: la URL pública lleva la categoría, así que el enlace
  // viejo se rompe igual y solo hace falta que el slug siga libre en la nueva
  // (se mantiene si lo está; si no, recibe sufijo). Un sufijo que puso el
  // sistema por choque (`<slug del título>-N` mientras la raíz sigue ocupada en
  // la categoría de origen) se retira al mover, para que el artículo recupere
  // su slug si vuelve a una categoría donde está libre.
  const retitled = Boolean(data.title && !current.publishedAt)
  if (retitled || categoryChanged) {
    const base = retitled ? slugify(data.title as string) : await movedSlugBase(current)
    patch.slug = await uniqueArticleSlug(categoryId, current.locale, base, id)
  }

  // Al cambiar de categoría, el orden que traía no significa nada en la nueva
  // (cada una numera desde 0): pasa al final, como un artículo recién creado.
  // Va después del slug para no intercalar consultas en su búsqueda.
  if (categoryChanged && data.orderIndex === undefined) {
    patch.orderIndex = await nextArticleOrder(categoryId)
  }

  if (data.status && data.status !== current.status) {
    patch.status = data.status
    if (data.status === 'publicado' && !current.publishedAt) patch.publishedAt = new Date()
  }

  return prisma.helpArticle.update({ where: { id }, data: patch, include: { category: true } })
}

/**
 * Raíz del slug de un artículo que cambia de categoría sin cambiar de título.
 * Solo se recorta un `-N` final si vino de un choque: la raíz tiene que estar
 * ocupada por otro artículo en la categoría de origen. Si no, el número es
 * parte del slug (p. ej. un título viejo «Guía 2026» retitulado a «Guía») y
 * se conserva.
 */
async function movedSlugBase(current: { id: string; slug: string; title: string; categoryId: string; locale: string }) {
  // Misma raíz de respaldo que uniqueArticleSlug; el slug solo lleva [a-z0-9-].
  const root = slugify(current.title) || 'articulo'
  if (!new RegExp(`^${root}-\\d+$`).test(current.slug)) return current.slug
  const clash = await prisma.helpArticle.findFirst({
    where: { categoryId: current.categoryId, locale: current.locale, slug: root, NOT: { id: current.id } },
    select: { id: true },
  })
  return clash ? root : current.slug
}

export async function deleteArticle(id: string) {
  await prisma.helpArticle.delete({ where: { id } })
  return { success: true }
}

/** Reordena de una tirada los artículos de una categoría. */
/**
 * Solo mueve artículos de esa categoría: un id de otra se ignora y no cuenta en
 * `total`, que es el número de artículos movidos. Ver `orderRows`.
 */
export async function reorderArticles(categoryId: string, orderedIds: string[]) {
  if (!orderedIds.length) return { success: true, categoryId, total: 0 }
  const total = await prisma.$executeRaw`
    UPDATE "help_articles" AS a SET "order_index" = v.idx
    FROM (VALUES ${orderRows(orderedIds)}) AS v(id, idx)
    WHERE a."id" = v.id AND a."category_id" = ${categoryId}`
  if (total === 0) {
    const category = await prisma.helpCategory.findUnique({ where: { id: categoryId }, select: { id: true } })
    if (!category) throw new NotFoundError('Categoría no encontrada')
  }
  return { success: true, categoryId, total }
}

async function nextArticleOrder(categoryId: string) {
  const last = await prisma.helpArticle.findFirst({
    where: { categoryId },
    orderBy: { orderIndex: 'desc' },
  })
  return (last?.orderIndex ?? -1) + 1
}

/**
 * Guarda una imagen del centro de ayuda y devuelve su URL pública.
 *
 * Pasa por `saveUpload` como el resto de subidas de la plataforma, así que en
 * una instancia con R2 configurado va al bucket y en una local al disco, sin
 * tocar nada aquí. Acepta el `data:` URL que produce el navegador al leer el
 * fichero, que es como suben imágenes las demás pantallas.
 */
export async function saveHelpImage(dataUrl: string) {
  const matches = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(dataUrl)
  if (!matches) throw new Error('Formato de imagen no admitido')

  const [, mime, payload] = matches
  const extensions: Record<string, string> = {
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpg',
    webp: 'webp',
    gif: 'gif',
  }

  const buffer = Buffer.from(payload, 'base64')
  return saveUpload(`help/${randomUUID()}.${extensions[mime]}`, buffer, `image/${mime}`)
}
