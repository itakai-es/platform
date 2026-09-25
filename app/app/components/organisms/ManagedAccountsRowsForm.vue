<template>
  <!-- El botón de crear está en el pie de la ventana, unido a este formulario
       por su `id` (`formId`). -->
  <form :id="formId" class="space-y-4" novalidate @submit.prevent="submit">
    <p class="text-sm text-navy-700/80">{{ t('teacher.classes.detail.accounts.rows_intro') }}</p>

    <ol class="space-y-3">
      <li v-for="(row, index) in rows" :key="row.key">
        <fieldset class="min-w-0 rounded-2xl border border-border-primary p-3 sm:p-4">
          <!-- Flotante, para que se pinte dentro de la caja y no sobre el borde. -->
          <legend class="float-left mb-2 w-full text-sm font-semibold text-navy-700">
            {{ t('teacher.classes.detail.accounts.row_legend', { n: index + 1 }) }}
          </legend>
          <div class="clear-both flex flex-col gap-3 sm:flex-row sm:items-start">
            <FormField
              :id="fieldId('name', row)"
              class="min-w-0 flex-1"
              :model-value="row.name"
              :label="t('teacher.classes.detail.accounts.name_label')"
              :placeholder="t('teacher.classes.detail.accounts.name_placeholder')"
              :error-message="row.nameError"
              autocomplete="off"
              required
              @update:model-value="onNameInput(row, $event)"
            />
            <FormField
              :id="fieldId('username', row)"
              class="min-w-0 flex-1"
              :model-value="row.username"
              :label="t('teacher.classes.detail.accounts.username_label')"
              :hint="usernameHint(row)"
              :error-message="row.usernameError"
              autocomplete="off"
              @update:model-value="onUsernameInput(row, $event)"
            />
            <div v-if="rows.length > 1" class="flex justify-end sm:pt-8">
              <IconButton
                :icon="TrashIcon"
                :label="t('teacher.classes.detail.accounts.row_remove', { n: index + 1 })"
                danger
                @click="removeRow(index)"
              />
            </div>
          </div>
        </fieldset>
      </li>
    </ol>

    <Button
      ref="addButtonRef"
      variant="outline"
      size="sm"
      :icon-left="PlusIcon"
      :disabled="rows.length >= STUDENT_LIST_MAX"
      @click="addRow"
    >
      {{ t('teacher.classes.detail.accounts.row_add') }}
    </Button>
    <p v-if="rows.length >= STUDENT_LIST_MAX" class="text-sm text-navy-700/70">
      {{ t('teacher.classes.detail.accounts.max_rows', { max: STUDENT_LIST_MAX }) }}
    </p>
  </form>
</template>

<script setup lang="ts">
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { ManagedCredentials } from '~/types/auth.types'
import type { ManagedRowInput, ManagedRowReview, ManagedRowStatus } from '~/types/teacher.types'
import { STUDENT_LIST_MAX } from '~/utils/student-list'

/**
 * Crear cuentas una a una: una fila por alumno con su nombre y su usuario. El
 * usuario se propone al escribir el nombre (la API devuelve siempre uno libre y
 * nunca dice si otro existe) y se puede cambiar; si se cambia, deja de
 * proponerse. Todas las filas se crean de una vez, o ninguna.
 *
 * El botón de crear lo pone la ventana en su pie, con `form` igual a `formId`;
 * por eso se exponen `submitting` y `submitLabel`.
 */
const props = defineProps<{ classId: string; formId: string }>()
const emit = defineEmits<{ created: [list: ManagedCredentials[]] }>()

const { t } = useI18n()
const toast = useToast()
const teacherStore = useTeacherStore()

interface Row {
  key: number
  name: string
  username: string
  /** Escrito a mano: ya no se sustituye por la propuesta. */
  usernameEdited: boolean
  proposing: boolean
  /** Número de la última propuesta pedida, para descartar respuestas viejas. */
  proposalSeq: number
  nameError: string
  usernameError: string
}

let nextKey = 0
const newRow = (): Row => ({
  key: nextKey++,
  name: '',
  username: '',
  usernameEdited: false,
  proposing: false,
  proposalSeq: 0,
  nameError: '',
  usernameError: '',
})

const rows = ref<Row[]>([newRow()])
const submitting = ref(false)
const addButtonRef = ref<{ $el: HTMLElement } | null>(null)
const uid = `account-row-${useId()}`.replace(/[^\w-]/g, '-')

const fieldId = (field: 'name' | 'username', row: Row) => `${uid}-${field}-${row.key}`

/** Filas que se van a crear: las que tienen algo escrito. */
const filledRows = computed(() => rows.value.filter(r => r.name.trim() || r.username.trim()))

const submitLabel = computed(() => {
  const count = Math.max(filledRows.value.length, 1)
  return t('teacher.classes.detail.accounts.create_count', { count }, count)
})

