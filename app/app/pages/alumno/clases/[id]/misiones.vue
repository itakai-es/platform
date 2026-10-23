<template>
  <div class="space-y-6">
    <!-- Filtros (en el mapa no hay: va la clase entera, en su orden) -->
    <MissionFilterBar
      v-model:search="searchQuery"
      v-model:rarity-filters="rarityFilters"
      v-model:sort="sortBy"
      v-model:view="view"
      :view-modes="viewModes"
      :results-count="view === 'map' ? inClassOrder.length : displayed.length"
      @reset="resetFilters"
    />

    <!-- Mapa (en pruebas): de entrada, si la clase lo tiene encendido -->
    <MissionMap
      v-if="view === 'map' && inClassOrder.length"
      :missions="inClassOrder"
      mode="student"
      :class-id="classId"
    />

    <!-- Empty (con o sin filtros) -->
    <EmptyState
      v-else-if="view === 'map' ? !inClassOrder.length : !displayed.length"
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
        :deadline="mission.deadline"
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
import { DEFAULT_MISSION_SORT, sortMissions } from '~/utils/mission-sort'
import type { ViewMode } from '~/composables/useViewMode'

definePageMeta({ layout: 'student', middleware: ['auth', 'role'] })

const { t, locale } = useI18n()
const route = useRoute()
const classId = computed(() => route.params.id as string)
const { classMissions, classSettings } = useStudentClassDetail(classId)
// El mapa (en pruebas) es una vista más y, si la clase lo tiene encendido, la de entrada.
const mapOn = computed(() => classSettings.value.missionMap)
const viewModes = computed<ViewMode[]>(() =>
  mapOn.value ? ['grid', 'list', 'map'] : ['grid', 'list']
)
const view = useViewMode('student-class-missions', () => (mapOn.value ? 'map' : 'grid'), viewModes)

// Estado de filtros local (cada tab arranca limpio cada vez).
const searchQuery = ref('')
const rarityFilters = ref<string[]>([])
const sortBy = ref(DEFAULT_MISSION_SORT)

const missions = computed(() =>
  (classMissions.value || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    title: m.title as string,
    description: (m.description as string) || t('student.classes.detail.mission_no_description'),
    status: (m.status as MissionStatus) || 'activa',
    rarity: (m.rarity as MissionRarity) || 'comun',
    progress: (m.progress as number) || 0,
    // La fecha límite de verdad: con ella se ordena «Fecha» y la ve la tarjeta.
    deadline: (m.deadline as string | null | undefined) ?? null,
    orderIndex: m.orderIndex as number | undefined,
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
  return sortMissions(result, sortBy.value, locale.value)
})

// La clase entera en su orden, sin filtros: la del mapa.
const inClassOrder = computed(() => sortMissions(missions.value, DEFAULT_MISSION_SORT))

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
