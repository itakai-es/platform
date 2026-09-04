<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Page Header -->
    <PageHeader
      :title="t('student.achievements.page_title')"
      :subtitle="t('student.achievements.page_subtitle')"
    />

    <!-- Filter Bar (shared with /teacher/badges for consistency) -->
    <FilterBar
      v-if="!isLoadingBadges && badges.length > 0"
      :search="searchQuery"
      :sort="selectedStatus"
      :results-count="sortedBadges.length"
      :search-placeholder="t('student.achievements.filter.search_placeholder')"
      :sort-options="statusOptions"
      :has-active-filters="selectedCategories.length > 0 || selectedRarities.length > 0"
      :active-filter-count="selectedCategories.length + selectedRarities.length"
      variant="red"
      @update:search="searchQuery = $event"
      @update:sort="selectedStatus = $event"
      @reset="resetFilters"
    >
      <template #filters>
        <MultiSelectDropdown
          v-model="selectedCategories"
          :options="categoryOptions"
          :all-label="t('student.achievements.filter.all_categories')"
          :plural-label="t('student.achievements.filter.plural_categories')"
          class="w-full sm:w-auto"
        />
        <MultiSelectDropdown
          v-model="selectedRarities"
          :options="rarityOptions"
          :all-label="t('student.achievements.filter.all_rarities')"
          :plural-label="t('student.achievements.filter.plural_rarities')"
          class="w-full sm:w-auto"
        />
      </template>
    </FilterBar>

    <!-- Loading State -->
    <div
      v-if="isLoadingBadges"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      <div v-for="i in 18" :key="i" class="bg-white rounded-2xl p-4 shadow-sm">
        <div class="flex flex-col items-center">
          <Skeleton width="w-28" height="h-28" class="rounded-full mb-4" />
          <Skeleton width="w-24" height="h-5" class="mb-2" />
          <Skeleton width="w-16" height="h-6" class="rounded-full" />
        </div>
      </div>
    </div>

    <!-- Badges Grid -->
    <div
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      <BadgeRewardCard
        v-for="badge in sortedBadges"
        :key="badge.id"
        :badge="badge"
        :unlocked="badge.unlocked"
        @click="openBadgeDetail(badge)"
      />
    </div>

    <!-- Empty State -->
    <div v-if="!isLoadingBadges && sortedBadges.length === 0" class="text-center py-12">
      <TrophyIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-semibold text-navy-700 mb-2">
        {{ t('student.achievements.empty.title') }}
      </h3>
      <p class="text-text-secondary">
        {{ getEmptyMessage() }}
      </p>
    </div>

    <!-- Badge Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="selectedBadge"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="selectedBadge = null"
        >
          <div class="absolute inset-0 bg-black/50" @click="selectedBadge = null" />
          <div class="relative bg-white rounded-2xl p-5 xs:p-6 max-w-sm w-full shadow-xl">
            <!-- Close button -->
            <button
              class="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              @click="selectedBadge = null"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>

            <div class="flex flex-col items-center text-center">
              <!-- Badge Image (large) -->
              <div class="relative mb-4">
                <img
                  :src="getImageUrl(selectedBadge.imageUrl)"
                  :alt="selectedBadge.name"
                  draggable="false"
                  class="w-32 h-32 xs:w-36 xs:h-36 object-cover rounded-full drop-shadow-lg select-none"
                  :class="{ 'grayscale opacity-40': !selectedBadge.unlocked }"
                />
                <!-- Lock icon for locked badges -->
                <div
                  v-if="!selectedBadge.unlocked"
                  class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center shadow"
                >
                  <LockClosedIcon class="w-4 h-4 text-white" />
                </div>
              </div>

              <!-- Rarity badge -->
              <span
                class="px-3 py-1 rounded-full text-xs font-semibold mb-3"
                :class="
                  selectedBadge.unlocked
                    ? getRarityClasses(selectedBadge.rarity)
                    : 'bg-gray-100 text-gray-400'
                "
              >
                {{ getRarityLabel(selectedBadge.rarity) }}
              </span>

              <!-- Name -->
              <h2 class="text-lg xs:text-xl font-bold text-navy-700 mb-2">
                {{ selectedBadge.name }}
              </h2>

              <!-- Description -->
              <p class="text-sm text-navy-700/70 mb-4">{{ selectedBadge.description }}</p>

              <!-- Unlock info -->
              <div v-if="selectedBadge.unlocked" class="w-full">
                <div class="bg-green/20 rounded-xl p-4 text-left">
                  <p class="text-sm text-navy-700">
                    <CheckCircleIcon class="w-4 h-4 inline-block mr-1 text-green" />
                    {{
                      t('student.achievements.badge_detail.unlocked_on', {
                        date: formatDate(selectedBadge.unlockedAt),
                      })
                    }}
                  </p>
                  <p v-if="selectedBadge.missionName" class="text-sm text-navy-700/70 mt-1">
                    {{
                      t('student.achievements.badge_detail.mission_label', {
                        name: selectedBadge.missionName,
                      })
                    }}
                  </p>
                  <p v-if="selectedBadge.className" class="text-sm text-navy-700/70">
                    {{
                      t('student.achievements.badge_detail.class_label', {
                        name: selectedBadge.className,
                      })
                    }}
                  </p>
                </div>
              </div>

              <!-- Progress info for locked -->
              <div v-else-if="selectedBadge.progress" class="w-full">
                <div class="bg-gray-100 rounded-xl p-4">
                  <div class="flex justify-between text-sm mb-2">
                    <span class="text-navy-700/70">{{
                      t('student.achievements.badge_detail.progress_label')
                    }}</span>
                    <span class="font-semibold text-navy-700">
                      {{ selectedBadge.progress.current }}/{{ selectedBadge.progress.total }}
                    </span>
                  </div>
                  <div class="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-purple rounded-full"
                      :style="{
                        width: `${(selectedBadge.progress.current / selectedBadge.progress.total) * 100}%`,
                      }"
                    />
                  </div>
                </div>
              </div>

              <!-- Close button -->
              <Button variant="primary" class="mt-5" full-width @click="selectedBadge = null">
                {{ t('student.achievements.badge_detail.close') }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { TrophyIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { LockClosedIcon } from '@heroicons/vue/24/solid'

const { getImageUrl } = useImageUrl()
const { t } = useI18n()

useHead({
  title: computed(() => t('student.achievements.meta.title')),
  meta: [
    { name: 'description', content: computed(() => t('student.achievements.meta.description')) },
  ],
})

definePageMeta({
  layout: 'student',
  middleware: ['auth', 'role'],
})

// Types
interface BadgeProgress {
  current: number
  total: number
}

interface Badge {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: string
  unlocked: boolean
  unlockedAt: string | null
  missionName?: string | null
  className?: string | null
  progress?: BadgeProgress
}

interface BadgeStats {
  totalBadges: number
  unlockedBadges: number
  completionPercentage: number
  recentBadges: Badge[]
}

interface Category {
  id: string
  name: string
  count: number
}

// Store
const gamificationStore = useGamificationStore()
const { badges, badgeStats, badgeCategories, isLoadingBadges } = storeToRefs(gamificationStore)

// Local state
const selectedBadge = ref<Badge | null>(null)

// Filter state
const searchQuery = ref('')
const selectedCategories = ref<string[]>([])
const selectedRarities = ref<string[]>([])
const selectedStatus = ref('all')

// Filter options
const rarityOptions = computed(() => [
  { value: 'common', label: t('student.achievements.rarity.common') },
  { value: 'rare', label: t('student.achievements.rarity.rare') },
  { value: 'epic', label: t('student.achievements.rarity.epic') },
  { value: 'legendary', label: t('student.achievements.rarity.legendary') },
])

const statusOptions = computed(() => [
  { value: 'all', label: t('student.achievements.filter.status_all') },
  { value: 'unlocked', label: t('student.achievements.filter.status_unlocked') },
  { value: 'locked', label: t('student.achievements.filter.status_locked') },
])

// Category options from API data
const categoryOptions = computed(() => {
  return badgeCategories.value
    .filter(c => c.id !== 'all')
    .map(c => ({ value: c.id, label: c.name }))
})

// Check if filters are active
const hasActiveFilters = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    selectedCategories.value.length > 0 ||
    selectedRarities.value.length > 0 ||
    selectedStatus.value !== 'all'
  )
})

