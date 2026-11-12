<template>
  <!-- El tamaño lo pone quien lo usa (`class="h-28 w-28"`, en rem: crece con la
       letra). El anillo es solo dibujo: lo que dice va escrito dentro (la ranura)
       o al lado. -->
  <span class="relative inline-flex flex-shrink-0 items-center justify-center rounded-full">
    <svg
      class="absolute inset-0 h-full w-full -rotate-90"
      :viewBox="`0 0 ${RING_BOX} ${RING_BOX}`"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        :cx="RING_BOX / 2"
        :cy="RING_BOX / 2"
        :r="radius"
        fill="none"
        :stroke-width="stroke"
        :class="TRACK[tone]"
      />
      <circle
        v-if="value > 0"
        :cx="RING_BOX / 2"
        :cy="RING_BOX / 2"
        :r="radius"
        fill="none"
        :stroke-width="stroke"
        stroke-linecap="round"
        pathLength="100"
        stroke-dasharray="100 100"
        :stroke-dashoffset="ringDashOffset(shown)"
        :class="[ARC[tone], moving ? 'transition-[stroke-dashoffset] duration-700 ease-out' : '']"
        :data-testid="arcTestid"
      />
    </svg>
    <span class="relative flex min-w-0 max-w-full flex-col items-center justify-center text-center">
      <slot />
    </span>
  </span>
</template>

<script setup lang="ts">
import { RING_BOX, ringDashOffset, ringRadius } from '~/utils/progress-ring'

/**
 * Un anillo de progreso: el de las cifras de los paneles (el % medio, la
 * asistencia, «3 de 7»), el de los enigmas aprobados de cada misión, el del nivel
 * alrededor de un avatar (`LevelAvatar`) y el de los medallones del mapa.
 *
 * - `value`: lo lleno, de 0 a 1 (`ringFraction`, `percentFraction`).
 * - `stroke`: el grosor, en unidades de un `viewBox` de 100 (8 por defecto).
 * - `tone`: el color del arco y de la pista, de token (los cambian las paletas
 *   de daltonismo y el alto contraste): `navy`, `purple` y `green` sobre blanco,
 *   `white` sobre el fondo oscuro del mapa.
 * - `animate`: se llena al aparecer (y al cambiar), salvo con «Reducir
 *   movimiento» o si el sistema lo pide.
 *
 * Es solo dibujo (`aria-hidden`): la cifra va siempre escrita, dentro (ranura por
 * defecto) o al lado, y nunca solo en el color.
 *
 * @example
 * <ProgressRing :value="percentFraction(42)" class="h-24 w-24">
 *   <span class="text-2xl font-semibold">42 %</span>
 * </ProgressRing>
 */
type Tone = 'navy' | 'purple' | 'green' | 'white'

const props = withDefaults(
  defineProps<{
    value: number
    stroke?: number
    tone?: Tone
    animate?: boolean
    /** Para las pruebas de navegador que miran el arco. */
    arcTestid?: string
  }>(),
  { stroke: 8, tone: 'navy', animate: true, arcTestid: undefined }
)

// Las clases van enteras: Tailwind solo genera las que lee.
const TRACK: Record<Tone, string> = {
  navy: 'stroke-progress-track',
  purple: 'stroke-progress-track',
  green: 'stroke-progress-track',
  white: 'stroke-white/15',
}
const ARC: Record<Tone, string> = {
  navy: 'stroke-navy-700',
  purple: 'stroke-purple',
  green: 'stroke-green',
  white: 'stroke-white',
}

const radius = computed(() => ringRadius(props.stroke))

const reducedMotion = useReducedMotion()
const moving = computed(() => props.animate && !reducedMotion.value)

// Al aparecer, de vacío a su sitio en el siguiente fotograma; quieto, ya lleno.
const shown = ref(moving.value ? 0 : props.value)
onMounted(() => {
  if (!moving.value) return
  requestAnimationFrame(() => {
    shown.value = props.value
  })
})
watch(
  () => props.value,
  value => {
    shown.value = value
  }
)
</script>
