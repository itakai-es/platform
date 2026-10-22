<template>
  <div class="space-y-4">
    <OptionPillGroup
      v-model="tab"
      :options="tabOptions"
      :aria-label="t('teacher.attendance.tabs_label')"
      class="max-w-sm"
    />

    <!-- ============================ Pasar lista ============================ -->
    <template v-if="tab === 'take'">
      <div class="rounded-2xl bg-white p-4 shadow-lg sm:p-6 space-y-4">
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label :for="`${uid}-date`" class="mb-1.5 block text-sm font-medium text-navy-700">
              {{ t('teacher.attendance.date') }}
            </label>
            <input
              :id="`${uid}-date`"
              v-model="date"
              type="date"
              :max="today"
              class="w-44 rounded-2xl border border-border-primary bg-surface px-3 py-2.5 text-sm text-navy-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p :id="`${uid}-slot`" class="mb-1.5 text-sm font-medium text-navy-700">
              {{ t('teacher.attendance.session') }}
            </p>
            <OptionPillGroup
              v-model="slotKey"
              :options="slotOptions"
              :columns="4"
              fluid
              :aria-label="t('teacher.attendance.session')"
            />
          </div>
        </div>

        <p class="text-sm text-navy-700/80">
          <template v-if="savedSession">
            {{
              t('teacher.attendance.saved_by', {
                name: savedSession.takenBy ?? t('teacher.attendance.someone'),
                time: formatTime(savedSession.updatedAt),
              })
            }}
          </template>
          <template v-else>{{ t('teacher.attendance.not_saved') }}</template>
          <span v-if="dirty" class="ml-1 font-semibold"
            >· {{ t('teacher.attendance.unsaved') }}</span
          >
        </p>
      </div>

      <InfoNote v-if="!canTake">{{ t('teacher.attendance.read_only') }}</InfoNote>

      <div v-if="loading || dayLoading" class="space-y-3">
        <Skeleton v-for="i in 5" :key="i" height="h-16" />
      </div>

      <EmptyState
        v-else-if="!students.length"
        :icon="UsersIcon"
        :title="t('teacher.classes.detail.students.empty_title')"
        :description="t('teacher.classes.detail.students.empty_description')"
      />

      <template v-else>
        <!-- Recuento y acciones de la lista -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-navy-700">
          <span v-for="s in ATTENDANCE_STATUSES" :key="s" class="inline-flex items-center gap-1">
            <component
              :is="ATTENDANCE_STATUS_META[s].icon"
              class="h-4 w-4"
              :class="ATTENDANCE_STATUS_META[s].color"
              aria-hidden="true"
            />
            {{ t(`teacher.attendance.count.${s}`, { count: counts[s] }, counts[s]) }}
          </span>
          <Button v-if="canTake" size="sm" variant="ghost" class="ml-auto" @click="allPresent">
            {{ t('teacher.attendance.all_present') }}
          </Button>
        </div>

        <!-- Con muchos, buscar a alguien por su nombre o su alias -->
        <SearchInput
          v-if="students.length > SEARCH_FROM"
          v-model="query"
          :placeholder="t('teacher.classroom.picker.search')"
        />
        <p v-if="!visibleStudents.length" class="text-sm text-navy-700/70">
          {{ t('teacher.classroom.picker.no_results') }}
        </p>

        <ul class="space-y-2">
          <li
            v-for="s in visibleStudents"
            :key="s.id"
            class="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4 lg:flex-row lg:items-center"
          >
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <Avatar :src="s.avatar" :username="s.name" size="md" class="flex-shrink-0" />
              <div class="min-w-0">
                <p :id="`${uid}-name-${s.id}`" class="truncate font-semibold text-navy-700">
                  {{ s.name }}
                </p>
                <Badge v-if="s.pendingSignIn" variant="warning" size="sm" class="mt-1">
                  {{ t('teacher.classes.detail.students.pending_sign_in_badge') }}
                </Badge>
              </div>
            </div>
            <!-- En un hueco estrecho, dos por fila: sin partir «Presente» ni «Justificada» -->
            <OptionPillGroup
              v-if="canTake"
              :model-value="statuses[s.id] ?? 'present'"
              :options="statusOptions"
              :columns="4"
              fluid
              min-item-width="7.5rem"
              :aria-label="t('teacher.attendance.status_of', { name: s.name })"
              class="lg:w-[32rem] lg:flex-shrink-0"
              @update:model-value="setStatus(s.id, $event)"
            >
              <template #option="{ option }">
                <span class="inline-flex items-center justify-center gap-1">
                  <component
                    :is="ATTENDANCE_STATUS_META[option.value].icon"
                    class="h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {{ option.label }}
                </span>
              </template>
            </OptionPillGroup>
            <span v-else class="inline-flex items-center gap-1 text-sm font-medium text-navy-700">
              <component
                :is="ATTENDANCE_STATUS_META[statuses[s.id] ?? 'present'].icon"
                class="h-4 w-4"
                :class="ATTENDANCE_STATUS_META[statuses[s.id] ?? 'present'].color"
                aria-hidden="true"
              />
              {{ t(`teacher.attendance.status.${statuses[s.id] ?? 'present'}`) }}
            </span>
          </li>
        </ul>

        <!-- Guardar, borrar y, ya guardada, aplicar a presentes o ausentes. Fija abajo,
             como la barra de la selección en el listado. -->
        <div
          v-if="canTake || (savedSession && canApply)"
          class="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-navy-700 p-3 text-white shadow-lg"
        >
          <span class="mr-auto px-1 text-sm font-semibold">
            {{ summary }}<template v-if="dirty"> · {{ t('teacher.attendance.unsaved') }}</template>
          </span>
          <Button
            v-if="canTake && savedSession"
            size="sm"
            variant="ghost"
            class="!text-white"
            :icon-left="TrashIcon"
            @click="confirmDelete = true"
          >
            {{ t('teacher.attendance.delete') }}
          </Button>
          <template v-if="savedSession && canApply && !dirty">
            <Button
              size="sm"
              variant="secondary"
              :disabled="!presentIds.length"
              @click="applyTo('present')"
            >
              {{ t('teacher.attendance.apply_present') }}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              :disabled="!missingIds.length"
              @click="applyTo('absent')"
            >
              {{ t('teacher.attendance.apply_absent') }}
            </Button>
          </template>
          <Button v-if="canTake" size="sm" variant="secondary" :loading="saving" @click="save">
            {{ t('teacher.attendance.save') }}
          </Button>
        </div>
        <p v-if="savedSession && canApply" class="text-xs text-navy-700/70">
          {{ t('teacher.attendance.no_auto_xp') }}
        </p>
      </template>
    </template>

    <!-- ============================ Histórico ============================ -->
    <AttendanceHistory
      v-else
      :class-id="classId"
      :students="students"
      :can-export="canExport"
      @open-date="openDate"
    />

    <ConfirmModal
      v-model="confirmDelete"
      :title="t('teacher.attendance.delete_title')"
      :message="t('teacher.attendance.delete_message')"
      :confirm-text="t('teacher.attendance.delete')"
      :loading="deleting"
      @confirm="remove"
    />

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { ScheduleConfig } from '~/types/schedule.types'
import { scheduleOccurrences, toDateKey } from '~/utils/schedule-occurrences'
import { ATTENDANCE_STATUS_META } from '~/utils/attendance-status'
import { matchesQuery } from '~/utils/text-search'
import {
  ATTENDANCE_STATUSES,
  type AttendanceSession,
  type AttendanceStatus,
} from '~/composables/useClassAttendance'

