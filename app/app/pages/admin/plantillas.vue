<template>
  <div class="space-y-6">
    <PageHeader :title="t('admin.templates.title')" :subtitle="t('admin.templates.subtitle')">
      <template #actions>
        <Button
          variant="outline"
          :href="ROUTE_NAMES.TEMPLATES"
          target="_blank"
          rel="noopener noreferrer"
          :icon-right="ArrowTopRightOnSquareIcon"
          class="whitespace-nowrap"
        >
          {{ t('admin.templates.view_public') }}
          <span class="sr-only">{{ t('common.accessibility.opens_new_tab') }}</span>
        </Button>
      </template>
    </PageHeader>

    <!-- Búsqueda, filtro y orden van al servidor, que pagina. Los órdenes son
         los del catálogo: de serie, las recomendadas primero. -->
    <FilterBar
      :search="search"
      :sort="sort"
      :results-count="totalTemplates"
      :search-placeholder="t('admin.templates.search_placeholder')"
      :sort-options="sortOptions"
      variant="red"
      :has-active-filters="hasActiveFilters"
      :active-filter-count="activeFilterCount"
      @update:search="search = $event"
      @update:sort="sort = $event"
      @reset="reset"
    >
      <template #filters>
        <span :id="filterLabelId" class="sr-only">{{ t('admin.templates.filter_label') }}</span>
        <SelectDropdown
          v-model="filters.recommended"
          :options="recommendedOptions"
          :labelledby="filterLabelId"
        />
      </template>
    </FilterBar>

    <AdminListSkeleton v-if="isLoadingTemplates" :rows="6" />

    <div v-else-if="!templates.length" class="rounded-2xl bg-white shadow-lg">
      <EmptyState
        :icon="RectangleStackIcon"
        :title="
          isFiltering ? t('admin.templates.empty_filtered_title') : t('admin.templates.empty_title')
        "
        :description="
          isFiltering
            ? t('admin.templates.empty_filtered_description')
            : t('admin.templates.empty_description')
        "
      >
        <template v-if="isFiltering" #action>
          <Button variant="outline" @click="reset">{{ t('admin.users.filters.clear') }}</Button>
        </template>
      </EmptyState>
    </div>

    <!-- Las filas de las secciones de contenidos, sin orden a mano: lo da el
         servidor. El menú de cada fila es el interruptor y el enlace a la ficha. -->
    <section
      v-else
      class="overflow-hidden rounded-2xl bg-white shadow-lg"
      :aria-label="t('admin.templates.title')"
    >
      <AdminSortableList :items="templates" locked :item-label="tpl => tpl.name" :save="noReorder">
        <template #main="{ item }">
          <p class="flex min-w-0 items-center gap-1.5">
            <NuxtLink
              :to="`${ROUTE_NAMES.TEMPLATES}/${item.id}`"
              target="_blank"
              class="relative min-w-0 truncate font-semibold text-navy-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
            >
              {{ item.name }}
              <span class="sr-only">{{ t('common.accessibility.opens_new_tab') }}</span>
            </NuxtLink>
          </p>
          <!-- Quién la publicó: solo lo ve la administración. -->
          <p class="truncate text-sm text-navy-700/70">
            {{ t('admin.templates.published_by', { name: item.teacherName }) }}
          </p>
        </template>

        <template #meta="{ item }">
          <TemplateRecommendedBadge v-if="item.recommended" />
          <TemplateMetaBadges :template="item" class="contents" />
          <span class="ml-1 whitespace-nowrap text-xs text-navy-700/70">
            {{
              t('common.templates.counts.missions', { count: item.missionCount }, item.missionCount)
            }}
          </span>
        </template>

        <template #actions="{ item }">
          <Toggle
            :model-value="item.recommended"
            :disabled="savingId === item.id"
            :aria-label="t('admin.templates.recommend_named', { name: item.name })"
            :title="t('admin.templates.recommend')"
            @update:model-value="value => toggleRecommended(item, value)"
          />
        </template>
      </AdminSortableList>
    </section>

    <Pagination
      :current-page="page"
      :total-pages="templatesTotalPages"
      @page-change="page = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowTopRightOnSquareIcon, RectangleStackIcon } from '@heroicons/vue/24/outline'
import type { AdminTemplate, AdminTemplateFilters } from '~/types/admin.types'
import { ROUTE_NAMES } from '~/utils/navigation'

/**
 * Sección «Plantillas» del panel (bloque 3, E12): las plantillas del catálogo,
 * para marcar las recomendadas. Una recomendada sale primero en los dos
 * catálogos, el público y el del profesorado, con su distintivo. Es lo único
 * del panel que dice quién publicó cada plantilla.
 *
 * Retirar una plantilla o enviar su clase a la papelera le quita la marca: si
 * se vuelve a publicar, sale aquí sin recomendar.
 */

const { t } = useI18n()
const toast = useToast()
useHead({ title: () => t('admin.templates.meta.title') })
definePageMeta({ layout: 'admin', middleware: ['auth', 'onboarding', 'role'], role: 'admin' })

const adminStore = useAdminStore()
const { templates, totalTemplates, templatesTotalPages, isLoadingTemplates } =
  storeToRefs(adminStore)

const filterLabelId = useId()

const { search, filters, sort, page, activeFilterCount, hasActiveFilters, isFiltering, reset } =
  useAdminListQuery({
    filters: { recommended: '' },
    sort: 'recommended',
    pageSize: 24,
    totalPages: templatesTotalPages,
    load: query => adminStore.ensureTemplates(query as AdminTemplateFilters),
  })

const sortOptions = computed(() => [
  { value: 'recommended', label: t('teacher.templates.sort.recommended') },
  { value: 'recent', label: t('teacher.templates.sort.recent') },
  { value: 'name-asc', label: t('teacher.templates.sort.name_asc') },
  { value: 'name-desc', label: t('teacher.templates.sort.name_desc') },
])

const recommendedOptions = computed(() => [
  { value: '', label: t('admin.templates.filter_all') },
  { value: 'recommended', label: t('admin.templates.filter_recommended') },
  { value: 'not-recommended', label: t('admin.templates.filter_not_recommended') },
])

/** El orden lo da el servidor: la lista va bloqueada y no hay nada que guardar. */
const noReorder = async () => true

/** La plantilla que se está guardando; una cada vez por fila. */
const savingId = ref<string | null>(null)

/**
 * Marca o desmarca al momento y lo guarda; si no se puede, vuelve como estaba
 * y se dice. La fila se queda en su sitio hasta la próxima carga, para que no
 * salte bajo el ratón al cambiarla.
 */
async function toggleRecommended(tpl: AdminTemplate, value: boolean) {
  const previous = tpl.recommended
  tpl.recommended = value
  savingId.value = tpl.id
  try {
    await adminStore.setTemplateRecommended(tpl.id, value)
    const name = tpl.name
    toast.success(
      value
        ? t('admin.templates.recommended_on', { name })
        : t('admin.templates.recommended_off', { name })
    )
  } catch {
    tpl.recommended = previous
    toast.error(t('admin.templates.save_error'))
  } finally {
    savingId.value = null
  }
}
</script>
