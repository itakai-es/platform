<template>
  <div class="select-none">
    <!-- Cabecera: mes + navegación -->
    <div class="mb-2 flex items-center justify-between">
      <button
        type="button"
        class="rounded-lg p-1.5 text-navy-700 hover:bg-gray-100"
        aria-label="Mes anterior"
        @click="prev"
      >
        <ChevronLeftIcon class="h-4 w-4" />
      </button>
      <span class="text-sm font-semibold capitalize text-navy-700">{{ monthLabel }}</span>
      <button
        type="button"
        class="rounded-lg p-1.5 text-navy-700 hover:bg-gray-100"
        aria-label="Mes siguiente"
        @click="next"
      >
        <ChevronRightIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Cabecera de días -->
    <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-secondary">
      <span v-for="d in WEEKDAYS" :key="d">{{ d }}</span>
    </div>

    <!-- Rejilla -->
    <div class="mt-1 grid grid-cols-7 gap-1">
      <component
        :is="interactive ? 'button' : 'div'"
        v-for="day in days"
        :key="day.key"
        :type="interactive ? 'button' : undefined"
        class="flex aspect-square items-center justify-center rounded-lg text-sm transition-colors"
        :class="cellClass(day)"
        @click="interactive && $emit('day-click', day.date)"
      >
        {{ day.date.getDate() }}
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { dateKey, weekdayMon0, type DayStatus } from '~/composables/useClassCalendar'

const props = withDefaults(
  defineProps<{
    statusOf: (date: Date) => DayStatus
    /** Mes inicial "YYYY-MM-DD"; por defecto el mes actual. */
    initialMonth?: string
    interactive?: boolean
  }>(),
  { initialMonth: '', interactive: true }
)

defineEmits<{ 'day-click': [date: Date] }>()

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function firstOfMonth(): Date {
  if (props.initialMonth) {
    const [y, m] = props.initialMonth.split('-').map(Number)
    if (y && m) return new Date(y, m - 1, 1)
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

const cursor = ref<Date>(firstOfMonth())
const todayKey = dateKey(new Date())

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
)

// 6 semanas (42 celdas) empezando en lunes.
const days = computed(() => {
  const start = new Date(cursor.value)
  start.setDate(1 - weekdayMon0(cursor.value))
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return { date, key: dateKey(date) }
  })
})

function prev() {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() - 1, 1)
}
function next() {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 1)
}

function cellClass(day: { date: Date; key: string }): string {
  const inMonth = day.date.getMonth() === cursor.value.getMonth()
  const status = props.statusOf(day.date)
  const parts: string[] = []

  if (!inMonth) parts.push('opacity-40')
  if (day.key === todayKey) parts.push('ring-2 ring-navy-700/40')

  if (status === 'class') parts.push('bg-[#6cf3af] font-semibold text-navy-700')
  else if (status === 'off') parts.push('bg-gray-100 text-gray-400 line-through')
  else parts.push('text-navy-700', props.interactive ? 'hover:bg-gray-100' : '')

  return parts.filter(Boolean).join(' ')
}
</script>
