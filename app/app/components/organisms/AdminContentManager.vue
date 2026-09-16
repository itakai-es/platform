<template>
  <div class="space-y-6">
    <PageHeader :title="text.title" :subtitle="text.subtitle">
      <template #actions>
        <Button
          v-if="isHelp"
          variant="outline"
          href="/ayuda"
          target="_blank"
          rel="noopener noreferrer"
          :icon-right="ArrowTopRightOnSquareIcon"
        >
          {{ t('admin.help.view_public') }}
          <span class="sr-only">{{ t('common.accessibility.opens_new_tab') }}</span>
        </Button>
        <!-- Sin categorías no se puede crear nada: el listado explica por qué
             y lleva a crear la primera. -->
        <Button
          v-if="tab === 'articles'"
          variant="primary"
          :icon-left="PlusIcon"
          :disabled="!categories.length"
          @click="openNew"
        >
          {{ text.newArticle }}
        </Button>
        <Button v-else variant="primary" :icon-left="PlusIcon" @click="openNewCategory">
          {{ t('admin.help.new_category') }}
        </Button>
      </template>
      <template #tabs>
        <TabNavigation :tabs="tabs" :active-tab="tab" @tab-change="setTab" />
      </template>
    </PageHeader>

    <!-- El blog aún no tiene página pública: se avisa de dónde acabará lo publicado. -->
    <InfoNote v-if="!isHelp">{{ t('admin.blog.public_notice') }}</InfoNote>

    <template v-if="tab === 'articles'">
      <FilterBar
        :search="search"
        sort=""
        :sort-options="[]"
        :results-count="articles.length"
        :search-placeholder="t('admin.help.search_placeholder')"
        variant="red"
        :has-active-filters="activeFilterCount > 0"
        :active-filter-count="activeFilterCount"
        @update:search="search = $event"
        @reset="clearFilters"
      >
        <!-- Cada filtro lleva una etiqueta oculta: el desplegable solo enseña el valor. -->
        <template #filters>
          <template v-for="filter in filters" :key="filter.id">
            <span :id="filter.id" class="sr-only">{{ filter.label }}</span>
            <SelectDropdown
              :model-value="filter.value"
              :options="filter.options"
              :labelledby="filter.id"
              @update:model-value="filter.set"
            />
          </template>
        </template>
      </FilterBar>

      <!-- Destino del foco cuando la fila que lo tenía desaparece. -->
      <div
        ref="listRef"
        tabindex="-1"
        class="space-y-4 focus:outline-none"
        :aria-busy="reorderingArticles"
      >
        <!-- Con estos filtros la lista está incompleta y el orden se bloquea: se dice por qué. -->
        <InfoNote v-if="!canReorder && !showSkeleton && byCategory.length">
          {{ text.reorderDisabled }}
        </InfoNote>

        <template v-if="showSkeleton">
          <AdminListSkeleton v-for="i in 2" :key="i" header :rows="i === 1 ? 4 : 3" />
        </template>

        <div v-else-if="loadError" class="rounded-2xl bg-white shadow-lg">
          <EmptyState
            :icon="ExclamationTriangleIcon"
            :title="t('admin.help.list_error')"
            :description="t('common.errors.generic')"
          >
            <template #action>
              <Button variant="outline" @click="retryLoad">{{ t('admin.help.retry') }}</Button>
            </template>
          </EmptyState>
        </div>

        <!-- Sin categorías no se puede escribir nada (el blog empieza así): se lleva a crearlas. -->
        <div v-else-if="!categories.length" class="rounded-2xl bg-white shadow-lg">
          <EmptyState
            :icon="BookOpenIcon"
            :title="t('admin.help.categories_empty')"
            :description="t('admin.help.no_categories_description')"
          >
            <template #action>
              <Button variant="outline" :icon-left="PlusIcon" @click="startWithCategory">
                {{ t('admin.help.new_category') }}
              </Button>
            </template>
          </EmptyState>
        </div>

        <div v-else-if="!byCategory.length" class="rounded-2xl bg-white shadow-lg">
          <EmptyState
            v-if="hasActiveFilters"
            :icon="BookOpenIcon"
            :title="t('admin.help.empty_filtered_title')"
            :description="t('admin.help.empty_filtered_description')"
          >
            <template #action>
              <Button variant="outline" @click="clearFilters">
                {{ t('admin.users.filters.clear') }}
              </Button>
            </template>
          </EmptyState>
          <EmptyState
            v-else
            :icon="BookOpenIcon"
            :title="text.emptyTitle"
            :description="text.emptyDescription"
          />
        </div>

        <!-- Una tarjeta por categoría. El menú de cada fila se teletransporta, así
             que `overflow-hidden` no lo recorta y redondea el fondo de las filas. -->
        <template v-else>
          <section
            v-for="group in byCategory"
            :key="group.category.id"
            class="overflow-hidden rounded-2xl bg-white shadow-lg"
            :aria-labelledby="`${groupId}-${group.category.id}`"
          >
            <header class="flex items-center gap-2 border-b border-border-primary px-4 py-3">
              <HelpCategoryIcon :icon="group.category.icon" :accent="group.category.accent" />
              <h2 :id="`${groupId}-${group.category.id}`" class="font-semibold text-navy-700">
                {{ group.category.name }}
              </h2>
              <span class="text-xs text-navy-700/70">
                {{
                  t('common.help.article_count', { count: group.items.length }, group.items.length)
                }}
              </span>
            </header>

            <AdminSortableList
              :items="group.items"
              :locked="!canReorder"
              :item-label="articleTitle"
              :save="ids => saveArticleOrder(group.category.id, ids)"
            >
              <template #main="{ item }">
                <p class="flex min-w-0 items-center gap-1.5">
                  <button
                    type="button"
                    class="min-w-0 truncate text-left font-semibold text-navy-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
                    @click="openEdit(item)"
                  >
                    {{ item.title }}
                  </button>
                  <template v-if="item.featured">
                    <StarIcon
                      class="h-4 w-4 shrink-0 fill-current text-yellow"
                      aria-hidden="true"
                    />
                    <span class="sr-only">{{ t('admin.help.featured') }}</span>
                  </template>
                </p>
                <p class="truncate text-sm text-navy-700/70">
                  {{ item.summary || t('admin.help.no_summary') }}
                </p>
              </template>

              <template #meta="{ item }">
                <Badge :variant="item.status === 'publicado' ? 'success' : 'warning'" size="sm">
                  {{ t(`admin.help.status_${item.status}`) }}
                </Badge>
                <template v-if="isHelp">
                  <Badge variant="common" size="sm">
                    {{ t(`common.help.audience.${item.audience}`) }}
                  </Badge>
                  <Badge v-if="item.kind !== 'guia'" variant="common" size="sm">
                    {{ t(`common.help.kind.${item.kind}`) }}
                  </Badge>
                </template>
                <span class="ml-1 hidden whitespace-nowrap text-xs text-navy-700/70 sm:inline">
                  {{ t('admin.help.views', { count: item.views }) }}
                </span>
              </template>

              <template #actions="{ item }">
                <IconButton
                  :icon="PencilSquareIcon"
                  :label="t('admin.help.edit_named', { name: item.title })"
                  data-action="edit"
                  @click="openEdit(item)"
                />
                <ActionMenu
                  :label="t('admin.help.more_actions_for', { name: item.title })"
                  :items="articleMenu(item)"
                  @select="id => onArticleAction(id, item)"
                />
              </template>
            </AdminSortableList>
          </section>
        </template>
      </div>
    </template>

    <AdminHelpCategories
      v-else
      ref="categoriesPanel"
      :area="props.area"
      :categories="categories"
      :loading="!loaded || categoriesLoading"
      :error="loadError"
      :reload="reloadSilently"
    />

    <!-- Editor -->
    <Modal
      v-model="editorOpen"
      :title="editing ? text.editArticle : text.newArticle"
      size="2xl"
      theme="light"
      persistent
      sticky-chrome
    >
      <!-- Mientras llega el artículo no se enseña el formulario anterior. -->
      <div v-if="editorLoading" class="space-y-4">
        <Skeleton v-for="i in 6" :key="i" height="h-12" custom-class="rounded-xl" />
      </div>

      <div v-else class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <FieldGroup v-slot="{ labelId }" :label="t('admin.help.field_category')">
            <SelectDropdown
              v-model="form.categoryId"
              :options="categoryChoices"
              :labelledby="labelId"
            />
          </FieldGroup>
          <FieldGroup v-slot="{ labelId }" :label="t('admin.help.field_status')">
            <SelectDropdown v-model="form.status" :options="statusChoices" :labelledby="labelId" />
          </FieldGroup>
        </div>

        <!-- Audiencia, tipo y vídeo son cosas del centro de ayuda: el blog no los lleva. -->
        <div v-if="isHelp" class="grid gap-4 sm:grid-cols-2">
          <FieldGroup
            v-slot="{ labelId, describedby }"
            :label="t('admin.help.field_audience')"
            :hint="t('admin.help.audience_hint')"
          >
            <OptionPillGroup
              v-model="form.audience"
              :options="audienceOptions"
              :columns="3"
              :aria-labelledby="labelId"
              :aria-describedby="describedby"
            />
          </FieldGroup>
          <FieldGroup v-slot="{ labelId }" :label="t('admin.help.field_kind')">
            <OptionPillGroup
              v-model="form.kind"
              :options="kindOptions"
              :columns="4"
              :aria-labelledby="labelId"
            />
          </FieldGroup>
        </div>

        <FieldGroup
          v-if="isHelp && form.kind === 'video'"
          v-slot="{ id, describedby }"
          :label="t('admin.help.field_video_url')"
          :hint="t('admin.help.video_url_hint')"
          :error="videoError"
          native-control
        >
          <Input
            :id="id"
            v-model="form.videoUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            :error="!!videoError"
            :aria-describedby="describedby"
          />
          <HelpVideoEmbed
            v-if="videoPreviewUrl"
            :url="videoPreviewUrl"
            :title="form.title"
            class="mt-3 max-w-md"
          />
        </FieldGroup>

        <!-- Los topes son los del esquema de la API (160 y 300 caracteres). -->
        <FieldGroup v-slot="{ id }" :label="t('admin.help.field_title')" native-control>
          <Input
            :id="id"
            v-model="form.title"
            :placeholder="text.placeholderTitle"
            maxlength="160"
          />
        </FieldGroup>

        <FieldGroup
          v-slot="{ id, describedby }"
          :label="t('admin.help.field_summary')"
          :hint="t('admin.help.summary_hint')"
          native-control
        >
          <Input
            :id="id"
            v-model="form.summary"
            :placeholder="t('admin.help.placeholder_summary')"
            maxlength="300"
            :aria-describedby="describedby"
          />
        </FieldGroup>

        <FieldGroup :label="t('admin.help.field_cover')" :hint="t('admin.help.cover_hint')">
          <div class="flex flex-wrap items-center gap-4">
            <div
              class="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border-primary bg-bg-secondary"
            >
              <img
                v-if="form.coverImage"
                :src="form.coverImage"
                alt=""
                class="h-full w-full object-cover"
              />
              <PhotoIcon v-else class="h-8 w-8 text-navy-700/30" />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" :loading="uploading" @click="pickCover">
                {{ t('admin.help.upload_cover') }}
              </Button>
              <Button
                v-if="form.coverImage"
                variant="ghost"
                size="sm"
                @click="form.coverImage = ''"
              >
                {{ t('admin.help.remove_cover') }}
              </Button>
            </div>
          </div>
        </FieldGroup>

        <FieldGroup :label="t('admin.help.field_body')">
          <template #actions>
            <Button
              variant="outline"
              size="sm"
              :icon-left="PhotoIcon"
              :loading="uploading"
              @click="pickBodyImage"
            >
              {{ t('admin.help.insert_image') }}
            </Button>
          </template>
          <template #default="{ labelId }">
            <MarkdownEditor
              v-model="form.body"
              :labelledby="labelId"
              god-name="Atenea"
              god-avatar="/app/avatars/atenea.svg"
              :ai-placeholder="text.aiPlaceholder"
              :ai-system-context="aiContext"
            />
          </template>
        </FieldGroup>

        <label class="flex items-center gap-2 text-sm text-navy-700">
          <Checkbox v-model="form.featured" />
          {{ t('admin.help.field_featured') }}
        </label>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            :icon-left="EyeIcon"
            :disabled="!canSave"
            @click="openFormPreview"
          >
            {{ t('admin.help.preview') }}
          </Button>
          <div class="flex gap-3">
            <Button variant="outline" @click="editorOpen = false">
              {{ t('common.actions.cancel') }}
            </Button>
            <Button variant="primary" :disabled="!canSave" :loading="saving" @click="save">
              {{ t('common.actions.save') }}
            </Button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Previsualización: el mismo cuerpo que pinta la página pública -->
    <Modal
      v-model="previewOpen"
      :title="preview?.article.title || t('admin.help.preview')"
      size="2xl"
      theme="light"
    >
      <div class="mx-auto max-w-3xl space-y-4">
        <HelpArticleSkeleton v-if="previewLoading" />
        <template v-else-if="preview">
          <Badge v-if="preview.status === 'borrador'" variant="warning">
            {{ t('admin.help.preview_draft_notice') }}
          </Badge>
          <HelpArticleBody :article="preview.article" :accent="preview.accent" />
        </template>
      </div>
    </Modal>

    <!-- Un único selector de ficheros para la portada y para el cuerpo -->
    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      class="hidden"
      @change="handleFile"
    />

    <ConfirmModal
      v-model="deleteOpen"
      :title="t('admin.help.delete_title')"
      :message="deleteMessage"
      :confirm-text="t('common.actions.delete')"
      :cancel-text="t('common.actions.cancel')"
      variant="danger"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import type { ActionMenuItem } from '~/types/action-menu.types'
