<template>
  <div class="space-y-4">
    <!-- Mes que se mira y descarga -->
    <div class="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        :aria-label="t('common.calendar.prev_month')"
        @click="shiftMonth(-1)"
      >
        <ChevronLeftIcon class="h-4 w-4" aria-hidden="true" />
      </Button>
      <h3 class="min-w-[10rem] text-center font-semibold text-navy-700" aria-live="polite">
        {{ monthLabel }}
      </h3>
      <Button
        size="sm"
        variant="outline"
        :aria-label="t('common.calendar.next_month')"
        @click="shiftMonth(1)"
      >
        <ChevronRightIcon class="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        v-if="canExport"
        size="sm"
        variant="outline"
        class="ml-auto"
        :icon-left="ArrowDownTrayIcon"
        :loading="exporting"
        :disabled="!summary?.sessions.length"
        @click="exportCsv"
      >
        {{ t('teacher.attendance.history.download_csv') }}
      </Button>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 4" :key="i" height="h-12" />
    </div>

    <EmptyState
      v-else-if="!summary || !summary.sessions.length"
      :icon="CalendarDaysIcon"
      :title="t('teacher.attendance.history.empty_title')"
      :description="t('teacher.attendance.history.empty_description')"
    />

    <template v-else>
      <div class="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <!-- Días con lista: al pulsar uno se abre para corregirlo -->
        <div class="rounded-2xl bg-white p-4 shadow-lg">
          <MonthCalendar
            :key="monthKey"
            :initial-month="`${monthKey}-01`"
            :status-of="dayStatus"
            :label-of="dayLabel"
            :navigation="false"
            @day-click="openDay"
          />
          <p class="mt-2 text-xs text-navy-700/70">
            {{ t('teacher.attendance.history.calendar_hint') }}
          </p>
        </div>

        <!-- Por estudiante: recuentos, porcentaje y su estado en cada sesión -->
        <div class="overflow-x-auto rounded-2xl bg-white shadow-lg">
          <table class="w-full text-sm">
            <caption class="sr-only">
              {{
                t('teacher.attendance.history.table_caption', { month: monthLabel })
              }}
            </caption>
            <thead>
              <tr class="border-b border-navy-700/10 text-left text-navy-700/70">
                <th scope="col" class="sticky left-0 bg-white px-4 py-3 font-semibold">
                  {{ t('teacher.classes.detail.students.col_student') }}
                </th>
                <th scope="col" class="px-2 py-3 text-center font-semibold">%</th>
                <th
                  v-for="s in ATTENDANCE_STATUSES"
                  :key="s"
                  scope="col"
                  class="px-2 py-3 text-center font-semibold"
                >
                  <component
                    :is="ATTENDANCE_STATUS_META[s].icon"
                    class="mx-auto h-4 w-4"
                    :class="ATTENDANCE_STATUS_META[s].color"
                    aria-hidden="true"
                  />
                  <span class="sr-only">{{ t(`teacher.attendance.status.${s}`) }}</span>
                </th>
                <th
                  v-for="session in summary.sessions"
                  :key="session.id"
                  scope="col"
                  class="whitespace-nowrap px-2 py-3 text-center text-xs font-semibold"
                >
                  {{ sessionLabel(session) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.studentId"
                class="border-b border-navy-700/10 last:border-0"
              >
                <th
                  scope="row"
                  class="sticky left-0 bg-white px-4 py-2 text-left font-semibold text-navy-700"
                >
                  <span class="block max-w-[12rem] truncate">{{ row.name }}</span>
                </th>
                <td class="px-2 py-2 text-center font-semibold text-navy-700">
                  {{ row.rate === null ? '—' : `${row.rate} %` }}
                </td>
                <td
                  v-for="s in ATTENDANCE_STATUSES"
                  :key="s"
                  class="px-2 py-2 text-center text-navy-700"
                >
                  {{ row[s] }}
                </td>
                <td
                  v-for="session in summary.sessions"
                  :key="session.id"
                  class="px-2 py-2 text-center"
                >
                  <template v-if="row.statuses[session.id]">
                    <component
                      :is="ATTENDANCE_STATUS_META[row.statuses[session.id]!].icon"
                      class="mx-auto h-4 w-4"
                      :class="ATTENDANCE_STATUS_META[row.statuses[session.id]!].color"
                      aria-hidden="true"
                    />
                    <span class="sr-only">{{
                      t(`teacher.attendance.status.${row.statuses[session.id]}`)
                    }}</span>
                  </template>
                  <span v-else class="text-navy-700/40">
                    <span aria-hidden="true">·</span>
                    <span class="sr-only">{{ t('teacher.attendance.history.no_record') }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'
import { ATTENDANCE_STATUSES, type AttendanceSummary } from '~/composables/useClassAttendance'
import { ATTENDANCE_STATUS_META } from '~/utils/attendance-status'
import { toDateKey } from '~/utils/schedule-occurrences'
import { downloadCsv, toCsv } from '~/utils/csv'
import type { DayStatus } from '~/composables/useClassCalendar'

/**
 * Histórico de asistencia de una clase, mes a mes: por estudiante, sus
 * recuentos, su porcentaje (presente o con retraso sobre las sesiones en las
 * que consta) y su estado en cada sesión; el calendario marca los días con
 * lista y abre cualquiera para corregirla. El CSV lo descarga quien edita
 * (son datos de menores) y se compone aquí, como el de credenciales.
 */
const props = defineProps<{
  classId: string
  students: { id: string; name: string }[]
  canExport: boolean
}>()

const emit = defineEmits<{ 'open-date': [date: string] }>()

const { t, locale } = useI18n()
const toast = useToast()
const api = useAttendanceApi()

const now = new Date()
const month = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const monthKey = computed(() => toDateKey(month.value).slice(0, 7))
// Solo la primera letra en mayúscula: con `capitalize` saldría «Octubre De 2026».
const monthLabel = computed(() => {
  const label = month.value.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
  return label.charAt(0).toLocaleUpperCase(locale.value) + label.slice(1)
})
const range = computed(() => {
  const first = month.value
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
  return { from: toDateKey(first), to: toDateKey(last) }
})

const summary = ref<AttendanceSummary | null>(null)
const loading = ref(false)
const exporting = ref(false)

async function load() {
  loading.value = true
  try {
    summary.value = await api.getSummary(props.classId, range.value.from, range.value.to)
  } catch {
    toast.error(t('teacher.attendance.load_error'))
  } finally {
    loading.value = false
  }
}
watch(range, load, { immediate: true })

function shiftMonth(delta: number) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + delta, 1)
}

const names = computed(() => new Map(props.students.map(s => [s.id, s.name])))

/** Por estudiante, con su nombre; quien ya no sale en la lista de la clase no se enseña. */
const rows = computed(() =>
  (summary.value?.students ?? [])
    .filter(s => names.value.has(s.studentId))
    .map(s => ({ ...s, name: names.value.get(s.studentId)! }))
    .sort((a, b) => a.name.localeCompare(b.name))
)

function formatDay(key: string, opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d).toLocaleDateString(locale.value, opts)
}

