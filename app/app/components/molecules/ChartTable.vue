<template>
  <!-- Si no cabe (375 px, zoom), se desplaza dentro de su caja con la primera
       columna fija, como el histórico de asistencia, y la barra a la vista; la página
       no se mueve. `relative`, para que lo `sr-only` de las celdas no se salga de la
       caja. -->
  <div
    class="scrollbar-visible relative overflow-x-auto"
    role="region"
    tabindex="0"
    :aria-label="caption"
  >
    <table class="w-full text-sm">
      <caption
        :class="captionVisible ? 'pb-3 text-left font-semibold text-navy-700' : 'sr-only'"
      >
        {{ caption }}
      </caption>
      <thead>
        <tr class="border-b border-navy-700/10 text-navy-700/70">
          <th
            scope="col"
            class="sticky left-0 bg-white py-2 text-left font-semibold"
            :class="compact ? 'px-1.5 text-xs' : 'px-3'"
            :aria-sort="rowHeaderSort"
          >
            {{ rowHeader }}
          </th>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            class="py-2 font-semibold"
            :class="[ALIGN[column.align ?? 'end'], compact ? 'hyphens-auto px-1 text-xs' : 'px-3']"
            :aria-sort="column.sort"
          >
            <slot name="column" :column="column">{{ column.label }}</slot>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.key"
          class="border-b border-navy-700/10 last:border-0"
        >
          <th
            scope="row"
            class="sticky left-0 bg-white py-2 text-left font-semibold text-navy-700"
            :class="compact ? 'px-1.5' : 'px-3'"
          >
            <!-- Ancho mínimo: con cifras al lado, la columna no se aplasta a
                 una letra por línea (ni un título en cuatro); el resto se desplaza. -->
            <span class="block min-w-[8rem] max-w-[14rem] break-words">
              <slot name="header" :row="row">
                <NuxtLink
                  v-if="row.to"
                  :to="row.to"
                  class="underline decoration-navy-700/30 underline-offset-2 hover:decoration-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
                  >{{ row.header }}</NuxtLink
                >
                <template v-else>{{ row.header }}</template>
              </slot>
            </span>
          </th>
          <td
            v-for="column in columns"
            :key="column.key"
            class="py-2 tabular-nums text-navy-700"
            :class="[
              ALIGN[column.align ?? 'end'],
              compact ? 'px-1' : 'px-3',
              column.wrap ? '' : 'whitespace-nowrap',
            ]"
          >
            <slot name="cell" :row="row" :column="column" :value="row.cells[column.key]">
              {{ formatCell(row.cells[column.key]) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useNumberFormat } from '~/composables/useNumberFormat'

/**
 * La tabla de verdad de un gráfico (ranura `table` de `ChartFigure`), y la de
 * cualquier listado de cifras de los paneles. Sigue el patrón de
 * `AttendanceHistory`: `caption` (oculto salvo que se pida), cabeceras con
 * `scope`, la primera columna fija al desplazar y cifras alineadas.
 *
 * - `rowHeader`: el nombre de la primera columna («Misión», «Estudiante»);
 *   `rowHeaderSort`, su `aria-sort` si se ordena por ella.
 * - `columns`: el resto, con `align` (por defecto a la derecha, como las
 *   cifras) y `sort` para marcar con `aria-sort` la columna por la que se
 *   ordena (ordenar es cosa de quien la usa).
 * - `rows`: `header` es la celda de cabecera de la fila (enlace si trae `to`);
 *   `cells`, el valor de cada columna por su `key`. Un número se escribe en el
 *   idioma de la app; null o ausente, «—».
 *
 * `compact`, menos aire y cabeceras más pequeñas (que se parten con guion si no
 * caben), para tablas de muchas columnas en el hueco de una columna de la página:
 * las cifras se quedan estrechas y el título de cada fila, legible.
 *
 * Ranuras: `header` ({ row }), `column` ({ column }) y `cell` ({ row, column,
 * value }) para poner iconos, avatares o recompensas (icono + número).
 *
 * @example
 * <ChartTable :caption="t('…missions_caption')" :row-header="t('…mission')"
 *   :columns="CHART_STATUSES.map(s => ({ key: s, label: t(`common.charts.status.${s}`) }))"
 *   :rows="missions.map(m => ({ key: m.id, header: m.title, to: m.url, cells: m.counts }))" />
 */
export interface ChartTableColumn {
  key: string
  label: string
  align?: 'start' | 'center' | 'end'
  sort?: 'ascending' | 'descending' | 'none'
  /** La celda puede partirse por los espacios («hace 3 / semanas»): las cifras, nunca. */
  wrap?: boolean
}

export interface ChartTableRow {
  key: string
  header: string
  to?: string
  cells: Record<string, string | number | null | undefined>
}

withDefaults(
  defineProps<{
    caption: string
    rowHeader: string
    rowHeaderSort?: 'ascending' | 'descending' | 'none'
    columns: ChartTableColumn[]
    rows: ChartTableRow[]
    captionVisible?: boolean
    compact?: boolean
  }>(),
  { rowHeaderSort: undefined, captionVisible: false, compact: false }
)

defineSlots<{
  header?: (props: { row: ChartTableRow }) => unknown
  column?: (props: { column: ChartTableColumn }) => unknown
  cell?: (props: {
    row: ChartTableRow
    column: ChartTableColumn
    value: string | number | null | undefined
  }) => unknown
}>()

const { formatNumber } = useNumberFormat()

const ALIGN = { start: 'text-left', center: 'text-center', end: 'text-right' } as const

function formatCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return typeof value === 'number' ? formatNumber(value) : value
}
</script>
