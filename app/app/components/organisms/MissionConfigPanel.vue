<template>
  <!-- Como los ajustes de la clase: secciones en tarjetas blancas y, debajo,
       guardar o descartar -->
  <form class="space-y-6" @submit.prevent="save">
    <SettingsSection :title="t('teacher.missions.detail.settings.basics_title')">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <FormField
          id="mission-cfg-title"
          v-model="form.title"
          :label="t('teacher.missions.detail.settings.title_label')"
          required
        />
        <FormField
          id="mission-cfg-deadline"
          v-model="form.deadline"
          type="date"
          :label="t('teacher.missions.detail.settings.deadline_label')"
          :hint="t('teacher.missions.detail.settings.deadline_hint')"
        />
      </div>
    </SettingsSection>

    <SettingsSection :title="t('teacher.missions.detail.settings.play_title')">
      <!-- Dificultad / rareza: afecta al XP de bonificación de la misión -->
      <div>
        <p :id="`${uid}-rarity`" class="mb-2 text-sm font-medium text-text-primary">
          {{ t('teacher.missions.detail.settings.rarity_label') }}
        </p>
        <OptionPillGroup
          v-model="form.rarity"
          :options="rarities"
          :aria-label="t('teacher.missions.detail.settings.rarity_label')"
          :disabled="rarityLocked"
          fluid
          min-item-width="6.5rem"
          class="max-w-xl"
        />
        <p v-if="rarityLocked" class="mt-1 text-sm text-text-muted">
          {{ t('teacher.missions.detail.settings.rarity_locked_hint') }}
        </p>
      </div>

      <!-- Estado: activa (visible) o bloqueada (con candado para el alumnado) -->
      <div>
        <p class="mb-2 text-sm font-medium text-text-primary">
          {{ t('teacher.missions.detail.settings.status_label') }}
        </p>
        <OptionPillGroup
          :model-value="form.blocked ? 'blocked' : 'active'"
          :options="statusOptions"
          :aria-label="t('teacher.missions.detail.settings.status_label')"
          class="max-w-xs"
          @update:model-value="form.blocked = $event === 'blocked'"
        />
        <p class="mt-1 text-sm text-text-muted">
          {{ t('teacher.missions.detail.settings.status_hint') }}
        </p>
      </div>

      <!-- Por equipos: solo informativo; cada estudiante entrega lo suyo -->
      <div>
        <p :id="`${uid}-team-set`" class="mb-2 text-sm font-medium text-text-primary">
          {{ t('teacher.missions.detail.settings.team_set_label') }}
        </p>
        <SelectDropdown
          :model-value="form.teamSetId"
          :options="teamSetOptions"
          :labelledby="`${uid}-team-set`"
          :describedby="`${uid}-team-set-hint`"
          class="sm:max-w-sm"
          @update:model-value="form.teamSetId = String($event)"
        />
        <p :id="`${uid}-team-set-hint`" class="mt-1 text-sm text-text-muted">
          {{ t('teacher.missions.detail.settings.team_set_hint') }}
        </p>
      </div>
    </SettingsSection>

    <!-- Camino del mapa: lo que hay que completar antes para abrirla. Se edita
         aunque el mapa esté apagado en la clase; entonces una nota dice que aún
         no cierra nada. -->
    <SettingsSection
      :title="t('teacher.missions.detail.settings.path_title')"
      :hint="t('teacher.missions.detail.settings.path_hint')"
    >
      <InfoNote v-if="!mapOn">{{ t('teacher.missions.detail.settings.path_map_off') }}</InfoNote>

      <!-- Cargando las misiones de la clase -->
      <div v-if="pathStatus === 'loading'" class="space-y-2" aria-hidden="true">
        <Skeleton width="w-48" height="h-4" />
        <Skeleton v-for="i in 3" :key="i" width="w-2/3" height="h-4" />
      </div>

      <!-- No han llegado: se dice y se puede volver a pedir -->
      <div v-else-if="pathStatus === 'error'" role="alert" class="space-y-3">
        <InfoNote>{{ t('teacher.missions.detail.settings.path_load_error') }}</InfoNote>
        <Button variant="outline" size="sm" @click="loadClassMissions(true)">
          {{ t('teacher.missions.detail.settings.path_retry') }}
        </Button>
      </div>

      <fieldset v-else>
        <legend class="mb-2 text-sm font-medium text-text-primary">
          {{ t('teacher.missions.detail.settings.path_legend') }}
        </legend>
        <p v-if="pathChoices.length === 0" class="text-sm text-text-muted">
          {{ t('teacher.missions.detail.settings.path_empty') }}
        </p>
        <ul v-else class="space-y-2">
          <!-- Junto a cada una, si está bloqueada o expirada: así no cierra
               nada (expirada) o nadie la puede hacer aún (bloqueada). -->
          <li
            v-for="choice in pathChoices"
            :key="choice.id"
            class="flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            <Checkbox
              :id="`${uid}-path-${choice.id}`"
              :model-value="choice.checked"
              :label="choice.title"
              :disabled="choice.disabledReason !== null"
              :described-by="choiceDescribedBy(choice)"
              @update:model-value="togglePrerequisite(choice.id, $event)"
            />
            <StatusBadge
              v-if="choiceState(choice.id)"
              :id="`${uid}-path-${choice.id}-state`"
              :variant="choiceState(choice.id)!"
            >
              {{ missionStatusLabel(choiceState(choice.id)!) }}
            </StatusBadge>
          </li>
        </ul>
        <!-- Por qué hay casillas atenuadas: una vez, bajo la lista -->
        <p v-if="hasCycleChoices" :id="cycleNoteId" class="mt-2 text-sm text-navy-700/80">
          {{ t('teacher.missions.detail.settings.path_cycle_note') }}
        </p>
        <!-- Siempre en la página: al llegar al tope solo cambia el texto, y así
             se anuncia. -->
        <p
          :id="limitNoteId"
          class="text-sm text-navy-700/80"
          :class="{ 'mt-2': pathAtLimit }"
          aria-live="polite"
        >
          {{
            pathAtLimit
              ? t('teacher.missions.detail.settings.path_limit', {
                  max: MISSION_PREREQUISITE_LIMIT,
                })
              : ''
          }}
        </p>
      </fieldset>
    </SettingsSection>

    <SettingsSection :title="t('teacher.missions.detail.settings.background_label')">
      <CoverImageField
        :image="form.backgroundImage"
        :generating="generatingImage"
        :generate-label="t('teacher.missions.detail.settings.background_generate')"
        :regenerate-label="t('teacher.missions.detail.settings.background_regenerate')"
        :upload-label="t('teacher.missions.detail.settings.background_upload')"
        :clear-label="t('teacher.missions.detail.settings.background_clear')"
        @generate="regenerateImage"
        @upload="handleCoverUpload"
        @clear="clearImage"
      />
    </SettingsSection>

    <div class="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" size="md" :disabled="!dirty || saving" @click="reset">
        {{ t('teacher.missions.detail.settings.discard') }}
      </Button>
      <Button
        type="submit"
        variant="primary"
        size="md"
        :disabled="!dirty || saving"
        :loading="saving"
      >
        {{ t('teacher.missions.detail.settings.save') }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  MISSION_PREREQUISITE_LIMIT,
  prerequisiteChoices,
  type PathMission,
  type PrerequisiteChoice,
} from '~/utils/mission-path'
import { teacherMissionStatus } from '~/utils/mission-teacher-status'
import type { MissionPrerequisite } from '~/types/mission.types'