/**
 * Pasar lista (sub-vista «Asistencia» de Alumnos) y su histórico.
 *
 * Abre con la fecha de hoy y propone la sesión: el tramo del horario si hoy
 * toca, o «Sesión sin horario» si no hay horario o hoy no hay clase; fecha y
 * tramo se cambian para corregir o pasar lista atrasada. Todo el alumnado sale
 * presente y solo se marca a quien falta. La sesión se crea al guardar.
 *
 * Ya guardada, «Aplicar a los presentes/ausentes» abre el flujo de aplicar en
 * lote con la selección hecha (`apply`): siempre con confirmación, nunca solo.
 */
interface AttendanceStudent {
  id: string
  name: string
  /** Alias en la clase: también se busca por él. */
  handle?: string
  avatar?: string
  pendingSignIn?: boolean
}

const props = defineProps<{
  classId: string
  students: AttendanceStudent[]
  loading?: boolean
  scheduleConfig: ScheduleConfig | ScheduleConfig[] | null
  canTake: boolean
  canExport: boolean
  canApply: boolean
}>()

const emit = defineEmits<{
  apply: [
    payload: {
      mode: 'behavior' | 'reward'
      studentIds: string[]
      hints: Record<string, string>
    },
  ]
}>()

const { t, locale } = useI18n()
const toast = useToast()
const api = useAttendanceApi()
const attendanceToday = useClassAttendance(() => props.classId)
const uid = `attendance-${useId()}`.replace(/[^\w-]/g, '-')

