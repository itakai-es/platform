import type { Ref } from 'vue'
import type { AdminListQuery } from '~/types/admin.types'

/**
 * Búsqueda, filtros, orden y página de un listado del panel de administración
 * que pagina el servidor (usuarios, clases, misiones).
 *
 * - Lo escrito en el buscador se pide 300 ms después de dejar de teclear.
 * - Otra búsqueda, otro filtro u otro orden vuelven a la primera página.
 * - Los filtros son desplegables: '' es «todos» y no viaja en la consulta.
 * - `load` recibe la consulta entera al montar la página y cada vez que cambia.
 * - Si la página que se ve deja de existir (se ha borrado lo último de la
 *   última), se pasa a la última que queda.
 */
export function useAdminListQuery<F extends Record<string, string>>(options: {
  /** Valor inicial de cada filtro, que es también al que vuelve «Limpiar filtros». */
  filters: F
  sort: string
  pageSize: number
  /** Páginas que hay según la última respuesta del servidor. */
  totalPages: Ref<number>
  load: (query: AdminListQuery & Partial<F>) => Promise<unknown>
}) {
  const search = ref('')
  const appliedSearch = ref('')
  const filters = reactive({ ...options.filters }) as F
  const sort = ref(options.sort)
  const page = ref(1)

  const applySearch = useDebounceFn((value: string) => {
    appliedSearch.value = value.trim()
  }, 300)
  watch(search, value => applySearch(value))

  /** Lo que se pide, sin la página. */
  const criteria = computed(() => {
    const active = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== '')
    ) as Partial<F>
    return {
      ...active,
      search: appliedSearch.value || undefined,
      sort: sort.value,
      limit: options.pageSize,
    }
  })

  const query = computed(() => ({ ...criteria.value, page: page.value }))

  const activeFilterCount = computed(
    () => Object.values(filters).filter(value => value !== '').length
  )
  const hasActiveFilters = computed(() => activeFilterCount.value > 0)
  /** Hay algo que limpiar: un filtro o una búsqueda. */
  const isFiltering = computed(() => hasActiveFilters.value || search.value.trim() !== '')

  // Con otros criterios, la página que se veía ya no es de la misma lista. Este
  // vigilante va antes que el de la consulta: los dos cambios salen en una sola petición.
  watch(
    () => JSON.stringify(criteria.value),
    () => {
      page.value = 1
    }
  )

  function load(value: AdminListQuery & Partial<F>) {
    // El error ya lo registra el store; la lista se queda vacía o como estaba.
    options.load(value).catch(() => {})
  }

  watch(query, value => load(value))

  watch(options.totalPages, total => {
    if (page.value > total) page.value = Math.max(1, total)
  })

  onMounted(() => load(query.value))

  function reset() {
    search.value = ''
    appliedSearch.value = ''
    Object.assign(filters, options.filters)
    sort.value = options.sort
  }

  return {
    search,
    filters,
    sort,
    page,
    activeFilterCount,
    hasActiveFilters,
    isFiltering,
    reset,
  }
}
