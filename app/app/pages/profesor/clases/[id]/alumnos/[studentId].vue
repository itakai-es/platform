<template>
  <div class="space-y-4 md:space-y-6">
    <!-- No está en esta clase (o ya no): se dice, y se puede volver al listado -->
    <EmptyState
      v-if="analyticsError === 'not_found'"
      :icon="UsersIcon"
      :title="t('teacher.analytics.student.not_found_title')"
      :description="t('teacher.analytics.student.not_found_description')"
    >
      <template #action>
        <Button variant="primary" :to="`/profesor/clases/${classId}/alumnos`">{{
          t('teacher.analytics.student.back_to_list')
        }}</Button>
      </template>
    </EmptyState>

    <Card v-else-if="analyticsError" type="stats">
      <CardItem layout="column" padding="lg" centered>
        <LoadError :rate-limited="analyticsError === 'rate_limited'" @retry="loadAnalytics" />
      </CardItem>
    </Card>

    <template v-else>
      <!-- Quién es. La primera vez, sin datos, su esqueleto -->
      <Card type="xpbar">
        <CardItem v-if="student" layout="row" class="flex-wrap gap-4 sm:gap-6">
          <!-- Su avatar, grande, dentro del anillo de su nivel (lo que lleva hacia
               el siguiente; el nivel y la XP van escritos al lado) -->
          <LevelAvatar
            v-if="student.level"
            :src="student.avatar"
            :name="student.name"
            :seed="studentAvatarSeed(classId, student.id)"
            :progress="student.level.progress"
            size="lg"
          />
          <Avatar
            v-else
            :src="student.avatar"
            :name="student.name"
            :seed="studentAvatarSeed(classId, student.id)"
            size="lg"
          />
          <div class="min-w-0 flex-1 basis-48">
            <h2 class="text-2xl font-bold text-navy-700 [overflow-wrap:anywhere]">
              {{ student.nickname || student.name }}
            </h2>
            <p v-if="student.nickname" class="text-sm text-navy-700/80">{{ student.name }}</p>
            <p
              v-if="student.level"
              class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-navy-700"
            >
              <span
                class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                :style="{ backgroundColor: student.level.color }"
                aria-hidden="true"
              />
              {{
                t('student.components.class_xp_bar.level_line', {
                  level: student.level.level,
                  title: student.level.title,
                })
              }}
              <span
                v-if="student.level.requiredXp > 0"
                class="text-sm font-medium tabular-nums text-navy-700/80"
                >·
                {{
                  t('student.components.class_xp_bar.xp_line', {
                    current: formatNumber(student.level.currentXp),
                    required: formatNumber(student.level.requiredXp),
                  })
                }}</span
              >
            </p>
            <p
              v-if="attendanceLine"
              class="mt-1 flex items-center gap-1.5 text-sm font-medium text-navy-700"
            >
              <CalendarDaysIcon class="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {{ attendanceLine }}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            :icon-right="ArrowRightIcon"
            :to="`/profesor/alumnos/${student.id}`"
          >
            {{ t('teacher.analytics.student.all_classes') }}
          </Button>
        </CardItem>
        <CardItemSkeleton v-else />
      </Card>

      <!-- Sus cifras, con la media de la clase -->
      <Card type="stats">
        <CardHeader
          :title="t('teacher.analytics.student.figures_title')"
          :icon="ChartPieIcon"
          title-tag="h2"
        />
        <AnalyticsPeriodPicker />

        <CardGrid v-if="!figures" cols="tiles-4">
          <StatCardSkeleton v-for="i in 4" :key="i" />
        </CardGrid>

        <template v-else>
          <CardGrid cols="tiles-4">
            <StatTile
              surface="item"
              :label="t('teacher.analytics.student.missions_done')"
              :value="figures.missions.value"
              :total="figures.missions.counted"
              :symbol="RocketLaunchIconSolid"
            >
              <template #detail>{{ averageText(figures.missions.classAverage) }}</template>
            </StatTile>
            <StatTile
              v-if="figures.xp"
              surface="item"
              :label="t('teacher.analytics.student.xp')"
              :value="figures.xp.value"
              :symbol="XpIcon"
              symbol-tone="purple"
              :symbol-props="{ mono: true }"
            >
              <template #detail>{{ averageText(figures.xp.classAverage) }}</template>
            </StatTile>
            <StatTile
              surface="item"
              :label="t('teacher.classes.detail.pending_reviews')"
              :value="figures.pendingReviews.value"
              :symbol="InboxArrowDownIcon"
            >
              <template #detail>{{ averageText(figures.pendingReviews.classAverage) }}</template>
            </StatTile>
            <StatTile
              surface="item"
              :label="t('teacher.analytics.student.hints')"
              :value="figures.hints.value"
              :symbol="LightBulbIcon"
            >
              <template #detail>{{ averageText(figures.hints.classAverage) }}</template>
            </StatTile>
          </CardGrid>

          <!-- Frente a la clase, en barras con su frase -->
          <CardItem v-if="hasOthersToCompare" layout="column" padding="lg" class="gap-4">
            <p class="text-sm text-navy-700/80">
              {{
                t(
                  'teacher.analytics.student.compared_with',
                  { count: figures.comparedWith },
                  figures.comparedWith
                )
              }}
            </p>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div v-for="meter in meters" :key="meter.key" class="min-w-0">
                <h3 class="mb-2 text-sm font-semibold text-navy-700">{{ meter.title }}</h3>
                <CompareMeter
                  subject="other"
                  :subject-label="t('teacher.analytics.student.this_person')"
                  :you="meter.you"
                  :average="meter.average"
                  :band="compareBand(meter.you, meter.average)"
                  :max="meter.max"
                  :format-value="meter.format"
                  :icon="meter.icon"
                  :avatar="meterAvatar"
                />
              </div>
            </div>
          </CardItem>
          <p v-else class="text-sm text-navy-700">
            {{ t('teacher.analytics.student.nobody_to_compare') }}
          </p>
        </template>
      </Card>

      <div class="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <div class="min-w-0 space-y-4 md:space-y-6 xl:col-span-2">
          <!-- Sus misiones -->
          <Card type="clases">
            <CardHeader
              :title="t('teacher.analytics.student.missions.title')"
              :icon="RocketLaunchIcon"
            />
            <TabNavigation
              variant="pills"
              :id-prefix="MISSION_TABS"
              :tabs="missionTabs"
              :active-tab="missionFilter"
              :aria-label="t('teacher.analytics.student.missions.filter_label')"
              @tab-change="missionFilter = $event as MissionRowFilter"
            />
            <div
              :id="tabPanelId(MISSION_TABS, missionFilter)"
              role="tabpanel"
              :aria-labelledby="tabElementId(MISSION_TABS, missionFilter)"
            >
              <div v-if="!analytics" class="space-y-3" aria-hidden="true">
                <CardRowSkeleton v-for="i in 3" :key="i" />
              </div>
              <CardItem v-else-if="!visibleMissions.length" layout="column" padding="lg" centered>
                <EmptyState
                  :icon="RocketLaunchIcon"
                  :title="missionsEmptyTitle"
                  :description="t('teacher.analytics.student.missions.empty_description')"
                />
              </CardItem>
              <ul v-else class="space-y-3">
                <li v-for="mission in visibleMissions" :key="mission.id">
                  <MissionResultRow :class-id="classId" :mission="mission" />
                </li>
              </ul>
            </div>
          </Card>

          <!-- Sus dificultades, con el detalle completo -->
          <AnalyticsSignalsCard :signals="signals" :loading="!analytics" />
        </div>

        <!-- Su historial -->
        <div class="min-w-0">
          <Card v-if="timelineError" type="pending">
            <CardHeader :title="t('teacher.analytics.student.history.title')" :icon="ClockIcon" />
            <CardItem layout="column" padding="lg" centered>
              <LoadError :rate-limited="timelineError === 'rate_limited'" @retry="loadTimeline" />
            </CardItem>
          </Card>
          <RecentActivityCard
            v-else
            ref="historyCard"
            :title="t('teacher.analytics.student.history.title')"
            :activities="historyItems"
            :loading="loadingTimeline"
            :show-avatar="false"
            variant="timeline"
            full-dates
            max-height="none"
            :empty-message="
              timelineFilter === 'all'
                ? t('teacher.analytics.student.history.empty')
                : t('teacher.analytics.student.history.empty_filtered')
            "
          >
            <template #header-actions>
              <div class="w-full min-w-0">
                <span :id="filterLabelId" class="sr-only">{{
                  t('teacher.analytics.student.history.filter_label')
                }}</span>
                <SelectDropdown
                  :model-value="timelineFilter"
                  :options="filterOptions"
                  :labelledby="filterLabelId"
                  @update:model-value="timelineFilter = $event as TimelineFilter"
                />
              </div>
            </template>
            <!-- El botón no se desactiva mientras carga: el foco se quedaría en la nada.
                 Al llegar, va a la primera entrada nueva y se dice cuántas han llegado. -->
            <template v-if="nextCursor" #footer-actions>
              <div class="flex justify-center">
                <Button variant="outline" :aria-busy="loadingMore" @click="loadMore">
                  {{ t('teacher.analytics.student.history.load_more') }}
                </Button>
              </div>
            </template>
          </RecentActivityCard>
          <p class="sr-only" role="status" aria-live="polite">{{ loadedAnnouncement }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  ClockIcon,
  RocketLaunchIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'
import {
  CalendarDaysIcon as CalendarDaysIconSolid,
  CheckBadgeIcon,
  ClockIcon as ClockIconSolid,
  HandRaisedIcon,
  InboxArrowDownIcon,
  LightBulbIcon,
  PaperAirplaneIcon,
  RocketLaunchIcon as RocketLaunchIconSolid,
  ShoppingBagIcon,
  TrophyIcon,
} from '@heroicons/vue/24/solid'
import XpIcon from '~/components/atoms/XpIcon.vue'
import type { TimelineAttendanceEntry, TimelineEntry } from '~/types/analytics.types'
import {
  TIMELINE_FILTERS,
  compareBand,
  filterMissionRows,
  formatDayLong,
  timelineGroup,
  type MissionRowFilter,
  type TimelineFilter,
  type TimelineGroup,
} from '~/utils/analytics-view'
import { ATTENDANCE_STATUS_META } from '~/utils/attendance-status'
import { studentAvatarSeed } from '~/utils/avatar'
import { formatNotificationDate } from '~/utils/notifications'
import { tabElementId, tabPanelId } from '~/utils/tabs'

/**
 * La página de un estudiante dentro de su clase: sus cifras frente a la media
 * exacta de la clase, sus misiones con su estado, sus dificultades y su
 * historial. La pestaña «Alumnado» sigue marcada (el segmento de la ruta es
 * `alumnos`), y la ficha global queda enlazada como «Ver todas sus clases».
 */
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t, locale } = useI18n()
const { formatNumber, formatPercent } = useNumberFormat()
const route = useRoute()
const classId = computed(() => route.params.id as string)
const studentId = computed(() => route.params.studentId as string)

