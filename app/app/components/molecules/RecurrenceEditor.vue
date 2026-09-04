<template>
  <div ref="root" class="relative">
    <!-- Trigger (resumen) -->
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-2xl border border-border-primary bg-surface px-3 py-2.5 text-sm text-navy-700 sm:px-4 sm:py-3 sm:text-base"
      @click="menuOpen = !menuOpen"
    >
      <span class="truncate">{{ summary }}</span>
      <ChevronDownIcon
        class="h-4 w-4 flex-shrink-0 text-navy-700/70"
        :class="menuOpen && 'rotate-180'"
      />
    </button>

    <!-- Menú de presets (estilo Google) -->
    <div
      v-if="menuOpen"
      class="absolute z-20 mt-1 w-full min-w-[260px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
    >
      <button
        v-for="p in presets"
        :key="p.key"
        type="button"
        class="w-full px-4 py-2.5 text-left text-sm text-navy-700 hover:bg-gray-50"
        @click="choosePreset(p.key)"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- Modal: periodicidad personalizada -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="modalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="modalOpen = false"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 class="mb-4 text-lg font-semibold text-navy-700">
              {{ t('teacher.schedule.custom_title') }}
            </h3>

            <!-- Repetir cada N [unidad] -->
            <div class="mb-4 flex items-center gap-2 text-sm text-navy-700">
              <span>{{ t('teacher.schedule.repeat_every') }}</span>
              <input
                v-model.number="draft.interval"
                type="number"
                min="1"
                max="30"
                class="w-16 rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <select
                v-model="draft.freq"
                class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option v-for="u in unitOptions" :key="u.value" :value="u.value">
                  {{ u.label }}
                </option>
              </select>
            </div>

            <!-- Se repite el (solo semanal) -->
            <div v-if="draft.freq === 'weekly'" class="mb-4">
              <p class="mb-2 text-sm text-navy-700">{{ t('teacher.schedule.repeats_on') }}</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="d in days"
                  :key="d.value"
                  type="button"
                  class="flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-sm font-medium capitalize transition-colors"
                  :class="
                    draft.weekdays.includes(d.value)
                      ? 'bg-navy-700 text-white'
                      : 'bg-gray-100 text-navy-700 hover:bg-gray-200'
                  "
                  @click="toggleDraftDay(d.value)"
                >
                  {{ d.label }}
                </button>
              </div>
            </div>

            <!-- Termina -->
            <div class="space-y-2">
              <p class="text-sm text-navy-700">{{ t('teacher.schedule.ends') }}</p>
              <label class="flex items-center gap-2 text-sm text-navy-700">
                <input
                  v-model="draft.ends.type"
                  type="radio"
                  value="never"
                  class="accent-navy-700"
                />
                {{ t('teacher.schedule.ends_never') }}
              </label>
              <label class="flex items-center gap-2 text-sm text-navy-700">
                <input v-model="draft.ends.type" type="radio" value="on" class="accent-navy-700" />
                <span>{{ t('teacher.schedule.ends_on') }}</span>
                <input
                  v-model="draft.ends.onDate"
                  type="date"
                  :disabled="draft.ends.type !== 'on'"
                  class="rounded-lg border border-border-primary bg-surface px-2 py-1 text-sm outline-none focus:border-primary disabled:opacity-50"
                />
              </label>
              <label class="flex items-center gap-2 text-sm text-navy-700">
                <input
                  v-model="draft.ends.type"
                  type="radio"
                  value="after"
                  class="accent-navy-700"
                />
                <span>{{ t('teacher.schedule.ends_after') }}</span>
                <input
                  v-model.number="draft.ends.afterCount"
                  type="number"
                  min="1"
                  :disabled="draft.ends.type !== 'after'"
                  class="w-16 rounded-lg border border-border-primary bg-surface px-2 py-1 text-center text-sm outline-none focus:border-primary disabled:opacity-50"
                />
                <span>{{ t('teacher.schedule.repetitions') }}</span>
              </label>
            </div>

            <div class="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" @click="modalOpen = false">
                {{ t('teacher.schedule.cancel') }}
              </Button>
              <Button variant="primary" size="sm" @click="commit">
                {{ t('teacher.schedule.done') }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'
import type { RecurrenceFreq } from '~/types/schedule.types'
import { useRecurrenceText, type RecurrenceLike } from '~/composables/useClassCalendar'

const props = defineProps<{ modelValue: RecurrenceLike; startDate?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: RecurrenceLike] }>()

