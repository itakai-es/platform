<template>
  <!-- Mapa de misiones (en pruebas): la clase entera como un camino. Los nodos
       son una lista ordenada de enlaces (y de botones, las cerradas) en el orden
       del recorrido (capa a capa y, dentro, el de la clase), que es también el
       del tabulador; las líneas son solo dibujo y van ocultas al lector de
       pantalla. Lo que abre cada misión va además en texto. -->
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

      <!-- Móvil: una columna. Desde `sm`: una rejilla con cada capa en su fila
           (ver mapGrid en utils/mission-map-layout.ts). -->
      <ol
        class="relative space-y-5 sm:grid sm:gap-x-2 sm:gap-y-10 sm:space-y-0"
        :style="{ gridTemplateColumns: `repeat(${columns * 2}, minmax(0, 1fr))` }"
      >
        <li
          v-for="node in nodes"
          :key="node.id"
          class="flex flex-col sm:items-center sm:[grid-column:var(--map-col)/span_2] sm:[grid-row:var(--map-row)]"
          :style="{ '--map-row': node.cell.row, '--map-col': node.cell.column }"
          :data-map-item="node.id"
        >
          <component
            :is="node.href ? NuxtLink : 'button'"
            v-bind="node.href ? { to: node.href } : { type: 'button', 'aria-disabled': 'true' }"
            class="group flex max-w-full items-center gap-3 rounded-2xl p-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 sm:flex-col sm:gap-2 sm:text-center"
            :class="node.href ? '' : 'cursor-not-allowed'"
            :aria-describedby="node.href ? undefined : explanationId(node.id)"
            @click="explainIfLocked(node)"
          >
            <!-- El nodo: la portada de la misión en un círculo con el aro de su
                 rareza, y el estado en un icono pegado (además del texto). -->
            <span class="relative flex-shrink-0" data-map-node :data-map-id="node.id">
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
                {{ t('common.mission_map.step', { n: node.step }) }}
              </span>
              <span class="block break-words font-bold leading-tight text-navy-700">
                {{ node.title }}
              </span>
              <span class="mt-1 block text-sm text-navy-700">{{ node.stateText }}</span>
              <span v-if="node.pathText" class="block text-sm text-navy-700/70">
                {{ node.pathText }}
              </span>
              <span v-if="node.detail" class="block text-sm text-navy-700/70">
                {{ node.detail }}
              </span>
              <span class="mt-1.5 flex sm:justify-center">
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
            class="max-w-xs px-2 text-sm text-navy-700 sm:text-center"
          >
            <template v-if="explained === node.id">{{ node.explanation }}</template>
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
import { pathBetween, type MapNodeState, type MapPoint } from '~/utils/mission-map'
import {
  layoutMissionMap,
  mapColumns,
  mapGrid,
  type MapMissionInput,
} from '~/utils/mission-map-layout'

/**
 * El mapa de misiones de una clase, en pruebas: una vista más de la pestaña
 * Misiones, para los dos roles. Las posiciones salen del camino: con
 * requisitos, por capas (lo que no pide nada arriba; cada misión, debajo de lo
 * que pide) y una línea por requisito; sin ellos, el orden de la clase en
 * zigzag. En móvil es una columna en el orden del recorrido, y lo que abre cada
 * misión va en texto («Se abre al completar «A»»). Todo el cálculo está en
 * utils/mission-map-layout.ts; aquí solo se pinta.
 *
 * El alumnado ve su estado en cada misión (completada, en curso con su %,
 * disponible, urgente, expirada o cerrada, por su docente o hasta completar
 * otra); el profesorado, el de la clase, cuántas personas la han completado de
 * cuántas («X de N») y lo que pide. Una misión cerrada es un botón que, al
 * pulsarlo, dice por qué. Sin animaciones: el camino se dibuja quieto.
 */

