<template>
  <component :is="surface === 'card' ? Card : CardItem" v-bind="surfaceProps">
    <!-- El icono de la cifra, en su círculo: solo dibujo, la etiqueta lo dice -->
    <IconCircle
      v-if="symbol && ring === undefined"
      :icon="symbol"
      :tone="symbolTone"
      :icon-props="symbolProps"
      :size="size === 'sm' ? 'md' : 'lg'"
      class="mb-3"
      :class="surface === 'item' ? 'self-center' : ''"
    />
    <!-- En el código va primero la etiqueta y luego la cifra: el lector dice
         «Misiones de media: 3 de 8». A la vista, la cifra arriba en grande. -->
    <dl
      class="flex min-w-0 max-w-full flex-col"
      :class="surface === 'item' ? 'items-center self-center' : 'items-start'"
    >
      <!-- Una palabra larga («completadas») en una caja estrecha se parte con guion -->
      <dt class="order-2 mt-2 hyphens-auto break-words text-sm sm:text-base" :class="softText">
        {{ label }}
      </dt>
      <!-- Un número nunca se parte por dentro («139 / 0»): si no cabe, salta
           por los espacios («3 de / 8»). En el móvil, un tamaño menos. -->
      <!-- Con `ring`, la cifra va dentro de su anillo (que es solo dibujo) -->
      <dd
        v-if="ring !== undefined"
        class="order-1 flex w-full justify-center font-semibold leading-tight tabular-nums text-navy-700"
      >
        <ProgressRing :value="ring ?? 0" :tone="ringTone" :class="RING_SIZE[size]">
          <span class="px-3" :class="RING_VALUE_SIZE[size]"
            ><slot name="value">{{ displayValue }}</slot></span
          >
        </ProgressRing>
      </dd>
      <dd
        v-else
        class="order-1 inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 font-semibold leading-tight tabular-nums text-navy-700"
        :class="[VALUE_SIZE[size], surface === 'item' ? 'justify-center' : '']"
      >
        <component
          :is="icon"
          v-if="icon"
          class="flex-shrink-0"
          :class="ICON_SIZE[size]"
          aria-hidden="true"
        />
        <span class="min-w-0"><slot name="value">{{ displayValue }}</slot></span>
      </dd>
      <!-- «Media de la clase: 35 %», «Por encima de la media»… -->
      <dd v-if="$slots.detail" class="order-3 mt-1 text-sm" :class="softText">
        <slot name="detail" />
      </dd>
    </dl>
  </component>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { useNumberFormat } from '~/composables/useNumberFormat'

/**
 * Una cifra con su etiqueta: el único cuadro de estadística de los paneles.
 * Sustituye a `StatDisplay` y a las cajas blancas hechas a mano del Resumen.
 *
 * Es una lista de definición (`<dl>`): el lector de pantalla dice la etiqueta
 * y la cifra juntas («Misiones de media: 3 de 8») en vez de un número suelto.
 *
 * - `surface="card"` (por defecto): una tarjeta propia (`Card`, `type` stats),
 *   como las cifras de los inicios; alineada a la izquierda.
 * - `surface="item"`: la caja blanca dentro de una tarjeta de color (`CardItem`),
 *   como «Mi progreso»; centrada. Para rejillas, con `CardGrid`.
 * - `value`: un número se escribe en el idioma de la app; un texto, tal cual
 *   (por ejemplo, un porcentaje hecho con `formatPercent`).
 * - `total`: escribe «3 de 8» (`common.charts.value_of_total`): la cifra dice
 *   siempre qué cuenta, nunca un porcentaje suelto.
 * - `icon`: el de la XP, las monedas o el maná, delante del número (icono +
 *   número en azul marino, sin píldora de color).
 * - `size`: `md` para filas de cuatro; `lg`, más grande, para rejillas de dos
 *   como «Mi progreso»; `sm`, para cajas estrechas donde «2,8 de 7» se partiría.
 *   Todos bajan un tamaño en el móvil.
 *
 * - `symbol`: un icono que la represente, en blanco dentro de un círculo de color
 *   de marca (`IconCircle`, `symbolTone` navy o purple), encima de la cifra. Solo
 *   dibujo: la etiqueta dice lo mismo. `symbolProps` va al icono (`{ mono: true }`
 *   para la estrella de la XP en blanco).
 * - `ring`: de 0 a 1; la cifra va dentro de un anillo (`ProgressRing`) que se llena
 *   con esa parte: para un % o un «3 de 7». null es un anillo vacío (sin dato).
 *
 * Ranuras: `value` para escribir la cifra a mano y `detail` para la línea de
 * debajo (la media de la clase, la comparación…), que el lector dice después.
 *
 * Mientras carga, `StatCardSkeleton`.
 *
 * @example
 * <StatTile :label="t('…avg_missions')" :value="3" :total="8">
 *   <template #detail>{{ t('…class_average', { value: '35 %' }) }}</template>
 * </StatTile>
 * <StatTile surface="item" :label="t('…xp')" :value="800" :icon="XpIcon" />
 */
