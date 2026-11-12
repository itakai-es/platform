<template>
  <!-- Clase aún pequeña: no hay media que enseñar, y se dice -->
  <p v-if="average === null && !bandOnly" class="text-sm text-navy-700/80">
    {{ t('common.charts.compare.not_enough') }}
  </p>

  <div v-else class="space-y-3">
    <!-- La pista: solo dibujo. Quien se compara es su avatar, puesto en su cifra
         sobre la parte llena; la media, una marca con su nombre debajo. El
         margen deja sitio al avatar en los extremos, sin salirse. -->
    <div v-if="average !== null" class="px-5" aria-hidden="true">
      <div class="relative h-16">
        <span class="absolute inset-x-0 top-[1.375rem] h-3 rounded-full bg-progress-track" />
        <span
          class="absolute left-0 top-[1.375rem] h-3 rounded-full bg-purple"
          :class="grows ? 'chart-grow-x' : ''"
          :style="{ width: `${track.you}%` }"
        />
        <!-- La marca de la media, por encima de la pista -->
        <span
          class="absolute top-3 h-8 w-1.5 -translate-x-1/2 rounded-full bg-navy-700 ring-2 ring-white"
          :style="{ left: `${track.average}%` }"
        />
        <span
          class="absolute top-11 whitespace-nowrap text-xs font-semibold text-navy-700"
          :class="ALIGN[track.averageAlign]"
          :style="{ left: `${track.average}%` }"
          >{{ averageName }}</span
        >
        <!-- Quien se compara -->
        <span
          class="absolute top-7 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md ring-[3px] ring-white"
          :style="{ left: `${track.you}%` }"
        >
          <Avatar
            v-if="avatar"
            :src="avatar.src"
            :name="avatar.name"
            :seed="avatar.seed"
            :color="avatar.color"
            size="xs"
          />
          <span v-else class="block h-6 w-6 rounded-full bg-navy-700" />
        </span>
      </div>
    </div>

    <!-- Las cifras, escritas: «Tú: 383», «Media: 430» -->
    <dl
      v-if="average !== null"
      class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-navy-700"
    >
      <div v-for="row in rows" :key="row.key" class="inline-flex items-center gap-1.5">
        <dt class="inline-flex items-center gap-1.5 font-semibold">
          <span class="h-3 w-3 flex-shrink-0 rounded-full" :class="row.swatch" aria-hidden="true" />
          {{ row.label }}
        </dt>
        <dd class="inline-flex items-center gap-1 font-semibold tabular-nums">
          <component :is="icon" v-if="icon" class="h-4 w-4" aria-hidden="true" />
          {{ row.display }}
        </dd>
      </div>
    </dl>
    <!-- La comparación, en palabras: nunca solo una marca de color -->
    <p class="text-sm font-medium text-navy-700">{{ sentence }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { TeamColor } from '~/types/team.types'
import { barPercent, scaleMax } from '~/utils/chart-scale'
import { useNumberFormat } from '~/composables/useNumberFormat'

/**
 * «Tú» frente a la media: una pista con el avatar de quien se compara en su cifra
 * y una marca en la media, las dos cifras escritas y una frase («Vas por encima
 * de la media»). Nunca solo una marca de color: la pista es solo dibujo y lo que
 * dice va en texto.
 *
 * No calcula nada: la banda (`above`, `at`, `below`) y los valores llegan ya
 * hechos y redondeados de la API, que es la que aplica el umbral y las reglas
 * de la comparación anónima. Con `average` a null (la clase es aún pequeña
 * para comparar) solo sale ese aviso.
 *
 * - `bandOnly`: sin media, pero con banda (en «los N primeros», con pocos ocultos,
 *   la API no la manda): solo sale la frase, sin pista.
 * - `subject`: `self` cuando quien mira es quien se compara («Tú», «Vas por
 *   encima…»); `other` cuando el profesorado mira a una persona («Por encima de
 *   la media de la clase»), con su nombre en `subjectLabel`.
 * - `avatar`: el de quien se compara (`src`, `name`, `seed` o `color`), que marca su sitio
 *   en la pista; sin él, un punto.
 * - `max`: dónde acaba la escala (100 para porcentajes, el total de misiones);
 *   por defecto, la mayor de las dos cifras.
 * - `formatValue`: cómo se escribe cada cifra («50 %», «4 de 8»); por defecto,
 *   el número en el idioma de la app.
 * - `icon`: para la XP, las monedas o el maná, su icono delante de la cifra
 *   (icono + número en azul marino, como en el resto de la app).
 *
 * @example
 * <CompareMeter :you="50" :average="35" band="above" :max="100"
 *   :avatar="{ src: me.avatar, name: me.name, seed }"
 *   :format-value="v => formatPercent(v, locale)" />
 */
type Band = 'above' | 'at' | 'below'

const props = withDefaults(
  defineProps<{
    you: number
    average: number | null
    band: Band | null
    bandOnly?: boolean
    max?: number
    subject?: 'self' | 'other'
    subjectLabel?: string
    averageLabel?: string
    avatar?: {
      src?: string | null
      name?: string | null
      seed?: string | null
      color?: TeamColor | null
    } | null
    formatValue?: (value: number) => string
    icon?: Component
  }>(),
  {
    max: undefined,
    subject: 'self',
    subjectLabel: undefined,
    averageLabel: undefined,
    avatar: null,
    formatValue: undefined,
    icon: undefined,
  }
)

const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const reducedMotion = useReducedMotion()
const grows = computed(() => !reducedMotion.value)

const display = (value: number) => props.formatValue?.(value) ?? formatNumber(value)

const averageName = computed(() => props.averageLabel ?? t('common.charts.average'))

// El nombre de la media, centrado en su marca; cerca de un extremo, hacia dentro.
const ALIGN = {
  start: '',
  center: '-translate-x-1/2',
  end: '-translate-x-full',
} as const

/** Dónde van, de 0 a 100, quien se compara y la media. */
const track = computed(() => {
  const average = props.average ?? 0
  const top = props.max ?? scaleMax([props.you, average])
  const averageAt = barPercent(average, top)
  return {
    you: barPercent(props.you, top),
    average: averageAt,
    averageAlign: (averageAt < 12 ? 'start' : averageAt > 88 ? 'end' : 'center') as keyof typeof ALIGN,
  }
})

const rows = computed(() => [
  {
    key: 'subject',
    label: props.subjectLabel ?? t('common.charts.you'),
    display: display(props.you),
    swatch: 'bg-purple',
  },
  {
    key: 'average',
    label: averageName.value,
    display: display(props.average ?? 0),
    swatch: 'bg-navy-700',
  },
])

// common.charts.compare.{self,other}.{above,at,below}
const sentence = computed(() =>
  props.band ? t(`common.charts.compare.${props.subject}.${props.band}`) : ''
)
</script>
