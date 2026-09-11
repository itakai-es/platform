<template>
  <div class="flex gap-3 bg-white rounded-xl p-3 items-start">
    <!-- Colored dot -->
    <div :class="['w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5', dotClass]" />

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm text-navy-700">
        <strong v-if="activity.userName">{{ activity.userName }}</strong>
        <template v-if="activity.userName && activity.title"> · </template>
        <template v-if="activity.title">{{ activity.title }}</template>
      </p>
      <p v-if="activity.description" class="text-sm text-navy-700/70 mt-0.5">
        {{ activity.description }}
      </p>
      <p class="text-xs text-navy-700/70 mt-1">{{ formattedTimestamp }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'
import type { SystemActivity } from '~/types/admin.types'

interface Props {
  activity: SystemActivity
}

const props = defineProps<Props>()

const dotClass = computed(() => {
  switch (props.activity.type) {
    case 'new_school':
      return 'bg-green-500'
    case 'new_users':
      return 'bg-purple'
    case 'alert':
      return 'bg-red'
    case 'system_update':
      return 'bg-sky'
    case 'missions_completed':
      return 'bg-gold'
    case 'user_action':
      return 'bg-yellow-500'
    default:
      return 'bg-gray-400'
  }
})

const severityIcon = computed(() => {
  switch (props.activity.severity) {
    case 'error':
      return ExclamationCircleIcon
    case 'warning':
      return ExclamationTriangleIcon
    case 'success':
      return CheckCircleIcon
    case 'info':
      return InformationCircleIcon
    default:
      return InformationCircleIcon
  }
})

const indicatorBgClass = computed(() => {
  switch (props.activity.severity) {
    case 'error':
      return 'bg-red/10'
    case 'warning':
      return 'bg-yellow/10'
    case 'success':
      return 'bg-mint/20'
    case 'info':
      return 'bg-sky-light/20'
    default:
      return 'bg-gray-100'
  }
})

const indicatorTextClass = computed(() => {
  switch (props.activity.severity) {
    case 'error':
      return 'text-red'
    case 'warning':
      return 'text-yellow-600'
    case 'success':
      return 'text-[#059669]'
    case 'info':
      return 'text-sky'
    default:
      return 'text-gray-500'
  }
})

const severityLabel = computed(() => {
  switch (props.activity.severity) {
    case 'success':
      return 'OK'
    case 'warning':
      return 'Aviso'
    case 'error':
      return 'Error'
    case 'info':
      return 'Info'
    default:
      return ''
  }
})

const formattedTimestamp = computed(() => {
  const raw = props.activity.createdAt || props.activity.timestamp
  if (!raw) return ''
  const date = new Date(raw)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffMins < 1) return 'hace un momento'
  if (diffMins < 60) return `hace ${diffMins} min`
  if (diffHours === 1) return 'hace 1 hora'
  if (diffHours < 24) return `hace ${diffHours} horas`
  if (diffDays === 1) return 'hace 1 día'
  if (diffDays < 7) return `hace ${diffDays} días`
  return date.toLocaleDateString('es-ES')
})
</script>