function sessionLabel(s: AttendanceSummary['sessions'][number]) {
  const day = formatDay(s.date, { day: 'numeric', month: 'short' })
  return s.startTime ? `${day} ${s.startTime}` : day
}

const sessionDays = computed(() => {
  const days = new Map<string, number>()
  for (const s of summary.value?.sessions ?? []) days.set(s.date, (days.get(s.date) ?? 0) + 1)
  return days
})

function dayStatus(date: Date): DayStatus {
  return sessionDays.value.has(toDateKey(date)) ? 'class' : 'none'
}

function dayLabel(date: Date): string {
  const key = toDateKey(date)
  const full = formatDay(key, { weekday: 'long', day: 'numeric', month: 'long' })
  return sessionDays.value.has(key)
    ? `${full}: ${t('teacher.attendance.history.day_with_list')}`
    : full
}

function openDay(date: Date) {
  const key = toDateKey(date)
  // No se pasa lista de días que aún no han llegado.
  if (key <= toDateKey(new Date())) emit('open-date', key)
}

async function exportCsv() {
  exporting.value = true
  try {
    const data = await api.getExport(props.classId, range.value.from, range.value.to)
    const header = [
      t('teacher.classes.detail.students.col_student'),
      ...data.sessions.map(s => (s.startTime ? `${s.date} ${s.startTime}` : s.date)),
      t('teacher.attendance.history.csv_sessions'),
      ...ATTENDANCE_STATUSES.map(s => t(`teacher.attendance.status.${s}`)),
      '%',
    ]
    const lines = data.students
      .filter(s => names.value.has(s.studentId))
      .map(s => [
        names.value.get(s.studentId)!,
        ...data.sessions.map(session => {
          const status = s.statuses[session.id]
          return status ? t(`teacher.attendance.status.${status}`) : ''
        }),
        String(s.total),
        ...ATTENDANCE_STATUSES.map(status => String(s[status])),
        s.rate === null ? '' : String(s.rate),
      ])
      .sort((a, b) => a[0]!.localeCompare(b[0]!))
    downloadCsv(
      toCsv([header, ...lines]),
      `${t('teacher.attendance.history.csv_file')}-${monthKey.value}.csv`
    )
  } catch {
    toast.error(t('teacher.attendance.history.export_error'))
  } finally {
    exporting.value = false
  }
}
</script>
