<template>
  <div>
    <div
      v-if="!isEditing"
      :class="{ 'cursor-pointer': canEdit && state.classData?.narrative }"
      @click="canEdit && state.classData?.narrative && startEditing()"
    >
      <ClassGuideMarkdown
        :content="state.classData?.narrative"
        :last-updated="state.classData?.updatedAt"
        :loading="false"
        :is-teacher="canEdit"
        @add-guide="startEditing"
      />
    </div>
    <MarkdownEditor
      v-else
      v-model="editContent"
      :god-name="assistantGod.name"
      :god-avatar="assistantGod.avatar"
      ai-placeholder="Ej: Añade una sección sobre las casas de Hogwarts..."
      context-label="Editando la historia de la clase"
      ai-modal-hint="Dile a la IA qué quieres añadir o cambiar de la historia. Tiene acceso al contenido actual."
      ai-system-context="El profesor esta editando la NARRATIVA/HISTORIA de su clase gamificada. Es la historia que envuelve toda la clase y motiva a los alumnos. Genera contenido narrativo, inmersivo y creativo que encaje con la tematica de la clase."
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
const teacherStore = useTeacherStore()
const aiStore = useAIAssistantStore()

const classId = computed(() => route.params.id as string)
const { state, setClassData, can } = useTeacherClassDetail(classId)
// La historia la cambia quien puede editar el contenido; el resto solo la lee.
const canEdit = computed(() => can('class.editContent'))

const isEditing = ref(false)
const editContent = ref('')

// Avatar/nombre de la IA para el modal del editor (la decisión real del agente
// la toma el backend según rol; aquí solo es skin).
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
  editContent.value = state.value.classData?.narrative || ''
  isEditing.value = true
}

async function save(content: string) {
  try {
    await teacherStore.updateClass(classId.value, { narrative: content })
    setClassData({ narrative: content })
    isEditing.value = false
    toast.success(t('teacher.classes.detail.guide_editor.toast_saved'))
  } catch {
    toast.error(t('teacher.classes.detail.guide_editor.toast_error'))
  }
}
</script>
