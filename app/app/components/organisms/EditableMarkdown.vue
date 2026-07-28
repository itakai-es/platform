<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- Modo edición: editor Markdown (split) sobre un borrador local. -->
    <MarkdownEditor
      v-if="editing"
      v-model="draft"
      class="min-h-0 flex-1"
      :god-name="godName"
      :god-avatar="godAvatar"
      :ai-placeholder="aiPlaceholder"
      :context-label="contextLabel"
      :ai-modal-hint="aiModalHint"
      :ai-system-context="aiSystemContext"
      :ai-enabled="aiEnabled"
      @save="onSave"
      @cancel="editing = false"
    />
    <!-- Modo vista: lo aporta el consumidor; recibe edit() para abrir el editor. -->
    <slot v-else :edit="startEdit" :editing="editing" />
  </div>
</template>

<script setup lang="ts">
/**
 * EditableMarkdown - Toggle ver/editar alrededor del MarkdownEditor.
 *
 * Muestra el contenido vía slot hasta que se invoca `edit()`; entonces abre el
 * editor sobre un borrador local. Al Guardar emite `update:modelValue`; al
 * Cancelar descarta el borrador. Pensado para editar historia/guía dentro del
 * asistente sin persistir nada hasta el final del flujo.
 */
const props = defineProps<{
  modelValue: string
  godName: string
  godAvatar: string
  aiPlaceholder?: string
  contextLabel?: string
  aiModalHint?: string
  aiSystemContext?: string
  aiEnabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editing = ref(false)
const draft = ref('')

function startEdit() {
  draft.value = props.modelValue
  editing.value = true
}

function onSave(content: string) {
  emit('update:modelValue', content)
  editing.value = false
}
</script>
