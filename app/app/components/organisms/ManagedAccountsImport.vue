<template>
  <div class="space-y-4">
    <!-- Paso 1: pegar la lista o subir un CSV -->
    <div v-show="step === 'input'" class="space-y-4">
      <FieldGroup
        :label="t('teacher.classes.detail.accounts.import_label')"
        :hint="t('teacher.classes.detail.accounts.import_hint')"
        :error="inputError"
        native-control
      >
        <template #default="{ id, describedby }">
          <TextArea
            :id="id"
            ref="textareaRef"
            :model-value="text"
            :rows="8"
            :placeholder="t('teacher.classes.detail.accounts.import_placeholder')"
            :error="!!inputError"
            :aria-describedby="describedby"
            :aria-invalid="inputError ? 'true' : undefined"
            @update:model-value="onTextInput"
            @paste="onPaste"
          />
        </template>
      </FieldGroup>

      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" :icon-left="ArrowUpTrayIcon" @click="chooseFile">
          {{ t('teacher.classes.detail.accounts.import_upload') }}
        </Button>
        <Button variant="ghost" size="sm" :icon-left="ArrowDownTrayIcon" @click="downloadTemplate">
          {{ t('teacher.classes.detail.accounts.import_template') }}
        </Button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,text/csv,.txt,text/plain"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          @change="onFileChange"
        />
      </div>

      <p class="text-sm text-navy-700/80" aria-live="polite">
        <template v-if="fileName">
          {{ t('teacher.classes.detail.accounts.import_file_read', { file: fileName }) }}
        </template>
        {{
          t('teacher.classes.detail.accounts.import_count', { count: parsed.length }, parsed.length)
        }}
      </p>
    </div>

    <!-- Paso 2: revisión fila a fila antes de crear nada -->
    <div v-if="step === 'review'" class="space-y-4">
      <h3
        ref="summaryRef"
        tabindex="-1"
        class="text-base font-semibold text-navy-700 focus:outline-none"
      >
        {{ t('teacher.classes.detail.accounts.review_title') }}
      </h3>
      <p class="text-sm text-navy-700" aria-live="polite">
        {{ t('teacher.classes.detail.accounts.review_ok', { count: okCount }, okCount) }}
        <template v-if="errorCount > 0">
          ·
          {{
            t('teacher.classes.detail.accounts.review_errors', { count: errorCount }, errorCount)
          }}
        </template>
      </p>
      <InfoNote v-if="errorCount > 0">{{
        t('teacher.classes.detail.accounts.review_fix')
      }}</InfoNote>

      <div class="overflow-x-auto rounded-2xl border border-border-primary">
        <table class="w-full min-w-[520px] text-sm">
          <caption class="sr-only">
            {{
              t('teacher.classes.detail.accounts.review_title')
            }}
          </caption>
          <thead>
            <tr class="border-b border-navy-700/10 text-left text-navy-700/70">
              <th scope="col" class="px-3 py-2 font-semibold">
                {{ t('teacher.classes.detail.accounts.col_line') }}
              </th>
              <th scope="col" class="px-3 py-2 font-semibold">
                {{ t('teacher.classes.detail.accounts.name_label') }}
              </th>
              <th scope="col" class="px-3 py-2 font-semibold">
                {{ t('teacher.classes.detail.accounts.username_label') }}
              </th>
              <th scope="col" class="px-3 py-2 font-semibold">
                {{ t('teacher.classes.detail.accounts.col_status') }}
              </th>
              <th scope="col" class="px-3 py-2">
                <span class="sr-only">{{ t('teacher.classes.detail.accounts.col_actions') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in reviewRows"
              :key="row.index"
              class="border-b border-navy-700/10 last:border-0 align-top"
            >
              <td class="px-3 py-2 text-navy-700/70">{{ row.index + 1 }}</td>
              <td class="px-3 py-2 font-medium text-navy-700 break-words">
                {{ row.name || t('teacher.classes.detail.accounts.review_empty') }}
              </td>
              <td class="whitespace-nowrap px-3 py-2 font-mono text-navy-700">
                <template v-if="row.username">{{ row.username }}</template>
                <template v-else-if="row.requestedUsername">{{ row.requestedUsername }}</template>
                <template v-else>—</template>
              </td>
              <td class="px-3 py-2">
                <span class="flex items-start gap-1.5 text-navy-700">
                  <component
                    :is="statusIcon(row.status)"
                    class="mt-0.5 h-4 w-4 shrink-0"
                    :class="statusIconClass(row.status)"
                    aria-hidden="true"
                  />
                  <span>{{ statusText(row) }}</span>
                </span>
              </td>
              <td class="px-3 py-2 text-right">
                <IconButton
                  v-if="isError(row.status)"
                  :icon="TrashIcon"
                  :label="t('teacher.classes.detail.accounts.review_remove', { n: row.index + 1 })"
                  danger
                  @click="removeReviewRow(row.index)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import type { ManagedCredentials } from '~/types/auth.types'
import type { ManagedRowReview, ManagedRowStatus } from '~/types/teacher.types'
import { downloadCsv } from '~/utils/csv'
import { parseStudentList, STUDENT_LIST_MAX, studentListTemplate } from '~/utils/student-list'

/**
 * Importar una lista de alumnado: pegar lo copiado de una hoja de cálculo (una
 * línea por alumno) o subir un CSV, que se lee aquí, en el navegador. Antes de
 * crear nada se revisa con la API (modo de prueba) y se enseña el estado de
 * cada fila; con errores no se deja crear hasta corregirlos o quitar esas filas.
 * Se crean todas de una vez, o ninguna.
 *
 * Los botones de cada paso (revisar, volver, quitar errores y crear) los pone la
 * ventana en su pie: por eso se exponen el paso, los recuentos y las acciones.
 */
const props = defineProps<{ classId: string }>()
const emit = defineEmits<{ created: [list: ManagedCredentials[]] }>()

const { t } = useI18n()
const toast = useToast()
const teacherStore = useTeacherStore()

const step = ref<'input' | 'review'>('input')
const text = ref('')
const fromFile = ref(false)
const fileName = ref('')
const inputError = ref('')
const reviewing = ref(false)
const creating = ref(false)
const reviewRows = ref<ManagedRowReview[]>([])

const textareaRef = ref<{ $el: HTMLElement } | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const summaryRef = ref<HTMLElement | null>(null)

/** Cabeceras que se reconocen en la primera línea: la de la plantilla y las de siempre. */
const headerNames = computed(() => [
  t('teacher.classes.detail.accounts.template_name'),
  'nombre',
  'name',
])

const parsed = computed(() =>
  parseStudentList(text.value, { fromFile: fromFile.value, headerNames: headerNames.value })
)

/**
 * Lo que hay en el cuadro sigue siendo el fichero mientras se corrige ahí mismo;
 * vaciarlo o pegar encima de todo es empezar otra lista, que ya se lee como texto
 * pegado (la coma deja de separar columnas y deja de salir el nombre del fichero).
 */
function forgetFile() {
  fromFile.value = false
  fileName.value = ''
}

function onTextInput(value: string) {
  text.value = value
  inputError.value = ''
  if (value.trim() === '') forgetFile()
}

function onPaste(event: ClipboardEvent) {
  const box = event.target as HTMLTextAreaElement
  if (box.selectionStart === 0 && box.selectionEnd === box.value.length) forgetFile()
}

// ---- Fichero y plantilla ----

function chooseFile() {
  fileInputRef.value?.click()
}

/** El CSV se lee aquí y se deja en el cuadro, donde se puede revisar y corregir. */
function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!/\.(csv|txt)$/i.test(file.name)) {
    inputError.value = t('teacher.classes.detail.accounts.import_only_csv')
    return
  }
  if (file.size > 200_000) {
    inputError.value = t('teacher.classes.detail.accounts.import_file_too_big')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    text.value = String(reader.result ?? '')
    fromFile.value = true
    fileName.value = file.name
    inputError.value = ''
  }
  reader.onerror = () => {
    inputError.value = t('teacher.classes.detail.accounts.import_file_error')
  }
  reader.readAsText(file, 'utf-8')
}

