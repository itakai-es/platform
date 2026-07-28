<template>
  <FilterBar
    :search="search"
    :sort="sort"
    :results-count="resultsCount"
    :search-placeholder="t('teacher.components.mission_filter_bar.search_placeholder')"
    :sort-options="sortOptions"
    :has-active-filters="hasActiveFilters"
    :active-filter-count="activeFilterCount"
    :view="view"
    variant="red"
    @update:search="$emit('update:search', $event)"
    @update:sort="$emit('update:sort', $event)"
    @update:view="$emit('update:view', $event)"
    @reset="$emit('reset')"
  >
    <template #filters>
      <!-- Class Filter (optional) -->
      <MultiSelectDropdown
        v-if="showClassFilter && classOptions.length > 0"
        :model-value="classFilters"
        :options="classOptions"
        :all-label="t('teacher.components.mission_filter_bar.all_classes')"
        :plural-label="t('teacher.components.mission_filter_bar.plural_classes')"
        class="sm:max-w-[220px]"
        @update:model-value="$emit('update:classFilters', $event)"
      />

      <!-- Status Filter (teacher mode) -->
      <MultiSelectDropdown
        v-if="showStatusFilter"
        :model-value="statusFilters"
        :options="statusOptions"
        :all-label="t('teacher.components.mission_filter_bar.all_statuses')"
        :plural-label="t('teacher.components.mission_filter_bar.plural_statuses')"
        @update:model-value="$emit('update:statusFilters', $event)"
      />

      <!-- Extra filters slot -->
      <slot name="extra-filters" />

      <!-- Rarity Filter -->
      <MultiSelectDropdown
        :model-value="rarityFilters"
        :options="rarityOptions"
        :all-label="t('teacher.components.mission_filter_bar.all_rarities')"
        :plural-label="t('teacher.components.mission_filter_bar.plural_rarities')"
        @update:model-value="$emit('update:rarityFilters', $event)"
      />
    </template>
  </FilterBar>
</template>

<script setup lang="ts">
/**
 * MissionFilterBar - Barra de filtros para listados de misiones
 *
 * Extiende FilterBar con filtros específicos de misiones: rareza, clase, estado.
 */
import type { ViewMode } from '~/composables/useViewMode'

const { t } = useI18n()

interface SelectOption {
  value: string
  label: string
}

interface Props {
  search: string
  rarityFilters: string[]
  sort: string
  resultsCount: number
  showClassFilter?: boolean
  classOptions?: SelectOption[]
  classFilters?: string[]
  showStatusFilter?: boolean
  statusFilters?: string[]
  hasExtraActiveFilters?: boolean
  view?: ViewMode
}

const props = withDefaults(defineProps<Props>(), {
  showClassFilter: false,
  classOptions: () => [],
  classFilters: () => [],
  showStatusFilter: false,
  statusFilters: () => [],
  hasExtraActiveFilters: false,
})

defineEmits<{
  'update:search': [value: string]
  'update:rarityFilters': [value: string[]]
  'update:sort': [value: string]
  'update:classFilters': [value: string[]]
  'update:statusFilters': [value: string[]]
  'update:view': [value: ViewMode]
  reset: []
}>()

// Rarity options
const rarityOptions = computed<SelectOption[]>(() => [
  { value: 'comun', label: t('teacher.components.mission_filter_bar.rarity.common') },
  { value: 'rara', label: t('teacher.components.mission_filter_bar.rarity.rare') },
  { value: 'epica', label: t('teacher.components.mission_filter_bar.rarity.epic') },
  { value: 'legendaria', label: t('teacher.components.mission_filter_bar.rarity.legendary') },
])

// Status options
const statusOptions = computed<SelectOption[]>(() => [
  { value: 'activa', label: t('teacher.components.mission_filter_bar.status.active') },
  { value: 'urgente', label: t('teacher.components.mission_filter_bar.status.urgent') },
  { value: 'completada', label: t('teacher.components.mission_filter_bar.status.completed') },
  { value: 'expirada', label: t('teacher.components.mission_filter_bar.status.expired') },
  { value: 'bloqueada', label: t('teacher.components.mission_filter_bar.status.locked') },
])

// Sort options
const baseSortOptions = computed<SelectOption[]>(() => [
  { value: 'deadline-asc', label: t('teacher.components.mission_filter_bar.sort.deadline_asc') },
  { value: 'deadline-desc', label: t('teacher.components.mission_filter_bar.sort.deadline_desc') },
  { value: 'title-asc', label: t('teacher.components.mission_filter_bar.sort.name_asc') },
  { value: 'title-desc', label: t('teacher.components.mission_filter_bar.sort.name_desc') },
  { value: 'xp-desc', label: t('teacher.components.mission_filter_bar.sort.xp_desc') },
  { value: 'xp-asc', label: t('teacher.components.mission_filter_bar.sort.xp_asc') },
  { value: 'rarity-desc', label: t('teacher.components.mission_filter_bar.sort.rarity_desc') },
  { value: 'rarity-asc', label: t('teacher.components.mission_filter_bar.sort.rarity_asc') },
])

const teacherSortOptions = computed<SelectOption[]>(() => [
  {
    value: 'completion-asc',
    label: t('teacher.components.mission_filter_bar.sort.completion_asc'),
  },
  {
    value: 'completion-desc',
    label: t('teacher.components.mission_filter_bar.sort.completion_desc'),
  },
])

const sortOptions = computed(() => {
  if (props.showStatusFilter) {
    return [...baseSortOptions.value, ...teacherSortOptions.value]
  }
  return baseSortOptions.value
})

const hasActiveFilters = computed(() => {
  return activeFilterCount.value > 0
})

const activeFilterCount = computed(() => {
  let count = 0
  if (props.rarityFilters.length > 0) count += props.rarityFilters.length
  if (props.showClassFilter && props.classFilters.length > 0) count += props.classFilters.length
  if (props.showStatusFilter && props.statusFilters.length > 0) count += props.statusFilters.length
  return count
})
</script>
