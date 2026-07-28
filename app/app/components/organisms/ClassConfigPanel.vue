<template>
  <div class="space-y-6">
    <!-- Sub-navegación (pills) -->
    <div class="flex gap-2 overflow-x-auto scrollbar-subtle">
      <button
        v-for="s in sections"
        :key="s.id"
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
          activeSection === s.id
            ? 'bg-navy-700 text-white'
            : 'bg-surface border border-border-primary text-navy-700 hover:bg-gray-50',
        ]"
        @click="activeSection = s.id"
      >
        {{ s.label }}
      </button>
    </div>

    <!-- Section: Datos generales -->
    <div v-if="activeSection === 'general'">
      <form class="space-y-8" @submit.prevent="saveGeneral">
        <!-- Bloque 1 · Identidad: nombre + clasificación (los metadatos alimentan
             los filtros del marketplace; obligatorios al publicar como plantilla). -->
        <div class="space-y-4">
          <FormField
            id="cfg-name"
            v-model="general.name"
            :label="t('teacher.classes.detail.settings.general.name_label')"
            required
          />

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="text-sm font-medium text-text-primary mb-2 block">
                {{ t('teacher.classes.detail.settings.general.subject_label') }}
              </label>
              <SelectDropdown
                :model-value="general.subject"
                :options="subjectOptions"
                searchable
                :error="publishErrors.subject"
                :placeholder="t('teacher.classes.detail.settings.general.metadata_none')"
                :search-placeholder="t('teacher.classes.detail.settings.general.metadata_search')"
                @update:model-value="setSubject"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-text-primary mb-2 block">
                {{ t('teacher.classes.detail.settings.general.level_label') }}
              </label>
              <SelectDropdown
                :model-value="general.educationLevel"
                :options="educationLevelOptions"
                :error="publishErrors.educationLevel"
                :placeholder="t('teacher.classes.detail.settings.general.metadata_none')"
                @update:model-value="setEducationLevel"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-text-primary mb-2 block">
                {{ t('teacher.classes.detail.settings.general.language_label') }}
              </label>
              <SelectDropdown
                :model-value="general.language"
                :options="languageOptions"
                :error="publishErrors.language"
                :placeholder="t('teacher.classes.detail.settings.general.metadata_none')"
                @update:model-value="setLanguage"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-text-primary mb-2 block">
                {{ t('teacher.classes.detail.settings.general.province_label') }}
              </label>
              <SelectDropdown
                :model-value="general.province"
                :options="provinceOptions"
                searchable
                :placeholder="t('teacher.classes.detail.settings.general.metadata_none')"
                :search-placeholder="t('teacher.classes.detail.settings.general.metadata_search')"
                @update:model-value="general.province = String($event)"
              />
            </div>
          </div>
        </div>

        <hr class="border-border-primary" />

        <!-- Bloque 2 · Horario -->
        <div>
          <label class="text-sm font-medium text-text-primary mb-2 block">
            {{ t('teacher.classes.detail.settings.general.schedule_label') }}
          </label>
          <ClassScheduleCalendar v-model="scheduleConfig" />
          <!-- Clases antiguas (texto libre): se muestra como referencia para
               reescribirlo en el calendario si se quiere. No se migra. -->
          <p
            v-if="classData?.schedule && !classData?.scheduleConfig"
            class="mt-2 text-xs text-text-secondary"
          >
            {{ t('teacher.schedule.previous') }}: {{ classData.schedule }}
          </p>
        </div>

        <hr class="border-border-primary" />

        <!-- Bloque 3 · Imagen de fondo -->
        <div>
          <label class="text-sm font-medium text-text-primary mb-2 block">
            {{ t('teacher.classes.detail.settings.general.background_label') }}
          </label>
          <div class="flex flex-col sm:flex-row sm:items-center gap-4">
            <!-- Preview -->
            <div
              class="relative w-full sm:w-40 h-28 rounded-xl overflow-hidden bg-navy-700/5 flex-shrink-0"
            >
              <img
                v-if="general.backgroundImage"
                :src="getImageUrl(general.backgroundImage)"
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
                    general.backgroundImage
                      ? t('teacher.classes.detail.settings.general.background_regenerate')
                      : t('teacher.classes.detail.settings.general.background_generate')
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
                  {{ t('teacher.classes.detail.settings.general.background_upload') }}
                </Button>
                <Button
                  v-if="general.backgroundImage"
                  type="button"
                  variant="ghost"
                  size="sm"
                  :icon-left="TrashIcon"
                  :disabled="generatingImage"
                  @click="clearImage"
                >
                  {{ t('teacher.classes.detail.settings.general.background_clear') }}
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

        <hr class="border-border-primary" />

        <div class="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            :disabled="!generalDirty || savingGeneral"
            @click="resetGeneral"
          >
            {{ t('teacher.classes.detail.settings.general.discard') }}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            :disabled="!generalDirty || savingGeneral"
            :loading="savingGeneral"
          >
            {{ t('teacher.classes.detail.settings.general.save') }}
          </Button>
        </div>
      </form>
    </div>

    <!-- Section: Funcionalidades -->
    <div v-else-if="activeSection === 'features'">
      <!-- Column-major en sm+ con 5 filas auto: las 5 primeras de `order` van a la
           columna izquierda (módulos) y las 4 últimas a la derecha (recursos). -->
      <div
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-[repeat(5,auto)]"
      >
        <div
          v-for="flag in order"
          :key="flag"
          class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
          :class="isBlocked(flag) ? 'opacity-75' : ''"
        >
          <span
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-700/5 text-navy-700"
          >
            <component :is="meta[flag].icon" class="h-5 w-5" />
          </span>

          <div class="min-w-0 flex-1">
            <p class="font-semibold leading-tight text-navy-700">
              {{ t(`teacher.classes.detail.settings.items.${flag}.label`) }}
            </p>
            <p class="mt-0.5 text-xs text-text-secondary">
              <template v-if="isBlocked(flag) && meta[flag].requires">
                {{
                  t('teacher.classes.detail.settings.requires', {
                    feature: t(
                      `teacher.classes.detail.settings.items.${meta[flag].requires}.label`
                    ),
                  })
                }}
              </template>
              <template v-else-if="isBlocked(flag)">
                {{ t('teacher.classes.detail.settings.requires_resource') }}
              </template>
              <template v-else>
                {{ t(`teacher.classes.detail.settings.items.${flag}.desc`) }}
              </template>
            </p>
          </div>

          <Toggle
            :model-value="localSettings[flag]"
            :disabled="isBlocked(flag)"
            @update:model-value="setFlag(flag, $event)"
          />
        </div>
      </div>
    </div>

    <!-- Section: Niveles (sistema de niveles configurable de la clase) -->
    <div v-else-if="activeSection === 'levels'">
      <ClassLevelsPanel
        :class-id="classId"
        :level-config="classData?.levelConfig"
        @update="emit('levels-update', $event)"
      />
    </div>

    <!-- Section: Gestión (acciones sobre la clase: publicar como plantilla,
         duplicar y, más adelante, archivar / eliminar). Separada del formulario
         para que ninguna acción cuelgue del botón de "Guardar cambios". -->
    <div v-else-if="activeSection === 'management'" class="space-y-3">
      <!-- Publicar como plantilla en el marketplace. La validación de metadatos
           (asignatura/nivel/idioma) salta a Datos generales y los resalta. -->
      <div
        class="flex flex-col gap-3 rounded-2xl border border-border-primary p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <p class="font-semibold text-navy-700">
            {{ t('teacher.classes.detail.settings.general.publish_title') }}
          </p>
          <p class="mt-0.5 text-sm text-text-secondary">
            {{ t('teacher.classes.detail.settings.general.publish_hint') }}
          </p>
        </div>
        <Toggle
          :model-value="isTemplate"
          :disabled="publishing"
          class="flex-shrink-0"
          @update:model-value="togglePublish"
        />
      </div>

      <!-- Duplicar clase -->
      <div
        class="flex flex-col gap-3 rounded-2xl border border-border-primary p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <p class="font-semibold text-navy-700">
            {{ t('teacher.classes.detail.settings.general.duplicate_title') }}
          </p>
          <p class="mt-0.5 text-sm text-text-secondary">
            {{ t('teacher.classes.detail.settings.general.duplicate_hint') }}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="md"
          :icon-left="DocumentDuplicateIcon"
          :disabled="duplicating"
          class="flex-shrink-0"
          @click="duplicateModalOpen = true"
        >
          {{ t('teacher.classes.detail.settings.general.duplicate_cta') }}
        </Button>
      </div>
    </div>

    <!-- Modal de duplicado: reutiliza el mismo componente/opciones que el listado. -->
    <DuplicateClassModal
      v-model="duplicateModalOpen"
      :class-name="general.name"
      :loading="duplicating"
      @confirm="confirmDuplicate"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ShoppingBagIcon,
  ChartBarIcon,
  SparklesIcon,
  HandRaisedIcon,
  PhotoIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  SpeakerWaveIcon,
  DocumentDuplicateIcon,
} from '@heroicons/vue/24/outline'
import type { DuplicateOptions } from '~/components/organisms/DuplicateClassModal.vue'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import XpIcon from '~/components/atoms/XpIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'
import type { Component } from 'vue'
import type { ClassSettings, LevelConfig } from '~/types/class.types'
import { emptyScheduleConfig, type ScheduleConfig } from '~/types/schedule.types'
import {
  resolveClassSettings,
  coerceClassSettings,
  classSettingNeedsResource,
} from '~/utils/class-settings'
import {
  CLASS_LANGUAGES,
  CLASS_SUBJECTS,
  CLASS_EDUCATION_LEVELS,
  SPANISH_PROVINCES,
} from '~/utils/class-metadata'

