<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <PageHeader
      :title="t('teacher.students.index.title')"
      :subtitle="t('teacher.students.index.subtitle')"
    />

    <!-- Students List Section -->
    <div class="space-y-4">
      <!-- Filters -->
      <FilterBar
        :search="searchQuery"
        :sort="sortBy"
        :results-count="teacherStore.studentsTotal"
        :search-placeholder="t('teacher.students.index.search_placeholder')"
        :sort-options="sortOptions"
        variant="red"
        :has-active-filters="hasActiveFilters"
        :active-filter-count="activeFilterCount"
        @update:search="onSearch"
        @update:sort="sortBy = $event"
        @reset="clearAllFilters"
      >
        <template #filters>
          <SelectDropdown
            v-model="selectedClassId"
            :options="classOptions"
            :placeholder="t('teacher.students.index.filter_all_classes')"
          />
          <SelectDropdown
            v-model="selectedProgressRange"
            :options="progressOptions"
            :placeholder="t('teacher.students.index.filter_all_progress')"
          />
        </template>
      </FilterBar>

      <ArchiveTabs
        v-model="viewMode"
        :active-count="teacherStore.studentCounts.active"
        :archived-count="teacherStore.studentCounts.archived"
        :active-label="t('teacher.students.index.tab_active')"
        :archived-label="t('teacher.students.index.tab_archived')"
      />

      <!-- Loading State -->
      <CardGrid v-if="teacherStore.isLoadingStudents">
        <div
          v-for="i in 6"
          :key="i"
          class="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse"
        >
          <div class="p-4">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex-1">
                <div class="h-6 bg-gray-200 rounded w-36 mb-1.5" />
                <div class="h-4 bg-gray-100 rounded w-44" />
              </div>
              <div class="h-8 bg-gray-200 rounded-full w-16" />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-gray-50 rounded-xl p-2.5 h-16" />
              <div class="bg-gray-50 rounded-xl p-2.5 h-16" />
              <div class="bg-gray-50 rounded-xl p-2.5 h-16" />
            </div>
          </div>
          <div class="h-1.5 bg-gray-100" />
        </div>
      </CardGrid>

      <!-- Empty State -->
      <EmptyState
        v-else-if="teacherStore.students.length === 0"
        :icon="UsersIcon"
        :title="emptyTitle"
        :description="emptyDescription"
      />

      <!-- Students Grid -->
      <CardGrid v-else>
        <article
          v-for="student in teacherStore.students"
          :key="student.id"
          class="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden cursor-pointer"
          @click="viewStudentProfile(student.id)"
        >
          <div class="p-4">
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-navy-700 truncate text-lg">{{ student.name }}</h3>
                <!-- Un alumno sin correo se identifica por su usuario -->
                <p class="flex min-w-0 items-center gap-1.5 text-sm text-navy-700/70">
                  <span class="truncate">{{
                    accountIdentifier({ email: student.email, username: student.accountUsername })
                  }}</span>
                  <Badge v-if="student.accountType === 'managed'" variant="info" size="sm">
                    {{ t('teacher.classes.detail.students.managed_badge') }}
                  </Badge>
                </p>
              </div>
              <Button variant="primary" size="sm" class="flex-shrink-0">{{
                t('teacher.students.index.btn_view')
              }}</Button>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
                <div class="flex items-center justify-center gap-1">
                  <RocketLaunchIcon class="w-4 h-4 text-navy-700" />
                  <p class="text-lg font-bold text-navy-700">
                    {{ student.totalMissionsCompleted
                    }}<span class="text-navy-700/70 font-normal"
                      >/{{ student.totalMissionsAvailable }}</span
                    >
                  </p>
                </div>
                <p class="text-xs text-navy-700/70 uppercase tracking-wide">
                  {{ t('teacher.students.index.stat_missions') }}
                </p>
              </div>
              <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
                <div class="flex items-center justify-center gap-1">
                  <MapIcon class="w-4 h-4 text-navy-700" />
                  <p class="text-lg font-bold text-navy-700">
                    {{ formatXP(student.totalXpEarned)
                    }}<span class="text-navy-700/70 font-normal"
                      >/{{ formatXP(student.totalXpAvailable) }}</span
                    >
                  </p>
                </div>
                <p class="text-xs text-navy-700/70 uppercase tracking-wide">XP</p>
              </div>
              <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
                <div class="flex items-center justify-center gap-1">
                  <TrophyIcon class="w-4 h-4 text-navy-700" />
                  <p class="text-lg font-bold text-navy-700">
                    {{ student.totalBadgesEarned
                    }}<span class="text-navy-700/70 font-normal"
                      >/{{ student.totalBadgesAvailable }}</span
                    >
                  </p>
                </div>
                <p class="text-xs text-navy-700/70 uppercase tracking-wide">
                  {{ t('teacher.students.index.stat_badges') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="h-1.5 bg-gray-100">
            <div
              class="h-full bg-navy-700 transition-all duration-300"
              :style="{ width: `${student.overallProgress}%` }"
            />
          </div>
        </article>
      </CardGrid>

      <Pagination
        :current-page="currentPage"
        :total-pages="teacherStore.studentsTotalPages"
        @page-change="goToPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, RocketLaunchIcon, MapIcon, TrophyIcon } from '@heroicons/vue/24/outline'
import { accountIdentifier } from '~/utils/identity'
import type { StudentListSort, StudentProgressRange } from '~/types/teacher.types'

const formatXP = (xp: number): string => {
  if (xp >= 1000) {
    return (xp / 1000).toFixed(1) + 'k'
  }
  return String(xp ?? 0)
}

const { t } = useI18n()

useHead({
  title: () => t('teacher.students.index.meta.title'),
  meta: [{ name: 'description', content: () => t('teacher.students.index.meta.description') }],
})

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

const teacherStore = useTeacherStore()
const router = useRouter()

/** Tarjetas por página: tres filas completas en escritorio. */
const PAGE_SIZE = 12

// Filters state
const searchQuery = ref('')
const selectedClassId = ref('')
const selectedProgressRange = ref('')
const sortBy = ref('name-asc')
const currentPage = ref(1)
// Un alumno está archivado cuando todas sus clases con este profesor lo están.
const viewMode = ref<'active' | 'archived'>('active')

// Options for SelectDropdown components
const classOptions = computed(() => {
  const source = viewMode.value === 'archived' ? teacherStore.archivedClasses : teacherStore.classes
  return [
    { value: '', label: t('teacher.students.index.filter_all_classes') },
    ...source.map(c => ({ value: c.id, label: c.name })),
  ]
})

// Progress range options
const progressOptions = computed(() => [
  { value: '', label: t('teacher.students.index.filter_all_progress') },
  { value: 'excellent', label: t('teacher.students.index.progress_excellent') },
  { value: 'good', label: t('teacher.students.index.progress_good') },
  { value: 'progress', label: t('teacher.students.index.progress_in_progress') },
  { value: 'initial', label: t('teacher.students.index.progress_initial') },
])

const sortOptions = computed(() => [
  { value: 'name-asc', label: t('teacher.students.index.sort_name_asc') },
  { value: 'name-desc', label: t('teacher.students.index.sort_name_desc') },
  { value: 'progress-desc', label: t('teacher.students.index.sort_progress_desc') },
  { value: 'progress-asc', label: t('teacher.students.index.sort_progress_asc') },
  { value: 'missions-desc', label: t('teacher.students.index.sort_missions_desc') },
])

// Check if any filter is active
const activeFilterCount = computed(
  () => (selectedClassId.value ? 1 : 0) + (selectedProgressRange.value ? 1 : 0)
)

const hasActiveFilters = computed(() => {
  return selectedClassId.value !== '' || selectedProgressRange.value !== ''
})

/** Pide la página a la vista con la búsqueda y los filtros de ahora. */
async function loadStudents(force = false) {
  try {
    await teacherStore.ensureStudentList(
      {
        archived: viewMode.value,
        search: searchQuery.value,
        classId: selectedClassId.value,
        progress: (selectedProgressRange.value || undefined) as StudentProgressRange | undefined,
        sort: sortBy.value as StudentListSort,
        page: currentPage.value,
        limit: PAGE_SIZE,
      },
      force
    )
  } catch {
    // El store ya lo ha dejado en la consola; se queda lo que había.
    return
  }
  // La página ya no existe (han salido alumnos mientras tanto): a la última.
  if (currentPage.value > teacherStore.studentsTotalPages) {
    currentPage.value = teacherStore.studentsTotalPages
    await loadStudents()
  }
}

// La búsqueda va a la API cuando se deja de escribir.
let searchTimeout: ReturnType<typeof setTimeout> | null = null

function onSearch(value: string) {
  searchQuery.value = value
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadStudents()
  }, 300)
}

onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

function goToPage(page: number) {
  currentPage.value = page
  loadStudents()
}

// La clase elegida no existe en la otra pestaña: al cambiar se descarta el filtro
// antes de pedir nada, así el cambio de pestaña hace una sola petición.
watch(
  viewMode,
  () => {
    selectedClassId.value = ''
  },
  { flush: 'sync' }
)

// Otra pestaña, otro filtro u otro orden: se vuelve a la primera página.
watch([viewMode, selectedClassId, selectedProgressRange, sortBy], () => {
  currentPage.value = 1
  loadStudents()
})

// Clear all filters
const clearAllFilters = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  // Si había un filtro puesto, al quitarlo ya pide la página el watcher.
  const reloadsByItself = hasActiveFilters.value
  searchQuery.value = ''
  selectedClassId.value = ''
  selectedProgressRange.value = ''
  if (reloadsByItself) return
  currentPage.value = 1
  loadStudents()
}

const emptyTitle = computed(() =>
  viewMode.value === 'archived'
    ? t('teacher.students.index.no_archived_students_title')
    : t('teacher.students.index.no_students_title')
)

const emptyDescription = computed(() => {
  if (hasActiveFilters.value || searchQuery.value) {
    return t('teacher.students.index.no_students_filtered')
  }
  return viewMode.value === 'archived'
    ? t('teacher.students.index.no_archived_students_default')
    : t('teacher.students.index.no_students_default')
})

// Navigate to student profile
const viewStudentProfile = (studentId: string) => {
  router.push(`/profesor/alumnos/${studentId}`)
}

// Load data on mount
onMounted(async () => {
  await Promise.all([
    teacherStore.ensureClasses(),
    teacherStore.ensureArchivedClasses(),
    loadStudents(),
  ])
})
</script>
