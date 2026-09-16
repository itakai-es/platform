<template>
  <div class="space-y-5">
    <!-- Tamaño de letra: la etiqueta de cada opción se muestra a su tamaño -->
    <div>
      <p class="text-sm font-semibold text-navy-700">
        {{ t('common.accessibility.font_scale.title') }}
      </p>
      <p class="text-xs text-navy-700/70 mb-2">
        {{ t('common.accessibility.font_scale.description') }}
      </p>
      <OptionPillGroup
        v-model="fontScale"
        fluid
        :options="fontScaleOptions"
        :aria-label="t('common.accessibility.font_scale.title')"
      >
        <template #option="{ option }">
          <span :class="FONT_PREVIEW_CLASS[option.value]">{{ option.label }}</span>
        </template>
      </OptionPillGroup>
    </div>

    <!-- Contraste -->
    <div>
      <p class="text-sm font-semibold text-navy-700">
        {{ t('common.accessibility.contrast.title') }}
      </p>
      <p class="text-xs text-navy-700/70 mb-2">
        {{ t('common.accessibility.contrast.description') }}
      </p>
      <OptionPillGroup
        v-model="contrastMode"
        fluid
        :options="contrastOptions"
        :aria-label="t('common.accessibility.contrast.title')"
      />
    </div>

    <!-- Visión del color -->
    <div>
      <p class="text-sm font-semibold text-navy-700">
        {{ t('common.accessibility.color_vision.title') }}
      </p>
      <p class="text-xs text-navy-700/70 mb-2">
        {{ t('common.accessibility.color_vision.description') }}
      </p>
      <OptionPillGroup
        v-model="colorVision"
        fluid
        :options="colorVisionOptions"
        :columns="2"
        :aria-label="t('common.accessibility.color_vision.title')"
      />
      <!-- Muestra viva: los mismos tokens que usa el resto de la app, para
           poder comprobar de un vistazo si los estados se distinguen. -->
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="sample in colorSamples"
          :key="sample.key"
          class="rounded-full px-2.5 py-1 text-xs font-medium"
          :class="sample.classes"
        >
          {{ sample.label }}
        </span>
      </div>
    </div>

    <!-- Menos animación -->
    <div class="flex items-start justify-between gap-4 pt-1">
      <div>
        <p class="text-sm font-semibold text-navy-700">
          {{ t('common.accessibility.reduce_motion.title') }}
        </p>
        <p class="text-xs text-navy-700/70">
          {{ t('common.accessibility.reduce_motion.description') }}
        </p>
      </div>
      <Toggle v-model="reduceMotion" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  COLOR_VISION_MODES,
  CONTRAST_MODES,
  FONT_SCALES,
  type AccessibilityPreferences,
  type ColorVisionMode,
  type ContrastMode,
  type FontScale,
} from '~/utils/accessibility'

/**
 * Los cuatro ajustes de accesibilidad (Fase 3, punto 14), sin envoltorio.
 *
 * Viven aquí sueltos porque tienen dos casas: la tarjeta del perfil y el menú
 * de las pantallas públicas, donde todavía no hay sesión. Los ajustes son los
 * mismos y el comportamiento también; lo único que cambia es el marco.
 */

const { t } = useI18n()
const toast = useToast()
const { preferences, update } = useAccessibility()

const FONT_PREVIEW_CLASS: Record<string, string> = {
  normal: 'text-sm',
  large: 'text-base',
  xlarge: 'text-lg',
}

const fontScaleOptions = computed(() =>
  FONT_SCALES.map(value => ({ value, label: t(`common.accessibility.font_scale.${value}`) }))
)

const contrastOptions = computed(() =>
  CONTRAST_MODES.map(value => ({ value, label: t(`common.accessibility.contrast.${value}`) }))
)

const colorVisionOptions = computed(() =>
  COLOR_VISION_MODES.map(value => ({
    value,
    label: t(`common.accessibility.color_vision.${value}`),
  }))
)

const colorSamples = computed(() => [
  {
    key: 'success',
    label: t('common.accessibility.samples.success'),
    classes: 'bg-mint text-navy-700',
  },
  { key: 'error', label: t('common.accessibility.samples.error'), classes: 'bg-red text-white' },
  {
    key: 'warning',
    label: t('common.accessibility.samples.warning'),
    classes: 'bg-yellow text-navy-700',
  },
  { key: 'info', label: t('common.accessibility.samples.info'), classes: 'bg-sky text-white' },
  {
    key: 'accent',
    label: t('common.accessibility.samples.accent'),
    classes: 'bg-purple text-white',
  },
])

const save = async (patch: Partial<AccessibilityPreferences>) => {
  const result = await update(patch)
  // Sin sesión no hay nada que guardar en el servidor y tampoco nada que
  // avisar: el ajuste se aplica y se queda en el navegador.
  if (!result) return
  if (result.success) toast.success(t('common.accessibility.updated'))
  else toast.error(result.message || t('common.accessibility.update_error'))
}

const fontScale = computed<FontScale>({
  get: () => preferences.value.fontScale,
  set: value => {
    save({ fontScale: value })
  },
})

const contrastMode = computed<ContrastMode>({
  get: () => preferences.value.contrastMode,
  set: value => {
    save({ contrastMode: value })
  },
})

const colorVision = computed<ColorVisionMode>({
  get: () => preferences.value.colorVision,
  set: value => {
    save({ colorVision: value })
  },
})

const reduceMotion = computed<boolean>({
  get: () => preferences.value.reduceMotion,
  set: value => {
    save({ reduceMotion: value })
  },
})
</script>
