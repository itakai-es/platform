import { randomUUID } from 'crypto'
import { prisma } from '../../config/database.js'
import { saveUpload } from '../storage/storage.service.js'
import type { HelpArticleStatus, Prisma } from '../../generated/prisma/client.js'

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
 */

const DEFAULT_LOCALE = 'es'

/** Convierte un título en slug: sin tildes, sin signos y con guiones. */
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const ARTICLE_CARD = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  coverImage: true,
  orderIndex: true,
  updatedAt: true,
} as const

// ==================== SUPERFICIE PÚBLICA ====================

/**
 * Todo lo que necesita la portada de una vez: categorías ordenadas con sus
 * artículos publicados y los destacados. Una sola llamada, porque el índice
 * completo son unos pocos kilobytes y así el buscador puede filtrar por título
 * en el navegador sin ir al servidor en cada tecla.
 */
export async function getPublicIndex(locale: string = DEFAULT_LOCALE) {
  const categories = await prisma.helpCategory.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      articles: {
        where: { status: 'publicado', locale },
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
      total: category.articles.length,
      articles: category.articles,
    }))

  const featured = await prisma.helpArticle.findMany({
    where: { status: 'publicado', locale, featured: true },
    orderBy: { orderIndex: 'asc' },
    select: {
      ...ARTICLE_CARD,
      category: { select: { slug: true, name: true, icon: true, accent: true } },
    },
  })

  return { categories: visible, featured }
}

/** Un artículo con lo que necesita su página: hermanos para el lateral y relacionados. */
export async function getPublicArticle(
  categorySlug: string,
  articleSlug: string,
  locale: string = DEFAULT_LOCALE
) {
  const article = await prisma.helpArticle.findFirst({
    where: {
      slug: articleSlug,
      locale,
      status: 'publicado',
      category: { slug: categorySlug },
    },
    include: { category: true },
  })

  if (!article) return null

  const siblings = await prisma.helpArticle.findMany({
    where: { categoryId: article.categoryId, status: 'publicado', locale },
    orderBy: { orderIndex: 'asc' },
    select: ARTICLE_CARD,
  })

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
    },
    category: {
      slug: article.category.slug,
      name: article.category.name,
      icon: article.category.icon,
      accent: article.category.accent,
    },
    siblings,
    related: siblings.filter(sibling => sibling.id !== article.id).slice(0, 3),
  }
}

interface SearchRow {
  id: string
  slug: string
  title: string
  summary: string | null
  cover_image: string | null
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
 */
export async function searchArticles(query: string, locale: string = DEFAULT_LOCALE, limit = 12) {
  const term = query.trim()
  if (term.length < 2) return []

  const rows = await prisma.$queryRaw<SearchRow[]>`
    SELECT a.id,
           a.slug,
           a.title,
           a.summary,
           a.cover_image,
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

export async function listCategories() {
  const categories = await prisma.helpCategory.findMany({
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
    orderIndex: category.orderIndex,
    articles: category._count.articles,
  }))
}

export interface CategoryInput {
  name: string
  description?: string
  icon?: string
  accent?: string
  orderIndex?: number
}

export async function createCategory(data: CategoryInput) {
  return prisma.helpCategory.create({
    data: {
      slug: await uniqueCategorySlug(slugify(data.name)),
      name: data.name,
      description: data.description,
      icon: data.icon,
      accent: data.accent ?? 'purple',
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

async function nextCategoryOrder() {
  const last = await prisma.helpCategory.findFirst({ orderBy: { orderIndex: 'desc' } })
  return (last?.orderIndex ?? -1) + 1
}

async function uniqueCategorySlug(base: string) {
  let slug = base || 'categoria'
  let n = 2
  while (await prisma.helpCategory.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`
  }
  return slug
}

async function uniqueArticleSlug(categoryId: string, locale: string, base: string, ignoreId?: string) {
  let slug = base || 'articulo'
  let n = 2
  for (;;) {
    const existing = await prisma.helpArticle.findFirst({
      where: { categoryId, locale, slug, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    })
    if (!existing) return slug
    slug = `${base}-${n++}`
  }
}

export async function listArticles(filters: { categoryId?: string; status?: HelpArticleStatus; search?: string } = {}) {
  const where: Prisma.HelpArticleWhereInput = {}
  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.status) where.status = filters.status
  if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' }

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
      orderIndex: true,
      views: true,
      helpful: true,
      notHelpful: true,
      updatedAt: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  })

  return articles
}

export async function getArticleById(id: string) {
  return prisma.helpArticle.findUnique({ where: { id }, include: { category: true } })
}

export interface ArticleInput {
  categoryId: string
  title: string
  summary?: string
  /** URL de la portada, tal y como la devuelve la capa de almacenamiento. */
  coverImage?: string | null
  body: string
  status?: HelpArticleStatus
  featured?: boolean
  orderIndex?: number
  locale?: string
}

export async function createArticle(data: ArticleInput) {
  const locale = data.locale ?? DEFAULT_LOCALE
  return prisma.helpArticle.create({
    data: {
      categoryId: data.categoryId,
      slug: await uniqueArticleSlug(data.categoryId, locale, slugify(data.title)),
      title: data.title,
      summary: data.summary,
      coverImage: data.coverImage ?? null,
      body: data.body,
      locale,
      status: data.status ?? 'borrador',
      featured: data.featured ?? false,
      orderIndex: data.orderIndex ?? (await nextArticleOrder(data.categoryId)),
      publishedAt: data.status === 'publicado' ? new Date() : null,
    },
  })
}

export async function updateArticle(id: string, data: Partial<ArticleInput>) {
  const current = await prisma.helpArticle.findUnique({ where: { id } })
  if (!current) throw new Error('Artículo no encontrado')

  const categoryId = data.categoryId ?? current.categoryId
  const patch: Prisma.HelpArticleUpdateInput = {
    title: data.title,
    summary: data.summary,
    coverImage: data.coverImage,
    body: data.body,
    featured: data.featured,
    orderIndex: data.orderIndex,
  }

  if (data.categoryId && data.categoryId !== current.categoryId) {
    patch.category = { connect: { id: data.categoryId } }
  }

  // El slug sigue al título mientras el artículo esté en borrador. Una vez
  // publicado se queda quieto: cambiarlo rompería los enlaces que ya circulan.
  if (data.title && current.status === 'borrador') {
    patch.slug = await uniqueArticleSlug(categoryId, current.locale, slugify(data.title), id)
  }

  if (data.status && data.status !== current.status) {
    patch.status = data.status
    if (data.status === 'publicado' && !current.publishedAt) patch.publishedAt = new Date()
  }

  return prisma.helpArticle.update({ where: { id }, data: patch, include: { category: true } })
}

export async function deleteArticle(id: string) {
  await prisma.helpArticle.delete({ where: { id } })
  return { success: true }
}

/** Reordena de una tirada los artículos de una categoría. */
export async function reorderArticles(categoryId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.helpArticle.update({ where: { id }, data: { orderIndex: index } })
    )
  )
  return { success: true, categoryId, total: orderedIds.length }
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
  const matches = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,(.+)$/.exec(dataUrl)
  if (!matches) throw new Error('Formato de imagen no admitido')

  const [, mime, payload] = matches
  const extensions: Record<string, string> = {
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpg',
    webp: 'webp',
    gif: 'gif',
    'svg+xml': 'svg',
  }

  const buffer = Buffer.from(payload, 'base64')
  return saveUpload(`help/${randomUUID()}.${extensions[mime]}`, buffer, `image/${mime}`)
}
