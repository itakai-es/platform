<template>
  <div class="space-y-4">
    <div class="rounded-2xl bg-white p-4 shadow-lg sm:p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h3 class="text-lg font-bold text-navy-700">
            {{ t('teacher.classes.detail.teachers.title') }}
          </h3>
          <p class="mt-0.5 text-sm text-text-secondary">
            {{ t('teacher.classes.detail.teachers.description') }}
          </p>
        </div>
        <Button
          v-if="can('teachers.manage')"
          variant="primary"
          size="md"
          :icon-left="UserPlusIcon"
          class="flex-shrink-0"
          @click="openAdd"
        >
          {{ t('teacher.classes.detail.teachers.add') }}
        </Button>
      </div>

      <!-- Cargando -->
      <div v-if="loading" class="mt-4 space-y-3">
        <Skeleton v-for="i in 3" :key="i" height="h-12" />
      </div>

      <!-- No se pudo cargar -->
      <div v-else-if="loadError" class="mt-4 space-y-3">
        <InfoNote role="alert">{{ t('teacher.classes.detail.teachers.load_error') }}</InfoNote>
        <Button variant="outline" size="sm" @click="load">
          {{ t('teacher.classes.detail.teachers.retry') }}
        </Button>
      </div>

      <ul v-else class="mt-2 divide-y divide-border-primary">
        <ClassTeacherItem
          v-for="teacher in teachers"
          :key="teacher.id"
          :name="teacher.name"
          :profile="teacher.profile"
          :is-owner="teacher.isOwner"
        >
          <template #details>
            <!-- Solo el correo se corta por cualquier sitio: las palabras, enteras -->
            <span class="break-words">
              <template v-if="teacher.id === myId">
                {{ t('teacher.classes.detail.teachers.you') }} ·
              </template>
              <template v-if="teacher.email"
                ><span class="break-all">{{ teacher.email }}</span> ·
              </template>
              {{
                t('teacher.classes.detail.teachers.access_line', {
                  access: t(`common.class_teachers.access.${teacher.access}`),
                })
              }}
            </span>
          </template>
          <template v-if="menuFor(teacher).length" #actions>
            <ActionMenu
              :label="t('teacher.classes.detail.teachers.menu_label', { name: teacher.name })"
              :items="menuFor(teacher)"
              @select="onSelect(teacher, $event)"
            />
          </template>
        </ClassTeacherItem>
      </ul>
    </div>

    <!-- Propiedad y salida -->
    <InfoNote v-if="isOwner && !loading">
      {{ t('teacher.classes.detail.teachers.owner_note') }}
    </InfoNote>
    <div
      v-else-if="can('teachers.leave') && !loading"
      class="flex flex-col gap-3 rounded-2xl border border-border-primary p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <p class="font-semibold text-navy-700">
          {{ t('teacher.classes.detail.teachers.leave_title') }}
        </p>
        <p class="mt-0.5 text-sm text-text-secondary">
          {{ t('teacher.classes.detail.teachers.leave_hint') }}
        </p>
      </div>
      <Button
        variant="outline"
        size="md"
        :icon-left="ArrowRightStartOnRectangleIcon"
        class="flex-shrink-0"
        @click="showLeave = true"
      >
        {{ t('teacher.classes.detail.teachers.leave') }}
      </Button>
    </div>

    <!-- Añadir por correo -->
    <Modal
      v-model="showAdd"
      :title="t('teacher.classes.detail.teachers.add_title')"
      size="md"
      persistent
    >
      <form :id="addFormId" class="space-y-4" novalidate @submit.prevent="submitAdd">
        <FormField
          :id="`${addFormId}-email`"
          :model-value="addForm.email"
          type="email"
          :label="t('teacher.classes.detail.teachers.field_email')"
          :hint="t('teacher.classes.detail.teachers.field_email_hint')"
          :error-message="addError"
          autocomplete="off"
          required
          @update:model-value="onEmailInput"
        />
        <ClassTeacherAccessFields
          v-model:profile="addForm.profile"
          v-model:access="addForm.access"
          :disabled="busy"
        />
        <InfoNote>{{ t('teacher.classes.detail.teachers.add_note') }}</InfoNote>
      </form>
      <template #footer>
        <Button variant="outline" size="md" @click="showAdd = false">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button variant="primary" size="md" type="submit" :form="addFormId" :loading="busy">
          {{ t('teacher.classes.detail.teachers.add_confirm') }}
        </Button>
      </template>
    </Modal>

    <!-- Cambiar perfil o nivel -->
    <Modal
      v-model="showEdit"
      :title="t('teacher.classes.detail.teachers.edit_title', { name: selected?.name ?? '' })"
      size="md"
      persistent
    >
      <form :id="editFormId" class="space-y-4" novalidate @submit.prevent="submitEdit">
        <ClassTeacherAccessFields
          v-model:profile="editForm.profile"
          v-model:access="editForm.access"
          :disabled="busy"
        />
        <InfoNote v-if="selected?.id === myId">
          {{ t('teacher.classes.detail.teachers.edit_self_note') }}
        </InfoNote>
      </form>
      <template #footer>
        <Button variant="outline" size="md" @click="showEdit = false">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button variant="primary" size="md" type="submit" :form="editFormId" :loading="busy">
          {{ t('common.actions.save') }}
        </Button>
      </template>
    </Modal>

    <!-- Quitar -->
    <ConfirmModal
      v-model="showRemove"
      :title="t('teacher.classes.detail.teachers.remove_title')"
      :message="
        t('teacher.classes.detail.teachers.remove_message', {
          name: selected?.name ?? '',
          class: className,
        })
      "
      :confirm-text="t('teacher.classes.detail.teachers.remove_confirm')"
      :cancel-text="t('common.actions.cancel')"
      variant="danger"
      :loading="busy"
      @confirm="confirmRemove"
    />

    <!-- Pasar la propiedad -->
    <ConfirmModal
      v-model="showTransfer"
      :title="t('teacher.classes.detail.teachers.transfer_title')"
      :message="
        t('teacher.classes.detail.teachers.transfer_message', {
          name: selected?.name ?? '',
          class: className,
        })
      "
      :confirm-text="t('teacher.classes.detail.teachers.transfer_confirm')"
      :cancel-text="t('common.actions.cancel')"
      variant="warning"
      :loading="busy"
      @confirm="confirmTransfer"
    >
      <ul class="list-disc space-y-1 pl-5 text-left text-sm text-navy-700">
        <li>{{ t('teacher.classes.detail.teachers.transfer_keeps') }}</li>
        <li>{{ t('teacher.classes.detail.teachers.transfer_loses') }}</li>
      </ul>
    </ConfirmModal>

    <!-- Salir -->
    <ConfirmModal
      v-model="showLeave"
      :title="t('teacher.classes.detail.teachers.leave_title')"
      :message="t('teacher.classes.detail.teachers.leave_message', { class: className })"
      :confirm-text="t('teacher.classes.detail.teachers.leave_confirm')"
      :cancel-text="t('common.actions.cancel')"
      variant="warning"
      :loading="busy"
      @confirm="confirmLeave"
    />

    <!-- Resultado de la última acción, para lectores de pantalla -->
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <p class="sr-only" role="alert">{{ errorAnnouncement }}</p>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsRightLeftIcon,
  PencilSquareIcon,
  UserMinusIcon,
  UserPlusIcon,
} from '@heroicons/vue/24/outline'
import type { ActionMenuItem } from '~/types/action-menu.types'
import type {
  ClassAccess,
  ClassAccessLevel,
  ClassTeacherMember,
  ClassTeacherProfile,
} from '~/types/class.types'
import { PROFILE_DEFAULT_ACCESS } from '~/utils/class-access'

