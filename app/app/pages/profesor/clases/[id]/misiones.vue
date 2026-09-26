<template>
  <div class="space-y-6">
    <InfoNote v-if="!can('mission.edit')">
      {{ t('teacher.classes.detail.read_only_notice') }}
    </InfoNote>

    <!-- Empty: no missions at all -->
    <EmptyState
      v-if="state.missions.length === 0"
      :icon="RocketLaunchIcon"
      :title="t('teacher.classes.detail.missions_tab.no_missions_title')"
      :description="t('teacher.classes.detail.missions_tab.no_missions_description')"
    >
      <template v-if="can('mission.edit')" #action>
        <div class="flex flex-wrap justify-center gap-3">
          <NuxtLink :to="`/profesor/misiones/crear?classId=${classId}`">
            <Button variant="primary">
              {{ t('teacher.classes.detail.missions_tab.create_first') }}
            </Button>
          </NuxtLink>
          <Button variant="outline" @click="openImport">
            <ArrowDownTrayIcon class="w-4 h-4 mr-2" />
            {{ t('teacher.missions.import.button_in_class') }}
          </Button>
        </div>
      </template>
    </EmptyState>

    <template v-else>
      <!-- Acciones. En móvil no caben en una fila: una encima de otra, a todo el
           ancho y con la principal arriba. -->
      <div
        v-if="can('mission.edit')"
        class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
      >
        <Button :id="importButtonId" variant="outline" class="w-full sm:w-auto" @click="openImport">
          <ArrowDownTrayIcon class="w-4 h-4 mr-2" />
          {{ t('teacher.missions.import.button_in_class') }}
        </Button>
        <NuxtLink :to="`/profesor/misiones/crear?classId=${classId}`">
          <Button variant="primary" class="w-full sm:w-auto">
            <PlusIcon class="w-4 h-4 mr-2" />
            {{ t('teacher.classes.detail.missions_tab.new_mission') }}
          </Button>
        </NuxtLink>
      </div>

      <!-- Filtros -->
      <MissionFilterBar
        v-model:search="searchQuery"
        v-model:rarity-filters="rarityFilters"
        v-model:sort="sortBy"
        v-model:status-filters="statusFilters"
        v-model:view="view"
        :results-count="displayed.length"
        show-status-filter
        @reset="resetFilters"
      />

      <!-- Vacío tras filtros -->
      <EmptyState
        v-if="displayed.length === 0"
        :icon="RocketLaunchIcon"
        :title="t('teacher.classes.detail.missions_tab.no_results')"
        :description="emptyMessage"
      />

      <!-- Grid / Lista -->
      <CardCollection v-else :view="view">
        <MissionCardEnhanced
          v-for="mission in displayed"
          :id="mission.id"
          :key="mission.id"
          :title="mission.title"
          :description="mission.description"
          :status="mission.status"
          :rarity="mission.rarity"
          :completed-count="mission.completedCount"
          :total-students="mission.totalStudents"
          :deadline="mission.deadline"
          :xp-reward="mission.xpReward"
          :coin-reward="mission.coinReward"
          :mana-reward="mission.manaReward"
          :background-image="mission.backgroundImage"
          :layout="view"
          compact
          @click="navigateToMission(mission.id)"
        />
      </CardCollection>
    </template>

    <!-- Importar una misión de otra clase: una copia que llega bloqueada -->
    <ImportMissionModal
      v-if="can('mission.edit')"
      v-model="importOpen"
      :class-id="classId"
      :class-name="state.classData?.name"
      :return-focus="headerImportButton"
      @imported="refreshMissions"
    />
  </div>
</template>

<script setup lang="ts">
import { RocketLaunchIcon, PlusIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t } = useI18n()
const route = useRoute()
const classId = computed(() => route.params.id as string)
const { state, can } = useTeacherClassDetail(classId)
const view = useViewMode('teacher-class-missions')

// Filtros (estado local de la tab).
const searchQuery = ref('')
const rarityFilters = ref<string[]>([])
const statusFilters = ref<string[]>([])
const sortBy = ref('deadline-asc')

const rarityOrder: Record<string, number> = { comun: 1, rara: 2, epica: 3, legendaria: 4 }

const displayed = computed(() => {
  let result = [...state.value.missions]
  if (rarityFilters.value.length > 0) {
    result = result.filter(m => rarityFilters.value.includes(m.rarity))
  }
  if (statusFilters.value.length > 0) {
    result = result.filter(m => statusFilters.value.includes(m.teacherStatus))
  }
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      m => m.title.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query)
    )
  }
  const [field, order] = sortBy.value.split('-')
  result.sort((a, b) => {
    let comparison = 0
    switch (field) {
      case 'title':
        comparison = a.title.localeCompare(b.title, 'es')
        break
      case 'xp':
        comparison = (a.xpReward || 0) - (b.xpReward || 0)
        break
      case 'deadline':
        if (!a.deadline && !b.deadline) comparison = 0
        else if (!a.deadline) comparison = 1
        else if (!b.deadline) comparison = -1
        else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        break
      case 'rarity':
        comparison = (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0)
        break
      case 'completion': {
        const aC = a.totalStudents > 0 ? a.completedCount / a.totalStudents : 0
        const bC = b.totalStudents > 0 ? b.completedCount / b.totalStudents : 0
        comparison = aC - bC
        break
      }
    }
    return order === 'desc' ? -comparison : comparison
  })
  return result
})

function resetFilters() {
  searchQuery.value = ''
  rarityFilters.value = []
  statusFilters.value = []
}

const emptyMessage = computed(() => {
  if (searchQuery.value.trim()) {
    return t('teacher.classes.detail.missions_tab.empty_search', { query: searchQuery.value })
  }
  if (statusFilters.value.length > 0) {
    return t('teacher.classes.detail.missions_tab.empty_status')
  }
  if (rarityFilters.value.length > 0) {
    return t('teacher.classes.detail.missions_tab.empty_rarity')
  }
  return t('teacher.classes.detail.missions_tab.empty_default')
})

function navigateToMission(missionId: string) {
  navigateTo(`/profesor/clases/${classId.value}/misiones/${missionId}`)
}

// Importar de otra clase. La misión importada llega bloqueada: la lista se
// vuelve a pedir para que aparezca ya, mientras la ventana dice qué ha llegado.
const teacherStore = useTeacherStore()
const importOpen = ref(false)
// El botón de importar de la cabecera: si se importa desde el estado vacío, ese
// botón se va con la primera misión y, al cerrar, el foco viene a este.
const importButtonId = useId()
const headerImportButton = () => document.getElementById(importButtonId)

function openImport() {
  importOpen.value = true
}

async function refreshMissions() {
  try {
    const res = await teacherStore.fetchClassMissions(classId.value, true)
    state.value.missions = res.missions
  } catch (error) {
    console.error('Error refreshing class missions:', error)
  }
}
</script>
