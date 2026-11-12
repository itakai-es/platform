<template>
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
    <!-- Left Column (2/3): el panel de la clase, en orden de uso -->
    <div class="min-w-0 xl:col-span-2 space-y-4 md:space-y-6">
      <ClassAnalyticsSummary
        :class-id="classId"
        :summary="analytics?.summary ?? null"
        :error="analyticsError"
        :show-attendance="can('attendance.view')"
        @retry="ensureAnalytics(period)"
      />
      <!-- Todo sale de la misma petición: si falla, lo dice una vez, arriba -->
      <template v-if="!analyticsError">
        <ClassAnalyticsMissions
          :class-id="classId"
          :missions="analytics?.missions ?? []"
          :loading="!analytics"
        />
        <AnalyticsSignalsCard :signals="signals" :loading="!analytics" />
        <ClassAnalyticsStudents
          :class-id="classId"
          :students="analytics?.students ?? []"
          :loading="!analytics"
          :show-attendance="showAttendance"
        />
        <ClassAnalyticsWeeks :weeks="analytics?.weeks ?? []" :loading="!analytics" />
      </template>
    </div>

    <!-- Right Column (1/3): Sidebar widgets -->
    <div class="min-w-0 space-y-4 md:space-y-6">
      <AIAssistantCard :class-id="classId" />
      <RecentActivityCard :activities="recentActivities" card-type="pending" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const route = useRoute()
const classId = computed(() => route.params.id as string)

// Carga la clase a través del store (cacheado). El padre [id].vue ya invoca
// `loadAll()` al montar; esta llamada es idempotente y permite que la página
// funcione aunque se entre directa sin pasar por el layout.
const store = useTeacherStore()
// Sin acceso a la clase la página padre ya dice que no está: aquí no se para nada.
await store.ensureTeacherClassById(classId.value).catch(() => undefined)

// El estado compartido entre tabs (clase, actividades, ranking…) sigue
// viviendo en el composable para que las páginas hermanas se sincronicen sin
// refetchar.
const { state, can, ensureAnalytics } = useTeacherClassDetail(classId)

// El panel: se pide al entrar en el Resumen y al cambiar de periodo. Lo ya visto
// se enseña al momento mientras se vuelve a pedir por detrás.
const { period } = useAnalyticsPeriod()
const analytics = computed(() => state.value.analytics[period.value] ?? null)
const analyticsError = computed(() => state.value.analyticsError[period.value] ?? null)
watch(period, value => void ensureAnalytics(value, true), { immediate: true })

const showAttendance = computed(() => can('attendance.view') && !!analytics.value?.summary.attendance)

// Cada señal con la cara de la persona o la portada de la misión, de lo ya cargado.
const studentsById = computed(() => new Map((analytics.value?.students ?? []).map(s => [s.id, s])))
const missionsById = computed(() => new Map((analytics.value?.missions ?? []).map(m => [m.id, m])))
const { classSignal } = useAnalyticsSignals(classId, {
  student: id => studentsById.value.get(id),
  mission: id => missionsById.value.get(id),
})
const signals = computed(() => (analytics.value?.signals ?? []).map(classSignal))

// Format activities con el mismo formatter compartido para profesor.
const { formatActivities } = useActivityFormatter('teacher')
const recentActivities = computed(() => formatActivities(state.value.rawActivities))
</script>
