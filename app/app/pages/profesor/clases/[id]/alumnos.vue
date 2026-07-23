<template>
  <div class="space-y-4">
    <!-- Buscador + orden (estilo estándar de la app) -->
    <FilterBar
      v-if="!isLoading && allStudents.length > 0"
      :search="searchQuery"
      :sort="sortBy"
      :results-count="students.length"
      :search-placeholder="t('teacher.classes.detail.students.search_placeholder')"
      :sort-options="sortOptions"
      variant="red"
      @update:search="searchQuery = $event"
      @update:sort="sortBy = $event"
      @reset="searchQuery = ''"
    />

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <Skeleton height="h-12" />
      <Skeleton v-for="i in 5" :key="i" height="h-16" />
    </div>

    <!-- Empty: no students in class -->
    <EmptyState
      v-else-if="allStudents.length === 0"
      :icon="UsersIcon"
      :title="t('teacher.classes.detail.students.empty_title')"
      :description="t('teacher.classes.detail.students.empty_description')"
    />

    <!-- Empty: no search results -->
    <EmptyState
      v-else-if="students.length === 0"
      :icon="MagnifyingGlassIcon"
      :title="t('teacher.classes.detail.students.no_results_title')"
      :description="t('teacher.classes.detail.students.no_results_description')"
    />

    <!-- Students table -->
    <div v-else class="overflow-x-auto rounded-2xl bg-white shadow-lg">
      <table class="w-full min-w-[600px] text-sm">
        <thead>
          <tr class="border-b border-navy-700/10 text-left text-navy-700/50">
            <th class="px-4 py-3 font-semibold">
              {{ t('teacher.classes.detail.students.col_student') }}
            </th>
            <th class="px-4 py-3 font-semibold text-center">
              {{ t('teacher.classes.detail.students.col_level') }}
            </th>
            <th v-if="settings.xp" class="px-4 py-3 font-semibold text-center">
              {{ t('common.resources.xp') }}
            </th>
            <th v-if="settings.coins" class="px-4 py-3 font-semibold text-center">
              {{ t('common.resources.coins') }}
            </th>
            <th v-if="settings.mana" class="px-4 py-3 font-semibold text-center">
              {{ t('common.resources.mana') }}
            </th>
            <th v-if="settings.lives" class="px-4 py-3 font-semibold text-center">
              {{ t('common.resources.lives') }}
            </th>
            <th v-if="settings.behaviors" class="px-4 py-3 font-semibold text-center">
              {{ t('teacher.classes.detail.students.col_behaviors') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="student in students"
            :key="student.id"
            class="border-b border-navy-700/10 last:border-0 transition-colors hover:bg-navy-700/5"
          >
            <!-- Student: avatar + nombre real + @alias -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3 min-w-0">
                <Avatar
                  :src="student.avatar"
                  :username="student.name"
                  size="xs"
                  class="flex-shrink-0"
                />
                <div class="min-w-0">
                  <NuxtLink
                    :to="`/profesor/alumnos/${student.id}`"
                    class="block font-semibold text-navy-700 truncate hover:underline"
                  >
                    {{ student.name }}
                  </NuxtLink>
                  <p class="text-xs text-navy-700/50 truncate">@{{ student.handle }}</p>
                </div>
              </div>
            </td>
            <!-- Level -->
            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-navy-700/5 px-2 py-0.5 text-sm font-semibold text-navy-700"
              >
                {{ student.level }}
              </span>
            </td>
            <!-- XP -->
            <td v-if="settings.xp" class="px-4 py-3">
              <span class="flex items-center justify-center gap-1 font-semibold text-navy-700">
                <XpIcon class="w-5 h-5" />{{ student.xp }}
              </span>
            </td>
            <!-- Coins -->
            <td v-if="settings.coins" class="px-4 py-3">
              <span class="flex items-center justify-center gap-1 font-semibold text-navy-700">
                <CoinIcon class="w-5 h-5" />{{ student.coins }}
              </span>
            </td>
            <!-- Mana -->
            <td v-if="settings.mana" class="px-4 py-3">
              <span class="flex items-center justify-center gap-1 font-semibold text-navy-700">
                <ManaIcon class="w-5 h-5" />{{ student.mana }}
              </span>
            </td>
            <!-- Lives -->
            <td v-if="settings.lives" class="px-4 py-3">
              <span class="flex items-center justify-center gap-1 font-semibold text-navy-700">
                <LifeIcon class="w-5 h-5" />{{ student.lives }}
              </span>
            </td>
            <!-- Behaviors -->
            <td v-if="settings.behaviors" class="px-4 py-3">
              <div class="flex items-center justify-center gap-2 font-semibold">
                <span class="text-success">+{{ student.positiveBehaviors }}</span>
                <span class="text-navy-700/30">/</span>
                <span class="text-error">−{{ student.negativeBehaviors }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import XpIcon from '~/components/atoms/XpIcon.vue'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'
import type { ClassSettings } from '~/types/class.types'
import { resolveClassSettings } from '~/utils/class-settings'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

interface ClassStudentRow {
  id: string
  name: string
  handle: string
  avatar: string
  level: number
  xp: number
  coins: number
  mana: number
  lives: number
  positiveBehaviors: number
  negativeBehaviors: number
}

const { t } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()

const classId = computed(() => route.params.id as string)

const allStudents = ref<ClassStudentRow[]>([])
const settings = ref<ClassSettings>(resolveClassSettings(null))
const isLoading = ref(true)

const searchQuery = ref('')
const sortBy = ref('name')
const sortOptions = computed(() => [
  { value: 'name', label: t('teacher.classes.detail.students.sort_name') },
  { value: 'xp', label: t('teacher.classes.detail.students.sort_xp') },
  { value: 'level', label: t('teacher.classes.detail.students.sort_level') },
])

// Búsqueda por nombre o alias + orden.
const students = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = allStudents.value
  if (q) {
    list = list.filter(
      s => s.name.toLowerCase().includes(q) || s.handle.toLowerCase().includes(q)
    )
  }
  return [...list].sort((a, b) => {
    if (sortBy.value === 'xp') return b.xp - a.xp
    if (sortBy.value === 'level') return b.level - a.level
    return a.name.localeCompare(b.name)
  })
})

onMounted(async () => {
  try {
    const res = await $fetch<{ students: ClassStudentRow[]; settings: ClassSettings }>(
      `${config.public.apiBase}/teacher/classes/${classId.value}/students`
    )
    allStudents.value = res.students
    settings.value = resolveClassSettings(res.settings)
  } catch (err) {
    console.error('Error fetching class students:', err)
  } finally {
    isLoading.value = false
  }
})
</script>
