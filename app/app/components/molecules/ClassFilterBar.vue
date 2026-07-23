<template>
  <FilterBar
    :search="search"
    :sort="sort"
    :results-count="resultsCount"
    :search-placeholder="t('teacher.components.class_filter_bar.search_placeholder')"
    :sort-options="sortOptions"
    :view="view"
    variant="red"
    @update:search="$emit('update:search', $event)"
    @update:sort="$emit('update:sort', $event)"
    @update:view="$emit('update:view', $event)"
    @reset="$emit('reset')"
  />
</template>

<script setup lang="ts">
import type { ViewMode } from '~/composables/useViewMode'

const { t } = useI18n()

interface Props {
  search: string
  sort: string
  resultsCount: number
  view?: ViewMode
}

defineProps<Props>()

defineEmits<{
  'update:search': [value: string]
  'update:sort': [value: string]
  'update:view': [value: ViewMode]
  reset: []
}>()

// Sort options for classes
const sortOptions = computed(() => [
  { value: 'name-asc', label: t('teacher.components.class_filter_bar.sort.name_asc') },
  { value: 'name-desc', label: t('teacher.components.class_filter_bar.sort.name_desc') },
  { value: 'students-desc', label: t('teacher.components.class_filter_bar.sort.most_students') },
  { value: 'students-asc', label: t('teacher.components.class_filter_bar.sort.least_students') },
  { value: 'missions-desc', label: t('teacher.components.class_filter_bar.sort.most_missions') },
  { value: 'missions-asc', label: t('teacher.components.class_filter_bar.sort.least_missions') },
])
</script>
