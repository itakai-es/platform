<template>
  <div class="space-y-4">
    <!-- Sub-navegación (pills), mismo patrón que el panel de Ajustes. El pill de
         Ranking solo aparece si la clase tiene los rankings activados. -->
    <div v-if="viewOptions.length > 1" class="flex gap-2 overflow-x-auto scrollbar-subtle">
      <button
        v-for="v in viewOptions"
        :key="v.id"
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
          activeView === v.id
            ? 'bg-navy-700 text-white'
            : 'bg-surface border border-border-primary text-navy-700 hover:bg-gray-50',
        ]"
        @click="activeView = v.id"
      >
        {{ v.label }}
      </button>
    </div>

    <!-- ============================== Vista: Listado ============================== -->
    <template v-if="activeView === 'list'">
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
            <tr class="border-b border-navy-700/10 text-left text-navy-700/70">
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
                    :ring-color="student.levelColor"
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
                    <p class="text-xs text-navy-700/70 truncate">@{{ student.handle }}</p>
                  </div>
                </div>
              </td>
              <!-- Level (coloreado con el tramo del sistema de niveles de la clase) -->
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex items-center justify-center min-w-[2rem] rounded-full px-2 py-0.5 text-sm font-semibold"
                  :style="{
                    backgroundColor: `${student.levelColor || '#9CA3AF'}22`,
                    color: student.levelColor || '#374151',
                  }"
                  :title="student.levelTitle"
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
    </template>

    <!-- ============================== Vista: Ranking ============================== -->
    <template v-else>
      <!-- Loading -->
      <div v-if="rankingLoading" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Skeleton height="h-96" />
          <Skeleton height="h-96" />
        </div>
        <Skeleton height="h-64" />
      </div>

      <!-- Empty: no students -->
      <EmptyState
        v-else-if="!rankingData || !rankingData.stats || rankingData.stats.totalStudents === 0"
        :icon="UsersIcon"
        :title="t('teacher.classes.detail.ranking.no_students_title')"
        :description="t('teacher.classes.detail.ranking.no_students_description')"
      />

      <ClassRankingSection
        v-else
        :ranking-data="rankingData"
        :clickable="true"
        :show-current-user-highlight="false"
        @student-click="viewStudentProfile"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
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
  levelTitle?: string
  levelColor?: string
  xp: number
  coins: number
  mana: number
  lives: number
  positiveBehaviors: number
  negativeBehaviors: number
}

const { t } = useI18n()
const { coinLabel } = useCoinLabel()
const route = useRoute()
const config = useRuntimeConfig()

const classId = computed(() => route.params.id as string)

const allStudents = ref<ClassStudentRow[]>([])
const settings = ref<ClassSettings>(resolveClassSettings(null))
const isLoading = ref(true)

// Sub-vista activa: 'list' (tabla de gestión) por defecto; 'ranking' es el podio.
const activeView = ref<'list' | 'ranking'>('list')
const viewOptions = computed(() => {
  const list: { id: 'list' | 'ranking'; label: string }[] = [
    { id: 'list', label: t('teacher.classes.detail.students.view_list') },
  ]
  if (settings.value.rankings)
    list.push({ id: 'ranking', label: t('teacher.classes.detail.students.view_ranking') })
  return list
})

const searchQuery = ref('')
const sortBy = ref('name-asc')
// Opciones de orden emparejadas asc/desc (mismo patrón que clases y misiones).
// Nombre y nivel siempre; los recursos solo si la clase los tiene activados.
const sortOptions = computed(() => {
  const s = settings.value
  const tr = (k: string, params: Record<string, unknown> = {}) =>
    t(`teacher.classes.detail.students.${k}`, params)
  const opts = [
    { value: 'name-asc', label: tr('sort_name_asc') },
    { value: 'name-desc', label: tr('sort_name_desc') },
    { value: 'level-asc', label: tr('sort_level_asc') },
    { value: 'level-desc', label: tr('sort_level_desc') },
  ]
  if (s.xp) {
    opts.push({ value: 'xp-asc', label: tr('sort_xp_asc') })
    opts.push({ value: 'xp-desc', label: tr('sort_xp_desc') })
  }
  if (s.coins) {
    opts.push({ value: 'coins-asc', label: tr('sort_coins_asc', { coins: coinLabel.value }) })
    opts.push({ value: 'coins-desc', label: tr('sort_coins_desc', { coins: coinLabel.value }) })
  }
  if (s.mana) {
    opts.push({ value: 'mana-asc', label: tr('sort_mana_asc') })
    opts.push({ value: 'mana-desc', label: tr('sort_mana_desc') })
  }
  if (s.lives) {
    opts.push({ value: 'lives-asc', label: tr('sort_lives_asc') })
    opts.push({ value: 'lives-desc', label: tr('sort_lives_desc') })
  }
  return opts
})

// Búsqueda por nombre o alias + orden.
const students = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = allStudents.value
  if (q) {
    list = list.filter(
      s => s.name.toLowerCase().includes(q) || s.handle.toLowerCase().includes(q)
    )
  }
  // sortBy tiene forma "<campo>-<asc|desc>"; se compara en ascendente y se invierte.
  const [field, direction] = sortBy.value.split('-')
  const dir = direction === 'desc' ? -1 : 1
  const compareAsc = (a: ClassStudentRow, b: ClassStudentRow) => {
    switch (field) {
      case 'level':
        return a.level - b.level
      case 'xp':
        return a.xp - b.xp
      case 'coins':
        return a.coins - b.coins
      case 'mana':
        return a.mana - b.mana
      case 'lives':
        return a.lives - b.lives
      default:
        return a.name.localeCompare(b.name)
    }
  }
  return [...list].sort((a, b) => compareAsc(a, b) * dir)
})

// --- Ranking (podio) ---
// El listado del ranking vive en el teacher store, cacheado por `${classId}-general`.
const teacherStore = useTeacherStore()
const { classRankings } = storeToRefs(teacherStore)
const rankingData = computed(() => classRankings.value.get(`${classId.value}-general`) ?? null)
const rankingLoading = ref(false)
const rankingLoaded = ref(false)

function viewStudentProfile(studentId: string) {
  navigateTo(`/profesor/alumnos/${studentId}`)
}

// Carga perezosa del ranking la primera vez que se abre esa sub-vista; si ya
// estaba cacheado por el store, `ensureClassRanking` es no-op (cache hit).
watch(
  activeView,
  async view => {
    if (view !== 'ranking' || rankingLoaded.value) return
    rankingLoading.value = true
    try {
      await teacherStore.ensureClassRanking(classId.value)
      rankingLoaded.value = true
    } finally {
      rankingLoading.value = false
    }
  }
)

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
