<template>
  <div
    role="group"
    :aria-label="label"
    class="grid justify-items-center gap-2 transition-opacity sm:gap-4"
    :class="disabled ? 'opacity-50' : ''"
  >
    <SelectionCard
      v-for="option in options"
      :key="option.id"
      :image="getImageUrl(option.src)"
      :title="option.name"
      :subtitle="option.trait"
      :selected="modelValue === option.src"
      :bg-color="cardBg"
      :disabled="disabled"
      @click="emit('update:modelValue', option.src)"
    />
  </div>
</template>

<script setup lang="ts">
import type { StudentAvatarOption } from '~/composables/useStudentAvatarCatalog'

/**
 * Rejilla para elegir un avatar del alumnado: los personajes del catálogo y, si
 * se pasa, el generado con IA de esa matrícula. El valor es la ruta que se
 * guarda. Las columnas las pone quien la usa (cambian con el hueco).
 */
withDefaults(
  defineProps<{
    modelValue: string | null
    options: StudentAvatarOption[]
    /** Nombre del grupo para el lector de pantalla. */
    label: string
    disabled?: boolean
    /** Fondo del círculo de cada personaje. */
    cardBg?: string
  }>(),
  { disabled: false, cardBg: 'bg-white' }
)

const emit = defineEmits<{ 'update:modelValue': [src: string] }>()

const { getImageUrl } = useImageUrl()
</script>
