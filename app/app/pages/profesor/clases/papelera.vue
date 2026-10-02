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

      <ul ref="listRef" class="space-y-3">
        <li
          v-for="cls in classes"
          :key="cls.id"
          data-trash-item
          class="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <!-- Miniatura de la portada, como en «Mis clases» -->
            <div
              class="h-12 w-16 flex-shrink-0 rounded-xl bg-gray-100 bg-cover bg-center sm:h-14 sm:w-20"
              :style="coverStyle(cls.backgroundImage)"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <!-- El nombre entero, sin cortar: copias de una misma clase empiezan
                   igual y hay que distinguirlas antes de restaurar -->
              <h2
                :id="`trash-${cls.id}`"
                class="break-words text-base font-bold text-navy-700 sm:text-lg"
              >
                {{ cls.name }}
              </h2>
              <p class="mt-0.5 text-sm text-text-primary/70">{{ sentLine(cls) }}</p>
              <p class="mt-0.5 text-sm text-navy-700">
                {{
                  t('teacher.classes.trash.purge_on', {
                    date: formatTrashDate(cls.purgeAt, locale, isFew(cls)),
                  })
                }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 sm:justify-end">
            <!-- Cuenta atrás: se destaca cuando quedan pocos días -->
            <Badge :variant="isFew(cls) ? 'danger' : 'default'" size="sm">
              <ClockIcon class="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {{ countdown(cls) }}
            </Badge>
            <Button
              variant="outline"
              size="md"
              :icon-left="ArrowUturnLeftIcon"
              :loading="restoringId === cls.id"
              :disabled="!!restoringId"
              :aria-describedby="`trash-${cls.id}`"
              @click="restore(cls)"
            >
              {{ t('teacher.classes.trash.restore') }}
            </Button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowUturnLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import type { TrashedClass } from '~/types/class.types'
import { CLASS_TRASH_DAYS, CLASS_TRASH_FEW_DAYS, formatTrashDate } from '~/utils/class-trash'

/**
 * La papelera: las clases propias enviadas a ella, con cuándo se enviaron y
 * cuántos días les quedan antes de borrarse para siempre. Restaurar no pide
 * confirmación: no pierde nada y la clase vuelve archivada, sin alumnado
 * dentro hasta que se desarchiva. Es una página aparte de «Mis clases» (no una
 * tercera pestaña) para no estorbar a quien no borra nunca.
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
const { getImageUrl } = useImageUrl()

const classes = ref<TrashedClass[]>([])
const purgeDays = ref(CLASS_TRASH_DAYS)
const loading = ref(true)
const loadError = ref(false)
const restoringId = ref('')
const rootRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

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

function coverStyle(url?: string | null) {
  const src = getImageUrl(url)
  return src ? { backgroundImage: `url(${src})` } : undefined
}

const isFew = (cls: TrashedClass) => cls.daysLeft <= CLASS_TRASH_FEW_DAYS

/** Quién la envió y cuándo; sin autor si su cuenta ya no existe. */
function sentLine(cls: TrashedClass) {
  const date = formatTrashDate(cls.deletedAt, locale.value)
  if (cls.deletedBy?.isMe) return t('teacher.classes.trash.sent_by_me', { date })
  if (cls.deletedBy?.name) {
    return t('teacher.classes.trash.sent_by', { date, name: cls.deletedBy.name })
  }
  return t('teacher.classes.trash.sent_on', { date })
}

function countdown(cls: TrashedClass) {
  if (cls.daysLeft <= 0) return t('teacher.classes.trash.purge_today')
  return t('teacher.classes.trash.days_left', { count: cls.daysLeft }, cls.daysLeft)
}

/**
 * Tras quitar una fila, el foco va al «Restaurar» de la que ocupa su sitio (o
 * de la anterior si era la última) y, si ya no queda ninguna, al título de la
 * página: quien usa el teclado no vuelve al principio del documento.
 */
async function focusAfterRemoval(index: number) {
  await nextTick()
  const rows = listRef.value?.querySelectorAll<HTMLElement>('[data-trash-item]')
  const next = rows?.length ? rows[Math.min(index, rows.length - 1)] : undefined
  const target = next?.querySelector<HTMLElement>('button') ?? rootRef.value?.querySelector('h1')
  target?.focus()
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

onMounted(load)
</script>
