<template>
  <div class="space-y-6">
    <PageHeader :title="t('admin.missions.title')" :subtitle="t('admin.missions.subtitle')" />

    <!-- Filters -->
    <FilterBar
      :search="searchQuery"
      :sort="sortBy"
      :results-count="filteredMissions.length"
      :search-placeholder="t('admin.missions.filters.search_placeholder')"
      :sort-options="sortOptions"
      variant="red"
      :has-active-filters="hasActiveFilters"
      :active-filter-count="activeFilterCount"
      @update:search="searchQuery = $event"
      @update:sort="sortBy = $event"
      @reset="clearAllFilters"
    >
      <template #filters>
        <SelectDropdown
          v-model="selectedStatus"
          :options="statusOptions"
          :placeholder="t('admin.missions.filters.all_statuses')"
        />
        <SelectDropdown
          v-model="selectedRarity"
          :options="rarityOptions"
          :placeholder="t('admin.missions.filters.all_rarities')"
        />
      </template>
    </FilterBar>

    <!-- Loading -->
    <CardGrid v-if="isLoadingMissions">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse"
      >
        <div class="p-4">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1">
              <div class="h-6 bg-gray-200 rounded w-48 mb-1.5" />
              <div class="h-4 bg-gray-100 rounded w-32" />
            </div>
            <div class="h-6 bg-gray-200 rounded-full w-16" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-gray-50 rounded-xl p-2.5 h-14" />
            <div class="bg-gray-50 rounded-xl p-2.5 h-14" />
          </div>
        </div>
      </div>
    </CardGrid>

    <!-- Empty -->
    <EmptyState
      v-else-if="filteredMissions.length === 0"
      :icon="RocketLaunchIcon"
      :title="t('admin.missions.empty.title')"
      :description="t('admin.missions.empty.description')"
    />

    <!-- Missions Grid -->
    <CardGrid v-else>
      <article
        v-for="mission in filteredMissions"
        :key="mission.id"
        class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
      >
        <div class="p-4">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="min-w-0 flex-1">
              <h3 class="font-bold text-navy-700 text-lg">{{ mission.title }}</h3>
              <p class="text-sm text-navy-700/50">
                {{ mission.className }} · {{ mission.teacherName }}
              </p>
            </div>
            <RarityBadge :rarity="mission.rarity as MissionRarity" />
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-lg font-bold text-navy-700">{{ mission.enigmaCount }}</p>
              <p class="text-xs text-navy-700/50 uppercase tracking-wide">Enigmas</p>
            </div>
            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-lg font-bold text-gold">{{ mission.xpReward }}</p>
              <p class="text-xs text-navy-700/50 uppercase tracking-wide">XP</p>
            </div>
            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-lg font-bold text-navy-700">{{ statusLabel(mission.status) }}</p>
              <p class="text-xs text-navy-700/50 uppercase tracking-wide">Estado</p>
            </div>
          </div>
        </div>
      </article>
    </CardGrid>
  </div>
</template>

<script setup lang="ts">
import { RocketLaunchIcon } from '@heroicons/vue/24/outline'
import type { MissionRarity } from '~/types/mission.types'

const { t } = useI18n()
useHead({ title: () => t('admin.missions.meta.title') })
definePageMeta({ layout: 'admin', middleware: ['auth', 'onboarding', 'role'], role: 'admin' })

const adminStore = useAdminStore()
const { missions, isLoadingMissions } = storeToRefs(adminStore)

const searchQuery = ref('')
const sortBy = ref('name-asc')
const selectedStatus = ref('')
const selectedRarity = ref('')

const sortOptions = computed(() => [
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
  { value: 'xp-desc', label: t('admin.missions.sort.xp_desc') },
  { value: 'enigmas-desc', label: t('admin.missions.sort.enigmas_desc') },
])

const statusOptions = computed(() => [
  { value: '', label: t('admin.missions.filters.all_statuses') },
  { value: 'activa', label: 'Activa' },
  { value: 'bloqueada', label: 'Bloqueada' },
])

const rarityOptions = computed(() => [
  { value: '', label: t('admin.missions.filters.all_rarities') },
  { value: 'comun', label: 'Común' },
  { value: 'rara', label: 'Rara' },
  { value: 'epica', label: 'Épica' },
  { value: 'legendaria', label: 'Legendaria' },
])

const activeFilterCount = computed(
  () => (selectedStatus.value ? 1 : 0) + (selectedRarity.value ? 1 : 0)
)

const hasActiveFilters = computed(() => selectedStatus.value !== '' || selectedRarity.value !== '')

const filteredMissions = computed(() => {
  let result = [...missions.value]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      m =>
        m.title.toLowerCase().includes(q) ||
        m.className.toLowerCase().includes(q) ||
        m.teacherName.toLowerCase().includes(q)
    )
  }

  if (selectedStatus.value) {
    result = result.filter(m => m.status === selectedStatus.value)
  }

  if (selectedRarity.value) {
    result = result.filter(m => m.rarity === selectedRarity.value)
  }

  switch (sortBy.value) {
    case 'name-asc':
      result.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'name-desc':
      result.sort((a, b) => b.title.localeCompare(a.title))
      break
    case 'xp-desc':
      result.sort((a, b) => b.xpReward - a.xpReward)
      break
    case 'enigmas-desc':
      result.sort((a, b) => b.enigmaCount - a.enigmaCount)
      break
  }

  return result
})

const clearAllFilters = () => {
  searchQuery.value = ''
  sortBy.value = 'name-asc'
  selectedStatus.value = ''
  selectedRarity.value = ''
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = { activa: 'Activa', bloqueada: 'Bloqueada' }
  return map[status] || status
}

onMounted(() => adminStore.ensureAllMissions({ limit: 1000 }))
</script>
