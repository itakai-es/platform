<template>
  <div class="flex gap-3 bg-white rounded-xl p-3 items-start">
    <!-- Colored dot -->
    <div :class="['w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5', dotClass]" />

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm text-navy-700">
        <strong>{{ log.title }}</strong>
      </p>
      <p class="text-sm text-navy-700/70 mt-0.5">{{ log.message }}</p>
      <div class="flex items-center gap-2 mt-1 flex-wrap">
        <span v-if="log.service" class="text-xs font-medium text-navy-700/70">{{
          log.service
        }}</span>
        <span v-if="log.service && categoryLabel" class="text-navy-700/20">·</span>
        <span v-if="categoryLabel" class="text-xs text-navy-700/70">{{ categoryLabel }}</span>
        <span class="text-xs text-navy-700/70 ml-auto">{{ formattedTimestamp }}</span>
      </div>
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
import type { SystemLog } from '~/types/admin.types'

interface Props {
  log: SystemLog
}

const props = defineProps<Props>()
const { t } = useI18n()

const levelIcon = computed(() => {
  switch (props.log.level) {
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

const dotClass = computed(() => {
  switch (props.log.level) {
    case 'error':
      return 'bg-red'
    case 'warning':
      return 'bg-yellow-500'
    case 'success':
      return 'bg-green-500'
    case 'info':
      return 'bg-sky'
    default:
      return 'bg-gray-400'
  }
})

const indicatorBgClass = computed(() => {
  switch (props.log.level) {
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
  switch (props.log.level) {
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

const badgeLabel = computed(() => {
  switch (props.log.level) {
    case 'success':
      return t('admin.system_logs.levels.success')
    case 'warning':
      return t('admin.system_logs.levels.warning')
    case 'error':
      return t('admin.system_logs.levels.error')
    case 'info':
      return t('admin.system_logs.levels.info')
    default:
      return ''
  }
})

const categoryLabel = computed(() => {
  if (!props.log.category) return ''
  return t(`admin.system_logs.categories.${props.log.category}`)
})

const formattedTimestamp = computed(() => {
  const raw = props.log.createdAt
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
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>
