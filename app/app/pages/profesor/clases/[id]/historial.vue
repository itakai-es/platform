<template>
  <div class="space-y-4">
    <!-- Filtros: quién y qué -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
      <FieldGroup v-slot="{ labelId }" :label="t('teacher.classes.detail.history.filter_actor')">
        <SelectDropdown
          :model-value="actorId"
          :options="actorOptions"
          :labelledby="labelId"
          searchable
          :search-placeholder="t('teacher.classes.detail.history.filter_search')"
          @update:model-value="setActor"
        />
      </FieldGroup>
      <FieldGroup v-slot="{ labelId }" :label="t('teacher.classes.detail.history.filter_type')">
        <SelectDropdown
          :model-value="type"
          :options="typeOptions"
          :labelledby="labelId"
          @update:model-value="setType"
        />
      </FieldGroup>
    </div>

    <!-- Cargando (solo la primera vez: al cambiar de página se queda la lista) -->
    <div v-if="loading && !data" class="space-y-3">
      <Skeleton v-for="i in 5" :key="i" height="h-14" />
    </div>

    <!-- No se pudo cargar -->
    <EmptyState
      v-else-if="loadError"
      :icon="ExclamationTriangleIcon"
      :title="t('teacher.classes.detail.history.error_title')"
      :description="t('teacher.classes.detail.history.error_description')"
    >
      <template #action>
        <Button variant="primary" @click="load">
          {{ t('teacher.classes.detail.history.retry') }}
        </Button>
      </template>
    </EmptyState>

    <!-- Vacío -->
    <EmptyState
      v-else-if="data && data.entries.length === 0"
      :icon="ClockIcon"
      :title="
        isFiltering
          ? t('teacher.classes.detail.history.no_results_title')
          : t('teacher.classes.detail.history.empty_title')
      "
      :description="
        isFiltering
          ? t('teacher.classes.detail.history.no_results_description')
          : t('teacher.classes.detail.history.empty_description')
      "
    />

    <div v-else-if="data" class="rounded-2xl bg-white px-4 shadow-lg sm:px-6" :aria-busy="loading">
      <!-- Al cambiar de página, el foco vuelve aquí: la lista nueva empieza arriba -->
      <ol
        ref="listRef"
        tabindex="-1"
        :aria-label="t('teacher.classes.detail.tabs.history')"
        class="scroll-mt-4 divide-y divide-border-primary focus:outline-none"
      >
        <ClassHistoryItem v-for="entry in data.entries" :key="entry.id" :entry="entry" :now="now" />
      </ol>
      <div class="pb-4">
        <Pagination
          :current-page="data.page"
          :total-pages="data.totalPages"
          @page-change="goToPage"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import type { ClassHistoryResponse, ClassHistoryType } from '~/types/class.types'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t } = useI18n()
const route = useRoute()
const teacherStore = useTeacherStore()

const classId = computed(() => route.params.id as string)

/** Entradas por página. */
const PAGE_SIZE = 20

const data = ref<ClassHistoryResponse | null>(null)
const loading = ref(true)
const loadError = ref(false)
const page = ref(1)
// '' es «todos»: el desplegable necesita un valor para esa opción.
const actorId = ref('')
const type = ref<ClassHistoryType | ''>('')

const isFiltering = computed(() => Boolean(actorId.value || type.value))

const actorOptions = computed(() => [
  { value: '', label: t('teacher.classes.detail.history.all_actors') },
  ...(data.value?.filters.actors ?? []).map(actor => ({ value: actor.id, label: actor.name })),
])
const typeOptions = computed(() => [
  { value: '', label: t('teacher.classes.detail.history.all_types') },
  ...(data.value?.filters.types ?? []).map(value => ({
    value,
    label: t(`teacher.classes.detail.history.types.${value}`),
  })),
])

// Cada petición lleva su número: si llega una respuesta vieja (se cambió de
// filtro mientras tanto), no pisa a la nueva.
let request = 0

async function load() {
  const current = ++request
  loading.value = true
  loadError.value = false
  try {
    const res = await teacherStore.fetchClassHistory(classId.value, {
      page: page.value,
      limit: PAGE_SIZE,
      actorId: actorId.value || undefined,
      type: type.value || undefined,
    })
    if (current === request) data.value = res
  } catch {
    if (current === request) loadError.value = true
  } finally {
    if (current === request) loading.value = false
  }
}

function setActor(value: string | number) {
  actorId.value = String(value)
  page.value = 1
  void load()
}

function setType(value: string | number) {
  type.value = String(value) as ClassHistoryType | ''
  page.value = 1
  void load()
}

const listRef = ref<HTMLElement | null>(null)

async function goToPage(next: number) {
  page.value = next
  await load()
  if (loadError.value) return
  await nextTick()
  listRef.value?.focus({ preventScroll: true })
  listRef.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

// La hora relativa avanza sola mientras la página está abierta.
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  void load()
  clock = setInterval(() => {
    now.value = Date.now()
  }, 60 * 1000)
})

onUnmounted(() => {
  if (clock) clearInterval(clock)
})
</script>