interface MapMission extends MapMissionInput {
  rarity?: MissionRarity | string
  backgroundImage?: string | null
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
const { opensAfter, missionList } = useMissionPathText()
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

// ---- La disposición (utils/mission-map-layout.ts) ----
const columns = ref(3)
const layout = computed(() => layoutMissionMap(props.missions, props.mode))
const grid = computed(() => mapGrid(layout.value, columns.value))

const nodes = computed(() => {
  const byId = new Map(props.missions.map(m => [m.id, m]))
  const teacher = props.mode === 'teacher'
  return layout.value.nodes.map(node => {
    const mission = byId.get(node.id)!
    const pathLocked = node.lockReason === 'path'
    // El profesorado abre todas; el alumnado, todas menos las cerradas (las
    // caducadas se abren en solo lectura, como en las tarjetas).
    const href = teacher
      ? `/profesor/clases/${props.classId}/misiones/${node.id}`
      : node.state === 'locked'
        ? null
        : `/alumno/clases/${props.classId}/misiones/${node.id}`
    const pathText = node.opensAfter.length > 0 ? opensAfter(node.opensAfter) : ''
    return {
      id: node.id,
      step: node.step,
      cell: grid.value.get(node.id) ?? { row: 1, column: 1 },
      title: mission.title,
      rarity: (mission.rarity ?? 'comun') as MissionRarity,
      cover: getImageUrl(mission.backgroundImage) ?? null,
      state: node.state,
      href,
      // Cerrada por el camino, el estado ya es lo que la abre.
      stateText: teacher
        ? teacherStatusLabel(teacherStatusOf(node.state))
        : pathLocked
          ? pathText
          : studentStateText(node.state, mission.progress ?? 0),
      pathText: pathLocked ? '' : pathText,
      detail: teacher ? completedBy(mission) : null,
      explanation: pathLocked
        ? t('common.mission_map.locked_path_explain', {
            missions: missionList(node.opensAfter.map(m => m.title)),
          })
        : t('student.missions.locked_toast'),
    }
  })
})

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

// ---- Las líneas: se mide dónde han quedado los nodos y se unen ----
const rootRef = ref<HTMLElement | null>(null)
/**
 * Centro de cada nodo, su radio y dónde acaba su texto (`bottom`), por id. Las
 * líneas salen de debajo del texto, para no tacharlo.
 */
const points = ref<Map<string, MapPoint & { r: number; bottom: number }>>(new Map())
const column = ref(true)

const segments = computed(() => {
  const at = points.value
  // En la columna del móvil, un raíl de cada nodo al siguiente del recorrido:
  // lo que abre cada uno va en texto.
  if (column.value) {
    const order = layout.value.nodes
    return order.slice(1).flatMap((node, index) => {
      const from = at.get(order[index]!.id)
      const to = at.get(node.id)
      if (!from || !to) return []
      return [
        {
          key: `${order[index]!.id}>${node.id}`,
          d: pathBetween(from, to),
          done: order[index]!.state === 'completed',
        },
      ]
    })
  }
  // Desde `sm`, una línea por arista, de debajo del texto de lo que se pide al
  // borde de arriba de quien lo pide.
  return layout.value.edges.flatMap(edge => {
    const from = at.get(edge.from)
    const to = at.get(edge.to)
    if (!from || !to) return []
    return [
      {
        key: edge.key,
        d: pathBetween({ x: from.x, y: from.bottom + 4 }, { x: to.x, y: to.y - to.r - 4 }),
        done: edge.done,
      },
    ]
  })
})

function measure() {
  const root = rootRef.value
  if (!root) return
  const box = root.getBoundingClientRect()
  column.value = !window.matchMedia('(min-width: 640px)').matches
  columns.value = mapColumns(box.width)
  const next = new Map<string, MapPoint & { r: number; bottom: number }>()
  for (const element of root.querySelectorAll<HTMLElement>('[data-map-node]')) {
    const rect = element.getBoundingClientRect()
    const item = element.closest<HTMLElement>('[data-map-item]')?.getBoundingClientRect() ?? rect
    next.set(element.dataset.mapId!, {
      x: rect.left - box.left + rect.width / 2,
      y: rect.top - box.top + rect.height / 2,
      r: rect.height / 2,
      bottom: item.bottom - box.top,
    })
  }
  points.value = next
}

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'undefined' || !rootRef.value) return
  observer = new ResizeObserver(() => measure())
  observer.observe(rootRef.value)
})
onBeforeUnmount(() => observer?.disconnect())

// Al cambiar las misiones o las columnas, se vuelve a medir con el DOM ya puesto.
watch(
  () => [
    props.missions.map(m => `${m.id}:${m.title}:${(m.prerequisiteIds ?? []).join(',')}`).join('|'),
    columns.value,
  ],
  async () => {
    explained.value = null
    await nextTick()
    measure()
  }
)
</script>