interface GeneralData {
  name: string
  schedule: string
  backgroundImage: string
  subject: string
  language: string
  educationLevel: string
  province: string
}

const props = defineProps<{
  classId: string
  classData?: {
    name?: string
    schedule?: string | null
    narrative?: string | null
    backgroundImage?: string | null
    subject?: string | null
    language?: string | null
    educationLevel?: string | null
    province?: string | null
    isTemplate?: boolean | null
    invitationCode?: string
    settings?: Partial<ClassSettings> | null
    levelConfig?: LevelConfig | null
    scheduleConfig?: ScheduleConfig | null
  } | null
}>()

const emit = defineEmits<{
  update: [settings: ClassSettings]
  'general-update': [data: GeneralData]
  'levels-update': [levelConfig: LevelConfig]
}>()

const { t, locale } = useI18n()
const router = useRouter()
const teacherStore = useTeacherStore()
const classesStore = useClassesStore()
const toast = useToast()
const config = useRuntimeConfig()
const { getImageUrl } = useImageUrl()

// --------- Sub-navegación (pills) ---------
type SectionId = 'general' | 'features' | 'levels' | 'management'
const activeSection = ref<SectionId>('general')
const sections = computed<{ id: SectionId; label: string }[]>(() => [
  { id: 'general', label: t('teacher.classes.detail.settings.general.title') },
  { id: 'features', label: t('teacher.classes.detail.settings.features.title') },
  { id: 'levels', label: t('teacher.classes.detail.settings.levels.title') },
  { id: 'management', label: t('teacher.classes.detail.settings.management.title') },
])

