<template>
  <ClassListTemplate
    :title="t('teacher.classes.index.title')"
    :subtitle="t('teacher.classes.index.subtitle')"
    :classes="classes"
    :archived-classes="archivedClasses"
    :loading="isLoading"
    :show-archive-toggle="true"
    :show-archive-action="true"
    :show-duplicate-action="true"
    :archive-loading-id="archiveLoadingId"
    :duplicating-id="duplicatingId"
    :empty-description="t('teacher.classes.index.no_classes_description')"
    @class-click="navigateToClass"
    @archive-class="archiveClass"
    @unarchive-class="unarchiveClass"
    @duplicate-class="openDuplicateModal"
  >
    <template #header-action>
      <div class="flex items-center gap-2">
        <NuxtLink to="/profesor/plantillas">
          <Button variant="outline">
            <RectangleStackIcon class="w-4 h-4 mr-2" />
            {{ t('teacher.classes.index.templates') }}
          </Button>
        </NuxtLink>
        <NuxtLink to="/profesor/clases/crear">
          <Button variant="primary">
            <PlusIcon class="w-4 h-4 mr-2" />
            {{ t('teacher.classes.index.new_class') }}
          </Button>
        </NuxtLink>
      </div>
    </template>

    <template #empty-action>
      <NuxtLink to="/profesor/clases/crear">
        <Button variant="primary">
          <PlusIcon class="w-4 h-4 mr-2" />
          {{ t('teacher.classes.index.create_first') }}
        </Button>
      </NuxtLink>
    </template>

    <DuplicateClassModal
      v-model="duplicateModalOpen"
      :class-name="duplicateTarget?.name"
      :loading="!!duplicatingId"
      @confirm="confirmDuplicate"
    />
  </ClassListTemplate>
</template>

<script setup lang="ts">
import { PlusIcon, RectangleStackIcon } from '@heroicons/vue/24/outline'
import type { DuplicateOptions } from '~/components/organisms/DuplicateClassModal.vue'

const { t } = useI18n()

useHead({
  title: () => t('teacher.classes.index.meta.title'),
  meta: [{ name: 'description', content: () => t('teacher.classes.index.meta.description') }],
})

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

const router = useRouter()
const toast = useToast()
const teacherStore = useTeacherStore()
const classesStore = useClassesStore()

const classes = computed(() => classesStore.classes)
const archivedClasses = computed(() => teacherStore.archivedClasses)
const isLoading = computed(
  () => classesStore.isLoadingClasses || teacherStore.isLoadingArchivedClasses
)
const archiveLoadingId = ref('')
const duplicatingId = ref('')
const duplicateModalOpen = ref(false)
const duplicateTarget = ref<{ id: string; name: string } | null>(null)

const navigateToClass = (classId: string) => {
  router.push(`/profesor/clases/${classId}`)
}

const setArchived = async (classId: string, archived: boolean) => {
  if (archiveLoadingId.value) return
  archiveLoadingId.value = classId
  try {
    await teacherStore.setClassArchived(classId, archived)
    // Refresca ambas listas (activas + archivadas) tras cambiar el estado.
    await Promise.all([
      classesStore.ensureTeacherClasses(100, true),
      teacherStore.ensureArchivedClasses(true),
    ])
  } catch {
    // silent — the card confirm state already reset
  } finally {
    archiveLoadingId.value = ''
  }
}

const archiveClass = (classId: string) => setArchived(classId, true)
const unarchiveClass = (classId: string) => setArchived(classId, false)

const openDuplicateModal = (classId: string) => {
  const cls = classes.value.find(c => c.id === classId)
  duplicateTarget.value = { id: classId, name: cls?.name ?? '' }
  duplicateModalOpen.value = true
}

const confirmDuplicate = async (options: DuplicateOptions) => {
  if (!duplicateTarget.value || duplicatingId.value) return
  const classId = duplicateTarget.value.id
  duplicatingId.value = classId
  try {
    const res = await teacherStore.duplicateClass(classId, options)
    // Refresca la lista activa para que la copia aparezca al momento.
    await classesStore.ensureTeacherClasses(100, true)
    toast.success(t('teacher.classes.index.duplicate_success', { name: res.class.name }))
    duplicateModalOpen.value = false
  } catch {
    toast.error(t('teacher.classes.index.duplicate_error'))
  } finally {
    duplicatingId.value = ''
  }
}

onMounted(async () => {
  await Promise.all([classesStore.ensureTeacherClasses(), teacherStore.ensureArchivedClasses()])
})
</script>
