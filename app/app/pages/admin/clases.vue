<template>
  <div class="space-y-6">
    <PageHeader :title="t('admin.classes.title')" :subtitle="t('admin.classes.subtitle')" />

    <!-- Filters: búsqueda y orden van al servidor, que pagina -->
    <FilterBar
      :search="search"
      :sort="sort"
      :results-count="totalClasses"
      :search-placeholder="t('admin.classes.filters.search_placeholder')"
      :sort-options="sortOptions"
      variant="red"
      @update:search="search = $event"
      @update:sort="sort = $event"
      @reset="reset"
    />

    <!-- Loading -->
    <CardGrid v-if="isLoadingClasses">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse"
      >
        <div class="p-4">
          <div class="h-6 bg-gray-200 rounded w-48 mb-1.5" />
          <div class="h-4 bg-gray-100 rounded w-32 mb-3" />
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-gray-50 rounded-xl p-2.5 h-14" />
            <div class="bg-gray-50 rounded-xl p-2.5 h-14" />
          </div>
        </div>
      </div>
    </CardGrid>

    <!-- Empty -->
    <EmptyState
      v-else-if="classes.length === 0"
      :icon="AcademicCapIcon"
      :title="t('admin.classes.empty.title')"
      :description="t('admin.classes.empty.description')"
    />

    <!-- Classes Grid -->
    <CardGrid v-else>
      <article
        v-for="cls in classes"
        :key="cls.id"
        class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
      >
        <div class="p-4">
          <div class="mb-3">
            <h3 class="font-bold text-navy-700 text-lg">{{ cls.name }}</h3>
            <p class="text-sm text-navy-700/70">{{ cls.teacherName }}</p>
          </div>

          <div class="grid grid-cols-2 gap-2 text-center">
            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-lg font-bold text-navy-700">{{ cls.studentCount }}</p>
              <p class="text-xs text-navy-700/70 uppercase tracking-wide">Estudiantes</p>
            </div>
            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-lg font-bold text-navy-700">{{ cls.missionCount }}</p>
              <p class="text-xs text-navy-700/70 uppercase tracking-wide">Misiones</p>
            </div>
          </div>
        </div>
      </article>
    </CardGrid>

    <Pagination
      :current-page="page"
      :total-pages="classesTotalPages"
      @page-change="page = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { AcademicCapIcon } from '@heroicons/vue/24/outline'
import type { AdminClassFilters } from '~/types/admin.types'

const { t } = useI18n()
useHead({ title: () => t('admin.classes.meta.title') })
definePageMeta({ layout: 'admin', middleware: ['auth', 'onboarding', 'role'], role: 'admin' })

const adminStore = useAdminStore()
const { classes, totalClasses, classesTotalPages, isLoadingClasses } = storeToRefs(adminStore)

/** Búsqueda, orden y página: los aplica el servidor, que devuelve una página cada vez. */
const { search, sort, page, reset } = useAdminListQuery({
  filters: {},
  sort: 'name-asc',
  pageSize: 24,
  totalPages: classesTotalPages,
  load: query => adminStore.ensureAllClasses(query as AdminClassFilters),
})

const sortOptions = computed(() => [
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
  { value: 'students-desc', label: t('admin.classes.sort.students_desc') },
  { value: 'missions-desc', label: t('admin.classes.sort.missions_desc') },
])
</script>
