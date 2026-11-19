<template>
  <Card :type="type" :flex="flex">
    <CardHeader :title="title" :icon="icon" :title-tag="titleTag">
      <template v-if="$slots.actions || canToggle" #actions>
        <div class="flex flex-wrap items-center gap-2">
          <slot name="actions" />
          <!-- Un conmutador con el nombre fijo: «pulsado» es ver la tabla (el
               nombre no cambia con el estado, como pide el patrón de ARIA). -->
          <Button
            v-if="canToggle"
            size="sm"
            :variant="showTable ? 'primary' : 'outline'"
            :icon-left="TableCellsIcon"
            :aria-pressed="showTable"
            :class="showTable ? 'border-2 border-navy-700' : undefined"
            @click="toggleView"
          >
            {{ t('common.charts.view_as_table') }}
          </Button>
        </div>
      </template>
    </CardHeader>

    <figure
      class="m-0 space-y-4"
      :aria-label="title"
      :aria-describedby="hasCaption ? captionId : undefined"
    >
      <figcaption v-if="hasCaption" :id="captionId" class="text-sm text-navy-700">
        <slot name="caption">{{ caption }}</slot>
      </figcaption>

      <CardItem layout="column" padding="lg" class="gap-4">
        <div v-if="loading" class="space-y-3" aria-hidden="true">
          <Skeleton v-for="i in 4" :key="i" height="h-6" />
        </div>
        <LoadError v-else-if="error" :rate-limited="rateLimited" @retry="emit('retry')" />
        <EmptyState
          v-else-if="empty"
          :icon="ChartBarIcon"
          :title="emptyTitle ?? t('common.charts.empty_title')"
          :description="emptyDescription ?? t('common.charts.empty_description')"
        />
        <template v-else>
          <!-- El dibujo, para quien lo ve; el lector de pantalla lee la tabla -->
          <div v-show="!showTable" class="min-w-0 space-y-4" aria-hidden="true">
            <slot />
            <slot name="legend" />
          </div>
          <!-- La tabla está siempre en la página. Oculta a la vista mientras
               se ve el gráfico, salvo si el teclado entra en ella (sus
               enlaces): entonces aparece, para que el foco se vea. -->
          <div :class="showTable ? 'min-w-0' : 'sr-only focus-within:not-sr-only'">
            <slot name="table" />
          </div>
        </template>
      </CardItem>
    </figure>
  </Card>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { ChartBarIcon, TableCellsIcon } from '@heroicons/vue/24/outline'
import { CHART_DECORATIVE, useChartView } from '~/composables/useChartView'

/**
 * Un gráfico con su tabla de verdad, en una tarjeta: el contenedor de todos los
 * gráficos de los paneles de analítica.
 *
 * - Cabecera (`CardHeader`) con el título y, a la derecha, el botón «Ver como
 *   tabla» (`aria-pressed`) y lo que se ponga en la ranura `actions`.
 * - `<figure>` con el título como nombre y `figcaption` (`caption` o la ranura
 *   `caption`) para lo que hay que saber al leerlo: el periodo, «los saldos no
 *   cambian con el periodo»…
 * - Ranura por defecto: el dibujo (`StackedBar`, `ActivityColumns`),
 *   oculto al lector de pantalla (`aria-hidden`); ranura `legend` debajo.
 * - Ranura `table`: la tabla de verdad (`ChartTable`), **siempre en la página**:
 *   con el gráfico a la vista va oculta con `sr-only`; con «Ver como tabla»,
 *   en lugar del dibujo.
 *
 * La elección de vista es **de cada gráfico**: «Ver como tabla» cambia solo el
 * suyo, no los demás de la pantalla. Con `chartId` (un id estable, como
 * `class-missions`) se recuerda para la próxima vez (`useChartView`). Dentro
 * del dibujo nada recibe el foco (las piezas lo saben por `CHART_DECORATIVE`):
 * con el teclado se va a los enlaces de la tabla, que aparece al entrar en ella.
 *
 * Cada sección del panel carga por su cuenta: `loading` pinta un esqueleto,
 * `error` un `LoadError` (emite `retry`) y `empty` un `EmptyState`, sin tumbar
 * el resto de la página.
 *
 * @example
 * <ChartFigure :title="t('…missions')" :icon="RocketLaunchIcon" :caption="periodText">
 *   <div class="space-y-4"><StackedBar v-for="m in missions" … /></div>
 *   <template #legend><ChartLegend /></template>
 *   <template #table><ChartTable … /></template>
 * </ChartFigure>
 */
type CardType = 'ia' | 'stats' | 'pending' | 'clases' | 'info' | 'settings'

const props = withDefaults(
  defineProps<{
    title: string
    caption?: string
    icon?: Component
    titleTag?: 'h2' | 'h3' | 'h4'
    type?: CardType
    flex?: boolean
    loading?: boolean
    error?: boolean
    rateLimited?: boolean
    empty?: boolean
    emptyTitle?: string
    emptyDescription?: string
    /** Id estable del gráfico, para recordar si se ve como tabla (`useChartView`). */
    chartId?: string
  }>(),
  {
    chartId: undefined,
    caption: undefined,
    icon: undefined,
    titleTag: 'h2',
    type: 'stats',
    flex: false,
    loading: false,
    error: false,
    rateLimited: false,
    empty: false,
    emptyTitle: undefined,
    emptyDescription: undefined,
  }
)

const slots = defineSlots<{
  default?: () => unknown
  legend?: () => unknown
  table?: () => unknown
  caption?: () => unknown
  actions?: () => unknown
}>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const captionId = useId()

provide(CHART_DECORATIVE, true)

const view = useChartView(props.chartId)
const showTable = computed(() => view.value === 'table')

const hasCaption = computed(() => !!(props.caption || slots.caption))
const canToggle = computed(() => !props.loading && !props.error && !props.empty && !!slots.table)

function toggleView() {
  view.value = showTable.value ? 'chart' : 'table'
}
</script>
