<template>
  <Card type="stats">
    <CardHeader
      :title="t('teacher.classes.detail.stats_title')"
      :icon="ChartPieIcon"
      title-tag="h2"
    />
    <AnalyticsPeriodPicker />

    <CardItem v-if="error" layout="column" padding="lg" centered>
      <LoadError :rate-limited="error === 'rate_limited'" @retry="emit('retry')" />
    </CardItem>

    <CardGrid v-else-if="!summary" cols="tiles">
      <StatCardSkeleton v-for="i in 3" :key="i" />
    </CardGrid>

    <template v-else>
      <CardGrid cols="tiles">
        <StatTile
          surface="item"
          size="sm"
          :label="t('teacher.analytics.summary.avg_missions')"
          :value="summary.averageMissionsCompleted ?? '—'"
          :total="summary.averageMissionsCompleted === null ? undefined : summary.missionsCounted"
          :symbol="RocketLaunchIcon"
        >
          <template #detail>{{ t('teacher.analytics.summary.today') }}</template>
        </StatTile>
        <StatTile
          surface="item"
          size="sm"
          :label="t('teacher.analytics.summary.avg_percent')"
          :value="summary.averagePercent === null ? '—' : formatPercent(summary.averagePercent)"
          :ring="summary.averagePercent === null ? null : percentFraction(summary.averagePercent)"
        >
          <template #detail
            >{{ t('teacher.analytics.summary.today') }} ·
            {{ t('teacher.students.detail.stat_required_enigmas') }}</template
          >
        </StatTile>
        <StatTile
          surface="item"
          size="sm"
          :label="t('teacher.classes.detail.pending_reviews')"
          :value="summary.pendingReviews"
          :symbol="InboxArrowDownIcon"
        >
          <template #detail>
            {{ t('teacher.analytics.summary.today') }} ·
            <NuxtLink
              :to="`/profesor/clases/${classId}/misiones`"
              class="underline decoration-navy-700/30 underline-offset-2 hover:decoration-navy-700"
              >{{ t('teacher.analytics.summary.pending_link') }}</NuxtLink
            >
          </template>
        </StatTile>
        <StatTile
          v-if="showAttendance && summary.attendance"
          surface="item"
          size="sm"
          :label="t('teacher.analytics.summary.attendance')"
          :value="summary.attendance.rate === null ? '—' : formatPercent(summary.attendance.rate)"
          :ring="summary.attendance.rate === null ? null : percentFraction(summary.attendance.rate)"
        >
          <template #detail>{{
            t(
              'teacher.analytics.summary.attendance_sessions',
              { count: summary.attendance.sessions },
              summary.attendance.sessions
            )
          }}</template>
        </StatTile>
        <StatTile
          v-if="summary.xp"
          surface="item"
          size="sm"
          :label="t('teacher.analytics.summary.xp')"
          :value="summary.xp.average ?? '—'"
          :symbol="XpIcon"
          symbol-tone="purple"
          :symbol-props="{ mono: true }"
        >
          <template #detail>{{ t('teacher.analytics.summary.today') }}</template>
        </StatTile>
      </CardGrid>
      <!-- Las cuentas sin estrenar salen en la tabla, pero no cuentan en las medias -->
      <p v-if="unstarted > 0" class="text-sm text-navy-700">
        {{ t('teacher.analytics.summary.unstarted_note', { count: unstarted }, unstarted) }}
      </p>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ChartPieIcon } from '@heroicons/vue/24/outline'
import { InboxArrowDownIcon, RocketLaunchIcon } from '@heroicons/vue/24/solid'
import XpIcon from '~/components/atoms/XpIcon.vue'
import type { ClassAnalyticsSummary } from '~/types/analytics.types'
import { percentFraction } from '~/utils/progress-ring'

/**
 * Las cifras del panel de la clase, con el selector de periodo: cada una dice
 * qué cuenta («3 de 8», no «37 %»). Asistencia y XP, solo si la clase las usa.
 * Cada cifra con su icono en un círculo; el % medio y la asistencia, dentro de su
 * anillo.
 * Lo que es el estado de hoy lo dice en su detalle («Hoy»): el periodo no lo
 * cambia. La asistencia sí es del periodo («en este periodo»).
 */
const props = defineProps<{
  classId: string
  summary: ClassAnalyticsSummary | null
  error: 'error' | 'rate_limited' | null
  showAttendance: boolean
}>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const { formatPercent } = useNumberFormat()

const unstarted = computed(() =>
  props.summary ? props.summary.students - props.summary.participating : 0
)
</script>
