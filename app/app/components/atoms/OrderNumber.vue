<template>
  <!-- La posición de un elemento en una lista ordenable (pistas, misiones). Es
       decorativa: el número lo dice el texto de la fila o el de su asa. -->
  <span
    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white"
    aria-hidden="true"
  >
    {{ value }}
  </span>
</template>

<script setup lang="ts">
defineProps<{ value: number }>()
</script>
