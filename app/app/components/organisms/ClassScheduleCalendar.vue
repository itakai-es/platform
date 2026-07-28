<template>
  <div class="space-y-3">
    <!-- Campos compactos en una fila que se ajusta (no ocupan todo el ancho) -->
    <div class="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-navy-700">{{
          t('teacher.schedule.starts_on')
        }}</label>
        <input
          v-model="config.startDate"
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
            v-model="config.start"
            type="time"
            :class="[fieldClass, 'w-28']"
            @change="emitChange"
          />
          <span class="text-text-secondary">–</span>
          <input
            v-model="config.end"
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
        <RecurrenceEditor v-model="recurrence" :start-date="config.startDate" />
      </div>
    </div>

    <!-- Vista previa del horario resultante -->
    <p v-if="scheduleText" class="text-xs text-text-secondary">
      <span class="font-medium">{{ t('teacher.schedule.preview') }}:</span> {{ scheduleText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ScheduleConfig } from '~/types/schedule.types'
import { emptyScheduleConfig } from '~/types/schedule.types'
import { useClassCalendar } from '~/composables/useClassCalendar'

const props = defineProps<{ modelValue?: ScheduleConfig | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: ScheduleConfig] }>()

const { t } = useI18n()

const fieldClass =
  'rounded-2xl border border-border-primary bg-surface px-3 py-2.5 text-sm text-navy-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:py-3 sm:text-base'

function normalize(v?: ScheduleConfig | null): ScheduleConfig {
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

const config = ref<ScheduleConfig>(normalize(props.modelValue))

watch(
  () => props.modelValue,
  v => {
    const incoming = normalize(v)
    if (JSON.stringify(incoming) !== JSON.stringify(config.value)) config.value = incoming
  }
)

const { scheduleText } = useClassCalendar(config)

// Puente con RecurrenceEditor: expone/actualiza solo los campos de recurrencia.
const recurrence = computed({
  get: () => ({
    freq: config.value.freq,
    interval: config.value.interval,
    weekdays: config.value.weekdays,
    ends: config.value.ends,
  }),
  set: r => {
    config.value = {
      ...config.value,
      freq: r.freq,
      interval: r.interval,
      weekdays: [...r.weekdays],
      ends: { ...r.ends },
    }
    emitChange()
  },
})

function emitChange() {
  emit('update:modelValue', config.value)
}
</script>
