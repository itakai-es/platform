<template>
  <div class="space-y-6">
    <!-- Cabecera -->
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-navy-700">
        {{ t('teacher.templates.page_title') }}
      </h1>
      <p class="mt-1 text-text-secondary">{{ t('teacher.templates.page_subtitle') }}</p>
    </div>

    <!-- Filtros (los mismos que el catálogo público) -->
    <TemplateFilterBar
      v-model:search="search"
      v-model:sort="sort"
      v-model:levels="fLevels"
      v-model:subjects="fSubjects"
      v-model:languages="fLanguages"
      v-model:provinces="fProvinces"
      :results-count="filtered.length"
    />

    <!-- Cargando -->
    <TemplateCardGrid v-if="loading" :skeleton="6" />

    <!-- Vacío -->
    <EmptyState
      v-else-if="filtered.length === 0"
      :icon="RectangleStackIcon"
      :title="
        templates.length === 0
          ? t('teacher.templates.empty_title')
          : t('teacher.templates.no_results_title')
      "
      :description="
        templates.length === 0
          ? t('teacher.templates.empty_description')
          : t('teacher.templates.no_results_description')
      "
    />

    <!-- Grid de plantillas -->
    <TemplateCardGrid v-else>
      <TemplateCard v-for="tpl in filtered" :key="tpl.id" :template="tpl">
        <template #badge>
          <StatusBadge v-if="tpl.isOwn" variant="activa" class="absolute right-3 top-3">
            {{ t('teacher.templates.own') }}
          </StatusBadge>
        </template>

        <template #description>{{ tpl.teacherName }}</template>

        <template #actions>
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
            v-if="!tpl.isOwn"
            variant="primary"
            size="sm"
            class="flex-1"
            :loading="importingId === tpl.id"
            :disabled="importingId !== null"
            @click="importFromCard(tpl)"
          >
            {{ t('teacher.templates.import') }}
          </Button>
        </template>
      </TemplateCard>
    </TemplateCardGrid>

    <!-- Modal de previsualización -->
    <TemplatePreviewModal v-model="previewOpen" :template-id="previewId" @imported="onImported" />
  </div>
</template>

<script setup lang="ts">
import { RectangleStackIcon } from '@heroicons/vue/24/outline'
import type { TemplateCardData } from '~/types/template.types'

interface Template extends TemplateCardData {
  teacherName: string
  isOwn: boolean
  missionCount: number
}

const { t } = useI18n()
const config = useRuntimeConfig()
const toast = useToast()
const { importingId, importTemplate } = useTemplateImport()

useHead({ title: () => t('teacher.templates.page_title') })

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

const templates = ref<Template[]>([])
const loading = ref(true)
const previewOpen = ref(false)
const previewId = ref<string | null>(null)

function previewTemplate(tpl: Template) {
  previewId.value = tpl.id
  previewOpen.value = true
}

function onImported(payload: { id: string; name: string }) {
  navigateTo(`/profesor/clases/${payload.id}`)
}

// Filtros (cliente, multi-select): array vacío = sin filtro. La barra los
// recoge y los limpia; aquí se aplican.
const search = ref('')
const fSubjects = ref<string[]>([])
const fLevels = ref<string[]>([])
const fLanguages = ref<string[]>([])
const fProvinces = ref<string[]>([])
const sort = ref('recent')

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const filtered = computed(() => {
  const q = normalize(search.value.trim())
  const list = templates.value.filter(tpl => {
    if (fSubjects.value.length > 0 && (!tpl.subject || !fSubjects.value.includes(tpl.subject)))
      return false
    if (
      fLevels.value.length > 0 &&
      (!tpl.educationLevel || !fLevels.value.includes(tpl.educationLevel))
    )
      return false
    if (fLanguages.value.length > 0 && (!tpl.language || !fLanguages.value.includes(tpl.language)))
      return false
    if (fProvinces.value.length > 0 && (!tpl.province || !fProvinces.value.includes(tpl.province)))
      return false
    if (q) {
      const hay = normalize(tpl.name)
      if (!hay.includes(q)) return false
    }
    return true
  })

  // Sort in-memory. 'recent' preserva el orden del backend (updatedAt desc).
  if (sort.value === 'name-asc') {
    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
  }
  if (sort.value === 'name-desc') {
    return [...list].sort((a, b) =>
      b.name.localeCompare(a.name, undefined, { sensitivity: 'base' })
    )
  }
  return list
})

async function loadTemplates() {
  loading.value = true
  try {
    const data = await $fetch<{ templates: Template[] }>(
      `${config.public.apiBase}/teacher/templates`
    )
    templates.value = data.templates
  } catch {
    toast.error(t('teacher.templates.load_error'))
  } finally {
    loading.value = false
  }
}

// Si la plantilla trae misiones, «Importar» abre su previsualización: allí, junto
// a su botón, se elige si vienen y se dice cómo llegan. Sin misiones no hay
// nada que elegir, y se importa directamente.
async function importFromCard(tpl: Template) {
  if (tpl.missionCount > 0) {
    previewTemplate(tpl)
    return
  }
  const created = await importTemplate(tpl.id)
  if (created) navigateTo(`/profesor/clases/${created.id}`)
}

onMounted(loadTemplates)
</script>
