import type { HelpArticleView, HelpIndex, HelpSearchResult } from '~/types/help.types'

/**
 * useHelp — contenido del centro de ayuda (Fase 3, punto 17).
 *
 * No pasa por el store de autenticación a propósito: estas páginas cuelgan de
 * la landing y tienen que funcionar sin sesión.
 *
 * El índice completo se pide una sola vez y se guarda en `useState`: son unos
 * pocos kilobytes y con él en memoria el buscador filtra por título sin ir al
 * servidor en cada tecla. La búsqueda de verdad —la de Postgres, con raíces y
 * sin tildes— se reserva para cuando el usuario deja de escribir.
 */
export function useHelp() {
  const config = useRuntimeConfig()
  const base = `${config.public.apiBase}/public/help`

  const index = useState<HelpIndex | null>('help-index', () => null)
  const loadingIndex = useState<boolean>('help-index-loading', () => false)

  /** Carga el índice si no está ya. Idempotente. */
  const ensureIndex = async () => {
    if (index.value || loadingIndex.value) return index.value
    loadingIndex.value = true
    try {
      index.value = await $fetch<HelpIndex>(base)
    } catch (error) {
      console.error('[ayuda] no se pudo cargar el índice:', error)
      index.value = { categories: [], featured: [] }
    } finally {
      loadingIndex.value = false
    }
    return index.value
  }

  const getCategory = (slug: string) =>
    index.value?.categories.find(category => category.slug === slug) ?? null

  const fetchArticle = (categorySlug: string, articleSlug: string) =>
    $fetch<HelpArticleView>(`${base}/${categorySlug}/${articleSlug}`)

  const search = (query: string) =>
    $fetch<{ results: HelpSearchResult[]; total: number }>(`${base}/buscar`, {
      params: { q: query },
    })

  /** «¿Te ha resultado útil?». No devuelve error al usuario si falla. */
  const rate = (articleId: string, helpful: boolean) =>
    $fetch(`${base}/${articleId}/util`, { method: 'POST', body: { helpful } }).catch(() => null)

  /**
   * Todos los artículos en una lista plana, para filtrar por título nada más
   * teclear, mientras el servidor no ha contestado todavía.
   */
  const allArticles = computed(() =>
    (index.value?.categories ?? []).flatMap(category =>
      category.articles.map(article => ({
        ...article,
        category: {
          slug: category.slug,
          name: category.name,
          icon: category.icon,
          accent: category.accent,
        },
      }))
    )
  )

  return { index, loadingIndex, ensureIndex, getCategory, fetchArticle, search, rate, allArticles }
}

/**
 * Prepara el fragmento que devuelve `ts_headline` para pintarlo.
 *
 * Viene del markdown en bruto del artículo, así que trae asteriscos y
 * almohadillas que en un resultado de búsqueda solo estorban. Y como acaba en
 * un `v-html`, **se escapa todo primero** y solo se devuelven al HTML las
 * marcas `<em>` con las que Postgres señala los términos encontrados: aunque
 * hoy solo escriban administradores, un fragmento de artículo no tiene por qué
 * poder inyectar etiquetas.
 */
// Marcadores temporales del área de uso privado de Unicode: no aparecen en
// ningún texto real y sobreviven a la limpieza de markdown de más abajo.
const EM_OPEN = '\uE000'
const EM_CLOSE = '\uE001'

export function cleanSnippet(snippet: string) {
  return snippet
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;em&gt;/g, EM_OPEN)
    .replace(/&lt;\/em&gt;/g, EM_CLOSE)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#]/g, '')
    .replace(/&gt;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replaceAll(EM_OPEN, '<em>')
    .replaceAll(EM_CLOSE, '</em>')
}
