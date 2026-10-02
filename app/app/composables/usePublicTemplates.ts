import type {
  PublicTemplateDetail,
  PublicTemplatePage,
  TemplateFailure,
} from '~/types/template.types'

/** Plantillas por página: cuatro filas completas de la rejilla de tres columnas. */
const PAGE_SIZE = 12

/**
 * Número de la última carga del listado, el mismo para todos los catálogos que
 * se monten: lo que se pinta (`useState`) es común, y la página que lo pidió
 * puede haberse desmontado. Al volver de una ficha, el catálogo nuevo pide la
 * suya; si después llega la respuesta de una carga del de antes, se descarta,
 * en vez de pintar encima otra consulta que ya no es la de los filtros.
 */
let catalogLoadSeq = 0

/**
 * Por qué no ha llegado algo del catálogo público, según lo que ha respondido
 * la API: una plantilla retirada o con la clase archivada (410), una que no
 * existe (404), demasiadas consultas seguidas (429) o cualquier otro fallo.
 */
export function templateFailure(error: unknown): TemplateFailure {
  const status = (error as { statusCode?: number } | null)?.statusCode
  if (status === 410) return 'gone'
  if (status === 404) return 'not-found'
  if (status === 429) return 'rate-limited'
  return 'failed'
}

/**
 * usePublicTemplates — el catálogo público de plantillas (Fase 3, C5).
 *
 * Se consulta sin sesión (`/public/templates`), para que el enlace a una
 * plantilla se abra sin cuenta. Si hay sesión, la petición la lleva igual y la
 * API la ignora: la respuesta es la misma para todos y no dice nada de quien
 * publicó cada plantilla.
 */
export function usePublicTemplates() {
  const config = useRuntimeConfig()
  const base = `${config.public.apiBase}/public/templates`

  const fetchTemplate = (id: string) =>
    $fetch<PublicTemplateDetail>(`${base}/${encodeURIComponent(id)}`)

  return { base, fetchTemplate }
}

/**
 * El listado del catálogo público: búsqueda, filtros, orden y página, que
 * aplica el servidor.
 *
 * - Lo escrito en el buscador se pide 300 ms después de dejar de teclear, como
 *   en los listados del panel; al vaciarlo, en el acto.
 * - Otra búsqueda, otro filtro u otro orden vuelven a la primera página.
 * - De cada filtro se piden todos los valores marcados, repitiendo la clave
 *   (`?subject=A&subject=B`): hay asignaturas con comas.
 * - Lo que se está mirando y la última página que llegó viven en `useState`:
 *   al volver de la ficha de una plantilla, el catálogo sigue igual y se pinta
 *   al momento, sin esqueleto, mientras se refresca por detrás.
 * - Mientras llega la página de otra búsqueda u otros filtros, la que se ve
 *   sigue ahí, marcada como desfasada (`outdated`); el refresco de la misma
 *   consulta no la marca.
 * - Si la página que se veía ya no existe (se han retirado plantillas), se pasa
 *   a la última que queda.
 */
export function usePublicTemplateCatalog() {
  const { base } = usePublicTemplates()

  const search = useState('public-templates-search', () => '')
  const levels = useState<string[]>('public-templates-levels', () => [])
  const subjects = useState<string[]>('public-templates-subjects', () => [])
  const languages = useState<string[]>('public-templates-languages', () => [])
  const provinces = useState<string[]>('public-templates-provinces', () => [])
  const sort = useState('public-templates-sort', () => 'recent')
  const page = useState('public-templates-page', () => 1)
  /** Lo que de verdad se busca: lo escrito, una vez se deja de teclear. */
  const appliedSearch = useState('public-templates-applied-search', () => '')
  /** La última página que ha llegado, con la consulta que la pidió. */
  const shown = useState<{ key: string; data: PublicTemplatePage } | null>(
    'public-templates-shown',
    () => null
  )

  const loading = ref(false)
  /** Por qué no ha llegado la última página, si no ha llegado. */
  const failure = ref<TemplateFailure | null>(null)

  const applySearch = useDebounceFn((value: string) => {
    appliedSearch.value = value.trim()
  }, 300)
  watch(search, value => {
    applySearch(value)
    // Vaciar el buscador no espera: lo pendiente ya llega vacío.
    if (!value.trim()) appliedSearch.value = ''
  })

  /** Una lista vacía no filtra, así que no viaja. */
  const anyOf = (values: string[]) => (values.length ? values : undefined)

  /** Lo que se pide, sin la página. */
  const criteria = computed(() => ({
    q: appliedSearch.value || undefined,
    educationLevel: anyOf(levels.value),
    subject: anyOf(subjects.value),
    language: anyOf(languages.value),
    province: anyOf(provinces.value),
    sort: sort.value,
    limit: PAGE_SIZE,
  }))

  const query = computed(() => ({ ...criteria.value, page: page.value }))
  /** La consulta como texto: una lista nueva con lo mismo no cuenta como cambio. */
  const queryKey = computed(() => JSON.stringify(query.value))

  // Con otros criterios, la página que se veía ya no es de la misma lista. Este
  // vigilante va antes que el de la consulta: los dos cambios salen en una sola
  // petición. Se comparan como texto: una lista nueva con lo mismo no cuenta.
  watch(
    () => JSON.stringify(criteria.value),
    () => {
      page.value = 1
    }
  )

  // Una respuesta atrasada no pisa a la última (ver `catalogLoadSeq`).
  async function load() {
    const seq = ++catalogLoadSeq
    const key = queryKey.value
    loading.value = true
    failure.value = null
    try {
      const data = await $fetch<PublicTemplatePage>(base, { query: query.value })
      if (seq !== catalogLoadSeq) return
      if (!data.templates.length && data.totalPages > 0 && page.value > data.totalPages) {
        // Al cambiar la página, el vigilante de la consulta la vuelve a pedir.
        page.value = data.totalPages
        return
      }
      shown.value = { key, data }
    } catch (error) {
      if (seq !== catalogLoadSeq) return
      failure.value = templateFailure(error)
    } finally {
      if (seq === catalogLoadSeq) loading.value = false
    }
  }

  watch(queryKey, load)
  onMounted(load)

  const result = computed(() => shown.value?.data ?? null)
  /** Lo que se ve es de otra consulta: la de ahora está en camino. */
  const outdated = computed(() => !!shown.value && shown.value.key !== queryKey.value)
  const templates = computed(() => result.value?.templates ?? [])
  const total = computed(() => result.value?.total ?? 0)
  const totalPages = computed(() => result.value?.totalPages ?? 0)
  /** Hay algo puesto: una búsqueda o un filtro. */
  const isFiltering = computed(
    () =>
      !!criteria.value.q ||
      levels.value.length +
        subjects.value.length +
        languages.value.length +
        provinces.value.length >
        0
  )

  return {
    search,
    levels,
    subjects,
    languages,
    provinces,
    sort,
    page,
    result,
    templates,
    total,
    totalPages,
    loading,
    outdated,
    failure,
    isFiltering,
    load,
  }
}
