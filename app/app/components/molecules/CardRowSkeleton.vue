<template>
  <!-- Skeleton para la vista lista: miniatura a la izquierda y líneas de texto.
       Reutilizable por cualquier listado (clases, misiones, etc.). -->
  <div class="flex min-h-[6.5rem] overflow-hidden rounded-2xl bg-white shadow-sm">
    <div
      class="w-24 xs:w-28 sm:w-40 flex-shrink-0"
      :style="{ backgroundColor: 'var(--color-skeleton)' }"
    />
    <div class="flex flex-1 flex-col justify-center gap-2 p-4">
      <Skeleton width="w-1/2" height="h-5" />
      <Skeleton width="w-2/3" height="h-4" />
      <Skeleton width="w-1/3" height="h-4" />
    </div>
  </div>
</template>

<script setup lang="ts"></script>
