<template>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <title v-if="label">{{ label }}</title>
    <circle cx="12" cy="12" r="11" fill="#E6A700" />
    <circle cx="12" cy="12" r="9" fill="#FFCE3A" />
    <circle cx="12" cy="12" r="9" style="stroke: var(--color-yellow-hover)" stroke-width="1" />
    <path
      d="M12 7c.4 3 1.9 4.6 5 5-3.1.4-4.6 2-5 5-.4-3-1.9-4.6-5-5 3.1-.4 4.6-2 5-5z"
      fill="#C8870A"
    />
  </svg>
</template>

<script setup lang="ts">
// Moneda dorada del sistema de recompensas. `label` muestra un tooltip al pasar
// el ratón. Tamaño vía clase (w-4 h-4, etc.).
defineProps<{ label?: string }>()
</script>
