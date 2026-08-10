<template>
  <div class="flex flex-wrap gap-2">
    <Button
      :variant="modelValue === 'active' ? 'primary' : 'outline'"
      size="sm"
      @click="$emit('update:modelValue', 'active')"
    >
      {{ activeLabel }} ({{ activeCount }})
    </Button>
    <Button
      :variant="modelValue === 'archived' ? 'primary' : 'outline'"
      size="sm"
      @click="$emit('update:modelValue', 'archived')"
    >
      {{ archivedLabel }} ({{ archivedCount }})
    </Button>
  </div>
</template>

<script setup lang="ts">
/**
 * Conmutador Activos/Archivados. Las etiquetas llegan traducidas desde la página
 * porque cambian de género según la entidad (clases archivadas / alumnos archivados).
 */
defineProps<{
  modelValue: 'active' | 'archived'
  activeCount: number
  archivedCount: number
  activeLabel: string
  archivedLabel: string
}>()

defineEmits<{
  'update:modelValue': [value: 'active' | 'archived']
}>()
</script>
