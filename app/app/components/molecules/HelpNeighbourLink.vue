<template>
  <NuxtLink
    :to="to"
    class="group flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 shadow-lg transition-shadow hover:shadow-xl"
    :class="[
      primary ? 'bg-navy-700' : 'bg-surface',
      direction === 'next' ? 'flex-row-reverse text-right sm:col-start-2' : '',
    ]"
  >
    <!-- Con vídeo, su carátula: se reconoce la lección antes de leer el título -->
    <HelpVideoThumb
      v-if="article.hasVideo"
      :src="getImageUrl(article.coverImage)"
      video
      small
      :duration="article.videoDuration"
      :accent="accent"
      :icon="icon"
      class="w-28 shrink-0 sm:w-36"
    />
    <component
      :is="direction === 'next' ? ArrowRightIcon : ArrowLeftIcon"
      v-else
      class="mx-1 h-4 w-4 shrink-0 transition-colors"
      :class="primary ? 'text-white' : 'text-navy-700/40 group-hover:text-purple'"
    />

    <span class="min-w-0 flex-1">
      <span
        class="flex items-center gap-1 text-xs font-medium"
        :class="[
          primary ? 'text-white/80' : 'text-navy-700/70',
          direction === 'next' ? 'justify-end' : '',
        ]"
      >
        <ArrowLeftIcon v-if="article.hasVideo && direction === 'prev'" class="h-3.5 w-3.5" />
        {{ label }}
        <ArrowRightIcon v-if="article.hasVideo && direction === 'next'" class="h-3.5 w-3.5" />
      </span>
      <span
        class="mt-0.5 line-clamp-2 block text-sm font-semibold leading-snug"
        :class="primary ? 'text-white' : 'text-navy-700'"
      >
        {{ article.title }}
      </span>
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import type { HelpArticleCard } from '~/types/help.types'

/**
 * Anterior o siguiente al pie de un artículo: en un curso, las lecciones; fuera,
 * los artículos de la categoría. Si el artículo tiene vídeo lleva su carátula,
 * como la siguiente pieza de una lista de reproducción.
 */

withDefaults(
  defineProps<{
    to: string
    label: string
    article: Pick<HelpArticleCard, 'title' | 'coverImage' | 'hasVideo' | 'videoDuration'>
    direction: 'prev' | 'next'
    /** El paso natural (siguiente lección): en navy, para que destaque. */
    primary?: boolean
    accent?: string | null
    icon?: string | null
  }>(),
  { primary: false, accent: null, icon: null }
)

const { getImageUrl } = useImageUrl()
</script>
