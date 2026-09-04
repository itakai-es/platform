<template>
  <span :class="badgeClasses">
    <!-- Icono de estrella para legendaria -->
    <svg
      v-if="rarity === 'legendaria'"
      class="w-3 h-3 mr-1 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
    <!-- Icono de gema para épica -->
    <svg
      v-else-if="rarity === 'epica'"
      class="w-3 h-3 mr-1 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zm-2.5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
        clip-rule="evenodd"
      />
    </svg>
    <!-- Icono de rayo para rara -->
    <svg
      v-else-if="rarity === 'rara'"
      class="w-3 h-3 mr-1 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
        clip-rule="evenodd"
      />
    </svg>
    <!-- Icono de círculo para común -->
    <svg
      v-else
      class="w-3 h-3 mr-1 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clip-rule="evenodd"
      />
    </svg>
    <slot>{{ rarityLabel }}</slot>
  </span>
</template>

<script setup lang="ts">
/**
 * RarityBadge - Badge de rareza para misiones
 *
 * Componente tipo píldora con altura fija de 26px según design system ITAKAI.
 * Usado para mostrar la rareza de las misiones: común, rara, épica, legendaria.
 *
 * Colores según diseño:
 * - común: Verde (#6cf3af) con texto navy
 * - rara: Rosa/Azul (#E8B4D8) con texto navy
 * - épica: Morado (#ac74fd) con texto blanco
 * - legendaria: Dorado (#F59E0B) con texto blanco
 */

import type { MissionRarity } from '~/types/mission.types'

interface Props {
  rarity: MissionRarity
}

const props = defineProps<Props>()
const { t } = useI18n()

const badgeClasses = computed(() => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-full h-[26px] px-[10px] text-sm uppercase tracking-wide'

  const variants: Record<MissionRarity, string> = {
    comun: 'bg-badge-comun text-navy-700',
    rara: 'bg-purple-light text-navy-700',
    epica: 'bg-purple text-white',
    legendaria: 'bg-badge-legendaria text-white',
  }

  return [base, variants[props.rarity]].join(' ')
})

const rarityLabel = computed(() => t(`student.components.rarity_badge.${props.rarity}`))
</script>
