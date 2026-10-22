<template>
  <!-- Paso 1: qué se aplica y a quién -->
  <Modal
    :model-value="modelValue && step === 'pick'"
    :title="
      title ??
      (target === 'team'
        ? t('teacher.classroom.team.modal_title')
        : t('teacher.classroom.modal_title'))
    "
    size="lg"
    sticky-chrome
    fit-content
    @update:model-value="close"
  >
    <!-- Primero a quién, después qué; al premiar a un equipo, al final sus puntos -->
    <div class="space-y-8">
      <section class="space-y-3" :aria-labelledby="`${uid}-who`">
        <h3 :id="`${uid}-who`" class="text-base font-bold text-navy-700">
          {{ t('teacher.classroom.target_label') }}
        </h3>
        <!-- A quién: a estudiantes o, si la clase tiene equipos, a un equipo -->
        <OptionPillGroup
          v-if="teamOptions.length && !fixedRecipients"
          v-model="target"
          :options="targetOptions"
          :aria-label="t('teacher.classroom.target_label')"
        />

        <!-- Con destino fijado (la ruleta), solo a quién va -->
        <p v-if="target === 'students' && fixedRecipients" class="text-sm text-navy-700">
          {{ t('teacher.classroom.fixed_to', { names: chosen.map(s => s.name).join(', ') }) }}
        </p>
        <StudentPicker v-else-if="target === 'students'" v-model="selection" :students="students">
          <template #filters="{ select }">
            <slot name="filters" :select="select" />
          </template>
        </StudentPicker>

        <!-- A un equipo: cuál -->
        <template v-else>
          <fieldset class="min-w-0">
            <legend class="mb-2 text-sm font-medium text-navy-700">
              {{ t('teacher.classroom.team.legend') }}
            </legend>
            <div class="max-h-56 space-y-1 overflow-y-auto scrollbar-subtle pr-1">
              <label
                v-for="team in listedTeams"
                :key="team.id"
                class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors"
                :class="
                  teamId === team.id ? 'border-navy-700/40 bg-navy-700/5' : 'border-border-primary'
                "
              >
                <input
                  v-model="teamId"
                  type="radio"
                  :name="`${uid}-team`"
                  :value="team.id"
                  class="h-4 w-4 flex-shrink-0 accent-navy-700"
                />
                <!-- En el móvil, la agrupación debajo: así no se corta el nombre del equipo -->
                <span class="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
                  <TeamBadge
                    :title="team.title"
                    :color="team.color"
                    :emblem="team.emblem"
                    :index="team.index"
                    size="sm"
                    class="min-w-0 sm:flex-1"
                  />
                  <span class="text-xs text-navy-700/70 sm:flex-shrink-0">
                    {{ team.setTitle }} ·
                    {{
                      t(
                        'teacher.teams.members_count',
                        { count: team.studentIds.length },
                        team.studentIds.length
                      )
                    }}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        </template>
      </section>

      <!-- Qué: un comportamiento o una recompensa libre (salvo que venga dado) -->
      <section v-if="!behavior" class="space-y-3" :aria-labelledby="`${uid}-what`">
        <h3 :id="`${uid}-what`" class="text-base font-bold text-navy-700">
          {{ t('teacher.classroom.mode_label') }}
        </h3>
        <OptionPillGroup
          v-if="!behavior && canBehavior && canReward"
          v-model="mode"
          :options="modeOptions"
          :aria-label="t('teacher.classroom.mode_label')"
        />

        <!-- Comportamiento del catálogo -->
        <fieldset v-if="mode === 'behavior' && !behavior" class="min-w-0">
          <legend class="mb-2 text-sm font-medium text-navy-700">
            {{ t('teacher.classroom.behavior_legend') }}
          </legend>
          <p v-if="!behaviors.length" class="text-sm text-text-secondary">
            {{ t('teacher.classroom.no_behaviors') }}
          </p>
          <div v-else class="max-h-56 space-y-1 overflow-y-auto scrollbar-subtle pr-1">
            <label
              v-for="b in behaviors"
              :key="b.id"
              class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors"
              :class="
                behaviorId === b.id ? 'border-navy-700/40 bg-navy-700/5' : 'border-border-primary'
              "
            >
              <input
                v-model="behaviorId"
                type="radio"
                :name="`${uid}-behavior`"
                :value="b.id"
                class="h-4 w-4 flex-shrink-0 accent-navy-700"
              />
              <component
                :is="b.kind === 'positive' ? HandThumbUpIcon : HandThumbDownIcon"
                class="h-4 w-4 flex-shrink-0"
                :class="b.kind === 'positive' ? 'text-navy-700' : 'text-red'"
                aria-hidden="true"
              />
              <!-- En el móvil, lo que mueve debajo: así no se corta el nombre -->
              <span class="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
                <span class="min-w-0 truncate font-medium text-navy-700 sm:flex-1">{{
                  b.name
                }}</span>
                <span class="text-xs text-navy-700/70 sm:flex-shrink-0">{{
                  deltasText(signedOf(b))
                }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <!-- Recompensa libre: dar o quitar, cuánto y por qué -->
        <fieldset v-if="mode === 'reward'" class="min-w-0 space-y-3">
          <legend class="mb-2 text-sm font-medium text-navy-700">
            {{ t('teacher.classroom.reward.legend') }}
          </legend>
          <OptionPillGroup
            v-model="reward.direction"
            :options="directionOptions"
            :aria-label="t('teacher.classroom.reward.direction_label')"
          />
          <div v-if="resourceFields.length && rewardMoves" class="grid grid-cols-2 gap-2">
            <label v-for="field in resourceFields" :key="field.key" class="relative block">
              <span class="sr-only">{{ field.label }}</span>
              <component
                :is="field.icon"
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                v-model.number="reward.amounts[field.key]"
                type="number"
                min="0"
                max="10000"
                inputmode="numeric"
                :placeholder="field.label"
                class="w-full rounded-xl border border-border-primary py-2.5 pl-9 pr-3 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
              />
            </label>
          </div>
          <p v-else-if="!resourceFields.length" class="text-sm text-text-secondary">
            {{ t('teacher.classroom.reward.no_resources') }}
          </p>
          <FormField
            :id="`${uid}-reason`"
            v-model="reward.reason"
            :label="t('teacher.classroom.reward.reason')"
            :placeholder="t('teacher.classroom.reward.reason_placeholder')"
            :error-message="
              reasonTooLong ? t('teacher.classroom.reward.reason_too_long') : undefined
            "
            required
          />
        </fieldset>
      </section>

      <!-- Premiar a un equipo: puntos para su marcador y, si se quiere, el reparto -->
      <section v-if="target === 'team'" class="space-y-4">
        <FormField
          :id="`${uid}-points`"
          v-model="teamAward.points"
          type="number"
          class="sm:max-w-xs"
          :label="t('teacher.classroom.team.points')"
          :hint="t('teacher.classroom.team.points_hint')"
        />
        <div>
          <Checkbox
            :id="`${uid}-distribute`"
            v-model="teamAward.distribute"
            :label="t('teacher.classroom.team.distribute')"
            :described-by="`${uid}-distribute-hint`"
          />
          <p :id="`${uid}-distribute-hint`" class="mt-1 text-sm text-text-muted">
            {{ t('teacher.classroom.team.distribute_hint') }}
          </p>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-end gap-3">
        <!-- Si aún no se puede seguir, qué falta -->
        <p
          v-if="missingHint"
          class="w-full min-w-0 text-sm text-navy-700/80 sm:mr-auto sm:w-auto"
          aria-live="polite"
        >
          {{ missingHint }}
        </p>
        <Button variant="outline" @click="close">{{ t('common.actions.cancel') }}</Button>
        <!-- A una sola persona (o solo los puntos de un equipo) se aplica ya; a
             varias, antes se confirma -->
        <Button
          variant="primary"
          :disabled="!canContinue"
          :loading="applying && step === 'pick'"
          @click="next"
        >
          {{
            needsConfirm ? t('teacher.classroom.continue') : t('teacher.classroom.confirm_button')
          }}
        </Button>
      </div>
    </template>
  </Modal>

  <!-- Paso 2: confirmación, siempre (requisito de la propuesta) -->
  <ConfirmModal
    :model-value="modelValue && step === 'confirm'"
    :title="t('teacher.classroom.confirm_title')"
    :message="confirmMessage"
    :confirm-text="t('teacher.classroom.confirm_button')"
    :cancel-text="t('teacher.classroom.back')"
    :variant="isPositive ? 'success' : 'warning'"
    :loading="applying"
    @confirm="apply"
    @update:model-value="backToPick"
  >
    <div v-if="target === 'students' || teamAward.distribute" class="text-left">
      <Button
        size="sm"
        variant="ghost"
        :icon-right="showWho ? ChevronUpIcon : ChevronDownIcon"
        :aria-expanded="showWho"
        :aria-controls="`${uid}-who-list`"
        @click="showWho = !showWho"
      >
        {{ t('teacher.classroom.confirm_who', { count: chosen.length }) }}
      </Button>
      <ul
        v-if="showWho"
        :id="`${uid}-who-list`"
        class="mt-2 max-h-56 space-y-2 overflow-y-auto scrollbar-subtle pr-1"
      >
        <li v-for="s in chosen" :key="s.id">
          <StudentCheckRow
            :id="`${uid}-who-${s.id}`"
            :name="s.name"
            :avatar="s.avatar"
            :hint="s.hint"
          />
        </li>
      </ul>
    </div>
  </ConfirmModal>
</template>

<script setup lang="ts">
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/vue/24/solid'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'
import XpIcon from '~/components/atoms/XpIcon.vue'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'
import type { PickerStudent } from '~/components/molecules/StudentPicker.vue'
import type { Behavior, BatchResult, ResourceDeltas } from '~/stores/behaviors'
import type { ClassSettings } from '~/types/class.types'
import type { TeamAwardResult } from '~/types/team.types'

/**
 * Aplicar algo a varios estudiantes a la vez: un comportamiento del catálogo o
 * una recompensa libre (dar o quitar XP, monedas, maná o vidas con un motivo).
 * Elegir qué y a quién (con `StudentPicker`) y aplicar. A varias personas a la
 * vez, antes se confirma con el resumen y la lista de nombres; a una sola (la
 * que sale en la ruleta) o solo puntos al marcador de un equipo, se aplica ya.
 *
 * Lo usan la pestaña de comportamientos (con el comportamiento ya elegido), la
 * selección del listado de estudiantes y «Aplicar a los presentes/ausentes» de
 * pasar lista (con la selección hecha). La ranura `filters` llega al selector.
 *
 * Con `canTeam` y equipos en la clase, también se premia a un equipo: suma
 * puntos a su marcador y, si se elige, reparte lo mismo a cada integrante.
 *
 * La ruleta la abre con `fixedRecipients`: a quien ha salido, o a su equipo.
 */
type Mode = 'behavior' | 'reward'
type Target = 'students' | 'team'
type ResourceKey = keyof ResourceDeltas

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    classId: string
    students: PickerStudent[]
    settings: ClassSettings
    /** Comportamiento ya elegido: sin selector ni recompensa libre. */
    behavior?: Behavior | null
    /** Selección con la que se abre. */
    initialSelection?: string[]
    initialMode?: Mode
    canBehavior?: boolean
    canReward?: boolean
    /** Puede premiar a un equipo (`team.award`). */
    canTeam?: boolean
    /** Equipo con el que se abre: la ventana sale ya en «A un equipo». */
    initialTeamId?: string | null
    /**
     * A quién va lo decide quien abre (la ruleta, con quien ha salido): sin
     * selector ni cambio de destino; con equipo, solo ese equipo.
     */
    fixedRecipients?: boolean
    title?: string
  }>(),
  {
    behavior: null,
    initialSelection: () => [],
    initialMode: 'behavior',
    canBehavior: true,
    canReward: true,
    canTeam: false,
    initialTeamId: null,
    fixedRecipients: false,
    title: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  /** Saldos nuevos: del lote, o del reparto de un premio de equipo. */
  applied: [result: BatchResult]
  awarded: [result: TeamAwardResult]
}>()

