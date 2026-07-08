<template>
  <div class="space-y-6">
    <!-- Cabecera -->
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-navy-700">
        {{ t('teacher.templates.page_title') }}
      </h1>
      <p class="mt-1 text-text-secondary">{{ t('teacher.templates.page_subtitle') }}</p>
    </div>

    <!-- Filtros (mismo componente que las misiones) -->
    <FilterBar
      :search="search"
      :sort="sort"
      :results-count="filtered.length"
      :search-placeholder="t('teacher.templates.search')"
      :sort-options="sortOptions"
      :has-active-filters="hasActiveFilters"
      :active-filter-count="activeFilterCount"
      variant="red"
      @update:search="search = $event"
      @update:sort="sort = $event"
      @reset="resetFilters"
    >
      <template #filters>
        <MultiSelectDropdown
          :model-value="fSubjects"
          :options="CLASS_SUBJECTS"
          :all-label="t('teacher.templates.filter_all.subject')"
          :plural-label="t('teacher.templates.plural.subjects')"
          @update:model-value="fSubjects = $event"
        />
        <MultiSelectDropdown
          :model-value="fLevels"
          :options="CLASS_EDUCATION_LEVELS"
          :all-label="t('teacher.templates.filter_all.level')"
          :plural-label="t('teacher.templates.plural.levels')"
          @update:model-value="fLevels = $event"
        />
        <MultiSelectDropdown
          :model-value="fLanguages"
          :options="CLASS_LANGUAGES"
          :all-label="t('teacher.templates.filter_all.language')"
          :plural-label="t('teacher.templates.plural.languages')"
          @update:model-value="fLanguages = $event"
        />
        <MultiSelectDropdown
          :model-value="fProvinces"
          :options="SPANISH_PROVINCES"
          :all-label="t('teacher.templates.filter_all.province')"
          :plural-label="t('teacher.templates.plural.provinces')"
          @update:model-value="fProvinces = $event"
        />
      </template>
    </FilterBar>

    <!-- Cargando -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      <MissionCardSkeleton v-for="n in 6" :key="n" />
    </div>

    <!-- Vacío -->
    <EmptyState
      v-else-if="filtered.length === 0"
      :icon="RectangleStackIcon"
      :title="templates.length === 0 ? t('teacher.templates.empty_title') : t('teacher.templates.no_results_title')"
      :description="
        templates.length === 0
          ? t('teacher.templates.empty_description')
          : t('teacher.templates.no_results_description')
      "
    />

    <!-- Grid de plantillas -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      <article
        v-for="tpl in filtered"
        :key="tpl.id"
        class="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl"
      >
        <!-- Portada -->
        <div class="relative h-40 flex-shrink-0">
          <div
            v-if="tpl.backgroundImage"
            class="absolute inset-0 bg-cover bg-center"
            :style="{ backgroundImage: `url(${getImageUrl(tpl.backgroundImage) || ''})` }"
          />
          <div v-else class="absolute inset-0 bg-gray-100" />
          <StatusBadge
            v-if="tpl.isOwn"
            variant="activa"
            class="absolute right-3 top-3"
          >
            {{ t('teacher.templates.own') }}
          </StatusBadge>
        </div>

        <!-- Contenido -->
        <div class="flex flex-1 flex-col p-6">
          <h3 class="text-lg font-bold leading-tight text-navy-700 md:text-xl">
            {{ tpl.name }}
          </h3>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <Badge v-if="tpl.subject" variant="info" size="sm" class="gap-1">
              <BookOpenIcon class="h-3.5 w-3.5" />{{ tpl.subject }}
            </Badge>
            <Badge v-if="tpl.educationLevel" variant="info" size="sm" class="gap-1">
              <AcademicCapIcon class="h-3.5 w-3.5" />{{ tpl.educationLevel }}
            </Badge>
            <Badge v-if="tpl.language" variant="info" size="sm" class="gap-1">
              <LanguageIcon class="h-3.5 w-3.5" />{{ tpl.language }}
            </Badge>
          </div>

          <p class="mt-3 flex-1 text-sm text-text-secondary">{{ tpl.teacherName }}</p>

          <div class="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              :disabled="importingId !== null"
              @click="previewTemplate(tpl)"
            >
              {{ t('teacher.templates.preview_action') }}
            </Button>
            <Button
              variant="primary"
              size="sm"
              class="flex-1"
              :loading="importingId === tpl.id"
              :disabled="importingId !== null"
              @click="importTemplate(tpl)"
            >
              {{ t('teacher.templates.import') }}
            </Button>
          </div>
        </div>
      </article>
    </div>

    <!-- Modal de previsualización -->
    <TemplatePreviewModal
      v-model="previewOpen"
      :template-id="previewId"
      @imported="onImported"
    />
  </div>
