<template>
  <div>
    <div
      v-if="embed.type === 'iframe'"
      class="aspect-video overflow-hidden bg-navy-700"
      :class="rounded ? 'rounded-2xl' : ''"
    >
      <iframe
        :src="embed.src"
        class="h-full w-full"
        allow="fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        :title="videoTitle"
      />
    </div>

    <HelpVideoPlayer
      v-else-if="embed.type === 'file'"
      :src="embed.src"
      :title="videoTitle"
      :poster="poster"
      :rounded="rounded"
      :autoplay="autoplay"
      :start-at="startAt"
      :exit-fullscreen-on-end="exitFullscreenOnEnd"
      @ended="emit('ended')"
      @progress="(current, duration) => emit('progress', current, duration)"
    />

    <Button
      v-else
      variant="outline"
      size="sm"
      :icon-left="PlayCircleIcon"
      :href="embed.src"
      target="_blank"
    >
      {{ t('common.help.watch_video') }}
      <span class="sr-only">{{ t('common.accessibility.opens_new_tab') }}</span>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { PlayCircleIcon } from '@heroicons/vue/24/outline'
import { videoEmbed } from '~/utils/help-video'

/**
 * El vídeo de un artículo del centro de ayuda.
 *
 * Va fuera del markdown a propósito: el saneado del cuerpo quita los iframes,
 * y así tiene que seguir. YouTube y Vimeo se incrustan (YouTube sin cookies:
 * el producto es para menores); un fichero directo se reproduce con el
 * reproductor propio de la ayuda (`HelpVideoPlayer`: velocidad, subtítulos y
 * sin descarga); cualquier otra URL se abre en una pestaña nueva.
 * También lo usa el editor del panel para comprobar la URL al escribirla.
 *
 * `title` da nombre al marco y al reproductor para el lector de pantalla;
 * suele ser el título del artículo, y nunca se queda vacío.
 */

const props = withDefaults(
  defineProps<{
    url: string
    title?: string
    /** Póster del vídeo directo: la miniatura del artículo. */
    poster?: string | null
    /** Esquinas redondeadas; sin ellas cuando hace de portada de una tarjeta. */
    rounded?: boolean
    /** Solo con fichero propio: arranca solo, retoma y sale de pantalla completa al acabar. */
    autoplay?: boolean
    startAt?: number
    exitFullscreenOnEnd?: boolean
  }>(),
  { title: '', poster: null, rounded: true, autoplay: false, startAt: 0, exitFullscreenOnEnd: false }
)

const emit = defineEmits<{ ended: []; progress: [current: number, duration: number] }>()

const { t } = useI18n()

const embed = computed(() => videoEmbed(props.url))

const videoTitle = computed(() => props.title.trim() || t('common.help.kind.video'))
</script>
