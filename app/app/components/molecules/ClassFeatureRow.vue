<template>
  <!-- Una funcionalidad de la clase: icono, nombre, explicación y, a la derecha,
       lo que diga quien la usa (el interruptor en Ajustes, «Activada» en la
       ficha de una plantilla). -->
  <div
    class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
    :class="dimmed ? 'opacity-75' : ''"
  >
    <!-- Apagada, solo el icono va en tenue: el texto se tiene que poder leer
         igual, y lo que dice si va encendida es la etiqueta o el interruptor. -->
    <span
      class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-700/5 text-navy-700"
      :class="dimIcon ? 'opacity-50' : ''"
      aria-hidden="true"
    >
      <component :is="icon" class="h-5 w-5" />
    </span>
    <div class="min-w-0 flex-1">
      <p
        class="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold leading-tight text-navy-700"
      >
        <span :id="labelId">{{ label }}</span>
        <slot name="badge" />
      </p>
      <!-- Explicación de 12 px: en el navy atenuado, que llega al contraste
           mínimo, no en el gris de los textos secundarios. -->
      <p :id="descriptionId" class="mt-0.5 text-xs text-navy-700/70">{{ description }}</p>
    </div>
    <div class="flex-shrink-0">
      <slot name="action" :label-id="labelId" :description-id="descriptionId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Una fila de funcionalidad de la clase, la misma en Ajustes → Funcionalidades
 * y en la ficha de una plantilla. El nombre y la explicación llevan id: el
 * interruptor de `#action` los usa como nombre y descripción accesibles.
 */
defineProps<{
  icon: Component
  label: string
  description: string
  /** Toda la fila en tenue: no se puede cambiar ahora (le falta otra funcionalidad). */
  dimmed?: boolean
  /** Solo el icono en tenue: va apagada. */
  dimIcon?: boolean
}>()

defineSlots<{
  badge?: () => unknown
  action?: (props: { labelId: string; descriptionId: string }) => unknown
}>()

const labelId = useId()
const descriptionId = useId()
</script>