import type { AdminArticlePayload, AdminHelpArticle, HelpStatus } from '~/composables/useHelpAdmin'
import type { HelpArea, HelpArticle, HelpArticleKind, HelpAudience } from '~/types/help.types'

/**
 * Gestor de contenidos del panel: lo usan las secciones «Centro de ayuda» y
 * «Blog», cada una con su área fija. Lo que no es del área no se ve ni se
 * puede elegir.
 *
 * El cuerpo se escribe con el mismo editor de markdown que la guía de clase y
 * las misiones, con Atenea al lado: quien documenta la plataforma usa las
 * mismas herramientas que quien la usa.
 *
 * Dos pestañas, artículos y categorías. Cada categoría es una tarjeta con sus
 * artículos, que se reordenan arrastrando el asa de cada fila (o, desde el
 * teclado, con las flechas sobre ella). Audiencia, tipo y vídeo solo existen
 * en el centro de ayuda: en el blog no se enseñan, no se filtran y no se
 * mandan (la API pone sus valores por defecto).
 */

const props = defineProps<{
  area: HelpArea
}>()

const { t } = useI18n()
const toast = useToast()
const {
  categories,
  loading,
  categoriesLoading,
  byCategory,
  articles,
  loadCategories,
  loadArticles,
  getArticle,
  previewArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  uploadImage,
  reorder,
} = useHelpAdmin()

