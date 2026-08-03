<template>
  <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
    <!-- Search -->
    <div class="w-full sm:w-64">
      <SearchInput
        :model-value="search"
        :placeholder="searchPlaceholder"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <!-- Dynamic Filters -->
    <div class="flex flex-wrap gap-2 flex-1">
      <SelectDropdown
        v-for="filter in filters"
        :key="filter.key"
        :model-value="filter.value"
        :options="filter.options"
        :placeholder="filter.placeholder"
        class="w-36"
        @update:model-value="$emit('filterChange', filter.key, $event)"
      />
    </div>

    <!-- Results count & reset -->
    <div class="flex items-center gap-3 flex-shrink-0">
      <span v-if="totalResults !== undefined" class="text-sm text-text-secondary whitespace-nowrap">
        {{ totalResults }} resultado{{ totalResults !== 1 ? 's' : '' }}
      </span>
      <button
        v-if="hasActiveFilters"
        class="text-sm text-purple hover:text-purple/80 transition-colors whitespace-nowrap"
        @click="$emit('reset')"
      >
        Limpiar filtros
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FilterOption {
  value: string | number
  label: string
}

interface FilterConfig {
  key: string
  value: string | number
  options: FilterOption[]
  placeholder?: string
}

interface Props {
  search: string
  searchPlaceholder?: string
  filters: FilterConfig[]
  totalResults?: number
  hasActiveFilters?: boolean
}

withDefaults(defineProps<Props>(), {
  searchPlaceholder: 'Buscar...',
  hasActiveFilters: false,
})

defineEmits<{
  'update:search': [value: string]
  filterChange: [key: string, value: string | number]
  reset: []
}>()
</script>
