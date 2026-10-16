<template>
  <!-- La ruleta ocupa toda la ventana desde el principio (en iPhone no hay pantalla
       completa); el botón de pantalla completa la saca además del navegador. -->
  <div
    class="roulette-stage flex min-h-[100dvh] flex-col overflow-y-auto bg-navy-700 text-white"
    @keydown="onStageKeydown"
  >
    <!-- Barra superior: qué clase, y salir siempre a la vista (Escape es del navegador) -->
    <header class="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
      <div class="min-w-0">
        <p v-if="classData" class="truncate text-sm text-white/70">{{ classData.name }}</p>
        <h1 class="text-2xl font-bold text-white sm:text-3xl">{{ t('teacher.roulette.title') }}</h1>
      </div>
      <div class="flex flex-shrink-0 items-center gap-2">
        <Button
          v-if="ready && settings.sounds"
          variant="secondary"
          size="md"
          :aria-pressed="!muted"
          @click="toggleSound"
        >
          <component
            :is="muted ? SpeakerXMarkIcon : SpeakerWaveIcon"
            class="h-5 w-5 sm:mr-2"
            aria-hidden="true"
          /><span class="sr-only sm:not-sr-only">{{ t('teacher.roulette.sound') }}</span>
        </Button>
        <Button
          v-if="ready && canFullscreen"
          variant="secondary"
          size="md"
          @click="toggleFullscreen"
        >
          <component
            :is="isFullscreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon"
            class="h-5 w-5 sm:mr-2"
            aria-hidden="true"
          /><span class="sr-only sm:not-sr-only">{{
            isFullscreen
              ? t('teacher.roulette.fullscreen_exit')
              : t('teacher.roulette.fullscreen_enter')
          }}</span>
        </Button>
        <Button variant="secondary-yellow" size="md" :to="classHref">
          <XMarkIcon class="h-5 w-5 sm:mr-2" aria-hidden="true" /><span
            class="sr-only sm:not-sr-only"
            >{{ t('teacher.roulette.exit') }}</span
          >
        </Button>
      </div>
    </header>

    <main class="flex flex-1 flex-col px-4 pb-6 sm:px-6">
      <div v-if="loading" class="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>

      <!-- Sin acceso o sin clase -->
      <div v-else-if="!classData || !can('student.view')" class="mx-auto w-full max-w-lg">
        <div class="rounded-2xl bg-white px-6">
          <EmptyState
            :icon="ExclamationTriangleIcon"
            :title="t('teacher.classes.detail.not_found_title')"
            :description="t('teacher.classes.detail.not_found_description')"
            :heading-level="2"
          >
            <template #action>
              <Button variant="primary" to="/profesor/clases">{{
                t('teacher.classes.detail.btn_back')
              }}</Button>
            </template>
          </EmptyState>
        </div>
      </div>

      <!-- En la papelera: esta página no cuelga de la de la clase y no hereda su aviso -->
      <div v-else-if="classData.deletedAt" class="mx-auto w-full max-w-lg">
        <div class="rounded-2xl bg-white px-6">
          <EmptyState
            :icon="TrashIcon"
            :title="t('teacher.roulette.trash_title')"
            :description="t('teacher.roulette.trash_description')"
            :heading-level="2"
          >
            <template #action>
              <Button variant="primary" :to="classHref">{{
                t('teacher.roulette.back_to_class')
              }}</Button>
            </template>
          </EmptyState>
        </div>
      </div>

      <div v-else-if="students.length === 0" class="mx-auto w-full max-w-lg">
        <div class="rounded-2xl bg-white px-6">
          <EmptyState
            :icon="UsersIcon"
            :title="t('teacher.roulette.empty_title')"
            :description="t('teacher.roulette.empty_description')"
            :heading-level="2"
          />
        </div>
      </div>

      <div
        v-else
        class="mx-auto grid w-full max-w-6xl flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <!-- Rueda, resultado y botón de girar -->
        <section class="flex flex-col items-center gap-5" :aria-label="t('teacher.roulette.title')">
          <div ref="wheelBoxRef" class="w-full max-w-[min(100%,58vh,36rem)]">
            <RouletteWheel
              v-if="wheelEntries.length > 0"
              :entries="wheelEntries"
              :rotation="rotation"
              :duration-ms="spinDuration"
              @settled="onSettled"
            />
            <div
              v-else
              class="flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-full border-4 border-dashed border-white/30 p-8 text-center"
            >
              <p class="text-lg font-bold text-white sm:text-xl">{{ emptyWheel.title }}</p>
              <p class="text-sm text-white/80 sm:text-base">{{ emptyWheel.description }}</p>
              <Button v-if="canRestart" variant="secondary" size="md" @click="restart">
                <ArrowPathIcon class="mr-2 h-5 w-5" aria-hidden="true" />{{
                  t('teacher.roulette.restart')
                }}
              </Button>
            </div>
          </div>

          <!-- Resultado (visible). Para el lector de pantalla se anuncia una sola vez abajo. -->
          <div class="flex min-h-[5.5rem] w-full max-w-xl items-center justify-center gap-4">
            <template v-if="winner && !spinning">
              <TeamBadge
                v-if="winnerTeam"
                title=""
                :color="winnerTeam.color"
                :emblem="winnerTeam.emblem"
                :index="winnerTeam.index"
                size="lg"
              />
              <Avatar
                v-else
                :src="winner.avatar || undefined"
                :username="winner.label"
                size="md"
                alt=""
              />
              <div class="min-w-0">
                <p class="text-sm text-white/70">{{ t('teacher.roulette.picked_label') }}</p>
                <p class="break-words text-3xl font-bold leading-tight text-white sm:text-5xl">
                  {{ winner.label }}
                </p>
              </div>
            </template>
            <p v-else-if="spinning && reducedMotion" class="text-2xl font-bold text-white">
              {{ t('teacher.roulette.choosing') }}
            </p>
            <p v-else-if="!spinning && eligible.length > 0" class="text-white/80">
              {{ t('teacher.roulette.idle_hint') }}
            </p>
          </div>

          <div ref="spinBoxRef" class="flex flex-col items-center gap-2">
            <Button
              variant="secondary-yellow"
              size="lg"
              class="min-w-[14rem] text-lg"
              :disabled="eligible.length === 0"
              :aria-disabled="spinning ? 'true' : undefined"
              @click="spin"
            >
              <ArrowPathIcon class="mr-2 h-6 w-6" aria-hidden="true" />{{
                winner ? t('teacher.roulette.spin_again') : t('teacher.roulette.spin')
              }}
            </Button>
            <p class="text-xs text-white/70">{{ t('teacher.roulette.keyboard_hint') }}</p>
          </div>

          <!-- Con quien ha salido: girar dentro de su equipo, o aplicarle algo (con edición).
               Debajo de «Girar otra vez», que en el proyector no baje de la pantalla. -->
          <div
            v-if="winner && !spinning && (winnerTeam || canApplyWinner)"
            class="flex flex-wrap items-center justify-center gap-2"
          >
            <Button v-if="winnerTeam" variant="secondary" size="md" @click="spinInsideWinner">
              <UserGroupIcon class="mr-2 h-5 w-5" aria-hidden="true" />{{
                t('teacher.roulette.spin_inside', { team: winner.label })
              }}
            </Button>
            <Button v-if="canApplyWinner" variant="secondary" size="md" @click="openAction">
              <GiftIcon class="mr-2 h-5 w-5" aria-hidden="true" />{{
                winnerTeam
                  ? t('teacher.roulette.award_team', { team: winner.label })
                  : t('teacher.roulette.apply_to', { name: winner.label })
              }}
            </Button>
          </div>

          <!-- Tras el último en salir, la rueda se queda como estaba: cómo seguir -->
          <div
            v-if="!spinning && eligible.length === 0 && wheelEntries.length > 0"
            ref="exhaustedBoxRef"
            class="flex max-w-md flex-col items-center gap-2 text-center"
          >
            <p class="font-bold text-white">{{ emptyWheel.title }}</p>
            <p class="text-sm text-white/80">{{ emptyWheel.description }}</p>
            <Button v-if="canRestart" variant="secondary" size="md" @click="restart">
              <ArrowPathIcon class="mr-2 h-5 w-5" aria-hidden="true" />{{
                t('teacher.roulette.restart')
              }}
            </Button>
          </div>
        </section>

        <!-- Quién está en la rueda -->
        <aside class="rounded-2xl bg-white p-4 text-navy-700" aria-labelledby="roulette-list-title">
          <div class="flex items-baseline justify-between gap-2">
            <h2 id="roulette-list-title" class="text-lg font-bold">
              {{
                mode === 'teams'
                  ? t('teacher.roulette.list_title_teams')
                  : t('teacher.roulette.list_title')
              }}
            </h2>
            <p class="text-sm font-semibold text-navy-700/70">
              {{ t('teacher.roulette.counter', { left: eligible.length, total: scope.length }) }}
            </p>
          </div>

          <!-- Quién juega: todo el alumnado, un equipo o los equipos de una agrupación -->
          <div v-if="modeOptions.length > 1" class="mt-3 space-y-3">
            <OptionPillGroup
              :model-value="mode"
              :options="modeOptions"
              :aria-label="t('teacher.roulette.mode_label')"
              fluid
              min-item-width="5.5rem"
              @update:model-value="setMode"
            />
            <div v-if="mode === 'team'">
              <p id="roulette-team" class="mb-1 text-sm font-semibold">
                {{ t('teacher.roulette.team_label') }}
              </p>
              <SelectDropdown
                :model-value="selectedTeam?.id ?? ''"
                :options="teamSelectOptions"
                labelledby="roulette-team"
                :disabled="spinning"
                @update:model-value="setTeam"
              />
            </div>
            <div v-else-if="mode === 'teams'">
              <p id="roulette-set" class="mb-1 text-sm font-semibold">
                {{ t('teacher.roulette.set_label') }}
              </p>
              <SelectDropdown
                :model-value="selectedSet?.id ?? ''"
                :options="setSelectOptions"
                labelledby="roulette-set"
                :disabled="spinning"
                @update:model-value="setSet"
              />
            </div>
          </div>

          <!-- Asistencia de hoy: quien falta no entra (solo el número: esto se proyecta) -->
          <InfoNote v-if="attendanceNote" class="mt-3">
            {{ attendanceNote }}
            <NuxtLink
              v-if="!attendance.taken.value && canTakeAttendance"
              :to="`${classHref}/alumnos?vista=asistencia`"
              class="font-semibold text-navy-700 underline"
              >{{ t('teacher.roulette.take_attendance') }}</NuxtLink
            >
          </InfoNote>

          <div class="mt-3 flex items-start justify-between gap-3">
            <div>
              <p id="roulette-no-repeat" class="font-semibold">
                {{ t('teacher.roulette.no_repeat') }}
              </p>
              <p id="roulette-no-repeat-hint" class="text-sm text-navy-700/70">
                {{ t('teacher.roulette.no_repeat_hint') }}
              </p>
            </div>
            <Toggle
              :model-value="noRepeat"
              :disabled="spinning"
              aria-labelledby="roulette-no-repeat"
              aria-describedby="roulette-no-repeat-hint"
              @update:model-value="setNoRepeat"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            class="mt-3"
            :disabled="!canRestart || spinning"
            @click="restart"
          >
            <ArrowPathIcon class="mr-2 h-4 w-4" aria-hidden="true" />{{
              t('teacher.roulette.restart')
            }}
          </Button>

          <ul class="mt-4 max-h-[50vh] space-y-1 overflow-y-auto pr-1 scrollbar-subtle">
            <li
              v-for="entry in scope"
              :key="entry.id"
              class="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5"
              :class="isOut(entry.id) ? 'bg-navy-700/5' : ''"
            >
              <TeamBadge
                v-if="mode === 'teams'"
                title=""
                :color="teamOf(entry.id)?.color"
                :emblem="teamOf(entry.id)?.emblem"
                :index="teamOf(entry.id)?.index"
                size="sm"
              />
              <div class="min-w-0 flex-1">
                <p
                  class="truncate font-medium"
                  :class="isOut(entry.id) ? 'text-navy-700/60 line-through' : ''"
                >
                  {{ entry.label }}
                </p>
                <p v-if="drawn.has(entry.id)" class="text-xs text-navy-700/70">
                  {{ t('teacher.roulette.status_drawn') }}
                </p>
                <p v-else-if="removed.has(entry.id)" class="text-xs text-navy-700/70">
                  {{ t('teacher.roulette.status_removed') }}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                class="flex-shrink-0"
                :disabled="spinning"
                :aria-label="
                  isOut(entry.id)
                    ? t('teacher.roulette.restore_aria', { name: entry.label })
                    : t('teacher.roulette.remove_aria', { name: entry.label })
                "
                @click="toggleOut(entry.id)"
              >
                {{ isOut(entry.id) ? t('teacher.roulette.restore') : t('teacher.roulette.remove') }}
              </Button>
            </li>
          </ul>
        </aside>
      </div>
    </main>

    <p id="roulette-live" class="sr-only" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>

    <!-- Aplicar algo a quien ha salido: la misma ventana (y confirmación) que en Alumnos -->
    <ClassroomActionModal
      v-if="ready"
      v-model="actionOpen"
      :class-id="classId"
      :students="pickerStudents"
      :settings="settings"
      :initial-selection="actionSelection"
      :can-behavior="canBehavior"
      :can-reward="canReward"
      :can-team="!!winnerTeam && canTeamAward"
      :initial-team-id="winnerTeam?.id ?? null"
      fixed-recipients
      :title="
        winnerTeam || !winner
          ? undefined
          : t('teacher.roulette.apply_title', { name: winner.label })
      "
    />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowPathIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ExclamationTriangleIcon,
  GiftIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  TrashIcon,
  UserGroupIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import type { PickerStudent } from '~/components/molecules/StudentPicker.vue'
