<template>
  <Button
    v-if="item.href && item.actionLabel"
    :to="item.href"
    variant="primary"
    full-width
    :icon-right="ArrowRightIcon"
  >
    {{ item.actionLabel }}
  </Button>
</template>

<script setup lang="ts">
import { ArrowRightIcon } from '@heroicons/vue/24/outline'
import type { MissionMapItem } from '~/utils/mission-map'

/**
 * El botón principal del detalle de una misión del mapa («Empezar»,
 * «Continuar», «Ver misión», «Abrir misión»). Va al final del panel de al
 * lado (MissionMapDetail) y, en el móvil, en el pie de la hoja inferior
 * (MissionMap.vue), para que se vea siempre. Una cerrada no tiene.
 */
defineProps<{ item: Pick<MissionMapItem, 'href' | 'actionLabel'> }>()
</script>
