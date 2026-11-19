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
        :avatar="classGamification.avatar"
        :avatar-seed="studentAvatarSeed(classId, authStore.user?.id ?? '')"
        :current-xp="classGamification.currentXP"
        :required-xp="classGamification.requiredXP"
        :progress="classGamification.progress"
        :rank="classGamification.rank"
        :total-students="classGamification.totalStudents"
      />
      <Card v-else-if="classSettings.xp && xpError" type="xpbar">
        <CardItem layout="column" padding="lg" centered>
          <LoadError :rate-limited="xpError === 'rate_limited'" @retry="retryXp" />
        </CardItem>
      </Card>
      <Skeleton v-else-if="classSettings.xp" width="w-full" height="h-28" class="rounded-2xl" />

      <!-- Mi Progreso: misiones, XP e insignias. Las vidas, las monedas y el maná van
           en la cabecera, que se ve en todas las pestañas. -->
      <Card type="stats">
        <CardHeader
          :title="t('student.classes.detail.progress.title')"
          :icon="ArrowTrendingUpIcon"
          title-tag="h2"
        />
        <CardItem v-if="progressError && !progress" layout="column" padding="lg" centered>
          <LoadError
            :rate-limited="progressError === 'rate_limited'"
            :heading-level="3"
            @retry="retryProgress"
          />
        </CardItem>
        <template v-else-if="summary">
          <!-- Sin misiones que cuenten no hay «0 de 0»: se dice -->
          <CardItem v-if="summary.missionsCounted === 0" layout="column" padding="lg" centered>
            <EmptyState
              :icon="RocketLaunchIcon"
              :title="t('student.classes.detail.missions_tab.empty_title')"
              :description="t('student.classes.detail.missions_tab.empty_default')"
              :heading-level="3"
            />
          </CardItem>
          <CardGrid v-if="tiles.length" cols="tiles">
            <StatTile
              v-for="tile in tiles"
              :key="tile.key"
              surface="item"
              size="md"
              :label="tile.label"
              :value="tile.value"
              :total="tile.total"
              :ring="tile.ring"
              :symbol="tile.symbol"
              :symbol-tone="tile.symbolTone"
              :symbol-props="tile.symbolProps"
            >
              <template v-if="tile.detail || (tile.key === 'badges' && badges.length)" #detail>
                <template v-if="tile.detail">{{ tile.detail }}</template>
                <!-- Las que tiene, con su imagen (y su nombre al pasar el ratón y
                     para el lector de pantalla) -->
                <ul
                  v-if="tile.key === 'badges' && badges.length"
                  class="mt-2 flex flex-wrap justify-center gap-2"
                  :aria-label="t('student.classes.detail.progress.badges_earned')"
                >
                  <li v-for="badge in badges.slice(0, BADGES_SHOWN)" :key="badge.id" :title="badge.name">
                    <img
                      v-if="badge.imageUrl"
                      :src="getImageUrl(badge.imageUrl)"
                      :alt="badge.name"
                      loading="lazy"
                      decoding="async"
                      class="h-10 w-10 rounded-full bg-bg-secondary object-contain p-0.5 ring-2 ring-navy-700/10"
                    />
                    <span
                      v-else
                      class="flex h-10 w-10 items-center justify-center rounded-full bg-navy-700 text-white"
                    >
                      <TrophyIcon class="h-5 w-5" aria-hidden="true" />
                      <span class="sr-only">{{ badge.name }}</span>
                    </span>
                  </li>
                  <li
                    v-if="badges.length > BADGES_SHOWN"
                    class="flex h-10 min-w-[2.5rem] items-center justify-center rounded-full bg-navy-700 px-2 text-xs font-bold text-white"
                  >
                    +{{ badges.length - BADGES_SHOWN }}
                  </li>
                </ul>
              </template>
            </StatTile>
          </CardGrid>
        </template>
        <CardGrid v-else cols="tiles" aria-hidden="true">
          <StatCardSkeleton v-for="i in 3" :key="i" />
        </CardGrid>
      </Card>

      <!-- Tú y tu clase: la API la manda ya hecha, y solo si la clase la tiene encendida -->
      <ClassCompareCard v-if="comparison" :comparison="comparison" :you="me" />

      <!-- Mis resultados -->
      <MyMissionResults
        v-if="progress?.missions.length"
        :class-id="classId"
        :missions="progress.missions"
      />
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
      <MyTeamCard :class-id="classId" />
      <ClassTeachersCard v-if="classTeachers" :teachers="classTeachers" />
      <RecentActivityCard
        :activities="formattedActivities"
        :loading="loadingActivities"
        :loading-more="loadingMore"
        :has-more="hasMore"
        card-type="pending"
        @load-more="loadMoreActivities"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Component } from 'vue'
