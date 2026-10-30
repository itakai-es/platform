<template>
  <!-- La carretera del mapa de misiones (solo dibujo). No cambia al
       resaltar: así no se vuelve a pintar entera al pasar el ratón. -->
  <svg
    class="map-roads pointer-events-none absolute inset-0 h-full w-full"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Primero los senderos (las ramas que acaban antes y van a la meta),
         estrechos y apagados, para que el camino principal pase por encima y
         destaque. Los de una rama hecha se apagan menos: se ven iluminados. -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" class="opacity-50">
      <MissionMapRoadPasses :roads="trails.pending" :stroke="stroke.trail" />
    </g>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" class="opacity-90">
      <MissionMapRoadPasses :roads="trails.done" :stroke="stroke.trail" />
    </g>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <MissionMapRoadPasses :roads="main" :stroke="stroke.road" />
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
      <MissionMapRoadPasses :roads="litTrails" :stroke="stroke.trail" lit />
      <MissionMapRoadPasses :roads="litMain" :stroke="stroke.road" lit />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { MapRoad } from '~/utils/mission-map-geometry'

/**
 * La carretera del mapa de misiones (MissionMap.vue): la de siempre, que no
 * cambia al resaltar, y encima, solo cuando se mira una misión, sus tramos
 * encendidos. Así, al pasar el ratón solo se pintan esos pocos tramos.
 *
 * Los senderos (`trail`, utils/mission-map-geometry.ts) son más estrechos, con
 * una línea de puntos en vez de la raya del centro, y van por debajo del camino
 * principal y más apagados.
 */
const props = defineProps<{
  /** Los tramos, con su trazo (utils/mission-map-geometry.ts). */
  roads: MapRoad[]
  /** Tablero (más ancha) o columna del móvil. */
  board: boolean
  /** Los tramos encendidos (los de la misión que se mira); null si ninguno. */
  lit: Set<string> | null
}>()

const main = computed(() => props.roads.filter(road => !road.trail))
const trails = computed(() => {
  const all = props.roads.filter(road => road.trail)
  return { pending: all.filter(road => !road.done), done: all.filter(road => road.done) }
})
const litRoads = computed(() => (props.lit ? props.roads.filter(r => props.lit!.has(r.key)) : []))
const litMain = computed(() => litRoads.value.filter(road => !road.trail))
const litTrails = computed(() => litRoads.value.filter(road => road.trail))

/** Grosor de la carretera y del sendero: borde, firme y raya (o puntos) del centro. */
const stroke = computed(() =>
  props.board
    ? {
        road: { border: 34, road: 26, dash: 3, dashes: '12 14' },
        trail: { border: 16, road: 10, dash: 2.5, dashes: '0 8' },
      }
    : {
        road: { border: 24, road: 18, dash: 2.5, dashes: '9 11' },
        trail: { border: 12, road: 7, dash: 2, dashes: '0 7' },
      }
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
