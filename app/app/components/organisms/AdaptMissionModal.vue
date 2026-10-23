<template>
  <Modal
    :model-value="modelValue"
    size="xl"
    :title="t('teacher.missions.adapt.title')"
    :persistent="busy"
    :closable="!busy"
    sticky-chrome
    fit-content
    @update:model-value="close"
  >
    <div class="space-y-5">
      <!-- La IA no ve las pistas: tras adaptar, pueden hablar de algo que ya no está -->
      <InfoNote v-if="hintCount > 0">
        {{ t('teacher.missions.adapt.hints_note', { count: hintCount }, hintCount) }}
      </InfoNote>

      <!-- 1. Qué quiere su docente (opcional) -->
      <template v-if="!proposal">
        <p class="text-sm">{{ t('teacher.missions.adapt.intro', { name: className }) }}</p>
        <FieldGroup
          v-slot="{ id }"
          :label="t('teacher.missions.adapt.request_label')"
          :hint="t('teacher.missions.adapt.request_hint')"
          native-control
        >
          <TextArea
            :id="id"
            v-model="request"
            :rows="3"
            :disabled="busy"
            :placeholder="t('teacher.missions.adapt.request_placeholder')"
            maxlength="1200"
          />
        </FieldGroup>
      </template>

      <!-- 2. La propuesta frente a lo de ahora -->
      <template v-else-if="plan">
        <InfoNote v-if="!plan.hasChanges">{{ t('teacher.missions.adapt.no_changes') }}</InfoNote>

        <MissionAdaptCompare
          :label="t('teacher.missions.adapt.field_title')"
          :status="plan.titleChanged ? undefined : t('teacher.missions.adapt.unchanged')"
        >
          <template #current>
            <p class="break-words font-semibold text-navy-700">{{ mission.title }}</p>
          </template>
          <template v-if="plan.titleChanged" #proposed>
            <p class="break-words font-semibold text-navy-700">{{ plan.title }}</p>
          </template>
        </MissionAdaptCompare>

        <MissionAdaptCompare
          :label="t('teacher.missions.adapt.field_story')"
          :status="plan.descriptionChanged ? undefined : t('teacher.missions.adapt.unchanged')"
        >
          <!-- La historia es markdown: saneado por renderMarkdown, como en el detalle -->
          <template #current>
            <div
              v-if="mission.description"
              class="md-rendered max-h-48 overflow-y-auto break-words"
              v-html="renderMarkdown(mission.description)"
            />
            <p v-else>—</p>
          </template>
          <template v-if="plan.descriptionChanged" #proposed>
            <div
              class="md-rendered max-h-48 overflow-y-auto break-words"
              v-html="renderMarkdown(plan.description)"
            />
          </template>
        </MissionAdaptCompare>

        <h3 class="pt-1 text-base font-bold text-navy-700">
          {{ t('teacher.missions.adapt.enigmas_heading') }}
        </h3>
        <MissionAdaptCompare
          v-for="(row, index) in plan.rows"
          :key="row.current?.id ?? `new-${index}`"
          :label="t('teacher.missions.adapt.enigma_n', { n: index + 1 })"
          :status="rowStatus(row)?.label"
          :tone="rowStatus(row)?.tone"
        >
          <template v-if="row.current" #current>
            <MissionAdaptEnigma :enigma="row.current" v-bind="rewardFlags" />
          </template>
          <template v-if="row.proposed && (row.kind === 'create' || row.changed)" #proposed>
            <MissionAdaptEnigma :enigma="row.proposed" v-bind="rewardFlags" />
          </template>
          <p v-if="row.kind === 'keep'" class="mt-3 text-sm text-navy-700/70">
            {{ t('teacher.missions.adapt.row_keep_hint') }}
          </p>
          <p v-if="row.rewardsRaised" class="mt-3 text-sm text-navy-700/70">
            {{ t('teacher.missions.adapt.rewards_raised') }}
          </p>
        </MissionAdaptCompare>

        <!-- Pedir otro cambio: si falla, la propuesta de arriba se conserva -->
        <FieldGroup
          v-slot="{ id }"
          :label="t('teacher.missions.adapt.feedback_label')"
          native-control
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <TextArea
              :id="id"
              v-model="feedback"
              :rows="2"
              :disabled="busy"
              :placeholder="t('teacher.missions.adapt.feedback_placeholder')"
              maxlength="600"
            />
            <Button
              variant="secondary"
              class="flex-shrink-0"
              :loading="generating"
              :disabled="busy || !feedback.trim()"
              @click="askChange"
            >
              <SparklesIcon class="mr-1.5 h-4 w-4" aria-hidden="true" />
              {{ t('teacher.missions.adapt.ask_change') }}
            </Button>
          </div>
        </FieldGroup>
      </template>

      <!-- Preparando: la barra de siempre de la IA -->
      <div
        v-if="generating"
        class="flex flex-col items-center gap-2 py-2"
        role="status"
        aria-live="polite"
      >
        <p class="text-sm font-medium text-navy-700">
          {{ t('teacher.missions.adapt.generating') }}
        </p>
        <AILoadingBar
          :progress="generationProgress"
          :is-overtime="isOvertime"
          :remaining-label="remainingTimeLabel"
        />
      </div>

      <div
        v-if="errorMessage"
        role="alert"
        class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>
    </div>

    <template #footer>
      <template v-if="!proposal">
        <Button variant="outline" :disabled="busy" @click="close">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button variant="primary" :loading="generating" :disabled="busy" @click="propose">
          <SparklesIcon class="mr-1.5 h-4 w-4" aria-hidden="true" />
          {{ t('teacher.missions.adapt.propose') }}
        </Button>
      </template>
      <template v-else>
        <Button variant="outline" :disabled="busy" @click="close">
          {{ t('teacher.missions.adapt.discard') }}
        </Button>
        <Button
          variant="primary"
          :loading="applying"
          :disabled="busy || !plan?.hasChanges"
          @click="apply"
        >
          {{ t('teacher.missions.adapt.apply') }}
        </Button>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { SparklesIcon } from '@heroicons/vue/24/outline'