// --------- Datos generales ---------
const buildGeneral = (): GeneralData => ({
  name: props.classData?.name ?? '',
  schedule: props.classData?.schedule ?? '',
  backgroundImage: props.classData?.backgroundImage ?? '',
  subject: props.classData?.subject ?? '',
  language: props.classData?.language ?? '',
  educationLevel: props.classData?.educationLevel ?? '',
  province: props.classData?.province ?? '',
})

const general = ref<GeneralData>(buildGeneral())
const generalSnapshot = ref<GeneralData>(buildGeneral())
const savingGeneral = ref(false)

// Horario: el calendario edita una config estructurada que se persiste en la
// columna `scheduleConfig`. `scheduleText` deriva el resumen para el campo
// `schedule` (string) que muestran las tarjetas.
const buildScheduleConfig = (): ScheduleConfig =>
  props.classData?.scheduleConfig
    ? (JSON.parse(JSON.stringify(props.classData.scheduleConfig)) as ScheduleConfig)
    : emptyScheduleConfig()
const scheduleConfig = ref<ScheduleConfig>(buildScheduleConfig())
const scheduleConfigSnapshot = ref<ScheduleConfig>(buildScheduleConfig())
const { scheduleText } = useClassCalendar(scheduleConfig)
const hasScheduleConfig = computed(
  () =>
    scheduleConfig.value.weekdays.length > 0 ||
    !!scheduleConfig.value.startDate ||
    !!scheduleConfig.value.start
)

