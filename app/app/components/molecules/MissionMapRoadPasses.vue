<template>
  <!-- Por pasadas: todos los bordes, luego todo el firme y al final la raya
       del centro, para que las ramas se fundan en los cruces. -->
  <path
    v-for="road in roads"
    :key="`b-${road.key}`"
    :d="road.d"
    :stroke-width="lit ? stroke.border + 6 : stroke.border"
    :class="lit ? 'stroke-purple' : 'stroke-white/15'"
  />
  <path
    v-for="road in roads"
    :key="`r-${road.key}`"
    :d="road.d"
    :stroke-width="stroke.road"
    :class="road.done ? 'map-glow stroke-green' : 'stroke-navy-base-light'"
  />
  <path
    v-for="road in roads"
    :key="`d-${road.key}`"
    :d="road.d"
    :stroke-width="stroke.dash"
    :stroke-dasharray="stroke.dashes"
    :class="road.done ? 'stroke-navy-base/50' : 'stroke-white/40'"
  />
</template>

<script setup lang="ts">
import type { MapRoad } from '~/utils/mission-map-geometry'

/**
 * Los tramos de la carretera del mapa de misiones, dentro de un `<g>` de
 * MissionMapRoads: la de siempre y, encima, los encendidos (`lit`, con el
 * borde morado y más ancho).
 */
defineProps<{
  roads: MapRoad[]
  /** Grosor de cada pasada y la raya del centro. */
  stroke: { border: number; road: number; dash: number; dashes: string }
  lit?: boolean
}>()
</script>

<style scoped>
/* El tramo recorrido brilla. */
.map-glow {
  filter: drop-shadow(0 0 6px rgb(var(--color-green-rgb) / 0.7));
}
</style>
