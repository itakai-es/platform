<template>
  <div class="space-y-4">
    <!-- Sub-navegación (pills), mismo patrón que el panel de Ajustes. El pill de
         Ranking solo aparece si la clase tiene los rankings activados. -->
    <div v-if="viewOptions.length > 1" class="flex gap-2 overflow-x-auto scrollbar-subtle">
      <button
        v-for="v in viewOptions"
        :key="v.id"
        type="button"
        :aria-pressed="activeView === v.id"
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

      <!-- Students table. `relative`: los textos sr-only de la tabla se recortan
           aquí y no ensanchan la página en el móvil. -->
      <div v-else class="relative overflow-x-auto rounded-2xl bg-white shadow-lg">
        <table class="w-full min-w-[600px] text-sm">
          <thead>
            <tr class="border-b border-navy-700/10 text-left text-navy-700/70">
              <th v-if="canSelect" class="w-10 py-3 pl-4">
                <Checkbox
                  :id="`${selectUid}-all`"
                  :model-value="allVisibleSelected"
                  @update:model-value="selectVisible($event)"
                />
                <label :for="`${selectUid}-all`" class="sr-only">
                  {{ t('teacher.classroom.select_all_visible') }}
                </label>
              </th>
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
              <th v-if="showActions" class="px-2 py-3">
                <span class="sr-only">{{ t('teacher.classes.detail.students.col_actions') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="student in students"
              :key="student.id"
              class="border-b border-navy-700/10 last:border-0 transition-colors hover:bg-navy-700/5"
              :class="{ 'bg-navy-700/5': selected.has(student.id) }"
            >
              <td v-if="canSelect" class="py-3 pl-4">
                <Checkbox
                  :id="`${selectUid}-${student.id}`"
                  :model-value="selected.has(student.id)"
                  @update:model-value="toggleSelected(student.id, $event)"
                />
                <label :for="`${selectUid}-${student.id}`" class="sr-only">
                  {{ t('teacher.classroom.select_student', { name: student.name }) }}
                </label>
              </td>
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
                    <p class="truncate text-xs text-navy-700/70">@{{ student.handle }}</p>
                    <!-- Las etiquetas, en su línea: así el alias no se corta por ellas -->
                    <div
                      v-if="student.accountType === 'managed' || student.pendingSignIn"
                      class="mt-1 flex flex-wrap gap-1"
                    >
                      <Badge v-if="student.accountType === 'managed'" variant="info" size="sm">
                        {{ t('teacher.classes.detail.students.managed_badge') }}
                      </Badge>
                      <Badge v-if="student.pendingSignIn" variant="warning" size="sm">
                        {{ t('teacher.classes.detail.students.pending_sign_in_badge') }}
                      </Badge>
                    </div>
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
              <td v-if="showActions" class="px-2 py-3 text-right">
                <StudentActionsMenu
                  :class-id="classId"
                  :class-name="className"
                  :student="student"
                  :access="myAccess"
                  @renamed="onRenamed(student, $event)"
                  @removed="onRemoved(student)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Barra de acciones de la selección: fija abajo mientras haya alguien elegido -->
      <div
        v-if="canSelect && selection.length"
        class="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-navy-700 p-3 text-white shadow-lg"
      >
        <span class="mr-auto px-1 text-sm font-semibold">
          {{ t('teacher.classroom.selected_count', { count: selection.length }, selection.length) }}
        </span>
        <Button
          v-if="canBehavior"
          size="sm"
          variant="secondary"
          :icon-left="HandRaisedIcon"
          @click="openAction('behavior', selection)"
        >
          {{ t('teacher.classroom.apply_behavior') }}
        </Button>
        <Button
          v-if="canReward"
          size="sm"
          variant="secondary"
          :icon-left="GiftIcon"
          @click="openAction('reward', selection)"
        >
          {{ t('teacher.classroom.give_reward') }}
        </Button>
        <Button size="sm" variant="ghost" class="!text-white" @click="selection = []">
          {{ t('teacher.classroom.clear_selection') }}
        </Button>
      </div>
    </template>

    <!-- ============================== Vista: Asistencia ============================== -->
    <AttendancePanel
      v-else-if="activeView === 'attendance'"
      :class-id="classId"
      :students="allStudents"
      :loading="isLoading"
      :schedule-config="classState.classData?.scheduleConfig ?? null"
      :can-take="can('attendance.take') && !archived"
      :can-export="can('attendance.export')"
      :can-apply="canBehavior || canReward"
      @apply="openAction($event.mode, $event.studentIds, $event.hints)"
    />

    <!-- ============================== Vista: Equipos ============================== -->
    <TeamsPanel
      v-else-if="activeView === 'teams'"
      :class-id="classId"
      :students="pickerStudents"
      :loading="isLoading"
      :can-manage="can('team.manage')"
      :can-award="canTeam"
      :archived="archived"
      @award="openTeamAward"
    />

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

      <template v-else>
        <TeamStandings :standings="teamStandings" />
        <ClassRankingSection
          :ranking-data="rankingData"
          :clickable="true"
          :show-current-user-highlight="false"
          @student-click="viewStudentProfile"
        />
      </template>
    </template>

    <!-- Aplicar a la selección (o a los presentes/ausentes de la lista), con confirmación -->
    <ClassroomActionModal
      v-model="actionOpen"
      :class-id="classId"
      :students="pickerStudents"
      :settings="settings"
      :initial-selection="actionSelection"
      :initial-mode="actionMode"
      :can-behavior="canBehavior"
      :can-reward="canReward"
      :can-team="canTeam"
      :initial-team-id="actionTeamId"
      @applied="onApplied"
    >
      <template #filters="{ select }">
        <AttendanceQuickFilters
          :class-id="classId"
          :student-ids="allStudents.map(s => s.id)"
          :select="select"
        />
      </template>
    </ClassroomActionModal>

    <!-- Resultado de la última acción sobre un alumno, para lectores de pantalla -->
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, MagnifyingGlassIcon, HandRaisedIcon, GiftIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import XpIcon from '~/components/atoms/XpIcon.vue'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'
import type { ClassSettings } from '~/types/class.types'
import type { AccountType } from '~/types/teacher.types'
import type { BatchResult } from '~/stores/behaviors'
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
  nickname: string | null
  accountType: AccountType
  canResetPassword: boolean
  isHomeClass: boolean
  /** Tiene la contraseña temporal sin usar: aún no ha entrado. */
  pendingSignIn: boolean
  removalDeletesAccount: boolean
}

const { t } = useI18n()
const { coinLabel } = useCoinLabel()
const route = useRoute()
const config = useRuntimeConfig()

const classId = computed(() => route.params.id as string)

const allStudents = ref<ClassStudentRow[]>([])

// Acceso propio y nombre de la clase: los carga la página de la clase.
const { state: classState, can } = useTeacherClassDetail(classId)
const myAccess = computed(() => classState.value.classData?.myAccess ?? null)
const className = computed(() => classState.value.classData?.name ?? '')
// La columna de acciones aparece si hay algo que hacer con alguien: gestionar
// el alumnado de la clase o restablecer la contraseña de alguna cuenta.
const showActions = computed(
  () => can('student.manage') || allStudents.value.some(s => s.canResetPassword)
)

const announcement = ref('')

// --- Selección múltiple y acciones en lote ---
const archived = computed(() => !!classState.value.classData?.archived)
const canBehavior = computed(
  () => can('behavior.apply') && settings.value.behaviors && !archived.value
)
const canReward = computed(() => can('reward.grant') && !archived.value)
const canTeam = computed(() => can('team.award') && !archived.value)
const canSelect = computed(() => canBehavior.value || canReward.value)

const selectUid = `students-select-${useId()}`.replace(/[^\w-]/g, '-')
const selection = ref<string[]>([])
const selected = computed(() => new Set(selection.value))

function toggleSelected(id: string, on: boolean) {
  selection.value = on
    ? [...new Set([...selection.value, id])]
    : selection.value.filter(x => x !== id)
}

/** La casilla de la cabecera: los que se ven ahora (con el buscador aplicado). */
const allVisibleSelected = computed(
  () => students.value.length > 0 && students.value.every(s => selected.value.has(s.id))
)
function selectVisible(on: boolean) {
  const visible = new Set(students.value.map(s => s.id))
  selection.value = on
    ? [...new Set([...selection.value, ...visible])]
    : selection.value.filter(id => !visible.has(id))
}

const pickerStudents = computed(() =>
  allStudents.value.map(s => ({
    id: s.id,
    name: s.name,
    avatar: s.avatar,
    hint: actionHints.value[s.id],
  }))
)

const actionOpen = ref(false)
const actionMode = ref<'behavior' | 'reward'>('behavior')
const actionSelection = ref<string[]>([])
/** Nota por estudiante en el selector y la confirmación (su estado en la lista, al venir de ella). */
const actionHints = ref<Record<string, string>>({})
/** Equipo con el que se abre la ventana (al premiarlo desde la vista de equipos). */
const actionTeamId = ref<string | null>(null)

function openAction(
  mode: 'behavior' | 'reward',
  studentIds: string[],
  hints: Record<string, string> = {}
) {
  actionMode.value = mode
  actionSelection.value = [...studentIds]
  actionHints.value = hints
  actionTeamId.value = null
  actionOpen.value = true
}

function openTeamAward(teamId: string) {
  actionMode.value = canBehavior.value ? 'behavior' : 'reward'
  actionSelection.value = []
  actionHints.value = {}
  actionTeamId.value = teamId
  actionOpen.value = true
}

/** Saldos nuevos en la tabla, sin recargarla, y aviso para el lector de pantalla. */
function onApplied(result: BatchResult) {
  const byId = new Map(result.students.map(s => [s.studentId, s]))
  for (const row of allStudents.value) {
    const balances = byId.get(row.id)
    if (!balances) continue
    Object.assign(row, {
      xp: balances.xp,
      coins: balances.coins,
      mana: balances.mana,
      lives: balances.lives,
      level: balances.level,
    })
    if (result.kind === 'positive') row.positiveBehaviors += 1
    if (result.kind === 'negative') row.negativeBehaviors += 1
  }
  selection.value = []
  announcement.value = t(
    'teacher.classroom.applied_announcement',
    { count: result.count },
    result.count
  )
}

function onRenamed(student: ClassStudentRow, nickname: string) {
  student.nickname = nickname
  student.handle = nickname
}

function onRemoved(student: ClassStudentRow) {
  allStudents.value = allStudents.value.filter(s => s.id !== student.id)
  if (classState.value.classData) {
    classState.value.classData.studentCount = Math.max(
      0,
      (classState.value.classData.studentCount ?? 1) - 1
    )
  }
  announcement.value = t('teacher.students.actions.removed', { name: student.name })
}

const settings = ref<ClassSettings>(resolveClassSettings(null))
const isLoading = ref(true)

// Sub-vista activa: 'list' (tabla de gestión) por defecto; 'attendance' es
// pasar lista y su histórico; 'teams', los equipos; 'ranking' es el podio.
type StudentsView = 'list' | 'attendance' | 'teams' | 'ranking'
// `?vista=asistencia` abre directamente pasar lista (el aviso de la ruleta lleva aquí).
const activeView = ref<StudentsView>(route.query.vista === 'asistencia' ? 'attendance' : 'list')
const viewOptions = computed(() => {
  const list: { id: StudentsView; label: string }[] = [
    { id: 'list', label: t('teacher.classes.detail.students.view_list') },
  ]
  if (can('attendance.view'))
    list.push({ id: 'attendance', label: t('teacher.classes.detail.students.view_attendance') })
  list.push({ id: 'teams', label: t('teacher.classes.detail.students.view_teams') })
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
    list = list.filter(s => s.name.toLowerCase().includes(q) || s.handle.toLowerCase().includes(q))
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

// Clasificación de equipos: las agrupaciones de base, por puntos.
const classTeams = useClassTeams(classId)
const teamStandings = computed(() =>
  classTeams.activeSets.value
    .filter(set => set.kind === 'base')
    .map(set => ({
      set: { id: set.id, title: set.title },
      teams: set.teams
        .map((team, index) => ({ ...team, index }))
        .sort((a, b) => b.points - a.points),
    }))
)

function viewStudentProfile(studentId: string) {
  navigateTo(`/profesor/alumnos/${studentId}`)
}

// Carga perezosa del ranking la primera vez que se abre esa sub-vista; si ya
// estaba cacheado por el store, `ensureClassRanking` es no-op (cache hit).
watch(activeView, async view => {
  if (view !== 'ranking' || rankingLoaded.value) return
  rankingLoading.value = true
  try {
    await Promise.all([teacherStore.ensureClassRanking(classId.value), classTeams.ensure()])
    rankingLoaded.value = true
  } finally {
    rankingLoading.value = false
  }
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
