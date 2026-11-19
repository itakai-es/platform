<template>
  <Card type="stats">
    <CardHeader :title="t('teacher.analytics.students.title')" :icon="UsersIcon" />

    <div v-if="loading" class="space-y-3" aria-hidden="true">
      <CardRowSkeleton v-for="i in 3" :key="i" />
    </div>

    <CardItem v-else-if="students.length === 0" layout="column" padding="lg" centered>
      <EmptyState
        :icon="UsersIcon"
        :title="t('teacher.classes.detail.students.empty_title')"
        :description="t('teacher.classes.detail.students.empty_description')"
      />
    </CardItem>

    <template v-else>
      <FilterBar
        :search="search"
        :sort="sort"
        :results-count="visible.length"
        :search-placeholder="t('teacher.classes.detail.students.search_placeholder')"
        :sort-options="sortOptions"
        variant="purple"
        @update:search="search = $event"
        @update:sort="sort = $event as StudentSort"
        @reset="search = ''"
      />

      <CardItem v-if="visible.length === 0" layout="column" padding="lg" centered>
        <EmptyState
          :icon="MagnifyingGlassIcon"
          :title="t('teacher.classes.detail.students.no_results_title')"
          :description="t('teacher.classes.detail.students.no_results_description')"
        />
      </CardItem>

      <template v-else>
        <!-- En `md+`, tabla con la primera columna fija -->
        <CardItem layout="column" padding="sm" class="hidden md:flex">
          <ChartTable
            compact
            :caption="t('teacher.analytics.students.table_caption')"
            :row-header="t('teacher.classes.detail.students.col_student')"
            :row-header-sort="ariaSort('name')"
            :columns="columns"
            :rows="rows"
          >
            <template #header="{ row }">
              <StudentIdentity :student="byId.get(row.key)!" :class-id="classId" />
            </template>
            <!-- Sus misiones, con una minibarra; sus señales, como chip con su icono -->
            <template #cell="{ row, column, value }">
              <span
                v-if="column.key === 'missions'"
                class="inline-flex flex-col items-center gap-1"
              >
                <span class="font-semibold">{{ value }}</span>
                <ProgressBar
                  :percentage="progressOf(byId.get(row.key)!)"
                  class="w-16"
                  aria-hidden="true"
                />
              </span>
              <span
                v-else-if="column.key === 'signals' && Number(value) > 0"
                class="inline-flex items-center gap-1 rounded-full bg-navy-700 px-2 py-0.5 text-xs font-semibold text-white"
              >
                <FlagIcon class="h-3.5 w-3.5" aria-hidden="true" />
                {{ formatNumber(Number(value)) }}
              </span>
              <template v-else>{{ cellText(value) }}</template>
            </template>
          </ChartTable>
        </CardItem>

        <!-- Por debajo, tarjetas apiladas -->
        <ul class="space-y-3 md:hidden">
          <li v-for="student in visible" :key="student.id">
            <CardItem layout="column" class="gap-3">
              <StudentIdentity :student="student" :class-id="classId" />
              <dl class="grid grid-cols-2 gap-2">
                <!-- En el código, la etiqueta primero; a la vista, la cifra arriba -->
                <div
                  v-for="fact in factsOf(student)"
                  :key="fact.key"
                  class="flex min-w-0 flex-col-reverse justify-end rounded-xl bg-navy-700/5 px-2 py-2.5 text-center"
                >
                  <dt class="text-xs text-navy-700/70 [overflow-wrap:anywhere]">{{ fact.label }}</dt>
                  <dd
                    class="flex flex-col items-center gap-1 break-words font-bold text-navy-700"
                  >
                    <span class="inline-flex items-center gap-1">
                      <FlagIcon
                        v-if="fact.key === 'signals' && student.signals > 0"
                        class="h-4 w-4 flex-shrink-0"
                        aria-hidden="true"
                      />
                      {{ fact.value }}
                    </span>
                    <ProgressBar
                      v-if="fact.key === 'missions'"
                      :percentage="progressOf(student)"
                      class="w-full max-w-[6rem]"
                      aria-hidden="true"
                    />
                  </dd>
                </div>
              </dl>
            </CardItem>
          </li>
        </ul>
      </template>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, UsersIcon } from '@heroicons/vue/24/outline'
import { FlagIcon } from '@heroicons/vue/24/solid'
import type { ChartTableColumn, ChartTableRow } from '~/components/molecules/ChartTable.vue'
import type { ClassAnalyticsStudent } from '~/types/analytics.types'
import { searchStudents, sortStudents, type StudentSort } from '~/utils/analytics-view'
import { formatNotificationTime } from '~/utils/notifications'
import { ringFraction } from '~/utils/progress-ring'

/**
 * El alumnado de la clase en el panel, con búsqueda y orden (los del Listado de
 * Alumnado): nombre real y alias, misiones «X de N», última actividad, entregas
 * por revisar, pistas, asistencia si procede y señales. El nombre lleva a la
 * página del estudiante. Las cuentas sin estrenar salen como «Sin empezar».
 *
 * Cada fila con su avatar, sus misiones con una minibarra («X de N» escrito
 * encima) y sus señales como chip con la bandera.
 */
