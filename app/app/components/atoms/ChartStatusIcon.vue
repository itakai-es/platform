<template>
  <!-- Solo dibujo: el estado va siempre también en texto (a la vista o para el
       lector de pantalla). -->
  <component
    :is="ICONS[kind]"
    class="h-4 w-4 flex-shrink-0"
    :class="COLORS[kind]"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  CheckBadgeIcon,
  CheckCircleIcon,
  InboxArrowDownIcon,
  LightBulbIcon,
  LockClosedIcon,
  MinusCircleIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  PlayCircleIcon,
} from '@heroicons/vue/24/solid'
import type { ActivitySeries, ChartStatus } from '~/utils/chart-status'

/**
 * El icono de un estado en los gráficos de analítica. Cada uno se entiende sin
 * el color, con los iconos que ya usa la app para lo mismo: el check y el
 * «play» de completada y en curso, como en el mapa de misiones; la bandeja de
 * entrada de «por revisar», como el aviso de entrega recibida; un círculo con
 * un guion para «sin empezar»; y la señal de prohibido y el candado de
 * «caducada» y «cerrada por el camino», también como en el mapa.
 *
 * El ámbar de «por revisar» es el tono de los avisos de la asistencia
 * (`attendance-status.ts`); lo demás, azul marino. Nunca rojo ni verde.
 *
 * Con `series`, el de un tipo de actividad de las columnas de cada semana: el
 * avión de papel de las entregas, la insignia con el check de las aprobaciones y
 * la bombilla de las pistas (la de las señales de pistas).
 */
const props = defineProps<{ status?: ChartStatus; series?: ActivitySeries }>()

type IconKey = ChartStatus | ActivitySeries

const kind = computed<IconKey>(() => props.series ?? props.status ?? 'not_started')

const ICONS: Record<IconKey, Component> = {
  completed: CheckCircleIcon,
  pending_review: InboxArrowDownIcon,
  in_progress: PlayCircleIcon,
  not_started: MinusCircleIcon,
  expired: NoSymbolIcon,
  path_locked: LockClosedIcon,
  submissions: PaperAirplaneIcon,
  approvals: CheckBadgeIcon,
  hints: LightBulbIcon,
}

const COLORS: Record<IconKey, string> = {
  completed: 'text-navy-700',
  pending_review: 'text-amber-600',
  in_progress: 'text-navy-700',
  not_started: 'text-navy-700/60',
  expired: 'text-navy-700',
  path_locked: 'text-navy-700/60',
  submissions: 'text-navy-700',
  approvals: 'text-navy-700',
  hints: 'text-navy-700',
}
</script>
