<template>
  <div>
    <div class="mb-1.5 flex items-center justify-between gap-3">
      <component
        :is="nativeControl ? 'label' : 'span'"
        :id="labelId"
        :for="nativeControl ? controlId : undefined"
        class="block text-sm font-medium text-navy-700"
      >
        {{ label }}
      </component>
      <slot name="actions" />
    </div>
    <slot :id="controlId" :label-id="labelId" :describedby="describedby" />
    <p
      v-if="error"
      :id="messageId"
      role="alert"
      class="mt-1 flex items-start gap-1.5 text-sm text-navy-700"
    >
      <ExclamationCircleIcon class="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
    <p v-else-if="hint" :id="messageId" class="mt-1 text-sm text-navy-700/70">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ExclamationCircleIcon } from '@heroicons/vue/24/outline'

/**
 * Un campo del editor del centro de ayuda: etiqueta, el control que se le
 * pase y, debajo, una pista o un error. La cabecera admite acciones a la
 * derecha (`#actions`), como «Insertar imagen» junto a «Contenido».
 *
 * Es el bloque que se repetía en cada campo del editor de artículos. No usa
 * `FormField` porque aquel lleva su propio `Input`; aquí el control puede ser
 * un desplegable, un editor de markdown o unas píldoras. La pista va en navy
 * al 70 % y el error en navy con un icono rojo delante: los dos llegan al
 * contraste AA y el error no depende solo del color.
 *
 * La etiqueta queda asociada al control: el slot recibe `id` (para `Input` y
 * `TextArea`, con `native-control`, que es lo que pinta un `<label for>`),
 * `labelId` (para `aria-labelledby` en desplegables, editores y grupos de
 * píldoras; sin `native-control` la etiqueta es un `<span>`, porque un `for`
 * a un id que nadie lleva es una etiqueta colgando) y `describedby` (el `id`
 * de la pista o el error, si los hay).
 */
const props = defineProps<{
  label: string
  hint?: string
  /** Si hay error se muestra en lugar de la pista. */
  error?: string
  /** El `id` del control, si ya tiene uno; si no, se genera. */
  htmlFor?: string
  /** El slot pone `id` en un control nativo (`input`, `textarea`). */
  nativeControl?: boolean
}>()

const generatedId = useId()
const controlId = computed(() => props.htmlFor ?? `${generatedId}-control`)
const labelId = `${generatedId}-label`
const messageId = `${generatedId}-message`

const describedby = computed(() => (props.error || props.hint ? messageId : undefined))
</script>
