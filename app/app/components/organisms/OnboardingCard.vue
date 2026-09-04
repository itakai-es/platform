<template>
  <!-- Card del asistente de onboarding, compartida por los wizards de clase y
       misión. La entrada (onb-fade-in / onb-reveal) y los estilos onb-* viven en
       el CSS global. El contenido de cada paso va en el slot por defecto. -->
  <div
    class="onb-fade-in flex flex-1 flex-col min-h-0 bg-white rounded-2xl shadow-lg border border-gray-100"
  >
    <!-- God + título del paso (etiqueta + pregunta) + pasos a la derecha -->
    <div class="onb-reveal flex items-start gap-4 px-6 pt-6" style="animation-delay: 0.1s">
      <div
        class="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-navy-700/5 ring-1 ring-navy-700/10"
      >
        <img :src="god.avatar" :alt="god.name" class="w-full h-full object-contain" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-wider text-navy-700/70">
          Paso {{ step + 1 }} de {{ totalSteps }}
        </p>
        <p class="text-xl font-bold text-navy-700 leading-snug mt-0.5">{{ question }}</p>
      </div>
      <!-- Indicador de pasos compacto -->
      <div class="shrink-0 pt-0.5">
        <span class="sm:hidden text-sm font-semibold text-navy-700 whitespace-nowrap"
          >{{ step + 1 }}/{{ totalSteps }}</span
        >
        <div class="hidden sm:flex items-center gap-1.5">
          <template v-for="i in totalSteps" :key="i">
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
              :class="i - 1 <= step ? 'bg-navy-700 text-white' : 'bg-gray-200 text-gray-400'"
            >
              <CheckIcon v-if="i - 1 < step" class="w-3 h-3" />
              <span v-else>{{ i }}</span>
            </div>
            <div
              v-if="i < totalSteps"
              class="w-4 h-0.5 rounded-full"
              :class="i - 1 < step ? 'bg-navy-700' : 'bg-gray-200'"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- Contenido del paso -->
    <div class="flex-1 flex flex-col px-6 pb-6 pt-5 min-h-0">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/outline'

defineProps<{
  step: number
  totalSteps: number
  question: string
  god: { name: string; avatar: string }
}>()
</script>
