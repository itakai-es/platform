<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('student.leaderboard.page_title')"
      :subtitle="t('student.leaderboard.page_subtitle')"
    />

    <div class="flex flex-wrap gap-2">
      <Button :variant="tab === 'global' ? 'primary' : 'outline'" @click="tab = 'global'">
        Global
      </Button>
      <Button :variant="tab === 'class' ? 'primary' : 'outline'" @click="tab = 'class'">
        {{ t('student.leaderboard.by_class') }}
      </Button>
      <Button :variant="tab === 'friends' ? 'primary' : 'outline'" @click="tab = 'friends'">
        Amigos
      </Button>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button :variant="period === 'all' ? 'primary' : 'outline'" size="sm" @click="period = 'all'">
        Todo
      </Button>
      <Button
        :variant="period === 'month' ? 'primary' : 'outline'"
        size="sm"
        @click="period = 'month'"
      >
        Mes
      </Button>
      <Button
        :variant="period === 'week' ? 'primary' : 'outline'"
        size="sm"
        @click="period = 'week'"
      >
        Semana
      </Button>
    </div>

    <div v-if="tab === 'class'" class="max-w-md">
      <label class="mb-2 block text-sm font-medium text-navy-700">Clase</label>
      <select
        v-model="selectedClassId"
        class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-navy-700 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-navy-700/20"
      >
        <option value="">{{ t('student.leaderboard.pick_class') }}</option>
        <option v-for="classItem in classes" :key="classItem.id" :value="classItem.id">
          {{ classItem.name }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="space-y-4">
      <Skeleton v-for="i in 4" :key="i" height="h-24" />
    </div>

    <EmptyState
      v-else-if="tab === 'friends'"
      :icon="UsersIcon"
      :title="t('student.leaderboard.friends_soon_title')"
      :description="t('student.leaderboard.friends_soon_description')"
    />

    <EmptyState
      v-else-if="tab === 'class' && !selectedClassId"
      :icon="AcademicCapIcon"
      :title="t('student.leaderboard.choose_class_title')"
      :description="t('student.leaderboard.choose_class_description')"
    />

    <EmptyState
      v-else-if="tab === 'class' && !classRanking"
      :icon="AcademicCapIcon"
      :title="t('student.leaderboard.empty_class_title')"
      :description="t('student.leaderboard.empty_class_description')"
    />

    <ClassRankingSection v-else-if="tab === 'class' && classRanking" :ranking-data="classRanking" />

    <EmptyState
      v-else-if="!globalLeaderboard.length"
      :icon="TrophyIcon"
      :title="t('student.leaderboard.empty_global_title')"
      :description="t('student.leaderboard.empty_global_description')"
    />

    <template v-else>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <Card type="ia">
          <CardHeader :title="t('student.leaderboard.global_podium')" :icon="TrophyIcon" title-tag="h2" />

          <div class="space-y-3">
            <div
              v-for="student in podium"
              :key="student.id"
              class="flex items-center gap-4 rounded-2xl border border-white/50 bg-white p-4"
              :class="student.id === authStore.user?.id ? 'ring-2 ring-yellow/70' : ''"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full bg-navy-700 text-lg font-bold text-white"
              >
                {{ student.rank }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-bold text-navy-700">{{ student.name }}</p>
                <p class="text-sm text-navy-700/70">Nivel {{ student.level }}</p>
              </div>
              <div class="rounded-full bg-yellow/20 px-3 py-1 text-sm font-semibold text-navy-700">
                {{ student.xp.toLocaleString('es-ES') }} XP
              </div>
            </div>
          </div>
        </Card>

        <Card type="stats">
          <CardHeader :title="t('student.leaderboard.your_position')" :icon="ChartBarIcon" title-tag="h2" />

          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl bg-white px-4 py-6 text-center">
              <p class="text-4xl font-semibold text-navy-700">
                {{ currentUserEntry?.rank || '-' }}
              </p>
              <p class="mt-2 text-sm text-navy-700/70">Puesto</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-6 text-center">
              <p class="text-4xl font-semibold text-navy-700">
                {{ currentUserEntry?.level || '-' }}
              </p>
              <p class="mt-2 text-sm text-navy-700/70">Nivel</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-6 text-center">
              <p class="text-4xl font-semibold text-navy-700">
                {{ currentUserEntry?.xp?.toLocaleString('es-ES') || '0' }}
              </p>
              <p class="mt-2 text-sm text-navy-700/70">XP</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-6 text-center">
              <p class="text-4xl font-semibold text-navy-700">{{ globalLeaderboard.length }}</p>
              <p class="mt-2 text-sm text-navy-700/70">Alumnos</p>
            </div>
          </div>
        </Card>
      </div>

      <Card type="clases">
        <CardHeader :title="t('student.leaderboard.rest')" :icon="ListBulletIcon" title-tag="h2" />

        <div class="grid gap-3 p-4 xl:grid-cols-2">
          <div
            v-for="student in restOfLeaderboard"
            :key="student.id"
            class="flex items-center gap-4 rounded-2xl bg-white p-4"
            :class="student.id === authStore.user?.id ? 'ring-2 ring-yellow/70' : ''"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-navy-700/10 text-sm font-bold text-navy-700"
            >
              {{ student.rank }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-navy-700">{{ student.name }}</p>
              <p class="text-sm text-navy-700/70">Nivel {{ student.level }}</p>
            </div>
            <div class="rounded-full bg-navy-700/10 px-3 py-1 text-sm font-semibold text-navy-700">
              {{ student.xp.toLocaleString('es-ES') }} XP
            </div>
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  AcademicCapIcon,
  ChartBarIcon,
  ListBulletIcon,
  TrophyIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import type { ClassRanking } from '~/types/ranking.types'

definePageMeta({
  layout: 'student',
  middleware: ['auth', 'role'],
})

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const leaderboardStore = useLeaderboardStore()
const classesStore = useClassesStore()

const tab = ref<'global' | 'class' | 'friends'>('global')
const period = ref<'week' | 'month' | 'all'>('all')
const selectedClassId = ref('')
const loading = ref(true)

// Local snapshots of the latest store reads (kept for template compatibility
// without changing markup). They are refreshed via the store's ensureX calls.
const globalLeaderboard = ref<
  Array<{ id: string; name: string; avatar: string | null; rank: number; xp: number; level: number }>
>([])
const classRanking = ref<ClassRanking | null>(null)

// Read enrolled classes straight from the classes store so we don't keep a
// redundant local copy.
const { classes: enrolledClasses } = storeToRefs(classesStore)
const classes = computed(() =>
  (enrolledClasses.value || []).map(c => ({ id: c.id, name: c.name }))
)

const podium = computed(() => globalLeaderboard.value.slice(0, 3))
const restOfLeaderboard = computed(() => globalLeaderboard.value.slice(3))
const currentUserEntry = computed(
  () => globalLeaderboard.value.find(student => student.id === authStore.user?.id) || null
)

useHead({
  title: computed(() => t('student.leaderboard.meta.title')),
  meta: [
    { name: 'description', content: computed(() => t('student.leaderboard.meta.description')) },
  ],
})

const loadLeaderboardData = async () => {
  loading.value = true

  try {
    if (tab.value === 'global') {
      const data = await leaderboardStore.ensureGlobalLeaderboard(period.value)
      globalLeaderboard.value = (data || []) as typeof globalLeaderboard.value
      classRanking.value = null
      return
    }

    if (tab.value === 'class') {
      if (!selectedClassId.value) {
        classRanking.value = null
        return
      }
      const data = await leaderboardStore.ensureClassLeaderboard(
        selectedClassId.value,
        period.value
      )
      classRanking.value = data || null
      return
    }

    globalLeaderboard.value = []
    classRanking.value = null
  } catch (error) {
    console.error('Error loading leaderboard:', error)
    toast.error('No se pudo cargar el leaderboard')
  } finally {
    loading.value = false
  }
}

// Debounced (300ms) reaction to tab / period / class changes so rapid toggles
// don't trigger redundant store fetches.
const debouncedLoad = useDebounceFn(() => {
  loadLeaderboardData()
}, 300)

watch([tab, period, selectedClassId], () => {
  debouncedLoad()
})

onMounted(async () => {
  try {
    await classesStore.ensureStudentClasses()
  } catch (error) {
    console.error('Error loading student classes for leaderboard:', error)
  }

  if (!selectedClassId.value && classes.value.length > 0) {
    selectedClassId.value = classes.value[0].id
  }

  await loadLeaderboardData()
})
</script>
