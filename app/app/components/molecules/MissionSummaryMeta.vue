<template>
  <!-- Solo `span`: también va dentro de un botón (la lista para elegir qué
       misión importar). -->
  <span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-navy-700">
    <RarityBadge :rarity="rarity" />
    <span class="text-xs font-normal text-navy-700/70">
      {{ t('teacher.missions.import.enigmas', { count: enigmasCount }, enigmasCount) }}
    </span>
    <span v-for="reward in rewards" :key="reward.key" class="inline-flex items-center gap-1">
      <component :is="reward.icon" class="h-4 w-4" aria-hidden="true" />
      <span class="sr-only">{{ reward.label }}</span>
      {{ reward.amount.toLocaleString('es-ES') }}
    </span>
  </span>
</template>

<script setup lang="ts">
import type { MissionRarity } from '~/types/mission.types'
import XpIcon from '~/components/atoms/XpIcon.vue'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'

/**
 * El resumen de una misión en una línea: su rareza, cuántos enigmas tiene y lo
 * que da entera, como icono y número. Es la misma línea en la lista para
 * elegir qué misión importar y en las misiones de la ficha de una plantilla.
 *
 * Una recompensa a 0 no sale: quien la usa pone a 0 las de los recursos que la
 * clase (o la plantilla) lleva apagados.
 */

const props = defineProps<{
  rarity: MissionRarity
  enigmasCount: number
  xp: number
  coins: number
  mana: number
}>()

const { t } = useI18n()

const rewards = computed(() =>
  [
    { key: 'xp', icon: XpIcon, label: t('common.resources.xp'), amount: props.xp },
    { key: 'coins', icon: CoinIcon, label: t('common.resources.coins'), amount: props.coins },
    { key: 'mana', icon: ManaIcon, label: t('common.resources.mana'), amount: props.mana },
  ].filter(reward => reward.amount > 0)
)
</script>
