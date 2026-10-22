<template>
  <!-- Una persona con su casilla: la misma fila en el selector de estudiantes y en
       los equipos. Sin `selectable`, solo se ve (avatar y nombre). -->
  <div
    class="flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors"
    :class="checked ? 'border-navy-700/40 bg-navy-700/5' : 'border-border-primary'"
  >
    <Checkbox
      v-if="selectable"
      :id="id"
      :model-value="!!checked"
      :disabled="disabled"
      @update:model-value="emit('update:checked', $event)"
    />
    <component
      :is="selectable ? 'label' : 'div'"
      :for="selectable ? id : undefined"
      class="flex min-w-0 flex-1 items-center gap-3"
      :class="selectable ? 'cursor-pointer' : ''"
    >
      <Avatar :src="avatar" :username="name" size="xs" alt="" class="flex-shrink-0" />
      <span class="min-w-0 flex-1 truncate font-medium text-navy-700">{{ name }}</span>
      <span v-if="hint" class="flex-shrink-0 text-xs text-navy-700/70">{{ hint }}</span>
    </component>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** Id de la casilla (único en la página). */
  id: string
  name: string
  avatar?: string
  hint?: string
  checked?: boolean
  selectable?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:checked': [value: boolean] }>()
</script>