// Reset filters
const resetFilters = () => {
  searchQuery.value = ''
  selectedCategories.value = []
  selectedRarities.value = []
  selectedStatus.value = 'all'
}

// Computed
const sortedBadges = computed(() => {
  let filtered = badges.value

  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(
      b => b.name.toLowerCase().includes(query) || b.description.toLowerCase().includes(query)
    )
  }

  // Filter by category
  if (selectedCategories.value.length > 0) {
    filtered = filtered.filter(b => selectedCategories.value.includes(b.category))
  }

  // Filter by rarity
  if (selectedRarities.value.length > 0) {
    filtered = filtered.filter(b => selectedRarities.value.includes(b.rarity))
  }

  // Filter by status
  if (selectedStatus.value === 'unlocked') {
    filtered = filtered.filter(b => b.unlocked)
  } else if (selectedStatus.value === 'locked') {
    filtered = filtered.filter(b => !b.unlocked)
  }

  // Sort alphabetically by name
  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

// Methods
const openBadgeDetail = (badge: Badge) => {
  selectedBadge.value = badge
}

const getEmptyMessage = () => {
  if (badges.value.length === 0) {
    return t('student.achievements.empty.no_badges_yet')
  }
  if (searchQuery.value.trim()) {
    return t('student.achievements.empty.search_no_results', { query: searchQuery.value })
  }
  if (hasActiveFilters.value) {
    return t('student.achievements.empty.filter_no_results')
  }
  return t('student.achievements.empty.default')
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const getRarityClasses = (rarity: string) => {
  const classes: Record<string, string> = {
    common: 'bg-gray-200 text-gray-700',
    rare: 'bg-sky-100 text-sky-700',
    epic: 'bg-violet-100 text-violet-700',
    legendary: 'bg-amber-100 text-amber-800',
  }
  return classes[rarity] || classes.common
}

const getRarityLabel = (rarity: string) => {
  const labels: Record<string, string> = {
    common: t('student.achievements.rarity.common'),
    rare: t('student.achievements.rarity.rare'),
    epic: t('student.achievements.rarity.epic'),
    legendary: t('student.achievements.rarity.legendary'),
  }
  return labels[rarity] || t('student.achievements.rarity.common')
}

// Lifecycle
onMounted(() => {
  gamificationStore.ensureBadges()
})
</script>

<style scoped>
/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
