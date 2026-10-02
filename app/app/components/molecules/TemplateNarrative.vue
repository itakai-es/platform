<template>
  <div class="space-y-4">
    <!-- La portada es decorativa: el nombre ya está en el título de encima (el
         de la ficha o el de la previsualización), y repetirlo aquí solo haría
         que un lector de pantalla lo leyera dos veces. -->
    <div v-if="template.backgroundImage" class="overflow-hidden rounded-2xl">
      <img
        :src="getImageUrl(template.backgroundImage) || undefined"
        alt=""
        class="h-56 w-full object-cover"
      />
    </div>
    <!-- eslint-disable vue/no-v-html -- la narrativa la pinta `renderMarkdown`,
         que la sanea con DOMPurify -->
    <div
      v-if="template.narrative"
      class="md-rendered rounded-2xl bg-white p-6 shadow-sm"
      v-html="renderedNarrative"
    />
    <!-- eslint-enable vue/no-v-html -->
    <EmptyState
      v-else
      :icon="BookOpenIcon"
      :title="t('teacher.templates.preview.no_narrative_title')"
      :description="t('teacher.templates.preview.no_narrative_description')"
    />
  </div>
</template>

<script setup lang="ts">
import { BookOpenIcon } from '@heroicons/vue/24/outline'
import { renderMarkdown } from '~/utils/markdown'
import type { TemplateStory } from '~/types/template.types'

/**
 * La historia de una plantilla: su portada y su narrativa en Markdown. Es la
 * misma pieza en la pestaña «Historia» de la previsualización del profesorado
 * y en la ficha pública, así que la historia se lee igual en las dos, y con el
 * mismo `.md-rendered` que la historia de la propia clase: listas con sus
 * viñetas y sus números, como al importarla.
 *
 * Los títulos de la historia salen como `h3` (`renderMarkdown` rebaja los `h1`
 * y los `h2`): en la ficha pública cuelgan de su `h2` «Historia».
 */

const props = defineProps<{ template: TemplateStory }>()

const { t } = useI18n()
const { getImageUrl } = useImageUrl()

const renderedNarrative = computed(() =>
  props.template.narrative ? renderMarkdown(props.template.narrative) : ''
)
</script>