import { ArrowTrendingUpIcon, RocketLaunchIcon } from '@heroicons/vue/24/outline'
import { TrophyIcon } from '@heroicons/vue/24/solid'
import XpIcon from '~/components/atoms/XpIcon.vue'
import type { ClassTeacherPublic } from '~/types/class.types'
import { studentAvatarSeed } from '~/utils/avatar'
import { ringFraction } from '~/utils/progress-ring'

definePageMeta({ layout: 'student', middleware: ['auth', 'role'] })

const { t } = useI18n()
const route = useRoute()
const classId = computed(() => route.params.id as string)
const classesStore = useClassesStore()
const classGamificationStore = useClassGamificationStore()
const authStore = useAuthStore()

const detail = useStudentClassDetail(classId)
const { classSettings, classData, classGamification, recentActivities, studentAvatar } = detail

const { isLoadingActivities } = storeToRefs(classesStore)

// Si la XP no llega, se dice y se puede reintentar, en vez de un esqueleto para siempre.
const { error: xpFetchError, errorStatus: xpErrorStatus } = storeToRefs(classGamificationStore)
const xpError = computed(() => {
  if (!xpFetchError.value) return null
  return xpErrorStatus.value === 429 ? 'rate_limited' : 'error'
})
function retryXp() {
  void classGamificationStore.fetchClassXp(classId.value, true).catch(() => {})
}
const loadingActivities = computed(() => isLoadingActivities.value)

// Lo suyo en la clase, de una sola fuente: las cifras, sus misiones y la comparación.
const { progress, error: progressError, badges, retry: retryProgress } = useMyProgress(classId)
const summary = computed(() => progress.value?.summary ?? null)
const { getImageUrl } = useImageUrl()

/** Cuántas insignias se ven con su imagen; si tiene más, «+N». */
const BADGES_SHOWN = 6

/** Su avatar, que marca su sitio en «Tú y tu clase»: el suyo, nada de nadie más. */
const me = computed(() => ({
  src: studentAvatar.value,
  name: classGamification.value?.username ?? classGamification.value?.name ?? null,
  seed: studentAvatarSeed(classId.value, authStore.user?.id ?? ''),
}))

const comparison = computed(() => {
  const value = progress.value?.comparison
  return value && value.metrics.length > 0 ? value : null
})

/**
 * Las cifras de «Mi progreso», en una fila: «4 de 7» misiones dentro de su anillo,
 * la XP si la clase la usa y las insignias (con su imagen) si la clase tiene alguna.
 * Nunca un «0 de 0».
 */
const tiles = computed(() => {
  const s = summary.value
  if (!s) return []
  const list: {
    key: string
    label: string
    value: number
    total?: number
    ring?: number
    symbol?: Component
    symbolTone?: 'navy' | 'purple'
    symbolProps?: Record<string, unknown>
    detail?: string
  }[] = []
  if (s.missionsCounted > 0) {
    list.push({
      key: 'missions',
      label: t('student.classes.detail.progress.missions_completed'),
      value: s.missionsCompleted,
      total: s.missionsCounted,
      ring: ringFraction(s.missionsCompleted, s.missionsCounted),
      detail:
        s.extra.total > 0
          ? t(
              'common.progress.extra',
              { done: s.extra.approved, total: s.extra.total },
              s.extra.total
            )
          : undefined,
    })
  }
  if (s.xp !== null) {
    list.push({
      key: 'xp',
      label: t('student.classes.detail.progress.xp_total'),
      value: s.xp,
      symbol: XpIcon,
      symbolTone: 'purple',
      symbolProps: { mono: true },
    })
  }
  if (s.badges.total > 0) {
    list.push({
      key: 'badges',
      label: t('student.classes.detail.progress.badges_earned'),
      value: s.badges.earned,
      total: s.badges.total,
      symbol: TrophyIcon,
    })
  }
  return list
})

// Profesorado de la clase: nombre, perfil y propietario (sin correo ni nivel).
const classTeachers = computed(
  () => (classData.value as { teachers?: ClassTeacherPublic[] } | null)?.teachers ?? null
)

// Activities con formato + avatar del alumno por defecto.
const { formatActivities } = useActivityFormatter('student')
const formattedActivities = computed(() =>
  formatActivities(recentActivities.value.map(a => ({ ...a, avatar: studentAvatar.value })))
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
