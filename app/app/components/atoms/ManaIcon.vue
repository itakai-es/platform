<template>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <title v-if="label">{{ label }}</title>
    <!-- Monocromo: una sola gota con el color del texto (para badges sólidos) -->
    <path
      v-if="mono"
      d="M12 2 C12 2 19 10.5 19 15 A7 7 0 1 1 5 15 C5 10.5 12 2 12 2 Z"
      fill="currentColor"
    />
    <!-- Gota de maná (estilo LoL): azul, con punta arriba y base redondeada -->
    <template v-else>
      <path d="M12 2 C12 2 19 10.5 19 15 A7 7 0 1 1 5 15 C5 10.5 12 2 12 2 Z" style="fill: var(--color-sky-active)" />
      <path d="M12 4.4 C12 4.4 17 11 17 15 A5 5 0 1 1 7 15 C7 11 12 4.4 12 4.4 Z" style="fill: var(--color-sky)" />
      <ellipse
        cx="9.6"
        cy="16"
        rx="1.5"
        ry="2.3"
        fill="#ffffff"
        opacity="0.55"
        transform="rotate(-22 9.6 16)"
      />
    </template>
  </svg>
</template>

<script setup lang="ts">
// Gota de maná. `mono` la pinta con currentColor (para badges sólidos donde
// la versión azul no contrastaría). `label` muestra un tooltip al pasar el ratón.
// Tamaño vía clase (w-4 h-4, etc.).
withDefaults(defineProps<{ mono?: boolean; label?: string }>(), { mono: false })
</script>