const AUDIENCES: HelpAudience[] = ['profesor', 'alumno', 'ambos']
const KINDS: HelpArticleKind[] = ['guia', 'tutorial', 'faq', 'video']

/**
 * El mensaje de un error de la API, por su código: el texto que manda el
 * servidor va en castellano (o en inglés, si es de validación) y aquí hay
 * diez idiomas. Los códigos sin traducción caen al genérico.
 */
const API_ERROR_KEYS: Record<string, string> = {
  HELP_VIDEO_URL_REQUIRED: 'admin.help.video_required',
}

function apiMessage(error: unknown, fallback: string) {
  const code = (error as { data?: { code?: string } } | null)?.data?.code
  const key = code ? API_ERROR_KEYS[code] : undefined
  return key ? t(key) : fallback
}

// ---- sección ----

const isHelp = computed(() => props.area === 'ayuda')

/** Los textos que cambian entre el centro de ayuda y el blog. */
const text = computed(() =>
  isHelp.value
    ? {
        title: t('admin.help.title'),
        subtitle: t('admin.help.subtitle'),
        newArticle: t('admin.help.new_article'),
        editArticle: t('admin.help.edit_article'),
        emptyTitle: t('admin.help.empty_title'),
        emptyDescription: t('admin.help.empty_description'),
        reorderDisabled: t('admin.help.reorder_disabled_filtered'),
        placeholderTitle: t('admin.help.placeholder_title'),
        aiPlaceholder: t('admin.help.ai_placeholder'),
      }
    : {
        title: t('admin.blog.title'),
        subtitle: t('admin.blog.subtitle'),
        newArticle: t('admin.blog.new_article'),
        editArticle: t('admin.blog.edit_article'),
        emptyTitle: t('admin.blog.empty_title'),
        emptyDescription: t('admin.blog.empty_description'),
        reorderDisabled: t('admin.blog.reorder_disabled_filtered'),
        placeholderTitle: t('admin.blog.placeholder_title'),
        aiPlaceholder: t('admin.blog.ai_placeholder'),
      }
)

