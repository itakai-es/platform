<template>
  <button
    type="button"
    :disabled="disabled"
    :class="classes"
    :aria-label="label"
    @click="emit('click')"
  >
    <component :is="icon" class="h-4 w-4" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * El botón de solo icono de las filas del panel de administración (editar,
 * borrar…). `label` es obligatorio: es lo que lee el lector de
 * pantalla, porque el icono solo no dice nada.
 */
const props = withDefaults(
  defineProps<{
    icon: Component
    label: string
    /** Acción destructiva: el fondo al pasar por encima es rojo. */
    danger?: boolean
    disabled?: boolean
  }>(),
  { danger: false, disabled: false }
)

const emit = defineEmits<{ click: [] }>()

const classes = computed(() => [
  'rounded-lg p-2 text-navy-700/70 transition-colors enabled:hover:text-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40',
  props.danger ? 'enabled:hover:bg-red-light' : 'enabled:hover:bg-purple-light',
])
</script>