type CardType = 'ia' | 'stats' | 'pending' | 'clases' | 'info' | 'settings'

const props = withDefaults(
  defineProps<{
    label: string
    value?: string | number
    total?: number
    icon?: Component
    surface?: 'card' | 'item'
    type?: CardType
    size?: 'sm' | 'md' | 'lg'
    symbol?: Component
    symbolTone?: 'navy' | 'purple'
    symbolProps?: Record<string, unknown>
    ring?: number | null
    ringTone?: 'navy' | 'purple'
  }>(),
  {
    value: undefined,
    total: undefined,
    icon: undefined,
    surface: 'card',
    type: 'stats',
    size: 'md',
    symbol: undefined,
    symbolTone: 'navy',
    symbolProps: undefined,
    ring: undefined,
    ringTone: 'navy',
  }
)

defineSlots<{ value?: () => unknown; detail?: () => unknown }>()

const VALUE_SIZE = {
  sm: 'text-2xl sm:text-3xl 2xl:text-4xl',
  md: 'text-3xl sm:text-4xl xl:text-5xl',
  lg: 'text-4xl sm:text-5xl xl:text-6xl',
}
// El anillo, en rem (crece con la letra); la cifra de dentro, un tamaño menos.
// Cuadrado y, si la caja es más estrecha (móvil con letra grande), a su ancho.
const RING_SIZE = {
  sm: 'aspect-square w-28 max-w-full 2xl:w-32',
  md: 'aspect-square w-32 max-w-full',
  lg: 'aspect-square w-36 max-w-full',
}
const RING_VALUE_SIZE = {
  sm: 'text-xl sm:text-2xl 2xl:text-3xl',
  md: 'text-2xl sm:text-3xl',
  lg: 'text-3xl sm:text-4xl',
}
const ICON_SIZE = {
  sm: 'h-6 w-6 sm:h-7 sm:w-7 2xl:h-8 2xl:w-8',
  md: 'h-7 w-7 sm:h-8 sm:w-8 xl:h-10 xl:w-10',
  lg: 'h-8 w-8 sm:h-10 sm:w-10 xl:h-12 xl:w-12',
}

const Card = resolveComponent('Card')
const CardItem = resolveComponent('CardItem')

const { t } = useI18n()
const { formatNumber } = useNumberFormat()

/** El texto de apoyo: suavizado sobre blanco; sobre el color de una tarjeta, macizo. */
const softText = computed(() => (props.surface === 'item' ? 'text-navy-700/80' : 'text-navy-700'))

const surfaceProps = computed(() =>
  props.surface === 'card'
    ? { type: props.type, class: 'h-full' }
    : {
        layout: 'column',
        padding: props.size === 'sm' ? 'md' : 'lg',
        centered: true,
        class: 'h-full justify-center',
      }
)

const format = (value: string | number) =>
  typeof value === 'number' ? formatNumber(value) : value

const displayValue = computed(() => {
  if (props.value === undefined) return ''
  if (props.total === undefined) return format(props.value)
  return t('common.charts.value_of_total', {
    value: format(props.value),
    total: format(props.total),
  })
})
</script>
