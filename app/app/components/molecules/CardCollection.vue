<template>
  <!-- Contenedor de listado que alterna entre cuadrícula y lista vertical según
       el modo de vista. Las tarjetas se pasan por el slot por defecto. -->
  <CardGrid v-if="view === 'grid'" :cols="cols">
    <slot />
  </CardGrid>
  <CardList v-else>
    <slot />
  </CardList>
</template>

<script setup lang="ts">
import type { ViewMode } from '~/composables/useViewMode'

withDefaults(
  defineProps<{
    view: ViewMode
    cols?: 'auto' | '2' | '2-wide' | '2x2' | '3' | '3-fixed' | '4' | '6'
  }>(),
  { cols: 'auto' }
)
</script>
