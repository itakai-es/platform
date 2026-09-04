<template>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <title v-if="label">{{ label }}</title>
    <!-- Monocromo: estrella con el color del texto (para badges sólidos) -->
    <path
      v-if="mono"
      d="M12 17.27 18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21Z"
      fill="currentColor"
    />
    <!-- Estrella de XP de 5 puntas (morada, 2 tonos) -->
    <template v-else>
      <path
        d="M12 17.27 18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21Z"
        style="fill: var(--color-purple-active)"
      />
      <path
        d="M12 17.27 18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21Z"
        style="fill: var(--color-purple)"
        transform="translate(12 12) scale(0.68) translate(-12 -12)"
      />
    </template>
  </svg>
</template>

<script setup lang="ts">
// Estrella de XP. `mono` la pinta con currentColor (para badges sólidos).
// `label` muestra un tooltip al pasar el ratón. Tamaño vía clase (w-4 h-4, etc.).
withDefaults(defineProps<{ mono?: boolean; label?: string }>(), { mono: false })
</script>
