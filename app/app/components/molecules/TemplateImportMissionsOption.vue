<template>
  <div>
    <Checkbox
      :id="checkboxId"
      :model-value="modelValue"
      :disabled="disabled"
      :label="t('common.templates.use.import_missions', { count }, count)"
      :described-by="hintId"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <p :id="hintId" class="ml-6 mt-0.5 text-xs text-navy-700/70">
      {{ t('common.templates.use.import_missions_hint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Junto a «Importar» de una plantilla que trae misiones: si vienen con ella, y
 * cómo llegan (sin fecha límite, que era del calendario de quien la publicó, y
 * sin documentos ni insignias). Es la misma casilla en la ficha pública y en
 * la previsualización del profesorado; quien la usa la deja marcada de entrada.
 */

defineProps<{
  modelValue: boolean
  /** Cuántas misiones trae la plantilla. */
  count: number
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { t } = useI18n()

const checkboxId = useId()
const hintId = useId()
</script>
