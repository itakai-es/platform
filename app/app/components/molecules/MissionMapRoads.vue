<template>
  <!-- La carretera del mapa de misiones (solo dibujo). No cambia al
       resaltar: así no se vuelve a pintar entera al pasar el ratón. -->
  <svg
    class="map-roads pointer-events-none absolute inset-0 h-full w-full"
    aria-hidden="true"
    focusable="false"
  >
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <MissionMapRoadPasses :roads="roads" :stroke="stroke" />
    </g>
  </svg>
  <!-- Los tramos encendidos (los de la misión que se mira), otra vez y por
       encima del velo que atenúa lo demás (MissionMap.vue). Siempre montado,
       aunque esté vacío: meter o quitar un `svg` en el tablero obliga a
       recalcular el tablero entero; cambiar sus tramos, no. -->
  <svg
    class="pointer-events-none absolute inset-0 z-20 h-full w-full"
    aria-hidden="true"
    focusable="false"
  >
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <MissionMapRoadPasses :roads="litRoads" :stroke="stroke" lit />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { MapRoad } from '~/utils/mission-map-geometry'

/**
 * La carretera del mapa de misiones (MissionMap.vue): la de siempre, que no
 * cambia al resaltar, y encima, solo cuando se mira una misión, sus tramos
 * encendidos. Así, al pasar el ratón solo se pintan esos pocos tramos.
 */
const props = defineProps<{
  /** Los tramos, con su trazo (utils/mission-map-geometry.ts). */
  roads: MapRoad[]
  /** Tablero (más ancha) o columna del móvil. */
  board: boolean
  /** Los tramos encendidos (los de la misión que se mira); null si ninguno. */
  lit: Set<string> | null
}>()

const litRoads = computed(() => (props.lit ? props.roads.filter(r => props.lit!.has(r.key)) : []))

/** Grosor de la carretera: borde, firme y raya del centro. */
const stroke = computed(() =>
  props.board
    ? { border: 34, road: 26, dash: 3, dashes: '12 14' }
    : { border: 24, road: 18, dash: 2.5, dashes: '9 11' }
)
</script>

<style scoped>
/* La entrada: la carretera se dibuja de arriba abajo (solo con animaciones). */
@media (prefers-reduced-motion: no-preference) {
  .map-enter .map-roads {
    animation: map-reveal var(--map-draw) ease-out backwards;
  }
}

@keyframes map-reveal {
  from {
    clip-path: inset(0 0 100% 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
</style>
