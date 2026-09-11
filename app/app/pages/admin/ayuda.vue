<template>
  <div class="space-y-6">
    <PageHeader :title="t('admin.help.title')" :subtitle="t('admin.help.subtitle')">
      <template #actions>
        <Button variant="primary" :icon-left="PlusIcon" @click="openNew">
          {{ t('admin.help.new_article') }}
        </Button>
      </template>
    </PageHeader>

    <!-- Resumen -->
    <div class="grid gap-4 sm:grid-cols-3">
      <StatCard
        :title="t('admin.help.stats_published')"
        :value="published"
        :icon="BookOpenIcon"
        type="clases"
      />
      <StatCard
        :title="t('admin.help.stats_drafts')"
        :value="drafts"
        :icon="PencilSquareIcon"
        type="pending"
      />
      <StatCard
        :title="t('admin.help.stats_views')"
        :value="totalViews"
        :icon="EyeIcon"
        type="stats"
      />
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3">
      <SelectDropdown v-model="categoryFilter" :options="categoryOptions" />
      <SelectDropdown v-model="statusFilter" :options="statusOptions" />
      <NuxtLink
        to="/ayuda"
        target="_blank"
        class="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-purple hover:underline"
      >
        {{ t('admin.help.view_public') }}
        <ArrowTopRightOnSquareIcon class="h-4 w-4" />
      </NuxtLink>
    </div>

    <!-- Listado -->
    <Card type="settings">
      <div v-if="loading" class="space-y-3 p-4">
        <Skeleton v-for="i in 5" :key="i" height="h-12" custom-class="rounded-xl" />
      </div>

      <EmptyState
        v-else-if="!byCategory.length"
        :icon="BookOpenIcon"
        :title="t('admin.help.empty_title')"
        :description="t('admin.help.empty_description')"
      />

      <div v-else class="divide-y divide-border-primary">
        <section v-for="group in byCategory" :key="group.category.id">
          <header class="flex items-center gap-2 bg-bg-secondary px-4 py-2">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-lg"
              :style="{
                backgroundColor: `var(--color-card-${helpCardType(group.category.accent)})`,
              }"
            >
              <component :is="helpIcon(group.category.icon)" class="h-3.5 w-3.5 text-navy-700" />
            </span>
            <h2 class="text-sm font-semibold text-navy-700">{{ group.category.name }}</h2>
            <span class="text-xs text-navy-700/70">
              {{ t('common.help.article_count', { count: group.items.length }) }}
            </span>
          </header>

          <article
            v-for="article in group.items"
            :key="article.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-secondary"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-navy-700">
                {{ article.title }}
                <StarIcon v-if="article.featured" class="ml-1 inline h-4 w-4 text-yellow" />
              </p>
              <p class="truncate text-xs text-navy-700/70">
                {{ article.summary || t('admin.help.no_summary') }}
              </p>
            </div>

            <Badge :variant="article.status === 'publicado' ? 'success' : 'default'" size="sm">
              {{ t(`admin.help.status_${article.status}`) }}
            </Badge>

            <span class="hidden w-24 text-right text-xs text-navy-700/70 sm:block">
              {{ t('admin.help.views', { count: article.views }) }}
            </span>

            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded-lg p-2 text-navy-700/70 transition-colors hover:bg-purple-light hover:text-navy-700"
                :aria-label="t('common.actions.edit')"
                @click="openEdit(article)"
              >
                <PencilSquareIcon class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="rounded-lg p-2 text-navy-700/70 transition-colors hover:bg-purple-light hover:text-navy-700"
                :aria-label="t('admin.help.toggle_status')"
                @click="toggleStatus(article)"
              >
                <component
                  :is="article.status === 'publicado' ? EyeSlashIcon : CheckCircleIcon"
                  class="h-4 w-4"
                />
              </button>
              <button
                type="button"
                class="rounded-lg p-2 text-navy-700/70 transition-colors hover:bg-red-light hover:text-navy-700"
                :aria-label="t('common.actions.delete')"
                @click="askDelete(article)"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </article>
        </section>
      </div>
    </Card>

    <!-- Editor -->
    <Modal
      v-model="editorOpen"
      :title="editing ? t('admin.help.edit_article') : t('admin.help.new_article')"
      size="2xl"
      theme="light"
      persistent
      sticky-chrome
    >
      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-navy-700">
              {{ t('admin.help.field_category') }}
            </label>
            <SelectDropdown v-model="form.categoryId" :options="categoryChoices" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-navy-700">
              {{ t('admin.help.field_status') }}
            </label>
            <SelectDropdown v-model="form.status" :options="statusChoices" />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-navy-700">
            {{ t('admin.help.field_title') }}
          </label>
          <Input v-model="form.title" :placeholder="t('admin.help.placeholder_title')" />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-navy-700">
            {{ t('admin.help.field_summary') }}
          </label>
          <Input v-model="form.summary" :placeholder="t('admin.help.placeholder_summary')" />
          <p class="mt-1 text-xs text-navy-700/70">{{ t('admin.help.summary_hint') }}</p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-navy-700">
            {{ t('admin.help.field_cover') }}
          </label>
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
              <p class="w-full text-xs text-navy-700/70">{{ t('admin.help.cover_hint') }}</p>
            </div>
          </div>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-3">
            <label class="block text-sm font-medium text-navy-700">
              {{ t('admin.help.field_body') }}
            </label>
            <Button variant="outline" size="sm" :loading="uploading" @click="pickBodyImage">
              <PhotoIcon class="mr-1.5 h-4 w-4" />
              {{ t('admin.help.insert_image') }}
            </Button>
          </div>
          <MarkdownEditor
            v-model="form.body"
            god-name="Atenea"
            god-avatar="/app/avatars/atenea.svg"
            :ai-placeholder="t('admin.help.ai_placeholder')"
            :ai-system-context="AI_CONTEXT"
          />
        </div>

        <label class="flex items-center gap-2 text-sm text-navy-700">
          <Checkbox v-model="form.featured" />
          {{ t('admin.help.field_featured') }}
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="editorOpen = false">
            {{ t('common.actions.cancel') }}
          </Button>
          <Button variant="primary" :disabled="!canSave" :loading="saving" @click="save">
            {{ t('common.actions.save') }}
          </Button>
        </div>
      </template>
    </Modal>

    <!-- Un único selector de ficheros para la portada y para el cuerpo -->
    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
      class="hidden"
      @change="handleFile"
    />

    <ConfirmModal
      v-model="deleteOpen"
      :title="t('admin.help.delete_title')"
      :message="t('admin.help.delete_message', { title: pendingDelete?.title ?? '' })"
      :confirm-text="t('common.actions.delete')"
      :cancel-text="t('common.actions.cancel')"
      variant="danger"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { helpCardType } from '~/utils/help-accents'
