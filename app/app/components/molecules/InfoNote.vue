<template>
  <!-- Nota informativa discreta: icono y texto sobre fondo suave. Sobre una sección
       de color (las de la misión), `on-color` la pone en blanco para que no se enturbie. -->
  <p
    class="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm text-navy-700/80"
    :class="onColor ? 'bg-white' : 'bg-navy-700/5'"
  >
    <InformationCircleIcon
      class="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-700/50"
      aria-hidden="true"
    />
    <span><slot /></span>
  </p>
</template>

<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'

defineProps<{
  /** Va sobre un fondo de color (una sección de la misión): fondo blanco. */
  onColor?: boolean
}>()
</script>
