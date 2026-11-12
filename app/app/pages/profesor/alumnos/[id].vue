<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 pb-6">
      <div class="space-y-4">
        <!-- Breadcrumb -->
        <nav :aria-label="t('common.nav.breadcrumb')" class="flex items-center gap-1.5 sm:gap-2 text-sm">
          <NuxtLink
            to="/profesor/inicio"
            :aria-label="t('common.about.breadcrumb_home')"
            class="text-white/70 hover:text-white flex-shrink-0"
          >
            <HomeIcon class="w-4 h-4" aria-hidden="true" />
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
            <!-- Un alumno sin correo se identifica por su usuario -->
            <p class="flex flex-wrap items-center gap-2 text-white/70 text-sm sm:text-base">
              {{ accountIdentifier(student) }}
              <Badge v-if="student.accountType === 'managed'" variant="info" size="sm">
                {{ t('teacher.classes.detail.students.managed_badge') }}
              </Badge>
              <Badge v-if="student.pendingSignIn" variant="warning" size="sm">
                {{ t('teacher.classes.detail.students.pending_sign_in_badge') }}
              </Badge>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <CardGrid cols="tiles">
        <StatCardSkeleton v-for="i in 3" :key="i" />
      </CardGrid>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="min-w-0 space-y-3 lg:col-span-2" aria-hidden="true">
          <CardRowSkeleton v-for="i in 3" :key="i" />
        </div>
        <RecentActivityCard :activities="[]" loading card-type="pending" />
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
      <CardGrid cols="tiles">
        <StatTile
          size="sm"
          :label="t('teacher.students.detail.stat_classes')"
          :value="student.stats.totalClasses"
        />
        <StatTile
          size="sm"
          :label="t('teacher.students.detail.stat_missions_completed')"
          :value="student.stats.missionsCompleted"
          :total="student.stats.missionsCounted"
        />
        <StatTile
          size="sm"
          :label="t('teacher.students.detail.stat_required_enigmas')"
          :value="student.stats.percent === null ? '—' : formatPercent(student.stats.percent)"
        />
      </CardGrid>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: el índice de sus clases; el detalle está en cada una -->
        <div class="min-w-0 lg:col-span-2">
          <Card type="clases">
            <CardHeader
              :title="t('teacher.students.detail.enrolled_classes_title')"
              :icon="AcademicCapIcon"
            >
              <template #actions>
                <span class="text-sm text-navy-700/70">{{
                  t(
                    'teacher.students.detail.enrolled_classes_count',
                    { count: student.classes.length },
                    student.classes.length
                  )
                }}</span>
              </template>
            </CardHeader>

            <div v-if="student.classes.length === 0" class="text-center py-8 text-navy-700/70">
              <AcademicCapIcon class="w-10 h-10 mx-auto text-navy-700/30 mb-2" />
              <p>{{ t('teacher.students.detail.not_enrolled') }}</p>
            </div>

            <ul v-else class="space-y-3">
              <li v-for="classItem in student.classes" :key="classItem.id">
                <CardItem class="flex-wrap gap-x-4 gap-y-2">
                  <Avatar
                    :src="classItem.avatar"
                    :name="classItem.nickname"
                    :seed="studentAvatarSeed(classItem.id, student.id)"
                    size="xs"
                  />
                  <div class="min-w-0 flex-1 basis-56">
                    <h3 class="text-base font-bold text-navy-700 [overflow-wrap:anywhere]">
                      {{ classItem.name }}
                    </h3>
                    <!-- Su alias, «X de N misiones» y, si la clase usa XP, el nivel -->
                    <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-700">
                      <span class="text-navy-700/70 [overflow-wrap:anywhere]">{{
                        classItem.nickname
                      }}</span>
                      <span class="inline-flex items-center gap-1.5 font-semibold">
                        <RocketLaunchIcon class="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        {{
                          t(
                            'common.progress.missions_of',
                            {
                              done: formatNumber(classItem.missionsCompleted),
                              total: formatNumber(classItem.missionsCounted),
                            },
                            classItem.missionsCounted
                          )
                        }}
                      </span>
                      <span v-if="classItem.level !== null" class="font-semibold">
                        {{ t('teacher.students.detail.level_badge', { level: classItem.level }) }}
                      </span>
                      <Badge v-if="classItem.archived" variant="info" size="sm">
                        {{ t('teacher.teams.archived_badge') }}
                      </Badge>
                    </p>
                  </div>
                  <div class="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      :icon-right="ArrowRightIcon"
                      :to="`/profesor/clases/${classItem.id}/alumnos/${student.id}`"
                      :aria-label="
                        t('teacher.students.detail.view_in_class_named', { class: classItem.name })
                      "
                    >
                      {{ t('teacher.students.detail.view_in_class') }}
                    </Button>
                    <StudentActionsMenu
                      :class-id="classItem.id"
                      :class-name="classItem.name"
                      :student="manageable(classItem)"
                      :access="classItem.myAccess"
                      @renamed="onRenamed(classItem, $event)"
                      @avatar-changed="classItem.avatar = $event"
                      @removed="onRemoved"
                    />
                  </div>
                </CardItem>
              </li>
            </ul>
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
  ArrowRightIcon,
  ExclamationTriangleIcon,
  UserIcon,
  RocketLaunchIcon,
} from '@heroicons/vue/24/outline'
import type { ClassAccess } from '~/types/class.types'
import type { AccountType, ManageableStudent } from '~/types/teacher.types'
import { accountIdentifier } from '~/utils/identity'
import { studentAvatarSeed } from '~/utils/avatar'

