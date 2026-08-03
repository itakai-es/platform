<template>
  <div class="space-y-4 xs:space-y-5 sm:space-y-6">
    <!-- Page Header -->
    <PageHeader title="Mis Misiones" :subtitle="t('teacher.missions.index.subtitle')">
      <template #actions>
        <NuxtLink to="/profesor/misiones/crear">
          <Button variant="primary">
            <PlusIcon class="w-4 h-4 mr-2" />
            Nueva Misión
          </Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Filters Row -->
    <MissionFilterBar
      v-model:search="searchQuery"
      v-model:rarity-filters="activeRarityFilters"
      v-model:sort="sortBy"
      v-model:class-filters="activeFilters"
      v-model:status-filters="activeStatusFilters"
      v-model:view="view"
      :results-count="displayedMissions.length"
      show-class-filter
      show-status-filter
      :class-options="classOptions"
      @reset="resetFilters"
    />

    <!-- Loading State -->
    <CardCollection v-if="loading" :view="view">
      <template v-if="view === 'grid'">
        <MissionCardSkeleton v-for="i in 6" :key="i" />
      </template>
      <template v-else>
        <CardRowSkeleton v-for="i in 6" :key="i" />
      </template>
    </CardCollection>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!displayedMissions.length"
      :icon="RocketLaunchIcon"
      title="Sin misiones"
      :description="getEmptyStateMessage()"
    >
      <template v-if="!searchQuery" #action>
        <NuxtLink
          :to="
            selectedClassIds?.length === 1
              ? `/profesor/misiones/crear?classId=${selectedClassIds[0]}`
              : '/profesor/misiones/crear'
          "
        >
          <Button variant="primary"> Crear Primera Misión </Button>
        </NuxtLink>
      </template>
    </EmptyState>

    <!-- Missions Grid -->
    <CardCollection v-else :view="view">
      <MissionCardEnhanced
        v-for="mission in displayedMissions"
        :id="mission.id"
        :key="mission.id"
        :title="mission.title"
        :description="mission.description"
        :status="mission.status"
        :rarity="mission.rarity"
        :xp-reward="mission.xpReward"
        :coin-reward="mission.coinReward"
        :mana-reward="mission.manaReward"
        :background-image="mission.backgroundImage"
        :completed-count="mission.completedCount"
        :total-students="mission.totalStudents"
        :deadline="mission.deadline"
        :class-name="mission.className"
        :layout="view"
        compact
        @click="navigateToMission(mission)"
      />
    </CardCollection>
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, RocketLaunchIcon } from '@heroicons/vue/24/outline'
import type { MissionStatus, MissionRarity } from '~/types/mission.types'

type TeacherStatus = 'activa' | 'completada' | 'bloqueada'

interface TeacherMission {
  id: string
  classId: string
  className: string
  title: string
  description: string
  status: MissionStatus
  teacherStatus: TeacherStatus // For filtering: completada when all students done
  rarity: MissionRarity
  xpReward: number
  coinReward?: number
  manaReward?: number
  completedCount: number
  totalStudents: number
  deadline: string | null
  backgroundImage: string
}

interface ClassOption {
  id: string
  name: string
}

const { t } = useI18n()
const view = useViewMode('teacher-missions')

useHead({
  title: () => t('teacher.missions.index.meta.title'),
  meta: [{ name: 'description', content: () => t('teacher.missions.index.meta.description') }],
})

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

// Store
const teacherStore = useTeacherStore()

// State
const activeFilters = ref<string[]>([])
const activeRarityFilters = ref<string[]>([])
const activeStatusFilters = ref<string[]>([])
const searchQuery = ref('')
const sortBy = ref('deadline-asc')

// Use store data
const missions = computed(() => teacherStore.recentMissions)
const classes = computed(() => teacherStore.classes.map(c => ({ id: c.id, name: c.name })))
const loading = computed(() => teacherStore.isLoadingMissions || teacherStore.isLoadingClasses)

// Computed
const classOptions = computed(() => {
  return classes.value.map(c => ({ value: c.id, label: c.name }))
})

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    activeFilters.value.length > 0 ||
    activeRarityFilters.value.length > 0 ||
    activeStatusFilters.value.length > 0
  )
})

const resetFilters = () => {
  searchQuery.value = ''
  activeFilters.value = []
  activeRarityFilters.value = []
  activeStatusFilters.value = []
}

const selectedClassIds = computed(() => {
  return activeFilters.value.length === 0 ? null : activeFilters.value
})

const selectedRarities = computed(() => {
  return activeRarityFilters.value.length === 0 ? null : activeRarityFilters.value
})

const selectedStatusFilters = computed(() => {
  return activeStatusFilters.value.length === 0 ? null : activeStatusFilters.value
})

const filteredMissions = computed(() => {
  let result = missions.value

  // Filter by class
  if (selectedClassIds.value) {
    result = result.filter(m => selectedClassIds.value!.includes(m.classId))
  }

  // Filter by rarity
  if (selectedRarities.value) {
    result = result.filter(m => selectedRarities.value!.includes(m.rarity))
  }

  // Filter by status (teacher status)
  if (selectedStatusFilters.value) {
    result = result.filter(m => selectedStatusFilters.value!.includes(m.teacherStatus))
  }

  return result
})

// Rarity order for sorting
const rarityOrder: Record<string, number> = {
  comun: 1,
  rara: 2,
  epica: 3,
  legendaria: 4,
}

const displayedMissions = computed(() => {
  let result = filteredMissions.value

  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      m =>
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.className.toLowerCase().includes(query)
    )
  }

  // Sort
  const [field, order] = sortBy.value.split('-')
  const sortedResult = [...result].sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'title':
        comparison = a.title.localeCompare(b.title, 'es')
        break
      case 'xp':
        comparison = a.xpReward - b.xpReward
        break
      case 'deadline':
        // null deadlines go to the end
        if (!a.deadline && !b.deadline) comparison = 0
        else if (!a.deadline) comparison = 1
        else if (!b.deadline) comparison = -1
        else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        break
      case 'rarity':
        comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity]
        break
      case 'completion':
        // Sort by completion percentage
        const aCompletion = a.totalStudents > 0 ? a.completedCount / a.totalStudents : 0
        const bCompletion = b.totalStudents > 0 ? b.completedCount / b.totalStudents : 0
        comparison = aCompletion - bCompletion
        break
    }

    return order === 'desc' ? -comparison : comparison
  })

  return sortedResult
})

// Methods
const getEmptyStateMessage = () => {
  if (searchQuery.value.trim()) {
    return `No se encontraron misiones para "${searchQuery.value}"`
  }
  if (selectedClassIds.value) {
    return selectedClassIds.value.length === 1
      ? 'No hay misiones en esta clase'
      : 'No hay misiones en las clases seleccionadas'
  }
  if (selectedStatusFilters.value) {
    return 'No hay misiones con los estados seleccionados'
  }
  if (selectedRarities.value) {
    return 'No hay misiones con las rarezas seleccionadas'
  }
  return 'No hay misiones creadas todavía'
}

const navigateToMission = (mission: TeacherMission) => {
  navigateTo(`/profesor/clases/${mission.classId}/misiones/${mission.id}`)
}

// Load data on mount (use store with cache)
onMounted(async () => {
  await Promise.all([
    teacherStore.ensureRecentMissions(), // Cached: ALL missions
    teacherStore.ensureClasses(), // Cached: ALL classes
  ])
})
</script>