const { t } = useI18n()
const { coinLabel } = useCoinLabel()
const toast = useToast()
const effects = useEffects()
const store = useBehaviorsStore()
const uid = `classroom-${useId()}`.replace(/[^\w-]/g, '-')

const step = ref<'pick' | 'confirm'>('pick')
const mode = ref<Mode>('behavior')
const behaviorId = ref<string | null>(null)
const selection = ref<string[]>([])
const reward = reactive({
  direction: 'give' as 'give' | 'take',
  amounts: { xp: undefined, coins: undefined, mana: undefined, lives: undefined } as Record<
    ResourceKey,
    number | undefined
  >,
  reason: '' as string | number,
})
const applying = ref(false)

const teams = useClassTeams(() => props.classId)
const target = ref<Target>('students')
const teamId = ref<string | null>(null)
const teamAward = reactive({ points: 10 as number | string, distribute: true })
const teamOptions = computed(() => (props.canTeam ? teams.teamOptions.value : []))
const chosenTeam = computed(() => teamOptions.value.find(t => t.id === teamId.value) ?? null)
const listedTeams = computed(() =>
  props.fixedRecipients
    ? teamOptions.value.filter(team => team.id === props.initialTeamId)
    : teamOptions.value
)

const behaviors = computed(() =>
  props.settings.behaviors ? store.getBehaviors(props.classId) : []
)

