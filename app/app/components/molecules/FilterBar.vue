<template>
  <div class="rounded-2xl p-2.5 sm:p-3 space-y-2" :class="bgClass">
    <!-- Row 1: Search + Filters toggle + Count -->
    <div class="flex gap-2 sm:gap-3 items-center">
      <div class="flex-1 min-w-0">
        <SearchInput
          :model-value="search"
          :placeholder="searchPlaceholder"
          @update:model-value="$emit('update:search', $event)"
        />
      </div>

      <!-- Toggle filters button -->
      <button
        v-if="$slots.filters || sortOptions.length > 0"
        type="button"
        class="flex-shrink-0 relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 border border-border-primary bg-surface text-text-primary hover:bg-gray-50 rounded-2xl text-sm sm:text-base font-medium transition-colors duration-200"
        @click="filtersOpen = !filtersOpen"
      >
        <FunnelIcon class="w-4 h-4" />
        <span class="hidden sm:inline"
          >Filtros<template v-if="activeFilterCount > 0"> ({{ activeFilterCount }})</template></span
        >
      </button>

      <!-- View toggle (grid/list) - only rendered when a view is provided -->
      <ViewToggle
        v-if="view !== undefined"
        :model-value="view"
        class="flex-shrink-0"
        @update:model-value="$emit('update:view', $event)"
      />

      <!-- Results count -->
      <div
        class="flex-shrink-0 bg-sky text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm sm:text-base font-semibold flex items-center justify-center"
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
        v-if="filtersOpen"
        class="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 sm:items-center"
      >
        <slot name="filters" />

        <SelectDropdown
          :model-value="sort"
          :options="sortOptions"
          class="col-span-full sm:w-auto"
          @update:model-value="(v: string | number) => $emit('update:sort', String(v))"
        />

        <button
          v-if="isFiltering"
          type="button"
          class="flex-shrink-0 p-2.5 sm:p-3 border border-border-primary bg-surface hover:bg-gray-50 text-text-primary rounded-2xl transition-colors"
          title="Limpiar filtros"
          @click="$emit('reset')"
        >
          <XMarkIcon class="w-5 h-5 mx-auto" />
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
  search: string
  sort: string
  resultsCount: number
  searchPlaceholder?: string
  sortOptions: SelectOption[]
  variant?: 'mint' | 'purple' | 'yellow' | 'red'
  hasActiveFilters?: boolean
  activeFilterCount?: number
  // Modo de vista (cuadrícula/lista). Si se omite, el toggle no se muestra.
  view?: ViewMode
}

const props = withDefaults(defineProps<Props>(), {
  searchPlaceholder: 'Buscar...',
  variant: 'mint',
  hasActiveFilters: false,
  activeFilterCount: 0,
})

defineEmits<{
  'update:search': [value: string]
  'update:sort': [value: string]
  'update:view': [value: ViewMode]
  reset: []
}>()

const filtersOpen = ref(false)

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
    mint: 'bg-[#B8F5D8]',
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
