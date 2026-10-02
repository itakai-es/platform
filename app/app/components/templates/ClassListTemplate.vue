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

    <!-- Pestañas Activas/Archivadas y, a la derecha, lo que la página añada
         junto a ellas (p. ej. el enlace a la papelera). -->
    <div v-if="showArchiveToggle" class="flex flex-wrap items-center justify-between gap-2">
      <ArchiveTabs
        v-model="viewMode"
        :active-count="activeClasses.length"
        :archived-count="archivedClasses.length"
        :active-label="t('common.class_list.tab_active')"
        :archived-label="t('common.class_list.tab_archived')"
      />
      <slot name="tabs-extra" />
    </div>

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
import type { ClassAccess } from '~/types/class.types'

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
  /** Acceso propio (listados del profesor): decide qué acciones y etiquetas lleva cada tarjeta. */
  myAccess?: ClassAccess | null
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

const { t } = useI18n()

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
  return viewMode.value === 'active'
    ? t('common.class_list.empty_title')
    : t('common.class_list.empty_archived_title')
})

const computedEmptyDescription = computed(() => {
  if (searchQuery.value.trim()) {
    return t('common.class_list.no_results', { query: searchQuery.value.trim() })
  }
  if (props.emptyDescription) return props.emptyDescription
  return ''
})
</script>
