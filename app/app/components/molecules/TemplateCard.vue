<template>
  <article
    class="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl"
  >
    <!-- Portada -->
    <div class="relative h-40 flex-shrink-0">
      <div
        v-if="template.backgroundImage"
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${getImageUrl(template.backgroundImage) || ''})` }"
      />
      <div v-else class="absolute inset-0 bg-gray-100" />
      <!-- Recomendada, a la izquierda: a la derecha va la marca de la ranura -->
      <TemplateRecommendedBadge v-if="template.recommended" class="absolute left-3 top-3" />
      <slot name="badge" />
    </div>

    <!-- Contenido -->
    <div class="flex flex-1 flex-col p-6">
      <!-- Junto al nombre, el enlace de su ficha, que es el que se comparte: el
           mismo en los dos catálogos, sin quitarle sitio a sus botones. -->
      <div class="flex items-start justify-between gap-2">
        <component
          :is="`h${headingLevel}`"
          class="min-w-0 text-lg font-bold leading-tight text-navy-700 md:text-xl"
        >
          {{ template.name }}
        </component>
        <IconButton
          :icon="LinkIcon"
          :label="t('common.templates.copy_link_named', { name: template.name })"
          :title="t('common.templates.copy_link')"
          class="-mr-2 -mt-1 flex-shrink-0"
          @click="copyTemplateLink(template.id)"
        />
      </div>

      <TemplateMetaBadges :template="template" class="mt-3" />

      <p class="mt-3 flex-1 text-sm text-text-secondary"><slot name="description" /></p>

      <div class="mt-4 flex gap-2">
        <slot name="actions" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { LinkIcon } from '@heroicons/vue/24/outline'
import type { TemplateCardData } from '~/types/template.types'

/**
 * La tarjeta de una plantilla, la misma en el catálogo del profesorado y en el
 * público: portada, nombre y metadatos educativos. Lo que cambia entre los dos
 * va por ranuras:
 *
 * - `badge`: una marca sobre la portada, a la derecha (la del profesorado,
 *   «Tuya»); a la izquierda va la de recomendada, que es de las dos;
 * - `description`: la línea bajo los metadatos (quién la publicó, para el
 *   profesorado; el principio de la historia, en el público, que no dice nada
 *   de quien la publicó);
 * - `actions`: los botones del pie (previsualizar e importar; o ver la ficha).
 *
 * Junto al nombre va siempre el botón de copiar el enlace de su ficha pública.
 */

withDefaults(
  defineProps<{
    template: TemplateCardData
    /**
     * Nivel del título. El catálogo del profesorado salta del título de la
     * página a las tarjetas con `h3`; el público va con `h2`, sin saltos.
     */
    headingLevel?: 2 | 3
  }>(),
  { headingLevel: 3 }
)

const { t } = useI18n()
const { getImageUrl } = useImageUrl()
const { copyTemplateLink } = useTemplateLink()
</script>
