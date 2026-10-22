<template>
  <div ref="rootRef" class="space-y-4 xs:space-y-5 sm:space-y-6">
    <PageHeader
      :breadcrumbs="[
        { label: t('teacher.classes.index.title'), to: '/profesor/clases' },
        { label: t('teacher.classes.trash.title') },
      ]"
      :title="t('teacher.classes.trash.title')"
      :subtitle="t('teacher.classes.trash.subtitle', { days: purgeDays })"
    />

    <div v-if="loading" class="space-y-3">
      <CardRowSkeleton v-for="i in 2" :key="i" />
    </div>

    <EmptyState
      v-else-if="loadError"
      :icon="ExclamationTriangleIcon"
      :title="t('teacher.classes.trash.error_title')"
      :description="t('teacher.classes.trash.error_description')"
    >
      <template #action>
        <Button variant="outline" @click="load">{{ t('teacher.classes.trash.retry') }}</Button>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="!classes.length"
      :icon="TrashIcon"
      :title="t('teacher.classes.trash.empty_title')"
      :description="t('teacher.classes.trash.empty_description', { days: purgeDays })"
    >
      <template #action>
        <Button variant="outline" to="/profesor/clases">
          {{ t('teacher.classes.detail.btn_back') }}
        </Button>
      </template>
    </EmptyState>

    <template v-else>
      <InfoNote>{{ t('teacher.classes.trash.restore_note') }}</InfoNote>

      <ClassTrashList
        ref="listRef"
        :classes="classes"
        :restoring-id="restoringId"
        @restore="restore"
        @purge="askPurge"
      >
        <template #details="{ cls }">
          <p class="mt-0.5 text-sm text-text-primary/70">{{ sentLine(cls) }}</p>
        </template>
      </ClassTrashList>
    </template>

    <ClassPurgeConfirm v-model="showPurge" :target="purgeTarget" @purged="onPurged" />
  </div>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { TrashedClass } from '~/types/class.types'
import { CLASS_TRASH_DAYS, formatTrashDate } from '~/utils/class-trash'

/**
 * La papelera: las clases propias enviadas a ella, con cuándo se enviaron y
 * cuántos días les quedan antes de borrarse para siempre. Restaurar no pide
 * confirmación: no pierde nada y la clase vuelve archivada, sin alumnado
 * dentro hasta que se desarchiva. Borrar ya sí (`ClassPurgeConfirm`): no hay
 * vuelta atrás. Es una página aparte de «Mis clases» (no una tercera pestaña)
 * para no estorbar a quien no borra nunca.
 */
definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

const { t, locale } = useI18n()

useHead({
  title: () => t('teacher.classes.trash.meta.title'),
  meta: [{ name: 'description', content: () => t('teacher.classes.trash.meta.description') }],
})

const teacherStore = useTeacherStore()
const toast = useToast()

const classes = ref<TrashedClass[]>([])
const purgeDays = ref(CLASS_TRASH_DAYS)
const loading = ref(true)
const loadError = ref(false)
const restoringId = ref('')
const showPurge = ref(false)
const purgeTarget = ref<TrashedClass | null>(null)
const rootRef = ref<HTMLElement | null>(null)
/** La lista (`ClassTrashList`), que sabe dónde dejar el foco tras quitar una fila. */
const listRef = ref<{ focusAfterRemoval: (index: number) => Promise<boolean> } | null>(null)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const response = await teacherStore.fetchClassTrash()
    classes.value = response.classes
    purgeDays.value = response.purgeDays
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/** Quién la envió y cuándo; sin autor si su cuenta ya no existe. */
function sentLine(cls: TrashedClass) {
  const date = formatTrashDate(cls.deletedAt, locale.value)
  if (cls.deletedBy?.isMe) return t('teacher.classes.trash.sent_by_me', { date })
  if (cls.deletedBy?.name) {
    return t('teacher.classes.trash.sent_by', { date, name: cls.deletedBy.name })
  }
  return t('teacher.classes.trash.sent_on', { date })
}

/**
 * Tras quitar una fila (restaurada o borrada), el foco va a la que ocupa su
 * sitio (ver `ClassTrashList`) y, si ya no queda ninguna, al título de la página.
 */
async function focusAfterRemoval(index: number) {
  await nextTick()
  if (await listRef.value?.focusAfterRemoval(index)) return
  rootRef.value?.querySelector('h1')?.focus()
}

async function restore(cls: TrashedClass) {
  if (restoringId.value) return
  restoringId.value = cls.id
  // El detalle de la clase guardado de una visita anterior (el aviso de la
  // papelera) ya no vale: la próxima visita la vuelve a pedir.
  const detail = useTeacherClassDetail(cls.id)
  try {
    await teacherStore.restoreClass(cls.id)
    detail.forget()
    const index = classes.value.findIndex(c => c.id === cls.id)
    classes.value = classes.value.filter(c => c.id !== cls.id)
    toast.success(t('teacher.classes.trash.restored', { name: cls.name }), { duration: 6000 })
    void focusAfterRemoval(index)
  } catch (error) {
    const message = (error as { data?: { message?: string } })?.data?.message
    toast.error(message || t('teacher.classes.trash.restore_error'))
  } finally {
    restoringId.value = ''
  }
}

function askPurge(cls: TrashedClass) {
  purgeTarget.value = cls
  showPurge.value = true
}

/** Borrada ya: fuera de la lista, como al restaurarla. */
function onPurged(purged: Pick<TrashedClass, 'id'>) {
  const index = classes.value.findIndex(c => c.id === purged.id)
  classes.value = classes.value.filter(c => c.id !== purged.id)
  void focusAfterRemoval(index)
}

onMounted(load)
</script>