import type { Class } from '~/types/class.types'
import type { TeamOption } from '~/types/team.types'
import { teamFillOf } from '~/utils/team-style'
import { resolveClassSettings } from '~/utils/class-settings'
import {
  localDay,
  randomIndex,
  randomUnit,
  readRouletteRound,
  rouletteLabel,
  rouletteRoundForDay,
  rouletteScope,
  rouletteTarget,
  rouletteTickTimes,
  writeRouletteRound,
  type RouletteEntry,
  type RouletteMode,
} from '~/utils/roulette'

/**
 * Ruleta de la clase (bloque 4, E2). Página propia, fuera de las pestañas y a
 * toda la ventana: se proyecta en el aula. Elige a un estudiante al azar entre
 * los que están en la rueda, a uno de un equipo, o a un equipo de una agrupación
 * (y luego, si se quiere, a alguien de ese equipo). Quien falta hoy según la
 * lista no entra. El giro no se apunta en el historial ni reparte nada.
 *
 * La puede usar todo el profesorado de la clase (`student.view`, lectura):
 * también el de prácticas. Aplicar algo a quien sale es aparte, con su
 * confirmación y solo con edición; eso sí queda en el historial.
 */
definePageMeta({
  layout: false,
  middleware: ['auth', 'role'],
})