const deleteMessage = computed(() => {
  const title = pendingDelete.value?.title ?? ''
  return isHelp.value
    ? t('admin.help.delete_message', { title })
    : t('admin.blog.delete_message', { title })
})

// ---- pestañas ----

const tab = ref<'articles' | 'categories'>('articles')
const tabs = computed(() => [
  { id: 'articles', label: t('admin.help.tab_articles') },
  { id: 'categories', label: t('admin.help.tab_categories') },
])

function setTab(id: string) {
  tab.value = id === 'categories' ? 'categories' : 'articles'
}

// ---- filtros ----

const categoryFilter = ref('')
const statusFilter = ref('')
const audienceFilter = ref('')
const kindFilter = ref('')
/** Búsqueda por título (la API la admite en el listado de administración). */
const search = ref('')
const searchTerm = computed(() => search.value.trim())
/** El término que se manda a la API: el escrito, cuando se deja de escribir. */
const appliedSearch = refDebounced(searchTerm, 300)

const categoryOptions = computed(() => [
  { value: '', label: t('admin.help.filter_all_categories') },
  ...categories.value.map(category => ({ value: category.id, label: category.name })),
])

const statusOptions = computed(() => [
  { value: '', label: t('admin.help.filter_all_status') },
  { value: 'publicado', label: t('admin.help.status_publicado') },
  { value: 'borrador', label: t('admin.help.status_borrador') },
])

const audienceFilterOptions = computed(() => [
  { value: '', label: t('admin.help.filter_all_audiences') },
  ...AUDIENCES.map(value => ({ value, label: t(`common.help.audience.${value}`) })),
])

const kindFilterOptions = computed(() => [
  { value: '', label: t('admin.help.filter_all_kinds') },
  ...KINDS.map(value => ({ value, label: t(`common.help.kind.${value}`) })),
])

