/**
 * Centro de ayuda (Fase 3, punto 17).
 *
 * El contenido es público: estos tipos describen lo que devuelve
 * `/public/help`, que no pide sesión.
 */

export interface HelpArticleCard {
  id: string
  slug: string
  title: string
  summary: string | null
  /** Portada del artículo, si tiene: se usa como miniatura en los listados. */
  coverImage: string | null
  orderIndex: number
  updatedAt: string
}

export interface HelpCategory {
  slug: string
  name: string
  description: string | null
  icon: string | null
  /** Token de color del sistema de diseño: purple, yellow, mint, sky… */
  accent: string
  total: number
  articles: HelpArticleCard[]
}

/** La categoría, tal y como la necesita una fila de listado: nombre, icono y color. */
export type HelpCategoryRef = Pick<HelpCategory, 'slug' | 'name' | 'icon' | 'accent'>

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
  category: HelpCategoryRef
}