/**
 * Profesorado de una clase, en sus ajustes. Lo ve todo el profesorado; quien la
 * administra añade por correo, cambia el perfil o el nivel y quita (al
 * propietario, no); el propietario pasa la propiedad a alguien con
 * administración, y cualquiera menos él puede salir de la clase.
 *
 * Tras cada cambio se vuelve a pedir la lista: trae también el acceso propio,
 * que puede haber cambiado (al bajarse uno mismo de nivel o al pasar la
 * propiedad) y se avisa con `access-change`.
 */
const props = defineProps<{
  classId: string
  className: string
  access: ClassAccess | null | undefined
}>()

const emit = defineEmits<{
  'access-change': [access: ClassAccess | null]
  left: []
}>()

const { t } = useI18n()
const toast = useToast()
const teacherStore = useTeacherStore()
const authStore = useAuthStore()

const { can, isOwner } = useClassPermissions(() => props.access)
const myId = computed(() => authStore.user?.id)

const teachers = ref<ClassTeacherMember[]>([])
const loading = ref(true)
const loadError = ref(false)
const busy = ref(false)
const announcement = ref('')
const errorAnnouncement = ref('')

async function load() {
  loadError.value = false
  try {
    const res = await teacherStore.fetchClassTeachers(props.classId)
    teachers.value = res.teachers
    if (!sameAccess(res.myAccess, props.access)) emit('access-change', res.myAccess)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function sameAccess(a: ClassAccess | null, b: ClassAccess | null | undefined) {
  return a?.access === b?.access && a?.profile === b?.profile && a?.isOwner === b?.isOwner
}

onMounted(load)

// --------- Menú de cada persona ---------
type TeacherAction = 'edit' | 'transfer' | 'remove'

function menuFor(teacher: ClassTeacherMember): ActionMenuItem[] {
  if (teacher.isOwner) return []
  const list: ActionMenuItem[] = []
  if (can('teachers.manage')) {
    list.push({
      id: 'edit',
      label: t('teacher.classes.detail.teachers.edit'),
      icon: PencilSquareIcon,
    })
  }
  // Solo se pasa a alguien con administración: a los demás, antes se les sube.
  if (can('class.transfer') && teacher.access === 'admin') {
    list.push({
      id: 'transfer',
      label: t('teacher.classes.detail.teachers.transfer'),
      icon: ArrowsRightLeftIcon,
    })
  }
  // Quitarse a uno mismo es salir de la clase: va aparte.
  if (can('teachers.manage') && teacher.id !== myId.value) {
    list.push(
      { divider: true },
      {
        id: 'remove',
        label: t('teacher.classes.detail.teachers.remove'),
        icon: UserMinusIcon,
        danger: true,
      }
    )
  }
  return list
}

const selected = ref<ClassTeacherMember | null>(null)
const showEdit = ref(false)
const showRemove = ref(false)
const showTransfer = ref(false)
const showLeave = ref(false)

function onSelect(teacher: ClassTeacherMember, id: string) {
  selected.value = teacher
  const action = id as TeacherAction
  if (action === 'edit') openEdit(teacher)
  else if (action === 'transfer') showTransfer.value = true
  else if (action === 'remove') showRemove.value = true
}

// --------- Errores ---------
/** Motivos conocidos de la API, con su texto. */
const ERROR_KEYS: Record<string, string> = {
  TEACHER_NOT_ADDABLE: 'not_addable',
  ALREADY_CLASS_TEACHER: 'already_teacher',
  CLASS_OWNER_LOCKED: 'owner_locked',
  CLASS_OWNER_CANNOT_LEAVE: 'owner_cannot_leave',
  TRANSFER_TARGET_NOT_ADMIN: 'transfer_not_admin',
  ALREADY_CLASS_OWNER: 'already_owner',
  RATE_LIMITED: 'too_many',
}

/** El texto del error: el de su motivo si se conoce; si no, el de la acción. */
function errorText(error: unknown, fallback: string): string {
  const e = error as { data?: { code?: string }; statusCode?: number }
  const code = e?.data?.code
  if (code && ERROR_KEYS[code])
    return t(`teacher.classes.detail.teachers.errors.${ERROR_KEYS[code]}`)
  if (e?.statusCode === 429) return t('teacher.classes.detail.teachers.errors.too_many')
  if (e?.statusCode === 403) return t('teacher.classes.detail.teachers.errors.forbidden')
  if (e?.statusCode === 404) return t('teacher.classes.detail.teachers.errors.not_found')
  return fallback
}

// --------- Añadir ---------
const addFormId = `class-teacher-add-${useId()}`.replace(/[^\w-]/g, '-')
const editFormId = `class-teacher-edit-${useId()}`.replace(/[^\w-]/g, '-')
const showAdd = ref(false)
const addError = ref('')
const addForm = reactive<{
  email: string
  profile: ClassTeacherProfile
  access: ClassAccessLevel
}>({ email: '', profile: 'sustituto', access: PROFILE_DEFAULT_ACCESS.sustituto })

function openAdd() {
  Object.assign(addForm, {
    email: '',
    profile: 'sustituto',
    access: PROFILE_DEFAULT_ACCESS.sustituto,
  })
  addError.value = ''
  showAdd.value = true
}

function onEmailInput(value: string | number) {
  addForm.email = String(value)
  addError.value = ''
}

async function submitAdd() {
  const email = addForm.email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addError.value = t('teacher.classes.detail.teachers.errors.invalid_email')
    return
  }
  busy.value = true
  try {
    const teacher = await teacherStore.addClassTeacher(props.classId, {
      email,
      profile: addForm.profile,
      access: addForm.access,
    })
    showAdd.value = false
    done(t('teacher.classes.detail.teachers.added', { name: teacher.name }))
    await load()
  } catch (error) {
    // Aquí el único dato que se escribe a mano es el correo.
    const invalid = (error as { data?: { code?: string } })?.data?.code === 'VALIDATION_ERROR'
    addError.value = invalid
      ? t('teacher.classes.detail.teachers.errors.invalid_email')
      : errorText(error, t('teacher.classes.detail.teachers.errors.add'))
  } finally {
    busy.value = false
  }
}

// --------- Cambiar perfil o nivel ---------
const editForm = reactive<{ profile: ClassTeacherProfile; access: ClassAccessLevel }>({
  profile: 'sustituto',
  access: 'edit',
})

function openEdit(teacher: ClassTeacherMember) {
  editForm.profile = teacher.profile
  editForm.access = teacher.access
  showEdit.value = true
}

async function submitEdit() {
  if (!selected.value) return
  busy.value = true
  try {
    await teacherStore.updateClassTeacher(props.classId, selected.value.id, {
      profile: editForm.profile,
      access: editForm.access,
    })
    showEdit.value = false
    done(t('teacher.classes.detail.teachers.changed', { name: selected.value.name }))
    await load()
  } catch (error) {
    void fail(errorText(error, t('teacher.classes.detail.teachers.errors.change')))
  } finally {
    busy.value = false
  }
}

// --------- Quitar ---------
async function confirmRemove() {
  if (!selected.value) return
  busy.value = true
  try {
    await teacherStore.removeClassTeacher(props.classId, selected.value.id)
    showRemove.value = false
    done(t('teacher.classes.detail.teachers.removed', { name: selected.value.name }))
    await load()
  } catch (error) {
    void fail(errorText(error, t('teacher.classes.detail.teachers.errors.remove')))
  } finally {
    busy.value = false
  }
}

// --------- Pasar la propiedad ---------
async function confirmTransfer() {
  if (!selected.value) return
  busy.value = true
  try {
    await teacherStore.transferClass(props.classId, selected.value.id)
    showTransfer.value = false
    done(t('teacher.classes.detail.teachers.transferred', { name: selected.value.name }))
    await load()
  } catch (error) {
    void fail(errorText(error, t('teacher.classes.detail.teachers.errors.transfer')))
  } finally {
    busy.value = false
  }
}

// --------- Salir ---------
async function confirmLeave() {
  busy.value = true
  try {
    await teacherStore.leaveClass(props.classId)
    showLeave.value = false
    toast.success(t('teacher.classes.detail.teachers.left', { class: props.className }))
    emit('left')
  } catch (error) {
    void fail(errorText(error, t('teacher.classes.detail.teachers.errors.leave')))
  } finally {
    busy.value = false
  }
}

/** Aviso de que algo salió bien, en pantalla y para el lector. */
function done(message: string) {
  toast.success(message)
  announcement.value = message
}

/**
 * Aviso de que algo falló, en pantalla y para el lector. Se vacía antes para que
 * el mismo error dos veces seguidas también se anuncie.
 */
async function fail(message: string) {
  toast.error(message)
  errorAnnouncement.value = ''
  await nextTick()
  errorAnnouncement.value = message
}
</script>
