<template>
  <!-- Mapa de misiones (en pruebas): la clase entera como un tablero de
       aventura. Los medallones son una lista ordenada de botones en el orden
       del recorrido, con una sola parada del tabulador (la misión elegida, la
       actual o la última que se miró) y las flechas, Inicio y Fin para pasar
       de una a otra; al pulsar una se abre su detalle: un panel al lado en
       pantallas anchas y una hoja inferior en el móvil. La carretera, la
       salida, la meta y el fondo son solo dibujo y van ocultos al lector de
       pantalla: el estado de cada misión y lo que la abre van siempre en
       texto. -->
  <section
    data-mission-map
    class="rounded-2xl bg-white p-4 shadow-lg sm:p-6"
    :aria-labelledby="titleId"
    @keydown.esc="closeDetail()"
  >
    <header class="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 :id="titleId" class="text-lg font-bold text-navy-700">
            {{ t('common.mission_map.title') }}
          </h2>
          <Badge variant="info" size="sm">{{ t('common.mission_map.beta') }}</Badge>
        </div>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('common.mission_map.beta_note') }}</p>
      </div>

      <!-- Alumnado: lo recorrido y el atajo a su misión. -->
      <div
        v-if="mode === 'student'"
        class="flex w-full flex-wrap items-end gap-x-4 gap-y-3 sm:w-auto"
      >
        <!-- Todo completado: la copa en vez de la barra al 100 %. -->
        <div v-if="finished" class="flex min-w-[14rem] flex-1 items-center gap-3">
          <span
            class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-badge-legendaria text-white shadow-md"
          >
            <TrophyIcon class="h-6 w-6" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <p class="text-base font-bold text-navy-700">
              {{ t('common.mission_map.all_done') }}
            </p>
            <p class="text-sm text-navy-700/80">{{ progressText }}</p>
          </div>
        </div>
        <div v-else class="min-w-[14rem] flex-1">
          <p class="mb-1.5 text-sm font-semibold text-navy-700">{{ progressText }}</p>
          <ProgressBar :percentage="progress.percent" :label="`${progress.percent} %`" />
        </div>
        <Button
          v-if="currentId"
          variant="secondary-lilac"
          size="sm"
          :icon-left="MapPinIcon"
          @click="goToCurrent()"
        >
          {{ t('common.mission_map.go_to_mine') }}
        </Button>
      </div>

      <!-- Profesorado: cómo va la clase. -->
      <div v-else class="w-full sm:w-80">
        <template v-if="classProgress.students > 0">
          <p class="mb-1.5 text-sm font-semibold text-navy-700">
            {{ t('common.mission_map.class_progress', { percent: classProgress.percent }) }}
          </p>
          <ProgressBar :percentage="classProgress.percent" :label="`${classProgress.percent} %`" />
          <p class="mt-1 text-xs text-navy-700/70">
            {{
              t('common.mission_map.class_done_by_all', {
                done: classProgress.doneByAll,
                total: items.length,
              })
            }}
          </p>
        </template>
        <p v-else class="text-sm text-navy-700/70">{{ t('common.mission_map.no_students') }}</p>
      </div>
    </header>

    <div ref="rootRef" class="flex items-start gap-5">
      <!-- El tablero. `isolate`: sus capas (el velo y lo que va por encima)
           se quedan dentro y no tapan menús ni cabeceras de la página. -->
      <div
        ref="boardRef"
        class="relative isolate min-w-0 flex-1 overflow-hidden rounded-2xl bg-navy-base"
        :class="entering ? 'map-enter' : ''"
        :style="{ height: `${geo.height}px`, '--map-draw': `${drawSeconds}s` }"
      >
        <!-- Fondo: islas de color y estrellitas. -->
        <svg
          v-memo="[islands, sparkles]"
          class="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <radialGradient
              v-for="(color, tone) in ISLAND_COLORS"
              :id="`${uid}-${tone}`"
              :key="tone"
            >
              <stop offset="0%" :style="{ stopColor: `rgb(${color})`, stopOpacity: 0.3 }" />
              <stop offset="70%" :style="{ stopColor: `rgb(${color})`, stopOpacity: 0.1 }" />
              <stop offset="100%" :style="{ stopColor: `rgb(${color})`, stopOpacity: 0 }" />
            </radialGradient>
          </defs>
          <ellipse
            v-for="(island, index) in islands"
            :key="index"
            :cx="island.x"
            :cy="island.y"
            :rx="island.rx"
            :ry="island.ry"
            :fill="`url(#${uid}-${island.tone})`"
          />
          <path
            v-for="(sparkle, index) in sparkles"
            :key="`s${index}`"
            :d="sparklePath(sparkle)"
            class="fill-white/50"
          />
        </svg>

        <MissionMapRoads :roads="geo.roads" :board="board" :lit="litRoads" />

        <!-- Salida y meta (solo dibujo). La etiqueta de la salida va a su
             lado, para que no la tape «Estás aquí» si la misión actual es de
             la primera fila. -->
        <div
          class="map-pop pointer-events-none absolute"
          :style="{ left: `${geo.start.x}px`, top: `${geo.start.y}px` }"
          aria-hidden="true"
        >
          <span
            class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-navy-700 text-white shadow-lg ring-4 ring-white"
            :class="board ? 'h-12 w-12' : 'h-10 w-10'"
          >
            <FlagIcon :class="board ? 'h-6 w-6' : 'h-5 w-5'" />
          </span>
          <span :class="[markerChip, board ? 'left-8' : 'left-7', 'top-0 -translate-y-1/2']">
            {{ t('common.mission_map.start') }}
          </span>
        </div>
        <div
          class="map-pop pointer-events-none absolute"
          :style="{
            left: `${geo.goal.x}px`,
            top: `${geo.goal.y}px`,
            '--map-delay': `${drawSeconds}s`,
          }"
          aria-hidden="true"
        >
          <!-- Mapa completado: la meta brilla, con un halo grande que late y
               un aro que se abre (con animaciones; si no, solo el halo). -->
          <span
            v-if="finished"
            class="absolute -translate-x-1/2 -translate-y-1/2"
            :class="board ? 'h-52 w-52' : 'h-32 w-32'"
          >
            <span
              class="absolute inset-0 rounded-full bg-green/50 blur-2xl"
              :class="pulsing ? 'map-goal-glow' : ''"
            />
            <span class="absolute inset-[28%] rounded-full bg-green/80 blur-lg" />
            <span
              v-if="pulsing"
              class="map-goal-ring absolute inset-[28%] rounded-full border-4 border-green"
            />
          </span>
          <span
            class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-badge-legendaria text-white shadow-lg ring-4"
            :class="[board ? 'h-14 w-14' : 'h-11 w-11', finished ? 'ring-green' : 'ring-white']"
          >
            <TrophyIcon :class="board ? 'h-7 w-7' : 'h-6 w-6'" />
          </span>
          <span
            :class="[
              markerChip,
              board ? 'left-0 top-9 -translate-x-1/2' : 'left-7 top-0 -translate-y-1/2',
            ]"
          >
            {{ t('common.mission_map.goal') }}
          </span>
        </div>

        <!-- Al resaltar (pasar por una misión o pulsar la leyenda), un velo
             atenúa el tablero; lo resaltado (sus medallones y sus tramos) va
             por encima, y las etiquetas siempre, para que se lean igual de
             bien. Es un solo elemento: así, pasar el ratón no vuelve a pintar
             las cuarenta misiones. -->
        <div
          class="pointer-events-none absolute inset-0 z-10 bg-navy-base/50 motion-safe:transition-opacity motion-safe:duration-200"
          :class="highlighting ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        />

        <!-- Las misiones, en el orden del recorrido. Cada una se vuelve a
             pintar solo si cambia lo suyo (`v-memo`). -->
        <p :id="keysId" class="sr-only">{{ t('common.mission_map.keys_hint') }}</p>
        <ol class="absolute inset-0">
          <li
            v-for="(item, index) in items"
            :key="item.id"
            v-memo="[
              item,
              geo,
              drawSeconds,
              roleOf(item),
              item.id === selected,
              item.id === tabStop,
              item.id === currentId,
              you,
              floating,
              wide,
            ]"
            class="map-pop absolute"
            :class="roleOf(item) ? 'z-30' : ''"
            :style="placeStyle(item.id)"
          >
            <button
              type="button"
              :data-map-node-button="item.id"
              class="group relative flex w-full rounded-2xl text-left focus:outline-none"
              :class="board ? 'flex-col items-center' : 'h-full items-center'"
              :style="board ? undefined : columnButtonStyle(item.id)"
              :tabindex="item.id === tabStop ? 0 : -1"
              :aria-current="item.id === currentId ? 'step' : undefined"
              :aria-haspopup="wide ? undefined : 'dialog'"
              :aria-describedby="item.id === tabStop ? keysId : undefined"
              @click="openDetail(item.id)"
              @keydown="onNodeKeydown($event, index)"
              @pointerenter="onPointerEnter($event, item.id)"
              @pointerleave="onPointerLeave($event)"
              @focus="onNodeFocus($event, item.id)"
              @blur="onNodeBlur()"
            >
              <!-- El medallón: la portada con el aro de su rareza, el número de
                   paso y el icono del estado. -->
              <span
                class="relative block flex-shrink-0 rounded-full motion-safe:transition-transform motion-safe:duration-200"
                :class="lifted(item) ? '-translate-y-1.5' : ''"
                :style="{ width: `${geo.node}px`, height: `${geo.node}px` }"
              >
                <!-- Completada: un brillo detrás. -->
                <span
                  v-if="item.state === 'completed'"
                  class="absolute -inset-3 rounded-full bg-green/60 blur-md"
                />
                <!-- Profesorado: el anillo con la parte del alumnado que la ha completado. -->
                <svg
                  v-if="item.completed"
                  class="absolute -left-4 -top-4"
                  :width="geo.node + 32"
                  :height="geo.node + 32"
                  aria-hidden="true"
                  focusable="false"
                >
                  <circle
                    :cx="geo.node / 2 + 16"
                    :cy="geo.node / 2 + 16"
                    :r="geo.node / 2 + 12"
                    fill="none"
                    stroke-width="6"
                    class="stroke-white/15"
                  />
                  <circle
                    v-if="ringOf(item) > 0"
                    :cx="geo.node / 2 + 16"
                    :cy="geo.node / 2 + 16"
                    :r="geo.node / 2 + 12"
                    fill="none"
                    stroke-width="6"
                    stroke-linecap="round"
                    pathLength="100"
                    :stroke-dasharray="`${ringOf(item) * 100} 100`"
                    :transform="`rotate(-90 ${geo.node / 2 + 16} ${geo.node / 2 + 16})`"
                    class="stroke-white"
                  />
                </svg>
                <span
                  class="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-navy-base-light shadow-lg ring-[5px] ring-offset-2 ring-offset-navy-base group-hover:shadow-xl group-focus-visible:outline group-focus-visible:outline-[3px] group-focus-visible:outline-offset-[7px] group-focus-visible:outline-white"
                  :class="
                    item.state === 'locked' ? 'ring-badge-bloqueada' : RARITY_RING[item.rarity]
                  "
                >
                  <img
                    v-if="item.cover"
                    :src="item.cover"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    class="h-full w-full object-cover"
                    :class="item.state === 'locked' ? 'opacity-60 grayscale' : ''"
                  />
                  <RocketLaunchIcon v-else class="h-8 w-8 text-white/60" aria-hidden="true" />
                </span>
                <span
                  class="absolute -left-1.5 -top-1.5 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-navy-700 px-1.5 text-xs font-bold text-white ring-2 ring-white"
                  aria-hidden="true"
                >
                  {{ item.step }}
                </span>
                <MissionMapStateIcon
                  :state="item.state"
                  class="absolute -bottom-1 -right-1 ring-[3px] ring-white"
                />
                <!-- Clara sobre el tablero en todos los temas (no el dorado de
                     la rareza, que en «university» es azul marino). -->
                <StarIcon
                  v-if="item.state === 'completed'"
                  class="absolute -right-2 -top-2 h-6 w-6 text-peach drop-shadow"
                  aria-hidden="true"
                />
              </span>

              <!-- «Estás aquí», en el tablero: encima del medallón, sobre la
                   carretera y el velo (nunca se atenúa). -->
              <span
                v-if="board && item.id === currentId"
                class="absolute bottom-full left-1/2 z-30 mb-3 -translate-x-1/2"
              >
                <span :class="['block', floating ? 'map-float' : '']">
                  <MissionMapHere :you="you" />
                </span>
              </span>

              <!-- La etiqueta: el título (como mucho dos líneas) y, al
                   profesorado, cuántas personas la han completado. -->
              <span
                class="flex min-w-0 flex-col"
                :class="board ? 'mt-3 max-w-full items-center' : 'flex-1 items-start'"
              >
                <MissionMapHere
                  v-if="!board && item.id === currentId"
                  :you="you"
                  size="xxs"
                  class="relative z-30 mb-1"
                />
                <span
                  class="relative z-30 block max-w-full rounded-xl bg-white px-3 py-1.5 shadow-md motion-safe:transition-shadow group-focus-visible:ring-[3px] group-focus-visible:ring-purple"
                  :class="[
                    board ? 'text-center' : '',
                    selected === item.id || roleOf(item) === 'active'
                      ? 'ring-[3px] ring-purple'
                      : '',
                    roleOf(item) === 'linked' ? 'ring-2 ring-green' : '',
                  ]"
                >
                  <span class="sr-only"
                    >{{ t('common.mission_map.step', { n: item.step }) }}:
                  </span>
                  <span
                    class="line-clamp-2 text-sm font-bold leading-tight [overflow-wrap:anywhere]"
                    :class="item.state === 'locked' ? 'text-navy-700/70' : 'text-navy-700'"
                  >
                    {{ item.title }}
                  </span>
                  <span
                    v-if="item.completed"
                    class="mt-0.5 flex items-center gap-1 text-xs font-semibold text-navy-700/70"
                    :class="board ? 'justify-center' : ''"
                    aria-hidden="true"
                  >
                    <UsersIcon class="h-3.5 w-3.5" />
                    {{ item.completed.done }}/{{ item.completed.total }}
                  </span>
                  <span class="sr-only">
                    . {{ item.stateText
                    }}<template v-if="item.completed">. {{ item.completed.text }}</template>
                  </span>
                </span>
              </span>
            </button>
          </li>
        </ol>
      </div>

      <!-- Pantallas anchas: el detalle, en un panel al lado del tablero. Pegado
           arriba mientras se baja por el tablero y, si no cabe en la
           ventana, con su propio scroll (que el botón se alcance siempre). -->
      <div
        v-if="wide"
        ref="panelRef"
        role="region"
        class="sticky top-4 max-h-[calc(100dvh-2rem)] w-80 flex-shrink-0 self-start overflow-y-auto rounded-2xl border border-navy-700/10 bg-white p-4 shadow-lg"
        :aria-labelledby="selectedItem ? panelTitleId : undefined"
        :aria-label="selectedItem ? undefined : t('common.mission_map.detail.label')"
      >
        <template v-if="selectedItem">
          <div class="absolute right-6 top-6 z-10 rounded-lg bg-white/90 shadow">
            <IconButton
              :icon="XMarkIcon"
              :label="t('common.actions.close')"
              @click="closeDetail()"
            />
          </div>
          <MissionMapDetail :item="selectedItem" :mode="mode" :title-id="panelTitleId" @go="goTo" />
        </template>
        <div v-else class="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <span class="flex h-14 w-14 items-center justify-center rounded-full bg-purple-light">
            <CursorArrowRaysIcon class="h-7 w-7 text-navy-700" aria-hidden="true" />
          </span>
          <p class="text-sm text-navy-700/80">{{ t('common.mission_map.detail.empty') }}</p>
        </div>
      </div>
    </div>

    <!-- Leyenda: cada estado resalta sus misiones en el mapa. -->
    <div
      data-map-legend
      class="mt-5 flex flex-wrap items-center gap-2"
      role="group"
      :aria-labelledby="legendId"
    >
      <p :id="legendId" class="mr-1 text-sm font-semibold text-navy-700">
        {{ t('common.mission_map.legend.title') }}
      </p>
      <button
        v-for="entry in legend"
        :key="entry.state"
        type="button"
        :aria-pressed="filter === entry.state"
        class="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
        :class="
          filter === entry.state
            ? 'border-navy-700 bg-navy-700 text-white'
            : 'border-border-primary bg-surface text-navy-700 hover:bg-gray-50'
        "
        @click="toggleFilter(entry.state)"
      >
        <MissionMapStateIcon :state="entry.state" size="sm" />
        {{ entry.label }}
        <span
          class="min-w-[1.25rem] rounded-full px-1.5 text-center text-xs font-bold"
          :class="filter === entry.state ? 'bg-white/20' : 'bg-navy-700/10'"
        >
          {{ entry.count }}
        </span>
      </button>
      <p class="basis-full text-xs text-navy-700/70">{{ t('common.mission_map.legend.hint') }}</p>
    </div>

    <!-- Móvil y pantallas estrechas: el detalle, en una hoja inferior, con el
         botón para entrar en su pie. Siempre montada: al pasar de ancho a
         estrecho con una misión elegida se abre como si se pulsara (con su
         foco y su bloqueo del scroll). -->
    <Modal
      :model-value="!wide && selectedItem !== null"
      :title="selectedItem?.title"
      sheet
      sticky-chrome
      fit-content
      @update:model-value="onSheet"
    >
      <MissionMapDetail
        v-if="selectedItem"
        :item="selectedItem"
        :mode="mode"
        hide-title
        hide-action
        @go="goTo"
      />
      <template v-if="selectedItem?.href && selectedItem.actionLabel" #footer>
        <MissionMapDetailAction :item="selectedItem" />
      </template>
    </Modal>
  </section>