const tab = ref<'take' | 'history'>('take')
const tabOptions = computed(() => [
  { value: 'take' as const, label: t('teacher.attendance.tab_take') },
  { value: 'history' as const, label: t('teacher.attendance.tab_history') },
])

const today = toDateKey(new Date())
const date = ref(today)
const sessions = ref<AttendanceSession[]>([])
const dayLoading = ref(false)
/** Tramo elegido: su hora de inicio, o "" para la sesión sin horario. */
const slotKey = ref('')
const statuses = ref<Record<string, AttendanceStatus>>({})
const dirty = ref(false)
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const announcement = ref('')

/** Lo que propone el horario ese día. */
const proposed = computed(() =>
  date.value ? scheduleOccurrences(props.scheduleConfig, date.value, date.value) : []
)

const slotOptions = computed(() => {
  const options = proposed.value.map(o => ({
    value: o.start,
    label: o.end ? `${o.start}–${o.end}` : o.start,
    end: o.end,
  }))
  // Las guardadas que el horario ya no propone (se cambió, o se pasó a mano).
  for (const s of sessions.value) {
    if (!options.some(o => o.value === s.startTime)) {
      options.push({
        value: s.startTime,
        label: s.startTime
          ? s.endTime
            ? `${s.startTime}–${s.endTime}`
            : s.startTime
          : t('teacher.attendance.no_schedule'),
        end: s.endTime ?? '',
      })
    }
  }
  if (!options.some(o => o.value === '')) {
    options.push({ value: '', label: t('teacher.attendance.no_schedule'), end: '' })
  }
  return options.sort((a, b) => (a.value || '99').localeCompare(b.value || '99'))
})

const savedSession = computed(() => sessions.value.find(s => s.startTime === slotKey.value) ?? null)

const statusOptions = computed(() =>
  ATTENDANCE_STATUSES.map(s => ({ value: s, label: t(`teacher.attendance.status.${s}`) }))
)

/** Estados con los que se abre la sesión elegida: los guardados, o todos presentes. */
function resetStatuses() {
  const saved = new Map(savedSession.value?.records.map(r => [r.studentId, r.status]) ?? [])
  statuses.value = Object.fromEntries(
    props.students.map(s => [s.id, saved.get(s.id) ?? ('present' as AttendanceStatus)])
  )
  dirty.value = false
}

async function loadDay() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return
  dayLoading.value = true
  try {
    const res = await api.getDay(props.classId, date.value)
    sessions.value = res.sessions
    // La última guardada ese día; si no hay, la primera que propone el horario.
    const latest = [...res.sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    slotKey.value = latest?.startTime ?? proposed.value[0]?.start ?? ''
    resetStatuses()
  } catch {
    toast.error(t('teacher.attendance.load_error'))
  } finally {
    dayLoading.value = false
  }
}

