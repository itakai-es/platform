<template>
  <div class="stat-display">
    <div class="stat-value mb-2" :class="valueClasses">
      {{ formattedValue }}
    </div>
    <div class="stat-label" :class="[labelClasses, labelSizeClasses]">
      {{ label }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * StatDisplay - ITAKAI Design System
 *
 * Componente para mostrar estadísticas grandes con valor y label
 *
 * Props:
 * - value: string o número - El valor a mostrar (ej: "50K+", "2K+")
 * - label: string - El label descriptivo (ej: "Estudiantes", "Profesores")
 * - variant: 'default' | 'large' - Tamaño del stat
 * - color: 'primary' | 'pink' | 'mint' | 'yellow' | 'white' - Color del valor
 * - suffix: string opcional - Sufijo a agregar al valor (ej: " XP", "%")
 */

interface Props {
  value: string | number
  label: string
  variant?: 'default' | 'large'
  color?: 'primary' | 'pink' | 'mint' | 'yellow' | 'white'
  suffix?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  color: 'primary',
  suffix: '',
})

// Los números, con los separadores del idioma de la app (no los del navegador).
const { formatNumber } = useNumberFormat()

const formattedValue = computed(() => {
  const val = typeof props.value === 'number' ? formatNumber(props.value) : props.value
  return props.suffix ? `${val}${props.suffix}` : val
})

const valueClasses = computed(() => {
  const sizeClasses = {
    default: 'text-5xl sm:text-6xl font-light',
    large: 'text-6xl sm:text-8xl font-light',
  }

  const colorClasses = {
    primary: 'text-navy-700',
    pink: 'text-red',
    mint: 'text-mint',
    yellow: 'text-gold',
    white: 'text-white',
  }

  return `${sizeClasses[props.variant]} ${colorClasses[props.color]}`
})

const labelClasses = computed(() => {
  const colorClasses = {
    // Va sobre el color de la tarjeta: macizo, para que llegue a AA.
    primary: 'text-navy-700',
    pink: 'text-navy-700',
    mint: 'text-navy-700',
    yellow: 'text-navy-700',
    white: 'text-white/80',
  }

  return colorClasses[props.color]
})

const labelSizeClasses = computed(() => {
  return props.variant === 'large' ? 'text-base sm:text-lg' : 'text-base'
})
</script>

<style scoped>
.stat-display {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}
</style>
