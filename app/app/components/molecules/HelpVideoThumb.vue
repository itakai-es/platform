<template>
  <span
    class="relative block aspect-video overflow-hidden bg-[#03003C]"
    :class="rounded ? 'rounded-xl' : ''"
    :style="fallbackStyle"
  >
    <img
      v-if="src && !failed"
      :src="src"
      alt=""
      loading="lazy"
      class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      @error="failed = true"
    />
    <span v-else-if="icon" class="absolute inset-0 flex items-center justify-center">
      <HelpCategoryIcon :icon="icon" size="xl" on-card />
    </span>

    <!-- Play: dice que es un vídeo antes de abrirlo -->
    <span
      v-if="video"
      class="absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <span
        class="flex items-center justify-center rounded-full bg-[#03003C]/70 text-white ring-2 ring-white/80 transition-colors duration-200 group-hover:bg-purple"
        :class="small ? 'h-8 w-8' : 'h-12 w-12'"
      >
        <PlayIcon :class="small ? 'ml-0.5 h-4 w-4' : 'ml-1 h-6 w-6'" />
      </span>
    </span>

    <span
      v-if="video && duration"
      class="absolute bottom-1.5 right-1.5 rounded-md bg-[#03003C]/85 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
    >
      <span aria-hidden="true">{{ formatVideoTime(duration) }}</span>
      <span class="sr-only">{{ t('common.help.duration', { time: formatVideoTime(duration) }) }}</span>
    </span>
    <span v-if="progress > 0" class="absolute inset-x-0 bottom-0 h-1 bg-[#03003C]/80" aria-hidden="true">
      <span class="block h-full bg-mint" :style="{ width: `${progress * 100}%` }" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { PlayIcon } from '@heroicons/vue/24/solid'
import { helpCardType } from '~/utils/help-accents'
import { formatVideoTime } from '~/utils/help-video'

/**
 * Miniatura 16:9 de un artículo o de un curso, como en una lista de vídeos:
 * la portada, un play si hay vídeo y la duración abajo a la derecha. Sin
 * imagen (o si no carga), el color de la categoría o del curso con su icono.
 * Es decorativa: el enlace que la envuelve ya lleva el título.
 */

const props = withDefaults(
  defineProps<{
    src?: string | null
    video?: boolean
    duration?: number | null
    /** Color de respaldo (tipo de `Card`) y su icono, si no hay imagen. */
    accent?: string | null
    icon?: string | null
    small?: boolean
    rounded?: boolean
    /** Fracción reproducida del vídeo, de 0 a 1. */
    progress?: number
  }>(),
  { src: null, video: false, duration: null, accent: null, icon: null, small: false, rounded: true, progress: 0 }
)

const { t } = useI18n()

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  }
)

const fallbackStyle = computed(() =>
  props.accent && (!props.src || failed.value)
    ? { backgroundColor: `var(--color-card-${helpCardType(props.accent)})` }
    : undefined
)
</script>
