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
        <label class="block min-w-0 flex-1 text-sm text-navy-700 sm:max-w-sm">
          <span class="mb-1 block font-medium">{{ t('teacher.teams.set_label') }}</span>
          <Select
            :model-value="selected?.id ?? ''"
            :options="setOptions"
            @update:model-value="selectedId = String($event)"
          />
        </label>
        <Button v-if="canEdit" variant="primary" :icon-left="PlusIcon" @click="openNew">
          {{ t('teacher.teams.new_set') }}
        </Button>
      </div>

      <section
        v-if="selected"
        class="space-y-4 rounded-2xl bg-white p-4 shadow-lg sm:p-6"
        :aria-labelledby="`${uid}-set-title`"
      >
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
            v-if="!selected.archived"
            size="sm"
            variant="outline"
            :icon-left="ArrowsRightLeftIcon"
            @click="moveOpen = true"
          >
            {{ t('teacher.teams.move_members') }}
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

        <p v-if="canEdit && !selected.archived" class="text-sm text-navy-700/80">
          {{ t('teacher.teams.drag_hint') }}
        </p>

        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li
            v-for="(team, i) in selected.teams"
            :key="team.id"
            class="flex flex-col rounded-2xl border border-l-4 border-border-primary p-4 transition-colors"
            :class="[
              teamColorOf(team.color, i).border,
              dropTarget === team.id ? 'bg-navy-700/5 ring-2 ring-navy-700/30' : 'bg-surface',
            ]"
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
            <ul class="mt-3 flex-1 space-y-1" :aria-labelledby="`${uid}-team-${team.id}`">
              <li
                v-for="id in team.studentIds"
                :key="id"
                :draggable="draggable"
                class="flex items-center gap-2 rounded-xl px-2 py-1.5"
                :class="draggable ? 'cursor-grab hover:bg-navy-700/5' : ''"
                @dragstart="onDragStart(id, $event)"
                @dragend="onDragEnd"
              >
                <Avatar
                  :src="studentById.get(id)?.avatar"
                  :username="nameOf(id)"
                  size="xs"
                  class="flex-shrink-0"
                />
                <span class="min-w-0 truncate text-sm text-navy-700">{{ nameOf(id) }}</span>
              </li>
              <li v-if="!team.studentIds.length" class="px-2 text-sm text-text-secondary">
                {{ t('teacher.teams.empty_team') }}
              </li>
            </ul>
            <Button
              v-if="canPrize"
              size="sm"
              variant="secondary"
              :icon-left="TrophyIcon"
              class="mt-3 self-start"
              @click="emit('award', team.id)"
            >
              {{ t('teacher.teams.award') }}
            </Button>
          </li>

          <!-- Sin equipo: también se puede soltar aquí -->
          <li
            v-if="!selected.archived && (unassigned.length || dragging)"
            class="flex flex-col rounded-2xl border border-dashed border-border-primary p-4 transition-colors"
            :class="dropTarget === NO_TEAM ? 'bg-navy-700/5 ring-2 ring-navy-700/30' : 'bg-surface'"
            @dragover.prevent="onDragOver(NO_TEAM)"
            @dragleave="onDragLeave(NO_TEAM)"
            @drop.prevent="onDrop(null)"
          >
            <h3 :id="`${uid}-team-none`" class="font-semibold text-navy-700">
              {{ t('teacher.teams.no_team') }}
              <span class="text-xs font-normal text-navy-700/70"> ({{ unassigned.length }}) </span>
            </h3>
            <ul class="mt-3 space-y-1" :aria-labelledby="`${uid}-team-none`">
              <li
                v-for="s in unassigned"
                :key="s.id"
                :draggable="draggable"
                class="flex items-center gap-2 rounded-xl px-2 py-1.5"
                :class="draggable ? 'cursor-grab hover:bg-navy-700/5' : ''"
                @dragstart="onDragStart(s.id, $event)"
                @dragend="onDragEnd"
              >
                <Avatar :src="s.avatar" :username="s.name" size="xs" class="flex-shrink-0" />
                <span class="min-w-0 truncate text-sm text-navy-700">{{ s.name }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </section>
    </template>

    <TeamSetModal
      v-model="formOpen"
      :class-id="classId"
      :students="pickerStudents"
      :set="editing"
      @saved="onSaved"
    />

    <TeamMoveModal
      v-model="moveOpen"
      :set="selected"
      :students="pickerStudents"
      :saving="moving"
      @move="onMove"
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
import { teamColorOf } from '~/utils/team-style'

/**
 * La sub-vista «Equipos» de Alumnos: las agrupaciones de la clase (de base y
 * temporales), cada una con sus equipos, sus integrantes y su marcador. Quien
 * edita crea agrupaciones (al azar o a mano), las renombra, las archiva y mueve
 * a la gente: arrastrando o, con teclado, con «Mover integrantes…». Cada cambio
 * se guarda en el acto y se anuncia al lector de pantalla.
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

// --- Mover integrantes (arrastre y teclado guardan igual) ---
const moving = ref(false)
const moveOpen = ref(false)

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
    moveOpen.value = false
  } catch {
    // Quizá el equipo ya no existe: se vuelve a leer cómo está la agrupación.
    toast.error(t('teacher.teams.error'))
    void teams.refresh()
  } finally {
    moving.value = false
  }
}

function onMove(payload: { studentIds: string[]; teamId: string | null }) {
  void moveTo(payload.studentIds, payload.teamId)
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
