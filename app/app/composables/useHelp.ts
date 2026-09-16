import type {
  HelpArticleView,
  HelpAudience,
  HelpCategory,
  HelpIndex,
  HelpScope,
  HelpSearchResult,
} from '~/types/help.types'

/**
 * useHelp — contenido del centro de ayuda (Fase 3, punto 17).
 *
 * Estas páginas cuelgan de la landing y tienen que funcionar sin sesión: del
 * store de autenticación solo se lee el rol, y solo para elegir una portada por
 * defecto cuando un artículo vale para los dos; sin sesión ese rol es null.
 *
 * El índice completo se pide una sola vez y se guarda en `useState`: son unos
 * pocos kilobytes y con él en memoria el buscador filtra por título sin ir al
 * servidor en cada tecla. La búsqueda de verdad —la de Postgres, con raíces y
 * sin tildes— se reserva para cuando el usuario deja de escribir.
 *
 * Las portadas por rol no vuelven a pedir nada: el mismo índice se filtra en
 * memoria según el `scope` activo, así que cambiar de portada es instantáneo.
 */
export function useHelp() {
  const config = useRuntimeConfig()
  const base = `${config.public.apiBase}/public/help`

  const index = useState<HelpIndex | null>('help-index', () => null)
  const loadingIndex = useState<boolean>('help-index-loading', () => false)

  /** La portada activa: toda la ayuda, la del profesorado o la del alumnado. */
  const scope = useState<HelpScope>('help-scope', () => 'todo')
  /**
   * Si la portada la ha fijado una portada o el selector. «Toda la ayuda»
   * elegida a mano y «sin elegir» valen igual `'todo'`; esto las distingue.
   */
  const scopeChosen = useState<boolean>('help-scope-chosen', () => false)

  const setScope = (value: HelpScope) => {
    scope.value = value
    scopeChosen.value = true
  }

  /** La ruta de la portada de cada ámbito, para migas y selector. */
  const portalPath = (value: HelpScope) => (value === 'todo' ? '/ayuda' : `/ayuda/${value}`)

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

  /** Si un artículo entra en la portada activa. Los de «ambos» salen en todas. */
  const inScope = (audience: HelpAudience) =>
    scope.value === 'todo' || audience === scope.value || audience === 'ambos'

  /**
   * Las categorías de la portada activa, con solo sus artículos y el total
   * recalculado; las que se quedan vacías no se pintan. El total del servidor
   * cuenta todos los artículos publicados, así que aquí no sirve.
   */
  const categories = computed<HelpCategory[]>(() =>
    (index.value?.categories ?? [])
      .map(category => {
        const articles = category.articles.filter(article => inScope(article.audience))
        return { ...category, articles, total: articles.length }
      })
      .filter(category => category.articles.length > 0)
  )

  const featured = computed(() =>
    (index.value?.featured ?? []).filter(article => inScope(article.audience))
  )

  /**
   * La categoría de una URL, filtrada por la portada activa. Si en esta portada
   * no tiene nada pero sí existe en el índice completo, se devuelve completa:
   * un enlace directo a una categoría siempre tiene que abrir.
   */
  const getCategory = (slug: string) =>
    categories.value.find(category => category.slug === slug) ??
    index.value?.categories.find(category => category.slug === slug) ??
    null

  /** Los parámetros de audiencia que se mandan al servidor, salvo en «todo». */
  const audienceParams = () => (scope.value === 'todo' ? {} : { audience: scope.value })

  const fetchArticle = (categorySlug: string, articleSlug: string) =>
    $fetch<HelpArticleView>(`${base}/${categorySlug}/${articleSlug}`, {
      params: audienceParams(),
    })

  const search = (query: string) =>
    $fetch<{ results: HelpSearchResult[]; total: number }>(`${base}/buscar`, {
      params: { q: query, ...audienceParams() },
    })

  /**
   * Fija la portada a partir del artículo que se está leyendo, cuando se llega
   * por un enlace directo. Solo actúa si no hay una portada elegida: si el
   * artículo vale para los dos roles, decide la sesión, y sin sesión se queda
   * en toda la ayuda.
   */
  const inferScope = (audience: HelpAudience) => {
    if (scopeChosen.value || scope.value !== 'todo') return
    if (audience !== 'ambos') {
      scope.value = audience
      return
    }
    const role = useAuthStore().userRole
    if (role === 'teacher') scope.value = 'profesor'
    else if (role === 'student') scope.value = 'alumno'
  }

  /** «¿Te ha resultado útil?». No devuelve error al usuario si falla. */
  const rate = (articleId: string, helpful: boolean) =>
    $fetch(`${base}/${articleId}/util`, { method: 'POST', body: { helpful } }).catch(() => null)

  /**
   * Todos los artículos de la portada activa en una lista plana, para filtrar
   * por título nada más teclear, mientras el servidor no ha contestado todavía.
   */
  const allArticles = computed(() =>
    categories.value.flatMap(category =>
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

  return {
    index,
    loadingIndex,
    scope,
    setScope,
    portalPath,
    ensureIndex,
    categories,
    featured,
    getCategory,
    fetchArticle,
    search,
    inferScope,
    rate,
    allArticles,
  }
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
const EM_OPEN = '\ue000'
const EM_CLOSE = '\ue001'

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