// Cada vez que se abre, desde cero con lo que trae quien la abre.
watch(
  () => props.modelValue,
  open => {
    if (!open) return
    step.value = 'pick'
    mode.value =
      props.behavior || !props.canReward
        ? 'behavior'
        : !props.canBehavior || !props.settings.behaviors
          ? 'reward'
          : props.initialMode
    behaviorId.value = props.behavior?.id ?? null
    selection.value = [...props.initialSelection]
    reward.direction = 'give'
    reward.amounts = { xp: undefined, coins: undefined, mana: undefined, lives: undefined }
    reward.reason = ''
    target.value = props.canTeam && props.initialTeamId ? 'team' : 'students'
    teamId.value = props.initialTeamId
    teamAward.points = 10
    teamAward.distribute = true
    // Sin comportamientos en la clase, se abre ya en «Recompensa libre».
    if (!props.behavior && props.settings.behaviors) {
      void store.ensureBehaviors(props.classId).then(() => {
        if (mode.value === 'behavior' && !behaviors.value.length && props.canReward) {
          mode.value = 'reward'
        }
      })
    }
    if (props.canTeam) void teams.ensure()
  },
  { immediate: true }
)

const modeOptions = computed(() => [
  { value: 'behavior' as Mode, label: t('teacher.classroom.mode_behavior') },
  { value: 'reward' as Mode, label: t('teacher.classroom.mode_reward') },
])
const targetOptions = computed(() => [
  { value: 'students' as Target, label: t('teacher.classroom.target_students') },
  { value: 'team' as Target, label: t('teacher.classroom.target_team') },
])
const directionOptions = computed(() => [
  { value: 'give' as const, label: t('teacher.classroom.reward.give') },
  { value: 'take' as const, label: t('teacher.classroom.reward.take') },
])

