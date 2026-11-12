<template>
  <!-- La misma fila que los repartos: nombre, barra y cifra en azul marino -->
  <DistributionBar
    :label="label"
    :value="value ?? 0"
    :percentage="percentage"
    :tone="tone"
    :display="value === null ? '—' : `${formatNumber(value)}${unit}`"
  />
</template>

<script setup lang="ts">
import type { DistributionTone } from '~/components/atoms/DistributionBar.vue'

/**
 * Un recurso del sistema en las estadísticas de Administración (CPU, memoria,
 * disco, latencia de la base), con la fila de `DistributionBar`. La barra cambia
 * de color de token al pasar de `warnAt` y de `dangerAt` (en % de `max`); la cifra
 * va siempre escrita, con contraste AA. `value` null: no se ha podido medir («—»).
 */
const props = withDefaults(
  defineProps<{
    label: string
    value: number | null
    max: number
    unit?: string
    warnAt?: number
    dangerAt?: number
  }>(),
  {
    unit: '%',
    warnAt: 70,
    dangerAt: 90,
  }
)

const { formatNumber } = useNumberFormat()

const percentage = computed(() =>
  props.value === null ? 0 : Math.min(Math.max((props.value / props.max) * 100, 0), 100)
)

const tone = computed<DistributionTone>(() => {
  if (percentage.value >= props.dangerAt) return 'error'
  if (percentage.value >= props.warnAt) return 'yellow'
  return 'purple'
})
</script>
