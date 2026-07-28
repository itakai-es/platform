<template>
  <!-- Estado de "generando" del onboarding: centrado y con el peso visual de los
       encabezados de paso. Compartido por ambos wizards. -->
  <div class="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
    <SparklesIcon class="w-8 h-8 animate-pulse text-navy-700" />
    <span class="text-lg font-semibold text-navy-700">{{ text }}</span>
    <AILoadingBar
      v-if="showBar"
      :progress="progress"
      :is-overtime="isOvertime"
      :remaining-label="remainingLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { SparklesIcon } from '@heroicons/vue/24/outline'

withDefaults(
  defineProps<{
    text: string
    progress?: number
    isOvertime?: boolean
    remainingLabel?: string
    showBar?: boolean
  }>(),
  {
    progress: 0,
    isOvertime: false,
    remainingLabel: '',
    showBar: true,
  }
)
</script>