const { t, describe, presetLabels, dayName } = useRecurrenceText()

const root = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const modalOpen = ref(false)
onClickOutside(root, () => (menuOpen.value = false))

// Iniciales/abreviaturas de día localizadas (Intl).
const days = computed(() =>
  [0, 1, 2, 3, 4, 5, 6].map(v => ({ value: v, label: dayName(v, 'short').replace('.', '') }))
)

const summary = computed(() => describe(props.modelValue, props.startDate || ''))

const presets = computed(() => {
  const l = presetLabels(props.startDate || '')
  return [
    { key: 'none', label: t('teacher.schedule.freq_none') },
    { key: 'daily', label: t('teacher.schedule.freq_daily') },
    { key: 'weekly', label: l.weekly },
    { key: 'monthly', label: l.monthly },
    { key: 'yearly', label: l.yearly },
    { key: 'weekdays', label: t('teacher.schedule.weekdays') },
    { key: 'custom', label: t('teacher.schedule.customize') },
  ]
})

function update(next: RecurrenceLike) {
  emit('update:modelValue', next)
}

function choosePreset(key: string) {
  menuOpen.value = false
  const cur = props.modelValue
  const wd = presetLabels(props.startDate || '').weekdayOfStart
  if (key === 'none') update({ ...cur, freq: 'none', interval: 1, weekdays: [] })
  else if (key === 'daily') update({ ...cur, freq: 'daily', interval: 1 })
  else if (key === 'weekly')
    update({ ...cur, freq: 'weekly', interval: 1, weekdays: wd !== null ? [wd] : cur.weekdays })
  else if (key === 'monthly') update({ ...cur, freq: 'monthly', interval: 1 })
  else if (key === 'yearly') update({ ...cur, freq: 'yearly', interval: 1 })
  else if (key === 'weekdays')
    update({ ...cur, freq: 'weekly', interval: 1, weekdays: [0, 1, 2, 3, 4] })
  else if (key === 'custom') openModal()
}

// --- Modal (borrador editable, se confirma con "Hecho") ---
const draft = ref<RecurrenceLike>(clone(props.modelValue))

const unitOptions = computed<{ value: RecurrenceFreq; label: string }[]>(() => {
  const n = draft.value.interval || 1
  return [
    { value: 'daily', label: t('teacher.schedule.unit_day', n) },
    { value: 'weekly', label: t('teacher.schedule.unit_week', n) },
    { value: 'monthly', label: t('teacher.schedule.unit_month', n) },
    { value: 'yearly', label: t('teacher.schedule.unit_year', n) },
  ]
})

function clone(r: RecurrenceLike): RecurrenceLike {
  return {
    freq: r.freq === 'none' ? 'weekly' : r.freq,
    interval: Math.max(1, r.interval || 1),
    weekdays: [...r.weekdays],
    ends: { type: r.ends.type, onDate: r.ends.onDate, afterCount: r.ends.afterCount },
  }
}

function openModal() {
  draft.value = clone(props.modelValue)
  modalOpen.value = true
}

function toggleDraftDay(value: number) {
  const set = new Set(draft.value.weekdays)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  draft.value.weekdays = [...set].sort((a, b) => a - b)
}

function commit() {
  update(clone(draft.value))
  modalOpen.value = false
}
</script>