const { t } = useI18n()
const route = useRoute()
const teacherStore = useTeacherStore()
const effects = useEffects()
const reducedMotion = useReducedMotion()

useHead({ title: () => t('teacher.roulette.meta.title') })

const classId = route.params.classId as string
const classHref = `/profesor/clases/${classId}`

// ── Datos ─────────────────────────────────────────────────────────────────

const loading = ref(true)
const classData = ref<Class | null>(null)
const students = ref<RouletteEntry[]>([])
// Quién falta hoy (D1) y los equipos (D2): estado compartido con el resto de la clase.
const attendance = useClassAttendance(classId)
const teams = useClassTeams(classId)

const settings = computed(() => resolveClassSettings(classData.value?.settings))
const { can } = useClassPermissions(() => classData.value?.myAccess)
const ready = computed(
  () => !loading.value && !!classData.value && !classData.value.deletedAt && can('student.view')
)

const canAttendance = computed(() => can('attendance.view'))

async function load() {
  loading.value = true
  try {
    classData.value = await teacherStore.fetchClassById(classId)
    if (!classData.value || classData.value.deletedAt) return
    // El listado de la clase ya deja fuera la matrícula de «ver como alumno».
    const [result] = await Promise.all([
      teacherStore.fetchStudents(classId, true),
      // Lo de hoy, recién leído: puede que se acabe de pasar lista en otra pestaña.
      canAttendance.value ? refreshAttendance() : null,
      // Sin equipos (o si fallan), la ruleta sigue con todo el alumnado.
      teams.ensure().catch(() => {}),
    ])
    students.value = (result?.students ?? [])
      .map(s => ({ id: s.id, label: rouletteLabel(s), avatar: s.avatar }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    classData.value = null
  } finally {
    loading.value = false
  }
}

// ── Asistencia de hoy ─────────────────────────────────────────────────────

const attendanceLoaded = ref(false)

/** Si falla, la ruleta no se bloquea: sale todo el alumnado, sin aviso. */
async function refreshAttendance() {
  try {
    await attendance.refresh()
    attendanceLoaded.value = true
  } catch {
    attendanceLoaded.value = false
  }
}

/** Ausentes y faltas justificadas de la lista de hoy; sin lista, nadie. */
const absent = computed<ReadonlySet<string>>(() =>
  canAttendance.value && attendanceLoaded.value ? attendance.absentIds.value : new Set()
)
const absentCount = computed(() => students.value.filter(s => absent.value.has(s.id)).length)
const canTakeAttendance = computed(() => can('attendance.take') && !archived.value)

/**
 * Lo que se dice de la asistencia. Solo el número de quien falta, nunca quién:
 * la pantalla se ve en toda la clase y la asistencia es un dato personal.
 */
const attendanceNote = computed(() => {
  if (!canAttendance.value || !attendanceLoaded.value) return ''
  if (!attendance.taken.value) return t('teacher.roulette.attendance_not_taken')
  if (absentCount.value === 0) return t('teacher.roulette.attendance_all_here')
  return t('teacher.roulette.attendance_excluded', { count: absentCount.value }, absentCount.value)
})

// ── Equipos ───────────────────────────────────────────────────────────────

const mode = ref<RouletteMode>('students')
const teamId = ref<string | null>(null)
const setId = ref<string | null>(null)

/** Equipos de las agrupaciones sin archivar, para «Un equipo». */
const teamChoices = computed(() => teams.teamOptions.value)
/** Agrupaciones con al menos dos equipos, para «Entre equipos». */
const setChoices = computed(() => teams.activeSets.value.filter(set => set.teams.length >= 2))

const selectedTeam = computed(
  () => teamChoices.value.find(team => team.id === teamId.value) ?? teamChoices.value[0] ?? null
)
const selectedSet = computed(
  () => setChoices.value.find(set => set.id === setId.value) ?? setChoices.value[0] ?? null
)

const modeOptions = computed(() => {
  const list: { value: RouletteMode; label: string }[] = [
    { value: 'students', label: t('teacher.roulette.mode_students') },
  ]
  if (teamChoices.value.length) list.push({ value: 'team', label: t('teacher.roulette.mode_team') })
  if (setChoices.value.length)
    list.push({ value: 'teams', label: t('teacher.roulette.mode_teams') })
  return list
})

const teamSelectOptions = computed(() =>
  teamChoices.value.map(team => ({ value: team.id, label: team.title, hint: team.setTitle }))
)
const setSelectOptions = computed(() =>
  setChoices.value.map(set => ({ value: set.id, label: set.title }))
)

/** Un equipo de la agrupación elegida, con su posición (da color y emblema si no tiene). */
function teamOf(id: string): TeamOption | null {
  return teamChoices.value.find(team => team.id === id) ?? null
}

// Si desaparecen los equipos (se archivan o se borran en otra pestaña), vuelta a todo el alumnado.
watch(modeOptions, options => {
  if (!spinning.value && !options.some(option => option.value === mode.value)) setMode('students')
})

/**
 * Lo que entra en juego antes de la ronda: el alumnado (o un equipo, o los
 * equipos de una agrupación) menos quien falta hoy.
 */
const scope = computed<RouletteEntry[]>(() => {
  if (mode.value === 'team') {
    const team = selectedTeam.value
    return rouletteScope(students.value, absent.value, 'team', team ? [team] : [])
  }
  if (mode.value === 'teams') {
    const set = selectedSet.value
    const list = (set?.teams ?? []).map((team, index) => ({
      ...team,
      fill: teamFillOf(team.color, index),
    }))
    return rouletteScope(students.value, absent.value, 'teams', list)
  }
  return rouletteScope(students.value, absent.value, 'students')
})
const scopeIds = computed(() => new Set(scope.value.map(entry => entry.id)))

/** Otra cosa en la rueda: lo que se veía del giro anterior ya no vale. */
function clearResult() {
  frozen.value = null
  winner.value = null
  announcement.value = ''
}

function setMode(value: RouletteMode) {
  if (spinning.value || value === mode.value) return
  mode.value = value
  clearResult()
}

function setTeam(value: string | number) {
  if (spinning.value) return
  teamId.value = String(value)
  clearResult()
}

function setSet(value: string | number) {
  if (spinning.value) return
  setId.value = String(value)
  clearResult()
}

/** Tras salir un equipo, la rueda pasa a sus integrantes (los que han venido). */
async function spinInsideWinner() {
  const team = winnerTeam.value
  if (spinning.value || !team) return
  teamId.value = team.id
  mode.value = 'team'
  clearResult()
  await nextTick()
  spinBoxRef.value?.querySelector('button')?.focus()
}

// La ronda de hoy en este dispositivo: quién ya ha salido («sin repetir») y si lo está.
const round = ref(readRouletteRound(classId))
const drawn = computed(() => new Set(round.value.noRepeat ? round.value.drawn : []))
const noRepeat = computed(() => round.value.noRepeat)
// Quitado a mano solo para esta ronda (no se guarda: es un ajuste del momento).
const removed = ref(new Set<string>())

const isOut = (id: string) => drawn.value.has(id) || removed.value.has(id)
const eligible = computed(() => scope.value.filter(entry => !isOut(entry.id)))
// Solo cuenta lo de la rueda de ahora: empezar de nuevo con un equipo no
// devuelve a quien salió con todo el alumnado.
const drawnHere = computed(() => [...drawn.value].filter(id => scopeIds.value.has(id)).length)
const removedHere = computed(() => [...removed.value].filter(id => scopeIds.value.has(id)).length)
const canRestart = computed(() => drawnHere.value > 0 || removedHere.value > 0)

function saveRound() {
  writeRouletteRound(classId, round.value)
}

/**
 * Si la página lleva abierta desde otro día (lo normal en el ordenador del
 * aula), quien salió ayer vuelve a la rueda: empieza la ronda de hoy, con el
 * mismo «sin repetir». Va antes de cada acción y al volver a la pestaña.
 * Devuelve si ha cambiado algo.
 */
function rollOverDay(): boolean {
  if (spinning.value) return false
  const today = rouletteRoundForDay(round.value, localDay())
  if (today === round.value) return false
  round.value = today
  removed.value = new Set()
  frozen.value = null
  winner.value = null
  announcement.value = ''
  saveRound()
  return true
}

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  rollOverDay()
  // Al volver (de pasar lista o de cambiar equipos en otra pestaña), lo de hoy.
  if (canAttendance.value) void refreshAttendance()
  void teams.refresh().catch(() => {})
}

// Nada de esto cambia la rueda en pleno giro: la aguja acabaría en otra persona.
function setNoRepeat(value: boolean) {
  if (spinning.value) return
  rollOverDay()
  round.value = { ...round.value, noRepeat: value }
  frozen.value = null
  saveRound()
}

function restart() {
  if (spinning.value) return
  rollOverDay()
  const here = scopeIds.value
  round.value = { ...round.value, drawn: round.value.drawn.filter(id => !here.has(id)) }
  removed.value = new Set([...removed.value].filter(id => !here.has(id)))
  frozen.value = null
  saveRound()
}

function toggleOut(id: string) {
  // Tras cambiar de día, la lista ya no es la que se veía al pulsar: no se toca nada más.
  if (spinning.value || rollOverDay()) return
  if (drawn.value.has(id)) {
    round.value = { ...round.value, drawn: round.value.drawn.filter(other => other !== id) }
    saveRound()
  } else {
    const next = new Set(removed.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    removed.value = next
  }
  frozen.value = null
}

// ── Giro ──────────────────────────────────────────────────────────────────

const SPIN_MS = 4200
// Con menos movimiento no hay giro: un momento de «Eligiendo…» y se enseña.
const REDUCED_REVEAL_MS = 700

// Lo que pinta la rueda: durante el giro y tras él, los sectores con los que se
// giró (quien sale sigue bajo la aguja); al cambiar la ronda, vuelve a la lista viva.
const frozen = ref<RouletteEntry[] | null>(null)
const wheelEntries = computed(() => frozen.value ?? eligible.value)

const rotation = ref(0)
const spinDuration = ref(0)
const spinning = ref(false)
const winner = ref<RouletteEntry | null>(null)
const announcement = ref('')
let spinToken = 0
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
// Cómo acabar el giro en curso cuando la rueda avise de que ha parado.
let pendingFinish: (() => void) | null = null

const wheelBoxRef = ref<HTMLElement | null>(null)
// El botón de girar, para devolverle el foco (Button no tiene un único nodo raíz).
const spinBoxRef = ref<HTMLElement | null>(null)
// Si ya no queda nadie, el botón de girar está desactivado: el foco va a «Empezar de nuevo».
const exhaustedBoxRef = ref<HTMLElement | null>(null)

function spin() {
  if (spinning.value) return
  rollOverDay()
  if (eligible.value.length === 0) return
  const entries = [...eligible.value]
  // Se decide antes de animar: la rueda solo va hasta aquí.
  const index = randomIndex(entries.length)
  const picked = entries[index]!
  const token = ++spinToken

  frozen.value = entries
  winner.value = null
  spinning.value = true
  announcement.value = ''

  const from = rotation.value
  const target = rouletteTarget(from, index, entries.length, randomUnit())
  if (reducedMotion.value) {
    spinDuration.value = 0
    rotation.value = target
    fallbackTimer = setTimeout(() => finish(token, picked), REDUCED_REVEAL_MS)
    return
  }
  spinDuration.value = SPIN_MS
  rotation.value = target
  effects.play('roulette_spin', {
    settings: settings.value,
    ticks: rouletteTickTimes(from, target, entries.length, SPIN_MS / 1000),
  })
  // Plan B: `transitionend` no llega si la pestaña no pinta o el giro no cambia nada.
  fallbackTimer = setTimeout(() => finish(token, picked), SPIN_MS + 250)
  pendingFinish = () => finish(token, picked)
}

function onSettled() {
  pendingFinish?.()
}

async function finish(token: number, picked: RouletteEntry) {
  if (token !== spinToken || !spinning.value) return
  if (fallbackTimer) clearTimeout(fallbackTimer)
  fallbackTimer = null
  pendingFinish = null
  spinDuration.value = 0
  spinning.value = false
  winner.value = picked

  if (round.value.noRepeat && !round.value.drawn.includes(picked.id)) {
    round.value = { ...round.value, drawn: [...round.value.drawn, picked.id] }
    saveRound()
  }

  const left = eligible.value.length
  announcement.value = !round.value.noRepeat
    ? t('teacher.roulette.announce', { name: picked.label })
    : left === 0
      ? t('teacher.roulette.announce_none_left', { name: picked.label })
      : t('teacher.roulette.announce_left', { name: picked.label, count: left }, left)

  const box = wheelBoxRef.value?.getBoundingClientRect()
  effects.play('roulette_pick', {
    settings: settings.value,
    x: box ? box.left + box.width / 2 : undefined,
    y: box ? box.top + box.height / 3 : undefined,
  })

  await nextTick()
  const next =
    eligible.value.length === 0
      ? exhaustedBoxRef.value?.querySelector('button')
      : spinBoxRef.value?.querySelector('button')
  next?.focus()
  // Con la pantalla baja, que se vea a dónde ha ido el foco.
  next?.scrollIntoView({ block: 'nearest', behavior: reducedMotion.value ? 'auto' : 'smooth' })
}

/** Espacio o Intro giran, salvo que el foco esté en otro control (que ya hace lo suyo). */
function onStageKeydown(event: KeyboardEvent) {
  if (event.key !== ' ' && event.key !== 'Enter') return
  if (event.repeat || !ready.value || actionOpen.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('button, a, input, textarea, select, [role="switch"], [contenteditable]')) {
    return
  }
  event.preventDefault()
  spin()
}

// ── Sonido y pantalla completa ────────────────────────────────────────────

// El mismo silencio de toda la app (`effects:soundsMuted`), con botón a la vista aquí.
const muted = ref(effects.isSoundMuted())
function toggleSound() {
  muted.value = !muted.value
  // Al silenciar, también se callan los tics que quedaban del giro en curso.
  effects.setSoundMuted(muted.value)
}

const canFullscreen = ref(false)
const isFullscreen = ref(false)

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

// Pantalla completa del documento entero, no solo de la ruleta: el confeti se
// dibuja en un lienzo colgado de `body` y, fuera del elemento a pantalla
// completa, no se vería. La ruleta ya ocupa toda la ventana.
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* el navegador puede negarla: la página ya ocupa toda la ventana */
  }
}

