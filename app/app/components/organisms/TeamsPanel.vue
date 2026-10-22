<template>
  <div class="space-y-4">
    <InfoNote v-if="archived">{{ t('teacher.teams.archived_class') }}</InfoNote>
    <InfoNote v-else-if="!canManage">{{ t('teacher.teams.read_only') }}</InfoNote>

    <div v-if="loading || (teams.loading.value && !teams.loaded.value)" class="space-y-3">
      <Skeleton height="h-12" />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" height="h-48" />
      </div>
    </div>

    <EmptyState
      v-else-if="!teams.sets.value.length"
      :icon="UserGroupIcon"
      :title="t('teacher.teams.empty_title')"
      :description="
        canEdit
          ? t('teacher.teams.empty_description')
          : t('teacher.teams.empty_description_readonly')
      "
    >
      <template v-if="canEdit && students.length" #action>
        <Button variant="primary" :icon-left="PlusIcon" @click="openNew">
          {{ t('teacher.teams.new_set') }}
        </Button>
      </template>
    </EmptyState>

    <template v-else>
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-0 flex-1 sm:max-w-sm">
          <p :id="`${uid}-set-label`" class="mb-1 text-sm font-medium text-navy-700">
            {{ t('teacher.teams.set_label') }}
          </p>
          <SelectDropdown
            :model-value="selected?.id ?? ''"
            :options="setOptions"
            :labelledby="`${uid}-set-label`"
            @update:model-value="selectedId = String($event)"
          />
        </div>
        <Button v-if="canEdit" variant="primary" :icon-left="PlusIcon" @click="openNew">
          {{ t('teacher.teams.new_set') }}
        </Button>
      </div>

      <!-- Como el resto de la app: tarjetas blancas con sombra sobre el fondo; el
           color de cada equipo va en su emblema. -->
      <section v-if="selected" class="space-y-4" :aria-labelledby="`${uid}-set-title`">
        <div class="space-y-3 rounded-2xl bg-white p-4 shadow-lg sm:p-6">
          <div class="flex flex-wrap items-center gap-2">
            <h2 :id="`${uid}-set-title`" class="mr-1 text-lg font-bold text-navy-700">
              {{ selected.title }}
            </h2>
            <Badge :variant="selected.kind === 'base' ? 'info' : 'default'" size="sm">
              {{ t(`teacher.teams.kind.${selected.kind}`) }}
            </Badge>
            <Badge v-if="selected.archived" variant="warning" size="sm">
              {{ t('teacher.teams.archived_badge') }}
            </Badge>
          </div>

          <div v-if="canEdit" class="flex flex-wrap gap-2">
            <Button
              v-if="!selected.archived"
              size="sm"
              variant="outline"
              :icon-left="PencilSquareIcon"
              @click="openEdit"
            >
              {{ t('teacher.teams.edit') }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              :icon-left="ArchiveBoxIcon"
              :loading="archiving"
              @click="toggleArchived"
            >
              {{ selected.archived ? t('teacher.teams.unarchive') : t('teacher.teams.archive') }}
            </Button>
            <Button size="sm" variant="ghost" :icon-left="TrashIcon" @click="deleteOpen = true">
              {{ t('teacher.teams.delete') }}
            </Button>
          </div>

          <!-- Mover: marcar a una o varias personas y elegir su equipo (ratón, dedo o
               teclado); con ratón, también arrastrando. -->
          <p v-if="draggable" class="text-sm text-navy-700/80">
            {{ t('teacher.teams.tap_hint') }}
          </p>
        </div>

        <!-- Sin equipo, primero y a lo ancho: de aquí sale la gente hacia los equipos -->
        <div
          v-if="!selected.archived && (unassigned.length || pickedInTeams || dragging)"
          class="rounded-2xl bg-white p-4 shadow-lg transition-shadow sm:p-6"
          :class="dropTarget === NO_TEAM ? 'ring-2 ring-navy-700/30' : ''"
          @dragover.prevent="onDragOver(NO_TEAM)"
          @dragleave="onDragLeave(NO_TEAM)"
          @drop.prevent="onDrop(null)"
        >
          <div class="flex flex-wrap items-center gap-2">
            <h3 :id="`${uid}-team-none`" class="mr-auto font-bold text-navy-700">
              {{ t('teacher.teams.no_team') }}
              <span class="text-sm font-normal text-navy-700/70"> ({{ unassigned.length }}) </span>
            </h3>
            <Button
              v-if="draggable && pickedInTeams"
              size="sm"
              variant="secondary"
              :loading="moving"
              :aria-label="t('teacher.teams.put_here_aria', { team: t('teacher.teams.no_team') })"
              @click="putPicked(null)"
            >
              {{ t('teacher.teams.put_here') }}
            </Button>
            <Button
              v-if="draggable && unassigned.length && selected.teams.length"
              size="sm"
              variant="outline"
              :icon-left="ArrowsRightLeftIcon"
              :loading="distributing"
              @click="distribute"
            >
              {{ t('teacher.teams.distribute') }}
            </Button>
          </div>
          <ul
            v-if="unassigned.length"
            class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
            :aria-labelledby="`${uid}-team-none`"
          >
            <li
              v-for="s in unassigned"
              :key="s.id"
              :draggable="draggable"
              :class="draggable ? 'cursor-grab' : ''"
              @dragstart="onDragStart(s.id, $event)"
              @dragend="onDragEnd"
            >
              <StudentCheckRow
                :id="`${uid}-pick-${s.id}`"
                :name="s.name"
                :avatar="s.avatar"
                :selectable="draggable"
                :checked="picked.includes(s.id)"
                @update:checked="togglePick(s.id)"
              />
            </li>
          </ul>
        </div>

        <ul class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li
            v-for="(team, i) in selected.teams"
            :key="team.id"
            class="min-w-0 rounded-2xl bg-white p-4 shadow-lg transition-shadow sm:p-5"
            :class="dropTarget === team.id ? 'ring-2 ring-navy-700/30' : ''"
            @dragover.prevent="onDragOver(team.id)"
            @dragleave="onDragLeave(team.id)"
            @drop.prevent="onDrop(team.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <h3 :id="`${uid}-team-${team.id}`" class="min-w-0">
                <TeamBadge
                  :title="team.title"
                  :color="team.color"
                  :emblem="team.emblem"
                  :index="i"
                />
              </h3>
              <span
                v-if="selected.kind === 'base'"
                class="flex-shrink-0 rounded-full bg-navy-700/10 px-2 py-0.5 text-sm font-semibold text-navy-700"
              >
                {{ t('teacher.teams.points', { count: team.points }, team.points) }}
              </span>
            </div>
            <p class="mt-1 text-xs text-navy-700/70">
              {{
                t(
                  'teacher.teams.members_count',
                  { count: team.studentIds.length },
                  team.studentIds.length
                )
              }}
            </p>
            <ul
              v-if="team.studentIds.length"
              class="mt-3 space-y-2"
              :aria-labelledby="`${uid}-team-${team.id}`"
            >
              <li
                v-for="id in team.studentIds"
                :key="id"
                :draggable="draggable"
                :class="draggable ? 'cursor-grab' : ''"
                @dragstart="onDragStart(id, $event)"
                @dragend="onDragEnd"
              >
                <StudentCheckRow
                  :id="`${uid}-pick-${id}`"
                  :name="nameOf(id)"
                  :avatar="studentById.get(id)?.avatar"
                  :selectable="draggable"
                  :checked="picked.includes(id)"
                  @update:checked="togglePick(id)"
                />
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-text-secondary">
              {{ t('teacher.teams.empty_team') }}
            </p>
            <div
              v-if="(draggable && canPutIn(team.id)) || canPrize"
              class="mt-3 flex flex-wrap gap-2"
            >
              <Button
                v-if="draggable && canPutIn(team.id)"
                size="sm"
                variant="primary"
                :loading="moving"
                :aria-label="t('teacher.teams.put_here_aria', { team: team.title })"
                @click="putPicked(team.id)"
              >
                {{ t('teacher.teams.put_here') }}
              </Button>
              <Button
                v-if="canPrize"
                size="sm"
                variant="secondary"
                :icon-left="TrophyIcon"
                @click="emit('award', team.id)"
              >
                {{ t('teacher.teams.award') }}
              </Button>
            </div>
          </li>
        </ul>

        <!-- Con alguien elegido: a dónde va, fijo abajo como la barra de la selección -->
        <div
          v-if="draggable && picked.length"
          class="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-navy-700 p-3 text-white shadow-lg"
        >
          <span class="px-1 text-sm font-semibold">
            {{ t('teacher.teams.picked_count', { count: picked.length }, picked.length) }}
          </span>
          <span class="text-sm text-white/80">{{ t('teacher.teams.put_in') }}</span>
          <template v-for="team in selected.teams" :key="team.id">
            <Button
              v-if="canPutIn(team.id)"
              size="sm"
              variant="secondary"
              :disabled="moving"
              :aria-label="t('teacher.teams.put_here_aria', { team: team.title })"
              @click="putPicked(team.id)"
            >
              {{ team.title }}
            </Button>
          </template>
          <Button
            v-if="pickedInTeams"
            size="sm"
            variant="secondary"
            :disabled="moving"
            :aria-label="t('teacher.teams.put_here_aria', { team: t('teacher.teams.no_team') })"
            @click="putPicked(null)"
          >
            {{ t('teacher.teams.no_team') }}
          </Button>
          <Button size="sm" variant="ghost" class="ml-auto !text-white" @click="picked = []">
            {{ t('common.actions.cancel') }}
          </Button>
        </div>
      </section>
    </template>

    <TeamSetModal
      v-model="formOpen"
      :class-id="classId"
      :students="pickerStudents"
      :set="editing"
      @saved="onSaved"
    />

    <ConfirmModal
      v-model="deleteOpen"
      :title="t('teacher.teams.delete_title')"
      :message="t('teacher.teams.delete_message', { title: selected?.title ?? '' })"
      :confirm-text="t('teacher.teams.delete')"
      :cancel-text="t('common.actions.cancel')"
      variant="danger"
      :loading="deleting"
      @confirm="removeSet"
    />

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup lang="ts">
import {
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import type { TeamSet } from '~/types/team.types'
import { shuffled } from '~/utils/shuffle'
import { randomIndex } from '~/utils/roulette'

/**
 * La sub-vista «Equipos» de Alumnos: las agrupaciones de la clase (de base y
 * temporales), cada una con sus equipos, sus integrantes y su marcador. Quien
 * edita crea agrupaciones (al azar o a mano), las renombra, las archiva y mueve
 * a la gente: tocando a una o varias personas y luego «Poner aquí» en su equipo
 * (sirve con ratón, dedo y teclado), arrastrando, o repartiendo al azar a quien
 * está sin equipo. Cada cambio se guarda en el acto y se anuncia al lector de
 * pantalla.
 *
 * Premiar a un equipo abre la ventana común de aplicar (la emite `award`).
 */
const NO_TEAM = '__none__'

interface PanelStudent {
  id: string
  name: string
  avatar?: string
}

const props = defineProps<{
  classId: string
  students: PanelStudent[]
  loading?: boolean
  canManage?: boolean
  canAward?: boolean
  archived?: boolean
}>()

const emit = defineEmits<{ award: [teamId: string] }>()

const { t } = useI18n()
const toast = useToast()
const teams = useClassTeams(() => props.classId)
const uid = `teams-${useId()}`.replace(/[^\w-]/g, '-')

onMounted(() => void teams.ensure())

const canEdit = computed(() => !!props.canManage && !props.archived)
const canPrize = computed(
  () => !!props.canAward && !props.archived && !!selected.value && !selected.value.archived
)
const draggable = computed(() => canEdit.value && !!selected.value && !selected.value.archived)

const selectedId = ref<string | null>(null)
const selected = computed<TeamSet | null>(() => {
  const list = teams.sets.value
  return list.find(s => s.id === selectedId.value) ?? list.find(s => !s.archived) ?? list[0] ?? null
})

const setOptions = computed(() =>
  teams.sets.value.map(s => ({
    value: s.id,
    label: [
      s.title,
      t(`teacher.teams.kind.${s.kind}`),
      ...(s.archived ? [t('teacher.teams.archived_badge')] : []),
    ].join(' · '),
  }))
)

const studentById = computed(() => new Map(props.students.map(s => [s.id, s])))
const nameOf = (id: string) => studentById.value.get(id)?.name ?? t('teacher.teams.unknown_student')
const pickerStudents = computed(() =>
  props.students.map(s => ({ id: s.id, name: s.name, avatar: s.avatar }))
)

const unassigned = computed(() => {
  const inTeam = new Set(selected.value?.teams.flatMap(team => team.studentIds) ?? [])
  return props.students.filter(s => !inTeam.has(s.id))
})

const announcement = ref('')

// --- Crear y editar ---
const formOpen = ref(false)
const editing = ref<TeamSet | null>(null)
function openNew() {
  editing.value = null
  formOpen.value = true
}
function openEdit() {
  editing.value = selected.value
  formOpen.value = true
}
function onSaved(set: TeamSet) {
  selectedId.value = set.id
  announcement.value = t('teacher.teams.saved_toast', { title: set.title })
}

// --- Mover integrantes: tocar y «Poner aquí», o arrastrar; se guarda igual ---
const moving = ref(false)

async function moveTo(studentIds: string[], teamId: string | null) {
  const set = selected.value
  if (!set || moving.value || !studentIds.length) return
  moving.value = true
  try {
    // Solo la pertenencia: una pestaña desactualizada no puede borrar equipos.
    await teams.moveMembers(set.id, { studentIds, teamId })
    const target = set.teams.find(team => team.id === teamId)?.title ?? t('teacher.teams.no_team')
    announcement.value = t(
      'teacher.teams.moved',
      { count: studentIds.length, name: target },
      studentIds.length
    )
    picked.value = picked.value.filter(id => !studentIds.includes(id))
  } catch {
    // Quizá el equipo ya no existe: se vuelve a leer cómo está la agrupación.
    toast.error(t('teacher.teams.error'))
    void teams.refresh()
  } finally {
    moving.value = false
  }
}

// Personas elegidas para mover: se tocan y luego «Poner aquí» en su equipo.
const picked = ref<string[]>([])
watch(
  () => selected.value?.id,
  () => (picked.value = [])
)
function togglePick(id: string) {
  picked.value = picked.value.includes(id)
    ? picked.value.filter(p => p !== id)
    : [...picked.value, id]
}
const teamOfStudent = computed(() => {
  const map = new Map<string, string>()
  for (const team of selected.value?.teams ?? [])
    for (const id of team.studentIds) map.set(id, team.id)
  return map
})
const pickedInTeams = computed(() => picked.value.some(id => teamOfStudent.value.has(id)))
/** Hay alguien elegido que aún no está en ese equipo. */
function canPutIn(teamId: string) {
  return picked.value.some(id => teamOfStudent.value.get(id) !== teamId)
}
function putPicked(teamId: string | null) {
  const ids = picked.value.filter(id => (teamOfStudent.value.get(id) ?? null) !== teamId)
  void moveTo(ids, teamId)
}

// Repartir al azar a quien está sin equipo, llenando primero los equipos más
// pequeños. En una agrupación temporal, quien falta hoy se queda fuera.
const { absentIds, ensure: ensureAttendance } = useClassAttendance(() => props.classId)
onMounted(() => void ensureAttendance().catch(() => {}))
const distributing = ref(false)
async function distribute() {
  const set = selected.value
  if (!set || distributing.value || !set.teams.length) return
  const skip = set.kind === 'temporal' ? absentIds.value : new Set<string>()
  const pool = shuffled(unassigned.value.filter(s => !skip.has(s.id)).map(s => s.id))
  const skipped = unassigned.value.length - pool.length
  const targets = set.teams.map(team => ({
    id: team.id,
    size: team.studentIds.length,
    add: [] as string[],
  }))
  for (const id of pool) {
    const min = Math.min(...targets.map(target => target.size))
    const smallest = targets.filter(target => target.size === min)
    const target = smallest[randomIndex(smallest.length)]!
    target.add.push(id)
    target.size += 1
  }
  distributing.value = true
  try {
    for (const target of targets) {
      if (target.add.length)
        await teams.moveMembers(set.id, { studentIds: target.add, teamId: target.id })
    }
    picked.value = []
    const message = [
      t('teacher.teams.distributed', { count: pool.length }, pool.length),
      ...(skipped ? [t('teacher.teams.distribute_skipped', { count: skipped }, skipped)] : []),
    ].join(' ')
    announcement.value = message
    toast.success(message)
  } catch {
    toast.error(t('teacher.teams.error'))
    void teams.refresh()
  } finally {
    distributing.value = false
  }
}

const dragging = ref<string | null>(null)
const dropTarget = ref<string | null>(null)

function onDragStart(studentId: string, event: DragEvent) {
  if (!draggable.value) return
  dragging.value = studentId
  event.dataTransfer?.setData('text/plain', studentId)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function onDragEnd() {
  dragging.value = null
  dropTarget.value = null
}
function onDragOver(target: string) {
  if (dragging.value) dropTarget.value = target
}
function onDragLeave(target: string) {
  if (dropTarget.value === target) dropTarget.value = null
}
function onDrop(teamId: string | null) {
  const studentId = dragging.value
  onDragEnd()
  if (!studentId) return
  const current =
    selected.value?.teams.find(team => team.studentIds.includes(studentId))?.id ?? null
  if (current === teamId) return
  void moveTo([studentId], teamId)
}

// --- Archivar y borrar ---
const archiving = ref(false)
async function toggleArchived() {
  const set = selected.value
  if (!set || archiving.value) return
  archiving.value = true
  try {
    const saved = await teams.updateSet(set.id, { archived: !set.archived })
    announcement.value = saved.archived
      ? t('teacher.teams.archived_announcement', { title: saved.title })
      : t('teacher.teams.unarchived_announcement', { title: saved.title })
  } catch {
    toast.error(t('teacher.teams.error'))
  } finally {
    archiving.value = false
  }
}

const deleteOpen = ref(false)
const deleting = ref(false)
async function removeSet() {
  const set = selected.value
  if (!set || deleting.value) return
  deleting.value = true
  try {
    await teams.deleteSet(set.id)
    selectedId.value = null
    deleteOpen.value = false
    announcement.value = t('teacher.teams.deleted_announcement', { title: set.title })
  } catch {
    toast.error(t('teacher.teams.error'))
  } finally {
    deleting.value = false
  }
}
</script>