const props = defineProps<{
  classId: string
  students: ClassAnalyticsStudent[]
  loading: boolean
  showAttendance: boolean
}>()

const { t, locale } = useI18n()
const { formatNumber, formatPercent } = useNumberFormat()

const search = ref('')
const sort = ref<StudentSort>('name-asc')

const sortOptions = computed(() => {
  const label = (key: string) => t(`teacher.analytics.students.sort_${key}`)
  const list: { value: StudentSort; label: string }[] = [
    { value: 'name-asc', label: t('teacher.classes.detail.students.sort_name_asc') },
    { value: 'name-desc', label: t('teacher.classes.detail.students.sort_name_desc') },
    { value: 'missions-asc', label: label('missions_asc') },
    { value: 'missions-desc', label: label('missions_desc') },
    { value: 'activity-desc', label: label('activity_recent') },
    { value: 'activity-asc', label: label('activity_oldest') },
    { value: 'pending-desc', label: label('pending_desc') },
    { value: 'hints-desc', label: label('hints_desc') },
    { value: 'signals-desc', label: label('signals_desc') },
  ]
  if (props.showAttendance) {
    list.push(
      { value: 'attendance-asc', label: label('attendance_asc') },
      { value: 'attendance-desc', label: label('attendance_desc') }
    )
  }
  return list
})

// Si deja de poderse ordenar por una columna (cambia el periodo y ya no hay lista), se vuelve al nombre.
watch(
  () => props.showAttendance,
  shown => {
    if (!shown && sort.value.startsWith('attendance')) sort.value = 'name-asc'
  }
)

const visible = computed(() =>
  sortStudents(searchStudents(props.students, search.value), sort.value, locale.value)
)
const byId = computed(() => new Map(props.students.map(student => [student.id, student])))

/** Lo lleno de su minibarra (0-100): sus misiones completadas de las que cuentan. */
const progressOf = (student: ClassAnalyticsStudent) =>
  Math.round(ringFraction(student.missionsCompleted, student.missionsCounted) * 100)

const cellText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '—'
  return typeof value === 'number' ? formatNumber(value) : value
}

const missionsText = (student: ClassAnalyticsStudent) =>
  t('common.charts.value_of_total', {
    value: formatNumber(student.missionsCompleted),
    total: formatNumber(student.missionsCounted),
  })

function lastActivityText(student: ClassAnalyticsStudent): string {
  if (!student.participating) return t('common.charts.status.not_started')
  return student.lastActivityAt
    ? formatNotificationTime(student.lastActivityAt, locale.value)
    : t('teacher.analytics.students.no_activity')
}

const attendanceText = (student: ClassAnalyticsStudent) =>
  student.attendance?.rate == null ? '—' : formatPercent(student.attendance.rate)

/** Por qué columna se está ordenando, para `aria-sort`. */
function ariaSort(field: string): 'ascending' | 'descending' | undefined {
  const [current, direction] = sort.value.split('-')
  if (current !== field) return undefined
  return direction === 'asc' ? 'ascending' : 'descending'
}

const columns = computed<ChartTableColumn[]>(() => {
  const col = (key: string, label: string, sortField: string, wrap = false): ChartTableColumn => ({
    key,
    label: t(`teacher.analytics.students.${label}`),
    align: 'center',
    sort: ariaSort(sortField),
    wrap,
  })
  return [
    col('missions', 'col_missions', 'missions'),
    col('activity', 'col_last_activity', 'activity', true),
    col('pending', 'col_pending', 'pending'),
    col('hints', 'col_hints', 'hints'),
    ...(props.showAttendance ? [col('attendance', 'col_attendance', 'attendance')] : []),
    col('signals', 'col_signals', 'signals'),
  ]
})

const rows = computed<ChartTableRow[]>(() =>
  visible.value.map(student => ({
    key: student.id,
    header: student.name,
    cells: {
      missions: missionsText(student),
      activity: lastActivityText(student),
      pending: student.pendingReviews,
      hints: student.hintsUsed,
      attendance: attendanceText(student),
      signals: student.signals,
    },
  }))
)

function factsOf(student: ClassAnalyticsStudent) {
  const label = (key: string) => t(`teacher.analytics.students.${key}`)
  return [
    { key: 'missions', label: label('col_missions'), value: missionsText(student) },
    { key: 'activity', label: label('col_last_activity'), value: lastActivityText(student) },
    { key: 'pending', label: label('col_pending'), value: formatNumber(student.pendingReviews) },
    { key: 'hints', label: label('col_hints'), value: formatNumber(student.hintsUsed) },
    ...(props.showAttendance
      ? [{ key: 'attendance', label: label('col_attendance'), value: attendanceText(student) }]
      : []),
    { key: 'signals', label: label('col_signals'), value: formatNumber(student.signals) },
  ]
}
</script>
