<template>
  <div class="relative">
    <MagnifyingGlassIcon
      class="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none"
      aria-hidden="true"
    />
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :aria-label="label || placeholder"
      class="search-input w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-border-primary bg-surface rounded-2xl text-sm sm:text-base text-text-primary placeholder:text-text-secondary transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: string
  placeholder?: string
  /** Nombre accesible del campo; si falta, se usa el texto de ayuda. */
  label?: string
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar...',
  label: undefined,
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.search-input:focus,
.search-input:focus-visible,
.search-input:focus-within,
.search-input:active {
  outline: none !important;
  box-shadow: none !important;
}
</style>
