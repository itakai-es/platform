<template>
  <Modal
    :model-value="modelValue"
    :title="t('common.accessibility.title')"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <AccessibilityControls />
  </Modal>
</template>

<script setup lang="ts">
/**
 * Los ajustes de accesibilidad en una ventana. La usan los menús laterales y
 * móviles, donde un desplegable no cabe: en el móvil la ventana ocupa casi todo
 * el ancho y los controles se leen enteros.
 */
defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { t } = useI18n()
</script>
