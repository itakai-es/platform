<template>
  <div>
    <InfoNote v-if="!canEdit" class="mb-6">
      {{ t('teacher.classes.detail.read_only_notice') }}
    </InfoNote>
    <div
      v-if="!isEditing"
      :class="{ 'cursor-pointer': canEdit && state.classGuide?.content }"
      @click="canEdit && state.classGuide?.content && startEditing()"
    >
      <ClassGuideMarkdown
        :content="state.classGuide?.content"
        :last-updated="state.classGuide?.lastUpdated"
        :loading="state.isLoadingGuide"
        :is-teacher="canEdit"
        @add-guide="startEditing"
      />
    </div>
    <MarkdownEditor
      v-else
      v-model="editContent"
      :god-name="assistantGod.name"
      :god-avatar="assistantGod.avatar"
      ai-placeholder="Ej: Crea una sección de criterios de evaluación..."
      context-label="Editando la guía de la clase"
      ai-modal-hint="Dile a la IA qué quieres para tu guía: normas, evaluación, asistencia, metodología..."
      ai-system-context="Quien imparte la clase está editando la GUIA de su clase. La guia contiene informacion practica para el alumnado: criterios de evaluacion (porcentajes de examenes, trabajos, participacion), normas de asistencia, reglas de la clase, metodologia, calendario, y cualquier informacion organizativa. Genera contenido practico, claro y bien estructurado."
      @cancel="isEditing = false"
      @save="save"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const config = useRuntimeConfig()
const teacherStore = useTeacherStore()
const aiStore = useAIAssistantStore()

const classId = computed(() => route.params.id as string)
const { state, ensureGuide, can } = useTeacherClassDetail(classId)
// La guía la cambia quien puede editar el contenido; el resto solo la lee.
const canEdit = computed(() => can('class.editContent'))

const isEditing = ref(false)
const editContent = ref('')

const assistantGod = computed(
  () =>
    aiStore.currentGod || {
      id: 'atenea',
      name: 'Atenea',
      avatar: '/app/avatars/atenea.svg',
      color: '#FFC338',
    }
)

function startEditing() {
  editContent.value = state.value.classGuide?.content || ''
  isEditing.value = true
}

async function save(content: string) {
  try {
    const res = await $fetch<{ guide: { content: string; lastUpdated: string } }>(
      `${config.public.apiBase}/teacher/classes/${classId.value}/guide`,
      { method: 'PUT', body: { content } }
    )
    state.value.classGuide = res.guide
    teacherStore.updateClassGuideCache(classId.value, res.guide)
    isEditing.value = false
    toast.success(t('teacher.classes.detail.guide_editor.toast_saved'))
  } catch (err) {
    console.error('Error saving guide:', err)
    toast.error(t('teacher.classes.detail.guide_editor.toast_error'))
  }
}

// Si entramos directo a /guia y aún no se cargó, dispararla; si ya lo está,
// ensureGuide() es no-op.
onMounted(() => void ensureGuide())
</script>
