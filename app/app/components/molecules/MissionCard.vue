<template>
  <article :class="cardClasses" role="article">
    <!-- Header: Badge categoría + Título + Subtítulo -->
    <div class="flex items-center gap-2 mb-3">
      <Badge :variant="rarityBadgeVariant" size="sm" class="font-semibold">
        {{ rarityLabel }}
      </Badge>
    </div>

    <h3 class="text-xl font-semibold text-navy-700 mb-1 truncate">{{ title }}</h3>
    <p class="text-sm text-navy-700 opacity-80 mb-4 truncate">{{ subtitle }}</p>

    <!-- Progress Bar (full width) -->
    <div class="mb-4">
      <div class="flex items-center justify-between text-sm text-navy-700 mb-2">
        <span class="font-medium">{{ t('student.components.mission_card.progress') }}</span>
        <span class="font-semibold">{{ progress.done }}/{{ progress.total }}</span>
      </div>
      <ProgressBar
        :percentage="progressPercentage"
        type="linear"
        variant="default"
        role="progressbar"
        :aria-valuemin="0"
        :aria-valuemax="progress.total"
        :aria-valuenow="progress.done"
        :aria-label="`${t('student.components.mission_card.progress')}: ${progress.done}/${progress.total}`"
      />
    </div>

    <!-- Badges Grid (full width) -->
    <div class="grid grid-cols-3 gap-2 mb-4">
      <!-- XP reward -->
      <div class="rounded-xl bg-peach px-3 py-2 text-center">
        <div class="text-sm font-semibold text-navy-700">{{ rewards.xp }} XP</div>
      </div>

      <!-- Subject badge -->
      <div class="rounded-xl bg-mint px-3 py-2 text-center">
        <div class="text-xs font-semibold text-navy-700">{{ subject }}</div>
      </div>

      <!-- Deadline chip -->
      <div class="rounded-xl bg-[#CDD0DC] px-3 py-2 text-center">
        <div class="text-xs font-semibold text-navy-700">{{ deadline }}</div>
      </div>
    </div>

    <!-- Button (full width) -->
    <NuxtLink :to="`/alumno/misiones/${id}`">
      <Button variant="primary" size="sm" class="w-full">
        {{ t('student.components.mission_card.view_mission') }}
      </Button>
    </NuxtLink>
  </article>
</template>

<script setup lang="ts">
/**
 * MissionCard - ITAKAI Official Design System
 *
 * Card de misión con props individuales, fondos de color según rarity,
 * y estructura según especificaciones oficiales.
 *
 * Accesibilidad:
 * - Role article
 * - Heading h3 semántico
 * - ProgressBar con aria-valuemin, aria-valuemax, aria-valuenow, aria-label
 * - Focus outline visible
 */

interface Props {
  id: string
  title: string
  subtitle: string
  rarity: 'comun' | 'rara' | 'epica' | 'legendaria'
  progress: {
    done: number
    total: number
  }
  rewards: {
    xp: number
  }
  subject: string
  deadline: string
}

const props = defineProps<Props>()
const { t } = useI18n()

// Calcular porcentaje de progreso
const progressPercentage = computed(() => {
  if (props.progress.total === 0) return 0
  return Math.round((props.progress.done / props.progress.total) * 100)
})

// Clases del card según rarity
const cardClasses = computed(() => {
  const base =
    'rounded-2xl shadow p-4 transition-all duration-200 hover:shadow-lg focus-within:outline focus-within:outline-2 focus-within:outline-[#23245D33]'
  return `${base} bg-white`
})

// Variante de badge según rarity
const rarityBadgeVariant = computed(() => {
  const variantMap = {
    comun: 'common' as const,
    rara: 'info' as const,
    epica: 'epic' as const,
    legendaria: 'legendary' as const,
  }

  return variantMap[props.rarity]
})

// Label según rarity usando i18n
const rarityLabel = computed(() => {
  return t(`student.components.rarity_badge.${props.rarity}`)
})
</script>
