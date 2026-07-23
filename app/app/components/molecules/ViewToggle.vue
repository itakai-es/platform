<template>
  <!-- Control segmentado cuadrícula / lista. Mismo estilo de pills navy que el
       resto de la app (activo: navy relleno, inactivo: superficie con hover). -->
  <div
    class="inline-flex items-center gap-1 rounded-full border border-border-primary bg-surface p-1"
    role="group"
    aria-label="Modo de vista"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      :aria-label="option.label"
      :title="option.label"
      class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-10 sm:w-10"
      :class="
        modelValue === option.value
          ? 'bg-navy-700 text-white'
          : 'text-navy-700 hover:bg-gray-50'
      "
      @click="$emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" class="h-5 w-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/vue/24/outline'
import type { ViewMode } from '~/composables/useViewMode'

defineProps<{ modelValue: ViewMode }>()
defineEmits<{ 'update:modelValue': [ViewMode] }>()

const options: { value: ViewMode; label: string; icon: unknown }[] = [
  { value: 'grid', label: 'Cuadrícula', icon: Squares2X2Icon },
  { value: 'list', label: 'Lista', icon: ListBulletIcon },
]
</script>