</template>

<script setup lang="ts">
import {
  FlagIcon,
  RocketLaunchIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
} from '@heroicons/vue/24/solid'
import { CursorArrowRaysIcon, MapPinIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { MissionRarity } from '~/types/mission.types'
import {
  classMapProgress,
  currentNodeId,
  mapProgress,
  ringFraction,
  type MapNodeState,
  type MapPerson,
  type MissionMapItem,
} from '~/utils/mission-map'
import { layoutMissionMap, mapNeighbors, type MapMissionInput } from '~/utils/mission-map-layout'
import {
  MAP_GOAL,
  MAP_START,
  mapGeometry,
  mapIslands,
  mapSparkles,
  type MapIsland,
  type MapPoint,
} from '~/utils/mission-map-geometry'
import { resolveDateLocale } from '~/utils/notifications'
import { studentAvatarSeed } from '~/utils/avatar'

/**
 * El mapa de misiones de una clase, en pruebas: una vista más de la pestaña
 * Misiones, para los dos roles. Un tablero de noche (el azul del inicio de
 * sesión, con estrellas) y una carretera que va de la salida a la meta pasando
 * por cada misión; el tramo recorrido brilla. Con requisitos, por capas (lo que
 * no pide nada arriba; cada misión, debajo de lo que pide) y una carretera por
 * requisito; sin ellos, el orden de la clase serpenteando por filas. En el
 * móvil es una columna. La disposición está en utils/mission-map-layout.ts y
 * las posiciones, en utils/mission-map-geometry.ts: aquí solo se mide el ancho
 * y se pinta.
 *
 * El alumnado ve su estado en cada misión, cuánto lleva recorrido y dónde está
 * («Estás aquí», con su avatar); el profesorado, el de la clase y, en un anillo
 * alrededor de cada medallón, la parte del alumnado que la ha completado (en su
 * detalle, quiénes, con sus avatares, y cuántos la llevan en curso). Al
 * pasar por un medallón se resalta lo que está unido a él (lo que lo abre y lo
 * que abre); la leyenda resalta las de un estado. Al pulsarlo se abre su
 * detalle (MissionMapDetail): en un panel al lado si hay sitio y, si no, en una
 * hoja inferior (Modal con `sheet`). Esc cierra el detalle y el foco vuelve al
 * medallón. El mapa es una sola parada del tabulador; las flechas, Inicio y
 * Fin pasan de un medallón a otro. Con «menos animación» (de la app o del
 * sistema), todo quieto: ni la carretera se dibuja ni nada flota ni late.
 */

interface MapMission extends MapMissionInput {
  rarity?: MissionRarity | string
  backgroundImage?: string | null
  xpReward?: number
  coinReward?: number
  manaReward?: number
  /** Profesorado: cuántos enigmas tiene. */
  enigmasCount?: number
  /** Profesorado: quién la ha completado (ids, primero quien antes). */
  completedStudentIds?: string[]
  /** Profesorado: cuánta gente la ha empezado sin completarla. */
  inProgressCount?: number
  /** Alumnado: cuántos enigmas lleva completados, de cuántos. */
  progressDetail?: { done: number; total: number }
}

const props = defineProps<{
  /** Las misiones de la clase, ya en su orden. */
  missions: MapMission[]
  mode: 'student' | 'teacher'
  classId: string
  /** Alumnado: su avatar, para «Estás aquí». */
  you?: { avatar?: string | null; seed: string; name?: string | null } | null
  /** Profesorado: el alumnado de la clase, para los avatares de quien ha completado cada una. */
  students?: { id: string; name: string; avatar?: string | null }[]
}>()

const { t, locale } = useI18n()
const { getImageUrl } = useImageUrl()
const teacherStatusLabel = useMissionStatusLabel()
const { missionList } = useMissionPathText()
const reducedMotion = useReducedMotion()
const titleId = useId()
const legendId = useId()
const panelTitleId = useId()
// Un id válido en `url(#…)`, sea cual sea el formato de `useId`.
const uid = `map-${useId()}`.replace(/[^\w-]/g, '-')

const RARITY_RING: Record<string, string> = {
  comun: 'ring-badge-comun',
  rara: 'ring-purple-light',
  epica: 'ring-purple',
  legendaria: 'ring-badge-legendaria',
}

/** El color de cada tono de isla (utils/mission-map-geometry.ts), sobre el azul de la noche. */
const ISLAND_COLORS: Record<MapIsland['tone'], string> = {
  purple: 'var(--color-purple-rgb)',
  navy: 'var(--color-navy-base-light-rgb)',
  mint: 'var(--color-mint-rgb)',
}

// ---- La disposición y lo que se cuenta ----
const layout = computed(() => layoutMissionMap(props.missions, props.mode))
const progress = computed(() => mapProgress(layout.value.nodes.map(node => node.state)))
const currentId = computed(() =>
  props.mode === 'student' ? currentNodeId(layout.value.nodes) : null
)
const classProgress = computed(() => classMapProgress(props.missions))
/** Alumnado: ha completado el mapa entero (la meta brilla). */
const finished = computed(
  () =>
    props.mode === 'student' &&
    progress.value.total > 0 &&
    progress.value.done === progress.value.total
)
const progressText = computed(() =>
  t(
    'common.mission_map.your_progress',
    { done: progress.value.done, total: progress.value.total },
    progress.value.total
  )
)

function studentStateText(state: MapNodeState, percent: number): string {
  switch (state) {
    case 'completed':
      return t('common.mission_map.state.completed')
    case 'in_progress':
      return t('common.mission_map.state.in_progress', { progress: percent })
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

/** El estado en pocas palabras (la leyenda y el detalle del alumnado). */
function studentStateLabel(state: MapNodeState): string {
  switch (state) {
    case 'completed':
      return t('common.mission_map.state_short.completed')
    case 'in_progress':
      return t('common.mission_map.state_short.in_progress')
    case 'urgent':
      return t('common.mission_map.state_short.urgent')
    case 'expired':
      return t('common.mission_map.state_short.expired')
    case 'locked':
      return t('common.mission_map.state_short.locked')
    default:
      return t('common.mission_map.state_short.available')
  }
}

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

const stateLabelOf = (state: MapNodeState) =>
  props.mode === 'teacher' ? teacherStatusLabel(teacherStatusOf(state)) : studentStateLabel(state)

/** El botón del alumnado: empezar, seguir o volver a verla. */
function studentAction(state: MapNodeState, percent: number): string | null {
  switch (state) {
    case 'locked':
      return null
    case 'completed':
    case 'expired':
      return t('common.mission_map.detail.view')
    case 'in_progress':
      return t('common.mission_map.detail.continue')
    default:
      return percent > 0
        ? t('common.mission_map.detail.continue')
        : t('common.mission_map.detail.start')
  }
}

/** Profesorado: cuántas personas la han completado, de cuántas. */
function completedBy(mission: MapMission): string {
  const total = mission.totalStudents ?? 0
  if (total === 0) return t('common.mission_map.no_students')
  const done = mission.completedCount ?? 0
  return t('common.mission_map.completed_by', { done, total }, done)
}

/** Profesorado: el alumnado de la clase, por id. */
const studentsById = computed(() => new Map((props.students ?? []).map(s => [s.id, s])))

/** Profesorado: quien ha completado una misión, con su avatar (en el orden que llega). */
function peopleOf(ids: string[]): MapPerson[] {
  return ids.flatMap(id => {
    const student = studentsById.value.get(id)
    if (!student) return []
    return [
      {
        id,
        name: student.name,
        avatar: student.avatar ?? null,
        seed: studentAvatarSeed(props.classId, id),
      },
    ]
  })
}

/** En el idioma de la app, no en el del navegador (ver resolveDateLocale). */
function formatDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null
  return new Date(deadline).toLocaleDateString(resolveDateLocale(locale.value), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const items = computed<MissionMapItem[]>(() => {
  const byId = new Map(props.missions.map(m => [m.id, m]))
  const titleOf = (id: string) => byId.get(id)?.title ?? ''
  const teacher = props.mode === 'teacher'
  // Lo que abre cada una, solo si el mapa tiene requisitos.
  const unlocks = new Map<string, string[]>()
  if (layout.value.branched) {
    for (const edge of layout.value.edges) {
      unlocks.set(edge.from, [...(unlocks.get(edge.from) ?? []), edge.to])
    }
  }
  return layout.value.nodes.map(node => {
    const mission = byId.get(node.id)!
    const locked = node.state === 'locked'
    const percent = node.state === 'completed' ? 100 : (mission.progress ?? 0)
    const pathLocked = node.lockReason === 'path'
    return {
      id: node.id,
      step: node.step,
      title: mission.title,
      rarity: (mission.rarity ?? 'comun') as MissionRarity,
      cover: getImageUrl(mission.backgroundImage) ?? null,
      state: node.state,
      stateLabel: stateLabelOf(node.state),
      // Cerrada por el camino: «Bloqueada» y lo que la abre.
      stateText: teacher
        ? teacherStatusLabel(teacherStatusOf(node.state))
        : pathLocked && node.opensAfter.length > 0
          ? t('common.mission_map.state.locked_path', { missions: missionList(node.opensAfter) })
          : studentStateText(node.state, percent),
      href: teacher
        ? `/profesor/clases/${props.classId}/misiones/${node.id}`
        : locked
          ? null
          : `/alumno/clases/${props.classId}/misiones/${node.id}`,
      actionLabel: teacher
        ? t('common.mission_map.detail.open')
        : studentAction(node.state, percent),
      lockedNote: !teacher && locked && !pathLocked ? t('student.missions.locked_toast') : null,
      requires: node.opensAfter,
      unlocks: (unlocks.get(node.id) ?? []).map(id => ({ id, title: titleOf(id) })),
      rewards: {
        xp: mission.xpReward ?? 0,
        coins: mission.coinReward ?? 0,
        mana: mission.manaReward ?? 0,
      },
      enigmas: teacher ? (mission.enigmasCount ?? 0) : (mission.progressDetail?.total ?? 0),
      progress:
        teacher || locked
          ? null
          : {
              percent,
              done: mission.progressDetail?.done ?? 0,
              total: mission.progressDetail?.total ?? 0,
            },
      completed: teacher
        ? {
            done: mission.completedCount ?? 0,
            total: mission.totalStudents ?? 0,
            text: completedBy(mission),
            people: peopleOf(mission.completedStudentIds ?? []),
            inProgress: mission.inProgressCount ?? 0,
          }
        : null,
      deadline: formatDeadline(mission.deadline),
    }
  })
})

const ringOf = (item: MissionMapItem) => ringFraction(item.completed?.done, item.completed?.total)

// ---- Medidas: solo el ancho; lo demás sale de utils/mission-map-geometry.ts ----
/** Desde este ancho (px) del mapa entero, el detalle va en un panel al lado. */
const WIDE_FROM = 860
const rootRef = ref<HTMLElement | null>(null)
const boardRef = ref<HTMLElement | null>(null)
const rootWidth = ref(0)
const boardWidth = ref(0)
const wide = computed(() => rootWidth.value >= WIDE_FROM)
const geo = computed(() => mapGeometry(layout.value, boardWidth.value || 320))
const board = computed(() => geo.value.shape === 'board')
const islands = computed(() => mapIslands(geo.value.width, geo.value.height))
const sparkles = computed(() => mapSparkles(geo.value.width, geo.value.height))

/** Dónde va cada misión: en el tablero, centrada en su sitio; en la columna, a lo ancho. */
function placeStyle(id: string) {
  const place = geo.value.places.get(id) ?? { x: 0, y: 0 }
  const top = place.y - geo.value.node / 2
  const delay = `${Math.max(0, (place.y / geo.value.height) * drawSeconds.value - 0.2)}s`
  if (board.value) {
    return {
      left: `${place.x - geo.value.label / 2}px`,
      top: `${top}px`,
      width: `${geo.value.label}px`,
      '--map-delay': delay,
    }
  }
  return {
    left: '0px',
    right: '12px',
    top: `${top}px`,
    height: `${geo.value.node}px`,
    '--map-delay': delay,
  }
}

/** En la columna, el medallón sobre la carretera y la etiqueta a la derecha. */
function columnButtonStyle(id: string) {
  const place = geo.value.places.get(id) ?? { x: 0, y: 0 }
  const left = place.x - geo.value.node / 2
  return { paddingLeft: `${left}px`, columnGap: `${geo.value.label - left - geo.value.node}px` }
}

/** La etiqueta de la salida y de la meta (dónde va, en cada una). */
const markerChip =
  'absolute whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-navy-700 shadow'

/** Una estrellita de cuatro puntas centrada en su sitio. */
function sparklePath(p: MapPoint & { size: number }) {
  const s = p.size
  const k = s * 0.28
  return `M ${p.x} ${p.y - s} Q ${p.x + k} ${p.y - k} ${p.x + s} ${p.y} Q ${p.x + k} ${p.y + k} ${p.x} ${p.y + s} Q ${p.x - k} ${p.y + k} ${p.x - s} ${p.y} Q ${p.x - k} ${p.y - k} ${p.x} ${p.y - s} Z`
}

function measure() {
  rootWidth.value = rootRef.value?.clientWidth ?? 0
  boardWidth.value = boardRef.value?.clientWidth ?? 0
}

const panelRef = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  startEntrance()
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(() => measure())
  if (rootRef.value) observer.observe(rootRef.value)
  if (boardRef.value) observer.observe(boardRef.value)
})
onBeforeUnmount(() => observer?.disconnect())

// ---- Resaltar: al pasar por un medallón, lo unido a él; con la leyenda, un estado ----
// Solo con el ratón y con el foco del teclado: un toque en el móvil no deja
// el mapa resaltado (ni al cerrar la hoja).
const hovered = ref<string | null>(null)
const focused = ref<string | null>(null)
const active = computed(() => hovered.value ?? focused.value)
const linked = computed(() => {
  const id = active.value
  if (!id) return null
  const { requires, unlocks } = mapNeighbors(layout.value, id)
  return new Set([id, ...requires, ...unlocks])
})
const filter = ref<MapNodeState | null>(null)
/** Se está resaltando algo: el velo atenúa lo demás. */
const highlighting = computed(() => active.value !== null || filter.value !== null)

/**
 * Lo que es cada misión al resaltar: la que se mira (`active`), lo que la
 * abre o lo que abre ella (`linked`) o una del estado de la leyenda
 * (`match`). Las demás, nada: se atenúan.
 */
function roleOf(item: MissionMapItem): '' | 'active' | 'linked' | 'match' {
  if (active.value) {
    if (active.value === item.id) return 'active'
    return linked.value?.has(item.id) ? 'linked' : ''
  }
  return filter.value !== null && item.state === filter.value ? 'match' : ''
}
function lifted(item: MissionMapItem) {
  const role = roleOf(item)
  return role === 'active' || role === 'match'
}

function onPointerEnter(event: PointerEvent, id: string) {
  if (event.pointerType === 'mouse') hovered.value = id
}
function onPointerLeave(event: PointerEvent) {
  if (event.pointerType === 'mouse') hovered.value = null
}

/**
 * Se encienden los tramos que entran y salen de la que se mira. En la columna
 * del móvil la carretera va de una a la siguiente: solo se enciende el tramo
 * que es también un requisito (o la salida y la meta).
 */
const litRoads = computed(() => {
  const id = active.value
  if (id === null) return null
  const edges = new Set(layout.value.edges.map(edge => edge.key))
  return new Set(
    geo.value.roads
      .filter(
        road =>
          (road.from === id || road.to === id) &&
          (board.value || edges.has(road.key) || road.from === MAP_START || road.to === MAP_GOAL)
      )
      .map(road => road.key)
  )
})

const LEGEND_ORDER: Record<'student' | 'teacher', MapNodeState[]> = {
  student: ['completed', 'in_progress', 'available', 'urgent', 'expired', 'locked'],
  teacher: ['available', 'urgent', 'completed', 'expired', 'locked'],
}
const legend = computed(() =>
  LEGEND_ORDER[props.mode]
    .map(state => ({
      state,
      label: stateLabelOf(state),
      count: items.value.filter(item => item.state === state).length,
    }))
    .filter(entry => entry.count > 0)
)
function toggleFilter(state: MapNodeState) {
  filter.value = filter.value === state ? null : state
}
// Si con datos nuevos ya no queda ninguna de ese estado, la leyenda se suelta:
// su botón desaparece y el mapa se quedaría atenuado sin forma de quitarlo.
watch(legend, entries => {
  if (filter.value && !entries.some(entry => entry.state === filter.value)) filter.value = null
})

// ---- El detalle ----
const selected = ref<string | null>(null)
/** La ha elegido quien mira (no es la que se enseña de entrada en pantallas anchas). */
const picked = ref(false)
const selectedItem = computed(() => items.value.find(item => item.id === selected.value) ?? null)

// ---- El tabulador: una sola parada en el mapa ----
/** La última misión que ha tenido el foco (con el teclado o al pulsarla). */
const rover = ref<string | null>(null)
/**
 * La que recibe el foco al entrar con el tabulador: la última que lo tuvo; si
 * no, la elegida; si no, la actual; si no, la primera.
 */
const tabStop = computed(() => {
  const ids = new Set(items.value.map(item => item.id))
  const known = [rover.value, selected.value, currentId.value].find(id => id && ids.has(id))
  return known ?? items.value[0]?.id ?? null
})
const keysId = useId()

function onNodeFocus(event: FocusEvent, id: string) {
  rover.value = id
  // Solo el foco que se ve (el del teclado) resalta lo unido a ella.
  focused.value = (event.target as HTMLElement).matches(':focus-visible') ? id : null
}
function onNodeBlur() {
  focused.value = null
}

function nodeButton(id: string) {
  return rootRef.value?.querySelector<HTMLElement>(`[data-map-node-button="${CSS.escape(id)}"]`)
}

/** Lleva el foco a un medallón; con `scroll`, también la vista hasta él, centrado. */
function focusNode(id: string, scroll = false) {
  const button = nodeButton(id)
  if (!button) return
  if (!scroll) {
    button.focus()
    return
  }
  button.scrollIntoView({ block: 'center', behavior: reducedMotion.value ? 'auto' : 'smooth' })
  button.focus({ preventScroll: true })
}

/**
 * El foco al título del panel de al lado (y se lee). Si el panel no está a la
 * vista (p. ej. si la misión está muy abajo), antes se lleva hasta él.
 */
function focusPanelTitle() {
  const title = document.getElementById(panelTitleId)
  if (!title) return
  const { top, bottom } = title.getBoundingClientRect()
  if (top < 0 || bottom > window.innerHeight) {
    panelRef.value?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion.value ? 'auto' : 'smooth',
    })
  }
  title.focus({ preventScroll: true })
}

