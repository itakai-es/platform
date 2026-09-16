<template>
  <div>
    <PageHeader
      :title="t(`common.help.hero.${props.scope}.title`)"
      :subtitle="t(`common.help.hero.${props.scope}.subtitle`)"
    />

    <SearchInput
      v-model="query"
      :placeholder="t('common.help.search.placeholder')"
      class="mb-6 max-w-lg"
    />
    <!-- Anuncia el resultado de la búsqueda; existe desde el principio para
         que los lectores de pantalla lo lean al cambiar. -->
    <p class="sr-only" role="status" aria-live="polite">{{ searchStatus }}</p>

    <!-- Cargando: mismas piezas que después, en el mismo sitio -->
    <div v-if="loadingIndex && !index" class="space-y-8">
      <section>
        <Skeleton width="w-40" height="h-5" custom-class="mb-3" />
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 3" :key="i" class="overflow-hidden rounded-2xl bg-surface shadow-lg">
            <Skeleton height="h-32" />
            <div class="space-y-2 p-4">
              <Skeleton width="w-24" height="h-3" />
              <Skeleton width="w-3/4" height="h-4" />
              <Skeleton width="w-5/6" height="h-3" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <Skeleton width="w-44" height="h-5" custom-class="mb-3" />
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton v-for="i in 6" :key="i" height="h-32" custom-class="rounded-2xl" />
        </div>
      </section>
    </div>

    <!-- Resultados: sustituyen al índice mientras hay consulta -->
    <template v-else-if="searching">
      <HelpArticleList v-if="results.length" :articles="results" show-category />

      <EmptyState
        v-else
        :icon="MagnifyingGlassIcon"
        :title="t('common.help.search.empty', { query: query.trim() })"
        :description="t('common.help.search.empty_hint')"
      />
    </template>

    <template v-else>
      <!-- Lo más consultado: con la ilustración del artículo a tamaño legible -->
      <section v-if="featured.length" class="mb-8">
        <h2 class="mb-3 text-lg font-bold text-navy-700">{{ t('common.help.most_read') }}</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="article in featured"
            :key="article.id"
            :to="`/ayuda/${article.category.slug}/${article.slug}`"
            class="group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-lg transition-shadow hover:shadow-xl"
          >
            <img
              v-if="getImageUrl(article.coverImage)"
              :src="getImageUrl(article.coverImage)"
              alt=""
              class="h-32 w-full object-cover"
            />
            <div
              v-else
              class="h-32 w-full"
              :style="{
                backgroundColor: `var(--color-card-${helpCardType(article.category.accent)})`,
              }"
            />
            <div class="flex flex-1 flex-col p-4">
              <span class="flex items-center gap-2">
                <HelpCategoryIcon :icon="article.category.icon" :accent="article.category.accent" />
                <span class="truncate text-xs font-medium text-navy-700/70">
                  {{ article.category.name }}
                </span>
              </span>
              <h3 class="mt-2 font-bold leading-snug text-navy-700">{{ article.title }}</h3>
              <p v-if="article.summary" class="mt-1 text-sm text-navy-700/70">
                {{ article.summary }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Categorías -->
      <h2 class="mb-3 text-lg font-bold text-navy-700">{{ t('common.help.all_categories') }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="category in categories"
          :key="category.slug"
          :to="`/ayuda/${category.slug}`"
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
import { BookOpenIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { helpCardType } from '~/utils/help-accents'
import type { HelpScope, HelpSearchResult } from '~/types/help.types'

/**
 * Portada del centro de ayuda (Fase 3, punto 17).
 *
 * La misma portada sirve para toda la ayuda, para el profesorado y para el
 * alumnado: cada página fina la monta con su `scope` y aquí se fija como
 * portada activa, con lo que el índice ya en memoria se filtra solo.
 *
 * Usa las piezas del sistema de diseño de ITAKAI: `PageHeader` para el título,
 * `SearchInput` para buscar, `Card` con los colores de marca para las
 * categorías y `EmptyState` cuando no hay nada. Sin estilos propios.
 */

const props = defineProps<{
  scope: HelpScope
}>()

const { t } = useI18n()
const { getImageUrl } = useImageUrl()
const {
  index,
  loadingIndex,
  ensureIndex,
  search,
  allArticles,
  categories,
  featured: featuredInScope,
  setScope,
} = useHelp()

setScope(props.scope)

const featured = computed(() => featuredInScope.value.slice(0, 6))

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
  return count
    ? t('common.help.article_count', { count }, count)
    : t('common.help.search.empty', { query: query.value.trim() })
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

onMounted(ensureIndex)
</script>
