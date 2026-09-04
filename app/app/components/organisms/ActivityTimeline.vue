<template>
  <Card :type="type">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <ClockIcon class="w-6 h-6 text-navy-700" />
        <h3 class="text-2xl font-extrabold text-navy-700">{{ title }}</h3>
      </div>
      <slot name="header-actions" />
    </div>

    <div v-if="loading" class="space-y-3">
      <!-- Skeleton de 3 actividades -->
      <div v-for="i in 3" :key="i" class="flex gap-3 items-center">
        <Skeleton v-if="showAvatar" width="w-14" height="h-14" class="rounded-full flex-shrink-0" />
        <div v-else class="w-2 h-2 rounded-full bg-navy-medium mt-2 flex-shrink-0"></div>
        <div class="flex-1 space-y-1">
          <Skeleton :width="i === 2 ? 'w-4/5' : 'w-full'" height="h-4" />
          <Skeleton width="w-24" height="h-3" />
        </div>
      </div>
    </div>

    <div v-else-if="activities.length === 0" class="text-center py-8">
      <p class="text-navy-700/70 text-sm">{{ emptyMessage }}</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="flex gap-3 bg-white rounded-xl p-3 items-center"
      >
        <!-- Avatar (if showAvatar is true) -->
        <img
          v-if="showAvatar && avatar"
          :src="avatar"
          :alt="'Avatar'"
          class="w-14 h-14 rounded-full flex-shrink-0"
        />
        <!-- Colored dot (if no avatar) -->
        <div
          v-else
          :class="['w-2 h-2 rounded-full flex-shrink-0', getActivityColor(activity.type)]"
        ></div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm text-navy-700" v-html="activity.description"></p>
          <p class="text-xs text-navy-700/70">{{ formatTimestamp(activity.timestamp) }}</p>
        </div>

        <!-- Badge image (for badge_unlocked type) -->
        <div v-if="activity.badgeImage" class="flex-shrink-0">
          <img
            :src="activity.badgeImage"
            :alt="activity.badgeName || 'Badge'"
            class="w-14 h-14 drop-shadow-md"
          />
        </div>

        <!-- Indicator badge (for XP, level, mission, etc.) -->
        <div
          v-else-if="activity.indicator"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-shrink-0"
          :class="getIndicatorClasses(activity.indicator.type)"
        >
          <CheckCircleIcon
            v-if="activity.indicator.type === 'xp' || activity.indicator.type === 'mission'"
            class="w-4 h-4"
            :class="getIndicatorIconClass(activity.indicator.type)"
          />
          <ArrowTrendingUpIcon
            v-else-if="activity.indicator.type === 'level'"
            class="w-4 h-4"
            :class="getIndicatorIconClass(activity.indicator.type)"
          />
          <span
            class="text-xs font-semibold"
            :class="getIndicatorTextClass(activity.indicator.type)"
          >
            {{ activity.indicator.text }}
          </span>
        </div>
      </div>
    </div>

    <slot name="footer-actions" />
  </Card>
</template>

<script setup lang="ts">
import { ClockIcon, CheckCircleIcon, ArrowTrendingUpIcon } from '@heroicons/vue/24/outline'

interface ActivityIndicator {
  type: 'xp' | 'level' | 'mission'
  text: string
}

interface Activity {
  id: string
  description: string
  timestamp: Date | string
  type: string
  badgeImage?: string
  badgeName?: string
  indicator?: ActivityIndicator
}

interface Props {
  title: string
  activities: Activity[]
  loading: boolean
  type?: 'ia' | 'stats' | 'pending' | 'clases' | 'info'
  emptyMessage?: string
  colorMap?: Record<string, string>
  showAvatar?: boolean
  avatar?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'pending',
  emptyMessage: 'No hay actividad reciente',
  colorMap: () => ({
    mission_completed: 'bg-green-400',
    level_up: 'bg-gold',
  }),
  showAvatar: false,
  avatar: '',
})

const getActivityColor = (type: string): string => {
  return props.colorMap[type] || 'bg-gray-400'
}

const getIndicatorClasses = (type: string): string => {
  const classes: Record<string, string> = {
    xp: 'bg-mint/20',
    mission: 'bg-mint/20',
    level: 'bg-sky-light/20',
  }
  return classes[type] || 'bg-gray-100'
}

const getIndicatorIconClass = (type: string): string => {
  const classes: Record<string, string> = {
    xp: 'text-[#059669]',
    mission: 'text-[#059669]',
    level: 'text-sky',
  }
  return classes[type] || 'text-gray-500'
}

const getIndicatorTextClass = (type: string): string => {
  const classes: Record<string, string> = {
    xp: 'text-[#059669]',
    mission: 'text-[#059669]',
    level: 'text-sky',
  }
  return classes[type] || 'text-gray-500'
}

const formatTimestamp = (date: Date | string): string => {
  const now = new Date()
  const activityDate = new Date(date)
  const diffMs = now.getTime() - activityDate.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'hace un momento'
  if (diffMins === 1) return 'hace 1 minuto'
  if (diffMins < 60) return `hace ${diffMins} minutos`
  if (diffHours === 1) return 'hace 1 hora'
  if (diffHours < 24) return `hace ${diffHours} horas`
  if (diffDays === 1) return 'hace 1 día'
  return `hace ${diffDays} días`
}
</script>
