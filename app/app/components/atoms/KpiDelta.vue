<template>
  <p v-if="text" class="text-sm font-medium text-navy-700">{{ text }}</p>
</template>

<script setup lang="ts">
import { periodDelta } from '~/utils/chart-format'

/**
 * Una cifra frente a la del periodo anterior, escrita: «+102 % respecto al
 * periodo anterior» o, si la anterior es 0 o muy pequeña, la diferencia («+920
 * respecto al periodo anterior»). Nada si no ha cambiado. Las cuentas, en
 * `periodDelta` (utils/chart-format.ts).
 *
 * - `rate`: la cifra ya es un % (la tasa de error): se compara en puntos.
 */
const props = defineProps<{
  current: number
  previous: number
  rate?: boolean
}>()

const { t } = useI18n()
const { formatSignedNumber, formatSignedPercent } = useNumberFormat()

const text = computed(() => {
  const delta = periodDelta(props.current, props.previous, props.rate)
  if (!delta) return ''
  const diff = formatSignedNumber(delta.value)
  switch (delta.kind) {
    case 'points':
      return t('admin.analytics.delta.points', { diff }, Math.abs(delta.value) === 1 ? 1 : 2)
    case 'absolute':
      return t('admin.analytics.delta.absolute', { diff })
    default:
      return t('admin.analytics.delta.percent', { percent: formatSignedPercent(delta.value) })
  }
})
</script>
