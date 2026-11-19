<template>
  <!-- Solo dibujo: el estado va siempre también con su icono, su cifra y su
       texto. Sin viewBox, las unidades son píxeles: la trama no se deforma al
       estirar el segmento. -->
  <svg class="block h-full w-full" aria-hidden="true" focusable="false">
    <defs v-if="texture">
      <pattern
        :id="patternId"
        patternUnits="userSpaceOnUse"
        width="6"
        height="6"
        :patternTransform="texture.transform"
      >
        <rect width="6" height="6" :class="texture.base" />
        <circle v-if="texture.mark === 'dots'" cx="3" cy="3" r="1.3" :class="texture.stripe" />
        <template v-else-if="texture.mark === 'grid'">
          <rect width="1.25" height="6" :class="texture.stripe" />
          <rect width="6" height="1.25" :class="texture.stripe" />
        </template>
        <rect v-else width="2.5" height="6" :class="texture.stripe" />
      </pattern>
    </defs>
    <rect
      width="100%"
      height="100%"
      :class="texture ? undefined : SOLID[kind]"
      :fill="texture ? `url(#${patternId})` : undefined"
    />
  </svg>
</template>

<script setup lang="ts">
import type { ActivitySeries, ChartStatus } from '~/utils/chart-status'

/**
 * El relleno de un estado (o de un tipo de actividad) en los gráficos de
 * analítica: color de token y, en los que lo llevan, una trama. Lo usan la barra
 * apilada (`StackedBar`), las columnas apiladas (`ActivityColumns`) y la leyenda
 * (`ChartLegend`), para que la muestra de la leyenda sea idéntica al segmento.
 *
 * Todo va con clases de token (`fill-*`), nunca con colores escritos: así lo
 * cambian sin código las paletas de daltonismo, el alto contraste y el tema
 * `university`, que redefinen las variables CSS de esos tokens.
 *
 * Estados de una misión (`status`):
 * - completada: azul marino macizo;
 * - en curso: rayas azul marino a 45° sobre blanco;
 * - por revisar: ámbar con rayas blancas a −45° (la otra diagonal);
 * - sin empezar: el color de la pista de las barras de progreso;
 * - caducada: cuadrícula azul marino sobre blanco, en rombos;
 * - cerrada por el camino: puntos azul marino sobre el color de la pista.
 *
 * En escala de grises o con mala visión del color siguen siendo seis cosas
 * distintas: oscuro liso, rayado claro, rayado medio, claro liso, rombos y
 * puntos. Ninguna va en rojo ni en verde.
 *
 * Actividad de una semana (`series`): entregas, azul marino macizo; aprobaciones,
 * morado con rayas blancas; pistas, ámbar con puntos azul marino. Oscuro liso,
 * medio rayado y claro punteado, también en gris.
 */
const props = defineProps<{ status?: ChartStatus; series?: ActivitySeries }>()

type FillKey = ChartStatus | ActivitySeries

const patternId = useId()

const kind = computed<FillKey>(() => props.series ?? props.status ?? 'not_started')

// Las clases van enteras y no compuestas: Tailwind solo genera las que lee.
const SOLID: Record<FillKey, string> = {
  completed: 'fill-navy-700',
  pending_review: 'fill-amber-500',
  in_progress: 'fill-surface',
  not_started: 'fill-progress-track',
  expired: 'fill-surface',
  path_locked: 'fill-progress-track',
  submissions: 'fill-navy-700',
  approvals: 'fill-purple',
  hints: 'fill-amber-500',
}

/** Sin `mark`, rayas; `grid` es una cuadrícula y `dots`, puntos. */
const TEXTURES: Partial<
  Record<FillKey, { base: string; stripe: string; transform?: string; mark?: 'grid' | 'dots' }>
> = {
  in_progress: { base: 'fill-surface', stripe: 'fill-navy-700', transform: 'rotate(45)' },
  pending_review: { base: 'fill-amber-500', stripe: 'fill-surface', transform: 'rotate(-45)' },
  expired: { base: 'fill-surface', stripe: 'fill-navy-700', transform: 'rotate(45)', mark: 'grid' },
  path_locked: { base: 'fill-progress-track', stripe: 'fill-navy-700', mark: 'dots' },
  approvals: { base: 'fill-purple', stripe: 'fill-surface', transform: 'rotate(45)' },
  hints: { base: 'fill-amber-500', stripe: 'fill-navy-700', mark: 'dots' },
}

const texture = computed(() => TEXTURES[kind.value])
</script>
