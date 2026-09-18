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
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" size="md" @click="goToStudents">
            {{ t('teacher.classes.detail.credentials.back') }}
          </Button>
          <Button variant="primary" size="md" :icon-left="PrinterIcon" @click="print">
            {{ t('teacher.classes.detail.credentials.print') }}
          </Button>
        </div>
      </div>

      <InfoNote class="print:hidden">
        {{ t('teacher.classes.detail.credentials.once_note') }}
      </InfoNote>

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
import { KeyIcon, PrinterIcon } from '@heroicons/vue/24/outline'
import { ROUTE_NAMES } from '~/utils/navigation'

/**
 * Hoja de credenciales de una clase: una tarjeta recortable por cada cuenta
 * recién creada o restablecida, para imprimirla o guardarla en PDF.
 *
 * Las contraseñas vienen del almacén en memoria (`useCredentialsSheetStore`):
 * ni la URL ni el almacenamiento del navegador las guardan, y la API no las
 * vuelve a dar. Por eso, tras recargar, la página explica que ya no se pueden
 * mostrar y que se restablecen desde la pestaña Alumnos.
 */
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t } = useI18n()
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

function goToStudents() {
  return navigateTo(`/profesor/clases/${classId.value}/alumnos`)
}

const headingRef = ref<HTMLElement | null>(null)

function print() {
  window.print()
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
