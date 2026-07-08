<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger Button -->
    <button type="button" :disabled="disabled" :class="triggerClasses" @click="toggleDropdown">
      <span class="truncate text-left">{{ displayLabel }}</span>
      <ChevronDownIcon
        :class="[
          'w-4 h-4 text-navy-700/60 transition-transform duration-200 flex-shrink-0',
          isOpen ? 'rotate-180' : '',
        ]"
      />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-2 min-w-full sm:w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
      >
        <div class="py-1 max-h-60 overflow-y-auto">
          <!-- "All" option -->
          <button
            type="button"
            :class="[
              'w-full px-3 py-2 text-left text-sm transition-colors duration-150 flex items-center gap-2',
              isAllSelected
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-navy-700 hover:bg-gray-50',
            ]"
            @click="selectAll"
          >
            <div
              :class="[
                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                isAllSelected ? 'bg-primary border-primary' : 'border-gray-300',
              ]"
            >
              <CheckIcon v-if="isAllSelected" class="w-3 h-3 text-white" />
            </div>
            <span>{{ allLabel }}</span>
          </button>

          <!-- Divider -->
          <div class="h-px bg-gray-100 my-1" />

          <!-- Options -->
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            :class="[
              'w-full px-3 py-2 text-left text-sm transition-colors duration-150 flex items-center gap-2',
              isSelected(option.value)
                ? 'bg-primary/5 text-navy-700'
                : 'text-navy-700 hover:bg-gray-50',
            ]"
            @click="toggleOption(option.value)"
          >
            <div
              :class="[
                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                isSelected(option.value) ? 'bg-primary border-primary' : 'border-gray-300',
              ]"
            >
              <CheckIcon v-if="isSelected(option.value)" class="w-3 h-3 text-white" />
            </div>
            <span>{{ option.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'

interface Option {
  value: string
  label: string
}

interface Props {
  modelValue: string[]
  options: Option[]
  allLabel?: string
  placeholder?: string
  singularLabel?: string
  pluralLabel?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  allLabel: 'Todas',
  placeholder: 'Seleccionar...',
  singularLabel: 'seleccionada',
  pluralLabel: 'seleccionadas',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const dropdownRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const isAllSelected = computed(() => {
  return props.modelValue.length === 0 || props.modelValue.length === props.options.length
})

const displayLabel = computed(() => {
  if (props.modelValue.length === 0) {
    return props.allLabel
  }
  if (props.modelValue.length === 1) {
    const selected = props.options.find(opt => opt.value === props.modelValue[0])
    return selected?.label || props.placeholder
  }
  if (props.modelValue.length === props.options.length) {
    return props.allLabel
  }
  return `${props.modelValue.length} ${props.pluralLabel}`
})

const triggerClasses = computed(() => {
  // sm:w-[220px] fuerza ancho fijo en desktop para que el trigger no cambie de
  // tamaño según el label seleccionado ("English" vs "Todos los idiomas") dentro
  // de contenedores flex-wrap. En móvil se queda w-full por el layout de columna.
  const base =
    'w-full sm:w-[220px] px-3 sm:px-4 py-2.5 sm:py-3 border rounded-2xl text-sm sm:text-base flex items-center justify-between gap-2 transition-colors duration-200 outline-none'
  const normal = 'border-border-primary bg-surface text-text-primary'
  const active = 'border-primary bg-surface text-text-primary ring-2 ring-primary/20'
  const disabledStyle = 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'

  return [base, props.disabled ? disabledStyle : isOpen.value ? active : normal].join(' ')
})

const isSelected = (value: string) => {
  return props.modelValue.includes(value)
}

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const selectAll = () => {
  emit('update:modelValue', [])
}

const toggleOption = (value: string) => {
  const current = [...props.modelValue]
  const index = current.indexOf(value)

  if (index === -1) {
    current.push(value)
  } else {
    current.splice(index, 1)
  }

  emit('update:modelValue', current)
}

onClickOutside(dropdownRef, () => {
  isOpen.value = false
})
</script>
