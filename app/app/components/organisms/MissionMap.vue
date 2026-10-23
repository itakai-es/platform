<template>
  <!-- Mapa de misiones (en pruebas): la clase entera, en el orden de la
       progresión, como un camino. Los nodos son una lista ordenada de enlaces
       (y de botones, las cerradas) en ese orden, que es también el del
       tabulador; el camino es solo dibujo y va oculto al lector de pantalla. -->
  <section class="rounded-2xl bg-white p-4 shadow-lg sm:p-6" :aria-labelledby="titleId">
    <div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 :id="titleId" class="text-lg font-bold text-navy-700">
        {{ t('common.mission_map.title') }}
      </h2>
      <Badge variant="info" size="sm">{{ t('common.mission_map.beta') }}</Badge>
      <p class="basis-full text-sm text-navy-700/70">{{ t('common.mission_map.beta_note') }}</p>
    </div>

    <div ref="rootRef" class="relative">
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
        focusable="false"
      >
        <path
          v-for="segment in segments"
          :key="segment.key"
          :d="segment.d"
          fill="none"
          stroke-width="6"
          stroke-linecap="round"
          :stroke-dasharray="segment.done ? undefined : '1 12'"
          :class="segment.done ? 'stroke-navy-700' : 'stroke-navy-700/30'"
        />
      </svg>

      <ol class="relative space-y-5 sm:space-y-1">
        <li
          v-for="(node, index) in nodes"
          :key="node.id"
          class="flex flex-col sm:w-1/2"
          :class="
            mapLane(index) === 'left'
              ? 'sm:items-end sm:pr-10'
              : 'sm:ml-auto sm:items-start sm:pl-10'
          "
        >
          <component
            :is="node.href ? NuxtLink : 'button'"
            v-bind="node.href ? { to: node.href } : { type: 'button', 'aria-disabled': 'true' }"
            class="group flex max-w-full items-center gap-3 rounded-2xl p-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 sm:gap-4"
            :class="[
              mapLane(index) === 'left' ? 'sm:flex-row-reverse sm:text-right' : '',
              node.href ? '' : 'cursor-not-allowed',
            ]"
            :aria-describedby="node.href ? undefined : explanationId(node.id)"
            @click="explainIfLocked(node)"
          >
            <!-- El nodo: la portada de la misión en un círculo con el aro de su
                 rareza, y el estado en un icono pegado (además del texto). -->
            <span class="relative flex-shrink-0" data-map-node>
              <span
                class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-bg-secondary ring-4 ring-offset-2 ring-offset-white group-hover:shadow-lg motion-safe:transition-shadow sm:h-20 sm:w-20"
                :class="RARITY_RING[node.rarity] ?? RARITY_RING.comun"
              >
                <img
                  v-if="node.cover"
                  :src="node.cover"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover"
                  :class="node.state === 'locked' ? 'opacity-60 grayscale' : ''"
                />
                <RocketLaunchIcon v-else class="h-7 w-7 text-navy-700/60" aria-hidden="true" />
              </span>
              <span
                class="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow"
                :class="STATE_BADGE[node.state]"
                aria-hidden="true"
              >
                <component :is="STATE_ICON[node.state]" class="h-4 w-4" />
              </span>
            </span>

            <span class="min-w-0">
              <span class="block text-xs font-semibold text-navy-700/70">
                {{ t('common.mission_map.step', { n: index + 1 }) }}
              </span>
              <span class="block break-words font-bold leading-tight text-navy-700">
                {{ node.title }}
              </span>
              <span class="mt-1 block text-sm text-navy-700">{{ node.stateText }}</span>
              <span v-if="node.detail" class="block text-sm text-navy-700/70">
                {{ node.detail }}
              </span>
              <span class="mt-1.5 flex" :class="mapLane(index) === 'left' ? 'sm:justify-end' : ''">
                <RarityBadge :rarity="node.rarity" />
              </span>
            </span>
          </component>

          <!-- Por qué no se abre: visible y anunciado al pulsar, no en un aviso
               flotante que solo ve quien usa el ratón. Con el mismo texto que la
               tarjeta. Solo lo ve el alumnado: el profesorado las abre todas. -->
          <p
            v-if="!node.href"
            :id="explanationId(node.id)"
            aria-live="polite"
            class="max-w-xs px-2 text-sm text-navy-700"
            :class="mapLane(index) === 'left' ? 'sm:text-right' : ''"
          >
            <template v-if="explained === node.id">
              {{ t('student.missions.locked_toast') }}
            </template>
          </p>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  CheckIcon,
  ClockIcon,
  FlagIcon,
  LockClosedIcon,
  PlayIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from '@heroicons/vue/24/solid'
import type { MissionRarity } from '~/types/mission.types'
import {
  mapLane,
  pathBetween,
  segmentDone,
  studentNodeState,
  teacherNodeState,
  type MapNodeState,
  type MapPoint,
} from '~/utils/mission-map'

/**
 * El mapa de misiones de una clase, en pruebas: una vista más de la pestaña
 * Misiones, para los dos roles, con las misiones en el orden de la clase. En
 * móvil es una columna; desde `sm`, un camino en zigzag. Las posiciones salen
 * del orden: nada de lienzo ni de coordenadas guardadas.
 *
 * El alumnado ve su estado en cada misión (completada, en curso con su %,
 * disponible, urgente, expirada o cerrada por su docente); el profesorado, el
 * de la clase y cuántas personas la han completado, de cuántas («X de N»). Una misión cerrada es un
 * botón que, al pulsarlo, dice por qué. Sin animaciones: el camino se dibuja
 * quieto, y solo cambia la sombra del nodo al pasar por encima.
 */

