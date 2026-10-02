<template>
  <div>
    <PageHeader
      :title="t('common.templates.hero_title')"
      :subtitle="t('common.templates.hero_subtitle')"
    />

    <!-- Búsqueda, filtros y orden: los aplica el servidor, que pagina -->
    <TemplateFilterBar
      v-model:search="search"
      v-model:sort="sort"
      v-model:levels="levels"
      v-model:subjects="subjects"
      v-model:languages="languages"
      v-model:provinces="provinces"
      :results-count="failure ? 0 : total"
      class="mb-6"
    />
    <!-- Anuncia cuántas salen al buscar o filtrar, o que no han llegado; existe
         desde el principio para que los lectores de pantalla lo lean al cambiar. -->
    <p class="sr-only" role="status" aria-live="polite">{{ resultsStatus }}</p>

    <!-- Cargando por primera vez: al volver de una ficha ya hay algo que enseñar -->
    <TemplateCardGrid v-if="!result && !failure" :skeleton="6" />

    <!-- No ha llegado: se dice y se deja reintentar. El contador de la barra se
         queda en 0: las que había se han dejado de enseñar. -->
    <LoadError
      v-else-if="failure"
      :rate-limited="failure === 'rate-limited'"
      :heading-level="2"
      @retry="load"
    />

    <!-- Vacío: no hay ninguna publicada, o ninguna con lo elegido -->
    <EmptyState
      v-else-if="!templates.length"
      :icon="RectangleStackIcon"
      :heading-level="2"
      :title="
        isFiltering ? t('teacher.templates.no_results_title') : t('teacher.templates.empty_title')
      "
      :description="
        isFiltering
          ? t('teacher.templates.no_results_description')
          : t('teacher.templates.empty_description')
      "
    />

    <template v-else>
      <!-- Mientras llegan las de otra búsqueda, las de antes se quedan, en tenue -->
      <TemplateCardGrid
        :aria-busy="outdated"
        class="transition-opacity"
        :class="{ 'opacity-60': outdated }"
      >
        <TemplateCard v-for="tpl in templates" :key="tpl.id" :template="tpl" :heading-level="2">
          <!-- En vez de quién la publicó, el principio de su historia. Es prosa
               de tres líneas: va en el navy atenuado de los resúmenes del blog,
               que sí llega al contraste mínimo, no en el gris de una línea suelta. -->
          <template #description>
            <span class="line-clamp-3 text-navy-700/70">{{ tpl.excerpt }}</span>
          </template>

          <template #actions>
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              :to="`${ROUTE_NAMES.TEMPLATES}/${tpl.id}`"
            >
              {{ t('common.templates.view') }}
              <span class="sr-only">: {{ tpl.name }}</span>
            </Button>
          </template>
        </TemplateCard>
      </TemplateCardGrid>

      <Pagination :current-page="page" :total-pages="totalPages" @page-change="goToPage" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { RectangleStackIcon } from '@heroicons/vue/24/outline'
import { ROUTE_NAMES } from '~/utils/navigation'

/**
 * Catálogo público de plantillas (Fase 3, C5): las clases que el profesorado
 * ha publicado para que otros partan de ellas, sin cuenta.
 *
 * Mismas piezas que el catálogo del profesorado (`/profesor/plantillas`): la
 * barra de filtros, la rejilla y la tarjeta. Cambian tres cosas: los filtros y
 * las páginas los aplica el servidor, la tarjeta enseña el principio de la
 * historia en vez de quién la publicó, y su botón lleva a la ficha, que es lo
 * que se comparte.
 */

const { t } = useI18n()

definePageMeta({ layout: 'templates' })

useHead({
  title: () => t('common.templates.meta.title'),
  meta: [{ name: 'description', content: () => t('common.templates.meta.description') }],
})

const {
  search,
  levels,
  subjects,
  languages,
  provinces,
  sort,
  page,
  result,
  templates,
  total,
  totalPages,
  loading,
  outdated,
  failure,
  isFiltering,
  load,
} = usePublicTemplateCatalog()

/**
 * Lo que se anuncia al cambiar la lista: cuántas plantillas salen o, si la
 * búsqueda no ha llegado, el título del aviso. Nunca el recuento de antes, que
 * ya no es el de lo que se ha pedido.
 */
const resultsStatus = computed(() => {
  if (loading.value) return ''
  if (failure.value) {
    return failure.value === 'rate-limited'
      ? t('common.errors.rate_limited_title')
      : t('common.help.load_error')
  }
  return result.value ? t('common.templates.result_count', { count: total.value }, total.value) : ''
})

/**
 * Otra página: se pide (lo hace el catálogo al cambiar `page`) y se sube al
 * principio, que es donde empieza a leerse. Suave o no lo decide el CSS, según
 * los ajustes de accesibilidad.
 */
function goToPage(value: number) {
  page.value = value
  window.scrollTo({ top: 0 })
}
</script>
