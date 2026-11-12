<template>
  <CardItem layout="column" class="gap-3">
    <!-- Desde `sm`: portada | título y lo demás | anillo. En el móvil, arriba la
         portada y el título, y abajo lo demás con el anillo a su derecha: el texto
         se queda con todo el ancho que puede. -->
    <div
      class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:items-start sm:gap-x-4"
    >
      <!-- Su portada, con el aro de su rareza (como en el mapa y en sus tarjetas) -->
      <MissionCover
        :cover="mission.cover"
        :rarity="mission.rarity"
        :locked="locked"
        size="auto"
        class="col-start-1 row-start-1 sm:row-end-3"
      />
      <NuxtLink
        :to="missionLink"
        class="col-start-2 col-end-4 row-start-1 min-w-0 justify-self-start font-semibold text-navy-700 sm:col-end-3 underline decoration-navy-700/30 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
        >{{ mission.title }}</NuxtLink
      >
      <!-- Sus enigmas obligatorios aprobados, en su anillo: solo dibujo, la línea
           de los enigmas lo dice en palabras -->
      <ProgressRing
        v-if="mission.required.total > 0"
        :value="ringFraction(mission.required.approved, mission.required.total)"
        :stroke="10"
        class="col-start-3 row-start-2 h-12 w-12 self-start sm:row-start-1 sm:row-end-3 sm:h-14 sm:w-14"
      >
        <span class="text-xs font-bold tabular-nums text-navy-700 sm:text-sm" aria-hidden="true"
          >{{ formatNumber(mission.required.approved) }}/{{
            formatNumber(mission.required.total)
          }}</span
        >
      </ProgressRing>

      <div class="col-start-1 col-end-3 row-start-2 min-w-0 space-y-1 sm:col-start-2">
        <!-- El estado: icono y texto, nunca solo el color -->
        <p class="flex flex-wrap items-center gap-x-1.5 text-sm text-navy-700">
          <ChartStatusIcon v-if="status" :status="status" />
          <LockClosedIcon
            v-else-if="mission.status === 'bloqueada'"
            class="h-4 w-4 flex-shrink-0 text-navy-700/60"
            aria-hidden="true"
          />
          <MinusCircleIcon v-else class="h-4 w-4 flex-shrink-0 text-navy-700/60" aria-hidden="true" />
          <span class="font-medium">{{ statusText }}</span>
          <span v-if="dateText" class="text-navy-700/80">· {{ dateText }}</span>
        </p>
        <p v-if="facts.length" class="text-sm text-navy-700/80">{{ facts.join(' · ') }}</p>
        <p v-if="requiresText" class="text-sm text-navy-700/80">{{ requiresText }}</p>

        <!-- Lo cobrado con sus enigmas: icono y número en azul marino -->
        <ul
          v-if="rewards.length"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-sm font-semibold tabular-nums text-navy-700"
        >
          <li v-for="reward in rewards" :key="reward.key" class="inline-flex items-center gap-1">
            <component :is="reward.icon" class="h-4 w-4" aria-hidden="true" />
            <span class="sr-only">{{ reward.label }}:</span>
            {{ formatNumber(reward.amount) }}
          </li>
        </ul>
      </div>
    </div>

    <!-- El % de cada enigma, al desplegar: `<details>` nativo, con teclado y sin JavaScript -->
    <details v-if="mission.enigmas.length" class="group text-sm text-navy-700">
      <summary
        class="inline-flex cursor-pointer list-none items-center gap-1 rounded font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 [&::-webkit-details-marker]:hidden"
      >
        <ChevronRightIcon
          class="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
        {{ tr('by_enigma') }}
      </summary>
      <ul class="mt-2 divide-y divide-navy-700/10">
        <li
          v-for="enigma in mission.enigmas"
          :key="enigma.id"
          class="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5"
        >
          <span class="min-w-0 [overflow-wrap:anywhere]">
            {{ enigma.title }}
            <span v-if="enigma.isOptional" class="text-xs text-navy-700/70">
              ({{ tr('optional') }})
            </span>
          </span>
          <span class="font-medium tabular-nums">{{ enigmaResult(enigma) }}</span>
        </li>
      </ul>
    </details>
  </CardItem>
</template>

<script setup lang="ts">
import { LockClosedIcon, MinusCircleIcon } from '@heroicons/vue/24/solid'
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import XpIcon from '~/components/atoms/XpIcon.vue'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import type { StudentEnigmaRow, StudentMissionRow } from '~/types/analytics.types'
import { formatDateShort, missionRowStatus } from '~/utils/analytics-view'
import { formatConjunction } from '~/utils/list-format'
import { ringFraction } from '~/utils/progress-ring'

