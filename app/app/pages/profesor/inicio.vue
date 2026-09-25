<template>
  <DashboardTemplate
    :title="t('teacher.dashboard.title')"
    :subtitle="t('teacher.dashboard.subtitle', { name: user?.name })"
    :loading-stats="teacherStore.isLoadingStats"
  >
    <template #header-actions>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/profesor/clases/crear">
          <Button variant="primary" size="md">
            <PlusIcon class="w-4 h-4 mr-2" />
            {{ t('teacher.dashboard.new_class') }}
          </Button>
        </NuxtLink>
        <NuxtLink v-if="teacherStore.canCreateMissions" to="/profesor/misiones/crear">
          <Button variant="primary" size="md">
            <PlusIcon class="w-4 h-4 mr-2" />
            {{ t('teacher.dashboard.new_mission') }}
          </Button>
        </NuxtLink>
      </div>
    </template>

    <template #stats>
      <Card type="stats">
        <StatDisplay
          :value="teacherStore.stats?.totalStudents ?? 0"
          :label="t('teacher.dashboard.stats.total_students')"
        />
      </Card>
      <Card type="stats">
        <StatDisplay
          :value="teacherStore.stats?.activeClasses ?? 0"
          :label="t('teacher.dashboard.stats.active_classes')"
        />
      </Card>
      <Card type="stats">
        <StatDisplay
          :value="teacherStore.stats?.activeMissions ?? 0"
          :label="t('teacher.dashboard.stats.active_missions')"
        />
      </Card>
    </template>

    <template #main>
      <!-- My Classes -->
      <Card type="clases">
        <CardHeader :title="t('teacher.dashboard.my_classes')" :icon="AcademicCapIcon">
          <template #actions>
            <NuxtLink to="/profesor/clases">
              <Button variant="primary" size="sm">
                {{ t('teacher.dashboard.view_all') }}
              </Button>
            </NuxtLink>
          </template>
        </CardHeader>

        <!-- Skeletons durante carga -->
        <template v-if="teacherStore.isLoadingClasses">
          <ClassCardSkeleton />
          <ClassCardSkeleton />
          <ClassCardSkeleton />
          <ClassCardSkeleton />
        </template>

        <!-- Empty state -->
        <CardItem
          v-else-if="teacherStore.classes.length === 0"
          padding="lg"
          layout="column"
          centered
        >
          <p class="text-text-secondary">{{ t('teacher.dashboard.no_classes_yet') }}</p>
        </CardItem>

        <!-- Clases reales -->
        <template v-else>
          <ClassCardItem
            v-for="classItem in recentClasses"
            :key="classItem.id"
            :class-item="classItem"
            @click="navigateToClass(classItem.id)"
          />
        </template>
      </Card>

      <!-- Recent Missions -->
      <Card type="clases">
        <CardHeader :title="t('teacher.dashboard.recent_missions')" :icon="RocketLaunchIcon">
          <template #actions>
            <NuxtLink to="/profesor/misiones">
              <Button variant="primary" size="sm">
                {{ t('teacher.dashboard.view_all') }}
              </Button>
            </NuxtLink>
          </template>
        </CardHeader>

        <!-- Skeletons durante carga -->
        <CardGrid v-if="teacherStore.isLoadingMissions">
          <MissionCardSkeleton v-for="i in 3" :key="i" />
        </CardGrid>

        <!-- Empty state -->
        <CardItem v-else-if="recentMissions.length === 0" padding="lg" layout="column" centered>
          <p class="text-text-secondary">{{ t('teacher.dashboard.no_missions_description') }}</p>
        </CardItem>

        <!-- Misiones reales -->
        <CardGrid v-else cols="2">
          <MissionCardEnhanced
            v-for="mission in recentMissions"
            :id="mission.id"
            :key="mission.id"
            :title="mission.title"
            :description="mission.description"
            :status="mission.status"
            :rarity="mission.rarity"
            :xp-reward="mission.xpReward"
            :coin-reward="mission.coinReward"
            :mana-reward="mission.manaReward"
            :background-image="mission.backgroundImage"
            :completed-count="mission.completedCount"
            :total-students="mission.totalStudents"
            :deadline="mission.deadline"
            :class-name="mission.className"
            compact
            @click="navigateToMission(mission)"
          />
        </CardGrid>
      </Card>
    </template>

    <template #sidebar>
      <AIAssistantCardSkeleton v-if="teacherStore.isLoadingStats" />
      <AIAssistantCard v-else />
      <RecentActivityCard
        :activities="formattedActivities"
        :loading="teacherStore.isLoadingActivities"
        card-type="pending"
      />
    </template>
  </DashboardTemplate>
</template>

<script setup lang="ts">
import { RocketLaunchIcon, AcademicCapIcon, PlusIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()

useHead({
  title: () => t('teacher.dashboard.meta.title'),
  meta: [{ name: 'description', content: () => t('teacher.dashboard.meta.description') }],
})

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'onboarding', 'role'],
})

const authStore = useAuthStore()
const teacherStore = useTeacherStore()
const router = useRouter()

const user = computed(() => authStore.user)

// Show only first 4 classes (2x2 grid)
const recentClasses = computed(() => {
  return teacherStore.classes.slice(0, 4)
})

// Show only first 4 missions
const recentMissions = computed(() => {
  return teacherStore.recentMissions.slice(0, 4)
})

// Format timestamp to relative time
const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date()
  const activityDate = new Date(timestamp)
  const diffMs = now.getTime() - activityDate.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Hace un momento'
  if (diffMins === 1) return 'Hace 1 minuto'
  if (diffMins < 60) return `Hace ${diffMins} minutos`
  if (diffHours === 1) return 'Hace 1 hora'
  if (diffHours < 24) return `Hace ${diffHours} horas`
  if (diffDays === 1) return 'Hace 1 día'
  return `Hace ${diffDays} días`
}

// Generate avatar URL for student (fallback when API doesn't return avatar)
const getStudentAvatar = (studentId: string | undefined): string => {
  // Fallback if studentId is not provided
  if (!studentId) {
    return '/app/avatars/avatar-1.svg'
  }

  // Simple hash function to get consistent index from any string (works with UUIDs)
  let hash = 0
  for (let i = 0; i < studentId.length; i++) {
    hash = (hash << 5) - hash + studentId.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  const avatarIndex = (Math.abs(hash) % 5) + 1
  return `/app/avatars/avatar-${avatarIndex}.svg`
}

// Format activity description with HTML for important parts
// Use shared activity formatter for teacher perspective
const { formatActivities } = useActivityFormatter('teacher')

// Format activities for RecentActivityCard component
const formattedActivities = computed(() => {
  return formatActivities(teacherStore.activities)
})

// Navigate to class detail
const navigateToClass = (classId: string) => {
  router.push(`/profesor/clases/${classId}`)
}

// Navigate to mission detail
const navigateToMission = (mission: any) => {
  router.push(`/profesor/clases/${mission.classId}/misiones/${mission.id}`)
}

// Handle AI assistant question
const handleAskQuestion = () => {
  router.push('/profesor/asistente')
}

// Load dashboard data on mount
onMounted(async () => {
  // Use ensureX wrappers (no force) so cached data is reused across visits.
  await Promise.all([
    teacherStore.ensureStats(),
    teacherStore.ensureClasses(), // Load ALL classes, display limited in computed
    teacherStore.ensureActivities(), // Load activities (limit defaults inside store)
    teacherStore.ensureRecentMissions(), // Load ALL missions, display limited in computed
  ])
})
</script>
