<template>
  <div class="rounded-2xl p-2.5 sm:p-3 space-y-2" :class="bgClass">
    <!-- Row 1: Search + Filters toggle + Count. Con más de dos vistas, en el móvil
         el buscador va en su fila: con todo al lado se queda sin sitio para escribir. -->
    <div
      class="flex gap-2 sm:gap-3 items-center"
      :class="{ 'flex-wrap sm:flex-nowrap': searchOwnRow }"
    >
      <div
        v-if="!hideSearch && !viewOnly"
        class="min-w-0"
        :class="searchOwnRow ? 'w-full sm:w-auto sm:flex-1' : 'flex-1'"
      >
        <SearchInput
          :model-value="search"
          :placeholder="searchPlaceholder ?? t('common.filter_bar.search')"
          @update:model-value="$emit('update:search', $event)"
        />
      </div>

      <!-- Toggle filters button -->
      <button
        v-if="!viewOnly && ($slots.filters || sortOptions.length > 0)"
        type="button"
        class="flex-shrink-0 relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 border border-border-primary bg-surface text-text-primary hover:bg-gray-50 rounded-2xl text-sm sm:text-base font-medium transition-colors duration-200"
        :aria-label="filtersLabel"
        :aria-expanded="filtersOpen"
        @click="filtersOpen = !filtersOpen"
      >
        <FunnelIcon class="w-4 h-4" aria-hidden="true" />
        <span class="hidden sm:inline">{{ filtersLabel }}</span>
      </button>

      <!-- View toggle (grid/list) - only rendered when a view is provided -->
      <ViewToggle
        v-if="view !== undefined"
        :model-value="view"
        :modes="viewModes"
        class="flex-shrink-0"
        @update:model-value="$emit('update:view', $event)"
      />

      <!-- Results count (sin buscador, se va a la derecha igualmente). Celeste oscuro y no el
           de marca: el blanco sobre `bg-sky` se queda en 2,6:1 y no se lee bien. -->
      <div
        :class="{ 'ml-auto': hideSearch || viewOnly || searchOwnRow }"
        class="flex-shrink-0 bg-sky-700 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm sm:text-base font-semibold flex items-center justify-center"
      >
        {{ resultsCount }}
      </div>
    </div>

    <!-- Row 2: Collapsible filters -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-40"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="opacity-100 max-h-40"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-if="filtersOpen && !viewOnly"
        class="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 sm:items-center"
      >
        <slot name="filters" />

        <!-- Sin opciones de orden no hay desplegable (p. ej. listas con orden manual). -->
        <SelectDropdown
          v-if="sortOptions.length > 0"
          :model-value="sort"
          :options="sortOptions"
          class="col-span-full sm:w-auto"
          @update:model-value="(v: string | number) => $emit('update:sort', String(v))"
        />

        <button
          v-if="isFiltering"
          type="button"
          class="flex-shrink-0 p-2.5 sm:p-3 border border-border-primary bg-surface hover:bg-gray-50 text-text-primary rounded-2xl transition-colors"
          :title="t('common.filter_bar.clear')"
          :aria-label="t('common.filter_bar.clear')"
          @click="$emit('reset')"
        >
          <XMarkIcon class="w-5 h-5 mx-auto" aria-hidden="true" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon, FunnelIcon } from '@heroicons/vue/24/outline'
import type { ViewMode } from '~/composables/useViewMode'

interface SelectOption {
  value: string
  label: string
}

interface Props {
  /** Texto del buscador; sin buscador (`hide-search`) no hace falta. */
  search?: string
  sort: string
  resultsCount: number
  searchPlaceholder?: string
  sortOptions: SelectOption[]
  variant?: 'mint' | 'purple' | 'yellow' | 'red'
  hasActiveFilters?: boolean
  activeFilterCount?: number
  // Modo de vista (cuadrícula/lista). Si se omite, el toggle no se muestra.
  view?: ViewMode
  /** Los modos que ofrece el toggle (por defecto, cuadrícula y lista). */
  viewModes?: ViewMode[]
  /**
   * Solo el toggle de vista y el recuento: sin buscador ni filtros, para una
   * vista que enseña la lista entera (el mapa de misiones).
   */
  viewOnly?: boolean
  /** Oculta el buscador, para listas que solo se filtran por los desplegables. */
  hideSearch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  search: '',
  searchPlaceholder: undefined,
  variant: 'mint',
  hasActiveFilters: false,
  activeFilterCount: 0,
  viewModes: undefined,
  viewOnly: false,
  hideSearch: false,
})

defineEmits<{
  'update:search': [value: string]
  'update:sort': [value: string]
  'update:view': [value: ViewMode]
  reset: []
}>()

const { t } = useI18n()

/** «Filtros», con cuántos hay puestos. */
const filtersLabel = computed(() =>
  props.activeFilterCount > 0
    ? t('common.filter_bar.filters_count', { count: props.activeFilterCount })
    : t('common.filter_bar.filters')
)

// Con el mapa, el toggle tiene tres botones: en el móvil, el buscador baja de fila.
const searchOwnRow = computed(() => (props.viewModes?.length ?? 0) > 2)

// Sin buscador, los filtros son lo único que hay en la barra: salen abiertos.
const filtersOpen = ref(props.hideSearch)

// Auto-open filters when there are active filters
watch(
  () => props.hasActiveFilters,
  active => {
    if (active) filtersOpen.value = true
  },
  { immediate: true }
)

// Background color based on variant
const bgClass = computed(() => {
  const variants = {
    mint: 'bg-green-light',
    purple: 'bg-purple-light',
    yellow: 'bg-yellow-light',
    red: 'bg-red-light',
  }
  return variants[props.variant]
})

// Show reset button when search or external filters are active
const isFiltering = computed(() => {
  return props.search.trim() !== '' || props.hasActiveFilters
})
</script>
