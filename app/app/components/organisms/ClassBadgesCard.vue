<template>
  <Card type="pending">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <TrophyIcon class="w-5 h-5 sm:w-6 sm:h-6 text-navy-700" />
        <h3 class="text-navy-700">Insignias</h3>
      </div>
      <span class="text-xs sm:text-sm font-semibold text-navy-700/70">
        {{ unlockedCount }}/{{ badges.length }}
      </span>
    </div>

    <!-- Badges Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      <button
        v-for="badge in sortedBadges"
        :key="badge.id"
        class="bg-white rounded-2xl p-3 sm:p-4 shadow-sm"
        @click="$emit('badge-click', badge)"
      >
        <div class="flex flex-col items-center text-center">
          <!-- Badge Image -->
          <div class="relative mb-2 sm:mb-3">
            <div
              class="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden bg-gray-50"
            >
              <img
                :src="getImageUrl(badge.imageUrl)"
                :alt="badge.name"
                class="w-16 h-16 sm:w-20 sm:h-20 object-cover"
                :class="{ 'grayscale opacity-40': !badge.unlocked }"
              />
            </div>
            <!-- Lock icon for locked badges -->
            <div
              v-if="!badge.unlocked"
              class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center shadow"
            >
              <LockClosedIcon class="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <!-- Badge Name -->
          <p
            class="text-xs sm:text-sm font-semibold line-clamp-2 leading-tight mb-1"
            :class="badge.unlocked ? 'text-navy-700' : 'text-gray-400'"
          >
            {{ badge.name }}
          </p>

          <!-- Rarity indicator -->
          <span
            class="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium"
            :class="badge.unlocked ? getRarityClasses(badge.rarity) : 'bg-gray-100 text-gray-400'"
          >
            {{ getRarityLabel(badge.rarity) }}
          </span>
        </div>
      </button>
    </div>

    <!-- Empty State -->
    <CardItem v-if="!badges.length" padding="md" layout="column" centered>
      <p class="text-sm text-navy-700/70">{{ t('teacher.classes.detail.badges_empty') }}</p>
    </CardItem>
  </Card>
</template>

<script setup lang="ts">
const { t } = useI18n()

import { computed } from 'vue'
import { TrophyIcon } from '@heroicons/vue/24/outline'
import { LockClosedIcon } from '@heroicons/vue/24/solid'

const { getImageUrl } = useImageUrl()

interface ClassBadge {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  progress?: { current: number; total: number }
}

interface Props {
  badges: ClassBadge[]
}

const props = defineProps<Props>()

defineEmits<{
  'badge-click': [badge: ClassBadge]
}>()

const unlockedCount = computed(() => props.badges.filter(b => b.unlocked).length)

const sortedBadges = computed(() => {
  const rarityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 }

  return [...props.badges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })
})

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
    common: 'Común',
    rare: 'Rara',
    epic: 'Épica',
    legendary: 'Legendaria',
  }
  return labels[rarity] || 'Común'
}
</script>
