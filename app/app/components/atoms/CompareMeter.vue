<template>
  <!-- Clase aún pequeña: no hay media que enseñar, y se dice -->
  <p v-if="average === null && !bandOnly" class="text-sm text-navy-700/80">
    {{ t('common.charts.compare.not_enough') }}
  </p>

  <div v-else class="space-y-3">
    <!-- La pista: solo dibujo. Encima de ella, la media: su nombre arriba y
         una marca que apunta a su sitio. En la pista, quien se compara: su
         avatar en su cifra, sobre la parte llena. La marca acaba antes de
         donde empieza el avatar: aunque estén en el mismo sitio, nada se tapa
         (y la frase dice entonces que está en la media). El margen deja sitio
         al avatar en los extremos, sin salirse. Todo en rem: crece con la letra. -->
    <div v-if="average !== null" class="px-5" aria-hidden="true">
      <div class="relative h-[4.625rem]">
        <span
          class="absolute top-0 whitespace-nowrap text-xs font-semibold leading-4 text-navy-700"
          :class="ALIGN[track.averageAlign]"
          :style="{ left: `${track.average}%` }"
          >{{ averageName }}</span
        >
        <svg
          class="absolute top-[1.125rem] h-2.5 w-3.5 -translate-x-1/2 fill-current text-navy-700"
          viewBox="0 0 14 10"
          focusable="false"
          :style="{ left: `${track.average}%` }"
        >
          <path :d="MARK_PATH" />
        </svg>
        <span class="absolute inset-x-0 top-[2.875rem] h-3 rounded-full bg-progress-track" />
        <span
          class="absolute left-0 top-[2.875rem] h-3 rounded-full bg-purple"
          :class="grows ? 'chart-grow-x' : ''"
          :style="{ width: `${track.you}%` }"
        />
        <!-- Quien se compara, centrado en la pista -->
        <span
          class="absolute top-[3.25rem] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md ring-[3px] ring-white"
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
          <!-- La muestra de la media es su marca; la de quien se compara, la parte llena -->
          <svg
            v-if="row.key === 'average'"
            class="h-2.5 w-3.5 flex-shrink-0 fill-current text-navy-700"
            viewBox="0 0 14 10"
            aria-hidden="true"
            focusable="false"
          >
            <path :d="MARK_PATH" />
          </svg>
          <span v-else class="h-3 w-3 flex-shrink-0 rounded-full bg-purple" aria-hidden="true" />
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

/** La marca de la media (un triángulo que apunta a la pista), también en su leyenda. */
const MARK_PATH = 'M1 0h12a1 1 0 0 1 .8 1.6l-6 7.6a1 1 0 0 1-1.6 0l-6-7.6A1 1 0 0 1 1 0z'

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
  },
  {
    key: 'average',
    label: averageName.value,
    display: display(props.average ?? 0),
  },
])

// common.charts.compare.{self,other}.{above,at,below}
const sentence = computed(() =>
  props.band ? t(`common.charts.compare.${props.subject}.${props.band}`) : ''
)
</script>
