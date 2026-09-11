<template>
  <div class="relative">
    <select :value="modelValue" :disabled="disabled" :class="selectClasses" @change="handleChange">
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <ChevronDownIcon
      class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-700/70"
    />
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number
  options: Option[]
  placeholder?: string
  disabled?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const selectClasses = computed(() => {
  const base =
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 border rounded-2xl transition-colors duration-200 focus:outline-none focus:ring-2 bg-surface text-text-primary text-sm sm:text-base appearance-none cursor-pointer'
  const normal = 'border-border-primary focus:border-primary focus:ring-primary/20'
  const errorStyle = 'border-error focus:border-error focus:ring-error/20'
  const disabledStyle = 'bg-bg-tertiary cursor-not-allowed opacity-60'

  return [base, props.error ? errorStyle : normal, props.disabled ? disabledStyle : ''].join(' ')
})

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>
