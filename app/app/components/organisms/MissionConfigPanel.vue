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

    <!-- Camino del mapa: lo que hay que completar antes para abrirla. Solo con
         el mapa encendido en la clase; si no, una nota que lo explica. -->
    <SettingsSection
      :title="t('teacher.missions.detail.settings.path_title')"
      :hint="mapOn ? t('teacher.missions.detail.settings.path_hint') : undefined"
    >
      <InfoNote v-if="!mapOn">{{ t('teacher.missions.detail.settings.path_map_off') }}</InfoNote>
      <fieldset v-else :disabled="!pathReady">
        <legend class="mb-2 text-sm font-medium text-text-primary">
          {{ t('teacher.missions.detail.settings.path_legend') }}
        </legend>
        <p v-if="pathReady && pathChoices.length === 0" class="text-sm text-text-muted">
          {{ t('teacher.missions.detail.settings.path_empty') }}
        </p>
        <ul v-else class="space-y-2">
          <li v-for="choice in pathChoices" :key="choice.id">
            <Checkbox
              :id="`${uid}-path-${choice.id}`"
              :model-value="choice.checked"
              :label="choice.title"
              :disabled="choice.disabledReason !== null"
              :described-by="
                choice.disabledReason === 'cycle' ? `${uid}-path-${choice.id}-why` : undefined
              "
              @update:model-value="togglePrerequisite(choice.id, $event)"
            />
            <p
              v-if="choice.disabledReason === 'cycle'"
              :id="`${uid}-path-${choice.id}-why`"
              class="ml-6 text-xs text-text-muted"
            >
              {{ t('teacher.missions.detail.settings.path_cycle_reason') }}
            </p>
          </li>
        </ul>
        <p v-if="pathAtLimit" class="mt-2 text-sm text-text-muted" aria-live="polite">
          {{
            t('teacher.missions.detail.settings.path_limit', { max: MISSION_PREREQUISITE_LIMIT })
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
} from '~/utils/mission-path'

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
    prerequisites?: { id: string; title: string }[]
    classSettings?: { missionMap?: boolean }
  } | null
}>()

// La rareza queda bloqueada si algún alumno ya completó la misión (cambiarla
// alteraría su XP); el backend también lo rechaza.
const rarityLocked = computed(() => props.mission?.rarityLocked ?? false)

const emit = defineEmits<{
  update: [
    data: {
      title: string
      deadline: string | null
      backgroundImage: string
      rarity: MissionRarity
      blocked: boolean
    },
  ]
  /** Lo que pide ahora para abrirse en el mapa, ya guardado. */
  pathUpdate: [prerequisites: { id: string; title: string }[]]
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
// para saber cuáles cerrarían un círculo. Solo con el mapa encendido.
const teacherStore = useTeacherStore()
const mapOn = computed(() => props.mission?.classSettings?.missionMap === true)
const classMissions = ref<PathMission[]>([])
const pathReady = ref(false)
async function loadClassMissions(force = false) {
  if (!props.classId) return
  try {
    const res = await teacherStore.ensureClassMissions(props.classId, force)
    classMissions.value = res.missions as PathMission[]
    pathReady.value = true
  } catch {
    toast.error(t('teacher.missions.detail.settings.path_load_error'))
  }
}
watch(
  mapOn,
  on => {
    if (on && !pathReady.value) void loadClassMissions()
  },
  { immediate: true }
)
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

  try {
    if (missionDirty.value) {
      const res = await $fetch<{ mission?: { backgroundImage?: string | null } }>(
        `${config.public.apiBase}/missions/${props.missionId}`,
        { method: 'PATCH', body: payload }
      )
      // El backend persiste las imágenes subidas (data URL) y devuelve su URL final.
      const storedImage = res.mission?.backgroundImage ?? payload.backgroundImage
      const saved: MissionSettings = {
        title: payload.title,
        deadline: form.value.deadline,
        backgroundImage: storedImage ?? '',
        rarity: payload.rarity,
        blocked: form.value.blocked,
        teamSetId: form.value.teamSetId,
        prerequisites: [...snapshot.value.prerequisites],
      }
      snapshot.value = { ...saved }
      form.value = { ...saved, prerequisites: [...form.value.prerequisites] }
      emit('update', {
        title: saved.title,
        deadline: payload.deadline,
        backgroundImage: saved.backgroundImage,
        rarity: saved.rarity,
        blocked: saved.blocked,
      })
    }

    // Lo que pide para abrirse: la API comprueba la clase, el tope y los ciclos,
    // y si iba delante de algo que pide, la recoloca detrás en el orden.
    let moved = 0
    if (pathDirty.value) {
      const res = await $fetch<{ prerequisites: { id: string; title: string }[]; moved: number }>(
        `${config.public.apiBase}/missions/${props.missionId}/prerequisites`,
        { method: 'PUT', body: { ids: form.value.prerequisites } }
      )
      moved = res.moved
      const ids = res.prerequisites.map(m => m.id)
      snapshot.value = { ...snapshot.value, prerequisites: ids }
      form.value = { ...form.value, prerequisites: [...ids] }
      emit('pathUpdate', res.prerequisites)
      // Las misiones de la clase (y su orden) han cambiado: el mapa y las casillas, al día.
      await loadClassMissions(true)
    }
    toast.success(
      moved > 0
        ? t('teacher.missions.detail.settings.path_moved')
        : t('teacher.missions.detail.settings.toast_saved')
    )
  } catch (err) {
    // El backend bloquea el cambio de rareza si algún alumno ya completó la
    // misión, y lo que pide para abrirse si cerraría un círculo (alguien lo ha
    // cambiado a la vez): se enseña su mensaje concreto en vez del genérico.
    const message = (err as { data?: { message?: string } })?.data?.message
    toast.error(message || t('teacher.missions.detail.settings.toast_error'))
    if (pathDirty.value) void loadClassMissions(true)
  } finally {
    saving.value = false
  }
}
</script>
