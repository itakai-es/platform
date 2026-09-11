<template>
  <div class="flex items-center gap-3 py-1">
    <span class="text-xs font-medium text-navy-700/70 w-24 flex-shrink-0">{{ label }}</span>
    <div class="flex-1 h-5 bg-navy-700/10 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2"
        :style="{ width: `${percentage ?? 0}%`, backgroundColor: color }"
      >
        <span v-if="(percentage ?? 0) > 15" class="text-[10px] font-bold text-white leading-none">{{
          value
        }}</span>
      </div>
    </div>
    <span v-if="(percentage ?? 0) <= 15" class="text-xs font-bold text-navy-700 w-8 text-right">{{
      value
    }}</span>
    <span v-if="showCount" class="text-[10px] text-navy-700/70 w-14 text-right font-mono">{{
      formatCount(value)
    }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: number
    percentage?: number
    color?: string
    showCount?: boolean
  }>(),
  {
    color: '#8B5CF6',
    showCount: false,
  }
)

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}
</script>