const filterId = useId()
const groupId = useId()

/**
 * Los desplegables de filtro, con su etiqueta (oculta) para el lector.
 * Audiencia y tipo solo en el centro de ayuda.
 */
const filters = computed(() => {
  const common = [
    {
      id: `${filterId}-category`,
      label: t('admin.help.field_category'),
      value: categoryFilter.value,
      options: categoryOptions.value,
      set: (value: string | number) => {
        categoryFilter.value = String(value)
      },
    },
    {
      id: `${filterId}-status`,
      label: t('admin.help.field_status'),
      value: statusFilter.value,
      options: statusOptions.value,
      set: (value: string | number) => {
        statusFilter.value = String(value)
      },
    },
  ]
  if (!isHelp.value) return common
  return [
    ...common,
    {
      id: `${filterId}-audience`,
      label: t('admin.help.field_audience'),
      value: audienceFilter.value,
      options: audienceFilterOptions.value,
      set: (value: string | number) => {
        audienceFilter.value = String(value)
      },
    },
    {
      id: `${filterId}-kind`,
      label: t('admin.help.field_kind'),
      value: kindFilter.value,
      options: kindFilterOptions.value,
      set: (value: string | number) => {
        kindFilter.value = String(value)
      },
    },
  ]
})

/** Los desplegables con un valor elegido (la búsqueda va aparte). */
const activeFilterCount = computed(
  () =>
    [categoryFilter.value, statusFilter.value, audienceFilter.value, kindFilter.value].filter(
      Boolean
    ).length
)

const hasActiveFilters = computed(() => activeFilterCount.value > 0 || !!searchTerm.value)

function clearFilters() {
  categoryFilter.value = ''
  statusFilter.value = ''
  audienceFilter.value = ''
  kindFilter.value = ''
  search.value = ''
}

// ---- carga ----

/** Ya se intentó la primera carga: hasta entonces se enseña el esqueleto. */
const loaded = ref(false)
const loadError = ref(false)
const showSkeleton = computed(() => !loaded.value || loading.value || categoriesLoading.value)

/** El contenedor del listado: recibe el foco si la fila que lo tenía desaparece. */
const listRef = ref<HTMLElement | null>(null)

interface ReloadOptions {
  /** Sin esqueleto: tras guardar, mover o borrar, la lista no se desmonta. */
  silent?: boolean
}

const loadList = ({ silent = false }: ReloadOptions = {}) =>
  loadArticles(
    {
      area: props.area,
      categoryId: categoryFilter.value || undefined,
      status: (statusFilter.value || undefined) as HelpStatus | undefined,
      audience: (audienceFilter.value || undefined) as HelpAudience | undefined,
      kind: (kindFilter.value || undefined) as HelpArticleKind | undefined,
      search: appliedSearch.value || undefined,
    },
    { silent }
  )

/**
 * Las categorías del área visible no llegaron: hasta que lleguen, una recarga
 * de artículos no puede quitar el error (mezclaría áreas), así que lo reintenta todo.
 */
const categoriesFailed = ref(false)

/** Un fallo de carga avisa y deja el estado de error; nunca lanza. */
async function refresh(options: ReloadOptions = {}) {
  if (categoriesFailed.value) return reloadAll(options)
  try {
    await loadList(options)
    loadError.value = false
  } catch {
    loadError.value = true
    toast.error(t('admin.help.list_error'))
  }
}

async function reloadAll({ silent = false }: ReloadOptions = {}) {
  try {
    try {
      await loadCategories(props.area, { silent })
      categoriesFailed.value = false
    } catch (error) {
      // Las de otra área no sirven: se vacían para no mezclarlas.
      categoriesFailed.value = true
      categories.value = []
      throw error
    }
    // Si la categoría filtrada se ha borrado, el filtro apuntaría a nada.
    if (!categories.value.some(category => category.id === categoryFilter.value)) {
      categoryFilter.value = ''
    }
    await loadList({ silent })
    loadError.value = false
  } catch {
    loadError.value = true
    toast.error(t('admin.help.list_error'))
  } finally {
    loaded.value = true
  }
}

const reloadSilently = () => reloadAll({ silent: true })

async function retryLoad() {
  await reloadAll()
}

/** Si el elemento con foco ha desaparecido al recargar, el foco va a la lista. */
async function keepFocus() {
  await nextTick()
  const active = document.activeElement
  if (!active || active === document.body || !active.isConnected) listRef.value?.focus()
}

watch([categoryFilter, statusFilter, audienceFilter, kindFilter], () => refresh())
// La búsqueda espera a que se deje de escribir.
watch(appliedSearch, () => refresh())

onMounted(() => reloadAll())

// ---- orden de los artículos ----

/**
 * Con una búsqueda o un filtro de estado, audiencia o tipo activo la lista de cada categoría
 * está incompleta y reordenarla pisaría el orden de los que no se ven.
 */
