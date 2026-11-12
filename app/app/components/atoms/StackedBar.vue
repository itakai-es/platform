<template>
  <div class="min-w-0 space-y-1.5">
    <p
      v-if="label || $slots.label"
      class="min-w-0 text-sm font-semibold text-navy-700 [overflow-wrap:anywhere]"
    >
      <slot name="label">
        <NuxtLink
          v-if="to"
          :to="to"
          :tabindex="decorative ? -1 : undefined"
          class="underline decoration-navy-700/30 underline-offset-2 hover:decoration-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
          >{{ label }}</NuxtLink
        >
        <template v-else>{{ label }}</template>
      </slot>
      <span v-if="note" class="ml-2 text-xs font-normal text-navy-700/80">{{ note }}</span>
    </p>

    <div v-if="statuses.length" class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <!-- La barra es solo dibujo: lo que dice va en las cifras de al lado. Los
           segmentos se separan con 2 px del fondo blanco; al aparecer, crece
           desde la izquierda (sin animación si se pide menos movimiento). -->
      <div
        class="flex h-6 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-progress-track shadow-inner"
        aria-hidden="true"
      >
        <span
          class="flex h-full w-full"
          :class="grows ? 'chart-grow-x' : ''"
        >
          <span
            v-for="segment in segments"
            :key="segment.status"
            class="h-full flex-shrink-0 border-r-2 border-surface last:border-r-0"
            :style="{ width: `${segment.width}%` }"
          >
            <ChartFill :status="segment.status" />
          </span>
        </span>
      </div>

      <!-- Cada estado con su icono y su cifra, siempre escrita (también el 0) -->
      <ul class="flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold tabular-nums text-navy-700">
        <li v-for="item in items" :key="item.status" class="inline-flex items-center gap-1">
          <ChartStatusIcon :status="item.status" />
          <span aria-hidden="true">{{ item.value }}</span>
          <span class="sr-only">{{
            t('common.charts.label_value', {
              label: t(`common.charts.status.${item.status}`),
              value: item.value,
            })
          }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { presentStatuses, type ChartStatusCounts } from '~/utils/chart-status'
import { segmentWidths } from '~/utils/chart-scale'
import { useNumberFormat } from '~/composables/useNumberFormat'
import { useChartDecorative } from '~/composables/useChartView'

/**
 * Barra apilada de estados de una misión (completada, por revisar, en curso,
 * sin empezar): por ejemplo, cuántas personas de la clase están en cada uno.
 *
 * Cada estado se reconoce sin el color: relleno con trama (`ChartFill`), icono
 * (`ChartStatusIcon`), su cifra escrita al lado y su nombre para el lector de
 * pantalla; la leyenda (`ChartLegend`) va una vez debajo de todas las barras.
 *
 * Solo salen los estados que trae `counts`, en el orden de siempre; uno a 0 se
 * escribe pero no ocupa barra. Un segmento pequeño con valor nunca se pierde
 * (ver `segmentWidths`). Si todo vale 0, queda la pista vacía.
 *
 * La barra es gruesa y redondeada, y crece al aparecer salvo con «Reducir
 * movimiento».
 *
 * La etiqueta puede ser un enlace (`to`), por ejemplo a la misión. Dentro de un
 * `ChartFigure` el enlace no recibe el foco: con el teclado se llega desde la
 * tabla. `note` es un dato corto al lado («Vence el 8 nov.»). Sin ningún estado
 * en `counts`, solo salen la etiqueta y la nota: es una misión que no cuenta.
 *
 * @example
 * <StackedBar
 *   :label="mission.title"
 *   :to="`/profesor/clases/${classId}/misiones/${mission.id}`"
 *   :counts="{ completed: 5, pending_review: 1, in_progress: 1, not_started: 2 }"
 * />
 */
const props = defineProps<{
  counts: ChartStatusCounts
  label?: string
  to?: string
  note?: string
}>()

const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const decorative = useChartDecorative()
const reducedMotion = useReducedMotion()
const grows = computed(() => !reducedMotion.value)

const statuses = computed(() => presentStatuses(props.counts))

const segments = computed(() => {
  const widths = segmentWidths(statuses.value.map(status => props.counts[status] ?? 0))
  return statuses.value
    .map((status, index) => ({ status, width: widths[index] ?? 0 }))
    .filter(segment => segment.width > 0)
})

const items = computed(() =>
  statuses.value.map(status => ({
    status,
    value: formatNumber(props.counts[status] ?? 0),
  }))
)
</script>
