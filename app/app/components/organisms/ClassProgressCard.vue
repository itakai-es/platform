<template>
  <Card type="stats">
    <CardHeader
      :title="t('student.classes.detail.progress.title')"
      :icon="ArrowTrendingUpIcon"
      title-tag="h3"
    />

    <!-- Stats Grid -->
    <CardGrid cols="2x2">
      <!-- Completion Rate -->
      <div class="text-center">
        <p class="text-6xl sm:text-8xl font-light text-navy-700">{{ completionRate }}%</p>
        <p class="text-sm text-navy-700/80 mt-1">
          {{ t('student.classes.detail.progress.completion_rate') }}
        </p>
      </div>

      <!-- Missions -->
      <div class="text-center">
        <p class="text-6xl sm:text-8xl font-light text-navy-700">
          {{ missionsCompleted }}<span class="text-3xl text-navy-700/70">/{{ missionsTotal }}</span>
        </p>
        <p class="text-sm text-navy-700/80 mt-1">
          {{ t('student.classes.detail.progress.missions_completed') }}
        </p>
      </div>

    </CardGrid>
  </Card>
</template>

<script setup lang="ts">
import { ArrowTrendingUpIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()

/**
 * ClassProgressCard - Card de progreso general de clase
 *
 * Card que muestra el resumen del progreso del estudiante
 * en una clase específica. Incluye:
 * - Porcentaje de completado
 * - Misiones completadas / total
 */

interface Props {
  completionRate: number // 0-100
  missionsCompleted: number
  missionsTotal: number
}

defineProps<Props>()
</script>
