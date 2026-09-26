import type {
  HelpArea,
  HelpArticleView,
  HelpAudience,
  HelpCategory,
  HelpIndex,
  HelpScope,
  HelpSearchResult,
} from '~/types/help.types'
import { helpArticlePath, helpBasePath, helpCategoryPath, orderForArea } from '~/utils/help-area'

/**
 * useHelp — contenido público del centro de ayuda y del blog (Fase 3, puntos
 * 17 y B3).
 *
 * Las dos áreas comparten modelo y API y se separan por el área de la
 * categoría. Cada una tiene su propio estado (índice, carga, portada), así que
 * visitar el blog no pisa lo cargado de la ayuda ni al revés. **El área viaja
 * siempre en cada llamada**: la API sirve la ayuda por defecto, y sin ella el
 * blog enseñaría el índice de la ayuda o daría un 404 mudo en cada entrada.
 *
 * Estas páginas cuelgan de la landing y tienen que funcionar sin sesión: del
 * store de autenticación solo se lee el rol, y solo para elegir una portada de
 * la ayuda por defecto cuando un artículo vale para los dos; sin sesión ese
 * rol es null. El blog no tiene portadas por rol: es para todos.
 *
 * El índice completo se pide una sola vez y se guarda en `useState`: son unos
 * pocos kilobytes y con él en memoria el buscador filtra por título sin ir al
 * servidor en cada tecla. La búsqueda de verdad —la de Postgres, con raíces y
 * sin tildes— se reserva para cuando el usuario deja de escribir.
 *
 * Las portadas por rol no vuelven a pedir nada: el mismo índice se filtra en
 * memoria según el `scope` activo, así que cambiar de portada es instantáneo.
 *
 * El orden también depende del área: la ayuda respeta el que se fija en el
 * panel y el blog va de lo más reciente a lo más antiguo (`orderForArea`).
 */
export function useHelp(area: HelpArea = 'ayuda') {
  const config = useRuntimeConfig()
  const { t } = useI18n()
  const base = `${config.public.apiBase}/public/help`
  const isBlog = area === 'blog'
  const areaParams = { area }

  const index = useState<HelpIndex | null>(`help-index-${area}`, () => null)
  const loadingIndex = useState<boolean>(`help-index-loading-${area}`, () => false)
  /** La última carga del índice falló: se enseña el error y se puede reintentar. */
  const indexError = useState<boolean>(`help-index-error-${area}`, () => false)

  /** La portada activa: toda la ayuda, la del profesorado o la del alumnado. */
  const scope = useState<HelpScope>(`help-scope-${area}`, () => 'todo')
  /**
   * Si la portada la ha fijado una portada o el selector. «Toda la ayuda»
   * elegida a mano y «sin elegir» valen igual `'todo'`; esto las distingue.
   */
  const scopeChosen = useState<boolean>(`help-scope-chosen-${area}`, () => false)

  /** Fija la portada. El blog solo tiene una. */
  const setScope = (value: HelpScope) => {
    if (isBlog) return
    scope.value = value
    scopeChosen.value = true
  }

  /** El nombre de la sección, para migas, barra y títulos de pestaña. */
  const sectionTitle = computed(() => (isBlog ? t('common.nav.blog') : t('common.help.title')))

  /** La ruta de la portada de cada ámbito, para migas y selector. */
  const portalPath = (value: HelpScope) =>
    isBlog || value === 'todo' ? helpBasePath(area) : `${helpBasePath(area)}/${value}`

  const categoryPath = (categorySlug: string) => helpCategoryPath(area, categorySlug)
  const articlePath = (categorySlug: string, articleSlug: string) =>
    helpArticlePath(area, categorySlug, articleSlug)

  /**
   * Carga el índice si no está ya. Idempotente. Si falla, el índice se queda
   * sin cargar: la siguiente página que lo pida (o el botón de reintentar)
   * vuelve a intentarlo.
   */
  const ensureIndex = async () => {
    if (index.value || loadingIndex.value) return index.value
    loadingIndex.value = true
    indexError.value = false
    try {
      index.value = await $fetch<HelpIndex>(base, { params: areaParams })
    } catch (error) {
      console.error(`[${area}] no se pudo cargar el índice:`, error)
      indexError.value = true
    } finally {
      loadingIndex.value = false
    }
    return index.value
  }

  /** Si un artículo entra en la portada activa. Los de «ambos» salen en todas. */
  const inScope = (audience: HelpAudience) =>
    scope.value === 'todo' || audience === scope.value || audience === 'ambos'

  /**
   * Las categorías de la portada activa, con solo sus artículos (en el orden
   * de lectura del área) y el total recalculado; las que se quedan vacías no
   * se pintan. El total del servidor cuenta todos los artículos publicados, así
   * que aquí no sirve.
   */
  const categories = computed<HelpCategory[]>(() =>
    (index.value?.categories ?? [])
      .map(category => {
        const articles = orderForArea(
          area,
          category.articles.filter(article => inScope(article.audience))
        )
        return { ...category, articles, total: articles.length }
      })
      .filter(category => category.articles.length > 0)
  )

  const featured = computed(() =>
    orderForArea(
      area,
      (index.value?.featured ?? []).filter(article => inScope(article.audience))
    )
  )

  /**
   * La categoría de una URL, filtrada por la portada activa. Si en esta portada
   * no tiene nada pero sí existe en el índice completo, se devuelve completa:
   * un enlace directo a una categoría siempre tiene que abrir.
   */
  const getCategory = (slug: string) => {
    const inPortal = categories.value.find(category => category.slug === slug)
    if (inPortal) return inPortal
    const full = index.value?.categories.find(category => category.slug === slug)
    return full ? { ...full, articles: orderForArea(area, full.articles) } : null
  }

  /** Los parámetros de audiencia que se mandan al servidor, salvo en «todo». */
  const audienceParams = () => (isBlog || scope.value === 'todo' ? {} : { audience: scope.value })

  const fetchArticle = (categorySlug: string, articleSlug: string) =>
    $fetch<HelpArticleView>(`${base}/${categorySlug}/${articleSlug}`, {
      params: { ...areaParams, ...audienceParams() },
    })

  const search = (query: string) =>
    $fetch<{ results: HelpSearchResult[]; total: number }>(`${base}/buscar`, {
      params: { q: query, ...areaParams, ...audienceParams() },
    })

  /**
   * Fija la portada a partir del artículo que se está leyendo, cuando se llega
   * por un enlace directo. Solo actúa si no hay una portada elegida: si el
   * artículo vale para los dos roles, decide la sesión, y sin sesión se queda
   * en toda la ayuda. En el blog no hace nada: no hay portadas.
   */
  const inferScope = (audience: HelpAudience) => {
    if (isBlog || scopeChosen.value || scope.value !== 'todo') return
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
   * Todos los artículos de la portada activa en una lista plana, en el orden
   * de lectura del área: para filtrar por título nada más teclear, mientras el
   * servidor no ha contestado todavía, y para el listado de entradas del blog.
   */
  const allArticles = computed(() =>
    orderForArea(
      area,
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
  )

  /** Ordena una lista de artículos como se leen en esta área. */
  const ordered = <T extends { publishedAt?: string | null; updatedAt: string }>(
    items: readonly T[]
  ) => orderForArea(area, items)

  return {
    area,
    isBlog,
    index,
    loadingIndex,
    indexError,
    scope,
    setScope,
    sectionTitle,
    portalPath,
    categoryPath,
    articlePath,
    ensureIndex,
    categories,
    featured,
    getCategory,
    fetchArticle,
    search,
    inferScope,
    rate,
    allArticles,
    ordered,
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
