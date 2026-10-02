<template>
  <Modal
    :model-value="modelValue"
    size="2xl"
    :title="undefined"
    sticky-chrome
    @update:model-value="close"
  >
    <template #header="{ titleId }">
      <div class="min-w-0 flex-1">
        <h3 :id="titleId" class="text-xl font-bold text-navy-700 break-words">
          {{ tpl?.name || t('teacher.templates.preview.loading') }}
        </h3>
        <p v-if="tpl?.teacherName" class="mt-0.5 text-sm text-text-secondary">
          {{ t('teacher.templates.preview.by', { name: tpl.teacherName }) }}
        </p>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <Skeleton v-for="n in 5" :key="n" width="w-28" height="h-9" custom-class="rounded-full" />
      </div>
      <Skeleton height="h-48" custom-class="rounded-2xl" />
    </div>

    <!-- Montada de nuevo con cada plantilla: se abre por la historia -->
    <TemplateContentTabs v-else-if="tpl" :key="tpl.id" :template="tpl" :features="features" />

    <div v-else class="py-8 text-center text-text-secondary">
      {{ t('teacher.templates.preview.error') }}
    </div>

    <template #footer>
      <!-- Si trae misiones, junto a importar se elige si vienen; en el móvil,
           la casilla va encima de los botones. -->
      <div class="flex w-full flex-wrap items-center justify-end gap-3">
        <TemplateImportMissionsOption
          v-if="tpl && !tpl.isOwn && tpl.missions.length > 0"
          v-model="withMissions"
          :count="tpl.missions.length"
          :disabled="importingId !== null"
          class="basis-full sm:mr-auto sm:basis-auto sm:flex-1"
        />
        <Button variant="outline" size="md" @click="close">
          {{ t('common.actions.close') }}
        </Button>
        <Button
          v-if="tpl && !tpl.isOwn"
          variant="primary"
          size="md"
          :loading="importingId !== null"
          :disabled="importingId !== null"
          @click="handleImport"
        >
          {{ t('teacher.templates.import') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import type { TeacherTemplateDetail } from '~/types/template.types'
import { resolveClassSettings } from '~/utils/class-settings'

/**
 * La previsualización de una plantilla en el catálogo del profesorado: quién
 * la publicó y lo que trae, en las mismas pestañas que la ficha pública. Si no
 * es suya, se importa desde aquí y, si trae misiones, se elige si vienen con
 * ella (marcado de entrada, como en la ficha pública).
 */

const props = defineProps<{
  modelValue: boolean
  templateId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: [payload: { id: string; name: string }]
}>()

const { t } = useI18n()
const config = useRuntimeConfig()
const toast = useToast()
const { importingId, importTemplate } = useTemplateImport()

const tpl = ref<TeacherTemplateDetail | null>(null)
const loading = ref(false)
/** Importar también sus misiones: marcado de entrada en cada plantilla. */
const withMissions = ref(true)

/** Las funcionalidades como las resuelve la API: lo que se lleva quien la importa. */
const features = computed(() => resolveClassSettings(tpl.value?.settings))

async function load(id: string) {
  loading.value = true
  tpl.value = null
  withMissions.value = true
  try {
    tpl.value = await $fetch<TeacherTemplateDetail>(
      `${config.public.apiBase}/teacher/templates/${id}`
    )
  } catch {
    toast.error(t('teacher.templates.preview.load_error'))
  } finally {
    loading.value = false
  }
}

async function handleImport() {
  if (!tpl.value) return
  const missions = withMissions.value && tpl.value.missions.length > 0
  const created = await importTemplate(tpl.value.id, { missions })
  if (!created) return
  emit('imported', created)
  close()
}

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.templateId,
  id => {
    if (id && props.modelValue) load(id)
  },
  { immediate: true }
)
watch(
  () => props.modelValue,
  open => {
    if (open && props.templateId) load(props.templateId)
    if (!open) tpl.value = null
  }
)
</script>