</template>

<script setup lang="ts">
import {
  RectangleStackIcon,
  BookOpenIcon,
  AcademicCapIcon,
  LanguageIcon,
} from '@heroicons/vue/24/outline'
import {
  CLASS_SUBJECTS,
  CLASS_EDUCATION_LEVELS,
  CLASS_LANGUAGES,
  SPANISH_PROVINCES,
} from '~/utils/class-metadata'

interface Template {
  id: string
  name: string
  subject: string | null
  language: string | null
  educationLevel: string | null
  province: string | null
  backgroundImage: string | null
  teacherName: string
  isOwn: boolean
}

const { t } = useI18n()
const config = useRuntimeConfig()
const toast = useToast()
const { getImageUrl } = useImageUrl()
const classesStore = useClassesStore()

useHead({ title: () => t('teacher.templates.page_title') })

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

const templates = ref<Template[]>([])
const loading = ref(true)
const importingId = ref<string | null>(null)
const previewOpen = ref(false)
const previewId = ref<string | null>(null)

function previewTemplate(tpl: Template) {
  previewId.value = tpl.id
  previewOpen.value = true
}

function onImported(payload: { id: string; name: string }) {
  classesStore.hasLoadedClasses = false
  navigateTo(`/profesor/clases/${payload.id}`)
}

// Filtros (cliente, multi-select): array vacío = sin filtro.
const search = ref('')
const fSubjects = ref<string[]>([])
const fLevels = ref<string[]>([])
const fLanguages = ref<string[]>([])
const fProvinces = ref<string[]>([])
const sort = ref('recent')

const sortOptions = computed(() => [
  { value: 'recent', label: t('teacher.templates.sort.recent') },
  { value: 'name-asc', label: t('teacher.templates.sort.name_asc') },
  { value: 'name-desc', label: t('teacher.templates.sort.name_desc') },
])

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

const filtered = computed(() => {
  const q = normalize(search.value.trim())
  const list = templates.value.filter((tpl) => {
    if (fSubjects.value.length > 0 && (!tpl.subject || !fSubjects.value.includes(tpl.subject))) return false
    if (fLevels.value.length > 0 && (!tpl.educationLevel || !fLevels.value.includes(tpl.educationLevel))) return false
    if (fLanguages.value.length > 0 && (!tpl.language || !fLanguages.value.includes(tpl.language))) return false
    if (fProvinces.value.length > 0 && (!tpl.province || !fProvinces.value.includes(tpl.province))) return false
    if (q) {
      const hay = normalize(tpl.name)
      if (!hay.includes(q)) return false
    }
    return true
  })

  // Sort in-memory. 'recent' preserva el orden del backend (updatedAt desc).
  if (sort.value === 'name-asc') {
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }
  if (sort.value === 'name-desc') {
    return [...list].sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }))
  }
  return list
})

const activeFilterCount = computed(
  () => fSubjects.value.length + fLevels.value.length + fLanguages.value.length + fProvinces.value.length
)
const hasActiveFilters = computed(() => activeFilterCount.value > 0)

function resetFilters() {
  search.value = ''
  fSubjects.value = []
  fLevels.value = []
  fLanguages.value = []
  fProvinces.value = []
  sort.value = 'recent'
}

async function loadTemplates() {
  loading.value = true
  try {
    const data = await $fetch<{ templates: Template[] }>(`${config.public.apiBase}/teacher/templates`)
    templates.value = data.templates
  } catch {
    toast.error(t('teacher.templates.load_error'))
  } finally {
    loading.value = false
  }
}

async function importTemplate(tpl: Template) {
  if (importingId.value) return
  importingId.value = tpl.id
  try {
    const res = await $fetch<{ class: { id: string; name: string } }>(
      `${config.public.apiBase}/teacher/templates/${tpl.id}/import`,
      { method: 'POST' }
    )
    // Invalida la caché de clases para que la nueva aparezca al volver al listado.
    classesStore.hasLoadedClasses = false
    toast.success(t('teacher.templates.import_success', { name: res.class.name }))
    navigateTo(`/profesor/clases/${res.class.id}`)
  } catch {
    toast.error(t('teacher.templates.import_error'))
  } finally {
    importingId.value = null
  }
}

onMounted(loadTemplates)
</script>
