<template>
  <div>
    <Breadcrumb :items="breadcrumbs" />

    <!-- Cargando: la cabecera de color y la lista, con su misma forma -->
    <div v-if="loadingIndex && !index">
      <Skeleton height="h-40" custom-class="mb-6 rounded-2xl" />
      <div class="overflow-hidden rounded-2xl bg-surface shadow-lg">
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

    <template v-else-if="category">
      <!-- Cabecera con el color de la categoría: la misma tarjeta que en la
           portada, en grande, para que se sepa dónde está uno de un vistazo. -->
      <Card :type="helpCardType(category.accent)" class="mb-6">
        <div class="flex items-start gap-4">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/60">
            <component :is="helpIcon(category.icon)" class="h-7 w-7 text-navy-700" />
          </span>
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-navy-700 sm:text-3xl">{{ category.name }}</h1>
            <p v-if="category.description" class="mt-1 text-base text-navy-700/80">
              {{ category.description }}
            </p>
            <p class="mt-3 text-xs font-medium text-navy-700/70">
              {{ t('common.help.article_count', { count: category.total }) }}
            </p>
          </div>
        </div>
      </Card>

      <HelpArticleList :articles="category.articles" :category="category" />
    </template>

    <EmptyState
      v-else
      :icon="BookOpenIcon"
      :title="t('common.help.not_found_title')"
      :description="t('common.help.not_found_description')"
    />
  </div>
</template>

<script setup lang="ts">
import { BookOpenIcon } from '@heroicons/vue/24/outline'
import { helpCardType } from '~/utils/help-accents'
import { helpIcon } from '~/utils/help-icons'

/** Listado de una categoría del centro de ayuda (Fase 3, punto 17). */

const { t } = useI18n()
const route = useRoute()
const { index, loadingIndex, ensureIndex, getCategory } = useHelp()

const slug = computed(() => String(route.params.categoria))
const category = computed(() => getCategory(slug.value))

// Mientras no se sabe el nombre de la categoría, la miga se queda en una sola:
// pintar un separador seguido de nada solo parece un fallo.
const breadcrumbs = computed(() => [
  { label: t('common.help.title'), to: '/ayuda' },
  ...(category.value ? [{ label: category.value.name }] : []),
])

onMounted(ensureIndex)

definePageMeta({ layout: 'help' })

useHead({
  title: () =>
    category.value ? `${category.value.name} · ${t('common.help.title')}` : t('common.help.title'),
})
</script>
