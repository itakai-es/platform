<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <PageHeader :title="t('admin.logs.title')" :subtitle="t('admin.logs.subtitle')" />

    <!-- Tabs -->
    <TabNavigation :tabs="tabs" :active-tab="activeTab" @tab-change="switchTab" />

    <!-- ==================== System Logs Tab ==================== -->
    <template v-if="activeTab === 'system'">
      <FilterBar
        :search="systemSearch"
        sort=""
        :results-count="totalSystemLogs"
        :search-placeholder="t('admin.system_logs.filters.search_placeholder')"
        :sort-options="[]"
        variant="red"
        :has-active-filters="hasActiveSystemFilters"
        :active-filter-count="activeSystemFilterCount"
        @update:search="onSystemSearch"
        @reset="resetSystemFilters"
      >
        <template #filters>
          <SelectDropdown v-model="systemLevel" :options="levelOptions" />
          <SelectDropdown v-model="systemCategory" :options="categoryOptions" />
          <SelectDropdown v-model="systemPeriod" :options="periodOptions" />
        </template>
      </FilterBar>

      <Card type="pending">
        <!-- Loading -->
        <div v-if="isLoadingSystemLogs" class="space-y-3">
          <div
            v-for="i in 5"
            :key="i"
            class="flex gap-3 bg-white rounded-xl p-3 items-center animate-pulse"
          >
            <div class="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
            <div class="flex-1 space-y-1.5">
              <div class="h-4 bg-gray-200 rounded w-3/5" />
              <div class="h-3 bg-gray-100 rounded w-2/5" />
            </div>
            <div class="h-6 bg-gray-100 rounded-lg w-16" />
          </div>
        </div>

        <!-- List -->
        <div v-else-if="systemLogs.length > 0" class="space-y-3">
          <AdminSystemLogEntry v-for="log in systemLogs" :key="log.id" :log="log" />
        </div>

        <!-- Empty -->
        <div v-else class="text-center py-8">
          <ServerIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-navy-700 mb-2">
            {{ t('admin.system_logs.empty.title') }}
          </h3>
          <p class="text-text-secondary">{{ t('admin.system_logs.empty.description') }}</p>
        </div>
      </Card>

      <Pagination
        :current-page="systemLogsPage"
        :total-pages="systemLogsTotalPages"
        @page-change="handleSystemPageChange"
      />
    </template>

    <!-- ==================== Activity Logs Tab ==================== -->
    <template v-if="activeTab === 'activity'">
      <FilterBar
        :search="activitySearch"
        sort=""
        :results-count="totalActivities"
        :search-placeholder="t('admin.logs.filters.search_placeholder')"
        :sort-options="[]"
        variant="red"
        :has-active-filters="hasActiveActivityFilters"
        :active-filter-count="activeActivityFilterCount"
        @update:search="onActivitySearch"
        @reset="resetActivityFilters"
      >
        <template #filters>
          <SelectDropdown v-model="activitySeverity" :options="severityOptions" />
          <SelectDropdown v-model="activityType" :options="typeOptions" />
          <SelectDropdown v-model="activityPeriod" :options="periodOptions" />
        </template>
      </FilterBar>

      <Card type="pending">
        <!-- Loading -->
        <div v-if="isLoadingActivities" class="space-y-3">
          <div
            v-for="i in 5"
            :key="i"
            class="flex gap-3 bg-white rounded-xl p-3 items-center animate-pulse"
          >
            <div class="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
            <div class="flex-1 space-y-1.5">
              <div class="h-4 bg-gray-200 rounded w-3/5" />
              <div class="h-3 bg-gray-100 rounded w-2/5" />
            </div>
            <div class="h-6 bg-gray-100 rounded-lg w-16" />
          </div>
        </div>

        <!-- List -->
        <div v-else-if="activities.length > 0" class="space-y-3">
          <AdminLogEntry v-for="activity in activities" :key="activity.id" :activity="activity" />
        </div>

        <!-- Empty -->
        <div v-else class="text-center py-8">
          <ServerIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-navy-700 mb-2">
            {{ t('admin.logs.empty.title') }}
          </h3>
          <p class="text-text-secondary">{{ t('admin.logs.empty.description') }}</p>
        </div>
      </Card>

      <Pagination
        :current-page="activitiesPage"
        :total-pages="activitiesTotalPages"
        @page-change="handleActivityPageChange"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ServerIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()
useHead({
  title: () => t('admin.logs.meta.title'),
  meta: [{ name: 'description', content: () => t('admin.logs.meta.description') }],
})
definePageMeta({ layout: 'admin', middleware: ['auth', 'onboarding', 'role'], role: 'admin' })

const adminStore = useAdminStore()
const {
  activities,
  totalActivities,
  activitiesPage,
  activitiesTotalPages,
  isLoadingActivities,
  systemLogs,
  totalSystemLogs,
  systemLogsPage,
  systemLogsTotalPages,
  isLoadingSystemLogs,
} = storeToRefs(adminStore)

// ==================== Tabs ====================

const activeTab = ref('system')
const tabs = computed(() => [
  { id: 'system', label: t('admin.system_logs.tab') },
  { id: 'activity', label: t('admin.logs.tab') },
])

function switchTab(tab: string) {
  activeTab.value = tab
  if (tab === 'activity') fetchActivityLogs()
  else fetchSystemLogsFn()
}

// ==================== Shared options ====================

const periodOptions = computed(() => [
  { value: '24h', label: t('admin.logs.filters.period_24h') },
  { value: 'week', label: t('admin.logs.filters.period_week') },
  { value: 'month', label: t('admin.logs.filters.period_month') },
])

// ==================== System Logs ====================