import { helpIcon } from '~/utils/help-icons'
import type { AdminHelpArticle, HelpStatus } from '~/composables/useHelpAdmin'

/**
 * Edición del centro de ayuda (Fase 3, punto 17).
 *
 * El cuerpo se escribe con el mismo editor de markdown que la guía de clase y
 * las misiones, con Atenea al lado: quien documenta la plataforma usa las
 * mismas herramientas que quien la usa.
 */

const { t } = useI18n()
const toast = useToast()
const {
  categories,
  loading,
  byCategory,
  articles,
  loadCategories,
  loadArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  uploadImage,
} = useHelpAdmin()

const AI_CONTEXT =
  'Estás escribiendo un artículo del centro de ayuda de ITAKAI, una plataforma educativa gamificada. ' +
  'El destinatario es profesorado sin conocimientos técnicos. Escribe en castellano, en segunda persona, ' +
  'con frases cortas, encabezados de nivel 2 y pasos numerados cuando describas un procedimiento.'

const categoryFilter = ref('')
const statusFilter = ref('')

const categoryOptions = computed(() => [
  { value: '', label: t('admin.help.filter_all_categories') },
  ...categories.value.map(category => ({ value: category.id, label: category.name })),
])

const statusOptions = computed(() => [
  { value: '', label: t('admin.help.filter_all_status') },
  { value: 'publicado', label: t('admin.help.status_publicado') },
  { value: 'borrador', label: t('admin.help.status_borrador') },
])