/** Plantilla CSV generada aquí mismo, en el idioma de la interfaz. */
function downloadTemplate() {
  const csv = studentListTemplate(
    [
      t('teacher.classes.detail.accounts.template_name'),
      t('teacher.classes.detail.accounts.template_username'),
    ],
    [
      [t('teacher.classes.detail.accounts.template_example_one'), ''],
      [
        t('teacher.classes.detail.accounts.template_example_two'),
        t('teacher.classes.detail.accounts.template_example_two_username'),
      ],
    ]
  )
  downloadCsv(csv, `${t('teacher.classes.detail.accounts.template_file')}.csv`)
}

// ---- Revisión ----

const isError = (status: ManagedRowStatus) => status !== 'ok' && status !== 'username_taken'

const okCount = computed(() => reviewRows.value.filter(r => !isError(r.status)).length)
const errorCount = computed(() => reviewRows.value.length - okCount.value)

function statusText(row: ManagedRowReview) {
  if (row.status === 'username_taken') {
    return t('teacher.classes.detail.accounts.status.username_taken', {
      requested: row.requestedUsername ?? '',
      username: row.username,
    })
  }
  return t(`teacher.classes.detail.accounts.status.${row.status}`)
}

function statusIcon(status: ManagedRowStatus) {
  if (status === 'ok') return CheckCircleIcon
  if (status === 'username_taken') return ExclamationTriangleIcon
  return XCircleIcon
}