const { state: classState, can, classSettings } = useTeacherClassDetail(classId)
const { period } = useAnalyticsPeriod()

const {
  analytics,
  analyticsError,
  loadAnalytics,
  timelineFilter,
  entries,
  nextCursor,
  loadingTimeline,
  loadingMore,
  timelineError,
  loadTimeline,
  loadMoreTimeline,
} = useStudentAnalytics(classId, studentId, period)

const student = computed(() => analytics.value?.student ?? null)
const figures = computed(() => analytics.value?.figures ?? null)

// Las migas de la cabecera de la clase: Alumnado › esta persona.
watch(
  student,
  value => {
    classState.value.breadcrumbSteps = [
      {
        label: t('teacher.classes.detail.tabs.students'),
        to: `/profesor/clases/${classId.value}/alumnos`,
      },
      ...(value ? [{ label: value.name }] : []),
    ]
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  classState.value.breadcrumbSteps = []
})

const attendanceLine = computed(() => {
  const attendance = student.value?.attendance
  if (!attendance || attendance.rate === null || !can('attendance.view')) return ''
  return t(
    'teacher.analytics.student.attendance_line',
    {
      rate: formatPercent(attendance.rate),
      attended: formatNumber(attendance.attended),
      total: formatNumber(attendance.total),
    },
    attendance.total
  )
})

