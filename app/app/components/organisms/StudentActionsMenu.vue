<template>
  <div v-if="items.length > 0" class="inline-flex">
    <ActionMenu
      :label="t('teacher.students.actions.menu_label', { name: student.name })"
      :items="items"
      @select="onSelect"
    />

    <!-- Restablecer: confirmación y, al volver, la hoja con su tarjeta -->
    <ConfirmModal
      v-model="showResetConfirm"
      :title="t('teacher.students.actions.reset_title')"
      :message="t('teacher.students.actions.reset_message', { name: student.name })"
      :confirm-text="t('teacher.students.actions.reset_confirm')"
      :cancel-text="t('common.actions.cancel')"
      variant="warning"
      :loading="busy"
      @confirm="confirmReset"
    />

    <!-- Restablecer no disponible: por qué y qué hacer -->
    <Modal v-model="showResetInfo" :title="t('teacher.students.actions.reset_title')" size="sm">
      <InfoNote>{{ resetInfoText }}</InfoNote>
      <template #footer>
        <Button variant="primary" size="md" @click="showResetInfo = false">
          {{ t('common.actions.close') }}
        </Button>
      </template>
    </Modal>

    <!-- Alias en la clase -->
    <Modal
      v-model="showNickname"
      :title="t('teacher.students.actions.nickname_title')"
      size="sm"
      persistent
    >
      <form :id="nicknameFormId" class="space-y-4" novalidate @submit.prevent="saveNickname">
        <FormField
          :id="`${nicknameFormId}-input`"
          :model-value="nickname"
          :label="t('teacher.students.actions.nickname_label')"
          :hint="t('teacher.students.actions.nickname_hint', { max: NICKNAME_MAX })"
          :error-message="nicknameError"
          autocomplete="off"
          required
          @update:model-value="onNicknameInput"
        />
      </form>
      <template #footer>
        <Button variant="outline" size="md" @click="showNickname = false">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button variant="primary" size="md" type="submit" :form="nicknameFormId" :loading="busy">
          {{ t('common.actions.save') }}
        </Button>
      </template>
    </Modal>

    <!-- Quitar de la clase: qué se pierde en ella -->
    <ConfirmModal
      v-model="showRemove"
      :title="t('teacher.students.actions.remove_title')"
      :message="
        t('teacher.students.actions.remove_message', { name: student.name, class: className })
      "
      :confirm-text="
        student.removalDeletesAccount
          ? t('teacher.students.actions.remove_unused_confirm')
          : t('teacher.students.actions.remove_confirm')
      "
      :cancel-text="t('common.actions.cancel')"
      variant="danger"
      :loading="busy"
      @confirm="confirmRemove"
    >
      <!-- Una cuenta que nunca se ha usado no tiene nada que perder: se borra entera -->
      <InfoNote v-if="student.removalDeletesAccount" class="text-left">
        {{ t('teacher.students.actions.remove_unused', { name: student.name }) }}
      </InfoNote>
      <div v-else class="space-y-3 text-left text-sm text-navy-700">
        <p class="font-semibold">{{ t('teacher.students.actions.remove_loses') }}</p>
        <ul class="list-disc space-y-1 pl-5">
          <li>{{ t('teacher.students.actions.remove_loses_progress') }}</li>
          <li>{{ t('teacher.students.actions.remove_loses_submissions') }}</li>
          <li>{{ t('teacher.students.actions.remove_loses_shop') }}</li>
          <li>{{ t('teacher.students.actions.remove_loses_history') }}</li>
        </ul>
        <p>{{ t('teacher.students.actions.remove_keeps') }}</p>
        <InfoNote v-if="student.accountType === 'managed' && student.isHomeClass">
          {{ t('teacher.students.actions.remove_home_class') }}
        </InfoNote>
      </div>
    </ConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { KeyIcon, PencilSquareIcon, UserMinusIcon } from '@heroicons/vue/24/outline'
import type { ActionMenuItem } from '~/types/action-menu.types'
import type { ClassAccess } from '~/types/class.types'
import type { ManageableStudent } from '~/types/teacher.types'

/**
 * El menú «⋮» de un alumno en una clase: restablecer su contraseña, cambiar su
 * alias en la clase y quitarlo de ella. Lo usan la pestaña Alumnos de la clase
 * y la ficha del alumno, con las mismas ventanas.
 *
 * Qué opciones aparecen lo decide el acceso propio en la clase (`access`): el
 * alias y quitar piden administración. Restablecer depende de la cuenta, no de
 * la clase: la de una cuenta sin correo la restablece quien administra su clase
 * de origen (lo dice `canResetPassword`, que calcula la API); a quien no puede,
 * la opción le explica qué hacer en lugar de fallar.
 *
 * Restablecer lleva a la hoja de credenciales de esta clase con una tarjeta.
 */
