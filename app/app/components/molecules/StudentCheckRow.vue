<template>
  <!-- Una persona en una fila: la misma en el selector de estudiantes, los equipos,
       la confirmación y la lista de la ruleta. Con `selectable`, lleva su casilla;
       la ranura `action` pone un botón a la derecha y `leading` cambia el avatar. -->
  <div
    class="flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors"
    :class="
      checked
        ? 'border-navy-700/40 bg-navy-700/5'
        : muted
          ? 'border-border-primary bg-navy-700/5'
          : 'border-border-primary bg-white'
    "
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
      <slot name="leading">
        <Avatar :src="avatar" :username="name" size="xs" alt="" class="flex-shrink-0" />
      </slot>
      <span class="min-w-0 flex-1">
        <span
          class="block truncate font-medium"
          :class="muted ? 'text-navy-700/60 line-through' : 'text-navy-700'"
          >{{ name }}</span
        >
        <span v-if="sub" class="block truncate text-xs text-navy-700/70">{{ sub }}</span>
      </span>
      <span v-if="hint" class="flex-shrink-0 text-xs text-navy-700/70">{{ hint }}</span>
    </component>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** Id de la casilla (único en la página). */
  id: string
  name: string
  avatar?: string
  /** Segunda línea, más pequeña (el nombre bajo el alias, un estado…). */
  sub?: string
  hint?: string
  checked?: boolean
  selectable?: boolean
  disabled?: boolean
  /** Fuera por ahora (tachado y en gris), como quien ya ha salido en la ruleta. */
  muted?: boolean
}>()

const emit = defineEmits<{ 'update:checked': [value: boolean] }>()
</script>
