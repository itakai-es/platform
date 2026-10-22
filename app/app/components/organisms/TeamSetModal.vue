<template>
  <Modal
    :model-value="modelValue"
    :title="isEdit ? t('teacher.teams.form.edit_title') : t('teacher.teams.form.new_title')"
    size="lg"
    sticky-chrome
    fit-content
    @update:model-value="close"
  >
    <form :id="formId" class="space-y-6" novalidate @submit.prevent="submit">
      <FormField
        :id="`${uid}-title`"
        v-model="form.title"
        :label="t('teacher.teams.form.title')"
        :placeholder="t('teacher.teams.form.title_placeholder')"
        :error-message="titleError"
        required
      />

      <div>
        <p :id="`${uid}-kind`" class="mb-2 text-sm font-medium text-navy-700">
          {{ t('teacher.teams.form.kind') }}
        </p>
        <OptionPillGroup
          v-model="form.kind"
          :options="kindOptions"
          :aria-label="t('teacher.teams.form.kind')"
          class="max-w-md"
        />
        <p class="mt-1 text-sm text-text-muted">
          {{ t(`teacher.teams.form.kind_hint.${form.kind}`) }}
        </p>
      </div>

      <!-- Agrupación nueva: al azar (previsualizar → otra vez → guardar) o a mano -->
      <template v-if="!isEdit">
        <div>
          <p class="mb-2 text-sm font-medium text-navy-700">{{ t('teacher.teams.form.method') }}</p>
          <OptionPillGroup
            v-model="form.method"
            :options="methodOptions"
            :aria-label="t('teacher.teams.form.method')"
            class="max-w-md"
          />
        </div>

        <fieldset class="min-w-0">
          <legend class="mb-2 text-sm font-medium text-navy-700">
            {{ t('teacher.teams.form.size') }}
          </legend>
          <div class="flex flex-wrap items-center gap-3">
            <OptionPillGroup
              v-model="form.sizeMode"
              :options="sizeOptions"
              :aria-label="t('teacher.teams.form.size')"
              class="w-full sm:w-auto sm:max-w-md sm:flex-1"
            />
            <label class="flex items-center gap-2 text-sm text-navy-700">
              <span class="sr-only">{{ t(`teacher.teams.form.size_${form.sizeMode}`) }}</span>
              <Input
                v-model="form.size"
                type="number"
                min="1"
                :max="String(form.sizeMode === 'teams' ? MAX_TEAMS : 200)"
                inputmode="numeric"
                class="!w-24 text-center font-semibold"
              />
            </label>
          </div>
          <p class="mt-1 text-sm text-text-muted">
            {{ t('teacher.teams.form.size_result', { count: plannedTeams }, plannedTeams) }}
          </p>
        </fieldset>

        <template v-if="form.method === 'random'">
          <Checkbox
            :id="`${uid}-balance`"
            v-model="form.balance"
            :label="t('teacher.teams.form.balance')"
          />
          <InfoNote>
            {{
              taken
                ? t('teacher.teams.form.absent_note', { count: absentCount }, absentCount)
                : t('teacher.teams.form.no_list_note')
            }}
          </InfoNote>

          <!-- Propuesta: no se guarda hasta pulsar «Guardar equipos» -->
          <section v-if="preview" class="space-y-3" :aria-labelledby="`${uid}-preview`">
            <h3 :id="`${uid}-preview`" class="text-sm font-semibold text-navy-700">
              {{ t('teacher.teams.form.preview_title') }}
            </h3>
            <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <li
                v-for="(team, i) in previewDrafts"
                :key="i"
                class="rounded-xl border border-l-4 border-border-primary p-3"
                :class="teamColorOf(team.color, i).border"
              >
                <TeamBadge :title="team.title" :color="team.color" :emblem="team.emblem" size="sm">
                  <span class="text-xs text-navy-700/70">
                    {{
                      t(
                        'teacher.teams.members_count',
                        { count: team.studentIds.length },
                        team.studentIds.length
                      )
                    }}
                  </span>
                </TeamBadge>
                <p class="mt-2 text-sm text-navy-700">
                  {{ team.studentIds.map(nameOf).join(', ') || t('teacher.teams.empty_team') }}
                </p>
              </li>
            </ul>
            <p v-if="excludedNames.length" class="text-sm text-navy-700/80">
              {{ t('teacher.teams.form.excluded', { names: excludedNames.join(', ') }) }}
            </p>
          </section>
          <p class="sr-only" aria-live="polite">{{ previewAnnouncement }}</p>
        </template>
      </template>

      <!-- Editar: nombre, color y emblema de cada equipo; añadir o quitar equipos -->
      <fieldset v-else class="min-w-0 space-y-3">
        <legend class="mb-2 text-sm font-medium text-navy-700">
          {{ t('teacher.teams.form.teams_legend') }}
        </legend>
        <div
          v-for="(team, i) in drafts"
          :key="team.key"
          class="space-y-3 rounded-xl border border-l-4 border-border-primary p-3"
          :class="teamColorOf(team.color, i).border"
        >
          <div class="flex items-start gap-2">
            <FormField
              :id="`${uid}-team-${team.key}`"
              v-model="team.title"
              :label="t('teacher.teams.form.team_name', { n: i + 1 })"
              class="min-w-0 flex-1"
              required
            />
            <IconButton
              :icon="TrashIcon"
              :label="t('teacher.teams.form.remove_team', { name: team.title || i + 1 })"
              danger
              :disabled="drafts.length <= 1"
              class="mt-7"
              @click="removeDraft(i)"
            />
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p :id="`${uid}-color-${i}`" class="mb-1 text-sm font-medium text-navy-700">
                {{ t('teacher.teams.form.color') }}
              </p>
              <SelectDropdown
                :model-value="team.color ?? ''"
                :options="colorOptions"
                :labelledby="`${uid}-color-${i}`"
                @update:model-value="team.color = ($event as TeamColor) || null"
              />
            </div>
            <div>
              <p :id="`${uid}-emblem-${i}`" class="mb-1 text-sm font-medium text-navy-700">
                {{ t('teacher.teams.form.emblem') }}
              </p>
              <SelectDropdown
                :model-value="team.emblem ?? ''"
                :options="emblemOptions"
                :labelledby="`${uid}-emblem-${i}`"
                @update:model-value="team.emblem = ($event as TeamEmblem) || null"
              />
            </div>
          </div>
          <p class="text-xs text-navy-700/70">
            {{
              t(
                'teacher.teams.members_count',
                { count: team.studentIds.length },
                team.studentIds.length
              )
            }}
            <template v-if="team.points">
              · {{ t('teacher.teams.points', { count: team.points }, team.points) }}</template
            >
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          :icon-left="PlusIcon"
          :disabled="drafts.length >= MAX_TEAMS"
          @click="addDraft"
        >
          {{ t('teacher.teams.form.add_team') }}
        </Button>
        <p v-if="removedWithPoints" class="text-sm text-navy-700/80">
          {{ t('teacher.teams.form.removed_points_note') }}
        </p>
      </fieldset>
    </form>

    <template #footer>
      <Button variant="outline" :disabled="busy" @click="close">
        {{ t('common.actions.cancel') }}
      </Button>
      <template v-if="!isEdit && form.method === 'random'">
        <Button
          v-if="preview"
          variant="outline"
          :icon-left="ArrowPathIcon"
          :loading="shuffling"
          :disabled="busy"
          @click="runShuffle"
        >
          {{ t('teacher.teams.form.again') }}
        </Button>
        <Button
          v-if="!preview"
          variant="primary"
          :icon-left="SparklesIcon"
          :loading="shuffling"
          :disabled="busy || !students.length"
          @click="runShuffle"
        >
          {{ t('teacher.teams.form.shuffle') }}
        </Button>
        <Button
          v-else
          type="submit"
          :form="formId"
          variant="primary"
          :loading="saving"
          :disabled="busy"
        >
          {{ t('teacher.teams.form.save_teams') }}
        </Button>
      </template>
      <Button
        v-else
        type="submit"
        :form="formId"
        variant="primary"
        :loading="saving"
        :disabled="busy"
      >
        {{ isEdit ? t('teacher.teams.form.save') : t('teacher.teams.form.create') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ArrowPathIcon, PlusIcon, SparklesIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { PickerStudent } from '~/components/molecules/StudentPicker.vue'
import type {
  ShuffleResult,
  TeamColor,
  TeamDraft,
  TeamEmblem,
  TeamSet,
  TeamSetKind,
} from '~/types/team.types'
import { toDateKey } from '~/utils/schedule-occurrences'
import { isStale } from '~/composables/useClassTeams'
import { TEAM_COLOR_KEYS, TEAM_EMBLEM_KEYS, defaultTeamLook, teamColorOf } from '~/utils/team-style'

/**
 * Crear una agrupación de equipos (al azar o a mano) o editar una: nombre, tipo
 * (de base o temporal) y, al editar, el nombre, el color y el emblema de cada
 * equipo. Al azar, la propuesta la hace la API sin guardar nada: se previsualiza,
 * se pide otra si no convence y solo «Guardar equipos» la crea. Quien falta en
 * la lista de hoy queda fuera; sin lista, entra todo el alumnado.
 *
 * Mover a las personas entre equipos no se hace aquí, sino en la pestaña (con
 * arrastre o con «Mover integrantes…»).
 */
const MAX_TEAMS = 30

const props = defineProps<{
  modelValue: boolean
  classId: string
  students: PickerStudent[]
  /** Agrupación que se edita; sin ella, se crea una. */
  set?: TeamSet | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  saved: [set: TeamSet]
}>()

const { t } = useI18n()
const toast = useToast()
const teams = useClassTeams(() => props.classId)
const { taken, absentIds, ensure: ensureAttendance } = useClassAttendance(() => props.classId)
const uid = `team-set-${useId()}`.replace(/[^\w-]/g, '-')
const formId = `${uid}-form`

const isEdit = computed(() => !!props.set)

type Method = 'random' | 'manual'
type SizeMode = 'teams' | 'perTeam'

const form = reactive({
  title: '',
  kind: 'base' as TeamSetKind,
  method: 'random' as Method,
  sizeMode: 'teams' as SizeMode,
  size: 4 as number | string,
  balance: false,
})
interface Draft extends TeamDraft {
  key: string
  points: number
}
const drafts = ref<Draft[]>([])
const preview = ref<ShuffleResult | null>(null)
const previewAnnouncement = ref('')
const shuffling = ref(false)
const saving = ref(false)
const submitted = ref(false)
const busy = computed(() => shuffling.value || saving.value)
/** Se ha quitado algún equipo con puntos: al guardar se borran con ellos. */
const removedWithPoints = ref(false)
let draftSeq = 0

watch(
  () => props.modelValue,
  open => {
    if (!open) return
    submitted.value = false
    preview.value = null
    previewAnnouncement.value = ''
    form.title = props.set?.title ?? ''
    form.kind = props.set?.kind ?? 'base'
    form.method = 'random'
    form.sizeMode = 'teams'
    form.size = 4
    form.balance = false
    removedWithPoints.value = false
    drafts.value = (props.set?.teams ?? []).map(team => ({
      key: `d${draftSeq++}`,
      id: team.id,
      title: team.title,
      color: team.color,
      emblem: team.emblem,
      studentIds: [...team.studentIds],
      points: team.points,
    }))
    if (!props.set) void ensureAttendance()
  },
  { immediate: true }
)

// Una propuesta deja de valer en cuanto cambia cómo se reparte.
watch(
  () => [form.method, form.sizeMode, form.size, form.balance],
  () => {
    preview.value = null
  }
)

const kindOptions = computed(() => [
  { value: 'base' as const, label: t('teacher.teams.kind.base') },
  { value: 'temporal' as const, label: t('teacher.teams.kind.temporal') },
])
const methodOptions = computed(() => [
  { value: 'random' as const, label: t('teacher.teams.form.method_random') },
  { value: 'manual' as const, label: t('teacher.teams.form.method_manual') },
])
const sizeOptions = computed(() => [
  { value: 'teams' as const, label: t('teacher.teams.form.size_teams') },
  { value: 'perTeam' as const, label: t('teacher.teams.form.size_perTeam') },
])
const colorOptions = computed(() => [
  { value: '', label: t('teacher.teams.form.automatic') },
  ...TEAM_COLOR_KEYS.map(key => ({ value: key, label: t(`teacher.teams.colors.${key}`) })),
])
const emblemOptions = computed(() => [
  { value: '', label: t('teacher.teams.form.automatic') },
  ...TEAM_EMBLEM_KEYS.map(key => ({ value: key, label: t(`teacher.teams.emblems.${key}`) })),
])

const sizeValue = computed(() => Math.max(1, Math.round(Number(form.size) || 1)))
/** Quien entra hoy en el reparto (sin quien falta en la lista de hoy). */
const presentCount = computed(() => props.students.filter(s => !absentIds.value.has(s.id)).length)
const absentCount = computed(() => props.students.length - presentCount.value)
const plannedTeams = computed(() => {
  const pool = form.method === 'random' ? presentCount.value : props.students.length
  const n = form.sizeMode === 'teams' ? sizeValue.value : Math.ceil(pool / sizeValue.value)
  return Math.min(MAX_TEAMS, Math.max(1, n))
})

const titleText = computed(() => form.title.trim())
const titleError = computed(() =>
  submitted.value && !titleText.value
    ? t('teacher.teams.form.title_required')
    : titleText.value.length > 60
      ? t('teacher.teams.form.title_too_long')
      : undefined
)

const nameById = computed(() => new Map(props.students.map(s => [s.id, s.name])))
const nameOf = (id: string) => nameById.value.get(id) ?? t('teacher.teams.unknown_student')

function defaultTitle(i: number) {
  return t('teacher.teams.default_team', { n: i + 1 })
}

const previewDrafts = computed<TeamDraft[]>(() =>
  (preview.value?.teams ?? []).map((studentIds, i) => ({
    title: defaultTitle(i),
    ...defaultTeamLook(i),
    studentIds,
  }))
)
const excludedNames = computed(() => (preview.value?.excludedStudentIds ?? []).map(nameOf))

async function runShuffle() {
  if (busy.value) return
  shuffling.value = true
  try {
    preview.value = await teams.shuffle({
      ...(form.sizeMode === 'teams' ? { teams: sizeValue.value } : { perTeam: sizeValue.value }),
      balanceByLevel: form.balance,
      date: toDateKey(new Date()),
    })
    previewAnnouncement.value = t(
      'teacher.teams.form.preview_announcement',
      { count: preview.value.teams.length },
      preview.value.teams.length
    )
  } catch {
    toast.error(t('teacher.teams.error'))
  } finally {
    shuffling.value = false
  }
}

function addDraft() {
  const i = drafts.value.length
  drafts.value.push({
    key: `d${draftSeq++}`,
    title: defaultTitle(i),
    ...defaultTeamLook(i),
    studentIds: [],
    points: 0,
  })
}

function removeDraft(i: number) {
  const [removed] = drafts.value.splice(i, 1)
  if (removed?.points) removedWithPoints.value = true
}

function close() {
  if (busy.value) return
  emit('update:modelValue', false)
}

const stripDraft = ({ id, title, color, emblem, studentIds }: Draft | TeamDraft): TeamDraft => ({
  ...(id ? { id } : {}),
  title: title.trim(),
  color,
  emblem,
  studentIds,
})

async function submit() {
  submitted.value = true
  if (busy.value || titleError.value) return
  if (!isEdit.value && form.method === 'random' && !preview.value) return
  if (isEdit.value && drafts.value.some(d => !d.title.trim())) return

  saving.value = true
  try {
    let saved: TeamSet
    if (props.set) {
      // Una sola petición: o se guarda todo (nombre, tipo y equipos) o nada.
      saved = await teams.replaceTeams(props.set.id, {
        title: titleText.value,
        kind: form.kind,
        teams: drafts.value.map(stripDraft),
        updatedAt: props.set.updatedAt,
      })
    } else {
      const list =
        form.method === 'random'
          ? previewDrafts.value
          : Array.from({ length: plannedTeams.value }, (_, i) => ({
              title: defaultTitle(i),
              ...defaultTeamLook(i),
              studentIds: [],
            }))
      saved = await teams.createSet({
        title: titleText.value,
        kind: form.kind,
        teams: list.map(stripDraft),
      })
    }
    toast.success(t('teacher.teams.saved_toast', { title: saved.title }))
    emit('saved', saved)
    emit('update:modelValue', false)
  } catch (error) {
    if (isStale(error)) {
      // Otra persona (u otra pestaña) la ha cambiado: se enseña cómo está ahora.
      toast.error(t('teacher.teams.stale'))
      saving.value = false
      emit('update:modelValue', false)
      void teams.refresh()
      return
    }
    toast.error(t('teacher.teams.error'))
  } finally {
    saving.value = false
  }
}
</script>
