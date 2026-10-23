<template>
  <!-- Coste de una pista como el resto de recompensas: icono y número en navy.
       El lector de pantalla oye la frase entera («10 Monedas», «−20 % de la
       recompensa»), no el icono suelto. -->
  <span class="inline-flex items-center gap-1 text-sm font-semibold text-navy-700">
    <template v-if="free">
      <span>{{ t('common.mission_hints.free') }}</span>
    </template>
    <template v-else>
      <CoinIcon v-if="costType === 'coins'" class="w-5 h-5" />
      <XpIcon v-else-if="costType === 'xp'" class="w-5 h-5" />
      <ReceiptPercentIcon v-else class="w-5 h-5" aria-hidden="true" />
      <span aria-hidden="true">{{ costType === 'percent' ? `−${cost} %` : cost }}</span>
      <span class="sr-only">{{ spoken }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { ReceiptPercentIcon } from '@heroicons/vue/24/outline'
import type { MissionHintCostType } from '~/types/mission-detail.types'

const props = withDefaults(
  defineProps<{
    costType: MissionHintCostType
    cost: number
    /** Sale gratis (coste 0 o recurso apagado en la clase). */
    free?: boolean
  }>(),
  { free: false }
)

const { t } = useI18n()
const { coinLabel } = useCoinLabel()

const spoken = computed(() => {
  if (props.costType === 'coins') {
    return t('common.mission_hints.cost_coins', { count: props.cost, coins: coinLabel.value })
  }
  if (props.costType === 'xp') return t('common.mission_hints.cost_xp', { count: props.cost })
  return t('common.mission_hints.cost_percent', { count: props.cost })
})
</script>
