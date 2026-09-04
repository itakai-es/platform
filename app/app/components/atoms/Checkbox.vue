<template>
  <div class="flex items-center">
    <input
      :id="id"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :required="required"
      class="w-4 h-4 border border-border-primary rounded bg-white checked:bg-navy-700 checked:border-navy-700 focus:ring-2 focus:ring-navy-700 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <label
      v-if="label"
      :for="id"
      class="ml-2 text-sm text-navy-700 cursor-pointer select-none"
      :class="{ 'opacity-50': disabled }"
    >
      {{ label }}
    </label>
  </div>
</template>

<script setup lang="ts">
/**
 * Checkbox Atom - ITAKAI Design System
 *
 * Especificaciones oficiales:
 * - Tamaño: 16x16px (w-4 h-4)
 * - Border: 1px solid #E6E3E5
 * - Border radius: 4px (rounded, no rounded-full)
 * - Checked state: bg-navy-700 (#23245d)
 * - Label posicionado a la derecha con ml-2
 */

interface Props {
  id?: string
  modelValue: boolean
  label?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  label: undefined,
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
/* Custom checkbox styling para match ITAKAI specs */
input[type='checkbox'] {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

input[type='checkbox']:checked {
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
}
</style>
