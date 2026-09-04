<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 pb-6">
      <div class="space-y-4">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 sm:gap-2 text-sm">
          <NuxtLink to="/profesor/inicio" class="text-white/70 hover:text-white flex-shrink-0">
            <HomeIcon class="w-4 h-4" />
          </NuxtLink>
          <ChevronRightIcon class="w-4 h-4 text-white/70" />
          <NuxtLink
            to="/profesor/alumnos"
            class="text-white/70 hover:text-white whitespace-nowrap"
            >{{ t('teacher.students.detail.breadcrumb_students') }}</NuxtLink
          >
          <ChevronRightIcon class="w-4 h-4 text-white/70" />
          <span class="text-white font-medium truncate">{{
            student?.name || t('teacher.students.detail.loading')
          }}</span>
        </nav>

        <!-- Student Info -->
        <div v-if="loading" class="flex items-center gap-4">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 animate-pulse" />
          <div class="flex-1 space-y-2">
            <div class="h-7 bg-white/20 rounded w-48 animate-pulse" />
            <div class="h-5 bg-white/20 rounded w-32 animate-pulse" />
          </div>
        </div>

        <div v-else-if="student" class="flex items-center gap-4">
          <!-- Icon -->
          <div
            class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex-shrink-0 flex items-center justify-center"
          >
            <UserIcon class="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl sm:text-3xl font-bold text-white truncate">{{ student.name }}</h1>
            <p class="text-white/70 text-sm sm:text-base">{{ student.email }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <!-- Stats Skeletons -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCardSkeleton v-for="i in 3" :key="i" type="stats" />
      </div>

      <!-- Main Grid Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Classes Skeleton -->
        <div class="lg:col-span-2">
          <div class="bg-green rounded-2xl shadow-lg p-5 animate-pulse">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 bg-navy-700/20 rounded" />
                <div class="h-5 bg-navy-700/20 rounded w-32" />
              </div>
              <div class="h-4 bg-navy-700/20 rounded w-16" />
            </div>
            <div class="space-y-3">
              <div v-for="i in 3" :key="i" class="bg-white rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="h-5 bg-gray-200 rounded w-40" />
                  <div class="h-4 bg-gray-200 rounded w-24" />
                </div>
                <div class="h-2 bg-gray-100 rounded-full">
                  <div class="h-full bg-gray-200 rounded-full w-3/4" />
                </div>
                <div class="flex justify-between mt-1">
                  <div class="h-3 bg-gray-200 rounded w-16" />
                  <div class="h-3 bg-gray-200 rounded w-10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Activity Skeleton -->
        <div>
          <div class="bg-red-light rounded-2xl shadow-lg p-5 animate-pulse">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 bg-navy-700/20 rounded" />
                <div class="h-5 bg-navy-700/20 rounded w-36" />
              </div>
              <div class="h-8 bg-navy-700/20 rounded-xl w-20" />
            </div>
            <div class="space-y-3">
              <div v-for="i in 4" :key="i" class="flex items-start gap-3 bg-white rounded-xl p-3">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-200 rounded w-full" />
                  <div class="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Error State -->
    <EmptyState
      v-else-if="error"
      :icon="ExclamationTriangleIcon"
      :title="t('teacher.students.detail.error_title')"
      :description="error"
    >
      <template #action>
        <Button variant="primary" @click="fetchStudent">
          {{ t('teacher.students.detail.btn_retry') }}
        </Button>
      </template>
    </EmptyState>

    <!-- Content -->
    <template v-else-if="student">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card type="stats">
          <StatDisplay
            :value="student.stats.totalClasses"
            :label="t('teacher.students.detail.stat_classes')"
          />
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="student.stats.totalMissionsAvailable"
            :label="t('teacher.students.detail.stat_missions')"
          />
        </Card>
        <Card type="stats">
          <StatDisplay
            :value="`${student.stats.completionRate}%`"
            :label="t('teacher.students.detail.stat_completed')"
          />
        </Card>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Classes & Missions -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Classes Section -->
          <Card type="clases">
            <CardHeader
              :title="t('teacher.students.detail.enrolled_classes_title')"
              :icon="AcademicCapIcon"
            >
              <template #actions>
                <span class="text-sm text-navy-700/70">{{
                  t('teacher.students.detail.enrolled_classes_count', {
                    count: student.classes.length,
                  })
                }}</span>
              </template>
            </CardHeader>

            <div v-if="student.classes.length === 0" class="text-center py-8 text-navy-700/70">
              <AcademicCapIcon class="w-10 h-10 mx-auto text-navy-700/30 mb-2" />
              <p>{{ t('teacher.students.detail.not_enrolled') }}</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="classItem in student.classes"
                :key="classItem.id"
                class="bg-white rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <!-- Header: Avatar, Nickname, Class Name -->
                <div class="flex items-start gap-3 mb-3">
                  <!-- Per-class Avatar -->
                  <img
                    :src="classItem.avatar || '/app/avatars/odiseo.svg'"
                    :alt="classItem.nickname"
                    class="w-12 h-12 rounded-xl object-contain flex-shrink-0 bg-gray-100 p-1"
                  />
                  <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-navy-700 truncate">{{ classItem.name }}</h3>
                    <p class="text-sm text-navy-700/70 truncate">{{ classItem.nickname }}</p>
                  </div>
                  <!-- Level Badge — solo si la clase tiene XP activado -->
                  <div
                    v-if="classCfg(classItem).xp"
                    class="flex-shrink-0 bg-navy-700 text-white px-2.5 py-1 rounded-lg text-sm font-bold"
                  >
                    Nv. {{ classItem.level }}
                  </div>
                </div>

                <!-- Stats Row: Missions, XP, Badges (XP solo si está activado) -->
                <div
                  class="grid gap-2 mb-3"
                  :class="classCfg(classItem).xp ? 'grid-cols-3' : 'grid-cols-2'"
                >
                  <div class="bg-navy-700/5 rounded-lg px-3 py-2 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <RocketLaunchIcon class="w-4 h-4 text-navy-700" />
                      <span class="font-bold text-navy-700"
                        >{{ classItem.missionsCompleted
                        }}<span class="text-navy-700/70 font-normal"
                          >/{{ classItem.totalMissions }}</span
                        ></span
                      >
                    </div>
                    <p class="text-xs text-navy-700/70">
                      {{ t('teacher.students.detail.stat_missions') }}
                    </p>
                  </div>
                  <div
                    v-if="classCfg(classItem).xp"
                    class="bg-navy-700/5 rounded-lg px-3 py-2 text-center"
                  >
                    <div class="flex items-center justify-center gap-1">
                      <MapIcon class="w-4 h-4 text-navy-700" />
                      <span class="font-bold text-navy-700"
                        >{{ formatXP(classItem.xp)
                        }}<span class="text-navy-700/70 font-normal"
                          >/{{ formatXP(classItem.totalXp) }}</span
                        ></span
                      >
                    </div>
                    <p class="text-xs text-navy-700/70">XP</p>
                  </div>
                  <div class="bg-navy-700/5 rounded-lg px-3 py-2 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <TrophyIcon class="w-4 h-4 text-navy-700" />
                      <span class="font-bold text-navy-700"
                        >{{ classItem.badgesEarned
                        }}<span class="text-navy-700/70 font-normal"
                          >/{{ classItem.totalBadges }}</span
                        ></span
                      >
                    </div>
                    <p class="text-xs text-navy-700/70">Insignias</p>
                  </div>
                </div>

                <!-- Wallet: vidas, monedas y maná que el alumno tiene en esta clase
                     (solo los recursos activos en los ajustes de la clase) -->
                <div
                  v-if="
                    classCfg(classItem).lives ||
                    classCfg(classItem).coins ||
                    classCfg(classItem).mana
                  "
                  class="flex flex-wrap gap-2 mb-3"
                >
                  <div
                    v-if="classCfg(classItem).lives"
                    class="flex flex-1 min-w-[90px] items-center justify-center gap-1.5 bg-[#ffe4e9] rounded-lg px-3 py-2"
                  >
                    <LifeIcon class="w-4 h-4" />
                    <span class="font-bold text-navy-700">{{ classItem.lives ?? 100 }}</span>
                    <span class="text-xs text-navy-700/70">{{
                      t('teacher.students.detail.stat_lives')
                    }}</span>
                  </div>
                  <div
                    v-if="classCfg(classItem).coins"
                    class="flex flex-1 min-w-[90px] items-center justify-center gap-1.5 bg-yellow-light rounded-lg px-3 py-2"
                  >
                    <CoinIcon class="w-4 h-4" />
                    <span class="font-bold text-navy-700">{{ classItem.coins ?? 0 }}</span>
                    <span class="text-xs text-navy-700/70">{{ coinLabel }}</span>
                  </div>
                  <div
                    v-if="classCfg(classItem).mana"
                    class="flex flex-1 min-w-[90px] items-center justify-center gap-1.5 bg-sky-light rounded-lg px-3 py-2"
                  >
                    <ManaIcon class="w-4 h-4" />
                    <span class="font-bold text-navy-700">{{ classItem.mana ?? 0 }}</span>
                    <span class="text-xs text-navy-700/70">{{
                      t('teacher.students.detail.stat_mana')
                    }}</span>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full bg-navy-700 transition-all duration-300"
                    :style="{ width: `${classItem.progress}%` }"
                  />
                </div>
                <div class="flex justify-between mt-1">
                  <span class="text-xs text-text-secondary">{{
                    t('teacher.students.detail.label_progress')
                  }}</span>
                  <span class="text-xs font-medium text-navy-700"> {{ classItem.progress }}% </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- Right Column: Activity & Stats -->
        <div class="space-y-6">
          <!-- Recent Activity Card -->
          <RecentActivityCard
            :activities="formattedActivities"
            :loading="false"
            card-type="pending"
            :empty-message="t('teacher.students.detail.no_activity')"
            default-avatar="/app/avatars/odiseo.svg"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  HomeIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  UserIcon,
  MapIcon,
  RocketLaunchIcon,
  TrophyIcon,
} from '@heroicons/vue/24/outline'
import type { ClassSettings } from '~/types/class.types'
import { resolveClassSettings } from '~/utils/class-settings'

