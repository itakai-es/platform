<template>
  <!-- Tarjeta de archivo adjunto: icono coloreado según el formato, al estilo
       de los documentos de apoyo de las misiones. Se usa tanto en el paso de
       adjuntar (con botón de quitar) como en el resumen final (sin él). -->
  <div
    class="inline-flex items-center gap-2.5 rounded-xl border border-border-primary bg-white py-1.5 pl-1.5 pr-2"
    :title="note || ''"
  >
    <span
      class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
      :class="bgClass"
    >
      <component :is="iconComponent" class="h-5 w-5 text-white" />
    </span>
    <span class="min-w-0">
      <span class="block max-w-[200px] truncate text-sm font-medium text-navy-700">
        {{ name }}
      </span>
      <span v-if="note" class="block text-xs text-yellow-700">⚠️ {{ note }}</span>
    </span>
    <button
      v-if="removable"
      type="button"
      class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-navy-700/50 transition-colors hover:bg-navy-700/5 hover:text-navy-700"
      :title="removeLabel"
      @click="$emit('remove')"
    >
      <XMarkIcon class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { XMarkIcon, PhotoIcon, DocumentIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(
  defineProps<{
    name: string
    /** pdf | word | image | text | unsupported */
    kind: string
    /** Aviso del backend (p. ej. no se pudo extraer el texto). */
    note?: string
    removable?: boolean
    removeLabel?: string
  }>(),
  { removable: false }
)

defineEmits<{ remove: [] }>()

const iconComponent = computed(() => {
  if (props.kind === 'image') return PhotoIcon
  if (props.kind === 'word') return DocumentIcon
  return DocumentTextIcon // pdf, text y fallback
})

const bgClass = computed(() => {
  const map: Record<string, string> = {
    pdf: 'bg-red-500',
    word: 'bg-blue-500',
    image: 'bg-green-500',
    text: 'bg-navy-700',
  }
  return map[props.kind] || 'bg-gray-400' // unsupported / desconocido
})
</script>
