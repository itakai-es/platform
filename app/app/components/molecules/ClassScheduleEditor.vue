<template>
  <div class="space-y-3">
    <div
      v-for="(session, idx) in sessions"
      :key="idx"
      class="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <!-- Día chips -->
      <div class="flex flex-wrap gap-1">
        <button
          v-for="d in DAYS"
          :key="d.value"
          type="button"
          :class="[
            'min-w-[36px] px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors',
            session.days.includes(d.value)
              ? 'bg-navy-700 border-navy-700 text-white'
              : 'bg-surface border-border-primary text-navy-700 hover:bg-gray-50',
          ]"
          @click="toggleDay(idx, d.value)"
        >
          {{ d.short }}
        </button>
      </div>

      <!-- Horas -->
      <div class="flex items-center gap-1.5">
        <input v-model="session.start" type="time" :class="timeInputClass" @change="emitChange" />
        <span class="text-text-secondary">–</span>
        <input v-model="session.end" type="time" :class="timeInputClass" @change="emitChange" />
      </div>

      <!-- Eliminar -->
      <button
        v-if="sessions.length > 1"
        type="button"
        class="p-1.5 rounded-full text-navy-700/70 hover:bg-gray-100"
        :title="t('teacher.classes.detail.settings.general.schedule_remove')"
        @click="removeSession(idx)"
      >
        <XMarkIcon class="w-4 h-4" />
      </button>
    </div>

    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border border-dashed border-border-primary text-navy-700 hover:bg-gray-50"
      @click="addSession"
    >
      <PlusIcon class="w-4 h-4" />
      {{ t('teacher.classes.detail.settings.general.schedule_add') }}
    </button>

    <p v-if="formatted" class="text-xs text-text-secondary">
      <span class="font-medium">{{ t('teacher.classes.detail.settings.general.schedule_preview') }}:</span>
      {{ formatted }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'

interface Session {
  days: number[] // 0=Lun … 6=Dom
  start: string // "HH:MM"
  end: string // "HH:MM"
}

const props = defineProps<{ modelValue?: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

const DAYS = [
  { value: 0, short: 'Lun', long: 'Lunes' },
  { value: 1, short: 'Mar', long: 'Martes' },
  { value: 2, short: 'Mié', long: 'Miércoles' },
  { value: 3, short: 'Jue', long: 'Jueves' },
  { value: 4, short: 'Vie', long: 'Viernes' },
  { value: 5, short: 'Sáb', long: 'Sábado' },
  { value: 6, short: 'Dom', long: 'Domingo' },
] as const

const timeInputClass =
  'px-3 py-1.5 border border-border-primary rounded-xl bg-surface text-navy-700 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

const LONG_TO_VALUE: Record<string, number> = DAYS.reduce(
  (acc, d) => {
    acc[d.long.toLowerCase()] = d.value
    return acc
  },
  {} as Record<string, number>
)
const SHORT_TO_VALUE: Record<string, number> = DAYS.reduce(
  (acc, d) => {
    acc[d.short.toLowerCase()] = d.value
    return acc
  },
  {} as Record<string, number>
)

function parseDays(text: string): number[] {
  const tokens = text
    .toLowerCase()
    .replace(/\sy\s/g, ',')
    .split(/[,\s]+/)
    .map(t => t.trim())
    .filter(Boolean)
  const days = new Set<number>()
  for (const tk of tokens) {
    const v = LONG_TO_VALUE[tk] ?? SHORT_TO_VALUE[tk]
    if (v !== undefined) days.add(v)
  }
  return [...days].sort((a, b) => a - b)
}

function parseSchedule(input?: string | null): Session[] {
  if (!input || !input.trim()) return [emptySession()]
  // Each chunk: "<days> HH:MM-HH:MM"
  const chunks = input.split(/[;|]+/).map(c => c.trim()).filter(Boolean)
  const result: Session[] = []
  for (const chunk of chunks) {
    const m = chunk.match(/(.+?)\s+(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/)
    if (!m) continue
    const days = parseDays(m[1])
    if (!days.length) continue
    result.push({ days, start: normalizeTime(m[2]), end: normalizeTime(m[3]) })
  }
  return result.length ? result : [emptySession()]
}

function normalizeTime(t: string): string {
  const [h, m] = t.split(':')
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
}

function emptySession(): Session {
  return { days: [], start: '', end: '' }
}

function formatDays(days: number[]): string {
  const labels = days
    .slice()
    .sort((a, b) => a - b)
    .map(d => DAYS[d].long)
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}

function serialize(list: Session[]): string {
  return list
    .filter(s => s.days.length && s.start && s.end)
    .map(s => `${formatDays(s.days)} ${s.start}-${s.end}`)
    .join('; ')
}

const sessions = ref<Session[]>(parseSchedule(props.modelValue))

// Re-parse if the parent feeds a new value (e.g., after Discard).
watch(
  () => props.modelValue,
  val => {
    if (val !== formatted.value) {
      sessions.value = parseSchedule(val)
    }
  }
)

const formatted = computed(() => serialize(sessions.value))

function emitChange() {
  emit('update:modelValue', formatted.value)
}

function toggleDay(idx: number, value: number) {
  const s = sessions.value[idx]
  if (!s) return
  const set = new Set(s.days)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  s.days = [...set].sort((a, b) => a - b)
  emitChange()
}

function addSession() {
  sessions.value.push(emptySession())
  // Don't emit until user fills it in.
}

function removeSession(idx: number) {
  sessions.value.splice(idx, 1)
  if (!sessions.value.length) sessions.value.push(emptySession())
  emitChange()
}
</script>
