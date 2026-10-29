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
          :hint="orderHint"
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
                <!-- Lo que pide en el mapa (con el mapa encendido, no puede ir
                     delante de eso) -->
                <p v-if="pathTextOf(item)" class="text-xs text-navy-700/70">
                  {{ pathTextOf(item) }}
                </p>
              </template>
              <template #meta="{ item }">
                <RarityBadge v-if="item.rarity" :rarity="item.rarity" />
              </template>
            </AdminSortableList>
          </div>
        </SettingsSection>

        <!-- Camino del mapa en un paso: cada misión abierta pide la abierta
             anterior (las bloqueadas se quedan fuera), o ninguna pide nada. Sin
             ventana de confirmar: lo que va a pasar está escrito junto a cada
             botón. Con el mapa apagado también, con una nota: se prepara antes
             de encenderlo. -->
        <SettingsSection
          class="mt-6"
          :title="t('teacher.classes.detail.missions_tab.path.title')"
          :hint="t('teacher.classes.detail.missions_tab.path.hint')"
        >
          <InfoNote v-if="!mapOn">
            {{ t('teacher.missions.detail.settings.path_map_off') }}
          </InfoNote>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p
              :id="chainSummaryId"
              tabindex="-1"
              class="text-sm text-navy-700/80 focus:outline-none"
            >
              {{ chainText }}
            </p>
            <Button
              :id="chainButtonId"
              variant="outline"
              size="sm"
              class="w-full flex-shrink-0 sm:w-auto"
              :disabled="chain.alreadyChained || !!pathBusy"
              :loading="pathBusy === 'chain'"
              :aria-describedby="chainSummaryId"
              @click="changePath('chain')"
            >
              <LinkIcon class="mr-2 h-4 w-4" aria-hidden="true" />
              {{ t('teacher.classes.detail.missions_tab.path.chain') }}
            </Button>
          </div>
          <div
            v-if="chain.current > 0"
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <p :id="clearSummaryId" class="text-sm text-navy-700/80">
              {{
                t(
                  'teacher.classes.detail.missions_tab.path.clear_summary',
                  { count: chain.current },
                  chain.current
                )
              }}
            </p>
            <Button
              :id="clearButtonId"
              variant="outline"
              size="sm"
              class="w-full flex-shrink-0 sm:w-auto"
              :disabled="!!pathBusy"
              :loading="pathBusy === 'clear'"
              :aria-describedby="clearSummaryId"
              @click="changePath('clear')"
            >
              <XMarkIcon class="mr-2 h-4 w-4" aria-hidden="true" />
              {{ t('teacher.classes.detail.missions_tab.path.clear') }}
            </Button>
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
      @imported="reloadMissions"
    />
  </div>
</template>

