<template>
  <div class="space-y-6">
    <PageHeader :title="t('admin.classes.title')" :subtitle="t('admin.classes.subtitle')" />

    <!-- Filters -->
    <FilterBar
      :search="searchQuery"
      :sort="sortBy"
      :results-count="filteredClasses.length"
      :search-placeholder="t('admin.classes.filters.search_placeholder')"
      :sort-options="sortOptions"
      variant="red"
      @update:search="searchQuery = $event"
      @update:sort="sortBy = $event"
      @reset="clearAllFilters"
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
      v-else-if="filteredClasses.length === 0"
      :icon="AcademicCapIcon"
      :title="t('admin.classes.empty.title')"
      :description="t('admin.classes.empty.description')"
    />

    <!-- Classes Grid -->
    <CardGrid v-else>
      <article
        v-for="cls in filteredClasses"
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
              <p class="text-xs text-navy-700/70 uppercase tracking-wide">Alumnos</p>
            </div>
            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-lg font-bold text-navy-700">{{ cls.missionCount }}</p>
              <p class="text-xs text-navy-700/70 uppercase tracking-wide">Misiones</p>
            </div>
          </div>
        </div>
      </article>
    </CardGrid>
  </div>
</template>

<script setup lang="ts">
import { AcademicCapIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()
useHead({ title: () => t('admin.classes.meta.title') })
definePageMeta({ layout: 'admin', middleware: ['auth', 'onboarding', 'role'], role: 'admin' })

const adminStore = useAdminStore()
const { classes, isLoadingClasses } = storeToRefs(adminStore)

const searchQuery = ref('')
const sortBy = ref('name-asc')

const sortOptions = computed(() => [
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
  { value: 'students-desc', label: t('admin.classes.sort.students_desc') },
  { value: 'missions-desc', label: t('admin.classes.sort.missions_desc') },
])

const filteredClasses = computed(() => {
  let result = [...classes.value]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      c => c.name.toLowerCase().includes(q) || c.teacherName.toLowerCase().includes(q)
    )
  }

  switch (sortBy.value) {
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'name-desc':
      result.sort((a, b) => b.name.localeCompare(a.name))
      break
    case 'students-desc':
      result.sort((a, b) => b.studentCount - a.studentCount)
      break
    case 'missions-desc':
      result.sort((a, b) => b.missionCount - a.missionCount)
      break
  }

  return result
})

const clearAllFilters = () => {
  searchQuery.value = ''
  sortBy.value = 'name-asc'
}

onMounted(() => adminStore.ensureAllClasses({ limit: 1000 }))
</script>
