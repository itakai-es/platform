<template>
  <DashboardTemplate
    :title="t('admin.dashboard.title')"
    :subtitle="t('admin.dashboard.subtitle')"
    :loading-stats="isLoadingStats"
    :stats-count="3"
  >
    <template #header-actions>
      <NuxtLink to="/admin/usuarios">
        <Button variant="primary" size="md">
          <UsersIcon class="w-4 h-4 mr-2" />
          {{ t('admin.dashboard.quick_actions.manage_users') }}
        </Button>
      </NuxtLink>
    </template>

    <template #stats>
      <Card type="stats">
        <StatDisplay :value="stats?.activeUsersToday ?? 0" label="Cuentas activas hoy" />
      </Card>
      <Card type="stats">
        <StatDisplay :value="stats?.pendingSubmissions ?? 0" label="Entregas sin corregir" />
      </Card>
      <Card type="stats">
        <StatDisplay :value="stats?.activeMissions ?? 0" label="Misiones activas" />
      </Card>
    </template>

    <template #main>
      <RecentActivityCard
        :title="t('admin.dashboard.activity.title')"
        :activities="formattedActivities"
        :loading="isLoadingActivities"
        card-type="pending"
        min-height="600px"
        max-height="600px"
      >
        <template #header-actions>
          <SelectDropdown
            :model-value="activityPeriod"
            :options="[
              { value: '24h', label: t('admin.dashboard.activity.period_24h') },
              { value: '7d', label: t('admin.dashboard.activity.period_week') },
              { value: '30d', label: t('admin.dashboard.activity.period_month') },
            ]"
            @update:model-value="activityPeriod = String($event); loadActivities()"
          />
        </template>
      </RecentActivityCard>
    </template>

    <template #sidebar>
      <!-- System Services -->
      <Card type="info">
        <CardHeader :title="t('admin.dashboard.system_status.title')" :icon="ServerIcon" />

        <!-- Loading -->
        <div v-if="isLoadingServices" class="space-y-3">
          <CardItemSkeleton v-for="i in 4" :key="i" />
        </div>

        <!-- Empty state -->
        <CardItem
          v-else-if="!services || services.length === 0"
          padding="lg"
          layout="column"
          centered
        >
          <p class="text-text-secondary">{{ t('admin.dashboard.system_status.empty') }}</p>
        </CardItem>

        <!-- Services list -->
        <div v-else class="space-y-3">
          <CardItem v-for="service in services" :key="service.name" padding="sm">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-2.5 h-2.5 rounded-full flex-shrink-0',
                    getServiceDotColor(service.status),
                  ]"
                />
                <span class="text-sm text-navy-700 font-medium">{{ service.name }}</span>
              </div>
              <span :class="['text-xs font-medium', getServiceDetailColor(service.status)]">
                {{ service.detail || getServiceStatusText(service.status) }}
              </span>
            </div>
          </CardItem>
        </div>
      </Card>
    </template>
  </DashboardTemplate>
</template>

<script setup lang="ts">
import { UsersIcon, ServerIcon } from '@heroicons/vue/24/outline'
import type { SystemActivity } from '~/types/admin.types'

const { t } = useI18n()

useHead({
  title: () => t('admin.dashboard.meta.title'),
  meta: [{ name: 'description', content: () => t('admin.dashboard.meta.description') }],
})

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'onboarding', 'role'],
  role: 'admin',
})

const adminStore = useAdminStore()
const { stats, activities, services, isLoadingStats, isLoadingActivities, isLoadingServices } =
  storeToRefs(adminStore)

const activityPeriod = ref('24h')

// Rewrite student-facing description to admin (3rd person) perspective
// and wrap quoted names in <strong> for readability
const toAdminPerspective = (desc: string): string => {
  let text = desc
    .replace(/^Tu entrega de /i, 'Entrega de ')
    .replace(/^Has enviado /i, 'Envió ')
    .replace(/^Has completado /i, 'Completó ')
    .replace(/^Has comenzado /i, 'Comenzó ')
    .replace(/^Te has unido a /i, 'Se unió a ')
    .replace(/ fue aprobada$/i, ' aprobada')

  // Wrap "quoted text" in <strong>
  text = text.replace(/"([^"]+)"/g, '<strong>"$1"</strong>')
  // Also wrap text after "la clase " / "la misión " if no quotes
  text = text.replace(/(la clase |la misión )((?!<strong>)[^"<]+)$/i, '$1<strong>$2</strong>')

  return text
}

// Format activities for RecentActivityCard
const formatTimeAgo = (raw: string): string => {
  const date = new Date(raw)
  if (isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return '< 1m'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  return `${diffDays}d`
}

const formattedActivities = computed(() => {
  return activities.value.map((a: SystemActivity) => ({
    id: a.id,
    username: a.userName,
    avatar: a.avatar || undefined,
    description: toAdminPerspective(a.description || a.title || 'Actividad del sistema'),
    timeAgo: formatTimeAgo(a.createdAt || a.timestamp || ''),
  }))
})

// Service status dot
const getServiceDotColor = (status: string) => {
  const colors: Record<string, string> = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  }
  return colors[status] || 'bg-gray-400'
}

// Service detail text color
const getServiceDetailColor = (status: string) => {
  const colors: Record<string, string> = {
    operational: 'text-green-600',
    degraded: 'text-yellow-600',
    down: 'text-red-500',
  }
  return colors[status] || 'text-text-secondary'
}

// Service status text
const getServiceStatusText = (status: string) => {
  const texts: Record<string, string> = {
    operational: t('admin.dashboard.system_status.operational'),
    degraded: t('admin.dashboard.system_status.degraded'),
    down: t('admin.dashboard.system_status.down'),
  }
  return texts[status] || t('admin.dashboard.system_status.unknown')
}

// Load activities with period filter (uses cache per period via ensureActivities)
const loadActivities = () => {
  adminStore.ensureActivities(activityPeriod.value)
}

onMounted(async () => {
  await Promise.all([
    adminStore.ensureStats(),
    adminStore.ensureActivities(activityPeriod.value),
    adminStore.ensureServices(),
  ])
})
</script>