const RESOURCES: { key: ResourceKey; icon: Component; setting: keyof ClassSettings }[] = [
  { key: 'xp', icon: XpIcon, setting: 'xp' },
  { key: 'coins', icon: CoinIcon, setting: 'coins' },
  { key: 'mana', icon: ManaIcon, setting: 'mana' },
  { key: 'lives', icon: LifeIcon, setting: 'lives' },
]

function resourceLabel(key: ResourceKey): string {
  return key === 'coins' ? coinLabel.value : t(`common.resources.${key}`)
}

/** Los recursos que la clase tiene encendidos: los únicos que se ofrecen. */
const resourceFields = computed(() =>
  RESOURCES.filter(r => props.settings[r.setting]).map(r => ({ ...r, label: resourceLabel(r.key) }))
)

/** Deltas con signo de una plantilla, sin los recursos apagados (como hace la API). */
function signedOf(b: Behavior): ResourceDeltas {
  const sign = b.kind === 'positive' ? 1 : -1
  const s = props.settings
  return {
    xp: s.xp ? (b.xp ?? 0) * sign : 0,
    coins: s.coins ? (b.coins ?? 0) * sign : 0,
    mana: s.mana ? (b.mana ?? 0) * sign : 0,
    lives: s.lives ? (b.lives ?? 0) * sign : 0,
  }
}