/** Una fila del índice: su página dentro de la clase tiene el detalle. */
interface StudentClass {
  id: string
  name: string
  archived?: boolean
  /** Acceso propio en esta clase: decide qué acciones se ofrecen. */
  myAccess?: ClassAccess | null
  /** «X de N misiones»: N son las que cuentan (con enigmas y sin bloquear a mano). */
  missionsCompleted: number
  missionsCounted: number
  nickname: string
  avatar: string
  /** Null si la clase no usa XP. */
  level: number | null
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
  missionsCompleted: number
  missionsCounted: number
  percent: number | null
}

interface StudentDetail {
  id: string
  name: string
  /** Nulo en una cuenta que entra con usuario: no tiene correo. */
  email: string | null
  /** Usuario de la cuenta, con el que entra si no tiene correo. */
  username: string | null
  accountType: AccountType
  /** Clase donde se creó la cuenta, si es de las que lleva el profesorado. */
  homeClassId: string | null
  /** Quien pregunta administra su clase de origen: puede restablecer la contraseña. */
  canResetPassword: boolean
  /** Tiene la contraseña temporal sin usar: aún no ha entrado. */
  pendingSignIn: boolean
  /** Cuenta sin usar: la clase de la que quitarla la borra del todo. */
  unusedAccountHomeClassId: string | null
  classes: StudentClass[]
  recentActivity: Activity[]
  stats: StudentStats
}

const { t } = useI18n()
const { formatNumber, formatPercent } = useNumberFormat()

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

/** Lo que necesita el menú de acciones del alumno en una de sus clases. */
function manageable(classItem: StudentClass): ManageableStudent {
  const current = student.value!
  return {
    id: current.id,
    name: current.name,
    nickname: classItem.nickname,
    avatar: classItem.avatar,
    accountType: current.accountType,
    canResetPassword: current.canResetPassword,
    isHomeClass: current.homeClassId === classItem.id,
    removalDeletesAccount: current.unusedAccountHomeClassId === classItem.id,
  }
}

function onRenamed(classItem: StudentClass, nickname: string) {
  classItem.nickname = nickname
}

/** Sin más clases en común ya no hay ficha que ver: vuelta al listado. */
async function onRemoved() {
  if ((student.value?.classes.length ?? 0) <= 1) {
    await navigateTo('/profesor/alumnos')
    return
  }
  await fetchStudent()
}

// Use shared activity formatter for teacher perspective
const { formatActivities } = useActivityFormatter('teacher')

// Format activities for RecentActivityCard component
const formattedActivities = computed(() => {
  if (!student.value) return []
  return formatActivities(student.value.recentActivity)
})

onMounted(() => {
  fetchStudent()
})
</script>
