<template>
  <!-- Nota informativa discreta: icono y texto sobre fondo suave. -->
  <p class="flex items-start gap-2 rounded-xl bg-navy-700/5 px-3 py-2.5 text-sm text-navy-700/80">
    <InformationCircleIcon
      class="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-700/50"
      aria-hidden="true"
    />
    <span><slot /></span>
  </p>
</template>

<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
</script>
