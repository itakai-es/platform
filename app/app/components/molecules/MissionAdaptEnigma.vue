<template>
  <div class="space-y-1.5">
    <p class="break-words font-semibold text-navy-700">{{ enigma.title }}</p>
    <p v-if="enigma.description" class="whitespace-pre-line break-words">
      {{ enigma.description }}
    </p>
    <div v-if="enigma.objectives.length">
      <p class="text-xs font-semibold text-navy-700/70">
        {{ t('teacher.missions.adapt.objectives') }}
      </p>
      <ul class="ml-4 list-disc text-sm">
        <li v-for="(objective, index) in enigma.objectives" :key="index" class="break-words">
          {{ objective }}
        </li>
      </ul>
    </div>
    <!-- Recompensas como icono y número, como en el detalle de la misión -->
    <p
      v-if="rewards.length"
      class="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-navy-700"
    >
      <span v-for="reward in rewards" :key="reward.key" class="inline-flex items-center gap-1">
        <component :is="reward.icon" class="h-4 w-4" aria-hidden="true" />
        <span class="sr-only">{{ reward.label }}</span>
        {{ reward.amount.toLocaleString('es-ES') }}
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
import XpIcon from '~/components/atoms/XpIcon.vue'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'

/**
 * Un enigma en la comparación de «Adaptar con IA»: título, qué hay que hacer,
 * objetivos y recompensas. Las recompensas de los recursos apagados en la
 * clase no salen.
 */
const props = defineProps<{
  enigma: {
    title: string
    description: string
    objectives: string[]
    xp: number
    coins: number
    mana: number
  }
  showXp: boolean
  showCoins: boolean
  showMana: boolean
}>()

const { t } = useI18n()

const rewards = computed(() =>
  [
    {
      key: 'xp',
      icon: XpIcon,
      label: t('common.resources.xp'),
      amount: props.enigma.xp,
      on: props.showXp,
    },
    {
      key: 'coins',
      icon: CoinIcon,
      label: t('common.resources.coins'),
      amount: props.enigma.coins,
      on: props.showCoins,
    },
    {
      key: 'mana',
      icon: ManaIcon,
      label: t('common.resources.mana'),
      amount: props.enigma.mana,
      on: props.showMana,
    },
  ].filter(reward => reward.on)
)
</script>