import type { ClassSettings } from '~/types/class.types'
import { renderMarkdown } from '~/utils/markdown'
import type { MissionEnigmaDetail } from '~/types/mission-detail.types'
import {
  buildAdaptPlan,
  parseAdaptProposal,
  proposalForPrompt,
  type AdaptCurrentEnigma,
  type AdaptProposal,
  type AdaptRow,
} from '~/utils/mission-adapt'

/**
 * «Adaptar con IA» una misión ya guardada a su clase. Su docente dice, si
 * quiere, qué busca; la IA propone título, historia y enigmas para esa clase
 * (la API lee su nivel, asignatura, idioma, mundo y recursos encendidos: tipo
 * `mission.adapt`), y aquí se compara con lo de ahora. Se puede pedir otro
 * cambio (si falla, se conserva la propuesta anterior). Nada se escribe hasta
 * pulsar «Aplicar», y entonces por las rutas de siempre, que dejan cada cambio
 * en el historial. Si la IA falla, se avisa y la misión no cambia.
 */
const props = defineProps<{
  modelValue: boolean
  missionId: string
  className: string
  mission: {
    title: string
    description?: string
    enigmas?: MissionEnigmaDetail[]
    hints?: unknown[]
  }
  classSettings: ClassSettings
}>()

/** Pistas de la misión: la IA no las ve ni las cambia, así que se avisa. */
const hintCount = computed(() => props.mission.hints?.length ?? 0)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Se ha escrito algo (todo o una parte): la página recarga la misión. */
  applied: []
}>()

const { t } = useI18n()
const toast = useToast()
const config = useRuntimeConfig()
const { streamPrompt, generationProgress, isOvertime, remainingTimeLabel } = useAIPrompt()

const request = ref('')
const feedback = ref('')
const raw = ref('')
const proposal = ref<AdaptProposal | null>(null)
const generating = ref(false)
const applying = ref(false)
const errorMessage = ref('')
const busy = computed(() => generating.value || applying.value)

const resources = computed(() => ({
  coins: props.classSettings.coins,
  mana: props.classSettings.mana,
}))
const rewardFlags = computed(() => ({
  showXp: props.classSettings.xp,
  showCoins: props.classSettings.coins,
  showMana: props.classSettings.mana,
}))

const currentEnigmas = computed<AdaptCurrentEnigma[]>(() =>
  (props.mission.enigmas ?? []).map(e => ({
    id: e.id,
    title: e.title,
    description: e.description || '',
    xp: e.xp,
    coins: e.coins ?? 0,
    mana: e.mana ?? 0,
    objectives: e.objectives ?? [],
    completedCount: e.completedCount ?? 0,
    totalSubmissions: e.totalSubmissions ?? 0,
  }))
)

