<template>
  <div class="space-y-4 xs:space-y-5 sm:space-y-6">
    <PageHeader :title="title" :subtitle="subtitle">
      <template #actions>
        <slot name="header-action" />
      </template>
    </PageHeader>

    <ClassFilterBar
      v-model:search="searchQuery"
      v-model:sort="sortBy"
      v-model:view="cardView"
      :results-count="displayedClasses.length"
      @reset="resetFilters"
    />

    <ArchiveTabs
      v-if="showArchiveToggle"
      v-model="viewMode"
      :active-count="activeClasses.length"
      :archived-count="archivedClasses.length"
      active-label="Activas"
      archived-label="Archivadas"
    />

    <CardCollection v-if="loading" :view="cardView" cols="2-wide">
      <template v-if="cardView === 'grid'">
        <ClassCardSkeleton v-for="i in 4" :key="i" />
      </template>
      <template v-else>
        <CardRowSkeleton v-for="i in 4" :key="i" />
      </template>
    </CardCollection>

    <EmptyState
      v-else-if="!displayedClasses.length"
      :icon="AcademicCapIcon"
      :title="computedEmptyTitle"
      :description="computedEmptyDescription"
    >
      <template v-if="!searchQuery && viewMode === 'active'" #action>
        <slot name="empty-action" />
      </template>
    </EmptyState>

    <CardCollection v-else :view="cardView" cols="2-wide">
      <ClassCardItem
        v-for="classItem in displayedClasses"
        :key="classItem.id"
        :class-item="classItem"
        :layout="cardView"
        :show-archive-action="showArchiveAction"
        :show-duplicate-action="showDuplicateAction"
        :show-coins="showCoins"
        :loading="archiveLoadingId === classItem.id"
        :duplicating="duplicatingId === classItem.id"
        @click="$emit('class-click', classItem.id)"
        @archive="$emit('archive-class', classItem.id)"
        @unarchive="$emit('unarchive-class', classItem.id)"
        @duplicate="$emit('duplicate-class', classItem.id)"
      />
    </CardCollection>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { AcademicCapIcon } from '@heroicons/vue/24/outline'

interface ClassItem {
  id: string
  name: string
  description?: string
  backgroundImage?: string
  studentCount?: number
  schedule?: string
  archived?: boolean
  totalMissions?: number
  missionCount?: number
  coins?: number
  stats?: {
    avgProgress?: number
    participation?: number
    avgMissionsCompleted?: number
    totalMissions?: number
  }
}

interface Props {
  title: string
  subtitle: string
  classes: ClassItem[]
  archivedClasses?: ClassItem[]
  loading?: boolean
  showArchiveToggle?: boolean
  showArchiveAction?: boolean
  showDuplicateAction?: boolean
  archiveLoadingId?: string
  duplicatingId?: string
  emptyTitle?: string
  emptyDescription?: string
  showCoins?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  archivedClasses: () => [],
  loading: false,
  showArchiveToggle: false,
  showArchiveAction: false,
  showDuplicateAction: false,
  archiveLoadingId: '',
  duplicatingId: '',
  emptyTitle: '',
  emptyDescription: '',
})

defineEmits<{
  'class-click': [classId: string]
  'archive-class': [classId: string]
  'unarchive-class': [classId: string]
  'duplicate-class': [classId: string]
}>()

const searchQuery = ref('')
const sortBy = ref('name-asc')
const viewMode = ref<'active' | 'archived'>('active')
// Preferencia de layout (cuadrícula / lista) persistida por listado.
const cardView = useViewMode('classes')

const activeClasses = computed(() => props.classes.filter(c => !c.archived))

const resetFilters = () => {
  searchQuery.value = ''
}

const sortedAndFiltered = (input: ClassItem[]) => {
  let result = [...input]

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      c => c.name.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query)
    )
  }

  const [field, order] = sortBy.value.split('-')
  result.sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'es')
        break
      case 'students':
        comparison = (a.studentCount || 0) - (b.studentCount || 0)
        break
      case 'progress':
        comparison = (a.stats?.avgProgress || 0) - (b.stats?.avgProgress || 0)
        break
      case 'missions':
        comparison = (a.stats?.totalMissions || 0) - (b.stats?.totalMissions || 0)
        break
    }

    return order === 'desc' ? -comparison : comparison
  })

  return result
}

const displayedClasses = computed(() => {
  if (props.showArchiveToggle && viewMode.value === 'archived') {
    return sortedAndFiltered(props.archivedClasses)
  }
  return sortedAndFiltered(activeClasses.value)
})

const computedEmptyTitle = computed(() => {
  if (props.emptyTitle) return props.emptyTitle
  return viewMode.value === 'active' ? 'Sin clases' : 'Sin clases archivadas'
})

const computedEmptyDescription = computed(() => {
  if (searchQuery.value.trim()) {
    return `No se encontraron clases para "${searchQuery.value}"`
  }
  if (props.emptyDescription) return props.emptyDescription
  return ''
})
</script>