const chosenBehavior = computed(
  () => props.behavior ?? behaviors.value.find(b => b.id === behaviorId.value) ?? null
)

const rewardDeltas = computed<ResourceDeltas>(() => {
  const sign = reward.direction === 'give' ? 1 : -1
  const amount = (key: ResourceKey) => {
    const value = Math.round(Number(reward.amounts[key]) || 0)
    return props.settings[key] ? Math.min(10_000, Math.max(0, value)) * sign : 0
  }
  return { xp: amount('xp'), coins: amount('coins'), mana: amount('mana'), lives: amount('lives') }
})

const deltas = computed<ResourceDeltas | null>(() => {
  if (mode.value === 'reward') return rewardDeltas.value
  return chosenBehavior.value ? signedOf(chosenBehavior.value) : null
})

const isPositive = computed(() =>
  mode.value === 'reward' ? reward.direction === 'give' : chosenBehavior.value?.kind !== 'negative'
)

/** «+10 XP, +5 Itacoins»: solo lo que se mueve, con su signo. */
function deltasText(d: ResourceDeltas | null): string {
  if (!d) return ''
  return RESOURCES.filter(r => d[r.key] !== 0)
    .map(r => `${d[r.key] > 0 ? '+' : '−'}${Math.abs(d[r.key])} ${resourceLabel(r.key)}`)
    .join(', ')
}

const reasonText = computed(() => String(reward.reason).trim())
const reasonTooLong = computed(() => reasonText.value.length > 80)

const actionTitle = computed(() =>
  mode.value === 'reward' ? reasonText.value : (chosenBehavior.value?.name ?? '')
)

/** Al premiar a un equipo sin reparto, los recursos no cuentan: solo los puntos. */
const rewardMoves = computed(() => target.value === 'students' || teamAward.distribute)

/** Puntos del premio de equipo, con el signo de lo que se aplica (dar o quitar). */
const teamPoints = computed(() => {
  const value = Math.min(1000, Math.max(0, Math.round(Number(teamAward.points) || 0)))
  return isPositive.value ? value : -value
})

/** Por qué aún no se puede seguir, en el mismo orden en que se comprueba. */
const missingHint = computed(() => {
  if (canContinue.value) return ''
  const m = (key: string) => t(`teacher.classroom.missing.${key}`)
  const distributeLabel = t('teacher.classroom.team.distribute')
  if (target.value === 'team' ? !chosenTeam.value : !selection.value.length) {
    return m(target.value === 'team' ? 'team' : 'students')
  }
  if (mode.value === 'behavior' && !chosenBehavior.value) {
    return m(behaviors.value.length ? 'behavior' : 'no_behaviors')
  }
  if (mode.value === 'reward' && !reasonText.value) return m('reason')
  if (reasonTooLong.value) return t('teacher.classroom.reward.reason_too_long')
  if (target.value === 'team' && !teamAward.distribute) {
    return t('teacher.classroom.missing.points', { label: distributeLabel })
  }
  if (target.value === 'team' && !chosen.value.length) {
    return t('teacher.classroom.missing.empty_team', { label: distributeLabel })
  }
  return m('amount')
})

const canContinue = computed(() => {
  const what =
    mode.value === 'behavior'
      ? !!chosenBehavior.value
      : reasonText.value.length > 0 && !reasonTooLong.value
  if (!what) return false
  const d = rewardDeltas.value
  const moves = d.xp !== 0 || d.coins !== 0 || d.mana !== 0 || d.lives !== 0
  if (target.value === 'team') {
    if (!chosenTeam.value) return false
    if (!teamAward.distribute) return teamPoints.value !== 0
    return chosen.value.length > 0 && (mode.value === 'behavior' || moves)
  }
  return selection.value.length > 0 && (mode.value === 'behavior' || moves)
})

