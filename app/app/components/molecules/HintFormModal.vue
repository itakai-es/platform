<template>
  <Modal
    :model-value="modelValue"
    :title="
      isEditing
        ? t('teacher.components.mission_hints.form.edit_title', { position: hint?.position ?? 0 })
        : t('teacher.components.mission_hints.form.add_title')
    "
    size="lg"
    theme="light"
    persistent
    @update:model-value="close"
  >
    <div class="space-y-4">
      <FieldGroup
        v-slot="{ id, describedby }"
        :label="t('teacher.components.mission_hints.form.content')"
        :hint="
          t('teacher.components.mission_hints.form.content_hint', { max: HINT_LIMITS.content })
        "
        :error="contentError"
        native-control
        required
      >
        <TextArea
          :id="id"
          v-model="form.content"
          :rows="4"
          :maxlength="HINT_LIMITS.content"
          :error="!!contentError"
          :aria-describedby="describedby"
          :placeholder="t('teacher.components.mission_hints.form.content_placeholder')"
        />
      </FieldGroup>

      <FieldGroup
        v-slot="{ labelId }"
        :label="t('teacher.components.mission_hints.form.cost_type')"
      >
        <OptionPillGroup
          v-model="form.costType"
          :options="costTypeOptions"
          fluid
          :columns="3"
          min-item-width="8rem"
          :aria-labelledby="labelId"
        />
      </FieldGroup>

      <FieldGroup
        v-slot="{ id, describedby }"
        :label="amountLabel"
        :hint="amountHint"
        native-control
      >
        <!-- En el móvil, los atajos bajan a su línea para no aplastar los números. -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div class="w-28 shrink-0">
            <Input
              :id="id"
              v-model="form.cost"
              type="number"
              inputmode="numeric"
              min="0"
              :max="String(maxCost)"
              :aria-describedby="describedby"
              @blur="clampCost"
            />
          </div>
          <!-- Atajos: rellenan la cantidad; cualquier otra también vale. -->
          <OptionPillGroup
            :model-value="String(form.cost)"
            :options="presetOptions"
            :columns="4"
            class="min-w-0 sm:flex-1"
            :aria-label="t('teacher.components.mission_hints.form.presets')"
            @update:model-value="pickPreset"
          />
        </div>
      </FieldGroup>

      <InfoNote v-if="freeReason">{{ freeReason }}</InfoNote>
      <!-- Si alguien la usa con el editor abierto, el foco viene aquí: explica por
           qué ya no está «Eliminar». -->
      <div
        v-if="isEditing && usedCount > 0"
        ref="usedNoteRef"
        tabindex="-1"
        class="focus:outline-none"
      >
        <InfoNote>
          {{
            t('teacher.components.mission_hints.form.used_note', { count: usedCount }, usedCount)
          }}
        </InfoNote>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-end gap-3">
        <!-- Junto a los botones, lo que va a pasar al guardar y al borrar: se aplica al pulsar. -->
        <div class="w-full min-w-0 space-y-1 sm:mr-auto sm:w-auto sm:flex-1">
          <p :id="summaryId" class="text-sm font-medium text-navy-700" aria-live="polite">
            {{ summary }}
          </p>
          <p v-if="canDelete" :id="deleteSummaryId" class="text-sm text-navy-700/80">
            {{ t('teacher.components.mission_hints.form.delete_summary') }}
          </p>
        </div>
        <Button
          v-if="canDelete"
          variant="outline"
          :icon-left="TrashIcon"
          :loading="deleting"
          :disabled="saving"
          :aria-describedby="deleteSummaryId"
          @click="emit('delete')"
        >
          {{ t('teacher.components.mission_hints.form.delete') }}
        </Button>
        <Button variant="outline" :disabled="saving || deleting" @click="close(false)">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button
          variant="primary"
          :loading="saving"
          :disabled="deleting"
          :aria-describedby="summaryId"
          @click="submit"
        >
          {{
            isEditing
              ? t('common.actions.save')
              : t('teacher.components.mission_hints.form.add_button')
          }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline'
import type { MissionHintCostType, MissionHintDetail } from '~/types/mission-detail.types'
import type { MissionHintInput } from '~/composables/useMissionHints'
import { HINT_COST_PRESETS, HINT_LIMITS, clampHintCost } from '~/utils/mission-hints'

/**
 * Editor de una pista: su texto, en qué se paga (monedas, XP o % de la
 * recompensa, solo con los recursos que usa la clase) y cuánto. Los atajos son
 * sugerencias. Sin ventana de confirmar: junto a «Guardar» se lee qué pagará
 * quien la use, y en una pista que nadie ha usado, junto a «Eliminar», que la
 * borra al momento. Una usada no se borra: lo que pagaron no cambia.
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** La pista que se edita; sin ella, una nueva. */
    hint?: MissionHintDetail | null
    /** Recursos activos en la clase. */
    settings: { coins: boolean; xp: boolean }
    saving?: boolean
    deleting?: boolean
  }>(),
  { hint: null, saving: false, deleting: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [input: MissionHintInput]
  delete: []
}>()

