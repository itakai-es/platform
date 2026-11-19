<template>
  <DashboardTemplate
    :title="
      t('student.dashboard.welcome', {
        name: authStore.user?.name || t('student.dashboard.welcome_fallback_name'),
      })
    "
    :subtitle="t('student.dashboard.subtitle')"
    :loading-stats="gamificationStore.isLoadingProfile"
  >
    <template #stats>
      <Card type="stats">
        <StatDisplay
          :value="profile?.stats?.classesEnrolled ?? 0"
          :label="t('student.dashboard.stats.classes_enrolled')"
        />
      </Card>
      <Card type="stats">
        <StatDisplay
          :value="profile?.stats?.missionsCompleted ?? 0"
          :label="t('student.dashboard.stats.missions_completed')"
        />
      </Card>
      <Card type="stats">
        <StatDisplay
          :value="profile?.stats?.badgesEarned ?? 0"
          :label="t('student.dashboard.stats.badges_earned')"
        />
      </Card>
    </template>

    <template #main>
      <!-- My Classes -->
      <Card type="clases">
        <CardHeader :title="t('student.dashboard.my_classes.title')" :icon="AcademicCapIcon">
          <template #actions>
            <NuxtLink to="/alumno/clases">
              <Button variant="primary" size="sm">{{
                t('student.dashboard.my_classes.view_all')
              }}</Button>
            </NuxtLink>
          </template>
        </CardHeader>

        <!-- Skeletons durante carga -->
        <template v-if="classesStore.isLoadingClasses">
          <ClassCardSkeleton />
          <ClassCardSkeleton />
        </template>

        <!-- Empty state -->
        <CardItem
          v-else-if="classesStore.classes.length === 0"
          padding="lg"
          layout="column"
          centered
        >
          <p class="text-text-secondary">{{ t('student.dashboard.my_classes.empty') }}</p>
        </CardItem>

        <!-- Clases reales -->
        <template v-else>
          <ClassCardItem
            v-for="classItem in recentClasses"
            :key="classItem.id"
            :class-item="classItem"
            show-coins
            @click="navigateToClass(classItem.id)"
          />
        </template>
      </Card>

      <!-- Últimas Misiones -->
      <Card type="clases">
        <CardHeader :title="t('student.dashboard.latest_missions.title')" :icon="RocketLaunchIcon">
          <template #actions>
            <NuxtLink to="/alumno/misiones">
              <Button variant="primary" size="sm">{{
                t('student.dashboard.latest_missions.view_all')
              }}</Button>
            </NuxtLink>
          </template>
        </CardHeader>

        <!-- Skeletons durante carga -->
        <CardGrid v-if="loadingEnhancedMissions" cols="2">
          <MissionCardSkeleton v-for="i in 2" :key="i" />
        </CardGrid>

        <!-- Empty state -->
        <CardItem
          v-else-if="displayedEnhancedMissions.length === 0"
          padding="lg"
          layout="column"
          centered
        >
          <p class="text-text-secondary">{{ t('student.dashboard.latest_missions.empty') }}</p>
        </CardItem>

        <!-- Misiones reales -->
        <CardGrid v-else cols="2">
          <MissionCardEnhanced
            v-for="mission in displayedEnhancedMissions"
            :id="mission.id"
            :key="mission.id"
            :title="mission.title"
            :description="mission.description"
            :status="mission.status"
            :rarity="mission.rarity"
            :progress="mission.progress"
            :time-remaining="mission.timeRemaining"
            :xp-reward="mission.xpReward"
            :coin-reward="mission.coinReward"
            :mana-reward="mission.manaReward"
            :earned-xp="mission.earnedXp"
            :earned-coins="mission.earnedCoins"
            :earned-mana="mission.earnedMana"
            :background-image="mission.backgroundImage"
            :class-name="mission.className"
            :class-id="mission.classId"
          />
        </CardGrid>
      </Card>
    </template>

    <template #sidebar>
      <AIAssistantCardSkeleton v-if="gamificationStore.isLoadingProfile" />
      <AIAssistantCard v-else :message="aiAssistantMessage" />
      <RecentActivityCard
        :activities="formattedActivities"
        :loading="studentStore.isLoadingActivities"
        card-type="pending"
      />
    </template>
  </DashboardTemplate>
</template>

<script setup lang="ts">
import { PlusIcon, AcademicCapIcon, RocketLaunchIcon } from '@heroicons/vue/24/outline'
import { useWindowSize } from '@vueuse/core'
import type { ActivityType } from '~/types/activity.types'
// Activity types imported by useActivityFormatter