watch(date, loadDay)
watch(slotKey, resetStatuses)
watch(
  () => props.students.length,
  () => {
    if (!dirty.value) resetStatuses()
  }
)
onMounted(loadDay)

function setStatus(studentId: string, status: AttendanceStatus) {
  statuses.value = { ...statuses.value, [studentId]: status }
  dirty.value = true
}

// La búsqueda solo filtra lo que se ve: el recuento y lo que se guarda son de toda la clase.
const SEARCH_FROM = 8
const query = ref('')
const visibleStudents = computed(() =>
  props.students.filter(s => matchesQuery(query.value, s.name, s.handle))
)

function allPresent() {
  statuses.value = Object.fromEntries(props.students.map(s => [s.id, 'present' as const]))
  dirty.value = true
}

const counts = computed(() => {
  const c = { present: 0, absent: 0, late: 0, excused: 0 }
  for (const s of props.students) c[statuses.value[s.id] ?? 'present'] += 1
  return c
})

/** Para la barra de abajo: solo los estados que hay, «24 presentes · 2 ausentes». */
const summary = computed(() =>
  ATTENDANCE_STATUSES.filter(st => counts.value[st] > 0)
    .map(st => t(`teacher.attendance.count.${st}`, { count: counts.value[st] }, counts.value[st]))
    .join(' · ')
)

async function save() {
  if (saving.value) return
  saving.value = true
  const option = slotOptions.value.find(o => o.value === slotKey.value)
  try {
    const res = await api.save(props.classId, {
      date: date.value,
      startTime: slotKey.value,
      endTime: option?.end || null,
      source:
        proposed.value.some(o => o.start === slotKey.value) && slotKey.value
          ? 'schedule'
          : 'manual',
      records: props.students.map(s => ({
        studentId: s.id,
        status: statuses.value[s.id] ?? 'present',
      })),
    })
    sessions.value = [...sessions.value.filter(s => s.id !== res.session.id), res.session]
    dirty.value = false
    const c = res.session.counts
    announcement.value = t('teacher.attendance.saved_announcement', {
      present: c.present + c.late,
      absent: c.absent + c.excused,
    })
    toast.success(announcement.value)
    if (date.value === today) void attendanceToday.refresh()
  } catch {
    toast.error(t('teacher.attendance.save_error'))
  } finally {
    saving.value = false
  }
}

async function remove() {
  const session = savedSession.value
  if (!session || deleting.value) return
  deleting.value = true
  try {
    await api.remove(props.classId, session.id)
    sessions.value = sessions.value.filter(s => s.id !== session.id)
    confirmDelete.value = false
    resetStatuses()
    announcement.value = t('teacher.attendance.deleted')
    toast.success(announcement.value)
    if (date.value === today) void attendanceToday.refresh()
  } catch {
    toast.error(t('teacher.attendance.delete_error'))
  } finally {
    deleting.value = false
  }
}

// --- Aplicar a presentes / ausentes ---
const presentIds = computed(() =>
  props.students
    .filter(s => ['present', 'late'].includes(statuses.value[s.id] ?? 'present'))
    .map(s => s.id)
)
/** Ausentes y justificadas: salen en la lista, pero solo los ausentes van elegidos. */
const missingIds = computed(() =>
  props.students
    .filter(s => ['absent', 'excused'].includes(statuses.value[s.id] ?? 'present'))
    .map(s => s.id)
)

function applyTo(group: 'present' | 'absent') {
  const hints = Object.fromEntries(
    props.students.map(s => [
      s.id,
      t(`teacher.attendance.status.${statuses.value[s.id] ?? 'present'}`),
    ])
  )
  const studentIds =
    group === 'present'
      ? presentIds.value
      : missingIds.value.filter(id => statuses.value[id] === 'absent')
  emit('apply', { mode: 'behavior', studentIds, hints })
}

// --- Del histórico: abrir un día concreto ---
function openDate(key: string) {
  date.value = key
  tab.value = 'take'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(locale.value, { dateStyle: 'short', timeStyle: 'short' })
}
</script>
