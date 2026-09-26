<template>
  <div>
    <Breadcrumb :items="breadcrumbs" />

    <!-- Cargando: la cabecera de color y la lista, con su misma forma -->
    <div v-if="loadingIndex && !index">
      <Skeleton
        v-if="isBlog"
        width="w-full max-w-md"
        height="h-10"
        custom-class="mb-6 rounded-xl"
      />
      <Skeleton height="h-40" custom-class="mb-6 rounded-2xl" />
      <HelpArticleTiles v-if="isBlog" :skeleton="3" area="blog" />
      <div v-else class="overflow-hidden rounded-2xl bg-surface shadow-lg">
        <div
          v-for="i in 5"
          :key="i"
          class="flex items-center gap-4 border-b border-border-primary px-4 py-3.5 last:border-b-0"
        >
          <Skeleton width="w-10" height="h-10" custom-class="shrink-0 rounded-xl" />
          <div class="min-w-0 flex-1 space-y-2">
            <Skeleton width="w-1/3" height="h-4" />
            <Skeleton width="w-2/3" height="h-3" />
          </div>
        </div>
      </div>
    </div>

    <HelpLoadError v-else-if="indexError" :area="props.area" />

    <template v-else-if="category">
      <!-- En el blog, las categorías siguen a mano para saltar de una a otra. -->
      <BlogCategoryNav v-if="isBlog" :active="category.slug" class="mb-6" />

      <!-- Cabecera con el color de la categoría: la misma tarjeta que en la
           portada, en grande, para que se sepa dónde está uno de un vistazo. -->
      <Card :type="helpCardType(category.accent)" class="mb-6">
        <div class="flex items-start gap-4">
          <HelpCategoryIcon :icon="category.icon" size="xl" on-card />
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-navy-700 sm:text-3xl">{{ category.name }}</h1>
            <!-- Sin atenuar: sobre la tarjeta de color no llegaría al contraste mínimo. -->
            <p v-if="category.description" class="mt-1 text-base text-navy-700">
              {{ category.description }}
            </p>
            <p class="mt-3 text-xs font-medium text-navy-700">{{ countLabel }}</p>
          </div>
        </div>
      </Card>

      <!-- El blog, en tarjetas con portada y de lo más nuevo a lo más antiguo;
           la ayuda, en filas y en el orden del panel. -->
      <HelpArticleTiles
        v-if="isBlog"
        :articles="category.articles"
        :category="category"
        area="blog"
        :heading-level="2"
      />
      <HelpArticleList v-else :articles="category.articles" :category="category" />
    </template>

    <EmptyState
      v-else
      :icon="isBlog ? NewspaperIcon : BookOpenIcon"
      :title="t('common.help.not_found_title')"
      :description="notFoundDescription"
    />
  </div>
</template>

<script setup lang="ts">
import { BookOpenIcon, NewspaperIcon } from '@heroicons/vue/24/outline'
import { helpCardType } from '~/utils/help-accents'
import type { HelpArea } from '~/types/help.types'

/**
 * Listado de una categoría del centro de ayuda o del blog (Fase 3, puntos 17
 * y B3). Las páginas de cada área lo montan con la suya.
 *
 * Miga, cabecera de color, estados de carga, error y «no existe» son los
 * mismos; cambia la lista: filas en el orden del panel en la ayuda, tarjetas
 * con portada, fecha y firma de lo más nuevo a lo más antiguo en el blog, que
 * además deja a mano las demás categorías.
 */

const props = withDefaults(defineProps<{ area?: HelpArea }>(), { area: 'ayuda' })

const { t } = useI18n()
const route = useRoute()
const {
  isBlog,
  index,
  loadingIndex,
  indexError,
  ensureIndex,
  getCategory,
  scope,
  portalPath,
  sectionTitle,
} = useHelp(props.area)

const slug = computed(() => String(route.params.categoria))
const category = computed(() => getCategory(slug.value))

const countLabel = computed(() => {
  const count = category.value?.total ?? 0
  return isBlog
    ? t('common.blog.post_count', { count }, count)
    : t('common.help.article_count', { count }, count)
})

const notFoundDescription = computed(() =>
  isBlog ? t('common.blog.not_found_description') : t('common.help.not_found_description')
)

// Mientras no se sabe el nombre de la categoría, la miga se queda en una sola:
// pintar un separador seguido de nada solo parece un fallo. La primera lleva
// a la portada activa (en la ayuda, toda, profesorado o alumnado).
const breadcrumbs = computed(() => [
  { label: sectionTitle.value, to: portalPath(scope.value) },
  ...(category.value ? [{ label: category.value.name }] : []),
])

onMounted(ensureIndex)

useHead({
  title: () =>
    category.value ? `${category.value.name} · ${sectionTitle.value}` : sectionTitle.value,
})
</script>
