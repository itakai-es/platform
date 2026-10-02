import type { HelpArea } from '~/types/help.types'

/**
 * Lo que cambia entre el centro de ayuda y el blog en la parte pública: dónde
 * cuelgan sus páginas y en qué orden se leen sus artículos.
 *
 * Las dos áreas comparten modelo, API y piezas de pantalla; estas funciones son
 * la única diferencia de rutas y de orden, para que ninguna pieza compartida
 * tenga `/ayuda` o `/blog` escrito a mano.
 */

/** La raíz pública de cada área. */
export function helpBasePath(area: HelpArea = 'ayuda') {
  return area === 'blog' ? '/blog' : '/ayuda'
}

export function helpCategoryPath(area: HelpArea, categorySlug: string) {
  return `${helpBasePath(area)}/${categorySlug}`
}

export function helpArticlePath(area: HelpArea, categorySlug: string, articleSlug: string) {
  return `${helpBasePath(area)}/${categorySlug}/${articleSlug}`
}

interface Dated {
  publishedAt?: string | null
  updatedAt: string
}

/** Lo que ordena una entrada: su publicación o, si nunca ha salido, su última edición. */
function dateOf(item: Dated) {
  return Date.parse(item.publishedAt ?? item.updatedAt) || 0
}

/**
 * Lo más reciente primero, que es como se lee un blog. No toca la lista que
 * recibe y, con la misma fecha, respeta el orden en que llegaron.
 */
export function newestFirst<T extends Dated>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => dateOf(b) - dateOf(a))
}

/**
 * El orden de lectura de cada área: la ayuda sigue el que se fija arrastrando
 * en el panel (el que ya trae la API) y el blog, el cronológico inverso.
 */
export function orderForArea<T extends Dated>(area: HelpArea, items: readonly T[]): T[] {
  return area === 'blog' ? newestFirst(items) : [...items]
}