// Sin layout (`layout: false`) nadie más pone el tema ni carga el perfil (idioma
// guardado en la cuenta): lo hace la página, igual que el layout del profesorado.
const { initTheme } = useTheme()
const profileStore = useProfileStore()

onMounted(() => {
  initTheme()
  if (!profileStore.profile) void profileStore.fetchProfile()
  canFullscreen.value =
    !!document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function'
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
  // Las teclas se escuchan en toda la página, también con el foco en el cuerpo.
  window.addEventListener('keydown', onWindowKeydown)
  void load()
})

/** Sin foco dentro de la página (recién llegada), las teclas llegan a `body`. */
function onWindowKeydown(event: KeyboardEvent) {
  if (event.target === document.body) onStageKeydown(event)
}

onBeforeUnmount(() => {
  spinToken++
  if (fallbackTimer) clearTimeout(fallbackTimer)
  effects.stopTicks()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('keydown', onWindowKeydown)
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
})

const emptyWheel = computed(() => {
  // Nadie de partida: no ha venido nadie del equipo (ni de ningún equipo de la agrupación), o falta todo el mundo.
  if (scope.value.length === 0)
    return {
      title: t('teacher.roulette.scope_empty_title'),
      description:
        mode.value === 'students'
          ? t('teacher.roulette.scope_empty_students')
          : mode.value === 'teams'
            ? t('teacher.roulette.scope_empty_teams')
            : t('teacher.roulette.scope_empty_team'),
    }
  return drawnHere.value > 0 && removedHere.value === 0
    ? {
        title: t('teacher.roulette.all_drawn_title'),
        description: t('teacher.roulette.all_drawn_description'),
      }
    : {
        title: t('teacher.roulette.none_left_title'),
        description: t('teacher.roulette.none_left_description'),
      }
})

