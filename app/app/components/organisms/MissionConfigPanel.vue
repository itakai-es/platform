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
type MissionRarity = 'comun' | 'rara' | 'epica' | 'legendaria'

interface MissionSettings {
  title: string
  deadline: string
  backgroundImage: string
  rarity: MissionRarity
  blocked: boolean
  /** Agrupación de equipos con la que se hace; '' = individual. */
  teamSetId: string
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
})

const form = ref<MissionSettings>(buildForm())
const snapshot = ref<MissionSettings>(buildForm())
const saving = ref(false)

const dirty = computed(() => {
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

// Sincroniza cuando cambian los datos externos y el formulario está limpio.
watch(
  () => [
    props.mission?.title,
    props.mission?.deadline,
    props.mission?.backgroundImage,
    props.mission?.rarity,
    props.mission?.blocked,
    props.mission?.teamSet?.id,
  ],
  () => {
    if (!dirty.value) {
      form.value = buildForm()
      snapshot.value = buildForm()
    }
  }
)

function reset() {
  form.value = { ...snapshot.value }
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
    }
    snapshot.value = { ...saved }
    form.value = { ...saved }
    emit('update', {
      title: saved.title,
      deadline: payload.deadline,
      backgroundImage: saved.backgroundImage,
      rarity: saved.rarity,
      blocked: saved.blocked,
    })
    toast.success(t('teacher.missions.detail.settings.toast_saved'))
  } catch (err) {
    // El backend bloquea el cambio de rareza si algún alumno ya completó la misión;
    // en ese caso mostramos su mensaje concreto en vez del genérico.
    const message = (err as { data?: { message?: string } })?.data?.message
    toast.error(message || t('teacher.missions.detail.settings.toast_error'))
  } finally {
    saving.value = false
  }
}
</script>