const categoryChoices = computed(() =>
  categories.value.map(category => ({ value: category.id, label: category.name }))
)

const statusChoices = computed(() => [
  { value: 'borrador', label: t('admin.help.status_borrador') },
  { value: 'publicado', label: t('admin.help.status_publicado') },
])

const published = computed(() => articles.value.filter(a => a.status === 'publicado').length)
const drafts = computed(() => articles.value.filter(a => a.status === 'borrador').length)
const totalViews = computed(() => articles.value.reduce((sum, a) => sum + a.views, 0))

const refresh = () =>
  loadArticles({
    categoryId: categoryFilter.value || undefined,
    status: (statusFilter.value || undefined) as HelpStatus | undefined,
  })

watch([categoryFilter, statusFilter], refresh)

onMounted(async () => {
  await loadCategories()
  await refresh()
})

// ---- editor ----

const editorOpen = ref(false)
const saving = ref(false)
const editing = ref<AdminHelpArticle | null>(null)

const form = ref({
  categoryId: '',
  title: '',
  summary: '',
  coverImage: '',
  body: '',
  status: 'borrador' as HelpStatus,
  featured: false,
})

const canSave = computed(
  () => form.value.categoryId && form.value.title.trim() && form.value.body.trim()
)

function openNew() {
  editing.value = null
  form.value = {
    categoryId: categories.value[0]?.id ?? '',
    title: '',
    summary: '',
    coverImage: '',
    body: '',
    status: 'borrador',
    featured: false,
  }
  editorOpen.value = true
}

async function openEdit(article: AdminHelpArticle) {
  editing.value = article
  editorOpen.value = true
  const full = await getArticle(article.id)
  form.value = {
    categoryId: full.categoryId,
    title: full.title,
    summary: full.summary ?? '',
    coverImage: full.coverImage ?? '',
    body: full.body,
    status: full.status,
    featured: full.featured,
  }
}

async function save() {
  saving.value = true
  try {
    const payload = {
      categoryId: form.value.categoryId,
      title: form.value.title.trim(),
      summary: form.value.summary.trim() || undefined,
      coverImage: form.value.coverImage || null,
      body: form.value.body,
      status: form.value.status,
      featured: form.value.featured,
    }
    if (editing.value) await updateArticle(editing.value.id, payload)
    else await createArticle(payload)
    toast.success(t('admin.help.saved'))
    editorOpen.value = false
    await refresh()
  } catch {
    toast.error(t('admin.help.save_error'))
  } finally {
    saving.value = false
  }
}

// ---- imágenes ----

/**
 * Subida de imágenes del artículo: la portada y las que se intercalan en el
 * cuerpo. Comparten un solo `<input type="file">` —`target` decide dónde acaba
 * la URL— y el mismo camino que el resto de subidas de la plataforma: el
 * navegador lee el fichero, el servidor lo guarda donde toque (disco o R2) y
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

async function toggleStatus(article: AdminHelpArticle) {
  const status: HelpStatus = article.status === 'publicado' ? 'borrador' : 'publicado'
  try {
    await updateArticle(article.id, { status })
    toast.success(status === 'publicado' ? t('admin.help.published') : t('admin.help.unpublished'))
    await refresh()
  } catch {
    toast.error(t('admin.help.save_error'))
  }
}

// ---- borrado ----

const deleteOpen = ref(false)
const pendingDelete = ref<AdminHelpArticle | null>(null)

function askDelete(article: AdminHelpArticle) {
  pendingDelete.value = article
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  try {
    await deleteArticle(pendingDelete.value.id)
    toast.success(t('admin.help.deleted'))
    await refresh()
  } catch {
    toast.error(t('admin.help.save_error'))
  } finally {
    pendingDelete.value = null
  }
}

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
})

useHead({ title: () => t('admin.help.title') })
</script>