/**
 * `comparedWith` son quienes participan, contando a esta persona si participa:
 * la media de la clase es una sola cifra, la misma que en el panel y en el ranking.
 */
const hasOthersToCompare = computed(() => {
  const f = figures.value
  if (!f) return false
  return f.comparedWith > (student.value?.participating ? 1 : 0)
})

/** Su avatar marca su sitio en cada pista frente a la media. */
const meterAvatar = computed(() =>
  student.value
    ? {
        src: student.value.avatar,
        name: student.value.name,
        seed: studentAvatarSeed(classId.value, student.value.id),
      }
    : null
)

const averageText = (average: number | null) =>
  t('teacher.analytics.student.class_average', {
    value: average === null ? '—' : formatNumber(average),
  })

interface Meter {
  key: string
  title: string
  you: number
  average: number
  /** Dónde acaba la escala; sin él, en la mayor de las dos cifras. */
  max?: number
  format: (value: number) => string
  icon?: Component
}

const meters = computed<Meter[]>(() => {
  const f = figures.value
  if (!f) return []
  const list: Meter[] = [
    {
      key: 'missions',
      title: t('teacher.analytics.student.missions_done'),
      you: f.missions.value,
      average: f.missions.classAverage ?? 0,
      max: f.missions.counted,
      format: formatNumber,
    },
  ]
  if (f.percent.value !== null) {
    list.push({
      key: 'percent',
      title: t('teacher.students.detail.stat_required_enigmas'),
      you: f.percent.value,
      average: f.percent.classAverage ?? 0,
      max: 100,
      format: (value: number) => formatPercent(value),
    })
  }
  if (f.xp) {
    list.push({
      key: 'xp',
      title: t('teacher.analytics.student.xp'),
      you: f.xp.value,
      average: f.xp.classAverage ?? 0,
      // La XP nunca «sobre un máximo»: la escala es la mayor de las dos cifras.
      format: formatNumber,
      icon: XpIcon,
    })
  }
  return list
})