function statusIconClass(status: ManagedRowStatus) {
  if (status === 'ok') return 'text-success'
  if (status === 'username_taken') return 'text-warning'
  return 'text-error'
}

function focusTextarea() {
  void nextTick(() => textareaRef.value?.$el.focus())
}

async function review() {
  const rows = parsed.value
  if (rows.length === 0) {
    inputError.value = t('teacher.classes.detail.accounts.import_empty')
    focusTextarea()
    return
  }
  if (rows.length > STUDENT_LIST_MAX) {
    inputError.value = t('teacher.classes.detail.accounts.import_too_many', {
      max: STUDENT_LIST_MAX,
    })
    focusTextarea()
    return
  }

  reviewing.value = true
  try {
    const result = await teacherStore.reviewManagedStudents(props.classId, rows)
    reviewRows.value = result.rows
    step.value = 'review'
    await nextTick()
    summaryRef.value?.focus()
  } catch (error) {
    const message = (error as { data?: { message?: string } })?.data?.message
    inputError.value = message || t('teacher.classes.detail.accounts.review_error')
  } finally {
    reviewing.value = false
  }
}

function removeReviewRow(index: number) {
  reviewRows.value = reviewRows.value.filter(r => r.index !== index)
  void nextTick(() => summaryRef.value?.focus())
}

function removeErrorRows() {
  reviewRows.value = reviewRows.value.filter(r => !isError(r.status))
  void nextTick(() => summaryRef.value?.focus())
}

function backToInput() {
  step.value = 'input'
  focusTextarea()
}

async function create() {
  const rows = reviewRows.value
    .filter(r => !isError(r.status))
    .map(r => ({ name: r.name, username: r.username }))
  creating.value = true
  try {
    const created = await teacherStore.createManagedStudents(props.classId, rows)
    emit('created', created)
  } catch (error) {
    const data = (error as { data?: { message?: string; rows?: ManagedRowReview[] } })?.data
    if (data?.rows) {
      // La lista ha cambiado entre la revisión y el alta: se enseña la nueva revisión.
      reviewRows.value = data.rows
      await nextTick()
      summaryRef.value?.focus()
    } else {
      toast.error(data?.message || t('teacher.classes.detail.accounts.create_error'))
    }
  } finally {
    creating.value = false
  }
}

defineExpose({
  step,
  okCount,
  errorCount,
  reviewing,
  creating,
  review,
  backToInput,
  removeErrorRows,
  create,
})
</script>
