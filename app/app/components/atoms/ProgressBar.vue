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

    <!-- Circular: el anillo de la app (ProgressRing), con el % dentro -->
    <ProgressRing
      v-else-if="type === 'circular'"
      :value="percentFraction(percentage)"
      :tone="RING_TONE[variant]"
      :stroke="ringStrokeFor(strokeWidth, size)"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <span class="text-sm font-bold text-navy-700">{{ percentage }}%</span>
    </ProgressRing>
  </div>
</template>

<script setup lang="ts">
import { percentFraction, ringStrokeFor } from '~/utils/progress-ring'

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

// Circular: el color del anillo de cada variante (de token).
const RING_TONE = { default: 'navy', student: 'green', teacher: 'purple' } as const
</script>