interface StudentClass {
  id: string
  name: string
  progress: number
  missionsCompleted: number
  totalMissions: number
  // Per-class gamification data
  nickname: string
  avatar: string
  level: number
  xp: number
  totalXp: number
  coins: number
  mana: number
  lives?: number
  settings?: Partial<ClassSettings>
  badgesEarned: number
  totalBadges: number
}

interface RecentMission {
  id: string
  title: string
  className: string
  xpEarned: number
  completedAt: string
}

interface Activity {
  id: string
  type: string
  description: string
  timestamp: string
  badgeImage?: string
}

interface StudentStats {
  totalClasses: number
  totalMissionsCompleted: number
  totalMissionsAvailable: number
  completionRate: number
  averageScore: number
  streak: number
}

interface StudentDetail {
  id: string
  name: string
  email: string
  classes: StudentClass[]
  recentMissions: RecentMission[]
  recentActivity: Activity[]
  stats: StudentStats
}

const { t } = useI18n()
const { coinLabel } = useCoinLabel()

// Per-class feature flags: hide a wallet chip when that resource is disabled for the class.
const classCfg = (c: StudentClass) => resolveClassSettings(c.settings)

useHead({
  title: () => t('teacher.students.detail.meta.title'),
  meta: [{ name: 'description', content: () => t('teacher.students.detail.meta.description') }],
})

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