// Contra lo de ahora: si se aplica una parte y la misión se recarga, la
// comparación se rehace sola con lo ya guardado.
const plan = computed(() =>
  proposal.value
    ? buildAdaptPlan(
        {
          title: props.mission.title,
          description: props.mission.description || '',
          enigmas: currentEnigmas.value,
        },
        proposal.value,
        resources.value
      )
    : null
)

function rowStatus(row: AdaptRow): { label: string; tone: 'neutral' | 'new' | 'warning' } | null {
  if (row.kind === 'create') return { label: t('teacher.missions.adapt.row_create'), tone: 'new' }
  if (row.kind === 'delete')
    return { label: t('teacher.missions.adapt.row_delete'), tone: 'warning' }
  if (row.kind === 'keep') return { label: t('teacher.missions.adapt.row_keep'), tone: 'neutral' }
  if (!row.changed) return { label: t('teacher.missions.adapt.unchanged'), tone: 'neutral' }
  return null
}

/** Pide una propuesta a la IA; solo si llega una que se puede usar sustituye a la anterior. */
async function requestProposal(extra: Record<string, string>): Promise<boolean> {
  generating.value = true
  errorMessage.value = ''
  try {
    await streamPrompt(
      'mission.adapt',
      { missionId: props.missionId, brief: request.value.trim().slice(0, 1200), ...extra },
      raw
    )
    const parsed = parseAdaptProposal(raw.value, resources.value)
    if (!parsed) throw new Error('unusable proposal')
    proposal.value = parsed
    return true
  } catch {
    errorMessage.value = proposal.value
      ? t('teacher.missions.adapt.error_kept')
      : t('teacher.missions.adapt.error')
    return false
  } finally {
    generating.value = false
  }
}

async function propose() {
  if (busy.value) return
  await requestProposal({})
}

async function askChange() {
  const fb = feedback.value.trim()
  if (busy.value || !fb || !proposal.value) return
  const ok = await requestProposal({
    previousProposal: proposalForPrompt(proposal.value),
    feedback: fb.slice(0, 600),
  })
  if (ok) feedback.value = ''
}

/** Escribe la propuesta por las rutas de siempre (que dejan los cambios en el historial). */
async function apply() {
  const current = plan.value
  if (busy.value || !current?.hasChanges) return
  applying.value = true
  errorMessage.value = ''
  const base = `${config.public.apiBase}/missions/${props.missionId}`
  let wrote = false
  try {
    if (current.titleChanged || current.descriptionChanged) {
      await $fetch(base, {
        method: 'PATCH',
        body: { title: current.title, description: current.description },
      })
      wrote = true
    }
    // Primero se cambian y se añaden; lo que sobra se borra al final, para que
    // la misión no se quede nunca sin enigmas por el camino.
    for (const row of current.rows) {
      if (row.kind === 'update' && row.changed && row.current && row.proposed) {
        await $fetch(`${base}/enigmas/${row.current.id}`, {
          method: 'PUT',
          body: enigmaBody(row.proposed),
        })
        wrote = true
      }
    }
    for (const row of current.rows) {
      if (row.kind === 'create' && row.proposed) {
        await $fetch(`${base}/enigmas`, {
          method: 'POST',
          body: { ...enigmaBody(row.proposed), isOptional: false },
        })
        wrote = true
      }
    }
    for (const row of current.rows) {
      if (row.kind === 'delete' && row.current) {
        await $fetch(`${base}/enigmas/${row.current.id}`, { method: 'DELETE' })
        wrote = true
      }
    }
    toast.success(t('teacher.missions.adapt.applied'))
    emit('applied')
    emit('update:modelValue', false)
  } catch (err) {
    const message = (err as { data?: { message?: string } })?.data?.message
    errorMessage.value = wrote
      ? t('teacher.missions.adapt.apply_error_partial')
      : message || t('teacher.missions.adapt.apply_error')
    // Lo que sí se guardó tiene que verse: la página recarga la misión.
    if (wrote) emit('applied')
  } finally {
    applying.value = false
  }
}

function enigmaBody(e: AdaptProposal['enigmas'][number]) {
  return {
    title: e.title,
    description: e.description,
    xp: e.xp,
    coins: e.coins,
    mana: e.mana,
    objectives: e.objectives,
  }
}

function close() {
  if (busy.value) return
  emit('update:modelValue', false)
}

// Cada vez que se abre, desde cero.
watch(
  () => props.modelValue,
  open => {
    if (!open) return
    request.value = ''
    feedback.value = ''
    raw.value = ''
    proposal.value = null
    errorMessage.value = ''
  }
)
</script>
