<template>
  <div class="text-center py-12">
    <component :is="icon" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <component :is="`h${headingLevel}`" class="text-lg font-semibold text-navy-700 mb-2">{{
      title
    }}</component>
    <p class="text-text-primary/70">{{ description }}</p>
    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { DocumentTextIcon } from '@heroicons/vue/24/outline'

interface Props {
  icon?: Component
  title: string
  description: string
  /**
   * Nivel del título, con el mismo aspecto en todos. Lo normal es `h3`, dentro
   * de una página que ya tiene los suyos; cuando el aviso es lo único que hay
   * (un enlace muerto), es el título de la página.
   */
  headingLevel?: 1 | 2 | 3
}

withDefaults(defineProps<Props>(), {
  icon: () => DocumentTextIcon,
  headingLevel: 3,
})
</script>
