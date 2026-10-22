<template>
  <!-- Quien edita: un botón que se marca (aria-pressed) y se puede arrastrar -->
  <button
    v-if="interactive"
    type="button"
    :aria-pressed="pressed"
    draggable="true"
    class="inline-flex max-w-full items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-navy-700 focus:ring-offset-1"
    :class="
      pressed
        ? 'border-navy-700 bg-navy-700 text-white'
        : 'cursor-grab border-border-primary bg-white text-navy-700 hover:border-navy-700/40 hover:bg-navy-700/5'
    "
    @click="emit('toggle')"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend')"
  >
    <Avatar :src="avatar" :username="name" size="xs" alt="" class="flex-shrink-0" />
    <span class="min-w-0 truncate">{{ name }}</span>
    <CheckIcon v-if="pressed" class="h-4 w-4 flex-shrink-0" aria-hidden="true" />
  </button>
  <span
    v-else
    class="inline-flex max-w-full items-center gap-2 rounded-full border border-border-primary bg-white py-1 pl-1 pr-3 text-sm font-medium text-navy-700"
  >
    <Avatar :src="avatar" :username="name" size="xs" alt="" class="flex-shrink-0" />
    <span class="min-w-0 truncate">{{ name }}</span>
  </span>
</template>

<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/outline'

/**
 * Una persona en la vista de equipos. Con `interactive`, se toca para elegirla
 * (y luego «Poner aquí» en un equipo) o se arrastra; si no, solo se ve.
 */
defineProps<{
  name: string
  avatar?: string
  pressed?: boolean
  interactive?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  dragstart: [event: DragEvent]
  dragend: []
}>()
</script>