type MissionRarity = 'comun' | 'rara' | 'epica' | 'legendaria'

interface MissionSettings {
  title: string
  deadline: string
  backgroundImage: string
  rarity: MissionRarity
  blocked: boolean
  /** Agrupación de equipos con la que se hace; '' = individual. */
  teamSetId: string
  /** Lo que hay que completar antes para abrirla (ids), en el orden de la clase. */
  prerequisites: string[]
}

const props = defineProps<{
  missionId: string
  /** La clase de la misión: de ella salen las agrupaciones de equipos. */
  classId?: string
  mission: {
    title?: string
    description?: string | null
    deadline?: string | Date | null
    backgroundImage?: string | null
    rarity?: string | null
    blocked?: boolean
    rarityLocked?: boolean
    teamSet?: { id: string; title: string; archived: boolean } | null
    /** Lo que pide para abrirse en el mapa. */
    prerequisites?: MissionPrerequisite[]
    classSettings?: { missionMap?: boolean }
  } | null
}>()

// La rareza queda bloqueada si algún alumno ya completó la misión (cambiarla
// alteraría su XP); el backend también lo rechaza.
const rarityLocked = computed(() => props.mission?.rarityLocked ?? false)

const emit = defineEmits<{
  /**
   * Se ha guardado algo (la misión, lo que pide para abrirse o las dos cosas):
   * una sola vez por guardado, para que la página la vuelva a pedir una vez.
   */
  saved: []
}>()

