<template>
  <form class="space-y-6" @submit.prevent="save">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 items-start">
      <!-- Datos básicos: título + fecha límite -->
      <div class="space-y-4">
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
          class="sm:max-w-[220px]"
          :label="t('teacher.missions.detail.settings.deadline_label')"
          :hint="t('teacher.missions.detail.settings.deadline_hint')"
        />

        <!-- Dificultad / rareza: afecta al XP de bonificación de la misión -->
        <div>
          <label class="text-sm font-medium text-text-primary mb-2 block">
            {{ t('teacher.missions.detail.settings.rarity_label') }}
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="r in rarities"
              :key="r.value"
              type="button"
              :disabled="rarityLocked"
              class="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
              :class="
                form.rarity === r.value
                  ? 'bg-navy-700 text-white'
                  : [
                      'bg-surface text-navy-700 border border-border-primary',
                      rarityLocked ? '' : 'hover:border-navy-700',
                    ]
              "
              @click="form.rarity = r.value"
            >
              {{ r.label }}
            </button>
          </div>
          <p v-if="rarityLocked" class="mt-1 text-sm text-text-muted">
            {{ t('teacher.missions.detail.settings.rarity_locked_hint') }}
          </p>
        </div>

        <!-- Estado: activa (visible) o bloqueada (oculta para los alumnos) -->
        <div>
          <label class="text-sm font-medium text-text-primary mb-2 block">
            {{ t('teacher.missions.detail.settings.status_label') }}
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              :class="
                !form.blocked
                  ? 'bg-navy-700 text-white'
                  : 'bg-surface text-navy-700 border border-border-primary hover:border-navy-700'
              "
              @click="form.blocked = false"
            >
              {{ t('teacher.missions.detail.settings.status_active') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              :class="
                form.blocked
                  ? 'bg-navy-700 text-white'
                  : 'bg-surface text-navy-700 border border-border-primary hover:border-navy-700'
              "
              @click="form.blocked = true"
            >
              {{ t('teacher.missions.detail.settings.status_blocked') }}
            </button>
          </div>
          <p class="mt-1 text-sm text-text-muted">
            {{ t('teacher.missions.detail.settings.status_hint') }}
          </p>
        </div>
      </div>

      <!-- Imagen de la misión -->
      <div>
        <label class="text-sm font-medium text-text-primary mb-2 block">
          {{ t('teacher.missions.detail.settings.background_label') }}
        </label>
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <!-- Preview -->
          <div
            class="relative w-full sm:w-40 h-28 rounded-xl overflow-hidden bg-navy-700/5 flex-shrink-0"
          >
            <img
              v-if="form.backgroundImage"
              :src="getImageUrl(form.backgroundImage)"
              alt=""
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-text-secondary text-xs"
            >
              <PhotoIcon class="w-8 h-8 opacity-40" />
            </div>
            <div
              v-if="generatingImage"
              class="absolute inset-0 bg-navy-700/60 flex items-center justify-center"
            >
              <Spinner size="sm" class="text-white" />
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex-1 space-y-2">
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                :icon-left="SparklesIcon"
                :loading="generatingImage"
                :disabled="generatingImage"
                @click="regenerateImage"
              >
                {{
                  form.backgroundImage
                    ? t('teacher.missions.detail.settings.background_regenerate')
                    : t('teacher.missions.detail.settings.background_generate')
                }}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                :icon-left="ArrowUpTrayIcon"
                :disabled="generatingImage"
                @click="coverFileRef?.click()"
              >
                {{ t('teacher.missions.detail.settings.background_upload') }}
              </Button>
              <Button
                v-if="form.backgroundImage"
                type="button"
                variant="ghost"
                size="sm"
                :icon-left="TrashIcon"
                :disabled="generatingImage"
                @click="clearImage"
              >
                {{ t('teacher.missions.detail.settings.background_clear') }}
              </Button>
            </div>
            <input
              ref="coverFileRef"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden"
              @change="handleCoverUpload"
            />
          </div>
        </div>
      </div>
    </div>

    <hr class="border-border-primary" />

    <div class="flex justify-end gap-2">
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
import { PhotoIcon, TrashIcon, ArrowUpTrayIcon, SparklesIcon } from '@heroicons/vue/24/outline'

type MissionRarity = 'comun' | 'rara' | 'epica' | 'legendaria'

interface MissionSettings {
  title: string
  deadline: string
  backgroundImage: string
  rarity: MissionRarity
  blocked: boolean
}

const props = defineProps<{
  missionId: string
  mission: {
    title?: string
    description?: string | null
    deadline?: string | Date | null
    backgroundImage?: string | null
    rarity?: string | null
    blocked?: boolean
    rarityLocked?: boolean
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

const rarities = computed<{ value: MissionRarity; label: string }[]>(() => [
  { value: 'comun', label: t('teacher.missions.detail.settings.rarity.comun') },
  { value: 'rara', label: t('teacher.missions.detail.settings.rarity.rara') },
  { value: 'epica', label: t('teacher.missions.detail.settings.rarity.epica') },
  { value: 'legendaria', label: t('teacher.missions.detail.settings.rarity.legendaria') },
])
const toast = useToast()
const config = useRuntimeConfig()
const { getImageUrl } = useImageUrl()

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
    a.blocked !== b.blocked
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
const coverFileRef = ref<HTMLInputElement>()

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