const canReorder = computed(
  () =>
    !statusFilter.value &&
    !audienceFilter.value &&
    !kindFilter.value &&
    // Con el escrito y con el aplicado: al vaciar la búsqueda, la lista sigue
    // filtrada hasta que llega la recarga.
    !searchTerm.value &&
    !appliedSearch.value
)

const reorderingArticles = ref(false)

/**
 * Guarda el orden de una categoría y recarga sin esqueleto. Devuelve si se
 * guardó: si no, la lista vuelve al orden anterior. Mientras se guarda se
 * ignoran los demás intentos: calcularían el orden sobre la lista vieja y
 * pisarían el primero.
 */
async function saveArticleOrder(categoryId: string, orderedIds: string[]) {
  if (reorderingArticles.value || !canReorder.value) return false
  reorderingArticles.value = true
  try {
    await reorder(categoryId, orderedIds)
    toast.success(t('admin.help.order_saved'))
    await refresh({ silent: true })
    return true
  } catch {
    toast.error(t('admin.help.order_error'))
    return false
  } finally {
    reorderingArticles.value = false
  }
}

/** El nombre de cada fila, para el nombre accesible de su asa. */
const articleTitle = (article: AdminHelpArticle) => article.title

function rowElement(id: string) {
  return listRef.value?.querySelector<HTMLElement>(`[data-sortable-id="${id}"]`) ?? null
}

// ---- acciones de cada fila ----

function articleMenu(article: AdminHelpArticle): ActionMenuItem[] {
  const published = article.status === 'publicado'
  return [
    { id: 'preview', label: t('admin.help.preview'), icon: EyeIcon },
    {
      id: 'status',
      label: published ? t('admin.help.unpublish') : t('admin.help.publish'),
      icon: published ? ArrowUturnLeftIcon : CheckCircleIcon,
    },
    {
      id: 'featured',
      label: article.featured ? t('admin.help.unfeature') : t('admin.help.feature'),
      icon: StarIcon,
    },
    { divider: true },
    { id: 'delete', label: t('common.actions.delete'), icon: TrashIcon, danger: true },
  ]
}

function onArticleAction(action: string, article: AdminHelpArticle) {
  switch (action) {
    case 'preview':
      openPreview(article)
      break
    case 'status':
      toggleStatus(article)
      break
    case 'featured':
      toggleFeatured(article)
      break
    case 'delete':
      askDelete(article)
      break
  }
}

// ---- gestor de categorías ----

const categoriesPanel = ref<{ openNew: () => void } | null>(null)

function openNewCategory() {
  categoriesPanel.value?.openNew()
}

/** Desde el vacío sin categorías: el panel solo existe en su pestaña, así que se espera a que monte. */
async function startWithCategory() {
  setTab('categories')
  await nextTick()
  openNewCategory()
}

// ---- editor ----

const editorOpen = ref(false)
const editorLoading = ref(false)
const saving = ref(false)
const editing = ref<AdminHelpArticle | null>(null)

/**
 * Número de la carga vigente del editor. Abrir otro artículo, crear uno o
 * cerrar el editor lo invalida: una respuesta atrasada se descarta.
 */
let editSeq = 0
watch(editorOpen, open => {
  if (!open) editSeq++
})

const form = ref({
  categoryId: '',
  title: '',
  summary: '',
  coverImage: '',
  body: '',
  status: 'borrador' as HelpStatus,
  featured: false,
  audience: 'profesor' as HelpAudience,
  kind: 'guia' as HelpArticleKind,
  videoUrl: '',
})

const categoryChoices = computed(() =>
  categories.value.map(category => ({ value: category.id, label: category.name }))
)

const statusChoices = computed(() => [
  { value: 'borrador', label: t('admin.help.status_borrador') },
  { value: 'publicado', label: t('admin.help.status_publicado') },
])

const audienceOptions = computed(() =>
  AUDIENCES.map(value => ({ value, label: t(`common.help.audience.${value}`) }))
)

const kindOptions = computed(() =>
  KINDS.map(value => ({ value, label: t(`common.help.kind.${value}`) }))
)

/** La URL escrita, solo cuando es un enlace https válido y cabe en la columna (500). */
const videoPreviewUrl = computed(() => {
  const url = form.value.videoUrl.trim()
  if (!url || url.length > 500) return ''
  try {
    // La API exige además el prefijo literal `https://` (URL() lo normaliza).
    return new URL(url).protocol === 'https:' && /^https:\/\//.test(url) ? url : ''
  } catch {
    return ''
  }
})

/**
 * La misma regla que la API: un vídeo publicado necesita URL, y la URL, si
 * la hay, tiene que ser https. Así el error se ve en el campo, no en un 400.
 */
