<template>
  <div class="grid gap-2" :class="columnsClass" role="group" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
      :class="
        modelValue === option.value
          ? 'border-navy-700 bg-navy-700 text-white'
          : 'border-border-primary bg-surface text-navy-700 hover:bg-gray-50'
      "
      :aria-pressed="modelValue === option.value"
      @click="emit('update:modelValue', option.value)"
    >
      <slot name="option" :option="option" :selected="modelValue === option.value">
        {{ option.label }}
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
/**
 * Grupo de opciones excluyentes en forma de píldoras.
 *
 * Es el patrón que ya usaba el selector de «Menú superior» del perfil, repetido
 * en las dos páginas de perfil; vive aquí para que cualquier ajuste corto
 * (accesibilidad, menú…) lo comparta en lugar de volver a copiarlo.
 */
interface Props {
  modelValue: T
  options: { value: T; label: string }[]
  /** Columnas de la rejilla. Por defecto, una por opción. */
  columns?: number
  ariaLabel?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

// Las clases van explícitas y no interpoladas: Tailwind escanea el fuente y no
// generaría `grid-cols-N` si el número se construyera en tiempo de ejecución.
const COLUMN_CLASSES: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

const columnsClass = computed(
  () => COLUMN_CLASSES[props.columns ?? props.options.length] ?? 'grid-cols-3'
)
</script>
