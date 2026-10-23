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
        <!-- Ordenar: abre debajo la lista ordenable, en lugar de los filtros y las tarjetas. -->
        <Button
          v-if="canOrder"
          :id="orderButtonId"
          variant="outline"
          class="w-full sm:w-auto"
          :aria-expanded="ordering"
          :aria-controls="orderPanelId"
          @click="toggleOrdering"
        >
          <ArrowsUpDownIcon class="w-4 h-4 mr-2" aria-hidden="true" />
          {{ t('teacher.classes.detail.missions_tab.order.button') }}
        </Button>
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

      <!-- Ordenar: el orden de la progresión, el que ve el alumnado. Sin filtros:
           se ordena la clase entera. -->
      <div v-if="ordering" :id="orderPanelId">
        <SettingsSection
          :title="t('teacher.classes.detail.missions_tab.order.title')"
          :hint="t('teacher.classes.detail.missions_tab.order.hint')"
        >
          <template #actions>
            <Button variant="primary" size="sm" @click="stopOrdering">
              {{ t('teacher.classes.detail.missions_tab.order.done') }}
            </Button>
          </template>
          <!-- `overflow-hidden` redondea el fondo de las filas, como en las pistas. -->
          <div class="overflow-hidden rounded-xl border border-border-primary">
            <AdminSortableList
              :items="orderedMissions"
              :item-label="mission => mission.title"
              :save="saveOrder"
            >
              <template #leading="{ index }">
                <OrderNumber :value="index + 1" />
              </template>
              <template #main="{ item }">
                <p class="break-words font-semibold text-navy-700">{{ item.title }}</p>
                <p class="text-xs text-navy-700/70">
                  {{ statusLabel(item) }}
                </p>
              </template>
              <template #meta="{ item }">
                <RarityBadge v-if="item.rarity" :rarity="item.rarity" />
              </template>
            </AdminSortableList>
          </div>
        </SettingsSection>
      </div>

      <template v-else>
        <!-- Filtros (en el mapa no hay: va la clase entera, en su orden) -->
        <MissionFilterBar
          v-model:search="searchQuery"
          v-model:rarity-filters="rarityFilters"
          v-model:sort="sortBy"
          v-model:status-filters="statusFilters"
          v-model:view="view"
          :view-modes="viewModes"
          :results-count="view === 'map' ? orderedMissions.length : displayed.length"
          show-status-filter
          @reset="resetFilters"
        />

        <!-- Mapa (en pruebas, si la clase lo tiene encendido) -->
        <MissionMap
          v-if="view === 'map'"
          :missions="orderedMissions"
          mode="teacher"
          :class-id="classId"
        />

        <!-- Vacío tras filtros -->
        <EmptyState
          v-else-if="displayed.length === 0"
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
import { teacherMissionStatus } from '~/utils/mission-teacher-status'
import { DEFAULT_MISSION_SORT, orderByIds, sortMissions } from '~/utils/mission-sort'
import type { ViewMode } from '~/composables/useViewMode'
import {
  RocketLaunchIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowsUpDownIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t, locale } = useI18n()
const route = useRoute()
const classId = computed(() => route.params.id as string)
const { state, can, classSettings } = useTeacherClassDetail(classId)
// El mapa es una vista más, solo en las clases que lo tienen encendido (en pruebas).
const viewModes = computed<ViewMode[]>(() =>
  classSettings.value.missionMap ? ['grid', 'list', 'map'] : ['grid', 'list']
)
const view = useViewMode('teacher-class-missions', 'grid', viewModes)

// Filtros (estado local de la tab).
const searchQuery = ref('')
const rarityFilters = ref<string[]>([])
const statusFilters = ref<string[]>([])
const sortBy = ref(DEFAULT_MISSION_SORT)

const displayed = computed(() => {
  let result = [...state.value.missions]
  if (rarityFilters.value.length > 0) {
    result = result.filter(m => rarityFilters.value.includes(m.rarity))
  }
  if (statusFilters.value.length > 0) {
    result = result.filter(m => statusFilters.value.includes(teacherMissionStatus(m)))
  }
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      m => m.title.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query)
    )
  }
  return sortMissions(result, sortBy.value, locale.value)
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

// ---- Ordenar: el orden de la progresión de la clase ----
// Se ofrece con edición y a partir de dos misiones. Cada cambio (al soltar una
// fila o al moverla con las flechas) se guarda al momento, sin botón de guardar:
// «Hecho» solo cierra la lista.
const toast = useToast()
const ordering = ref(false)
const orderButtonId = useId()
const orderPanelId = useId()
const canOrder = computed(() => can('mission.edit') && state.value.missions.length > 1)
// La clase entera en su orden, sin filtros: es lo que se ordena.
const orderedMissions = computed(() => sortMissions(state.value.missions, DEFAULT_MISSION_SORT))

function toggleOrdering() {
  ordering.value = !ordering.value
}

/** Cierra la lista y devuelve el foco al botón que la abrió. */
async function stopOrdering() {
  ordering.value = false
  await nextTick()
  document.getElementById(orderButtonId)?.focus()
}

/** Estado de la misión para el profesorado, como en el filtro. */
const missionStatusLabel = useMissionStatusLabel()
function statusLabel(mission: Parameters<typeof teacherMissionStatus>[0]) {
  return missionStatusLabel(teacherMissionStatus(mission))
}

async function saveOrder(ids: string[]) {
  try {
    const order = await teacherStore.reorderClassMissions(classId.value, ids)
    state.value.missions = orderByIds(state.value.missions, order)
    return true
  } catch {
    toast.error(t('teacher.classes.detail.missions_tab.order.error'))
    return false
  }
}

// Sin misiones suficientes (o sin edición) no hay nada que ordenar.
watch(canOrder, value => {
  if (!value) ordering.value = false
})

async function refreshMissions() {
  try {
    const res = await teacherStore.fetchClassMissions(classId.value, true)
    state.value.missions = res.missions
  } catch (error) {
    console.error('Error refreshing class missions:', error)
  }
}
</script>
