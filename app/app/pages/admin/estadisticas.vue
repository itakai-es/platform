<template>
  <div class="space-y-6 w-full min-w-0 max-w-full">
    <!-- Page Header -->
    <PageHeader :title="t('admin.analytics.title')" :subtitle="t('admin.analytics.subtitle')">
      <template #actions>
        <div class="flex gap-1 border-b border-border-primary">
          <button
            v-for="p in periods"
            :key="p.value"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activePeriod === p.value
                ? 'border-purple text-purple'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ]"
            @click="changePeriod(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
      </template>
    </PageHeader>

    <!-- Loading State -->
    <div v-if="isLoadingAnalytics" class="space-y-6">
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
      <!-- KPI Stats Row -->
      <CardGrid cols="4">
        <Card type="stats">
          <StatDisplay
            :value="`${analytics.kpis.avgResponseTime}ms`"
            :label="t('admin.analytics.kpis.avg_response')"
          />
          <KpiDelta
            :current="analytics.kpis.avgResponseTime"
            :previous="analytics.kpis.avgResponseTimePrev"
            invert
          />
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="`${analytics.kpis.requestsPerMinute}`"
            suffix=" rpm"
            :label="t('admin.analytics.kpis.requests_per_min')"
          />
          <KpiDelta
            :current="analytics.kpis.requestsPerMinute"
            :previous="analytics.kpis.requestsPerMinutePrev"
          />
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="`${analytics.kpis.errorRate}%`"
            :label="t('admin.analytics.kpis.error_rate')"
          />
          <KpiDelta
            :current="analytics.kpis.errorRate"
            :previous="analytics.kpis.errorRatePrev"
            invert
          />
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="`${analytics.kpis.uptimePercent}%`"
            :label="t('admin.analytics.kpis.uptime')"
          />
        </Card>
      </CardGrid>

      <!-- System Health Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- System Resources -->
        <Card type="clases">
          <CardHeader
            :title="t('admin.analytics.sections.system_resources')"
            :icon="CpuChipIcon"
            title-tag="h3"
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
                unit="ms"
                :warn-at="50"
                :danger-at="100"
              />
            </div>
          </CardItem>
        </Card>

        <!-- Service Health -->
        <Card type="clases">
          <CardHeader
            :title="t('admin.analytics.sections.service_health')"
            :icon="ServerIcon"
            title-tag="h3"
          />
          <CardItem padding="lg" layout="column">
            <div class="overflow-x-auto -mx-2">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-navy-700/10">
                    <th class="text-left py-2 px-2 text-xs font-semibold text-navy-700/70">
                      {{ t('admin.analytics.table.service') }}
                    </th>
                    <th class="text-center py-2 px-2 text-xs font-semibold text-navy-700/70">
                      {{ t('admin.analytics.table.status') }}
                    </th>
                    <th class="text-right py-2 px-2 text-xs font-semibold text-navy-700/70">
                      {{ t('admin.analytics.table.uptime') }}
                    </th>
                    <th class="text-right py-2 px-2 text-xs font-semibold text-navy-700/70">
                      {{ t('admin.analytics.table.latency') }}
                    </th>
                    <th
                      class="text-right py-2 px-2 text-xs font-semibold text-navy-700/70 hidden sm:table-cell"
                    >
                      P95
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="svc in analytics.serviceHealth"
                    :key="svc.name"
                    class="border-b border-navy-700/5 last:border-0"
                  >
                    <td class="py-2.5 px-2 font-medium text-navy-700 text-xs">{{ svc.name }}</td>
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
                    <td class="py-2.5 px-2 text-right text-xs text-navy-700/70">
                      {{ svc.uptime }}%
                    </td>
                    <td
                      class="py-2.5 px-2 text-right text-xs font-mono"
                      :class="svc.avgLatency > 500 ? 'text-yellow-600' : 'text-navy-700/70'"
                    >
                      {{ svc.avgLatency }}ms
                    </td>
                    <td
                      class="py-2.5 px-2 text-right text-xs font-mono text-navy-700/70 hidden sm:table-cell"
                    >
                      {{ svc.p95Latency }}ms
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardItem>
        </Card>
      </div>

      <!-- Time Series Charts -->
      <Card type="clases">
        <CardHeader
          :title="t('admin.analytics.sections.response_time')"
          :icon="ChartBarIcon"
          title-tag="h3"
        />
        <CardGrid cols="2">
          <CardItem padding="lg" layout="column">
            <p class="text-xs font-semibold text-navy-700/70 mb-3">
              {{ t('admin.analytics.sections.response_time') }}
            </p>
            <MiniBarChart :data="analytics.responseTimeSeries" color="#8B5CF6" unit="ms" />
          </CardItem>
          <CardItem padding="lg" layout="column">
            <p class="text-xs font-semibold text-navy-700/70 mb-3">
              {{ t('admin.analytics.sections.active_users') }}
            </p>
            <MiniBarChart :data="analytics.activeUsersSeries" color="#6FEDB7" />
          </CardItem>
          <CardItem padding="lg" layout="column">
            <p class="text-xs font-semibold text-navy-700/70 mb-3">
              {{ t('admin.analytics.sections.requests') }}
            </p>
            <MiniBarChart :data="analytics.requestsSeries" color="#3B82F6" />
          </CardItem>
          <CardItem padding="lg" layout="column">
            <p class="text-xs font-semibold text-navy-700/70 mb-3">
              {{ t('admin.analytics.sections.tokens_over_time') }}
            </p>
            <MiniBarChart :data="analytics.aiUsage.tokensSeries" color="rgb(var(--palette-amber-500))" />
          </CardItem>
        </CardGrid>
      </Card>

      <!-- Platform Overview -->
      <CardGrid cols="4">
        <Card type="stats">
          <StatDisplay
            :value="formatNumber(analytics.overview.totalUsers)"
            :label="t('admin.analytics.overview.total_users')"
          />
          <p class="text-sm text-navy-700/70 font-medium">
            +{{ analytics.overview.newUsersThisPeriod }}
          </p>
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="analytics.overview.activeUsersToday"
            :label="t('admin.analytics.overview.active_today')"
          />
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="formatNumber(analytics.overview.missionsCompleted)"
            :label="t('admin.analytics.overview.missions_completed')"
          />
          <p class="text-sm text-navy-700/70 font-medium">
            +{{ analytics.overview.newMissionsThisPeriod }}
          </p>
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="`${analytics.overview.avgCompletionRate}%`"
            :label="t('admin.analytics.overview.completion_rate')"
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
            title-tag="h3"
          />
          <CardItem padding="lg" layout="column">
            <DistributionBar
              v-for="metric in analytics.usersByRole"
              :key="metric.label"
              v-bind="metric"
            />
          </CardItem>
        </Card>

        <!-- Missions by Status -->
        <Card type="info">
          <CardHeader
            :title="t('admin.analytics.sections.missions_by_status')"
            :icon="RocketLaunchIcon"
            title-tag="h3"
          />
          <CardItem padding="lg" layout="column">
            <DistributionBar
              v-for="metric in analytics.missionsByStatus"
              :key="metric.label"
              v-bind="metric"
            />
          </CardItem>
        </Card>

        <!-- Missions by Rarity -->
        <Card type="info">
          <CardHeader
            :title="t('admin.analytics.sections.missions_by_rarity')"
            :icon="SparklesIcon"
            title-tag="h3"
          />
          <CardItem padding="lg" layout="column">
            <DistributionBar
              v-for="metric in analytics.missionsByRarity"
              :key="metric.label"
              v-bind="metric"
            />
          </CardItem>
        </Card>
      </div>

      <!-- AI Usage Section -->
      <Card type="ia">
        <CardHeader
          :title="t('admin.analytics.sections.ai_usage')"
          :icon="ChatBubbleLeftRightIcon"
          title-tag="h3"
        />

        <CardGrid cols="4">
          <CardItem padding="md" layout="column" centered>
            <p class="text-2xl font-bold text-navy-700">
              {{ formatNumber(analytics.aiUsage.totalTokensUsed) }}
            </p>
            <p class="text-xs text-navy-700/70 mt-1">{{ t('admin.analytics.ai.total_tokens') }}</p>
          </CardItem>
          <CardItem padding="md" layout="column" centered>
            <p class="text-2xl font-bold text-navy-700">
              {{ formatNumber(analytics.aiUsage.avgTokensPerUser) }}
            </p>
            <p class="text-xs text-navy-700/70 mt-1">
              {{ t('admin.analytics.ai.avg_tokens_user') }}
            </p>
          </CardItem>
          <CardItem padding="md" layout="column" centered>
            <p class="text-2xl font-bold text-navy-700">
              {{ formatNumber(analytics.aiUsage.totalConversations) }}
            </p>
            <p class="text-xs text-navy-700/70 mt-1">
              {{ t('admin.analytics.ai.total_conversations') }}
            </p>
          </CardItem>
          <CardItem padding="md" layout="column" centered>
            <p class="text-2xl font-bold text-navy-700">
              {{ analytics.aiUsage.avgConversationsPerUser }}
            </p>
            <p class="text-xs text-navy-700/70 mt-1">
              {{ t('admin.analytics.ai.avg_conversations_user') }}
            </p>
          </CardItem>
        </CardGrid>

        <CardItem padding="lg" layout="column">
          <DistributionBar
            v-for="assistant in analytics.aiUsage.tokensByAssistant"
            :key="assistant.label"
            v-bind="assistant"
            :show-count="true"
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

const { t } = useI18n()
useHead({
  title: () => t('admin.analytics.meta.title'),
  meta: [{ name: 'description', content: () => t('admin.analytics.meta.description') }],
})
definePageMeta({ layout: 'admin', middleware: ['auth', 'onboarding', 'role'], role: 'admin' })

const adminStore = useAdminStore()
const { analytics, isLoadingAnalytics } = storeToRefs(adminStore)

const activePeriod = ref<'week' | 'month' | 'quarter'>('month')
const periods = [
  { value: 'week' as const, label: t('admin.analytics.period.week') },
  { value: 'month' as const, label: t('admin.analytics.period.month') },
  { value: 'quarter' as const, label: t('admin.analytics.period.quarter') },
]

const changePeriod = (period: 'week' | 'month' | 'quarter') => {
  activePeriod.value = period
}

// Carga inicial + cambios de periodo con cache por periodo (en store) y debounce 300ms
watchDebounced(
  activePeriod,
  period => {
    adminStore.ensureAnalytics(period)
  },
  { debounce: 300, immediate: true }
)

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
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