const props = defineProps<{
  classId: string
  className: string
  student: ManageableStudent
  access: ClassAccess | null | undefined
}>()

const emit = defineEmits<{
  renamed: [nickname: string]
  removed: []
}>()

const NICKNAME_MAX = 20

const { t } = useI18n()
const toast = useToast()
const teacherStore = useTeacherStore()
const credentialsStore = useCredentialsSheetStore()

const { can } = useClassPermissions(() => props.access)

const items = computed<ActionMenuItem[]>(() => {
  const list: ActionMenuItem[] = []
  if (props.student.canResetPassword || can('student.manage')) {
    list.push({
      id: 'reset',
      label: t('teacher.students.actions.reset'),
      icon: KeyIcon,
    })
  }
  if (can('student.nickname')) {
    list.push({
      id: 'nickname',
      label: t('teacher.students.actions.nickname'),
      icon: PencilSquareIcon,
    })
  }
  if (can('student.manage')) {
    list.push(
      { divider: true },
      {
        id: 'remove',
        label: t('teacher.students.actions.remove'),
        icon: UserMinusIcon,
        danger: true,
      }
    )
  }
  return list
})

const busy = ref(false)
const showResetConfirm = ref(false)
const showResetInfo = ref(false)
const showNickname = ref(false)
const showRemove = ref(false)

const nicknameFormId = `nickname-${useId()}`.replace(/[^\w-]/g, '-')
const nickname = ref('')
const nicknameError = ref('')

/** Por qué no se puede restablecer desde aquí. */
const resetInfoText = computed(() =>
  props.student.accountType === 'managed'
    ? t('teacher.students.actions.reset_not_home', { name: props.student.name })
    : t('teacher.students.actions.reset_has_email', { name: props.student.name })
)

function onSelect(id: string) {
  if (id === 'reset') openReset()
  else if (id === 'nickname') openNickname()
  else if (id === 'remove') showRemove.value = true
}

function openReset() {
  if (props.student.canResetPassword) showResetConfirm.value = true
  else showResetInfo.value = true
}

function openNickname() {
  nickname.value = props.student.nickname ?? ''
  nicknameError.value = ''
  showNickname.value = true
}

function onNicknameInput(value: string | number) {
  nickname.value = String(value)
  nicknameError.value = ''
}

/** El mensaje de la API si lo trae; si no, el genérico de la acción. */
function apiMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: string } })?.data?.message
  return message || fallback
}

async function confirmReset() {
  busy.value = true
  try {
    const credentials = await teacherStore.resetStudentPassword(props.student.id)
    credentialsStore.show(props.classId, [credentials])
    showResetConfirm.value = false
    await navigateTo(`/profesor/clases/${props.classId}/credenciales`)
  } catch (error) {
    toast.error(apiMessage(error, t('teacher.students.actions.reset_error')))
  } finally {
    busy.value = false
  }
}

async function saveNickname() {
  const clean = nickname.value.trim().replace(/\s+/g, ' ')
  if (!clean || clean.length > NICKNAME_MAX) {
    nicknameError.value = t('teacher.students.actions.nickname_invalid', { max: NICKNAME_MAX })
    return
  }
  busy.value = true
  try {
    const saved = await teacherStore.updateStudentNickname(props.classId, props.student.id, clean)
    showNickname.value = false
    toast.success(t('teacher.students.actions.nickname_saved'))
    emit('renamed', saved)
  } catch (error) {
    nicknameError.value = apiMessage(error, t('teacher.students.actions.nickname_error'))
  } finally {
    busy.value = false
  }
}

async function confirmRemove() {
  busy.value = true
  try {
    const { accountDeleted } = await teacherStore.removeStudentFromClass(
      props.classId,
      props.student.id
    )
    showRemove.value = false
    const name = props.student.name
    toast.success(
      accountDeleted
        ? t('teacher.students.actions.removed_account_deleted', { name })
        : t('teacher.students.actions.removed', { name })
    )
    emit('removed')
  } catch (error) {
    toast.error(apiMessage(error, t('teacher.students.actions.remove_error')))
  } finally {
    busy.value = false
  }
}
</script>
