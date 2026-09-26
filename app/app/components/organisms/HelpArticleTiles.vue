<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <!-- Cargando: la misma tarjeta, con su portada y sus líneas -->
    <template v-if="skeleton">
      <div v-for="i in skeleton" :key="i" class="overflow-hidden rounded-2xl bg-surface shadow-lg">
        <Skeleton height="h-auto" :custom-class="coverClass" />
        <div class="space-y-2 p-4">
          <Skeleton width="w-24" height="h-3" />
          <Skeleton width="w-3/4" height="h-4" />
          <Skeleton width="w-5/6" height="h-3" />
        </div>
      </div>
    </template>

    <template v-else>
      <NuxtLink
        v-for="article in articles"
        :key="article.id"
        :to="helpArticlePath(props.area, categoryOf(article).slug, article.slug)"
        class="group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-lg transition-shadow hover:shadow-xl"
      >
        <!-- Sin portada, el color de la categoría ocupa su sitio. -->
        <img
          v-if="getImageUrl(article.coverImage)"
          :src="getImageUrl(article.coverImage)"
          alt=""
          :class="[coverClass, 'w-full object-cover']"
        />
        <div
          v-else
          :class="[coverClass, 'w-full']"
          :style="{
            backgroundColor: `var(--color-card-${helpCardType(categoryOf(article).accent)})`,
          }"
        />
        <div class="flex flex-1 flex-col p-4">
          <span class="flex items-center gap-2">
            <HelpCategoryIcon
              :icon="categoryOf(article).icon"
              :accent="categoryOf(article).accent"
            />
            <span class="truncate text-xs font-medium text-navy-700/70">
              {{ categoryOf(article).name }}
            </span>
          </span>
          <component :is="`h${headingLevel}`" class="mt-2 font-bold leading-snug text-navy-700">
            {{ article.title }}
          </component>
          <p v-if="article.summary" class="mt-1 text-sm text-navy-700/70">
            {{ article.summary }}
          </p>
          <!-- En el blog, abajo del todo: cuándo se publicó y quién firma. -->
          <p v-if="bylineOf(article)" class="mt-auto pt-3 text-xs text-navy-700/70">
            {{ bylineOf(article) }}
          </p>
        </div>
      </NuxtLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { helpCardType } from '~/utils/help-accents'
import { helpArticlePath } from '~/utils/help-area'
import type { HelpArea, HelpBlogFields, HelpCategoryRef } from '~/types/help.types'

/**
 * Rejilla de tarjetas de artículo con su portada: lo más consultado de la
 * ayuda y, en el blog, las destacadas, las últimas entradas, el listado de una
 * categoría y «Seguir leyendo».
 *
 * Cada tarjeta lleva la portada (o el color de su categoría si no tiene), la
 * categoría, el título y el resumen; en el blog, además, la fecha de
 * publicación y la firma. Con `skeleton` pinta ese número de huecos con la
 * misma forma mientras llega el contenido.
 */

interface HelpTileItem extends HelpBlogFields {
  id: string
  slug: string
  title: string
  summary?: string | null
  coverImage?: string | null
  /** Dentro de una categoría las tarjetas no la repiten: llega en `category`. */
  category?: HelpCategoryRef
}

const props = withDefaults(
  defineProps<{
    articles?: HelpTileItem[]
    /** Categoría común a todas las tarjetas que no traigan la suya. */
    category?: HelpCategoryRef
    /** El área de los artículos: decide adónde enlazan y si llevan fecha y firma. */
    area?: HelpArea
    /** Número de huecos que pintar mientras se carga; con 0, las tarjetas. */
    skeleton?: number
    /** Nivel del título de cada tarjeta: 2 donde no hay otro h2 por encima. */
    headingLevel?: 2 | 3
  }>(),
  { articles: () => [], category: undefined, area: 'ayuda', skeleton: 0, headingLevel: 3 }
)

const { getImageUrl } = useImageUrl()

/**
 * La portada: en el blog, 5:2, la proporción de las portadas, para que no se
 * recorten; en la ayuda, la franja fija de siempre en «Lo más consultado».
 */
const coverClass = computed(() => (props.area === 'blog' ? 'aspect-[5/2]' : 'h-32'))
const { shortByline } = useBlogByline()

const FALLBACK: HelpCategoryRef = { slug: '', name: '', icon: null, accent: 'stats' }

function categoryOf(article: HelpTileItem): HelpCategoryRef {
  return article.category ?? props.category ?? FALLBACK
}

/** Fecha y firma, solo en el blog: la ayuda no las trae. */
function bylineOf(article: HelpTileItem) {
  return props.area === 'blog' ? shortByline(article) : ''
}
</script>