<script setup lang="ts">
import { teacherMissionStatus } from '~/utils/mission-teacher-status'
import { DEFAULT_MISSION_SORT, orderByIds, sortMissions } from '~/utils/mission-sort'
import { chainSummary, orderBreaksPath } from '~/utils/mission-path'
import type { ViewMode } from '~/composables/useViewMode'
import {
  RocketLaunchIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowsUpDownIcon,
  LinkIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const { t, locale } = useI18n()
const route = useRoute()
const classId = computed(() => route.params.id as string)
const { state, can, classSettings, reloadMissions } = useTeacherClassDetail(classId)
// El mapa es una vista más, solo en las clases que lo tienen encendido (en pruebas).
const mapOn = computed(() => classSettings.value.missionMap)
const viewModes = computed<ViewMode[]>(() =>
  mapOn.value ? ['grid', 'list', 'map'] : ['grid', 'list']
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

/** «X» se abre al completar «Y»: tiene que ir detrás (y cómo quitarlo). */
function breaksPathMessage(broken: { missionId: string; requiredMissionId: string }) {
  const titleOf = (id: string) => state.value.missions.find(m => m.id === id)?.title ?? ''
  return t('teacher.classes.detail.missions_tab.order.breaks_path', {
    mission: titleOf(broken.missionId),
    required: titleOf(broken.requiredMissionId),
  })
}

async function saveOrder(ids: string[]) {
  // Con el mapa encendido, una misión no va delante de lo que pide (la API
  // también lo rechaza). Apagado, sí: al encenderlo, la API la recoloca.
  const broken = mapOn.value ? orderBreaksPath(ids, state.value.missions) : null
  if (broken) {
    toast.error(breaksPathMessage(broken))
    return false
  }
  try {
    const order = await teacherStore.reorderClassMissions(classId.value, ids)
    state.value.missions = orderByIds(state.value.missions, order)
    return true
  } catch (err) {
    // Alguien ha cambiado el camino a la vez: con las misiones al día se sabe
    // qué misión lo impide (el mensaje de la API va sin traducir).
    if ((err as { data?: { code?: string } })?.data?.code === 'MISSION_ORDER_BREAKS_PATH') {
      await reloadMissions()
      const now = orderBreaksPath(ids, state.value.missions)
      if (now) {
        toast.error(breaksPathMessage(now))
        return false
      }
    }
    toast.error(t('teacher.classes.detail.missions_tab.order.error'))
    return false
  }
}

// ---- Camino del mapa: lo que pide cada misión ----
const { opensAfter } = useMissionPathText()
/** «Se abre al completar «A»», con lo que pide la misión; vacío si no pide nada. */
function pathTextOf(mission: { prerequisiteIds?: string[] }) {
  // En el orden de la clase, como en el mapa.
  const ids = new Set(mission.prerequisiteIds ?? [])
  const required = orderedMissions.value.filter(m => ids.has(m.id))
  return required.length > 0 ? opensAfter(required) : ''
}

// Encadenar en orden o quitar los requisitos, con lo que va a pasar junto al botón.
const chainSummaryId = useId()
const clearSummaryId = useId()
const chainButtonId = useId()
const clearButtonId = useId()
const chain = computed(() => chainSummary(orderedMissions.value))
const chainText = computed(() => {
  const { links, current, skipped, alreadyChained } = chain.value
  const parts = alreadyChained
    ? [t('teacher.classes.detail.missions_tab.path.chained')]
    : [
        t('teacher.classes.detail.missions_tab.path.chain_summary', { count: links }, links),
        current > 0
          ? t(
              'teacher.classes.detail.missions_tab.path.chain_replaces',
              { count: current },
              current
            )
          : '',
      ]
  if (skipped > 0) parts.push(t('teacher.classes.detail.missions_tab.path.chain_skips_locked'))
  return parts.filter(Boolean).join(' ')
})
// La pista del orden: con el mapa encendido y requisitos, por qué una fila no
// se deja mover y qué hacer.
const orderHint = computed(() => {
  const base = t('teacher.classes.detail.missions_tab.order.hint')
  return mapOn.value && chain.value.current > 0
    ? `${base} ${t('teacher.classes.detail.missions_tab.order.hint_path')}`
    : base
})
const pathBusy = ref<'chain' | 'clear' | null>(null)
async function changePath(mode: 'chain' | 'clear') {
  if (pathBusy.value) return
  pathBusy.value = mode
  try {
    state.value.missions = await teacherStore.setClassMissionPath(classId.value, mode)
    toast.success(
      mode === 'chain'
        ? t('teacher.classes.detail.missions_tab.path.chain_done')
        : t('teacher.classes.detail.missions_tab.path.clear_done')
    )
  } catch {
    toast.error(t('teacher.classes.detail.missions_tab.path.error'))
  } finally {
    pathBusy.value = null
  }
  await focusAfterPathChange(mode)
}

/**
 * Tras encadenar o quitar, el botón pulsado se desactiva o desaparece: el foco
 * se queda en él si sigue activo (no ha ido bien), si no pasa al otro y, si no
 * queda ninguno, al resumen de la cadena.
 */
async function focusAfterPathChange(mode: 'chain' | 'clear') {
  await nextTick()
  const ids = mode === 'chain' ? [chainButtonId, clearButtonId] : [clearButtonId, chainButtonId]
  const active = ids
    .map(id => document.getElementById(id) as HTMLButtonElement | null)
    .find(button => button && !button.disabled)
  ;(active ?? document.getElementById(chainSummaryId))?.focus()
}

// Sin misiones suficientes (o sin edición) no hay nada que ordenar.
watch(canOrder, value => {
  if (!value) ordering.value = false
})
</script>
