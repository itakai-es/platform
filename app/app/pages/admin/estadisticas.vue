<template>
  <div class="space-y-6 w-full min-w-0 max-w-full">
    <!-- Page Header -->
    <PageHeader :title="t('admin.analytics.title')" :subtitle="t('admin.analytics.subtitle')">
      <!-- El periodo, con las mismas píldoras que el de la analítica de las clases -->
      <template #actions>
        <TabNavigation
          variant="pills"
          toggle
          :tabs="periods"
          :active-tab="activePeriod"
          :aria-label="t('teacher.analytics.period.label')"
          @tab-change="activePeriod = $event as AdminAnalyticsPeriod"
        />
      </template>
    </PageHeader>

    <AdminTeacherRegistration />

    <!-- No ha llegado: se dice y se puede reintentar -->
    <Card v-if="!analytics && analyticsFailed[activePeriod]" type="stats">
      <CardItem layout="column" padding="lg" centered>
        <LoadError @retry="adminStore.ensureAnalytics(activePeriod, true)" />
      </CardItem>
    </Card>

    <!-- Loading State -->
    <div v-else-if="!analytics" class="space-y-6">
      <CardGrid cols="4">
        <StatCardSkeleton v-for="i in 4" :key="i" type="stats" />
      </CardGrid>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card v-for="i in 2" :key="i" type="clases"
          ><CardItem padding="lg" layout="column"
            ><Skeleton width="w-32" height="h-4" />
            <div class="space-y-3 mt-4">
              <Skeleton v-for="j in 4" :key="j" width="w-full" height="h-3" /></div></CardItem
        ></Card>
      </div>
      <Card type="clases"
        ><CardItem padding="lg" layout="column"
          ><Skeleton width="w-32" height="h-4" /><Skeleton
            width="w-full"
            height="h-28"
            class="mt-4" /></CardItem
      ></Card>
      <CardGrid cols="4">
        <StatCardSkeleton v-for="i in 4" :key="i" type="stats" />
      </CardGrid>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card v-for="i in 3" :key="i" type="info"
          ><CardItem padding="lg" layout="column"
            ><Skeleton width="w-24" height="h-4" />
            <div class="space-y-2 mt-3">
              <Skeleton v-for="j in 3" :key="j" width="w-full" height="h-5" /></div></CardItem
        ></Card>
      </div>
      <Card type="ia"
        ><CardItem padding="lg" layout="column"
          ><Skeleton width="w-40" height="h-4" /><Skeleton
            width="w-full"
            height="h-20"
            class="mt-4" /></CardItem
      ></Card>
    </div>

    <template v-else-if="analytics">
      <!-- Cifras del periodo, frente al periodo anterior de la misma duración -->
      <CardGrid cols="4">
        <Card v-for="kpi in kpiCards" :key="kpi.key" type="stats">
          <StatDisplay :value="kpi.value" :label="kpi.label" />
          <KpiDelta :current="kpi.current" :previous="kpi.previous" :rate="kpi.rate" />
        </Card>
      </CardGrid>

      <!-- System Health Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- System Resources -->
        <Card type="clases">
          <CardHeader
            :title="t('admin.analytics.sections.system_resources')"
            :icon="CpuChipIcon"
            title-tag="h2"
          />
          <CardItem padding="lg" layout="column">
            <div class="space-y-5">
              <GaugeBar label="CPU" :value="analytics.systemHealth.cpuUsage" :max="100" unit="%" />
              <GaugeBar
                :label="t('admin.analytics.system.memory')"
                :value="analytics.systemHealth.memoryUsage"
                :max="100"
                unit="%"
              />
              <GaugeBar
                :label="t('admin.analytics.system.disk')"
                :value="analytics.systemHealth.diskUsage"
                :max="100"
                :unit="
                  analytics.systemHealth.diskTotalGB
                    ? `% (${analytics.systemHealth.diskUsedGB}/${analytics.systemHealth.diskTotalGB} GB)`
                    : '%'
                "
                :warn-at="75"
                :danger-at="90"
              />
              <GaugeBar
                :label="t('admin.analytics.system.db_latency')"
                :value="analytics.systemHealth.dbLatency"
                :max="200"
                unit=" ms"
                :warn-at="50"
                :danger-at="100"
              />
            </div>
          </CardItem>
        </Card>

        <!-- Estado de los servicios: llega aparte (sondear la IA tarda), con su
             propio esqueleto; el resto de la página no lo espera -->
        <Card type="clases">
          <CardHeader
            :title="t('admin.analytics.sections.service_health')"
            :icon="ServerIcon"
            title-tag="h2"
          />
          <CardItem padding="lg" layout="column">
            <LoadError
              v-if="!analyticsServices && analyticsServicesFailed"
              :heading-level="3"
              @retry="adminStore.fetchAnalyticsServices()"
            />
            <div v-else-if="!analyticsServices" class="space-y-3" aria-hidden="true">
              <Skeleton v-for="j in 3" :key="j" width="w-full" height="h-6" />
            </div>
            <!-- Si no cabe (móvil con letra grande), se desplaza dentro de su caja,
                 con la barra a la vista y alcanzable con el teclado (como ChartTable) -->
            <div
              v-else
              class="scrollbar-visible relative -mx-2 overflow-x-auto"
              role="region"
              tabindex="0"
              :aria-label="t('admin.analytics.sections.service_health')"
            >
              <table class="w-full text-sm">
                <caption class="sr-only">
                  {{ t('admin.analytics.sections.service_health') }}
                </caption>
                <thead>
                  <tr class="border-b border-navy-700/10">
                    <th scope="col" class="text-left py-2 px-2 text-xs font-semibold text-navy-700/80">
                      {{ t('admin.analytics.table.service') }}
                    </th>
                    <th scope="col" class="text-center py-2 px-2 text-xs font-semibold text-navy-700/80">
                      {{ t('admin.analytics.table.status') }}
                    </th>
                    <th scope="col" class="text-right py-2 px-2 text-xs font-semibold text-navy-700/80">
                      {{ t('admin.analytics.table.latency') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="svc in analyticsServices"
                    :key="svc.key"
                    class="border-b border-navy-700/5 last:border-0"
                  >
                    <th scope="row" class="py-2.5 px-2 text-left font-medium text-navy-700 text-xs">
                      {{ serviceName(svc.key) }}
                    </th>
                    <td class="py-2.5 px-2 text-center">
                      <span
                        :class="[
                          'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full',
                          statusPillClass(svc.status),
                        ]"
                      >
                        <span :class="['w-1.5 h-1.5 rounded-full', statusDotClass(svc.status)]" />
                        {{ statusLabel(svc.status) }}
                      </span>
                    </td>
                    <!-- Sin medida (no respondió, o comparte la del texto): «—» -->
                    <td class="py-2.5 px-2 text-right text-xs tabular-nums text-navy-700">
                      {{ svc.latencyMs === null ? '—' : `${formatNumber(svc.latencyMs)} ms` }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardItem>
        </Card>
      </div>

      <!-- Series del periodo: lo que se ha medido, sin estimaciones -->
      <Card type="clases">
        <CardHeader
          :title="t('admin.analytics.sections.period_series')"
          :icon="ChartBarIcon"
          title-tag="h2"
        />
        <CardGrid cols="3">
          <CardItem v-for="chart in seriesCharts" :key="chart.key" padding="lg" layout="column">
            <p class="text-xs font-semibold text-navy-700/70 mb-3">{{ chart.label }}</p>
            <ActivityColumns :points="chart.points" :label="chart.label" dense />
          </CardItem>
        </CardGrid>
      </Card>

      <!-- Totales de la plataforma (las misiones completadas van arriba, con su comparación) -->
      <CardGrid cols="3">
        <Card type="stats">
          <StatDisplay
            :value="formatNumber(analytics.overview.totalUsers)"
            :label="t('admin.analytics.overview.total_users')"
          />
          <p class="text-sm text-navy-700 font-medium">
            +{{ formatNumber(analytics.overview.newUsersThisPeriod) }}
          </p>
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="formatNumber(analytics.overview.activeUsersToday)"
            :label="t('admin.analytics.overview.active_today')"
          />
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="formatNumber(analytics.overview.pendingSubmissions)"
            :label="t('admin.analytics.overview.pending_reviews')"
          />
        </Card>
      </CardGrid>

      <!-- Distribution Charts Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Users by Role -->
        <Card type="info">
          <CardHeader
            :title="t('admin.analytics.sections.users_by_role')"
            :icon="UsersIcon"
            title-tag="h2"
          />
          <CardItem padding="lg" layout="column">
            <DistributionBar
              v-for="metric in distributions.roles"
              :key="metric.key"
              :label="metric.label"
              :value="metric.value"
              :percentage="metric.percentage"
              :tone="metric.tone"
            />
          </CardItem>
        </Card>

        <!-- Missions by Status -->
        <Card type="info">
          <CardHeader
            :title="t('admin.analytics.sections.missions_by_status')"
            :icon="RocketLaunchIcon"
            title-tag="h2"
          />
          <CardItem padding="lg" layout="column">
            <DistributionBar
              v-for="metric in distributions.statuses"
              :key="metric.key"
              :label="metric.label"
              :value="metric.value"
              :percentage="metric.percentage"
              :tone="metric.tone"
            />
          </CardItem>
        </Card>

        <!-- Missions by Rarity -->
        <Card type="info">
          <CardHeader
            :title="t('admin.analytics.sections.missions_by_rarity')"
            :icon="SparklesIcon"
            title-tag="h2"
          />
          <CardItem padding="lg" layout="column">
            <DistributionBar
              v-for="metric in distributions.rarities"
              :key="metric.key"
              :label="metric.label"
              :value="metric.value"
              :percentage="metric.percentage"
              :tone="metric.tone"
            />
          </CardItem>
        </Card>
      </div>

      <!-- AI Usage Section -->
      <Card type="ia">
        <CardHeader
          :title="t('admin.analytics.sections.ai_usage')"
          :icon="ChatBubbleLeftRightIcon"
          title-tag="h2"
        />

        <CardGrid cols="2">
          <CardItem v-for="figure in aiFigures" :key="figure.key" padding="md" layout="column" centered>
            <p class="text-2xl font-bold text-navy-700">{{ figure.value }}</p>
            <p class="text-xs text-navy-700/70 mt-1">{{ figure.label }}</p>
          </CardItem>
        </CardGrid>

        <CardItem padding="lg" layout="column">
          <DistributionBar
            v-for="metric in distributions.assistants"
            :key="metric.key"
            :label="metric.label"
            :value="metric.value"
            :percentage="metric.percentage"
            :tone="metric.tone"
          />
        </CardItem>
      </Card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  CpuChipIcon,
  ServerIcon,
  ChartBarIcon,
  UsersIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/vue/24/outline'
import type { DistributionTone } from '~/components/atoms/DistributionBar.vue'
import type {
  AdminAnalyticsPeriod,
  AnalyticsMetric,
  ServiceKey,
  TimeSeriesPoint,
} from '~/types/admin.types'
import {
  formatDayLong,
  formatMonthLong,
  formatMonthShort,
  formatWeekShort,
} from '~/utils/analytics-view'

const { t, te, locale } = useI18n()
useHead({
  title: () => t('admin.analytics.meta.title'),
  meta: [{ name: 'description', content: () => t('admin.analytics.meta.description') }],
})
definePageMeta({ layout: 'admin', middleware: ['auth', 'onboarding', 'role'], role: 'admin' })

const adminStore = useAdminStore()
const { analyticsByPeriod, analyticsFailed, analyticsServices, analyticsServicesFailed } =
  storeToRefs(adminStore)

const activePeriod = ref<AdminAnalyticsPeriod>('month')
const periods = computed(() =>
  (['week', 'month', 'quarter'] as const).map(id => ({
    id,
    label: t(`admin.analytics.period.${id}`),
  }))
)

/** Lo del periodo elegido; mientras llega, su esqueleto (nunca lo de otro periodo). */
const analytics = computed(() => analyticsByPeriod.value[activePeriod.value] ?? null)

// Al entrar y al cambiar de periodo (lo ya visto se queda en el store), con un
// respiro por si se pasa de uno a otro seguido.
watchDebounced(activePeriod, period => void adminStore.ensureAnalytics(period), {
  debounce: 300,
  immediate: true,
})
// El estado de los servicios, aparte y en vivo: la página no lo espera.
onMounted(() => void adminStore.fetchAnalyticsServices())

const { formatNumber, formatPercent } = useNumberFormat()

/** Lo del periodo frente al anterior: todo medido, nada estimado. */
const kpiCards = computed(() => {
  const k = analytics.value?.kpis
  if (!k) return []
  return [
    {
      key: 'activity',
      label: t('admin.analytics.kpis.activity'),
      value: formatNumber(k.activity.current),
      ...k.activity,
      rate: false,
    },
    {
      key: 'new_users',
      label: t('admin.analytics.kpis.new_users'),
      value: formatNumber(k.newUsers.current),
      ...k.newUsers,
      rate: false,
    },
    {
      key: 'missions_completed',
      label: t('admin.analytics.kpis.missions_completed'),
      value: formatNumber(k.missionsCompleted.current),
      ...k.missionsCompleted,
      rate: false,
    },
    {
      key: 'error_rate',
      label: t('admin.analytics.kpis.error_rate'),
      value: formatPercent(k.errorRate.current, 1),
      ...k.errorRate,
      rate: true,
    },
  ]
})

/**
 * Las columnas de una serie: cada tramo con su fecha de inicio, escrita en el
 * idioma de la app. El trimestre va por meses («oct»); la semana, por días, y el
 * mes, en cuatro tramos, por el día en que empieza cada uno («14 oct»). Para el
 * lector y la tabla, la fecha entera.
 */
function columnsOf(series: TimeSeriesPoint[]) {
  const months = activePeriod.value === 'quarter'
  return series.map(point => ({
    key: point.start,
    label: months
      ? formatMonthShort(point.start, locale.value)
      : formatWeekShort(point.start, locale.value),
    title: months
      ? formatMonthLong(point.start, locale.value)
      : formatDayLong(point.start, locale.value),
    value: point.value,
  }))
}

/** Las series del periodo. */
const seriesCharts = computed(() => {
  const a = analytics.value
  if (!a) return []
  return [
    {
      key: 'new_users',
      label: t('admin.analytics.sections.new_users'),
      points: columnsOf(a.newUsersSeries),
    },
    {
      key: 'activity',
      label: t('admin.analytics.sections.activity'),
      points: columnsOf(a.activitySeries),
    },
    {
      key: 'assistant_messages',
      label: t('admin.analytics.sections.assistant_messages'),
      points: columnsOf(a.aiUsage.messagesSeries),
    },
  ]
})

const aiFigures = computed(() => {
  const ai = analytics.value?.aiUsage
  if (!ai) return []
  return [
    { key: 'messages', label: t('admin.analytics.ai.total_messages'), value: formatNumber(ai.totalMessages) },
    {
      key: 'conversations',
      label: t('admin.analytics.ai.total_conversations'),
      value: formatNumber(ai.totalConversations),
    },
  ]
})

// ---- Repartos: el nombre y el color de cada clave ----

/** El nombre y el color de una clave. Una que no se conoce, tal cual y en morado. */
interface KeyLook {
  label: string
  tone: DistributionTone
}

const roleLooks = computed<Record<string, KeyLook>>(() => ({
  teacher: { label: t('admin.users.filters.teachers'), tone: 'navy' },
  student: { label: t('admin.users.filters.students'), tone: 'purple' },
  admin: { label: t('admin.users.filters.admins'), tone: 'sky' },
  none: { label: t('admin.analytics.no_role'), tone: 'yellow' },
}))
const statusLooks = computed<Record<string, KeyLook>>(() => ({
  activa: { label: t('teacher.components.mission_filter_bar.status.active'), tone: 'green' },
  bloqueada: { label: t('teacher.components.mission_filter_bar.status.locked'), tone: 'navy' },
}))
// Los colores de las rarezas, los de sus píldoras (`RarityBadge`).
const RARITY_TONE: Record<string, DistributionTone> = {
  comun: 'green',
  rara: 'purple-light',
  epica: 'purple',
  legendaria: 'legendary',
}

const lookOf = (metric: AnalyticsMetric, looks: Record<string, KeyLook>): KeyLook =>
  looks[metric.key] ?? { label: metric.key, tone: 'purple' }

function rarityLook(metric: AnalyticsMetric): KeyLook {
  const path = `student.components.rarity_badge.${metric.key}`
  return {
    label: te(path) ? t(path) : metric.key,
    tone: RARITY_TONE[metric.key] ?? 'purple',
  }
}

/** Los asistentes, con su nombre (el de su personaje) y todos del mismo color. */
function assistantLook(metric: AnalyticsMetric): KeyLook {
  const path = `common.avatars.characters.${metric.key}.name`
  return { label: te(path) ? t(path) : metric.key, tone: 'purple' }
}

const distributions = computed(() => {
  const a = analytics.value
  const rows = (list: AnalyticsMetric[] | undefined, look: (metric: AnalyticsMetric) => KeyLook) =>
    (list ?? []).map(metric => ({
      key: metric.key,
      value: metric.value,
      percentage: metric.percentage,
      ...look(metric),
    }))
  return {
    roles: rows(a?.usersByRole, metric => lookOf(metric, roleLooks.value)),
    statuses: rows(a?.missionsByStatus, metric => lookOf(metric, statusLooks.value)),
    rarities: rows(a?.missionsByRarity, rarityLook),
    assistants: rows(a?.aiUsage.messagesByAssistant, assistantLook),
  }
})

// ---- Servicios ----

const serviceName = (key: ServiceKey | string) => {
  const path = `admin.analytics.services.${key}`
  return te(path) ? t(path) : key
}

const statusPillClass = (s: string) =>
  ({
    operational: 'bg-green-100 text-green-700',
    degraded: 'bg-yellow-100 text-yellow-700',
    down: 'bg-red-100 text-red-600',
  })[s] || 'bg-gray-100 text-gray-500'

const statusDotClass = (s: string) =>
  ({
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  })[s] || 'bg-gray-400'

const statusLabel = (s: string) =>
  ({
    operational: t('admin.analytics.status.operational'),
    degraded: t('admin.analytics.status.degraded'),
    down: t('admin.analytics.status.down'),
  })[s] || s
</script>