/**
 * Una misión de un estudiante, con lo suyo en ella: su portada (con el aro de su
 * rareza), estado con icono y texto, su fecha, enigmas aprobados (también en un
 * anillo pequeño), pistas, lo cobrado (icono y número) y, al desplegar, el % de
 * cada enigma.
 *
 * - `variant="teacher"` (por defecto): la página del estudiante del profesorado,
 *   además con la media de aprobación y lo que hay que revisar.
 * - `variant="student"`: «Mis resultados», lo que ve la propia persona. Todo en
 *   neutro y en su vocabulario: «Bloqueada», «1 en revisión», sin media.
 */
const props = withDefaults(
  defineProps<{
    classId: string
    mission: StudentMissionRow
    variant?: 'teacher' | 'student'
  }>(),
  { variant: 'teacher' }
)

const { t, locale } = useI18n()
const { formatNumber, formatPercent } = useNumberFormat()

const isStudent = computed(() => props.variant === 'student')

const tr = (key: string, params: Record<string, unknown> = {}, plural = 1) =>
  isStudent.value
    ? t(`student.classes.detail.results.${key}`, params, plural)
    : t(`teacher.analytics.student.missions.${key}`, params, plural)

const missionLink = computed(() =>
  isStudent.value
    ? `/alumno/clases/${props.classId}/misiones/${props.mission.id}`
    : `/profesor/clases/${props.classId}/misiones/${props.mission.id}`
)

const date = (iso: string) => formatDateShort(iso, locale.value)

const status = computed(() => missionRowStatus(props.mission))

/** Cerrada (por el camino o a mano): la portada, apagada. */
const locked = computed(
  () => props.mission.state === 'path_locked' || props.mission.status === 'bloqueada'
)

const statusText = computed(() => {
  const { pendingReviews, status: manual } = props.mission
  if (isStudent.value) {
    if (status.value === 'pending_review') {
      return tr('in_review', { count: pendingReviews }, pendingReviews)
    }
    // Quien cierra el paso le da igual: para el alumnado, «Bloqueada».
    if (status.value === 'path_locked' || !status.value) return t('student.missions.status.bloqueada')
  }
  if (status.value) return t(`common.charts.status.${status.value}`)
  return manual === 'bloqueada'
    ? t('teacher.analytics.student.missions.excluded_teacher')
    : t('teacher.analytics.student.missions.excluded_empty')
})

const dateText = computed(() => {
  const { completedAt, deadline, state } = props.mission
  if (completedAt) return tr('completed_on', { date: date(completedAt) })
  if (!deadline) return ''
  // Lo cerrado por el camino también puede tener la fecha ya pasada.
  return state === 'expired' || new Date(deadline).getTime() < Date.now()
    ? tr('deadline_past', { date: date(deadline) })
    : tr('deadline_future', { date: date(deadline) })
})

const facts = computed(() => {
  const { required, optional, approvalAverage, hints, pendingReviews } = props.mission
  const list: string[] = []
  if (required.total > 0) {
    list.push(
      tr(
        'enigmas',
        { approved: formatNumber(required.approved), total: formatNumber(required.total) },
        required.total
      )
    )
  }
  if (optional.approved > 0) {
    list.push(
      t(
        'common.progress.extra',
        { done: formatNumber(optional.approved), total: formatNumber(optional.total) },
        optional.total
      )
    )
  }
  if (!isStudent.value && approvalAverage !== null) {
    list.push(t('teacher.analytics.student.missions.average', { value: formatPercent(approvalAverage) }))
  }
  if (hints.used > 0) list.push(tr('hints', { count: hints.used }, hints.used))
  // Al alumnado se lo dice el estado («1 en revisión»).
  if (!isStudent.value && pendingReviews > 0) {
    list.push(t('teacher.analytics.student.missions.pending_reviews', { count: pendingReviews }, pendingReviews))
  }
  return list
})

const requiresText = computed(() => {
  const required = props.mission.pathRequires
  if (props.mission.state !== 'path_locked' || required.length === 0) return ''
  const titles = required.map(r => t('common.mission_map.quoted', { title: r.title }))
  return t('common.mission_map.opens_after', {
    missions: formatConjunction(titles, locale.value, t('common.mission_map.and')),
  })
})

function enigmaResult(enigma: StudentEnigmaRow): string {
  if (enigma.approved) {
    const percent = enigma.percentage === null ? '—' : formatPercent(enigma.percentage)
    return enigma.approvedAt
      ? tr('enigma_approved', { percent, date: date(enigma.approvedAt) })
      : percent
  }
  if (enigma.pendingReview) {
    return enigma.pendingSince
      ? tr('enigma_pending_since', { date: date(enigma.pendingSince) })
      : t('common.charts.status.pending_review')
  }
  return tr('enigma_open')
}

const rewards = computed(() => {
  const { xp, coins, mana } = props.mission.earned
  return [
    { key: 'xp', icon: XpIcon, label: t('common.resources.xp'), amount: xp },
    { key: 'coins', icon: CoinIcon, label: t('common.resources.coins'), amount: coins },
    { key: 'mana', icon: ManaIcon, label: t('common.resources.mana'), amount: mana },
  ].filter((reward): reward is typeof reward & { amount: number } => (reward.amount ?? 0) > 0)
})
</script>
