<template>
  <div class="flex-1 flex flex-col min-h-0">
    <div class="flex-1 flex items-center justify-center min-h-0">
      <!-- Generating -->
      <div v-if="generating" class="flex flex-col items-center gap-4">
        <div
          class="w-32 h-32 rounded-full bg-gray-100 animate-pulse flex items-center justify-center"
        >
          <TrophyIcon class="w-12 h-12 text-gray-300" />
        </div>
        <div class="onb-loading">
          <SparklesIcon class="w-4 h-4 animate-pulse" /><span>Generando insignia...</span>
        </div>
      </div>
      <!-- Generated -->
      <div v-else-if="imageUrl" class="flex flex-col items-center gap-3">
        <img :src="imageUrl" alt="" class="w-32 h-32 rounded-full object-cover shadow-lg" />
        <h4 class="text-lg font-bold text-navy-700">{{ name }}</h4>
        <p v-if="description" class="text-sm text-text-secondary text-center max-w-xs">
          {{ description }}
        </p>
      </div>
      <!-- Error -->
      <div v-else-if="failed" class="flex flex-col items-center gap-4 text-text-secondary">
        <TrophyIcon class="w-12 h-12 opacity-40" />
        <p class="text-sm">{{ t('teacher.badges.generate_error') }}</p>
        <Button variant="primary" size="sm" @click="$emit('retry')">
          <ArrowPathIcon class="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    </div>

    <!-- Feedback -->
    <div v-if="!generating && imageUrl && showFeedback" class="onb-feedback">
      <input
        ref="feedbackRef"
        :value="feedback"
        type="text"
        :placeholder="feedbackPlaceholder"
        class="onb-feedback-input"
        @input="$emit('update:feedback', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="feedback.trim() && $emit('regenerate')"
      />
      <button
        type="button"
        class="onb-send-btn"
        :disabled="!feedback.trim() || generating"
        @click="$emit('regenerate')"
      >
        <PaperAirplaneIcon class="w-4 h-4" />
      </button>
    </div>

    <!-- Actions -->
    <div v-if="!generating && !showFeedback" class="onb-actions">
      <Button variant="outline" size="sm" @click="$emit('back')">Atrás</Button>
      <div class="flex gap-2">
        <Button v-if="imageUrl" variant="outline" size="sm" @click="$emit('show-feedback')"
          >Quiero cambiar algo</Button
        >
        <Button variant="outline" size="sm" @click="$emit('skip')">Saltar</Button>
        <Button v-if="imageUrl" variant="primary" size="sm" @click="$emit('accept')"
          >Sí, adelante</Button
        >
      </div>
    </div>
    <div v-else-if="!generating && showFeedback" class="onb-actions">
      <Button variant="outline" size="sm" @click="$emit('back')">Atrás</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

import {
  TrophyIcon,
  SparklesIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
} from '@heroicons/vue/24/outline'

interface Props {
  generating: boolean
  imageUrl: string
  name: string
  description?: string
  failed: boolean
  feedback: string
  showFeedback: boolean
  feedbackPlaceholder?: string
}

withDefaults(defineProps<Props>(), {
  feedbackPlaceholder: 'Ej: Quiero que sea más épica, con temática de fuego...',
})

defineEmits<{
  retry: []
  regenerate: []
  back: []
  skip: []
  accept: []
  'show-feedback': []
  'update:feedback': [value: string]
}>()
</script>
