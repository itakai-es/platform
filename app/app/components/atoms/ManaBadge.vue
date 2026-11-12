<template>
  <span
    class="inline-flex items-center gap-1 font-semibold"
    :class="[textClass, variant === 'solid' ? pillClass : '', colorClass]"
  >
    <ManaIcon :class="iconClasses" />
    {{ formatNumber(amount) }}
    <span v-if="label" class="font-medium">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
const { formatNumber } = useNumberFormat()

interface Props {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  disabled?: boolean
  // 'solid' = pill morado (para fondos oscuros, p.ej. el header de la clase)
  // 'plain' = solo gema + número en navy (para cards/superficies claras)
  variant?: 'solid' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  disabled: false,
  variant: 'solid',
})

const textClass = computed(() => ({ sm: 'text-sm', md: 'text-base', lg: 'text-lg' })[props.size])

const pillClass = computed(
  () =>
    ({
      sm: 'h-[26px] px-[10px] rounded-full',
      md: 'h-8 px-3 rounded-full',
      lg: 'h-10 px-4 rounded-full',
    })[props.size]
)

const colorClass = computed(() => {
  if (props.disabled) return props.variant === 'solid' ? 'bg-gray-100 text-gray-400' : 'text-gray-400'
  return props.variant === 'solid' ? 'bg-sky text-white' : 'text-navy-700'
})

const iconClasses = computed(() => ({ sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' })[props.size])
</script>