const { t, locale } = useI18n()
const uid = `mission-cfg-${useId()}`.replace(/[^\w-]/g, '-')

// Agrupaciones de la clase para «por equipos»; la que ya tiene sale aunque esté archivada.
const classTeams = useClassTeams(() => props.classId ?? '')
onMounted(() => {
  if (props.classId) void classTeams.ensure()
})
const teamSetOptions = computed(() => {
  const current = props.mission?.teamSet
  const sets = classTeams.activeSets.value.map(s => ({ value: s.id, label: s.title }))
  if (current && !sets.some(s => s.value === current.id)) {
    sets.push({ value: current.id, label: current.title })
  }
  return [{ value: '', label: t('teacher.missions.detail.settings.team_set_none') }, ...sets]
})

const rarities = computed<{ value: MissionRarity; label: string }[]>(() => [
  { value: 'comun', label: t('teacher.missions.detail.settings.rarity.comun') },
  { value: 'rara', label: t('teacher.missions.detail.settings.rarity.rara') },
  { value: 'epica', label: t('teacher.missions.detail.settings.rarity.epica') },
  { value: 'legendaria', label: t('teacher.missions.detail.settings.rarity.legendaria') },
])
const statusOptions = computed(() => [
  { value: 'active', label: t('teacher.missions.detail.settings.status_active') },
  { value: 'blocked', label: t('teacher.missions.detail.settings.status_blocked') },
])
const toast = useToast()
const config = useRuntimeConfig()