// Setters de los selects de metadatos. Se extraen a métodos porque Prettier
// expande los handlers inline multi-sentencia a varias líneas y el compilador
// de Vue 3.5 los rechaza (con una sola llamada, ni se expanden ni fallan).
function setSubject(v: string | number) {
  general.value.subject = String(v)
  publishErrors.value.subject = false
}
function setEducationLevel(v: string | number) {
  general.value.educationLevel = String(v)
  publishErrors.value.educationLevel = false
}
function setLanguage(v: string | number) {
  general.value.language = String(v)
  publishErrors.value.language = false
}

watch(
  () => [
    props.classData?.name,
    props.classData?.schedule,
    props.classData?.backgroundImage,
    props.classData?.subject,
    props.classData?.language,
    props.classData?.educationLevel,
    props.classData?.province,
    props.classData?.scheduleConfig,
  ],
  () => {
    // Only sync when the form is clean to avoid clobbering in-progress edits.
    if (!generalDirty.value) {
      general.value = buildGeneral()
      generalSnapshot.value = buildGeneral()
      scheduleConfig.value = buildScheduleConfig()
      scheduleConfigSnapshot.value = buildScheduleConfig()
    }
  }
)

const scheduleConfigDirty = computed(
  () => JSON.stringify(scheduleConfig.value) !== JSON.stringify(scheduleConfigSnapshot.value)
)

const generalDirty = computed(() => {
  const a = general.value
  const b = generalSnapshot.value
  return (
    a.name !== b.name ||
    a.schedule !== b.schedule ||
    a.backgroundImage !== b.backgroundImage ||
    a.subject !== b.subject ||
    a.language !== b.language ||
    a.educationLevel !== b.educationLevel ||
    a.province !== b.province ||
    scheduleConfigDirty.value
  )
})

function resetGeneral() {
  general.value = { ...generalSnapshot.value }
  scheduleConfig.value = JSON.parse(JSON.stringify(scheduleConfigSnapshot.value)) as ScheduleConfig
}

// --------- Clasificación (asignatura / nivel / idioma / provincia) ---------
// Opciones de cada select con un "sin especificar" delante para poder limpiar.
const noneOption = computed(() => ({
  value: '',
  label: t('teacher.classes.detail.settings.general.metadata_none'),
}))
const subjectOptions = computed(() => [noneOption.value, ...CLASS_SUBJECTS])
const languageOptions = computed(() => [noneOption.value, ...CLASS_LANGUAGES])
const educationLevelOptions = computed(() => [noneOption.value, ...CLASS_EDUCATION_LEVELS])
const provinceOptions = computed(() => [noneOption.value, ...SPANISH_PROVINCES])

// --------- Imagen de fondo ---------
const generatingImage = ref(false)
const coverFileRef = ref<HTMLInputElement>()

// El profe puede subir su propia portada en vez de generarla con IA. Se lee
// como data URL y el backend la persiste en /uploads al guardar (updateClass).
function handleCoverUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const validTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('teacher.classes.detail.settings.general.background_upload_type_error'))
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error(t('teacher.classes.detail.settings.general.background_upload_size_error'))
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = e => {
    general.value.backgroundImage = e.target?.result as string
  }
  reader.readAsDataURL(file)
  input.value = ''
}

async function regenerateImage() {
  if (generatingImage.value) return
  generatingImage.value = true
  try {
    const res = await $fetch<{ imageUrl: string }>(`${config.public.apiBase}/ai/class-cover`, {
      method: 'POST',
      body: {
        name: general.value.name || props.classData?.name,
        description: props.classData?.narrative || undefined,
        locale: locale.value,
      },
    })
    general.value.backgroundImage = res.imageUrl
  } catch {
    toast.error(t('teacher.classes.detail.settings.general.background_error'))
  } finally {
    generatingImage.value = false
  }
}

function clearImage() {
  general.value.backgroundImage = ''
}

