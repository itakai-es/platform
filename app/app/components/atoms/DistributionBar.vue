<template>
  <!-- Una fila con su nombre, su barra (solo dibujo) y su cifra, escrita fuera de la
       barra en azul marino: se lee igual sea cual sea el color. Con sitio, todo en
       una línea; en un hueco estrecho (móvil con letra grande), el nombre y la cifra
       arriba y la barra debajo, a todo el ancho: nada se sale. -->
  <div class="distribution-row">
    <div class="distribution-row__grid grid items-center gap-x-3 gap-y-1 py-1">
      <span class="min-w-0 hyphens-auto break-words text-xs font-medium text-navy-700">{{
        label
      }}</span>
      <div
        class="distribution-row__bar h-3 min-w-0 overflow-hidden rounded-full bg-progress-track"
        aria-hidden="true"
      >
        <!-- Con 0, sin trozo de color -->
        <div
          v-if="width > 0"
          class="h-full rounded-full transition-all duration-300"
          :class="TONES[tone]"
          :style="{ width: `${width}%` }"
        />
      </div>
      <span
        class="distribution-row__value whitespace-nowrap text-right text-xs font-semibold tabular-nums text-navy-700"
        >{{ display ?? formatNumber(value) }}</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Una fila de cifra con su barra en las estadísticas de Administración: los
 * repartos (cuentas por rol, misiones por estado o por rareza, mensajes por
 * asistente) y, a través de `GaugeBar`, los recursos del sistema.
 *
 * - `percentage`: lo que llena la barra (0-100). Con 0 no hay trozo de color.
 * - `tone`: el color de la barra, de token (lo cambian las paletas de daltonismo y
 *   el alto contraste). Nunca dice nada solo: el nombre y la cifra van escritos.
 * - `display`: la cifra ya escrita («16 % (46/291 GB)», «—»); por defecto, `value`
 *   en el idioma de la app.
 */
export type DistributionTone =
  | 'navy'
  | 'purple'
  | 'purple-light'
  | 'sky'
  | 'green'
  | 'yellow'
  | 'error'
  | 'legendary'

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    percentage?: number
    tone?: DistributionTone
    display?: string
  }>(),
  { percentage: 0, tone: 'purple', display: undefined }
)

const { formatNumber } = useNumberFormat()

// Las clases van enteras: Tailwind solo genera las que lee.
const TONES: Record<DistributionTone, string> = {
  navy: 'bg-navy-700',
  purple: 'bg-purple',
  'purple-light': 'bg-purple-light',
  sky: 'bg-sky',
  green: 'bg-badge-comun',
  yellow: 'bg-yellow',
  error: 'bg-error',
  legendary: 'bg-badge-legendaria',
}

const width = computed(() => Math.min(100, Math.max(0, props.percentage)))
</script>

<style scoped>
.distribution-row {
  container-type: inline-size;
}
/* Estrecho: el nombre y la cifra en una línea; la barra, debajo */
.distribution-row__grid {
  grid-template-columns: minmax(0, 1fr) auto;
}
.distribution-row__bar {
  grid-row: 2;
  grid-column: 1 / -1;
}
.distribution-row__value {
  grid-row: 1;
  grid-column: 2;
}
/* Con sitio para el nombre (6rem), una barra que se vea y la cifra: una línea */
@container (min-width: 14rem) {
  .distribution-row__grid {
    grid-template-columns: 6rem minmax(0, 1fr) auto;
  }
  .distribution-row__bar {
    grid-row: 1;
    grid-column: 2;
  }
  /* Las cifras, con un ancho mínimo: las barras de un reparto acaban alineadas */
  .distribution-row__value {
    grid-column: 3;
    min-width: 3rem;
  }
}
</style>
