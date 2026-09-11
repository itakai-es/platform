<template>
  <div>
    <!-- Linear Progress Bar -->
    <div v-if="type === 'linear'" class="flex items-center gap-3">
      <div :class="progressContainerClasses">
        <div :class="progressBarClasses" :style="{ width: `${percentage}%` }" />
      </div>

      <!-- Label opcional (% o fracción) -->
      <span v-if="label" class="text-sm font-medium text-text-primary whitespace-nowrap">
        {{ label }}
      </span>
    </div>

    <!-- Circular Progress Bar (Ring) -->
    <div v-else-if="type === 'circular'" class="inline-flex items-center justify-center relative">
      <svg :width="size" :height="size" class="transform -rotate-90">
        <!-- Track (fondo del anillo) -->
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :style="{ stroke: trackColor }"
          :stroke-width="strokeWidth"
        />

        <!-- Progress bar (relleno del anillo) -->
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :style="{ stroke: fillColor }"
          :stroke-width="strokeWidth"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          stroke-linecap="round"
          class="transition-all duration-300 ease-out"
        />
      </svg>

      <!-- Percentage centered -->
      <div class="absolute inset-0 flex items-center justify-center">
        <span class="text-sm font-bold text-navy-700">{{ percentage }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  percentage: number
  type?: 'linear' | 'circular'
  variant?: 'default' | 'student' | 'teacher'
  label?: string // Ej: "75%", "12/15", "Completado"
  size?: number // Para circular: diámetro del círculo
  strokeWidth?: number // Para circular: grosor del anillo
}

const props = withDefaults(defineProps<Props>(), {
  type: 'linear',
  variant: 'default',
  label: undefined,
  size: 80,
  strokeWidth: 8,
})

// Linear Progress Classes
const progressContainerClasses = computed(() => {
  // ITAKAI Official CSS structure
  return 'flex-1 h-[10px] bg-progress-track rounded-full overflow-hidden'
})

const progressBarClasses = computed(() => {
  const base = 'h-full rounded-full transition-all duration-300 ease-out'

  // Variantes de color (navy por defecto según specs)
  const variants = {
    default: 'bg-navy-700', // #23245d - Navy 700 indigo (ITAKAI oficial)
    student: 'bg-mint', // Variante opcional para estudiantes
    teacher: 'bg-purple', // Variante opcional para profesores
  }

  return [base, variants[props.variant]].join(' ')
})

// Circular Progress Calculations
const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const strokeDashoffset = computed(() => {
  const progress = Math.min(Math.max(props.percentage, 0), 100)
  return circumference.value - (progress / 100) * circumference.value
})

// Circular colors (from CSS variables)
const trackColor = 'var(--color-progress-track)'
const fillColor = computed(() => {
  const variants = {
    default: 'var(--color-navy-700)',
    student: 'var(--color-green)',
    teacher: 'var(--color-purple)',
  }
  return variants[props.variant]
})
</script>