async function saveGeneral() {
  if (!generalDirty.value || savingGeneral.value) return
  if (!general.value.name.trim()) {
    toast.error(t('teacher.classes.detail.settings.general.name_required'))
    return
  }

  // Si la clase está publicada como plantilla, no dejar sin especificar los
  // metadatos que exige el marketplace (asignatura, nivel, idioma): quedaría
  // publicada pero rota en los filtros. Hay que despublicarla primero.
  if (isTemplate.value) {
    const missing = {
      subject: !general.value.subject,
      educationLevel: !general.value.educationLevel,
      language: !general.value.language,
    }
    if (missing.subject || missing.educationLevel || missing.language) {
      publishErrors.value = missing
      toast.error(t('teacher.classes.detail.settings.general.template_metadata_locked'))
      return
    }
  }

  savingGeneral.value = true
  // El horario solo se persiste (config + string derivado) si el profe editó el
  // calendario, o si la clase ya tenía config guardada. Las clases antiguas
  // pre-rellenadas desde el texto que no se tocan conservan su string intacto.
  const persistSchedule =
    hasScheduleConfig.value && (scheduleConfigDirty.value || !!props.classData?.scheduleConfig)
  const scheduleStr = persistSchedule ? scheduleText.value.trim() : general.value.schedule.trim()
  const payload: GeneralData = {
    name: general.value.name.trim(),
    schedule: scheduleStr,
    backgroundImage: general.value.backgroundImage.trim(),
    subject: general.value.subject,
    language: general.value.language,
    educationLevel: general.value.educationLevel,
    province: general.value.province,
  }

  try {
    await teacherStore.updateClass(props.classId, {
      name: payload.name,
      schedule: payload.schedule || undefined,
      backgroundImage: payload.backgroundImage || undefined,
      // Cadena vacía = "sin especificar" (se envía para poder limpiar el valor).
      subject: payload.subject,
      language: payload.language,
      educationLevel: payload.educationLevel,
      province: payload.province,
      // Solo enviamos la config si corresponde persistir (ver `persistSchedule`).
      ...(persistSchedule ? { scheduleConfig: scheduleConfig.value } : {}),
    })
    generalSnapshot.value = { ...payload }
    general.value = { ...payload }
    scheduleConfigSnapshot.value = JSON.parse(
      JSON.stringify(scheduleConfig.value)
    ) as ScheduleConfig
    emit('general-update', payload)
    toast.success(t('teacher.classes.detail.settings.general.toast_saved'))
  } catch (err: unknown) {
    // Surface el mensaje del backend si lo hay (p. ej. plantilla publicada sin
    // metadatos), con el genérico como fallback.
    const message =
      (err as { data?: { message?: string } })?.data?.message ||
      t('teacher.classes.detail.settings.general.toast_error')
    toast.error(message)
  } finally {
    savingGeneral.value = false
  }
}

// --------- Publicar como plantilla en el marketplace ---------
const isTemplate = ref<boolean>(props.classData?.isTemplate ?? false)
const publishing = ref(false)
watch(
  () => props.classData?.isTemplate,
  val => {
    isTemplate.value = val ?? false
  }
)

// Campos de clasificación que deben estar guardados para poder publicar.
// Al intentar activar sin ellos, se resaltan en rojo en el formulario.
const publishErrors = ref({ subject: false, educationLevel: false, language: false })

async function togglePublish(value: boolean) {
  if (publishing.value) return
  if (value) {
    const snap = generalSnapshot.value
    const missing = {
      subject: !snap.subject,
      educationLevel: !snap.educationLevel,
      language: !snap.language,
    }
    if (missing.subject || missing.educationLevel || missing.language) {
      publishErrors.value = missing
      // Los campos que faltan viven en "Datos generales": salta allí para que el
      // profe vea el resaltado en rojo, no solo el toast desde la pestaña Gestión.
      activeSection.value = 'general'
      toast.error(t('teacher.classes.detail.settings.general.publish_missing_metadata'))
      return
    }
  }
  publishErrors.value = { subject: false, educationLevel: false, language: false }
  publishing.value = true
  const previous = isTemplate.value
  isTemplate.value = value // optimista
  try {
    await teacherStore.publishTemplate(props.classId, value)
    toast.success(
      value
        ? t('teacher.classes.detail.settings.general.publish_on')
        : t('teacher.classes.detail.settings.general.publish_off')
    )
  } catch (err: unknown) {
    isTemplate.value = previous // revierte si el backend rechaza (p. ej. faltan metadatos)
    const message =
      (err as { data?: { message?: string } })?.data?.message ||
      t('teacher.classes.detail.settings.general.publish_error')
    toast.error(message)
  } finally {
    publishing.value = false
  }
}

