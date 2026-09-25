<template>
  <section class="rounded-2xl bg-white p-4 shadow-lg sm:p-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h3 class="font-semibold text-navy-700">{{ title }}</h3>
        <p v-if="hint" class="mt-0.5 text-sm text-text-secondary">{{ hint }}</p>
      </div>
      <div v-if="$slots.actions" class="flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <div :class="['mt-4', bodyClass]">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Una sección de los ajustes de una clase: la tarjeta blanca con su título, una
 * pista opcional y, a la derecha del título, sus acciones (`#actions`). Todas
 * las pestañas de Ajustes se componen de estas secciones, para que al pasar de
 * una a otra se vean iguales.
 */
withDefaults(
  defineProps<{
    title: string
    hint?: string
    /** Espaciado entre los hijos del cuerpo. */
    bodyClass?: string
  }>(),
  { hint: undefined, bodyClass: 'space-y-4' }
)
</script>
