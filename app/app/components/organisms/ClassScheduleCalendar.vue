<template>
  <div class="space-y-3">
    <!-- Un bloque por tramo de horario; se pueden añadir tantos como se quiera -->
    <div
      v-for="(tramo, idx) in slots"
      :key="idx"
      class="flex flex-wrap items-start gap-x-4 gap-y-3"
    >
      <div>
        <label class="mb-1.5 block text-sm font-medium text-navy-700">{{
          t('teacher.schedule.starts_on')
        }}</label>
        <input
          v-model="tramo.startDate"
          type="date"
          :class="[fieldClass, 'w-40']"
          @change="emitChange"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-navy-700">{{
          t('teacher.schedule.time')
        }}</label>
        <div class="flex items-center gap-1.5">
          <input
            v-model="tramo.start"
            type="time"
            :class="[fieldClass, 'w-28']"
            @change="emitChange"
          />
          <span class="text-text-secondary">–</span>
          <input
            v-model="tramo.end"
            type="time"
            :class="[fieldClass, 'w-28']"
            @change="emitChange"
          />
        </div>
      </div>

      <div class="min-w-[240px] max-w-sm flex-1">
        <label class="mb-1.5 block text-sm font-medium text-navy-700">{{
          t('teacher.schedule.recurrence')
        }}</label>
        <div class="flex items-center gap-1.5">
          <div class="flex-1">
            <RecurrenceEditor
              :model-value="recurrenceOf(idx)"
              :start-date="tramo.startDate"
              @update:model-value="setRecurrence(idx, $event)"
            />
          </div>
          <button
            v-if="slots.length > 1"
            type="button"
            class="mt-0.5 p-1.5 rounded-full text-navy-700/60 hover:bg-gray-100"
            :title="t('teacher.schedule.remove_slot')"
            @click="removeSlot(idx)"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border border-dashed border-border-primary text-navy-700 hover:bg-gray-50"
      @click="addSlot"
    >
      <PlusIcon class="w-4 h-4" />
      {{ t('teacher.schedule.add_slot') }}
    </button>

    <!-- Vista previa del horario resultante (todos los tramos) -->
    <p v-if="scheduleText" class="text-xs text-text-secondary">
      <span class="font-medium">{{ t('teacher.schedule.preview') }}:</span> {{ scheduleText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { ScheduleConfig } from '~/types/schedule.types'
import { emptyScheduleConfig, normalizeScheduleSlots } from '~/types/schedule.types'
import { useClassCalendar, type RecurrenceLike } from '~/composables/useClassCalendar'

const props = defineProps<{ modelValue?: ScheduleConfig | ScheduleConfig[] | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: ScheduleConfig[]] }>()

const { t } = useI18n()

const fieldClass =
  'rounded-2xl border border-border-primary bg-surface px-3 py-2.5 text-sm text-navy-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:py-3 sm:text-base'

function normalizeSlot(v?: ScheduleConfig | null): ScheduleConfig {
  if (!v) return emptyScheduleConfig()
  return {
    freq: v.freq || 'weekly',
    weekdays: Array.isArray(v.weekdays) ? [...v.weekdays] : [],
    start: v.start || '',
    end: v.end || '',
    interval: Math.max(1, v.interval || 1),
    startDate: v.startDate || '',
    ends: v.ends
      ? { type: v.ends.type || 'never', onDate: v.ends.onDate, afterCount: v.ends.afterCount }
      : { type: 'never' },
    overrides: { ...(v.overrides || {}) },
  }
}

function normalizeAll(v?: ScheduleConfig | ScheduleConfig[] | null): ScheduleConfig[] {
  return normalizeScheduleSlots(v).map(normalizeSlot)
}

const slots = ref<ScheduleConfig[]>(normalizeAll(props.modelValue))

watch(
  () => props.modelValue,
  v => {
    const incoming = normalizeAll(v)
    if (JSON.stringify(incoming) !== JSON.stringify(slots.value)) slots.value = incoming
  }
)

const { scheduleText } = useClassCalendar(slots)

// Puente con RecurrenceEditor: expone/actualiza solo los campos de recurrencia
// del tramo idx.
function recurrenceOf(idx: number): RecurrenceLike {
  const c = slots.value[idx] ?? emptyScheduleConfig()
  return { freq: c.freq, interval: c.interval, weekdays: c.weekdays, ends: c.ends }
}

function setRecurrence(idx: number, r: RecurrenceLike) {
  const c = slots.value[idx]
  if (!c) return
  slots.value[idx] = {
    ...c,
    freq: r.freq,
    interval: r.interval,
    weekdays: [...r.weekdays],
    ends: { ...r.ends },
  }
  emitChange()
}

function addSlot() {
  // No se emite hasta que el profesor rellene algo del tramo nuevo.
  slots.value.push(emptyScheduleConfig())
}

function removeSlot(idx: number) {
  slots.value.splice(idx, 1)
  if (!slots.value.length) slots.value.push(emptyScheduleConfig())
  emitChange()
}

function emitChange() {
  emit('update:modelValue', slots.value)
}
</script>