// --------- Funcionalidades (toggles) ---------
const localSettings = ref<ClassSettings>(resolveClassSettings(props.classData?.settings))
watch(
  () => props.classData?.settings,
  val => {
    localSettings.value = resolveClassSettings(val)
  }
)

// `requires` aquí solo controla el grisado / hint "Necesita X" del toggle (un
// prerrequisito duro y simple). NO es la fuente de la lógica de cascada: esa vive
// en coerceClassSettings (CLASS_SETTING_DEPENDENCIES / COUPLES / ONE_OF).
//  · Tienda⇆Monedas: acoplamiento, no se grisan (se encienden/apagan juntas).
//  · Vidas: tampoco se grisa; activarla enciende Comportamientos por cascada, así
//    Vidas es un "recurso" válido que el profe puede elegir para Comportamientos.
//  · Comportamientos: se grisa por "necesita al menos un recurso"
//    (classSettingNeedsResource), con su propio mensaje, no con "Necesita X".
const meta: Record<keyof ClassSettings, { icon: Component; requires?: keyof ClassSettings }> = {
  shop: { icon: ShoppingBagIcon },
  coins: { icon: CoinIcon },
  mana: { icon: ManaIcon, requires: 'shop' },
  rankings: { icon: ChartBarIcon, requires: 'xp' },
  xp: { icon: XpIcon },
  behaviors: { icon: HandRaisedIcon },
  lives: { icon: LifeIcon },
  visualEffects: { icon: SparklesIcon },
  sounds: { icon: SpeakerWaveIcon },
}

// Column-major en sm+ con 5 filas: la columna izquierda son los 5 módulos /
// mecánicas (Ranking, Tienda, Comportamientos, Efectos visuales, Sonidos) y
// la derecha los 4 recursos (XP, Monedas, Maná, Vidas). Las dependencias se
// siguen aplicando con `meta[*].requires`, pero ya no condicionan el layout.
const order: (keyof ClassSettings)[] = [
  // Izquierda (módulos / mecánicas)
  'rankings',
  'shop',
  'behaviors',
  'visualEffects',
  'sounds',
  // Derecha (recursos)
  'xp',
  'coins',
  'mana',
  'lives',
]

function isBlocked(flag: keyof ClassSettings): boolean {
  const req = meta[flag].requires
  if (req && !localSettings.value[req]) return true
  return classSettingNeedsResource(flag, localSettings.value)
}

async function setFlag(flag: keyof ClassSettings, value: boolean) {
  // coerceClassSettings resuelve la cascada completa (prerrequisitos hacia arriba,
  // acoplamientos y "al menos un recurso") hasta un estado coherente, igual que
  // normaliza el backend. Así la UI optimista nunca diverge de lo que se persiste.
  const next = coerceClassSettings(localSettings.value, flag, value)

  const prev = localSettings.value
  localSettings.value = next
  try {
    await teacherStore.updateClass(props.classId, { settings: { ...next } })
    emit('update', { ...next })
  } catch {
    localSettings.value = prev
    toast.error(t('teacher.classes.detail.settings.toast_error'))
  }
}

// --------- Duplicar clase ---------
const duplicateModalOpen = ref(false)
const duplicating = ref(false)

async function confirmDuplicate(options: DuplicateOptions) {
  if (duplicating.value) return
  duplicating.value = true
  try {
    const res = await teacherStore.duplicateClass(props.classId, options)
    // Refresca la lista de clases y lleva al profe a la copia recién creada.
    await classesStore.ensureTeacherClasses(100, true)
    toast.success(t('teacher.classes.index.duplicate_success', { name: res.class.name }))
    duplicateModalOpen.value = false
    await router.push(`/profesor/clases/${res.class.id}`)
  } catch {
    toast.error(t('teacher.classes.index.duplicate_error'))
  } finally {
    duplicating.value = false
  }
}
</script>