// ── Aplicar algo a quien ha salido (#17) ──────────────────────────────────

const archived = computed(() => !!classData.value?.archived)
const canBehavior = computed(
  () => can('behavior.apply') && settings.value.behaviors && !archived.value
)
const canReward = computed(() => can('reward.grant') && !archived.value)
const canTeamAward = computed(() => can('team.award') && !archived.value)

/** El equipo que ha salido, si la rueda era de equipos. */
const winnerTeam = computed(() =>
  winner.value && mode.value === 'teams' ? teamOf(winner.value.id) : null
)
const canApplyWinner = computed(() =>
  mode.value === 'teams'
    ? !!winnerTeam.value && canTeamAward.value
    : canBehavior.value || canReward.value
)

// Si el equipo que ha salido desaparece al releer los equipos, su resultado ya no vale.
watch(winnerTeam, team => {
  if (!team && winner.value && mode.value === 'teams' && !spinning.value) clearResult()
})

// En la ventana, el mismo nombre que en la rueda: también se ve en el proyector.
const pickerStudents = computed<PickerStudent[]>(() =>
  students.value.map(s => ({ id: s.id, name: s.label, avatar: s.avatar ?? undefined }))
)
const actionOpen = ref(false)
const actionSelection = computed(() => (winner.value && !winnerTeam.value ? [winner.value.id] : []))

function openAction() {
  if (!spinning.value && winner.value && canApplyWinner.value) actionOpen.value = true
}
</script>