function usernameHint(row: Row) {
  if (row.proposing) return t('teacher.classes.detail.accounts.username_proposing')
  return t('teacher.classes.detail.accounts.username_hint')
}

// ---- Propuesta de usuario, con retardo mientras se escribe ----

const timers = new Map<number, ReturnType<typeof setTimeout>>()

function scheduleProposal(row: Row) {
  const pending = timers.get(row.key)
  if (pending) clearTimeout(pending)
  const name = row.name.trim()
  if (!name) {
    row.username = ''
    row.proposing = false
    return
  }
  timers.set(
    row.key,
    setTimeout(() => {
      void propose(row, name)
    }, 400)
  )
}

async function propose(row: Row, name: string) {
  const seq = ++row.proposalSeq
  row.proposing = true
  try {
    const username = await teacherStore.proposeUsername(props.classId, name)
    // Solo si sigue siendo la última petición y nadie ha escrito el usuario a mano.
    if (seq === row.proposalSeq && !row.usernameEdited) row.username = username
  } catch {
    // Sin propuesta no pasa nada: se deja vacío y la API propone uno al crear la
    // cuenta, en vez de quedarse con el propuesto para lo escrito antes.
    if (seq === row.proposalSeq && !row.usernameEdited) row.username = ''
  } finally {
    if (seq === row.proposalSeq) row.proposing = false
  }
}

function onNameInput(row: Row, value: string | number) {
  row.name = String(value)
  row.nameError = ''
  if (!row.usernameEdited) scheduleProposal(row)
}

function onUsernameInput(row: Row, value: string | number) {
  row.username = String(value)
  row.usernameError = ''
  // Vaciarlo devuelve la propuesta automática.
  row.usernameEdited = row.username.trim() !== ''
  if (!row.usernameEdited) scheduleProposal(row)
}

onBeforeUnmount(() => {
  for (const timer of timers.values()) clearTimeout(timer)
})

// ---- Filas ----

function focusField(id: string) {
  void nextTick(() => document.getElementById(id)?.focus())
}

function addRow() {
  if (rows.value.length >= STUDENT_LIST_MAX) return
  const row = newRow()
  rows.value.push(row)
  focusField(fieldId('name', row))
}

function removeRow(index: number) {
  const [removed] = rows.value.splice(index, 1)
  if (removed) {
    const pending = timers.get(removed.key)
    if (pending) clearTimeout(pending)
  }
  const neighbour = rows.value[Math.min(index, rows.value.length - 1)]
  if (neighbour) focusField(fieldId('name', neighbour))
  else addButtonRef.value?.$el.focus()
}

// ---- Crear ----

/** Mensaje de una fila que la API no deja crear. */
function statusError(status: ManagedRowStatus): { name?: string; username?: string } {
  switch (status) {
    case 'empty_name':
    case 'invalid_name':
    case 'duplicate':
      return { name: t(`teacher.classes.detail.accounts.status.${status}`) }
    case 'invalid_username':
      return { username: t('teacher.classes.detail.accounts.status.invalid_username') }
    default:
      return {}
  }
}

/** Comprueba lo que se puede comprobar sin preguntar a la API. */
function validate(list: Row[]): boolean {
  let valid = true
  for (const row of list) {
    const name = row.name.trim()
    if (name.length < 2) {
      row.nameError = t(
        `teacher.classes.detail.accounts.status.${name ? 'invalid_name' : 'empty_name'}`
      )
      valid = false
    }
  }
  return valid
}

function focusFirstError() {
  const row = rows.value.find(r => r.nameError || r.usernameError)
  if (row) focusField(fieldId(row.nameError ? 'name' : 'username', row))
}

async function submit() {
  const list = filledRows.value
  if (list.length === 0) {
    const first = rows.value[0]
    if (first) {
      first.nameError = t('teacher.classes.detail.accounts.status.empty_name')
      focusField(fieldId('name', first))
    }
    return
  }
  if (!validate(list)) {
    focusFirstError()
    return
  }

  const payload: ManagedRowInput[] = list.map(row => ({
    name: row.name.trim(),
    ...(row.username.trim() ? { username: row.username.trim() } : {}),
  }))

  submitting.value = true
  try {
    const created = await teacherStore.createManagedStudents(props.classId, payload)
    emit('created', created)
  } catch (error) {
    const data = (error as { data?: { message?: string; rows?: ManagedRowReview[] } })?.data
    if (data?.rows) {
      for (const review of data.rows) {
        const row = list[review.index]
        if (!row) continue
        const errors = statusError(review.status)
        row.nameError = errors.name ?? ''
        row.usernameError = errors.username ?? ''
      }
      focusFirstError()
    } else {
      toast.error(data?.message || t('teacher.classes.detail.accounts.create_error'))
    }
  } finally {
    submitting.value = false
  }
}

defineExpose({ submitting, submitLabel })
</script>
