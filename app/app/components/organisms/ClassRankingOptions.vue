<template>
  <SettingsSection
    :title="tr('title')"
    :hint="tr('hint')"
    body-class="space-y-6"
  >
    <!-- Qué ve el alumnado: lo recorta la API, no la pantalla -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <label :id="modeLabelId" class="mb-2 block text-sm font-medium text-text-primary">
          {{ tr('mode_label') }}
        </label>
        <SelectDropdown
          :model-value="config.mode"
          :options="modeOptions"
          :labelledby="modeLabelId"
          :describedby="modeHintId"
          :disabled="!canEdit"
          @update:model-value="setMode"
        />
        <p :id="modeHintId" class="mt-2 text-sm text-navy-700/80">
          {{ tr(`mode_hint.${config.mode}`) }}
        </p>
      </div>
      <div v-if="config.mode === 'top'">
        <label :id="topLabelId" class="mb-2 block text-sm font-medium text-text-primary">
          {{ tr('top_label') }}
        </label>
        <SelectDropdown
          :model-value="config.topN"
          :options="topOptions"
          :labelledby="topLabelId"
          :disabled="!canEdit"
          @update:model-value="setTopN"
        />
      </div>
    </div>

    <!-- Tipos: varios a la vez; el alumnado cambia de uno a otro con pestañas -->
    <div class="space-y-3">
      <div>
        <h4 class="font-semibold text-navy-700">{{ tr('types_title') }}</h4>
        <p class="mt-0.5 text-sm text-navy-700/80">{{ tr('types_hint') }}</p>
      </div>
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ClassFeatureRow
          v-for="type in RANKING_TYPES"
          :key="type"
          :icon="TYPE_ICONS[type]"
          :label="tr(`type.${type}.label`)"
          :description="typeDescription(type)"
          :dimmed="!rankingTypeAvailable(type, settings)"
        >
          <template #action="{ labelId, descriptionId }">
            <Toggle
              :model-value="isTypeOn(type)"
              :disabled="!canEdit || !canToggleType(type)"
              :aria-labelledby="labelId"
              :aria-describedby="descriptionId"
              @update:model-value="setType(type, $event)"
            />
          </template>
        </ClassFeatureRow>
      </div>
    </div>
  </SettingsSection>
</template>

<script setup lang="ts">
import { RocketLaunchIcon, UserGroupIcon } from '@heroicons/vue/24/outline'
import type { Component } from 'vue'
import XpIcon from '~/components/atoms/XpIcon.vue'
import type { ClassSettings } from '~/types/class.types'
import {
  RANKING_MODES,
  RANKING_TOP_SIZES,
  RANKING_TYPES,
  effectiveRankingTypes,
  rankingTypeAvailable,
  type RankingConfig,
  type RankingMode,
  type RankingTopSize,
  type RankingType,
} from '~/utils/ranking-config'

/**
 * Las opciones del ranking en Ajustes → Funcionalidades, abiertas con el
 * interruptor encendido: qué ve el alumnado y qué tipos hay. Se guarda al cambiar,
 * como los interruptores de al lado.
 */
const props = defineProps<{
  classId: string
  settings: ClassSettings
  config: RankingConfig
  canEdit: boolean
}>()

const emit = defineEmits<{
  update: [config: RankingConfig]
}>()

const TYPE_ICONS: Record<RankingType, Component> = {
  xp: XpIcon,
  missions: RocketLaunchIcon,
  teams: UserGroupIcon,
}

/** Cuántos primeros se sugieren (decisión del plan): se dice en la opción, no es el valor por defecto. */
const SUGGESTED_TOP: RankingTopSize = 5

const { t } = useI18n()
const toast = useToast()
const rankingSaveError = useRankingSaveError()
const teacherStore = useTeacherStore()
const modeLabelId = useId()
const modeHintId = useId()
const topLabelId = useId()

const tr = (key: string, params: Record<string, unknown> = {}) =>
  t(`teacher.classes.detail.settings.ranking.${key}`, params)

const modeOptions = computed(() =>
  RANKING_MODES.map(mode => ({
    value: mode,
    label:
      mode !== 'top'
        ? tr(`mode.${mode}`)
        : tr(props.config.topN === SUGGESTED_TOP ? 'mode.top_suggested' : 'mode.top', {
            n: props.config.topN,
          }),
  }))
)

const topOptions = computed(() =>
  RANKING_TOP_SIZES.map(n => ({ value: n, label: tr('top_option', { n }) }))
)

const usableTypes = computed(() => effectiveRankingTypes(props.config, props.settings))

const isTypeOn = (type: RankingType) => usableTypes.value.includes(type)

const { activeSets, loaded: teamsLoaded, ensure: ensureTeams } = useClassTeams(() => props.classId)
const hasBaseTeams = computed(() => activeSets.value.some(set => set.kind === 'base'))
// Sin permiso para verlas o si falla, se queda la descripción de siempre.
onMounted(() => void ensureTeams().catch(() => {}))

/** Lo que no se puede tocar: el que la clase no puede usar y el último que queda. */
function canToggleType(type: RankingType) {
  if (!rankingTypeAvailable(type, props.settings)) return false
  return !(isTypeOn(type) && usableTypes.value.length === 1)
}

function typeDescription(type: RankingType) {
  if (!rankingTypeAvailable(type, props.settings)) {
    return t('teacher.classes.detail.settings.requires', {
      feature: t('teacher.classes.detail.settings.items.xp.label'),
    })
  }
  if (!canToggleType(type)) return tr('type_last')
  // Encendido no basta: sin agrupación de base no hay nada que clasificar ni pestaña.
  if (type === 'teams' && teamsLoaded.value && !hasBaseTeams.value) return tr('type.teams.no_base')
  return tr(`type.${type}.desc`)
}

/** Lo guarda y, si la API lo rechaza, deja lo que había. */
async function save(patch: Partial<Pick<RankingConfig, 'types' | 'mode' | 'topN'>>) {
  const previous = props.config
  emit('update', { ...previous, ...patch })
  try {
    await teacherStore.updateClass(props.classId, { rankingConfig: patch })
  } catch (err: unknown) {
    emit('update', previous)
    toast.error(rankingSaveError(err))
  }
}

function setMode(value: string | number) {
  void save({ mode: value as RankingMode })
}

function setTopN(value: string | number) {
  void save({ topN: value as RankingTopSize })
}

function setType(type: RankingType, on: boolean) {
  void save({
    types: RANKING_TYPES.filter(each => (each === type ? on : props.config.types.includes(each))),
  })
}
</script>
