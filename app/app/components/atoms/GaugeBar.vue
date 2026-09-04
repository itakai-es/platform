<template>
  <div class="flex items-center gap-3">
    <span class="text-xs font-medium text-navy-700/70 w-24 flex-shrink-0">{{ label }}</span>
    <div class="flex-1 h-3 bg-navy-700/10 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="barColor"
        :style="{ width: `${percentage}%` }"
      />
    </div>
    <span :class="['text-xs font-mono font-bold text-right whitespace-nowrap', textColor]">
      {{ value }}{{ unit }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    value: number
    max: number
    unit?: string
    warnAt?: number
    dangerAt?: number
  }>(),
  {
    unit: '%',
    warnAt: 70,
    dangerAt: 90,
  }
)

const percentage = computed(() => Math.min((props.value / props.max) * 100, 100))

const barColor = computed(() => {
  const pct = percentage.value
  if (pct >= props.dangerAt) return 'bg-red-500'
  if (pct >= props.warnAt) return 'bg-yellow-500'
  return 'bg-purple'
})

const textColor = computed(() => {
  const pct = percentage.value
  if (pct >= props.dangerAt) return 'text-red-500'
  if (pct >= props.warnAt) return 'text-yellow-600'
  return 'text-navy-700'
})
</script>
