<template>
  <ChartFigure
    chart-id="class-weeks"
    type="stats"
    :title="t('teacher.analytics.weeks.title')"
    :icon="CalendarDaysIcon"
    :caption="t('teacher.analytics.weeks.caption')"
    :loading="loading"
    :empty="!loading && !hasActivity"
    :empty-title="t('teacher.analytics.weeks.empty_title')"
    :empty-description="t('teacher.analytics.weeks.empty_description')"
  >
    <ActivityColumns :points="points" />

    <template #legend>
      <ChartLegend :series="legend" />
    </template>

    <template #table>
      <ChartTable
        compact
        :caption="t('teacher.analytics.weeks.table_caption')"
        :row-header="t('teacher.analytics.weeks.col_week')"
        :columns="columns"
        :rows="rows"
      />
    </template>
  </ChartFigure>
</template>

<script setup lang="ts">
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import type { ChartTableColumn, ChartTableRow } from '~/components/molecules/ChartTable.vue'
import type { WeekActivity } from '~/types/analytics.types'
import { formatDayLong, formatWeekShort, weekTotal } from '~/utils/analytics-view'
import { ACTIVITY_SERIES, type ActivitySeries } from '~/utils/chart-status'

/**
 * La actividad de la clase semana a semana (de lunes a domingo): cada columna
 * apila entregas, aprobaciones y pistas, cada una con su relleno y su trama, con
 * la suma escrita encima y la leyenda debajo; la tabla las da por separado, con
 * lo demás.
 */
const props = defineProps<{ weeks: WeekActivity[]; loading: boolean }>()

const { t, locale } = useI18n()

const hasActivity = computed(() =>
  props.weeks.some(
    week =>
      weekTotal(week) > 0 ||
      week.missionsCompleted > 0 ||
      week.behaviorsPositive > 0 ||
      week.behaviorsNegative > 0
  )
)

const title = (week: WeekActivity) =>
  t('teacher.analytics.weeks.week_of', { date: formatDayLong(week.week, locale.value) })

/** El nombre de cada tipo, el mismo que su columna de la tabla. */
const seriesLabel = computed<Record<ActivitySeries, string>>(() => ({
  submissions: t('teacher.analytics.weeks.col_submissions'),
  approvals: t('teacher.analytics.weeks.col_approvals'),
  hints: t('teacher.analytics.weeks.col_hints'),
}))

const legend = computed(() =>
  ACTIVITY_SERIES.map(series => ({ series, label: seriesLabel.value[series] }))
)

const seriesValue = (week: WeekActivity, series: ActivitySeries) =>
  series === 'hints' ? week.hintsUsed : week[series]

const points = computed(() =>
  props.weeks.map(week => ({
    key: week.week,
    label: formatWeekShort(week.week, locale.value),
    title: title(week),
    value: weekTotal(week),
    parts: ACTIVITY_SERIES.map(series => ({
      series,
      value: seriesValue(week, series),
      label: seriesLabel.value[series],
    })),
  }))
)

const columns = computed<ChartTableColumn[]>(() => [
  { key: 'submissions', label: t('teacher.analytics.weeks.col_submissions'), align: 'center' },
  { key: 'approvals', label: t('teacher.analytics.weeks.col_approvals'), align: 'center' },
  { key: 'hints', label: t('teacher.analytics.weeks.col_hints'), align: 'center' },
  { key: 'missions', label: t('teacher.analytics.weeks.col_missions'), align: 'center' },
  { key: 'behaviors', label: t('teacher.classes.detail.students.col_behaviors'), align: 'center' },
])

// En la tabla, la fecha corta: la larga se comería el sitio de las cifras.
const rows = computed<ChartTableRow[]>(() =>
  props.weeks.map(week => ({
    key: week.week,
    header: t('teacher.analytics.weeks.week_of', {
      date: formatWeekShort(week.week, locale.value),
    }),
    cells: {
      submissions: week.submissions,
      approvals: week.approvals,
      hints: week.hintsUsed,
      missions: week.missionsCompleted,
      behaviors: week.behaviorsPositive + week.behaviorsNegative,
    },
  }))
)
</script>
