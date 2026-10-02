<template>
  <div>
    <SettingsActionRow
      :title="t('teacher.classes.detail.settings.management.trash.title')"
      :hint="t('teacher.classes.detail.settings.management.trash.hint', { days: CLASS_TRASH_DAYS })"
    >
      <template #action>
        <Button type="button" variant="outline" size="md" :icon-left="TrashIcon" @click="open">
          {{ t('teacher.classes.detail.settings.management.trash.cta') }}
        </Button>
      </template>
    </SettingsActionRow>

    <!-- Enviar a la papelera: qué se perderá cuando se borre de verdad -->
    <ConfirmModal
      v-model="showConfirm"
      :title="t('teacher.classes.detail.settings.management.trash.modal_title')"
      :message="
        t('teacher.classes.detail.settings.management.trash.message', {
          name: className,
          days: CLASS_TRASH_DAYS,
        })
      "
      :confirm-text="t('teacher.classes.detail.settings.management.trash.confirm')"
      variant="danger"
      :loading="busy"
      :confirm-disabled="!impact"
      @confirm="confirmTrash"
    >
      <ClassDeletionImpactSummary
        :impact="impact"
        :loading="loadingImpact"
        :error="impactError"
        :heading="
          t('teacher.classes.detail.settings.management.trash.loses', { days: CLASS_TRASH_DAYS })
        "
        @retry="loadImpact"
      >
        <InfoNote>{{ whileInTrash }}</InfoNote>
        <InfoNote v-if="impact?.isTemplate">{{
          t('teacher.classes.detail.settings.management.trash.template')
        }}</InfoNote>
      </ClassDeletionImpactSummary>
    </ConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline'
import { CLASS_TRASH_DAYS } from '~/utils/class-trash'

/**
 * Eliminar una clase desde la sección «Gestión» de sus ajustes: la fila con el
 * botón y el aviso de lo que se perderá, con los números de la API
 * (`deletion-impact`). La clase va a la papelera y se puede restaurar durante
 * `CLASS_TRASH_DAYS` días; después se borra para siempre. Solo la ve quien
 * puede `class.delete` (la propiedad): lo decide quien la pinta.
 */
const props = defineProps<{
  classId: string
  className: string
}>()

const emit = defineEmits<{ trashed: [] }>()

const { t } = useI18n()
const toast = useToast()
const teacherStore = useTeacherStore()

const showConfirm = ref(false)
const busy = ref(false)
const {
  impact,
  loading: loadingImpact,
  error: impactError,
  load: loadClassImpact,
} = useClassDeletionImpact()

const loadImpact = () => loadClassImpact(props.classId)

function open() {
  showConfirm.value = true
  void loadImpact()
}

/** Qué pasa mientras está en la papelera, con el resto del profesorado si lo hay. */
const whileInTrash = computed(() => {
  const others = impact.value?.otherTeachers ?? 0
  return others > 0
    ? t(
        'teacher.classes.detail.settings.management.trash.while_trashed_teachers',
        { count: others },
        others
      )
    : t('teacher.classes.detail.settings.management.trash.while_trashed')
})

async function confirmTrash() {
  busy.value = true
  try {
    await teacherStore.trashClass(props.classId)
    showConfirm.value = false
    toast.success(
      t('teacher.classes.detail.settings.management.trash.done', {
        name: props.className,
        days: CLASS_TRASH_DAYS,
      }),
      {
        duration: 6000,
      }
    )
    emit('trashed')
  } catch (error) {
    const message = (error as { data?: { message?: string } })?.data?.message
    toast.error(message || t('teacher.classes.detail.settings.management.trash.error'))
  } finally {
    busy.value = false
  }
}
</script>
