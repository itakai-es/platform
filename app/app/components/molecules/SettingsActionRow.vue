<template>
  <div
    class="flex flex-col gap-3 rounded-2xl border border-border-primary p-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="min-w-0">
      <p class="font-semibold text-navy-700">{{ title }}</p>
      <p class="mt-0.5 text-sm text-text-secondary">{{ hint }}</p>
    </div>
    <!-- En columna para que en móvil un botón ocupe todo el ancho, como si fuera
         hijo directo de la fila; un interruptor mantiene su tamaño. -->
    <div class="flex flex-shrink-0 flex-col">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Una acción de los ajustes de una clase: qué hace y una pista a la izquierda,
 * y su control (un botón, un interruptor…) a la derecha, en el hueco `#action`.
 * En móvil el control baja debajo del texto. La usan las filas de Gestión
 * (publicar como plantilla, duplicar) y la de salir de la clase en Profesorado.
 */
defineProps<{
  title: string
  hint: string
}>()
</script>
