<template>
  <!-- Selector de layout. Mantiene la API pública original y delega el render en
       la variante correspondiente; toda la lógica vive en useMissionCard. -->
  <MissionCardRow
    v-if="layout === 'list'"
    v-bind="cardProps"
    @click="$emit('click')"
  />
  <MissionCardGrid v-else v-bind="cardProps" @click="$emit('click')" />
</template>

<script setup lang="ts">
import type { ViewMode } from '~/composables/useViewMode'
import type { MissionCardProps } from '~/composables/useMissionCard'

const props = withDefaults(defineProps<MissionCardProps & { layout?: ViewMode }>(), {
  layout: 'grid',
})

defineEmits<{ click: [] }>()

// Reenvía todas las props de la tarjeta a la variante activa, sin `layout`.
const cardProps = computed(() => {
  const { layout: _layout, ...rest } = props
  return rest
})
</script>
