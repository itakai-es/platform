<template>
  <!-- La rueda es solo dibujo: quién sale se anuncia aparte, en la región viva de la página. -->
  <div ref="rootRef" class="roulette-wheel relative aspect-square w-full" aria-hidden="true">
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

    <!-- Recortada en redondo: al girar, la caja del dibujo crece y haría bajar la página -->
    <div class="h-full w-full overflow-hidden rounded-full">
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
            :transform="sector.textTransform"
            :font-size="sector.fontSize"
            :text-anchor="sector.anchor"
            dominant-baseline="central"
            font-weight="700"
            fill="rgb(var(--color-navy-700-rgb))"
            :data-index="i"
          >
            <tspan
              v-for="(line, l) in sector.lines"
              :key="l"
              x="0"
              :dy="l === 0 ? `${(-(sector.lines.length - 1) * 0.575).toFixed(3)}em` : '1.15em'"
            >
              {{ line }}
            </tspan>
          </text>
        </g>
        <text
          v-if="entries.length === 1"
          :transform="`rotate(${-rotation % 360})`"
          y="-48"
          text-anchor="middle"
          dominant-baseline="central"
          :font-size="singleLabel.fontSize"
          font-weight="700"
          fill="rgb(var(--color-navy-700-rgb))"
        >
          {{ singleLabel.text }}
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
  </div>
</template>

<script setup lang="ts">
import { ROULETTE_EASING, fitRouletteLabel, type RouletteEntry } from '~/utils/roulette'

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
// El texto de un sector acaba en RADIUS - 8 y no debe meterse bajo el buje
// (r 11 + medio trazo) ni rozarlo.
const LABEL_OUTER = RADIUS - 8
const LABEL_INNER = 12.5 + 3
// Con un único nombre va en horizontal, por encima del buje: cabe más.
const SINGLE_LABEL_SPACE = 150

const rootRef = ref<HTMLElement | null>(null)

/**
 * Ancho de un texto con la letra de la página, en negrita y a tamaño 1. Se mide
 * de verdad (las letras no miden lo mismo); sin lienzo, una media prudente.
 * Cambia al terminar de cargar las fuentes, y entonces se vuelve a encajar todo.
 */
let fontFamily = ''
let measureCtx: CanvasRenderingContext2D | null = null
const widths = new Map<string, number>()
const fontVersion = ref(0)

function measure(text: string): number {
  const known = widths.get(text)
  if (known !== undefined) return known
  let width = Array.from(text).length * 0.62
  if (measureCtx && fontFamily) {
    measureCtx.font = `700 100px ${fontFamily}`
    width = measureCtx.measureText(text).width / 100
  }
  widths.set(text, width)
  return width
}

function readFont() {
  if (!rootRef.value) return
  measureCtx ??= document.createElement('canvas').getContext('2d')
  fontFamily = getComputedStyle(rootRef.value).fontFamily
  widths.clear()
  fontVersion.value++
}

onMounted(() => {
  readFont()
  document.fonts?.addEventListener('loadingdone', readFont)
  document.fonts?.ready.then(readFont)
})
onBeforeUnmount(() => document.fonts?.removeEventListener('loadingdone', readFont))

/**
 * Cómo va cada nombre: con la letra más grande que quepa en su sector, hasta un
 * tope que baja con el número de sectores para que la rueda no quede desigual.
 */
const fits = computed(() => {
  void fontVersion.value
  const count = props.entries.length
  const maxFont = count <= 4 ? 14 : count <= 8 ? 12 : count <= 12 ? 10 : count <= 20 ? 8.5 : 7.5
  const minFont = count > 24 ? 5 : 6
  return props.entries.map(entry =>
    fitRouletteLabel(entry.label, measure, {
      count,
      outer: LABEL_OUTER,
      inner: LABEL_INNER,
      maxFont,
      minFont,
    })
  )
})

const singleLabel = computed(() => {
  void fontVersion.value
  const label = props.entries[0]?.label ?? ''
  const fontSize = Math.max(9, Math.min(16, SINGLE_LABEL_SPACE / Math.max(1, measure(label))))
  return { text: label, fontSize: Math.floor(fontSize * 10) / 10 }
})

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
            textTransform: `rotate(${(mid - 90).toFixed(3)}) translate(${LABEL_OUTER} 0)`,
            anchor: 'end',
          }
        : {
            textTransform: `rotate(${(mid + 90).toFixed(3)}) translate(${-LABEL_OUTER} 0)`,
            anchor: 'start',
          }),
      lines: fits.value[i]!.lines,
      fontSize: fits.value[i]!.fontSize,
    }
  })
})

const wheelStyle = computed(() => ({
  transform: `rotate(${props.rotation}deg)`,
  transition: props.durationMs > 0 ? `transform ${props.durationMs}ms ${ROULETTE_EASING}` : 'none',
}))
</script>
