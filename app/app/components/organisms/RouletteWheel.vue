<template>
  <!-- La rueda es solo dibujo: quién sale se anuncia aparte, en la región viva de la página. -->
  <div class="roulette-wheel relative aspect-square w-full" aria-hidden="true">
    <!-- Aguja fija, arriba -->
    <svg
      class="absolute left-1/2 top-0 z-10 h-[9%] w-[8%] -translate-x-1/2 -translate-y-[35%] drop-shadow"
      viewBox="0 0 40 46"
    >
      <path
        d="M4 4 H36 L20 42 Z"
        fill="rgb(var(--roulette-accent-rgb, var(--color-yellow-rgb)))"
        stroke="rgb(var(--color-navy-700-rgb))"
        stroke-width="4"
        stroke-linejoin="round"
      />
    </svg>

    <svg
      viewBox="-102 -102 204 204"
      class="h-full w-full"
      :style="wheelStyle"
      @transitionend.self="emit('settled')"
    >
      <circle r="101" fill="rgb(var(--color-navy-700-rgb))" />
      <template v-if="entries.length === 1">
        <circle r="96" :fill="entries[0]!.fill ?? SECTOR_FILLS[0]" />
      </template>
      <g v-for="(sector, i) in sectors" v-else :key="sector.id">
        <path
          :d="sector.path"
          :fill="sector.fill"
          stroke="rgb(var(--color-navy-700-rgb))"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
        <text
          v-if="entries.length > 1"
          :transform="sector.textTransform"
          :font-size="fontSize"
          :text-anchor="sector.anchor"
          dominant-baseline="central"
          font-weight="700"
          fill="rgb(var(--color-navy-700-rgb))"
          :data-index="i"
        >
          {{ sector.text }}
        </text>
      </g>
      <text
        v-if="entries.length === 1"
        :transform="`rotate(${-rotation % 360})`"
        y="-48"
        text-anchor="middle"
        dominant-baseline="central"
        :font-size="fontSize"
        font-weight="700"
        fill="rgb(var(--color-navy-700-rgb))"
      >
        {{ shorten(entries[0]!.label, SINGLE_LABEL_SPACE) }}
      </text>
      <!-- Buje -->
      <circle
        r="11"
        fill="rgb(var(--color-navy-700-rgb))"
        stroke="rgb(var(--roulette-accent-rgb, var(--color-yellow-rgb)))"
        stroke-width="3"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import {
  ROULETTE_EASING,
  ROULETTE_FULL_LABEL_MAX,
  rouletteInitials,
  type RouletteEntry,
} from '~/utils/roulette'

/**
 * RouletteWheel — la rueda de la ruleta, en SVG. No decide nada: pinta los
 * nombres que le dan y gira hasta `rotation` en `durationMs` (0 = sin giro,
 * para el movimiento reducido). Avisa con `settled` al acabar la transición;
 * quien la usa no debe fiarse solo de eso (si no hay giro, no llega).
 *
 * Colores desde los tokens: siguen a los modos de daltonismo y alto contraste.
 * La aguja y el aro del buje van en `--roulette-accent-rgb` (amarillo; en el tema
 * «university», donde el amarillo es navy como el fondo, blanco: tailwind.css).
 * Dos tonos alternos y borde, para no depender solo del color; si el número de
 * sectores es impar, el último lleva un tercer tono para no tocar al primero.
 * Un sector con `fill` propio (el color de un equipo) lo usa: el nombre sigue
 * dentro, así que el color tampoco va solo.
 */
const props = defineProps<{
  entries: RouletteEntry[]
  /** Giro acumulado, en grados. */
  rotation: number
  durationMs: number
}>()

const emit = defineEmits<{ settled: [] }>()

const SECTOR_FILLS = [
  'rgb(var(--color-purple-light-rgb))',
  'rgb(var(--color-sky-light-rgb))',
  'rgb(var(--color-yellow-light-rgb))',
] as const

const RADIUS = 96
// El texto de un sector va desde RADIUS - 8 hacia el centro y no debe meterse
// bajo el buje (r 11 + medio trazo) ni rozarlo.
const HUB_EDGE = 12.5
const SECTOR_LABEL_SPACE = RADIUS - 8 - HUB_EDGE - 3
// Con un único nombre va en horizontal, por encima del buje: cabe más.
const SINGLE_LABEL_SPACE = 150
// Ancho medio de una letra en negrita, en proporción al tamaño de letra (por lo alto).
const GLYPH_WIDTH = 0.62

const useInitials = computed(() => props.entries.length > ROULETTE_FULL_LABEL_MAX)

// Letra más pequeña cuantos más sectores, sin bajar de lo que se lee en un proyector.
const fontSize = computed(() => {
  const n = props.entries.length
  if (n <= 1) return 14
  if (useInitials.value) return 7
  if (n <= 6) return 11
  if (n <= 12) return 9
  return 7.5
})

/**
 * Nombres largos, recortados a lo que cabe en `space` (unidades del dibujo) con
 * la letra de ahora: el nombre completo sale en el resultado.
 */
function shorten(label: string, space = SECTOR_LABEL_SPACE) {
  const chars = Array.from(label)
  const max = Math.max(4, Math.floor(space / (fontSize.value * GLYPH_WIDTH)))
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : label
}

function point(angleDeg: number, r: number) {
  // 0° arriba y en el sentido de las agujas del reloj.
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return `${(r * Math.cos(rad)).toFixed(3)} ${(r * Math.sin(rad)).toFixed(3)}`
}

const sectors = computed(() => {
  const n = props.entries.length
  const size = 360 / n
  return props.entries.map((entry, i) => {
    const start = i * size
    const end = start + size
    const large = size > 180 ? 1 : 0
    const mid = start + size / 2
    const fill =
      entry.fill ??
      (n % 2 === 1 && i === n - 1 ? SECTOR_FILLS[2] : SECTOR_FILLS[i % 2 === 0 ? 0 : 1])
    return {
      id: entry.id,
      fill,
      path: `M0 0 L${point(start, RADIUS)} A${RADIUS} ${RADIUS} 0 ${large} 1 ${point(end, RADIUS)} Z`,
      // El texto va a lo largo del radio, pegado al borde; si al parar la rueda
      // queda en la mitad izquierda de la pantalla, girado media vuelta para que
      // no se lea boca abajo. Cuenta el giro: `rotation` ya es el destino.
      ...((((mid + props.rotation) % 360) + 360) % 360 <= 180
        ? {
            textTransform: `rotate(${(mid - 90).toFixed(3)}) translate(${RADIUS - 8} 0)`,
            anchor: 'end',
          }
        : {
            textTransform: `rotate(${(mid + 90).toFixed(3)}) translate(${8 - RADIUS} 0)`,
            anchor: 'start',
          }),
      text: useInitials.value ? rouletteInitials(entry.label) : shorten(entry.label),
    }
  })
})

const wheelStyle = computed(() => ({
  transform: `rotate(${props.rotation}deg)`,
  transition: props.durationMs > 0 ? `transform ${props.durationMs}ms ${ROULETTE_EASING}` : 'none',
}))
</script>