/** Abre el detalle. En el panel de al lado, el foco va a su título. */
async function openDetail(id: string) {
  selected.value = id
  picked.value = true
  if (!wide.value) return
  await nextTick()
  focusPanelTitle()
}

/** Cierra el panel y el foco vuelve al medallón. La hoja inferior, en `onSheet`. */
function closeDetail() {
  const id = selected.value
  if (!id || !wide.value) return
  selected.value = null
  picked.value = true
  focusNode(id)
}

/**
 * La hoja inferior se ha cerrado (X, Esc o fuera): el foco vuelve al
 * medallón, después de que la ventana devuelva el suyo (que, si se abrió al
 * estrechar la pantalla, era el título del panel, que ya no está).
 */
async function onSheet(open: boolean) {
  if (open) return
  const id = selected.value
  selected.value = null
  await nextTick()
  if (id) focusNode(id)
}

/**
 * De «Para abrirla, completa antes…» o «Al completarla, abre…» a esa misión:
 * en el panel de al lado se abre también su detalle; en el móvil, primero se
 * cierra la hoja.
 */
async function goTo(id: string) {
  if (wide.value) {
    selected.value = id
    picked.value = true
    focusNode(id, true)
    return
  }
  if (selected.value) {
    selected.value = null
    await nextTick()
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  focusNode(id, true)
}

function goToCurrent() {
  if (currentId.value) focusNode(currentId.value, true)
}

/** Las flechas, Inicio y Fin pasan de un medallón a otro del recorrido. */
function onNodeKeydown(event: KeyboardEvent, index: number) {
  const last = items.value.length - 1
  const target: Record<string, number> = {
    ArrowRight: Math.min(last, index + 1),
    ArrowDown: Math.min(last, index + 1),
    ArrowLeft: Math.max(0, index - 1),
    ArrowUp: Math.max(0, index - 1),
    Home: 0,
    End: last,
  }
  const next = target[event.key]
  if (next === undefined || event.altKey || event.ctrlKey || event.metaKey) return
  event.preventDefault()
  focusNode(items.value[next]!.id)
}

// En pantallas anchas, el alumnado ve de entrada el detalle de su misión
// (mientras no elija otra). Al estrechar la pantalla esa no se abre en la
// hoja inferior: solo lo que ha elegido.
watch(
  [wide, currentId],
  ([isWide, id]) => {
    if (picked.value) return
    selected.value = isWide ? id : null
  },
  { immediate: true }
)

// De estrecho a ancho con la hoja abierta: el detalle pasa al panel y el foco,
// a su título (cuando la hoja ya ha devuelto el suyo).
const sheetOpen = computed(() => !wide.value && selectedItem.value !== null)
watch(sheetOpen, async (open, wasOpen) => {
  if (open || !wasOpen || !wide.value || !selected.value) return
  await nextTick()
  focusPanelTitle()
})

// Si cambian las misiones y la elegida ya no está, se cierra.
watch(items, list => {
  if (selected.value && !list.some(item => item.id === selected.value)) selected.value = null
})

// ---- La entrada: la carretera se dibuja y los medallones aparecen en cascada ----
const entering = ref(false)
const floating = computed(() => !reducedMotion.value)
/** Mapa completado y con animaciones: la meta late. */
const pulsing = computed(() => finished.value && !reducedMotion.value)
const drawSeconds = computed(() => Math.min(2.2, 0.8 + items.value.length * 0.08))
function startEntrance() {
  if (reducedMotion.value) return
  entering.value = true
  window.setTimeout(() => (entering.value = false), (drawSeconds.value + 1) * 1000)
}
</script>

<style scoped>
/* Solo con animaciones: la app pone `data-reduce-motion` y el sistema
   `prefers-reduced-motion`; con cualquiera de los dos, todo quieto. */
@media (prefers-reduced-motion: no-preference) {
  .map-enter .map-pop {
    animation: map-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    animation-delay: var(--map-delay, 0s);
  }

  .map-float {
    animation: map-float 2.6s ease-in-out infinite;
  }

  /* La meta del mapa completado: el halo late y un aro se abre hacia fuera. */
  .map-goal-glow {
    animation: map-goal-glow 2.4s ease-in-out infinite;
  }

  .map-goal-ring {
    animation: map-goal-ring 2.4s ease-out infinite;
  }
}

@keyframes map-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes map-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes map-goal-glow {
  0%,
  100% {
    opacity: 0.65;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes map-goal-ring {
  from {
    opacity: 0.9;
    transform: scale(0.7);
  }
  to {
    opacity: 0;
    transform: scale(1.5);
  }
}
</style>