// ---- Misiones ----

const MISSION_TABS = 'student-missions'
const missionFilter = ref<MissionRowFilter>('all')
const missionRows = computed(() => analytics.value?.missions ?? [])
const missionTabs = computed(() => {
  const count = (filter: MissionRowFilter) => ({
    count: filterMissionRows(missionRows.value, filter).length,
  })
  return [
    { id: 'all', label: t('teacher.analytics.student.missions.filter_all', count('all')) },
    {
      id: 'pending',
      label: t('teacher.analytics.student.missions.filter_pending', count('pending')),
    },
    { id: 'done', label: t('teacher.analytics.student.missions.filter_done', count('done')) },
  ]
})
const missionsEmptyTitle = computed(() => {
  if (missionFilter.value === 'pending') return t('teacher.analytics.student.missions.empty_pending')
  if (missionFilter.value === 'done') return t('teacher.analytics.student.missions.empty_done')
  return t('teacher.analytics.student.missions.empty_all')
})
const visibleMissions = computed(() => filterMissionRows(missionRows.value, missionFilter.value))

// ---- Dificultades ----

// Una dificultad de una misión, con su portada.
const missionsById = computed(() => new Map(missionRows.value.map(m => [m.id, m])))
const { studentSignal } = useAnalyticsSignals(classId, {
  mission: id => missionsById.value.get(id),
})
const signals = computed(() => (analytics.value?.signals ?? []).map(studentSignal))