// La fecha límite llega como ISO (o Date); el <input type="date"> necesita yyyy-mm-dd.
function toInputDate(input: string | Date | null | undefined): string {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const RARITY_VALUES: MissionRarity[] = ['comun', 'rara', 'epica', 'legendaria']
function coerceRarity(value: string | null | undefined): MissionRarity {
  return RARITY_VALUES.includes(value as MissionRarity) ? (value as MissionRarity) : 'comun'
}

const buildForm = (): MissionSettings => ({
  title: props.mission?.title ?? '',
  deadline: toInputDate(props.mission?.deadline),
  backgroundImage: props.mission?.backgroundImage ?? '',
  rarity: coerceRarity(props.mission?.rarity),
  blocked: props.mission?.blocked ?? false,
  teamSetId: props.mission?.teamSet?.id ?? '',
  prerequisites: (props.mission?.prerequisites ?? []).map(m => m.id),
})

const form = ref<MissionSettings>(buildForm())
const snapshot = ref<MissionSettings>(buildForm())
const saving = ref(false)

/** Ha cambiado algo de la misión en sí (lo que se guarda con PATCH). */
const missionDirty = computed(() => {
  const a = form.value
  const b = snapshot.value
  return (
    a.title !== b.title ||
    a.deadline !== b.deadline ||
    a.backgroundImage !== b.backgroundImage ||
    a.rarity !== b.rarity ||
    a.blocked !== b.blocked ||
    a.teamSetId !== b.teamSetId
  )
})
/** Ha cambiado lo que pide para abrirse (se guarda aparte: lo comprueba la API). */
const pathDirty = computed(() => {
  const a = form.value.prerequisites
  const b = snapshot.value.prerequisites
  return a.length !== b.length || a.some(id => !b.includes(id))
})
const dirty = computed(() => missionDirty.value || pathDirty.value)

// --------- Camino del mapa ---------
// Las demás misiones de la clase, con lo que pide cada una, para las casillas y
// para saber cuáles cerrarían un círculo. Se piden aunque el mapa esté apagado:
// los requisitos se pueden preparar antes de encenderlo.
const teacherStore = useTeacherStore()
const mapOn = computed(() => props.mission?.classSettings?.missionMap === true)
const classMissions = ref<PathMission[]>([])
const pathStatus = ref<'loading' | 'ready' | 'error'>('loading')
async function loadClassMissions(force = false) {
  // Sin clase no hay más misiones que ofrecer.
  if (!props.classId) {
    pathStatus.value = 'ready'
    return
  }
  // Volver a pedirlas tras guardar no esconde las casillas; tras un fallo, sí
  // (vuelve el esqueleto mientras se reintenta).
  if (pathStatus.value !== 'ready') pathStatus.value = 'loading'
  try {
    const res = await teacherStore.ensureClassMissions(props.classId, force)
    classMissions.value = res.missions as PathMission[]
    pathStatus.value = 'ready'
  } catch {
    if (pathStatus.value !== 'ready') pathStatus.value = 'error'
    else toast.error(t('teacher.missions.detail.settings.path_load_error'))
  }
}
onMounted(() => {
  void loadClassMissions()
})
const pathChoices = computed(() =>
  prerequisiteChoices(
    // Esta misión, con lo marcado ahora: así lo que ya cuelga de ella no se ofrece.
    classMissions.value.map(m =>
      m.id === props.missionId ? { ...m, prerequisiteIds: form.value.prerequisites } : m
    ),
    props.missionId,
    form.value.prerequisites
  )
)
const pathAtLimit = computed(() => form.value.prerequisites.length >= MISSION_PREREQUISITE_LIMIT)
const hasCycleChoices = computed(() => pathChoices.value.some(c => c.disabledReason === 'cycle'))
const cycleNoteId = `${uid}-path-cycle`
const limitNoteId = `${uid}-path-limit`

/**
 * Lo que lee el lector de pantalla con cada casilla: su estado (bloqueada o
 * expirada) y, si está atenuada, por qué (la nota del círculo o la del tope).
 */
function choiceDescribedBy(choice: PrerequisiteChoice): string | undefined {
  const ids = [
    choiceState(choice.id) ? `${uid}-path-${choice.id}-state` : null,
    choice.disabledReason === 'cycle' ? cycleNoteId : null,
    choice.disabledReason === 'limit' ? limitNoteId : null,
  ].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

/**
 * Bloqueada o expirada, como en los listados del profesorado (el mismo nombre):
 * una expirada ya no cierra nada y una bloqueada nadie la puede hacer aún.
 */
const missionStatusLabel = useMissionStatusLabel()
const choiceStates = computed(() => {
  const states = new Map<string, 'bloqueada' | 'expirada'>()
  for (const m of classMissions.value) {
    const status = teacherMissionStatus({ status: m.status ?? '', deadline: m.deadline })
    if (status === 'bloqueada' || status === 'expirada') states.set(m.id, status)
  }
  return states
})
function choiceState(id: string) {
  return choiceStates.value.get(id) ?? null
}

/** Marca o desmarca una; se guardan en el orden de la clase. */
function togglePrerequisite(id: string, checked: boolean) {
  const selected = new Set(form.value.prerequisites)
  if (checked) selected.add(id)
  else selected.delete(id)
  form.value.prerequisites = classMissions.value.map(m => m.id).filter(m => selected.has(m))
}

// Sincroniza cuando cambian los datos externos y el formulario está limpio.
watch(
  () => [
    props.mission?.title,
    props.mission?.deadline,
    props.mission?.backgroundImage,
    props.mission?.rarity,
    props.mission?.blocked,
    props.mission?.teamSet?.id,
    (props.mission?.prerequisites ?? []).map(m => m.id).join(','),
  ],
  () => {
    if (!dirty.value) {
      form.value = buildForm()
      snapshot.value = buildForm()
    }
  }
)

function reset() {
  form.value = { ...snapshot.value, prerequisites: [...snapshot.value.prerequisites] }
}

// --------- Imagen de la misión ---------
const generatingImage = ref(false)

function handleCoverUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const validTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('teacher.missions.detail.settings.background_upload_type_error'))
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error(t('teacher.missions.detail.settings.background_upload_size_error'))
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = e => {
    form.value.backgroundImage = e.target?.result as string
  }
  reader.readAsDataURL(file)
  input.value = ''
}

async function regenerateImage() {
  if (generatingImage.value) return
  generatingImage.value = true
  try {
    const res = await $fetch<{ imageUrl: string }>(`${config.public.apiBase}/ai/mission-cover`, {
      method: 'POST',
      body: {
        title: form.value.title || props.mission?.title,
        narrative: props.mission?.description || undefined,
        locale: locale.value,
      },
    })
    form.value.backgroundImage = res.imageUrl
  } catch {
    toast.error(t('teacher.missions.detail.settings.background_error'))
  } finally {
    generatingImage.value = false
  }
}

function clearImage() {
  form.value.backgroundImage = ''
}

