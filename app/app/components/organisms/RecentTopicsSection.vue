<template>
  <article class="rounded-2xl bg-[#6CF3AF] shadow-lg p-4 sm:p-6">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-3 sm:mb-4">
      <BookOpenIcon class="w-5 h-5 sm:w-6 sm:h-6 text-navy-700" />
      <h3 class="text-xl sm:text-2xl font-extrabold text-navy-700">{{ title }}</h3>
    </div>

    <!-- Topics List -->
    <div class="space-y-3 sm:space-y-4">
      <div
        v-for="topic in topics"
        :key="topic.id"
        class="bg-white rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4"
      >
        <!-- Left: Topic info -->
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-navy-700 truncate">{{ topic.name }}</h4>
          <p class="text-xs text-text-secondary">{{ getStatusLabel(topic.status) }}</p>
        </div>

        <!-- Right: Progress bar + badge -->
        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <!-- Progress Bar - Responsive width -->
          <div class="w-16 sm:w-28 md:w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              :class="[
                'h-full rounded-full transition-all duration-500',
                getProgressBarClasses(topic.progress),
              ]"
              :style="{ width: `${topic.progress}%` }"
            />
          </div>
          <span
            :class="[
              'text-xs sm:text-sm font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap w-11 sm:w-14 text-center',
              getProgressBadgeClasses(topic.progress),
            ]"
          >
            {{ topic.progress }}%
          </span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!topics.length" class="text-center py-8 text-text-secondary">
        <p>{{ t('student.dashboard.recent_topics_empty') }}</p>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const { t } = useI18n()

/**
 * RecentTopicsSection - Sección de temas recientes
 *
 * Lista de temas con su progreso individual, mostrando
 * el estado (completado, en progreso, próximamente) y
 * una barra de progreso visual.
 */

import { BookOpenIcon } from '@heroicons/vue/24/outline'
import type { RecentTopic } from '~/types/mission.types'

interface Props {
  topics: RecentTopic[]
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Temas Recientes',
})

const getStatusLabel = (status: RecentTopic['status']) => {
  const labels = {
    completado: 'Completado',
    en_progreso: 'En progreso',
    proximo: 'Próximamente',
  }
  return labels[status]
}

const getProgressBadgeClasses = (_progress: number) => {
  return 'bg-navy-700 text-white'
}

const getProgressBarClasses = (_progress: number) => {
  return 'bg-navy-700'
}
</script>
