<template>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
    <!-- Left Column (2/3): Main widgets stacked vertically -->
    <div class="xl:col-span-2 space-y-4 md:space-y-6">
      <!-- Estadísticas de la Clase - Purple theme -->
      <Card type="stats">
        <CardHeader
          :title="t('teacher.classes.detail.stats_title')"
          :icon="ChartPieIcon"
          title-tag="h2"
        />
        <div
          class="bg-white rounded-xl px-4 py-14 flex flex-col items-center justify-center text-center"
        >
          <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
            {{ classStats.pendingReviews }}
          </p>
          <p class="text-sm text-navy-700/80 mt-2">
            {{ t('teacher.classes.detail.pending_reviews') }}
          </p>
          <NuxtLink :to="`/profesor/clases/${classId}/entregas`" class="mt-4">
            <Button variant="primary" size="sm"> Ver entregas </Button>
          </NuxtLink>
        </div>
      </Card>
    </div>

    <!-- Right Column (1/3): Sidebar widgets -->
    <div class="space-y-4 md:space-y-6">
      <AIAssistantCard :class-id="classId" />
      <RecentActivityCard :activities="recentActivities" card-type="pending" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartPieIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t } = useI18n()
const route = useRoute()
const classId = computed(() => route.params.id as string)

// Carga la clase a través del store (cacheado). El padre [id].vue ya invoca
// `loadAll()` al montar; esta llamada es idempotente y permite que la página
// funcione aunque se entre directa sin pasar por el layout.
const store = useTeacherStore()
await store.ensureTeacherClassById(classId.value)

// El estado compartido entre tabs (clase, actividades, ranking…) sigue
// viviendo en el composable para que las páginas hermanas se sincronicen sin
// refetchar. `classStats` deriva de los mismos datos cargados por el store.
const { state, classStats } = useTeacherClassDetail(classId)

// Format activities con el mismo formatter compartido para profesor.
const { formatActivities } = useActivityFormatter('teacher')
const recentActivities = computed(() => formatActivities(state.value.rawActivities))
</script>
