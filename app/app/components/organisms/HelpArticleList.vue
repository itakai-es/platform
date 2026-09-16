<template>
  <div class="overflow-hidden rounded-2xl bg-surface shadow-lg">
    <NuxtLink
      v-for="article in articles"
      :key="article.id"
      :to="`/ayuda/${categoryOf(article).slug}/${article.slug}`"
      class="group flex items-center gap-4 border-b border-border-primary px-4 py-3.5 transition-colors last:border-b-0 hover:bg-bg-secondary"
    >
      <HelpCategoryIcon
        :icon="categoryOf(article).icon"
        :accent="categoryOf(article).accent"
        size="lg"
        class="transition-transform duration-200 group-hover:scale-105"
      />

      <span class="min-w-0 flex-1">
        <span class="flex items-baseline gap-3">
          <span class="min-w-0 font-semibold text-navy-700">{{ article.title }}</span>
          <!-- La guía es lo normal y no se etiqueta; el resto de tipos sí. -->
          <Badge
            v-if="article.kind && article.kind !== 'guia'"
            variant="common"
            size="sm"
            class="shrink-0"
          >
            {{ t(`common.help.kind.${article.kind}`) }}
          </Badge>
          <span
            v-if="showCategory"
            class="ml-auto hidden shrink-0 text-xs font-medium text-navy-700/70 sm:block"
          >
            {{ categoryOf(article).name }}
          </span>
        </span>

        <!-- eslint-disable vue/no-v-html -- `cleanSnippet` escapa todo y solo
             devuelve al HTML las marcas <em> que pone la búsqueda -->
        <span
          v-if="article.snippet"
          class="help-snippet mt-0.5 block text-sm text-navy-700/70"
          v-html="cleanSnippet(article.snippet)"
        />
        <!-- eslint-enable vue/no-v-html -->
        <!-- Título y resumen completos: son cortos y se escriben desde el panel,
             así que pasan de línea en vez de cortarse. -->
        <span v-else-if="article.summary" class="mt-0.5 block text-sm text-navy-700/70">
          {{ article.summary }}
        </span>
      </span>

      <ChevronRightIcon
        class="h-4 w-4 shrink-0 text-navy-700/40 transition-colors group-hover:text-purple"
      />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import { cleanSnippet } from '~/composables/useHelp'
import type { HelpArticleKind, HelpCategoryRef } from '~/types/help.types'

/**
 * Lista de artículos del centro de ayuda.
 *
 * La misma pieza sirve para lo más consultado, para los resultados de búsqueda
 * y para el listado de una categoría. Cada fila lleva el icono de su categoría
 * sobre el color de marca que le corresponde —el mismo que pinta su tarjeta en
 * la portada—, así que el listado se lee de un vistazo y no queda apagado.
 */

interface HelpListItem {
  id: string
  slug: string
  title: string
  summary?: string | null
  /** Fragmento con <em> que devuelve la búsqueda; manda sobre el resumen. */
  snippet?: string | null
  /** Tipo de contenido; solo se etiqueta cuando no es una guía. */
  kind?: HelpArticleKind
  /** Dentro de una categoría las filas no la repiten: llega en `category`. */
  category?: HelpCategoryRef
}

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    articles: HelpListItem[]
    /** Categoría común a todas las filas que no traigan la suya. */
    category?: HelpCategoryRef
    /** Muestra a qué categoría pertenece cada artículo (portada y búsqueda). */
    showCategory?: boolean
  }>(),
  { category: undefined, showCategory: false }
)

const FALLBACK: HelpCategoryRef = { slug: '', name: '', icon: null, accent: 'stats' }

function categoryOf(article: HelpListItem): HelpCategoryRef {
  return article.category ?? props.category ?? FALLBACK
}
</script>

<style scoped>
/* Los términos encontrados vienen marcados por la búsqueda de Postgres. */
.help-snippet :deep(em) {
  font-style: normal;
  font-weight: 600;
  color: var(--color-navy-700);
  background: var(--color-yellow-light);
  border-radius: 3px;
  padding: 0 0.15em;
}
</style>