// ---- Historial ----

const filterLabelId = useId()
const filterOptions = computed(() => {
  const { shop } = classSettings.value
  return (['all', ...Object.keys(TIMELINE_FILTERS)] as TimelineFilter[])
    .filter(filter => {
      if (filter === 'attendance') return can('attendance.view')
      return filter !== 'shop' || shop
    })
    .map(value => ({ value, label: t(`teacher.analytics.student.history.type.${value}`) }))
})

const { formatActivities } = useActivityFormatter('teacher')
type ActivityInput = Parameters<typeof formatActivities>[0][number]

/** El icono de cada punto de la línea de tiempo: el de su grupo del filtro. */
const TIMELINE_ICONS: Record<TimelineGroup, Component> = {
  submissions: PaperAirplaneIcon,
  approvals: CheckBadgeIcon,
  missions: RocketLaunchIconSolid,
  hints: LightBulbIcon,
  behaviors: HandRaisedIcon,
  shop: ShoppingBagIcon,
  progress: TrophyIcon,
  attendance: CalendarDaysIconSolid,
  other: ClockIconSolid,
}

/** Una sesión de asistencia no es del muro: tiene su propia presentación (icono, estado y día). */
function attendanceItem(entry: TimelineAttendanceEntry) {
  const meta = ATTENDANCE_STATUS_META[entry.status]
  const when = formatDayLong(entry.date, locale.value)
  const time =
    entry.startTime && entry.endTime
      ? t('teacher.analytics.student.history.attendance_time', {
          start: entry.startTime,
          end: entry.endTime,
        })
      : ''
  return {
    id: entry.id,
    timeAgo: time ? `${when}, ${time}` : when,
    description: t('teacher.analytics.student.history.attendance', {
      status: t(`teacher.attendance.status.${entry.status}`),
    }),
    icon: meta.icon,
    iconClass: meta.color,
    detail: entry.note
      ? t('teacher.analytics.student.history.attendance_note', { note: entry.note })
      : undefined,
    actor: entry.actor ?? undefined,
  }
}

function historyItem(entry: TimelineEntry) {
  if (entry.kind === 'attendance') return attendanceItem(entry)
  const [formatted] = formatActivities([entry as unknown as ActivityInput])
  if (!formatted) return null
  // Es su historial: sin su nombre en cada línea, con la fecha completa.
  return {
    ...formatted,
    username: undefined,
    studentId: undefined,
    timeAgo: formatNotificationDate(entry.timestamp, locale.value),
    icon: TIMELINE_ICONS[timelineGroup(entry.type)],
  }
}

const historyItems = computed(() =>
  entries.value.flatMap(entry => {
    const item = historyItem(entry)
    return item ? [item] : []
  })
)

const historyCard = ref<{ focusActivity: (id: string) => void } | null>(null)
const loadedAnnouncement = ref('')

/** «Cargar más»: el foco pasa a la primera entrada nueva y el lector oye cuántas son. */
async function loadMore() {
  // Vacío primero: si llegan otra vez tantas como antes, el lector también lo oye.
  loadedAnnouncement.value = ''
  const before = historyItems.value.length
  await loadMoreTimeline()
  const added = historyItems.value.length - before
  if (added <= 0) return
  loadedAnnouncement.value = t(
    'teacher.analytics.student.history.loaded',
    { count: added },
    added
  )
  await nextTick()
  const first = historyItems.value[before]
  if (first) historyCard.value?.focusActivity(first.id)
}
</script>
