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
      <!-- Regiones vivas que existen desde que se abre: el lector de pantalla
           dice que se está calculando, lee los números al llegar y avisa del
           error (que es también por qué «Enviar» sigue desactivado). -->
      <div role="alert">
        <div v-if="impactError" class="space-y-3 text-left">
          <InfoNote>{{
            t('teacher.classes.detail.settings.management.trash.impact_error')
          }}</InfoNote>
          <Button type="button" variant="outline" size="sm" @click="loadImpact">
            {{ t('teacher.classes.detail.settings.management.trash.retry') }}
          </Button>
        </div>
      </div>

      <div role="status">
        <div v-if="loadingImpact" class="space-y-2">
          <span class="sr-only">{{
            t('teacher.classes.detail.settings.management.trash.impact_loading')
          }}</span>
          <Skeleton height="h-4" width="w-1/2" aria-hidden="true" />
          <Skeleton height="h-4" aria-hidden="true" />
          <Skeleton height="h-4" width="w-3/4" aria-hidden="true" />
        </div>

        <div v-else-if="impact" class="space-y-3 text-left text-sm text-navy-700">
          <p class="font-semibold">
            {{
              t('teacher.classes.detail.settings.management.trash.loses', {
                days: CLASS_TRASH_DAYS,
              })
            }}
          </p>
          <ul class="list-disc space-y-1 pl-5">
            <li v-for="item in losses" :key="item">{{ item }}</li>
          </ul>
          <InfoNote>{{ whileInTrash }}</InfoNote>
          <InfoNote v-if="impact.managedAccounts.unmanaged > 0">
            {{
              t(
                'teacher.classes.detail.settings.management.trash.unmanaged_accounts',
                { count: impact.managedAccounts.unmanaged },
                impact.managedAccounts.unmanaged
              )
            }}
          </InfoNote>
          <InfoNote v-if="impact.isTemplate">{{
            t('teacher.classes.detail.settings.management.trash.template')
          }}</InfoNote>
        </div>
      </div>
    </ConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline'
import type { ClassDeletionImpact } from '~/types/class.types'
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
const impact = ref<ClassDeletionImpact | null>(null)
const loadingImpact = ref(false)
const impactError = ref(false)

// Cada apertura pide los números de nuevo; una respuesta vieja no pisa la nueva.
let impactRun = 0

async function loadImpact() {
  const run = ++impactRun
  impact.value = null
  impactError.value = false
  loadingImpact.value = true
  try {
    const result = await teacherStore.fetchClassDeletionImpact(props.classId)
    if (run === impactRun) impact.value = result
  } catch {
    if (run === impactRun) impactError.value = true
  } finally {
    if (run === impactRun) loadingImpact.value = false
  }
}

function open() {
  showConfirm.value = true
  void loadImpact()
}

/** Lo que se pierde al borrarse: la clase siempre; lo demás, solo si hay. */
const losses = computed(() => {
  const i = impact.value
  if (!i) return []
  const list = [t('teacher.classes.detail.settings.management.trash.loses_class')]
  const { missions, students, submissionsWithFile: files, shopPurchases: purchases } = i
  const accounts = i.managedAccounts.deleted
  if (missions)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_missions',
        { count: missions },
        missions
      )
    )
  if (students)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_students',
        { count: students },
        students
      )
    )
  if (files)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_submissions',
        { count: files },
        files
      )
    )
  if (purchases)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_purchases',
        { count: purchases },
        purchases
      )
    )
  if (accounts)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_accounts',
        { count: accounts },
        accounts
      )
    )
  return list
})

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
