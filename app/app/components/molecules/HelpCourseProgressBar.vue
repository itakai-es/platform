<template>
  <div class="space-y-1.5 text-sm font-medium" :class="onDark ? 'text-white' : 'text-navy-700'">
    <div class="flex justify-between gap-2">
      <span>{{ t('common.help.courses.progress_count', { done: state.done, total: state.total }) }}</span>
      <span aria-hidden="true" class="tabular-nums">{{ state.percent }} %</span>
    </div>
    <div
      role="progressbar"
      :aria-label="t('common.help.courses.progress')"
      :aria-valuenow="state.done"
      :aria-valuemax="state.total"
      class="h-1.5 overflow-hidden rounded-full"
      :class="onDark ? 'bg-white/20' : 'bg-bg-secondary'"
    >
      <div class="h-full rounded-full" :class="onDark ? 'bg-mint' : 'bg-purple'" :style="{ width: `${state.percent}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HelpCourseProgress } from '~/composables/useHelpCourses'

defineProps<{ state: HelpCourseProgress; onDark?: boolean }>()
const { t } = useI18n()
</script>