const { t } = useI18n()
const { formatNumber } = useNumberFormat()

useHead({
  title: computed(() => t('student.dashboard.meta.title')),
  meta: [{ name: 'description', content: computed(() => t('student.dashboard.meta.description')) }],
})

definePageMeta({
  layout: 'student',
  middleware: ['auth', 'onboarding', 'role'],
})

// Stores
const authStore = useAuthStore()
const missionStore = useMissionStore()
const classesStore = useClassesStore()
const studentStore = useStudentStore()
const gamificationStore = useGamificationStore()
const router = useRouter()

// Gamification data from store
const { profile } = storeToRefs(gamificationStore)

// State
const showJoinModal = ref(false)

// Handle join class success
const handleJoinSuccess = () => {
  classesStore.fetchStudentClasses(true)
  gamificationStore.fetchProfile(true)
  studentStore.fetchRecentActivities(50, true)
}

// Window size for responsive logic
const { width } = useWindowSize()
const isDesktop = computed(() => width.value >= 1280)

// Show only first 2 classes on mobile, 4 on desktop
const recentClasses = computed(() => {
  const maxClasses = isDesktop.value ? 4 : 2
  return classesStore.classes.slice(0, maxClasses)
})

// Helper to determine mission urgency status
const getMissionDisplayStatus = (
  mission: any
): 'urgente' | 'activa' | 'completada' | 'bloqueada' => {
  // Completada: progress 100%
  if (mission.progress >= 100) return 'completada'

  // Bloqueada: status blocked
  if (mission.status === 'blocked' || mission.status === 'bloqueada') return 'bloqueada'

  // Urgente: deadline within 48 hours and not completed
  if (mission.deadline) {
    const deadlineDate = new Date(mission.deadline)
    const now = new Date()
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 48) {
      return 'urgente'
    }
  }

  // Activa: has some progress or is available
  return 'activa'
}

// Convert student missions to display format with computed status
const displayedEnhancedMissions = computed(() => {
  const maxMissions = isDesktop.value ? 3 : 4

  // Transform missions to enhanced format with computed status
  const enhancedMissions = studentStore.missions.map(m => ({
    ...m,
    status: getMissionDisplayStatus(m),
    className:
      classesStore.classes.find(c => c.id === m.classId)?.name ||
      t('student.dashboard.class_fallback_name'),
  }))

  // Filter only urgente and activa, prioritize urgente
  const activeMissions = enhancedMissions
    .filter(m => m.status === 'urgente' || m.status === 'activa')
    .sort((a, b) => {
      // Urgente first, then activa
      if (a.status === 'urgente' && b.status !== 'urgente') return -1
      if (b.status === 'urgente' && a.status !== 'urgente') return 1
      return 0
    })

  return activeMissions.slice(0, maxMissions)
})

const loadingEnhancedMissions = computed(() => studentStore.isLoadingMissions)

// Use shared activity formatter — same as teacher dashboard
const { formatActivities } = useActivityFormatter('student')
const formattedActivities = computed(() => {
  return formatActivities(studentStore.activities)
})

// Navigate to class detail
const navigateToClass = (classId: string) => {
  router.push(`/alumno/clases/${classId}`)
}

// AI Assistant dynamic message
const aiAssistantMessage = computed(() => {
  const userName = authStore.user?.name || t('student.dashboard.welcome_fallback_name')
  const missionsCompleted = profile.value?.stats?.missionsCompleted || 0
  const classesEnrolled = profile.value?.stats?.classesEnrolled || 0

  if (missionsCompleted === 0) {
    return t('student.dashboard.ai_assistant.message_new_user', { name: userName })
  }

  // Con plural en las dos cifras: «1 misión en 1 clase», «3 misiones en 2 clases».
  const classes = t(
    'student.dashboard.ai_assistant.classes_phrase',
    { count: formatNumber(classesEnrolled) },
    classesEnrolled
  )
  return t(
    'student.dashboard.ai_assistant.message_returning_user',
    { name: userName, count: formatNumber(missionsCompleted), classes },
    missionsCompleted
  )
})

// Handle AI assistant question
const handleAskQuestion = () => {
  router.push('/alumno/asistente')
}

// Load dashboard data on mount (use cached data if available)
onMounted(async () => {
  // First load classes so we have class names for missions
  await classesStore.ensureStudentClasses()

  // Then load other data in parallel
  await Promise.all([
    studentStore.ensureStudentMissions(), // Single source of truth for student missions
    studentStore.ensureRecentActivities(50), // Load more, display limited in computed
    // Note: profile is loaded by layout, no need to load here
  ])
})
</script>
