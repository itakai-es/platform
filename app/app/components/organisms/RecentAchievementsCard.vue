<template>
  <Card type="pending">
    <CardHeader :title="title" :icon="TrophyIcon" title-tag="h3" />

    <!-- Achievements List -->
    <div class="space-y-6">
      <CardItem v-for="achievement in achievements" :key="achievement.id" padding="sm">
        <!-- Achievement Icon -->
        <div
          class="w-10 h-10 rounded-xl bg-yellow-light flex items-center justify-center flex-shrink-0"
        >
          <span class="text-2xl">{{ getAchievementEmoji(achievement.icon) }}</span>
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-semibold text-navy-700 truncate">{{ achievement.name }}</p>
          <p class="text-sm text-text-secondary">{{ achievement.earnedAt }}</p>
        </div>
      </CardItem>

      <!-- Empty State -->
      <CardItem v-if="!achievements.length" padding="lg" layout="column" centered>
        <p class="text-sm text-navy-700/80">{{ t('student.dashboard.recent_badges_empty') }}</p>
      </CardItem>
    </div>
  </Card>
</template>

<script setup lang="ts">
const { t } = useI18n()

/**
 * RecentAchievementsCard - Card de insignias recientes
 *
 * Card rosa que muestra las últimas insignias obtenidas
 * por el estudiante en la clase.
 */

import { TrophyIcon } from '@heroicons/vue/24/solid'
import type { RecentAchievement } from '~/types/mission.types'

interface Props {
  achievements: RecentAchievement[]
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Insignias Recientes',
})

const getAchievementEmoji = (icon: string) => {
  const emojiMap: Record<string, string> = {
    trophy: '🏆',
    star: '⭐',
    medal: '🥇',
    fire: '🔥',
    crown: '👑',
    rocket: '🚀',
    book: '📚',
    brain: '🧠',
    target: '🎯',
    lightning: '⚡',
  }

  if (icon && icon.charCodeAt(0) > 127) {
    return icon
  }

  return emojiMap[icon] || '🏆'
}
</script>