const videoError = computed(() => {
  if (!isHelp.value || form.value.kind !== 'video') return ''
  const url = form.value.videoUrl.trim()
  if (url && !videoPreviewUrl.value) return t('admin.help.video_url_invalid')
  if (!url && form.value.status === 'publicado') return t('admin.help.video_required')
  return ''
})

/** La URL que se guarda y se previsualiza: ninguna si el tipo no es vídeo. */
const effectiveVideoUrl = computed(() =>
  isHelp.value && form.value.kind === 'video' ? form.value.videoUrl.trim() || null : null
)

const aiContext = computed(() => {
  if (!isHelp.value) {
    return (
      'Estás escribiendo una entrada del blog de ITAKAI, una plataforma educativa gamificada. ' +
      'Lo leen docentes y familias. Escribe en castellano, con un tono cercano, frases cortas ' +
      'y encabezados de nivel 2.'
    )
  }
  const reader = form.value.audience === 'alumno' ? 'alumnado' : 'profesorado'
  return (
    'Estás escribiendo un artículo del centro de ayuda de ITAKAI, una plataforma educativa gamificada. ' +
    `El destinatario es ${reader} sin conocimientos técnicos. Escribe en castellano, en segunda persona, ` +
    'con frases cortas, encabezados de nivel 2 y pasos numerados cuando describas un procedimiento.'
  )
})

const canSave = computed(
  () =>
    !editorLoading.value &&
    Boolean(form.value.categoryId && form.value.title.trim() && form.value.body.trim()) &&
    !videoError.value
)

function openNew() {
  editSeq++
  editing.value = null
  form.value = {
    categoryId: categories.value[0]?.id ?? '',
    title: '',
    summary: '',
    coverImage: '',
    body: '',
    status: 'borrador',
    featured: false,
    audience: 'profesor',
    kind: 'guia',
    videoUrl: '',
  }
  editorOpen.value = true
}

/**
 * Mientras llega el artículo el modal enseña un esqueleto y no deja guardar;
 * si no llega, se cierra con aviso. Así nunca se guarda sobre un artículo el
 * contenido de otro.
 */
async function openEdit(article: AdminHelpArticle) {
  const seq = ++editSeq
  editing.value = article
  editorLoading.value = true
  editorOpen.value = true
  try {
    const full = await getArticle(article.id)
    if (seq !== editSeq) return
    form.value = {
      categoryId: full.categoryId,
      title: full.title,
      summary: full.summary ?? '',
      coverImage: full.coverImage ?? '',
      body: full.body,
      status: full.status,
      featured: full.featured,
      audience: full.audience,
      kind: full.kind,
      videoUrl: full.videoUrl ?? '',
    }
  } catch {
    if (seq !== editSeq) return
    editorOpen.value = false
    toast.error(t('admin.help.load_error'))
  } finally {
    if (seq === editSeq) editorLoading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const payload: AdminArticlePayload = {
      categoryId: form.value.categoryId,
      title: form.value.title.trim(),
      summary: form.value.summary.trim() || null,
      coverImage: form.value.coverImage || null,
      body: form.value.body,
      status: form.value.status,
      featured: form.value.featured,
    }
    // En el blog no viajan tipo ni vídeo (al crear, la API pone los suyos; al
    // editar, no se tocan). La audiencia sí al crear: el blog es para todos.
    if (isHelp.value) {
      payload.audience = form.value.audience
      payload.kind = form.value.kind
      payload.videoUrl = effectiveVideoUrl.value
    } else if (!editing.value) {
      payload.audience = 'ambos'
    }
    if (editing.value) await updateArticle(editing.value.id, payload)
    else await createArticle(payload)
    toast.success(t('admin.help.saved'))
    editorOpen.value = false
    // También las categorías: su recuento cambia al crear o mover un artículo.
    await reloadSilently()
    await keepFocus()
  } catch (error) {
    toast.error(apiMessage(error, t('admin.help.save_error')))
  } finally {
    saving.value = false
  }
}

// ---- previsualización ----

interface PreviewView {
  article: Pick<HelpArticle, 'title' | 'body' | 'coverImage' | 'updatedAt' | 'kind' | 'videoUrl'>
  accent: string | undefined
  status: HelpStatus
}

const previewOpen = ref(false)
const previewLoading = ref(false)
const preview = ref<PreviewView | null>(null)

/** Como `editSeq`, para la previsualización. */
let previewSeq = 0
watch(previewOpen, open => {
  if (!open) previewSeq++
})

/** Desde la fila: lo que hay guardado, esté publicado o en borrador. */
async function openPreview(article: AdminHelpArticle) {
  const seq = ++previewSeq
  preview.value = null
  previewOpen.value = true
  previewLoading.value = true
  try {
    const view = await previewArticle(article.id)
    if (seq !== previewSeq) return
    preview.value = { article: view.article, accent: view.category.accent, status: article.status }
  } catch {
    if (seq !== previewSeq) return
    previewOpen.value = false
    toast.error(t('admin.help.load_error'))
  } finally {
    if (seq === previewSeq) previewLoading.value = false
  }
}

