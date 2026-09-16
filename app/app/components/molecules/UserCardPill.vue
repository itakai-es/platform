<template>
  <button
    type="button"
    class="mt-2 inline-flex items-center gap-1.5 rounded-full border border-navy-700/20 px-3 py-1 text-xs font-medium text-navy-700 transition-colors hover:bg-navy-700/5"
  >
    <component :is="icon" class="h-3.5 w-3.5" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * La píldora de acción de la tarjeta de usuario de la barra lateral («Ver
 * como alumno»). Lo demás (`@click`, `aria-label`) cae en la raíz.
 */
defineProps<{
  icon: Component
}>()
</script>
