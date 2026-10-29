<template>
  <!-- Una lista de misiones del mapa con su encabezado («Para abrirla,
       completa antes:»). Cada una es un botón que lleva el foco a su
       medallón; no cambia de página. -->
  <div>
    <p class="mb-1.5 text-sm font-semibold">{{ heading }}</p>
    <ul class="flex flex-wrap gap-2">
      <li v-for="mission in missions" :key="mission.id">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-navy-700/15 bg-white px-3 py-1 text-left text-sm font-medium text-navy-700 underline decoration-navy-700/30 underline-offset-2 transition-colors hover:bg-navy-700/5 hover:decoration-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
          @click="emit('go', mission.id)"
        >
          <MapPinIcon class="h-4 w-4 flex-shrink-0 text-navy-700/60" aria-hidden="true" />
          <span class="min-w-0 break-words">{{ mission.title }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { MapPinIcon } from '@heroicons/vue/24/outline'
import type { MapMissionRef } from '~/utils/mission-map'

/** Lo que abre una misión del mapa, o lo que abre ella, en el detalle (MissionMapDetail). */
defineProps<{ heading: string; missions: MapMissionRef[] }>()

const emit = defineEmits<{ go: [id: string] }>()
</script>
