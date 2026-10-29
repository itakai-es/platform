<template>
  <!-- Solo dibujo: el estado va siempre también en texto al lado (o en el
       nombre del botón del medallón). -->
  <span
    class="inline-flex flex-shrink-0 items-center justify-center rounded-full"
    :class="[STATE_STYLE[state], size === 'sm' ? 'h-6 w-6' : 'h-8 w-8']"
    aria-hidden="true"
  >
    <component
      :is="STATE_ICON[state]"
      :class="size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'"
    />
  </span>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  CheckIcon,
  ClockIcon,
  LockClosedIcon,
  LockOpenIcon,
  NoSymbolIcon,
  PlayIcon,
} from '@heroicons/vue/24/solid'
import type { MapNodeState } from '~/utils/mission-map'

/**
 * El icono del estado de una misión en el mapa, en su círculo de color: en la
 * esquina del medallón, en la leyenda y en el detalle. Cada estado tiene un
 * icono propio que se entiende sin el color: completada (check), en curso
 * (play), disponible (candado abierto), urgente (reloj), expirada (prohibido)
 * y cerrada (candado).
 */
withDefaults(defineProps<{ state: MapNodeState; size?: 'sm' | 'md' }>(), { size: 'md' })

const STATE_ICON: Record<MapNodeState, Component> = {
  completed: CheckIcon,
  in_progress: PlayIcon,
  available: LockOpenIcon,
  urgent: ClockIcon,
  expired: NoSymbolIcon,
  locked: LockClosedIcon,
}

// Los colores de la app para cada estado (los de las insignias de estado).
const STATE_STYLE: Record<MapNodeState, string> = {
  completed: 'bg-green text-navy-700',
  in_progress: 'bg-navy-700 text-white',
  available: 'bg-mint text-navy-700',
  urgent: 'bg-badge-urgente text-white',
  expired: 'bg-gray-500 text-white',
  locked: 'bg-badge-bloqueada text-navy-700',
}
</script>
