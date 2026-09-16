/**
 * Centro de ayuda (Fase 3, punto 17).
 *
 * El contenido es público: estos tipos describen lo que devuelve
 * `/public/help`, que no pide sesión.
 */

/** A quién va dirigido un artículo. Decide en qué portada aparece. */
export type HelpAudience = 'profesor' | 'alumno' | 'ambos'

/** Qué clase de contenido es: la guía es lo normal y no se etiqueta. */
export type HelpArticleKind = 'guia' | 'tutorial' | 'faq' | 'video'

/** Área a la que pertenece una categoría: el centro de ayuda o el blog. */
export type HelpArea = 'ayuda' | 'blog'

/**
 * La portada que se está mirando: toda la ayuda o la de un rol. Lo fijan las
 * portadas al montarse y la página de artículo lo infiere de su audiencia.
 */
export type HelpScope = 'todo' | 'profesor' | 'alumno'

export interface HelpArticleCard {
  id: string
  slug: string
  title: string
  summary: string | null
  /** Portada del artículo, si tiene: se usa como miniatura en los listados. */
  coverImage: string | null
  orderIndex: number
  updatedAt: string
  audience: HelpAudience
  kind: HelpArticleKind
}

export interface HelpCategory {
  slug: string
  name: string
  description: string | null
  icon: string | null
  /** Tipo de `Card` del sistema de diseño: ia, stats, clases o pending. */
  accent: string
  area: HelpArea
  total: number
  articles: HelpArticleCard[]
}

/** La categoría, tal y como la necesita una fila de listado: nombre, icono y color. */
export type HelpCategoryRef = Pick<HelpCategory, 'slug' | 'name' | 'icon' | 'accent'> & {
  area?: HelpArea
}

export interface HelpFeaturedArticle extends HelpArticleCard {
  category: HelpCategoryRef
}

export interface HelpIndex {
  categories: HelpCategory[]
  featured: HelpFeaturedArticle[]
}

export interface HelpArticle {
  id: string
  slug: string
  title: string
  summary: string | null
  coverImage: string | null
  body: string
  updatedAt: string
  helpful: number
  audience: HelpAudience
  kind: HelpArticleKind
  /** Solo los artículos de tipo vídeo la tienen; se incrusta, no se sube. */
  videoUrl: string | null
}

export interface HelpArticleView {
  article: HelpArticle
  category: HelpCategoryRef
  siblings: HelpArticleCard[]
  related: HelpArticleCard[]
}

export interface HelpSearchResult {
  id: string
  slug: string
  title: string
  summary: string | null
  coverImage: string | null
  /** Fragmento del cuerpo con los términos marcados en `<em>`. */
  snippet: string
  audience: HelpAudience
  kind: HelpArticleKind
  category: HelpCategoryRef
}
