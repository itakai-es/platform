<template>
  <div class="space-y-6">
    <!-- Filtros -->
    <MissionFilterBar
      v-model:search="searchQuery"
      v-model:rarity-filters="rarityFilters"
      v-model:sort="sortBy"
      v-model:view="view"
      :results-count="displayed.length"
      @reset="resetFilters"
    />

    <!-- Empty (con o sin filtros) -->
    <EmptyState
      v-if="!displayed.length"
      :icon="ClipboardDocumentListIcon"
      :title="t('student.classes.detail.missions_tab.empty_title')"
      :description="emptyMessage"
    />

    <!-- Grid -->
    <CardCollection v-else :view="view">
      <MissionCardEnhanced
        v-for="mission in displayed"
        :id="mission.id"
        :key="mission.id"
        :title="mission.title"
        :description="mission.description"
        :status="mission.status"
        :rarity="mission.rarity"
        :progress="mission.progress"
        :time-remaining="mission.timeRemaining"
        :xp-reward="mission.xpReward"
        :coin-reward="mission.coinReward"
        :mana-reward="mission.manaReward"
        :earned-xp="mission.earnedXp"
        :earned-coins="mission.earnedCoins"
        :earned-mana="mission.earnedMana"
        :background-image="mission.backgroundImage"
        :class-id="classId"
        :layout="view"
        compact
      />
    </CardCollection>
  </div>
</template>

<script setup lang="ts">
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import type { MissionStatus, MissionRarity } from '~/types/mission.types'

definePageMeta({ layout: 'student', middleware: ['auth', 'role'] })

const { t } = useI18n()
const route = useRoute()
const classId = computed(() => route.params.id as string)
const { classMissions } = useStudentClassDetail(classId)
const view = useViewMode('student-class-missions')

// Estado de filtros local (cada tab arranca limpio cada vez).
const searchQuery = ref('')
const rarityFilters = ref<string[]>([])
const sortBy = ref('deadline-asc')

const rarityOrder: Record<string, number> = { comun: 1, rara: 2, epica: 3, legendaria: 4 }

const missions = computed(() =>
  (classMissions.value || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    title: m.title as string,
    description: (m.description as string) || t('student.classes.detail.mission_no_description'),
    status: (m.status as MissionStatus) || 'activa',
    rarity: (m.rarity as MissionRarity) || 'comun',
    progress: (m.progress as number) || 0,
    timeRemaining: m.timeRemaining as string | undefined,
    xpReward: (m.xpReward as number) || 0,
    coinReward: (m.coinReward as number) || 0,
    manaReward: (m.manaReward as number) || 0,
    earnedXp: m.earnedXp as number | undefined,
    earnedCoins: m.earnedCoins as number | undefined,
    earnedMana: m.earnedMana as number | undefined,
    backgroundImage: m.backgroundImage as string | undefined,
  }))
)

const displayed = computed(() => {
  let result = missions.value
  if (rarityFilters.value.length > 0) {
    result = result.filter(m => rarityFilters.value.includes(m.rarity))
  }
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      m => m.title.toLowerCase().includes(query) || m.description.toLowerCase().includes(query)
    )
  }
  const [field, order] = sortBy.value.split('-')
  const sorted = [...result].sort((a, b) => {
    let comparison = 0
    switch (field) {
      case 'title':
        comparison = a.title.localeCompare(b.title, 'es')
        break
      case 'xp':
        comparison = a.xpReward - b.xpReward
        break
      case 'deadline':
        if (!a.timeRemaining && !b.timeRemaining) comparison = 0
        else if (!a.timeRemaining) comparison = 1
        else if (!b.timeRemaining) comparison = -1
        else comparison = a.timeRemaining.localeCompare(b.timeRemaining)
        break
      case 'rarity':
        comparison = (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0)
        break
    }
    return order === 'desc' ? -comparison : comparison
  })
  return sorted
})

function resetFilters() {
  searchQuery.value = ''
  rarityFilters.value = []
}

const emptyMessage = computed(() => {
  if (searchQuery.value.trim()) {
    return t('student.classes.detail.missions_tab.empty_search', { query: searchQuery.value })
  }
  if (rarityFilters.value.length > 0) {
    return t('student.classes.detail.missions_tab.empty_rarity')
  }
  return t('student.classes.detail.missions_tab.empty_default')
})
</script>
