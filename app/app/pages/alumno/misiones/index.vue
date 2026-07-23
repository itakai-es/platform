<template>
  <div class="space-y-4 xs:space-y-5 sm:space-y-6">
    <!-- Page Header -->
    <PageHeader
      :title="t('student.missions.page_title')"
      :subtitle="t('student.missions.page_subtitle')"
    />

    <!-- Filters Row -->
    <MissionFilterBar
      v-model:search="searchQuery"
      v-model:rarity-filters="activeRarityFilters"
      v-model:status-filters="activeStatusFilters"
      v-model:sort="sortBy"
      v-model:class-filters="activeClassFilters"
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
      :title="t('student.missions.empty.title')"
      :description="getEmptyStateMessage()"
    />

    <!-- Missions Grid -->
    <CardCollection v-else :view="view">
      <MissionCardEnhanced
        v-for="mission in displayedMissions"
        :id="mission.id"
        :key="mission.id"
        :class-id="mission.classId"
        :title="mission.title"
        :description="mission.description"
        :status="mission.status"
        :rarity="mission.rarity"
        :progress="mission.progress"
        :time-remaining="mission.timeRemaining"
        :deadline="mission.deadline"
        :xp-reward="mission.xpReward"
        :coin-reward="mission.coinReward"
        :mana-reward="mission.manaReward"
        :earned-xp="mission.earnedXp"
        :earned-coins="mission.earnedCoins"
        :earned-mana="mission.earnedMana"
        :background-image="mission.backgroundImage"
        :class-name="mission.className"
        :layout="view"
        compact
      />
    </CardCollection>
  </div>
</template>

<script setup lang="ts">
import { RocketLaunchIcon } from '@heroicons/vue/24/outline'
import type { MissionStatus, MissionRarity } from '~/types/mission.types'

const { t } = useI18n()
const view = useViewMode('student-missions')

interface StudentMission {
  id: string
  classId: string
  className: string
  title: string
  description: string
  status: MissionStatus
  rarity: MissionRarity
  progress: number
  timeRemaining?: string
  deadline?: string | null
  xpReward: number
  coinReward?: number
  manaReward?: number
  earnedXp?: number
  earnedCoins?: number
  earnedMana?: number
  backgroundImage?: string
}

interface ClassOption {
  id: string
  name: string
}

useHead({
  title: computed(() => t('student.missions.meta.title')),
  meta: [{ name: 'description', content: computed(() => t('student.missions.meta.description')) }],
})

definePageMeta({
  layout: 'student',
  middleware: ['auth', 'role'],
})

// Stores
const studentStore = useStudentStore()
const classesStore = useClassesStore()

// State
const searchQuery = ref('')
const activeClassFilters = ref<string[]>([])
const activeRarityFilters = ref<string[]>([])
const activeStatusFilters = ref<string[]>([])
const sortBy = ref('deadline-asc')

// Use store data
const missions = computed(() => studentStore.missions)
const classes = computed(() => classesStore.classes.map(c => ({ id: c.id, name: c.name || '' })))
const loading = computed(() => studentStore.isLoadingMissions || classesStore.isLoadingClasses)

// Rarity order for sorting
const rarityOrder: Record<string, number> = {
  comun: 1,
  rara: 2,
  epica: 3,
  legendaria: 4,
}

// Computed
const classOptions = computed(() => {
  return classes.value.map(c => ({ value: c.id, label: c.name }))
})

const selectedClassIds = computed(() => {
  return activeClassFilters.value.length === 0 ? null : activeClassFilters.value
})

const filteredMissions = computed(() => {
  let result = missions.value

  // Filter by class
  if (selectedClassIds.value) {
    result = result.filter(m => selectedClassIds.value!.includes(m.classId))
  }

  // Filter by rarity
  if (activeRarityFilters.value.length > 0) {
    result = result.filter(m => activeRarityFilters.value.includes(m.rarity))
  }

  // Filter by status
  if (activeStatusFilters.value.length > 0) {
    result = result.filter(m => activeStatusFilters.value.includes(m.status))
  }

  return result
})

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
        // Use timeRemaining for sorting (null goes to end)
        if (!a.timeRemaining && !b.timeRemaining) comparison = 0
        else if (!a.timeRemaining) comparison = 1
        else if (!b.timeRemaining) comparison = -1
        else comparison = a.timeRemaining.localeCompare(b.timeRemaining)
        break
      case 'rarity':
        comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity]
        break
    }

    return order === 'desc' ? -comparison : comparison
  })

  return sortedResult
})

// Methods
const resetFilters = () => {
  searchQuery.value = ''
  activeClassFilters.value = []
  activeRarityFilters.value = []
  activeStatusFilters.value = []
}

const getEmptyStateMessage = () => {
  if (searchQuery.value.trim()) {
    return t('student.missions.empty.search_no_results', { query: searchQuery.value })
  }
  if (selectedClassIds.value) {
    return selectedClassIds.value.length === 1
      ? t('student.missions.empty.class_no_missions_single')
      : t('student.missions.empty.class_no_missions_multiple')
  }
  if (activeRarityFilters.value.length > 0) {
    return t('student.missions.empty.rarity_no_missions')
  }
  if (activeStatusFilters.value.length > 0) {
    return t('student.missions.empty.status_no_missions')
  }
  return t('student.missions.empty.coming_soon')
}

// Load data on mount (use store with cache)
onMounted(async () => {
  await Promise.all([
    studentStore.ensureStudentMissions(), // Load ALL missions without limit
    classesStore.ensureStudentClasses(), // Load ALL classes without limit
  ])
})
</script>
