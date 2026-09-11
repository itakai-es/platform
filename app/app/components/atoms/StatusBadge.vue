<template>
  <span :class="badgeClasses">
    <!-- Icono de candado para estado bloqueada -->
    <svg
      v-if="variant === 'bloqueada'"
      class="w-3 h-3 mr-1 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clip-rule="evenodd"
      />
    </svg>
    <!-- Icono de checkmark para estado completada -->
    <svg
      v-else-if="variant === 'completada'"
      class="w-3 h-3 mr-1 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clip-rule="evenodd"
      />
    </svg>
    <!-- Icono de X para estado expirada -->
    <svg
      v-else-if="variant === 'expirada'"
      class="w-3 h-3 mr-1 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clip-rule="evenodd"
      />
    </svg>
    <slot />
  </span>
</template>

<script setup lang="ts">
/**
 * StatusBadge - Badges de estado para misiones
 *
 * Componente tipo píldora con altura fija de 26px según design system ITAKAI.
 * Usado para mostrar estados de misiones: urgente, activa, pendiente, bloqueada.
 *
 * Especificaciones:
 * - Altura: 26px fija
 * - Padding horizontal: 10px
 * - Border radius: 9999px (píldora completa)
 * - Font weight: medium
 *
 * Uso:
 * <StatusBadge variant="urgente">Urgente</StatusBadge>
 * <StatusBadge variant="activa">Al día</StatusBadge>
 * <StatusBadge variant="pendiente">Pendiente</StatusBadge>
 * <StatusBadge variant="bloqueada">Bloqueada</StatusBadge>
 */

interface Props {
  /**
   * Variante del badge que determina el color de fondo y texto
   * - urgente: Fondo #ff3c52 (rojo), texto blanco - Para misiones que necesitan atención inmediata
   * - activa: Fondo #6cf3af (menta), texto #23245d (navy) - Para misiones en progreso/al día
   * - pendiente: Fondo #ff9aab (rosa claro), texto #23245d (navy) - Para tareas pendientes
   * - completada: Fondo #9ea3ba (gris), texto blanco, icono checkmark - Para misiones completadas
   * - bloqueada: Fondo #9ea3ba (gris azulado), texto blanco, icono candado - Para misiones no disponibles
   * - expirada: Fondo #6b7280 (gris), texto blanco, icono X - Para misiones cuyo deadline ha pasado
   */
  variant?: 'urgente' | 'activa' | 'pendiente' | 'completada' | 'bloqueada' | 'expirada'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'activa',
})

const badgeClasses = computed(() => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-full h-[26px] px-[10px] text-sm'

  const variants = {
    urgente: 'bg-badge-urgente text-badge-text-light',
    activa: 'bg-badge-activa text-badge-text-dark',
    pendiente: 'bg-badge-pendiente text-badge-text-dark',
    completada: 'bg-badge-bloqueada text-white',
    bloqueada: 'bg-badge-bloqueada text-badge-text-light',
    expirada: 'bg-gray-500 text-white',
  }

  return [base, variants[props.variant]].join(' ')
})
</script>
