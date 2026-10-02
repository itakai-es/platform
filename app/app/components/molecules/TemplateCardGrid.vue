<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
    <!-- Cargando: los huecos de las tarjetas, en la misma rejilla -->
    <template v-if="skeleton">
      <MissionCardSkeleton v-for="n in skeleton" :key="n" />
    </template>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
/**
 * La rejilla de tarjetas de los catálogos de plantillas (`TemplateCard`), la
 * misma en el del profesorado y en el público. Con `skeleton` pinta ese número
 * de huecos mientras llegan las plantillas.
 */

defineProps<{
  /** Cuántos huecos pintar mientras carga; sin él, las tarjetas de la ranura. */
  skeleton?: number
}>()
</script>
