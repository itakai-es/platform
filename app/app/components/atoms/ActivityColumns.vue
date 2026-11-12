<template>
  <!-- Con muchas semanas (todo el curso) las columnas no caben a 375 px: se
       desplazan dentro de su caja, que arranca en la más reciente, y la página
       no se mueve. `relative`: los textos `sr-only` (posición absoluta) se
       quedan dentro de la caja en vez de ensanchar la página. -->
  <div
    ref="scroller"
    class="relative overflow-x-auto pb-1"
    :tabindex="decorative ? -1 : 0"
    :role="decorative ? undefined : 'group'"
    :aria-label="decorative ? undefined : label"
  >
    <ol class="flex min-w-full items-stretch" :class="dense ? 'gap-1' : 'gap-1.5 sm:gap-2'">
      <li
        v-for="column in columns"
        :key="column.point.key"
        class="flex flex-1 flex-col items-center gap-1"
        :class="dense ? 'min-w-0' : 'min-w-[2.25rem]'"
      >
        <span class="sr-only">{{ column.spoken }}</span>
        <!-- La cifra, escrita encima de su columna; la columna crece desde la
             línea de base. -->
        <span
          class="flex w-full flex-col items-center justify-end border-b border-navy-700/20"
          :class="stacked ? 'h-40' : 'h-32'"
          aria-hidden="true"
        >
          <span class="text-xs font-semibold leading-5 tabular-nums text-navy-700">{{
            column.display
          }}</span>
          <!-- Apiladas: cada tipo con su relleno, de abajo arriba, separados por
               2 px del fondo. -->
          <span
            v-if="column.parts"
            class="flex w-full flex-col-reverse overflow-hidden rounded-t-lg"
            :class="[dense ? 'max-w-[2.5rem]' : 'max-w-[3rem]', grows ? 'chart-grow-y' : '']"
            :style="{ height: `max(0px, calc((100% - 1.25rem) * ${column.height / 100}))` }"
          >
            <span
              v-for="part in column.parts"
              :key="part.series"
              class="block w-full flex-shrink-0 border-b-2 border-surface first:border-b-0"
              :style="{ height: `${part.height}%` }"
            >
              <ChartFill :series="part.series" />
            </span>
          </span>
          <span
            v-else
            class="block w-full max-w-[2.5rem] rounded-t-md bg-navy-700"
            :class="grows ? 'chart-grow-y' : ''"
            :style="{ height: `max(0px, calc((100% - 1.25rem) * ${column.height / 100}))` }"
          />
        </span>
        <span
          class="text-center text-xs leading-tight text-navy-700/80 [overflow-wrap:anywhere]"
          aria-hidden="true"
          >{{ column.point.label }}</span
        >
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import type { ActivitySeries } from '~/utils/chart-status'
import { columnHeights, stackedColumns } from '~/utils/chart-scale'
import { useNumberFormat } from '~/composables/useNumberFormat'
import { useChartDecorative } from '~/composables/useChartView'

/**
 * Columnas por semana (o por el tramo que se quiera): la actividad de una
 * clase o de una persona, o las series de la administración. La cifra va
 * **escrita encima de cada columna** y en texto para el lector de pantalla,
 * nunca solo en un tooltip de ratón; el color es de token.
 *
 * - `points`: cada columna, con `label` corto debajo («14 oct») y, si hace
 *   falta, `title` largo para el lector y la tabla («Semana del 14 de
 *   octubre»). `display` es la cifra ya escrita; por defecto, `value` en el
 *   idioma de la app.
 * - `parts`: si cada columna los trae, va **apilada por tipo** (entregas,
 *   aprobaciones y pistas), cada uno con su relleno y su trama (`ChartFill`); la
 *   leyenda (`ChartLegend` con `series`) va debajo. La cifra de encima es el
 *   total, y el lector oye también la de cada tipo.
 * - `max`: dónde acaba la escala; por defecto, la columna más alta llega arriba.
 * - `label`: el nombre del gráfico cuando se usa suelto (fuera de un
 *   `ChartFigure`), para la caja con desplazamiento.
 * - `dense`: para que quepan todas en un hueco estrecho, sin desplazarse (las ocho
 *   fechas de una semana en un tercio de tarjeta): «29 oct» se parte en dos líneas.
 *
 * Una semana a 0 se ve como 0 escrito sobre la línea de base. Al aparecer, las
 * columnas crecen desde abajo, salvo con «Reducir movimiento».
 *
 * @example
 * <ActivityColumns :points="weeks.map(w => ({ key: w.start, label: shortDate(w.start),
 *   title: t('…week_of', { date: longDate(w.start) }), value: w.submissions }))" />
 */
export interface ActivityPart {
  series: ActivitySeries
  value: number
  /** Su nombre, para el lector de pantalla («Entregas»). */
  label: string
}

export interface ActivityPoint {
  key: string
  label: string
  title?: string
  value: number
  display?: string
  parts?: ActivityPart[]
}

const props = defineProps<{
  points: ActivityPoint[]
  max?: number
  label?: string
  dense?: boolean
}>()

const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const decorative = useChartDecorative()
const reducedMotion = useReducedMotion()
const grows = computed(() => !reducedMotion.value)

const stacked = computed(() => props.points.some(point => point.parts?.length))

const columns = computed(() => {
  const heights = columnHeights(
    props.points.map(point => point.value),
    props.max
  )
  const stacks = stacked.value
    ? stackedColumns(
        props.points.map(point => (point.parts ?? []).map(part => part.value)),
        props.max
      )
    : []
  return props.points.map((point, index) => {
    const title = point.title ?? point.label
    const display = point.display ?? formatNumber(point.value)
    const detail = (point.parts ?? [])
      .map(part => t('common.charts.label_value', { label: part.label, value: formatNumber(part.value) }))
      .join(', ')
    return {
      point,
      display,
      height: heights[index] ?? 0,
      spoken: t('common.charts.label_value', {
        label: title,
        value: detail ? `${display} (${detail})` : display,
      }),
      parts: stacked.value
        ? (point.parts ?? [])
            .map((part, p) => ({ series: part.series, height: stacks[index]?.parts[p] ?? 0 }))
            .filter(part => part.height > 0)
        : null,
    }
  })
})

// Lo más reciente va a la derecha: al llegar (y si cambian los datos) se
// enseña el final, que es lo que se viene a mirar.
const scroller = ref<HTMLElement | null>(null)
function showLatest() {
  const el = scroller.value
  if (el) el.scrollLeft = el.scrollWidth
}
onMounted(showLatest)
watch(
  () => props.points.length,
  () => nextTick(showLatest)
)
</script>
