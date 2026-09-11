<template>
  <!-- Circular variant (for guides) -->
  <button
    v-if="variant === 'circular'"
    type="button"
    :class="circularContainerClasses"
    @click="emit('click')"
  >
    <div
      :class="[
        'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-24 lg:h-24 xl:w-24 xl:h-24 2xl:w-28 2xl:h-28 rounded-full flex items-center justify-center overflow-hidden mb-2 p-2',
        bgColor,
      ]"
    >
      <img v-if="image" :src="image" :alt="title" class="w-full h-full object-contain" />
      <component
        :is="icon"
        v-else-if="icon"
        class="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-navy-700"
      />
    </div>
    <p class="font-bold text-navy-700 text-xs sm:text-sm md:text-base">{{ title }}</p>
    <p
      v-if="subtitle"
      class="text-navy-700/70 text-[10px] sm:text-xs md:text-sm text-center max-w-20 sm:max-w-24"
    >
      {{ subtitle }}
    </p>
  </button>

  <!-- Square variant (for themes) -->
  <button v-else type="button" :class="squareContainerClasses" @click="emit('click')">
    <component :is="icon" v-if="icon" class="w-8 h-8 text-navy-700 mx-auto mb-2" />
    <img v-else-if="image" :src="image" :alt="title" class="w-8 h-8 mx-auto mb-2 object-contain" />
    <p class="font-medium text-navy-700">{{ title }}</p>
    <p v-if="subtitle" class="text-xs text-navy-700/70">{{ subtitle }}</p>
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  image?: string
  icon?: Component
  title: string
  subtitle?: string
  selected: boolean
  bgColor?: string
  variant?: 'circular' | 'square'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'circular',
  bgColor: 'bg-white',
})

const emit = defineEmits<{
  click: []
}>()

const circularContainerClasses = computed(() => {
  const base =
    'flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-navy-700/30'

  const selectedClasses = props.selected
    ? 'bg-white/50 ring-2 sm:ring-4 ring-navy-700/30'
    : 'hover:bg-white/30'

  return [base, selectedClasses].join(' ')
})

const squareContainerClasses = computed(() => {
  const base =
    'p-4 rounded-xl border-2 transition-all text-center focus:outline-none focus:ring-2 focus:ring-navy-700/30'

  const selectedClasses = props.selected
    ? 'border-navy-700 bg-navy-700/5'
    : 'border-border-primary hover:border-navy-700/30'

  return [base, selectedClasses].join(' ')
})
</script>
