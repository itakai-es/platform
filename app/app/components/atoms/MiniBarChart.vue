<template>
  <div class="flex flex-col gap-2">
    <!-- Chart area -->
    <div class="flex items-end gap-1 h-28">
      <div
        v-for="(point, i) in data"
        :key="i"
        class="flex-1 rounded-t transition-all duration-200 hover:opacity-75 relative group cursor-default"
        :style="{ height: `${barHeight(point.value)}%`, backgroundColor: color, minHeight: '4px' }"
      >
        <!-- Tooltip -->
        <div
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none"
        >
          <div
            class="bg-navy-700 text-white text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap shadow-lg"
          >
            {{ formatValue(point.value) }}{{ unit ? ` ${unit}` : '' }}
          </div>
        </div>
      </div>
    </div>
    <!-- Labels -->
    <div class="flex gap-1">
      <div v-for="(point, i) in data" :key="i" class="flex-1 text-center">
        <span class="text-[9px] font-medium text-navy-700/70">{{ point.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimeSeriesPoint } from '~/types/admin.types'

const props = withDefaults(
  defineProps<{
    data: TimeSeriesPoint[]
    color?: string
    unit?: string
  }>(),
  {
    color: '#8B5CF6',
    unit: '',
  }
)

const maxValue = computed(() =>
  props.data.length > 0 ? Math.max(...props.data.map(d => d.value), 1) : 1
)

const barHeight = (value: number) => Math.max((value / maxValue.value) * 100, 3)

const formatValue = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}
</script>