async function save() {
  if (!dirty.value || saving.value) return
  if (!form.value.title.trim()) {
    toast.error(t('teacher.missions.detail.settings.title_required'))
    return
  }

  saving.value = true
  const payload = {
    title: form.value.title.trim(),
    deadline: form.value.deadline ? form.value.deadline : null,
    backgroundImage: form.value.backgroundImage.trim(),
    rarity: form.value.rarity,
    status: form.value.blocked ? ('bloqueada' as const) : ('activa' as const),
    teamSetId: form.value.teamSetId || null,
  }
  const rarityChanged = form.value.rarity !== snapshot.value.rarity
  // Algo guardado (aunque luego falle lo otro): la página vuelve a pedir la
  // misión al acabar, una sola vez.
  let saved = false
  // Qué se estaba guardando si falla: la misión o lo que pide.
  let step: 'mission' | 'path' = 'mission'

  try {
    if (missionDirty.value) {
      const res = await $fetch<{ mission?: { backgroundImage?: string | null } }>(
        `${config.public.apiBase}/missions/${props.missionId}`,
        { method: 'PATCH', body: payload }
      )
      saved = true
      // El backend persiste las imágenes subidas (data URL) y devuelve su URL final.
      const storedImage = res.mission?.backgroundImage ?? payload.backgroundImage
      const next: MissionSettings = {
        title: payload.title,
        deadline: form.value.deadline,
        backgroundImage: storedImage ?? '',
        rarity: payload.rarity,
        blocked: form.value.blocked,
        teamSetId: form.value.teamSetId,
        prerequisites: [...snapshot.value.prerequisites],
      }
      snapshot.value = { ...next }
      form.value = { ...next, prerequisites: [...form.value.prerequisites] }
    }

    // Lo que pide para abrirse: la API comprueba la clase, el tope y los ciclos
    // y, con el mapa encendido, si iba delante de algo que pide, la recoloca
    // detrás en el orden.
    let moved = 0
    if (pathDirty.value) {
      step = 'path'
      const res = await $fetch<{ prerequisites: MissionPrerequisite[]; moved: number }>(
        `${config.public.apiBase}/missions/${props.missionId}/prerequisites`,
        { method: 'PUT', body: { ids: form.value.prerequisites } }
      )
      saved = true
      moved = res.moved
      const ids = res.prerequisites.map(m => m.id)
      snapshot.value = { ...snapshot.value, prerequisites: ids }
      form.value = { ...form.value, prerequisites: [...ids] }
      // Las misiones de la clase (y su orden) han cambiado: el mapa y las casillas, al día.
      await loadClassMissions(true)
    }
    toast.success(
      moved > 0
        ? t('teacher.missions.detail.settings.path_moved')
        : t('teacher.missions.detail.settings.toast_saved')
    )
  } catch (err) {
    toast.error(saveErrorMessage(err, step === 'mission' && rarityChanged))
    // Alguien ha cambiado el camino a la vez: las casillas, como están ahora.
    if (pathDirty.value) void loadClassMissions(true)
  } finally {
    saving.value = false
    if (saved) emit('saved')
  }
}

/**
 * Qué decir si no se ha podido guardar, por el código de la API (su mensaje va
 * en castellano y sin traducir): un círculo o el tope (alguien ha cambiado el
 * camino a la vez) o una misión que ya no es de la clase. Cambiar la rareza
 * cuando alguien ya la ha completado se rechaza sin código: es lo único que
 * responde 400 sin él ni errores de validación.
 */
function saveErrorMessage(err: unknown, savingRarity: boolean): string {
  const fetchError = err as { statusCode?: number; data?: { code?: string; errors?: unknown } }
  switch (fetchError?.data?.code) {
    case 'MISSION_PREREQUISITE_CYCLE':
      return t('teacher.missions.detail.settings.path_error_cycle')
    case 'MISSION_PREREQUISITE_LIMIT':
      return t('teacher.missions.detail.settings.path_limit', { max: MISSION_PREREQUISITE_LIMIT })
    case 'MISSION_PREREQUISITE_INVALID':
    case 'MISSION_PREREQUISITE_SELF':
      return t('teacher.missions.detail.settings.path_error_invalid')
  }
  if (
    savingRarity &&
    fetchError?.statusCode === 400 &&
    !fetchError.data?.code &&
    !fetchError.data?.errors
  ) {
    return t('teacher.missions.detail.settings.rarity_locked_hint')
  }
  return t('teacher.missions.detail.settings.toast_error')
}
</script>
