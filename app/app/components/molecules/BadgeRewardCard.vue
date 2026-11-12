<script setup lang="ts">
import { LockClosedIcon } from '@heroicons/vue/24/solid'
import { TrophyIcon, SparklesIcon } from '@heroicons/vue/24/outline'

const { getImageUrl } = useImageUrl()

export interface BadgeRewardData {
  id: string
  name: string
  description?: string
  imageUrl?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
}

interface Props {
  badge: BadgeRewardData
  unlocked?: boolean
  loadingImage?: boolean
  loadingName?: boolean
}

interface Emits {
  (e: 'click'): void
}

withDefaults(defineProps<Props>(), {
  unlocked: false,
  loadingImage: false,
  loadingName: false,
})

defineEmits<Emits>()
</script>

<template>
  <button
    class="bg-white rounded-2xl p-4 shadow-sm text-left hover:shadow-md transition-shadow w-full"
    @click="$emit('click')"
  >
    <div class="flex flex-col items-center text-center">
      <!-- Badge Image -->
      <div class="relative mb-4">
        <div
          class="w-28 h-28 rounded-full bg-white flex items-center justify-center overflow-hidden"
        >
          <!-- Loading skeleton -->
          <div
            v-if="loadingImage"
            class="w-28 h-28 rounded-full bg-gray-100 animate-pulse flex items-center justify-center"
          >
            <SparklesIcon class="w-8 h-8 text-gray-300 animate-pulse" />
          </div>
          <img
            v-else-if="badge.imageUrl"
            :src="getImageUrl(badge.imageUrl)"
            :alt="badge.name"
            draggable="false"
            class="w-full h-full object-cover drop-shadow-md select-none"
            :class="{ 'grayscale opacity-40': !unlocked }"
          />
          <div
            v-else
            class="w-28 h-28 rounded-full bg-navy-700/10 flex items-center justify-center"
          >
            <TrophyIcon class="w-14 h-14" :class="unlocked ? 'text-navy-700' : 'text-gray-400'" />
          </div>
        </div>
        <!-- Lock icon for locked badges -->
        <div
          v-if="!unlocked"
          class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center shadow-md"
        >
          <LockClosedIcon class="w-5 h-5 text-white" />
        </div>
      </div>

      <!-- Badge Name -->
      <div v-if="loadingName" class="h-5 w-24 bg-gray-100 animate-pulse rounded mb-2" />
      <h4
        v-else
        class="font-semibold text-base line-clamp-2 mb-2 leading-tight"
        :class="unlocked ? 'text-navy-700' : 'text-gray-400'"
      >
        {{ badge.name }}
      </h4>

      <!-- Su rareza, en el idioma de la app -->
      <BadgeRarityPill :rarity="badge.rarity" :unlocked="unlocked" />
    </div>
  </button>
</template>
