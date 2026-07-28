<template>
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6">
    <!-- Left Column (2/3) -->
    <div class="xl:col-span-2 space-y-4 xl:space-y-6">
      <!-- Class XP/Level bar (oculto si la clase desactiva XP) -->
      <ClassXPBar
        v-if="classSettings.xp && classGamification"
        :level="classGamification.level"
        :title="classGamification.title"
        :color="classGamification.color"
        :next-title="classGamification.nextTitle"
        :name="classGamification.name"
        :username="classGamification.username"
        :avatar="classGamification.avatar || currentGuide?.avatar"
        :current-xp="classGamification.currentXP"
        :required-xp="classGamification.requiredXP"
        :progress="classGamification.progress"
        :rank="classGamification.rank"
        :total-students="classGamification.totalStudents"
      />
      <Skeleton
        v-else-if="classSettings.xp"
        width="w-full"
        height="h-28"
        class="rounded-2xl"
      />

      <!-- Mi Progreso -->
      <Card type="stats">
        <CardHeader
          :title="t('student.classes.detail.progress.title')"
          :icon="ArrowTrendingUpIcon"
          title-tag="h2"
        />
        <CardGrid cols="2x2">
          <div class="bg-white rounded-xl px-4 py-14 flex flex-col items-center justify-center text-center">
            <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
              {{ progress.completionRate }}%
            </p>
            <p class="text-sm text-navy-700/80 mt-2">
              {{ t('student.classes.detail.progress.completion_rate') }}
            </p>
          </div>
          <div class="bg-white rounded-xl px-4 py-14 flex flex-col items-center justify-center text-center">
            <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
              {{ progress.missionsCompleted }}/{{ progress.missionsTotal }}
            </p>
            <p class="text-sm text-navy-700/80 mt-2">
              {{ t('student.classes.detail.progress.missions_completed') }}
            </p>
          </div>
          <div
            v-if="classSettings.xp"
            class="bg-white rounded-xl px-4 py-14 flex flex-col items-center justify-center text-center"
          >
            <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
              {{ (classGamification?.xp || 0).toLocaleString() }}
            </p>
            <p class="text-sm text-navy-700/80 mt-2">
              {{ t('student.classes.detail.progress.xp_total') }}
            </p>
          </div>
          <div class="bg-white rounded-xl px-4 py-14 flex flex-col items-center justify-center text-center">
            <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
              {{ unlockedBadgesCount }}/{{ currentClassBadges.length }}
            </p>
            <p class="text-sm text-navy-700/80 mt-2">
              {{ t('student.classes.detail.progress.badges_earned') }}
            </p>
          </div>
        </CardGrid>
      </Card>
    </div>

    <!-- Right Column (1/3) -->
    <div class="space-y-4 xl:space-y-6">
      <AIAssistantCard
        :assistant-name="t('student.dashboard.ai_assistant.name')"
        :subtitle="t('student.classes.detail.ai_assistant.subtitle')"
        :message="t('student.classes.detail.ai_assistant.message')"
        avatar-path="/guides/atenea.webp"
        :class-id="classId"
      />
      <RecentActivityCard
        :activities="formattedActivities"
        :loading="loadingActivities"
        :loading-more="loadingMore"
        :has-more="hasMore"
        card-type="pending"
        :default-avatar="studentAvatar"
        @load-more="loadMoreActivities"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ArrowTrendingUpIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'student', middleware: ['auth', 'role'] })

const { t } = useI18n()
const route = useRoute()
const classId = computed(() => route.params.id as string)
const classesStore = useClassesStore()
const gamificationStore = useGamificationStore()

const detail = useStudentClassDetail(classId)
const {
  classSettings,
  classData,
  classGamification,
  classMissions: _classMissions,
  currentClassBadges,
  recentActivities,
  studentAvatar,
} = detail

const { isLoadingActivities } = storeToRefs(classesStore)
const loadingActivities = computed(() => isLoadingActivities.value)

// Progreso del alumno desde selectedClass.studentProgress.
const progress = computed(() => {
  return (
    (classData.value as any)?.studentProgress || {
      completionRate: 0,
      missionsCompleted: 0,
      missionsTotal: 0,
      xpEarned: 0,
      averageScore: 0,
    }
  )
})

// Avatar guide actual (para fallback del avatar de la barra XP).
const currentGuide = computed(() => {
  const guideId = classGamification.value?.guideId
  if (!guideId) return null
  return (gamificationStore.guides as any[]).find(g => g.id === guideId) || null
})

const unlockedBadgesCount = computed(
  () => currentClassBadges.value.filter(b => b.unlocked).length
)

// Activities con formato + avatar del alumno por defecto.
const { formatActivities } = useActivityFormatter('student')
const formattedActivities = computed(() =>
  formatActivities(
    recentActivities.value.map(a => ({ ...a, avatar: studentAvatar.value }))
  )
)

// Paginación de actividades.
const ACTIVITIES_LIMIT = 10
const loadingMore = ref(false)
const hasMore = ref(true)
const activitiesOffset = ref(recentActivities.value.length)
async function loadMoreActivities() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const res = await classesStore.fetchClassActivities(
      classId.value,
      activitiesOffset.value,
      ACTIVITIES_LIMIT
    )
    const newOnes = res.activities || []
    hasMore.value = newOnes.length === ACTIVITIES_LIMIT
    activitiesOffset.value += newOnes.length
  } finally {
    loadingMore.value = false
  }
}
</script>