const { t } = useI18n()
const { coinLabel } = useCoinLabel()
const summaryId = useId()
const deleteSummaryId = useId()
const usedNoteRef = ref<HTMLElement | null>(null)

const isEditing = computed(() => !!props.hint)
const usedCount = computed(() => props.hint?.usedCount ?? 0)
/** Solo se borra la que nadie ha usado. */
const canDelete = computed(() => isEditing.value && usedCount.value === 0)

// Alguien ha usado esta misma pista con el editor abierto: «Eliminar» desaparece
// y el foco va a la nota que lo explica, en lugar de perderse.
watch(
  () => [props.hint?.id, usedCount.value] as const,
  async ([id, count], [previousId, previousCount]) => {
    if (!props.modelValue || id !== previousId || previousCount !== 0 || count === 0) return
    await nextTick()
    usedNoteRef.value?.focus()
  }
)

const form = reactive<{ content: string; costType: MissionHintCostType; cost: number }>({
  content: '',
  costType: 'coins',
  cost: 10,
})
const contentError = ref('')

/** El primer tipo que la clase puede cobrar: monedas, si no XP, si no %. */
const defaultCostType = (): MissionHintCostType =>
  props.settings.coins ? 'coins' : props.settings.xp ? 'xp' : 'percent'

watch(
  () => [props.modelValue, props.hint] as const,
  ([open]) => {
    if (!open) return
    form.content = props.hint?.content ?? ''
    form.costType = props.hint?.costType ?? defaultCostType()
    form.cost = props.hint?.cost ?? HINT_COST_PRESETS[form.costType][1]!
    contentError.value = ''
  },
  { immediate: true }
)

// Al cambiar de tipo, la cantidad pasa a una sugerencia del tipo nuevo si la de
// antes no tiene sentido en él (un 50 % no son 50 monedas).
watch(
  () => form.costType,
  (type, previous) => {
    if (!previous || type === previous) return
    if (!HINT_COST_PRESETS[type].includes(form.cost)) form.cost = HINT_COST_PRESETS[type][1]!
  }
)

/** Solo los recursos que usa la clase; el de la pista que se edita, siempre, para no perderlo. */
const costTypeOptions = computed(() => {
  const keep = props.hint?.costType
  return [
    ...(props.settings.coins || keep === 'coins'
      ? [{ value: 'coins' as const, label: coinLabel.value }]
      : []),
    ...(props.settings.xp || keep === 'xp'
      ? [{ value: 'xp' as const, label: t('teacher.components.mission_hints.form.type_xp') }]
      : []),
    { value: 'percent' as const, label: t('teacher.components.mission_hints.form.type_percent') },
  ]
})

const maxCost = computed(() => (form.costType === 'percent' ? 100 : HINT_LIMITS.maxCost))

const presetOptions = computed(() =>
  HINT_COST_PRESETS[form.costType].map(value => ({
    value: String(value),
    label: form.costType === 'percent' ? `${value} %` : String(value),
  }))
)

function pickPreset(value: string) {
  form.cost = Number(value)
}

function clampCost() {
  form.cost = clampHintCost(form.costType, form.cost)
}

const amountLabel = computed(() =>
  form.costType === 'percent'
    ? t('teacher.components.mission_hints.form.amount_percent')
    : form.costType === 'xp'
      ? t('teacher.components.mission_hints.form.amount_xp')
      : t('teacher.components.mission_hints.form.amount_coins', { coins: coinLabel.value })
)

const amountHint = computed(() =>
  form.costType === 'percent'
    ? t('teacher.components.mission_hints.form.amount_percent_hint')
    : t('teacher.components.mission_hints.form.amount_hint')
)

/** Por qué saldría gratis, si es el caso: la clase tiene apagado ese recurso. */
const freeReason = computed(() => {
  if (form.costType === 'coins' && !props.settings.coins) {
    return t('teacher.components.mission_hints.free_no_coins', { coins: coinLabel.value })
  }
  if (form.costType === 'xp' && !props.settings.xp) {
    return t('teacher.components.mission_hints.free_no_xp')
  }
  return ''
})

const summary = computed(() => {
  const cost = clampHintCost(form.costType, form.cost)
  if (freeReason.value || cost === 0) return t('teacher.components.mission_hints.form.summary_free')
  if (form.costType === 'percent') {
    return t('teacher.components.mission_hints.form.summary_percent', { count: cost })
  }
  if (form.costType === 'xp') {
    return t('teacher.components.mission_hints.form.summary_xp', { count: cost })
  }
  return t('teacher.components.mission_hints.form.summary_coins', {
    count: cost,
    coins: coinLabel.value,
  })
})

function submit() {
  const content = form.content.trim()
  if (!content) {
    contentError.value = t('teacher.components.mission_hints.form.content_required')
    return
  }
  clampCost()
  emit('submit', { content, costType: form.costType, cost: form.cost })
}

function close(value: boolean) {
  emit('update:modelValue', value)
}
</script>
