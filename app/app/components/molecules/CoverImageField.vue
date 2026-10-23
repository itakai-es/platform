<template>
  <!-- La imagen de una clase o de una misión: vista previa y, al lado, generar
       con IA, subir la propia o quitarla. -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
    <div
      class="relative h-28 w-full flex-shrink-0 overflow-hidden rounded-xl bg-navy-700/5 sm:w-40"
    >
      <img v-if="image" :src="getImageUrl(image)" alt="" class="h-full w-full object-cover" />
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-xs text-text-secondary"
      >
        <PhotoIcon class="h-8 w-8 opacity-40" aria-hidden="true" />
      </div>
      <div
        v-if="generating"
        class="absolute inset-0 flex items-center justify-center bg-navy-700/60"
      >
        <Spinner size="sm" class="text-white" />
      </div>
    </div>

    <div class="flex flex-1 flex-wrap gap-2">
      <Button
        type="button"
        variant="primary"
        size="sm"
        :icon-left="SparklesIcon"
        :loading="generating"
        :disabled="generating || disabled"
        @click="emit('generate')"
      >
        {{ image ? regenerateLabel : generateLabel }}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :icon-left="ArrowUpTrayIcon"
        :disabled="generating || disabled"
        @click="fileRef?.click()"
      >
        {{ uploadLabel }}
      </Button>
      <Button
        v-if="image"
        type="button"
        variant="ghost"
        size="sm"
        :icon-left="TrashIcon"
        :disabled="generating || disabled"
        @click="emit('clear')"
      >
        {{ clearLabel }}
      </Button>
      <input
        ref="fileRef"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        @change="emit('upload', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpTrayIcon, PhotoIcon, SparklesIcon, TrashIcon } from '@heroicons/vue/24/outline'

/**
 * Elegir la imagen de portada (de una clase o de una misión). No sube ni genera
 * nada: avisa con `generate`, `upload` (el evento del selector de ficheros) y
 * `clear`, y quien la usa hace el trabajo y le pasa la imagen y `generating`.
 */
defineProps<{
  /** Ruta de la imagen guardada (se resuelve con getImageUrl). */
  image?: string | null
  generating?: boolean
  disabled?: boolean
  generateLabel: string
  regenerateLabel: string
  uploadLabel: string
  clearLabel: string
}>()

const emit = defineEmits<{
  generate: []
  upload: [event: Event]
  clear: []
}>()

const { getImageUrl } = useImageUrl()
const fileRef = ref<HTMLInputElement | null>(null)
</script>
