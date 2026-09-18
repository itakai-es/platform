<template>
  <div class="space-y-6">
    <template v-if="entries.length > 0">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div class="space-y-1">
          <h2
            ref="headingRef"
            tabindex="-1"
            class="text-xl font-bold text-navy-700 focus:outline-none"
          >
            {{ t('teacher.classes.detail.credentials.title') }}
          </h2>
          <p class="text-sm text-navy-700/70">
            {{
              t(
                'teacher.classes.detail.credentials.count',
                { count: entries.length },
                entries.length
              )
            }}
          </p>
        </div>
        <Button variant="outline" size="md" @click="goToStudents">
          {{ t('teacher.classes.detail.credentials.back') }}
        </Button>
      </div>

      <!-- Copiar y descargar van primero; imprimir queda como alternativa. -->
      <div class="space-y-2 print:hidden">
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="primary"
            size="md"
            :icon-left="ClipboardDocumentListIcon"
            @click="copyAll"
          >
            {{ t('teacher.classes.detail.credentials.copy_all') }}
          </Button>
          <Button
            variant="primary"
            size="md"
            :icon-left="ArrowDownTrayIcon"
            :aria-describedby="csvNoteId"
            @click="downloadList"
          >
            {{ t('teacher.classes.detail.credentials.download_csv') }}
          </Button>
          <Button variant="outline" size="md" :icon-left="PrinterIcon" @click="print">
            {{ t('teacher.classes.detail.credentials.print') }}
          </Button>
        </div>
        <p :id="csvNoteId" class="text-xs text-navy-700/70">
          {{ t('teacher.classes.detail.credentials.csv_note') }}
        </p>
      </div>

      <InfoNote class="print:hidden">
        {{ t('teacher.classes.detail.credentials.once_note') }}
      </InfoNote>

      <!-- Lo que se ha copiado (o que no se ha podido), para el lector de pantalla -->
      <p class="sr-only" aria-live="polite">{{ announcement }}</p>

      <div
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2 print:gap-3"
      >
        <CredentialCard
          v-for="entry in entries"
          :key="entry.student.id"
          :name="entry.student.name"
          :username="entry.student.username"
          :password="entry.temporaryPassword"
          :class-name="className"
          :class-code="classCode"
          :login-url="loginUrl"
          @copy="copyOne(entry)"
        />
      </div>
    </template>

    <!-- Tras recargar (o sin hoja de esta clase): las contraseñas ya no existen en claro -->
    <EmptyState
      v-else
      :icon="KeyIcon"
      :title="t('teacher.classes.detail.credentials.gone_title')"
      :description="t('teacher.classes.detail.credentials.gone_description')"
    >
      <template #action>
        <Button variant="primary" @click="goToStudents">
          {{ t('teacher.classes.detail.credentials.back') }}
        </Button>
      </template>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  KeyIcon,
  PrinterIcon,
} from '@heroicons/vue/24/outline'
import type { ManagedCredentials } from '~/types/auth.types'
import { copyText } from '~/utils/clipboard'
import { downloadCsv, toCsv } from '~/utils/csv'
import { ROUTE_NAMES } from '~/utils/navigation'

/**
 * Hoja de credenciales de una clase: una tarjeta por cada cuenta recién creada
 * o restablecida. Se copian (una o todas), se descargan en un CSV o se imprimen
 * para recortarlas; todo se genera aquí, en el navegador.
 *
 * Las contraseñas vienen del almacén en memoria (`useCredentialsSheetStore`):
 * ni la URL ni el almacenamiento del navegador las guardan, y la API no las
 * vuelve a dar. Por eso, tras recargar, la página explica que ya no se pueden
 * mostrar y que se restablecen desde la pestaña Alumnos.
 */
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const classId = computed(() => route.params.id as string)

useHead({ title: () => t('teacher.classes.detail.credentials.meta_title') })

const credentialsStore = useCredentialsSheetStore()
const entries = computed(() => credentialsStore.entriesFor(classId.value))

