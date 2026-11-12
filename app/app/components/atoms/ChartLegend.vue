<template>
  <ul
    class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-navy-700"
    :aria-label="t('common.charts.legend')"
  >
    <li v-for="item in entries" :key="item.key" class="inline-flex items-center gap-1.5">
      <!-- La muestra es el mismo relleno que el segmento; el borde la separa
           del fondo cuando el color es claro (sin empezar). -->
      <span class="h-3.5 w-6 flex-shrink-0 overflow-hidden rounded-full border border-navy-700/20">
        <ChartFill :status="item.status" :series="item.series" />
      </span>
      <ChartStatusIcon :status="item.status" :series="item.series" />
      <span>{{ item.label }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { CHART_STATUSES, type ActivitySeries, type ChartStatus } from '~/utils/chart-status'

/**
 * La leyenda común de los gráficos de analítica: muestra del relleno (color y
 * trama), icono y texto.
 *
 * - `statuses`: los estados de una misión, debajo de las barras apiladas
 *   (`StackedBar`); por defecto, todos en su orden. Lo normal es pasarle solo los
 *   que se usan (`statusesInUse`).
 * - `series`: en vez de estados, los tipos de actividad de las columnas apiladas
 *   (`ActivityColumns`), cada uno con su texto (`{ series, label }`).
 */
const props = withDefaults(
  defineProps<{
    statuses?: readonly ChartStatus[]
    series?: readonly { series: ActivitySeries; label: string }[]
  }>(),
  { statuses: () => CHART_STATUSES, series: undefined }
)

const { t } = useI18n()

const entries = computed(() =>
  props.series
    ? props.series.map(item => ({ key: item.series, series: item.series, status: undefined, label: item.label }))
    : props.statuses.map(status => ({
        key: status,
        status,
        series: undefined,
        label: t(`common.charts.status.${status}`),
      }))
)
</script>