/** Desde el editor: lo que hay escrito, sin guardar. */
function openFormPreview() {
  previewSeq++
  preview.value = {
    article: {
      title: form.value.title.trim(),
      body: form.value.body,
      coverImage: form.value.coverImage || null,
      updatedAt: new Date().toISOString(),
      kind: isHelp.value ? form.value.kind : 'guia',
      videoUrl: effectiveVideoUrl.value,
    },
    accent: categories.value.find(category => category.id === form.value.categoryId)?.accent,
    status: form.value.status,
  }
  previewLoading.value = false
  previewOpen.value = true
}

// ---- imágenes ----

/**
 * Subida de imágenes del artículo: la portada y las que se intercalan en el
 * cuerpo. Comparten un solo `<input type="file">` —`target` decide dónde acaba
 * la URL— y el mismo camino que el resto de subidas de la plataforma: el
 * navegador lee el fichero, el servidor lo guarda donde toque (disco o almacenamiento externo) y
 * devuelve la URL definitiva.
 */
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const target = ref<'cover' | 'body'>('cover')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function pickCover() {
  target.value = 'cover'
  fileInput.value?.click()
}

function pickBodyImage() {
  target.value = 'body'
  fileInput.value?.click()
}

async function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (file.size > MAX_IMAGE_BYTES) {
    toast.error(t('admin.help.image_too_big'))
    return
  }

  uploading.value = true
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('read'))
      reader.readAsDataURL(file)
    })

    const url = await uploadImage(dataUrl)

    if (target.value === 'cover') {
      form.value.coverImage = url
    } else {
      // El texto alternativo se deja al autor: se edita ahí mismo, en el editor.
      const image = `\n\n![](${url})\n\n`
      form.value.body = form.value.body.trimEnd() + image
    }
  } catch {
    toast.error(t('admin.help.image_error'))
  } finally {
    uploading.value = false
  }
}

// ---- estado y destacado desde la fila ----

/** Un cambio rápido en curso: un segundo clic no manda otra petición. */
const patching = ref(false)

/**
 * Cambia un campo desde el menú de la fila y recarga sin esqueleto. El foco
 * sigue en el menú de la fila; si la fila desaparece (p. ej. por un filtro de
 * estado), va a la lista.
 */
async function patchArticle(
  article: AdminHelpArticle,
  patch: Partial<AdminArticlePayload>,
  successMessage: string
) {
  if (patching.value) return
  patching.value = true
  try {
    await updateArticle(article.id, patch)
    toast.success(successMessage)
    await refresh({ silent: true })
    await keepFocus()
  } catch (error) {
    toast.error(apiMessage(error, t('admin.help.save_error')))
  } finally {
    patching.value = false
  }
}

function toggleStatus(article: AdminHelpArticle) {
  const status: HelpStatus = article.status === 'publicado' ? 'borrador' : 'publicado'
  return patchArticle(
    article,
    { status },
    status === 'publicado' ? t('admin.help.published') : t('admin.help.unpublished')
  )
}

function toggleFeatured(article: AdminHelpArticle) {
  return patchArticle(article, { featured: !article.featured }, t('admin.help.saved'))
}

// ---- borrado ----

const deleteOpen = ref(false)
const pendingDelete = ref<AdminHelpArticle | null>(null)
/** Un borrado en curso: el aviso sigue abierto y no admite un segundo clic. */
const deleting = ref(false)

function askDelete(article: AdminHelpArticle) {
  pendingDelete.value = article
  deleteOpen.value = true
}

/**
 * El aviso se cierra después de recargar y el foco va a la fila siguiente de
 * la misma categoría (o a la anterior, o a la lista): la fila que lo abrió
 * ya no existe.
 */
async function confirmDelete() {
  const article = pendingDelete.value
  if (!article || deleting.value) return
  deleting.value = true
  const siblings = byCategory.value.find(group => group.category.id === article.category.id)
  const ids = siblings?.items.map(item => item.id) ?? []
  const position = ids.indexOf(article.id)
  const neighbour = ids[position + 1] ?? ids[position - 1]
  let deleted = false
  try {
    await deleteArticle(article.id)
    deleted = true
    toast.success(t('admin.help.deleted'))
    await reloadSilently()
  } catch {
    toast.error(t('admin.help.delete_error'))
  } finally {
    deleteOpen.value = false
    pendingDelete.value = null
    deleting.value = false
  }
  // Si falla, el modal devuelve el foco al menú de la fila, que sigue ahí.
  if (!deleted) return
  await nextTick()
  const next = neighbour
    ? rowElement(neighbour)?.querySelector<HTMLElement>('[data-action="edit"]')
    : null
  if (next) next.focus()
  else listRef.value?.focus()
}
</script>