// Nombre y código de la clase: los carga la página de la clase que la contiene.
const { state } = useTeacherClassDetail(classId)
const className = computed(() => state.value.classData?.name ?? '')
const classCode = computed(() => state.value.classData?.invitationCode ?? '')

const loginUrl = `${useRequestURL().origin}${ROUTE_NAMES.LOGIN}`
const csvNoteId = `credentials-csv-note-${useId()}`.replace(/[^\w-]/g, '-')

function goToStudents() {
  return navigateTo(`/profesor/clases/${classId.value}/alumnos`)
}

const headingRef = ref<HTMLElement | null>(null)

function print() {
  window.print()
}

// ---- Copiar ----

/** Nombre, usuario y contraseña de una cuenta, una línea cada uno. */
function accountLines(entry: ManagedCredentials): string[] {
  return [
    entry.student.name,
    `${t('teacher.classes.detail.credentials.card_username')}: ${entry.student.username}`,
    `${t('teacher.classes.detail.credentials.card_password')}: ${entry.temporaryPassword}`,
  ]
}

const announcement = ref('')

/** Copia y lo confirma con un aviso; el mismo texto se anuncia al lector de pantalla. */
async function copy(text: string, done: string) {
  // Vaciarlo antes hace que se vuelva a anunciar aunque se repita el mensaje.
  announcement.value = ''
  await nextTick()
  try {
    await copyText(text)
    toast.success(done)
    announcement.value = done
  } catch {
    const message = t('teacher.classes.detail.credentials.copy_error')
    toast.error(message, { duration: 6000 })
    announcement.value = message
  }
}

/** Una tarjeta: lo que su alumno necesita para entrar. */
function copyOne(entry: ManagedCredentials) {
  const text = [
    ...accountLines(entry),
    `${t('teacher.classes.detail.credentials.card_login_url')}: ${loginUrl}`,
  ].join('\n')
  return copy(
    text,
    t('teacher.classes.detail.credentials.copied_one', { name: entry.student.name })
  )
}

/** Todas: primero la clase y dónde se entra; después, una cuenta por bloque. */
function copyAll() {
  const heading = [
    `${t('teacher.classes.detail.credentials.field_class')}: ${className.value}`,
    `${t('teacher.classes.detail.credentials.card_login_url')}: ${loginUrl}`,
    `${t('teacher.classes.detail.credentials.card_class_code')}: ${classCode.value}`,
  ].join('\n')
  const blocks = entries.value.map(entry => accountLines(entry).join('\n'))
  return copy([heading, ...blocks].join('\n\n'), t('teacher.classes.detail.credentials.copied_all'))
}

// ---- Descargar ----

/** Trozo seguro para un nombre de fichero: sin tildes ni signos. */
function fileSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/** Fecha de hoy, en la hora local, como AAAA-MM-DD. */
function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** CSV con una fila por cuenta, generado aquí: la lista no pasa por el servidor. */
function downloadList() {
  const header = [
    t('teacher.classes.detail.credentials.field_name'),
    t('teacher.classes.detail.credentials.card_username'),
    t('teacher.classes.detail.credentials.card_password'),
    t('teacher.classes.detail.credentials.field_class'),
    t('teacher.classes.detail.credentials.field_login_url'),
  ]
  const rows = entries.value.map(entry => [
    entry.student.name,
    entry.student.username,
    entry.temporaryPassword,
    className.value,
    loginUrl,
  ])
  const name = [
    t('teacher.classes.detail.credentials.file_name'),
    fileSlug(className.value),
    today(),
  ]
    .filter(Boolean)
    .join('-')
  downloadCsv(toCsv([header, ...rows]), `${name}.csv`)
}

// Al llegar desde la ventana de altas, el foco va al título de la hoja.
onMounted(() => {
  headingRef.value?.focus()
})
</script>

<style>
/* Al imprimir solo quedan las tarjetas: el menú, la cabecera de la clase y los
   botones llevan `print:hidden`. */
@media print {
  @page {
    margin: 12mm;
  }
}
</style>
