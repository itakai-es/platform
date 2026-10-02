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
      <slot name="badge" />
    </div>

    <!-- Contenido -->
    <div class="flex flex-1 flex-col p-6">
      <component
        :is="`h${headingLevel}`"
        class="text-lg font-bold leading-tight text-navy-700 md:text-xl"
      >
        {{ template.name }}
      </component>

      <TemplateMetaBadges :template="template" class="mt-3" />

      <p class="mt-3 flex-1 text-sm text-text-secondary"><slot name="description" /></p>

      <div class="mt-4 flex gap-2">
        <slot name="actions" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { TemplateCardData } from '~/types/template.types'

/**
 * La tarjeta de una plantilla, la misma en el catálogo del profesorado y en el
 * público: portada, nombre y metadatos educativos. Lo que cambia entre los dos
 * va por ranuras:
 *
 * - `badge`: una marca sobre la portada (la del profesorado, «Tuya»);
 * - `description`: la línea bajo los metadatos (quién la publicó, para el
 *   profesorado; el principio de la historia, en el público, que no dice nada
 *   de quien la publicó);
 * - `actions`: los botones del pie (previsualizar e importar; o ver la ficha).
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

const { getImageUrl } = useImageUrl()
</script>