const route = useRoute()
const teacherStore = useTeacherStore()

const studentId = computed(() => route.params.id as string)
const loading = ref(true)
const error = ref<string | null>(null)

// Read student detail from the store cache (Map<id, Student>).
const student = computed<StudentDetail | null>(() => {
  const cached = teacherStore.studentDetails.get(studentId.value)
  return (cached?.student as StudentDetail) ?? null
})

// Fetch student data via store ensureX wrapper (deduped + cached).
const fetchStudent = async () => {
  loading.value = true
  error.value = null

  try {
    await teacherStore.ensureStudentById(studentId.value)
  } catch (err: any) {
    console.error('Error fetching student:', err)
    error.value = err.data?.message || t('teacher.students.detail.error_default')
  } finally {
    loading.value = false
  }
}

// Format XP for display
const formatXP = (xp: number): string => {
  if (xp >= 1000) {
    return (xp / 1000).toFixed(1) + 'k'
  }
  return String(xp)
}

// Use shared activity formatter for teacher perspective
const { formatActivities } = useActivityFormatter('teacher')

// Format activities for RecentActivityCard component
const formattedActivities = computed(() => {
  if (!student.value) return []
  return formatActivities(student.value.recentActivity)
})

// Get progress bar color
const getProgressBarColor = (progress: number): string => {
  if (progress >= 80) return 'bg-green-500'
  if (progress >= 50) return 'bg-yellow-500'
  if (progress >= 20) return 'bg-orange-500'
  return 'bg-gray-400'
}

// Get progress text color
const getProgressTextColor = (progress: number): string => {
  if (progress >= 80) return 'text-green-600'
  if (progress >= 50) return 'text-yellow-600'
  if (progress >= 20) return 'text-orange-500'
  return 'text-gray-500'
}

onMounted(() => {
  fetchStudent()
})
</script>