const chosen = computed(() => {
  const wanted = new Set(
    target.value === 'team' ? (chosenTeam.value?.studentIds ?? []) : selection.value
  )
  return props.students.filter(s => wanted.has(s.id))
})

const confirmMessage = computed(() => {
  if (target.value === 'team') return teamConfirmMessage.value
  const effect = deltasText(deltas.value)
  const params = { title: actionTitle.value, count: chosen.value.length }
  const base =
    mode.value === 'reward'
      ? t('teacher.classroom.confirm_reward', params, chosen.value.length)
      : t('teacher.classroom.confirm_behavior', params, chosen.value.length)
  return effect
    ? `${base} ${t('teacher.classroom.confirm_effect', { effect })}`
    : `${base} ${t('teacher.classroom.confirm_no_effect')}`
})

const teamConfirmMessage = computed(() => {
  const team = chosenTeam.value?.title ?? ''
  const points = Math.abs(teamPoints.value)
  const head =
    teamPoints.value !== 0
      ? t(
          'teacher.classroom.team.confirm_points',
          { team, points: `${teamPoints.value > 0 ? '+' : '−'}${points}` },
          points
        )
      : t('teacher.classroom.team.confirm_no_points', { team })
  if (!teamAward.distribute) return `${head} ${t('teacher.classroom.team.confirm_no_distribute')}`
  const count = chosen.value.length
  const share = t(
    'teacher.classroom.team.confirm_distribute',
    { title: actionTitle.value, count },
    count
  )
  const effect = deltasText(deltas.value)
  return effect
    ? `${head} ${share} ${t('teacher.classroom.confirm_effect', { effect })}`
    : `${head} ${share} ${t('teacher.classroom.confirm_no_effect')}`
})

function close() {
  if (applying.value) return
  emit('update:modelValue', false)
}

/** A varias personas a la vez se confirma antes; a una sola, no hace falta. */
const needsConfirm = computed(() =>
  target.value === 'team'
    ? teamAward.distribute && chosen.value.length > 1
    : selection.value.length > 1
)
const showWho = ref(false)
function next() {
  if (!canContinue.value) return
  if (!needsConfirm.value) return void apply()
  showWho.value = false
  step.value = 'confirm'
}

// «Volver», Escape y la X de la confirmación llevan al paso 1 con la selección
// intacta; mientras se aplica, no se mueve nada.
function backToPick(open: boolean) {
  if (!open && !applying.value) step.value = 'pick'
}

async function apply() {
  if (applying.value || !canContinue.value) return
  applying.value = true
  if (target.value === 'team') {
    await awardTeam()
    return
  }
  try {
    const result =
      mode.value === 'reward'
        ? await store.grantRewards(props.classId, {
            studentIds: selection.value,
            reason: reasonText.value,
            ...rewardDeltas.value,
          })
        : await store.applyMany(props.classId, chosenBehavior.value!.id, selection.value)
    toast.success(
      t(
        'teacher.classroom.applied_toast',
        { title: actionTitle.value, count: result.count },
        result.count
      )
    )
    // Un solo efecto por lote, no uno por estudiante.
    effects.play(isPositive.value ? 'behavior_positive' : 'behavior_negative', {
      settings: props.settings,
    })
    emit('applied', result)
    emit('update:modelValue', false)
  } catch {
    toast.error(t('teacher.classroom.apply_error'))
  } finally {
    applying.value = false
  }
}

async function awardTeam() {
  const team = chosenTeam.value!
  try {
    const result = await teams.award(team.id, {
      ...(mode.value === 'reward'
        ? { title: reasonText.value, ...(teamAward.distribute ? rewardDeltas.value : {}) }
        : { behaviorId: chosenBehavior.value!.id }),
      points: teamPoints.value,
      distribute: teamAward.distribute,
    })
    toast.success(t('teacher.classroom.team.awarded_toast', { team: team.title }))
    effects.play(isPositive.value ? 'behavior_positive' : 'behavior_negative', {
      settings: props.settings,
    })
    if (result.batch) emit('applied', result.batch)
    emit('awarded', result)
    emit('update:modelValue', false)
  } catch {
    toast.error(t('teacher.classroom.apply_error'))
  } finally {
    applying.value = false
  }
}
</script>
