<template>
  <div>
    <PageHeader :title="heading.title" :subtitle="heading.subtitle" />

    <SearchInput v-model="query" :placeholder="heading.searchPlaceholder" class="mb-6 max-w-lg" />
    <!-- Anuncia el resultado de la búsqueda; existe desde el principio para
         que los lectores de pantalla lo lean al cambiar. -->
    <p class="sr-only" role="status" aria-live="polite">{{ searchStatus }}</p>

    <!-- Cargando: mismas piezas que después, en el mismo sitio -->
    <div v-if="loadingIndex && !index" class="space-y-8">
      <Skeleton v-if="isBlog" width="w-full max-w-md" height="h-10" custom-class="rounded-xl" />
      <section>
        <Skeleton width="w-40" height="h-5" custom-class="mb-3" />
        <HelpArticleTiles :skeleton="isBlog ? 6 : 3" :area="props.area" />
      </section>

      <section v-if="!isBlog">
        <Skeleton width="w-44" height="h-5" custom-class="mb-3" />
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton v-for="i in 6" :key="i" height="h-32" custom-class="rounded-2xl" />
        </div>
      </section>
    </div>

    <!-- El índice no ha llegado: se dice y se deja reintentar -->
    <HelpLoadError v-else-if="indexError" :area="props.area" />

    <!-- Resultados: sustituyen al índice mientras hay consulta -->
    <template v-else-if="searching">
      <HelpArticleList v-if="results.length" :articles="results" :area="props.area" show-category />

      <EmptyState
        v-else
        :icon="MagnifyingGlassIcon"
        :title="t('common.help.search.empty', { query: query.trim() })"
        :description="heading.searchEmptyHint"
      />
    </template>

    <!-- Blog: categorías para filtrar, destacadas y el resto de lo más nuevo a
         lo más antiguo -->
    <template v-else-if="isBlog">
      <BlogCategoryNav class="mb-8" />

      <section v-if="featured.length" class="mb-8">
        <h2 class="mb-3 text-lg font-bold text-navy-700">{{ t('common.blog.featured') }}</h2>
        <HelpArticleTiles :articles="featured" area="blog" />
      </section>

      <section v-if="latest.length">
        <h2 class="mb-3 text-lg font-bold text-navy-700">{{ t('common.blog.latest') }}</h2>
        <HelpArticleTiles :articles="latest" area="blog" />
      </section>

      <EmptyState
        v-if="!allArticles.length"
        :icon="NewspaperIcon"
        :title="t('common.blog.empty_title')"
        :description="t('common.blog.empty_description')"
      />
    </template>

    <template v-else>
      <!-- Lo más consultado: con la ilustración del artículo a tamaño legible -->
      <section v-if="featured.length" class="mb-8">
        <h2 class="mb-3 text-lg font-bold text-navy-700">{{ t('common.help.most_read') }}</h2>
        <HelpArticleTiles :articles="featured" />
      </section>

      <!-- Categorías -->
      <h2 class="mb-3 text-lg font-bold text-navy-700">{{ t('common.help.all_categories') }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="category in categories"
          :key="category.slug"
          :to="categoryPath(category.slug)"
        >
          <Card :type="helpCardType(category.accent)" hoverable flex>
            <div class="flex items-start gap-4">
              <HelpCategoryIcon :icon="category.icon" size="xl" on-card />
              <div class="min-w-0 flex-1">
                <h3 class="font-bold leading-tight text-navy-700">{{ category.name }}</h3>
                <!-- Sobre la tarjeta de color el texto va sin atenuar: con el lila
                     por defecto, navy al 80 % se queda en 3,3:1. -->
                <p v-if="category.description" class="mt-1 text-sm text-navy-700">
                  {{ category.description }}
                </p>
                <p class="mt-3 text-xs font-medium text-navy-700">
                  {{ t('common.help.article_count', { count: category.total }, category.total) }}
                </p>
              </div>
            </div>
          </Card>
        </NuxtLink>
      </div>

      <!-- Instancia sin contenido cargado todavía -->
      <EmptyState
        v-if="!categories.length"
        :icon="BookOpenIcon"
        :title="t('common.help.empty_title')"
        :description="t('common.help.empty_description')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { BookOpenIcon, MagnifyingGlassIcon, NewspaperIcon } from '@heroicons/vue/24/outline'
import { helpCardType } from '~/utils/help-accents'
import type { HelpArea, HelpScope, HelpSearchResult } from '~/types/help.types'

/**
 * Portada del centro de ayuda y del blog (Fase 3, puntos 17 y B3).
 *
 * La misma portada sirve para toda la ayuda, para el profesorado, para el
 * alumnado y para el blog: cada página fina la monta con su `area` y, en la
 * ayuda, con su `scope`, que aquí se fija como portada activa, con lo que el
 * índice ya en memoria se filtra solo.
 *
 * Cabecera, buscador, resultados y estados de carga y error son los mismos
 * en las dos áreas. Lo que cambia es el índice: la ayuda enseña lo más
 * consultado y sus categorías como tarjetas de color; el blog, las categorías
 * como filtro y sus entradas de la más reciente a la más antigua, con portada,
 * resumen, fecha y firma.
 *
 * Usa las piezas del sistema de diseño de ITAKAI: `PageHeader` para el título,
 * `SearchInput` para buscar, `Card` con los colores de marca para las
 * categorías y `EmptyState` cuando no hay nada. Sin estilos propios.
 */

const props = withDefaults(
  defineProps<{
    area?: HelpArea
    /** La portada de la ayuda; el blog solo tiene una. */
    scope?: HelpScope
  }>(),
  { area: 'ayuda', scope: 'todo' }
)

const { t } = useI18n()
const {
  isBlog,
  index,
  loadingIndex,
  indexError,
  ensureIndex,
  search,
  allArticles,
  categories,
  featured: featuredInScope,
  setScope,
  categoryPath,
} = useHelp(props.area)

setScope(props.scope)

/** Los textos que cambian entre la ayuda (por portada) y el blog. */
const heading = computed(() =>
  isBlog
    ? {
        title: t('common.blog.hero_title'),
        subtitle: t('common.blog.hero_subtitle'),
        searchPlaceholder: t('common.blog.search_placeholder'),
        searchEmptyHint: t('common.blog.search_empty_hint'),
      }
    : {
        title: t(`common.help.hero.${props.scope}.title`),
        subtitle: t(`common.help.hero.${props.scope}.subtitle`),
        searchPlaceholder: t('common.help.search.placeholder'),
        searchEmptyHint: t('common.help.search.empty_hint'),
      }
)

/** En el blog, una fila de destacadas; en la ayuda, hasta dos. */
const featured = computed(() => featuredInScope.value.slice(0, isBlog ? 3 : 6))

/** Las entradas del blog que no están ya arriba, entre las destacadas. */
const latest = computed(() => {
  const shown = new Set(featured.value.map(article => article.id))
  return allArticles.value.filter(article => !shown.has(article.id))
})

// ---- búsqueda ----

const query = ref('')
const remote = ref<HelpSearchResult[]>([])

const searching = computed(() => query.value.trim().length >= 2)

/** Coincidencias por título mientras el servidor contesta: respuesta inmediata. */
const local = computed<HelpSearchResult[]>(() => {
  const term = query.value.trim().toLowerCase()
  if (term.length < 2) return []
  return allArticles.value
    .filter(article => article.title.toLowerCase().includes(term))
    .slice(0, 10)
    .map(article => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      coverImage: article.coverImage,
      snippet: '',
      audience: article.audience,
      kind: article.kind,
      category: article.category,
    }))
})

/** Lo del servidor manda en cuanto llega: encuentra también dentro del cuerpo. */
const results = computed(() => (remote.value.length ? remote.value : local.value))

/** El texto que se anuncia al buscar: cuántos hay, o que no hay nada. */
const searchStatus = computed(() => {
  if (!searching.value) return ''
  const count = results.value.length
  if (!count) return t('common.help.search.empty', { query: query.value.trim() })
  return isBlog
    ? t('common.blog.post_count', { count }, count)
    : t('common.help.article_count', { count }, count)
})

let timer: ReturnType<typeof setTimeout> | null = null

watch(query, value => {
  remote.value = []
  if (timer) clearTimeout(timer)
  if (value.trim().length < 2) return
  timer = setTimeout(async () => {
    try {
      const { results: found } = await search(value)
      if (value === query.value) remote.value = found
    } catch {
      /* si la búsqueda falla, se queda el filtrado por título */
    }
  }, 250)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

onMounted(ensureIndex)
</script>
