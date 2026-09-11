<template>
  <div class="overflow-hidden rounded-2xl bg-surface shadow-lg">
    <Skeleton height="h-44 md:h-64" />
    <div class="space-y-3 p-5 md:p-8">
      <Skeleton width="w-32" height="h-3" custom-class="mb-6" />
      <Skeleton width="w-1/2" height="h-6" custom-class="mb-4" />
      <Skeleton height="h-3" />
      <Skeleton height="h-3" />
      <Skeleton width="w-5/6" height="h-3" />
      <Skeleton width="w-2/3" height="h-3" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * El hueco del cuerpo de un artículo mientras llega.
 *
 * Tiene la silueta de la tarjeta real —portada en 5:2 y el texto debajo—, y
 * sirve tanto para la primera carga como para el cambio de un artículo a otro,
 * donde el lateral y la cabecera se quedan quietos porque no cambian.
 */
</script>