interface MapMission {
  id: string
  title: string
  status: string
  rarity?: MissionRarity | string
  backgroundImage?: string | null
  deadline?: string | null
  /** Alumnado: su % en la misión. */
  progress?: number
  /** Profesorado: cuántas personas la han completado, de cuántas. */
  completedCount?: number
  totalStudents?: number
}

const NuxtLink = resolveComponent('NuxtLink')

const props = defineProps<{
  /** Las misiones de la clase, ya en su orden. */
  missions: MapMission[]
  mode: 'student' | 'teacher'
  classId: string
}>()

const { t } = useI18n()
const { getImageUrl } = useImageUrl()
const teacherStatusLabel = useMissionStatusLabel()
const titleId = useId()

const RARITY_RING: Record<string, string> = {
  comun: 'ring-badge-comun',
  rara: 'ring-purple-light',
  epica: 'ring-purple',
  legendaria: 'ring-badge-legendaria',
}

const STATE_ICON: Record<MapNodeState, Component> = {
  completed: CheckIcon,
  in_progress: PlayIcon,
  available: FlagIcon,
  urgent: ClockIcon,
  expired: XMarkIcon,
  locked: LockClosedIcon,
}

// Colores de la app para cada estado; el icono y el texto dicen lo mismo.
const STATE_BADGE: Record<MapNodeState, string> = {
  completed: 'bg-green text-navy-700',
  in_progress: 'bg-navy-700 text-white',
  available: 'bg-white text-navy-700',
  urgent: 'bg-badge-urgente text-white',
  expired: 'bg-gray-500 text-white',
  locked: 'bg-badge-bloqueada text-navy-700',
}

function studentStateText(state: MapNodeState, progress: number): string {
  switch (state) {
    case 'completed':
      return t('common.mission_map.state.completed')
    case 'in_progress':
      return t('common.mission_map.state.in_progress', { progress })
    case 'urgent':
      return t('common.mission_map.state.urgent')
    case 'expired':
      return t('common.mission_map.state.expired')
    case 'locked':
      return t('common.mission_map.state.locked')
    default:
      return t('common.mission_map.state.available')
  }
}

/** Profesorado: cuántas personas la han completado, de cuántas. */
function completedBy(mission: MapMission): string {
  const total = mission.totalStudents ?? 0
  if (total === 0) return t('common.mission_map.no_students')
  const done = mission.completedCount ?? 0
  return t('common.mission_map.completed_by', { done, total }, done)
}

const nodes = computed(() =>
  props.missions.map(mission => {
    const teacher = props.mode === 'teacher'
    const state = teacher ? teacherNodeState(mission) : studentNodeState(mission)
    // El profesorado abre todas; el alumnado, todas menos las cerradas (las
    // caducadas se abren en solo lectura, como en las tarjetas).
    const href = teacher
      ? `/profesor/clases/${props.classId}/misiones/${mission.id}`
      : state === 'locked'
        ? null
        : `/alumno/clases/${props.classId}/misiones/${mission.id}`
    return {
      id: mission.id,
      title: mission.title,
      rarity: (mission.rarity ?? 'comun') as MissionRarity,
      cover: getImageUrl(mission.backgroundImage) ?? null,
      state,
      href,
      stateText: teacher
        ? teacherStatusLabel(teacherStatusOf(state))
        : studentStateText(state, mission.progress ?? 0),
      detail: teacher ? completedBy(mission) : null,
    }
  })
)

/** El estado del profesorado con el nombre del filtro («Activa», «Bloqueada»…). */
function teacherStatusOf(state: MapNodeState): string {
  switch (state) {
    case 'completed':
      return 'completada'
    case 'locked':
      return 'bloqueada'
    case 'expired':
      return 'expirada'
    case 'urgent':
      return 'urgente'
    default:
      return 'activa'
  }
}

// ---- Por qué no se abre una cerrada ----
const explained = ref<string | null>(null)
const explanationPrefix = useId()
function explanationId(id: string) {
  return `${explanationPrefix}-${id}`
}
/** Una cerrada no navega: al pulsarla, se dice por qué. */
function explainIfLocked(node: { id: string; href: string | null }) {
  if (!node.href) explained.value = node.id
}

// ---- El camino: se mide dónde han quedado los nodos y se unen ----
const rootRef = ref<HTMLElement | null>(null)
const points = ref<MapPoint[]>([])

const segments = computed(() =>
  points.value.slice(1).map((to, index) => ({
    key: `${nodes.value[index]?.id}-${nodes.value[index + 1]?.id}`,
    d: pathBetween(points.value[index]!, to),
    done: segmentDone(nodes.value[index]?.state ?? 'available'),
  }))
)

function measure() {
  const root = rootRef.value
  if (!root) return
  const box = root.getBoundingClientRect()
  points.value = [...root.querySelectorAll<HTMLElement>('[data-map-node]')].map(node => {
    const rect = node.getBoundingClientRect()
    return {
      x: rect.left - box.left + rect.width / 2,
      y: rect.top - box.top + rect.height / 2,
    }
  })
}

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'undefined' || !rootRef.value) return
  observer = new ResizeObserver(() => measure())
  observer.observe(rootRef.value)
})
onBeforeUnmount(() => observer?.disconnect())

watch(
  () => props.missions.map(m => `${m.id}:${m.title}`).join('|'),
  async () => {
    explained.value = null
    await nextTick()
    measure()
  }
)
</script>
