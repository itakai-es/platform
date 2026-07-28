<script setup lang="ts">
import { UserIcon } from '@heroicons/vue/24/solid'

/**
 * ClassXPBar - XP and level display for a specific class
 *
 * Shows the student's avatar, level, title, XP progress, and ranking
 * within a specific class context. Avatar and nickname are per-class.
 */
interface Props {
  level: number
  title: string
  /** Color del tramo de nivel (configurable por clase). */
  color?: string
  nextTitle?: string
  name?: string
  username?: string
  avatar?: string
  currentXp: number
  requiredXp: number
  progress: number
  rank: number
  totalStudents: number
}

const props = defineProps<Props>()

// Marco del color del tramo de nivel alrededor del avatar (doble anillo).
const ringStyle = computed(() =>
  props.color ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${props.color}` } : undefined
)
</script>

<template>
  <article
    class="rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg"
    :style="{
      backgroundColor: 'var(--color-card-xpbar)',
      borderLeft: 'var(--card-accent-left) solid var(--color-card-accent)',
    }"
    data-testid="class-xp-bar"
  >
    <div class="bg-white rounded-xl p-3 sm:p-4">
      <!-- Stacked Layout: Mobile (< 640px) + Medium Desktop (1024px - 1280px) -->
      <div class="sm:hidden lg:block xl:hidden">
        <!-- Top Row: Avatar/Name + Ranking -->
        <div class="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <div class="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 min-w-0">
            <div
              class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0"
              :style="ringStyle"
            >
              <img
                v-if="avatar"
                :src="avatar"
                :alt="name || username"
                class="w-full h-full object-contain"
              />
              <UserIcon v-else class="w-6 h-6 sm:w-8 sm:h-8 text-navy-700" />
            </div>
            <div class="min-w-0">
              <p
                v-if="name"
                class="text-navy-700 font-bold text-base sm:text-lg leading-tight truncate"
              >
                {{ name }}
              </p>
              <p v-if="username" class="text-text-secondary text-xs sm:text-sm truncate">
                @{{ username }}
              </p>
            </div>
          </div>

          <div class="flex-shrink-0 text-right">
            <p class="text-text-secondary text-xs sm:text-sm mb-0.5">Ranking</p>
            <p class="text-navy-700 font-bold text-lg sm:text-xl tabular-nums whitespace-nowrap">
              {{ rank
              }}<span class="text-text-secondary font-normal text-sm sm:text-base">
                / {{ totalStudents }}</span
              >
            </p>
          </div>
        </div>

        <!-- Bottom Row: Progress Bar (full width) -->
        <div>
          <div class="flex items-baseline justify-between mb-1 sm:mb-1.5">
            <p class="text-navy-700 font-medium text-xs sm:text-sm mr-2 flex items-center gap-1.5 min-w-0">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: color || '#38BDF8' }"
              />
              <span class="truncate">Nivel {{ level }} · {{ title }}</span>
            </p>
            <span
              class="text-xs sm:text-sm font-medium text-text-secondary tabular-nums flex-shrink-0"
            >
              {{ currentXp }}/{{ requiredXp }} XP
            </span>
          </div>
          <div class="h-2 sm:h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-[#7DD3FC] to-[#38BDF8] rounded-full transition-all duration-500"
              :style="{ width: `${progress}%` }"
              data-testid="class-xp-bar-fill"
            />
          </div>
        </div>
      </div>

      <!-- Three Columns Layout: Tablet (640px - 1024px) + Large Desktop (≥ 1280px) -->
      <div class="hidden sm:flex lg:hidden xl:flex items-center gap-4">
        <!-- Avatar + Name -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <div
            class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0"
            :style="ringStyle"
          >
            <img
              v-if="avatar"
              :src="avatar"
              :alt="name || username"
              class="w-full h-full object-contain"
            />
            <UserIcon v-else class="w-8 h-8 text-navy-700" />
          </div>
          <div class="min-w-0">
            <p v-if="name" class="text-navy-700 font-bold text-lg leading-tight truncate">
              {{ name }}
            </p>
            <p v-if="username" class="text-text-secondary text-sm truncate">@{{ username }}</p>
          </div>
        </div>

        <!-- XP Progress - Center (grows to fill space) -->
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between mb-1.5">
            <p class="text-navy-700 font-medium text-sm mr-2 flex items-center gap-1.5 min-w-0">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: color || '#38BDF8' }"
              />
              <span class="truncate">Nivel {{ level }} · {{ title }}</span>
            </p>
            <span class="text-sm font-medium text-text-secondary tabular-nums flex-shrink-0">
              {{ currentXp }}/{{ requiredXp }} XP
            </span>
          </div>
          <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-[#7DD3FC] to-[#38BDF8] rounded-full transition-all duration-500"
              :style="{ width: `${progress}%` }"
            />
          </div>
        </div>

        <!-- Ranking -->
        <div class="flex-shrink-0 text-right">
          <p class="text-text-secondary text-sm mb-0.5">Ranking</p>
          <p class="text-navy-700 font-bold text-2xl tabular-nums whitespace-nowrap">
            {{ rank
            }}<span class="text-text-secondary font-normal text-base"> / {{ totalStudents }}</span>
          </p>
        </div>
      </div>
    </div>
  </article>
</template>