const systemSearch = ref('')
const systemLevel = ref('')
const systemCategory = ref('')
const systemPeriod = ref('24h')
let systemSearchTimeout: ReturnType<typeof setTimeout> | null = null

const levelOptions = computed(() => [
  { value: '', label: t('admin.system_logs.filters.all_levels') },
  { value: 'error', label: t('admin.system_logs.levels.error') },
  { value: 'warning', label: t('admin.system_logs.levels.warning') },
  { value: 'success', label: t('admin.system_logs.levels.success') },
  { value: 'info', label: t('admin.system_logs.levels.info') },
])

const categoryOptions = computed(() => [
  { value: '', label: t('admin.system_logs.filters.all_categories') },
  { value: 'service_status', label: t('admin.system_logs.categories.service_status') },
  { value: 'health_check', label: t('admin.system_logs.categories.health_check') },
  { value: 'security', label: t('admin.system_logs.categories.security') },
  { value: 'performance', label: t('admin.system_logs.categories.performance') },
  { value: 'maintenance', label: t('admin.system_logs.categories.maintenance') },
  { value: 'backup', label: t('admin.system_logs.categories.backup') },
])

const hasActiveSystemFilters = computed(
  () => systemLevel.value !== '' || systemCategory.value !== '' || systemSearch.value.trim() !== ''
)
const activeSystemFilterCount = computed(
  () => (systemLevel.value ? 1 : 0) + (systemCategory.value ? 1 : 0)
)

function fetchSystemLogsFn(force = false) {
  // Cache por hash de filtros: solo dispara red si la combinacion no se vio.
  adminStore.ensureSystemLogs(
    {
      period: systemPeriod.value as '24h' | 'week' | 'month',
      level: (systemLevel.value || 'all') as 'error' | 'success' | 'warning' | 'info' | 'all',
      category: (systemCategory.value || 'all') as
        | 'security'
        | 'all'
        | 'health_check'
        | 'service_status'
        | 'performance'
        | 'maintenance'
        | 'backup',
      search: systemSearch.value,
      page: systemLogsPage.value,
      limit: 10,
    },
    force
  )
}

function onSystemSearch(value: string) {
  systemSearch.value = value
  debouncedFetchSystem()
}

function debouncedFetchSystem() {
  if (systemSearchTimeout) clearTimeout(systemSearchTimeout)
  systemSearchTimeout = setTimeout(() => fetchSystemLogsFn(), 300)
}

function handleSystemPageChange(page: number) {
  systemLogsPage.value = page
  fetchSystemLogsFn()
}

function resetSystemFilters() {
  systemSearch.value = ''
  systemLevel.value = ''
  systemCategory.value = ''
  systemPeriod.value = '24h'
  // Reset explicito: fuerza refetch para el estado limpio.
  fetchSystemLogsFn(true)
}

watch([systemLevel, systemCategory, systemPeriod], () => fetchSystemLogsFn())

// ==================== Activity Logs ====================

const activitySearch = ref('')
const activitySeverity = ref('')
const activityType = ref('')
const activityPeriod = ref('24h')
let activitySearchTimeout: ReturnType<typeof setTimeout> | null = null

const severityOptions = computed(() => [
  { value: '', label: t('admin.logs.filters.all_severities') },
  { value: 'error', label: t('admin.logs.filters.error') },
  { value: 'warning', label: t('admin.logs.filters.warning') },
  { value: 'success', label: t('admin.logs.filters.success') },
  { value: 'info', label: t('admin.logs.filters.info') },
])

const typeOptions = computed(() => [
  { value: '', label: t('admin.logs.filters.all_types') },
  { value: 'new_school', label: t('admin.logs.filters.new_school') },
  { value: 'new_users', label: t('admin.logs.filters.new_users') },
  { value: 'alert', label: t('admin.logs.filters.alert') },
  { value: 'system_update', label: t('admin.logs.filters.system_update') },
  { value: 'missions_completed', label: t('admin.logs.filters.missions_completed') },
  { value: 'user_action', label: t('admin.logs.filters.user_action') },
])

const hasActiveActivityFilters = computed(
  () =>
    activitySeverity.value !== '' || activityType.value !== '' || activitySearch.value.trim() !== ''
)
const activeActivityFilterCount = computed(
  () => (activitySeverity.value ? 1 : 0) + (activityType.value ? 1 : 0)
)

function fetchActivityLogs(force = false) {
  // Cache por hash de filtros: ensureActivityLogs reusa resultados ya cargados.
  adminStore.ensureActivityLogs(
    {
      period: activityPeriod.value as '24h' | 'week' | 'month',
      severity: (activitySeverity.value || 'all') as
        | 'error'
        | 'success'
        | 'warning'
        | 'info'
        | 'all',
      type: activityType.value || 'all',
      search: activitySearch.value,
      page: activitiesPage.value,
      limit: 10,
    },
    force
  )
}

function onActivitySearch(value: string) {
  activitySearch.value = value
  debouncedFetchActivity()
}

function debouncedFetchActivity() {
  if (activitySearchTimeout) clearTimeout(activitySearchTimeout)
  activitySearchTimeout = setTimeout(() => fetchActivityLogs(), 300)
}

function handleActivityPageChange(page: number) {
  activitiesPage.value = page
  fetchActivityLogs()
}

function resetActivityFilters() {
  activitySearch.value = ''
  activitySeverity.value = ''
  activityType.value = ''
  activityPeriod.value = '24h'
  // Reset explicito: fuerza refetch para el estado limpio.
  fetchActivityLogs(true)
}

watch([activitySeverity, activityType, activityPeriod], () => fetchActivityLogs())

// ==================== Init ====================

onMounted(() => {
  if (activeTab.value === 'system') fetchSystemLogsFn()
  else fetchActivityLogs()
})
</script>
