<template>
  <div>
    <div
      v-if="embed.type === 'iframe'"
      class="aspect-video overflow-hidden rounded-2xl bg-navy-700"
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

    <div
      v-else-if="embed.type === 'file'"
      class="aspect-video overflow-hidden rounded-2xl bg-navy-700"
    >
      <video :src="embed.src" controls class="h-full w-full" :aria-label="videoTitle" />
    </div>

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
 * reproductor del navegador; cualquier otra URL se abre en una pestaña nueva.
 * También lo usa el editor del panel para comprobar la URL al escribirla.
 *
 * `title` da nombre al marco y al reproductor para el lector de pantalla;
 * suele ser el título del artículo, y nunca se queda vacío.
 */

const props = withDefaults(defineProps<{ url: string; title?: string }>(), { title: '' })

const { t } = useI18n()

const embed = computed(() => videoEmbed(props.url))

const videoTitle = computed(() => props.title.trim() || t('common.help.kind.video'))
</script>
