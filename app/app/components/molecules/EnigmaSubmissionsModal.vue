<script setup lang="ts">
import { ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon } from '@heroicons/vue/24/solid'
import { formatNotificationDate, formatNotificationTime } from '~/utils/notifications'
import type { TeamColor, TeamEmblem } from '~/types/team.types'
import { rewardAfterHints } from '~/utils/mission-hints'
import { studentAvatarSeed } from '~/utils/avatar'

interface Enigma {
  id: string
  title: string
  xp: number
  coins?: number
  mana?: number
  status: 'disponible' | 'pendiente' | 'completado'
  submissionsCount?: number
}

interface Submission {
  id: string
  student: {
    id: string
    name: string
    avatar?: string
  }
  status: 'pendiente' | 'aprobada'
  /** En una misión por equipos, el equipo de quien entregó. */
  team?: { id: string; title: string; color: TeamColor | null; emblem: TeamEmblem | null } | null
  /** % que restan sus pistas de % en lo que la misión le queda por pagar (0 sin ellas). */
  hintPenalty?: number
  fileName?: string
  hasFile?: boolean
  fileSize?: number
  xpAwarded?: number
  submittedAt: string
  reviewedAt?: string
}

interface Props {
  enigma: Enigma | null
  classId?: string
  // Hide a reward badge when that resource is disabled for the class.
  showXp?: boolean
  showCoins?: boolean
  showMana?: boolean
  /** Aprobar pide edición en la clase; sin ella las entregas se ven y se descargan. */
  canApprove?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'approve', data: { submissionId: string; xpPercentage: number }): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  classId: undefined,
  showXp: true,
  showCoins: true,
  showMana: true,
  canApprove: true,
})
const emit = defineEmits<Emits>()

const config = useRuntimeConfig()
const toast = useToast()
const { downloadSubmission } = useProtectedFiles()
const { t, locale } = useI18n()
const effects = useEffects()

// State
const submissions = ref<Submission[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const editingSubmissionId = ref<string | null>(null)
const selectedPct = ref<number>(100)
const approvedIds = ref<Set<string>>(new Set())
/** Misión por equipos: la agrupación con la que se hace. */
const teamSet = ref<{ id: string; title: string } | null>(null)
const approvingTeam = ref(false)

// Fetch submissions when enigma changes
watch(
  () => props.enigma,
  async enigma => {
    if (enigma) {
      await fetchSubmissions(enigma.id)
    } else {
      submissions.value = []
      approvedIds.value = new Set()
    }
  },
  { immediate: true }
)

const fetchSubmissions = async (enigmaId: string) => {
  loading.value = true
  error.value = null
  try {
    const response = await $fetch<{
      enigma?: { teamSet?: { id: string; title: string } | null }
      submissions: Submission[]
      total: number
      pending: number
    }>(`${config.public.apiBase}/submissions/teacher/enigmas/${enigmaId}`)
    submissions.value = response.submissions || []
    teamSet.value = response.enigma?.teamSet ?? null
  } catch (err: any) {
    console.error('Error fetching submissions:', err)
    error.value = err.data?.message || t('teacher.components.enigma_submissions_modal.load_error')
    submissions.value = []
  } finally {
    loading.value = false
  }
}

// Filter pending submissions (excluding just-approved ones)
const pendingSubmissions = computed(() =>
  submissions.value.filter(s => s.status === 'pendiente' && !approvedIds.value.has(s.id))
)

// El profesor marca el % de la tarea completada; ese % se aplica por igual a
// todas las recompensas del enigma (XP, monedas y maná).
const pctPresets = [25, 50, 75, 100]

// Recompensas base del enigma en revisión (vienen del backend en el enigma).
const baseRewards = computed(() => {
  const e = props.enigma
  if (!e) return { xp: 0, coins: 0, mana: 0 }
  return {
    xp: e.xp,
    coins: e.coins ?? 0,
    mana: e.mana ?? 0,
  }
})

// Recompensas que recibirá cada estudiante con el % seleccionado y el descuento
// de sus pistas, con la misma cuenta que la API.
const awardedFor = (submission: Submission) => {
  const pct = selectedPct.value || 0
  const penalty = submission.hintPenalty ?? 0
  return {
    xp: rewardAfterHints(baseRewards.value.xp, pct, penalty),
    coins: rewardAfterHints(baseRewards.value.coins, pct, penalty),
    mana: rewardAfterHints(baseRewards.value.mana, pct, penalty),
  }
}

/** Alguien del equipo de esta entrega recibirá menos por sus pistas. */
const teamHasHintPenalty = (submission: Submission) =>
  teamPending(submission).some(s => (s.hintPenalty ?? 0) > 0)

// Mantener el porcentaje como entero entre 0 y 100.
watch(selectedPct, val => {
  if (val === null || val === undefined || !Number.isFinite(val)) return
  const clamped = Math.min(100, Math.max(0, Math.round(val)))
  if (clamped !== val) selectedPct.value = clamped
})

const chipClass = (active: boolean) =>
  [
    'h-8 px-3 rounded-lg text-sm font-medium transition-colors border',
    active
      ? 'bg-navy-700 border-navy-700 text-white'
      : 'bg-white border-gray-200 text-navy-700 hover:border-navy-700/40',
  ].join(' ')

// Actions
const startEditing = (submission: Submission) => {
  editingSubmissionId.value = submission.id
  selectedPct.value = 100
}

const cancelEditing = () => {
  editingSubmissionId.value = null
  selectedPct.value = 100
}

const handleApprove = async (submission: Submission) => {
  if (!props.enigma) return

  // Capturar el porcentaje antes de resetearlo. Las recompensas las decide la API.
  const pct = selectedPct.value

  try {
    const response = await $fetch<{ xpAwarded: number; hintPenalty?: number }>(
      `${config.public.apiBase}/submissions/${submission.id}/approve`,
      { method: 'POST', body: { percentage: pct } }
    )

    // Mark as approved locally
    approvedIds.value.add(submission.id)
    cancelEditing()

    // Emit refresh to update parent
    emit('refresh')

    // La API aprueba con el descuento de ese momento: si ha usado otra pista de %
    // con la ventana abierta, lo que ha recibido no es lo que se veía, y se dice.
    const penalty = response.hintPenalty ?? 0
    if (penalty !== (submission.hintPenalty ?? 0)) {
      toast.info(
        t('teacher.components.enigma_submissions_modal.penalty_changed', {
          name: submission.student.name,
          xp: response.xpAwarded,
          count: penalty,
        })
      )
    } else {
      toast.success(
        t('common.toast.submission_student_approved', {
          name: submission.student.name,
          xp: response.xpAwarded,
        })
      )
    }
    // Feedback al profe por aprobar (sparkle + success).
    effects.play('enigma_approved')
  } catch (err: any) {
    console.error('Error approving submission:', err)
    toast.error(err.data?.message || t('teacher.components.enigma_submissions_modal.approve_error'))
  }
}

/** Entregas pendientes del mismo equipo que esta (ella incluida). */
const teamPending = (submission: Submission) =>
  submission.team ? pendingSubmissions.value.filter(s => s.team?.id === submission.team!.id) : []

// Misiones por equipos: el mismo % a la entrega pendiente de cada integrante del
// equipo. Cada aprobación es la de siempre (recompensas, avisos e historial).
const handleApproveTeam = async (submission: Submission) => {
  if (!props.enigma || !submission.team || approvingTeam.value) return
  const pct = selectedPct.value
  approvingTeam.value = true
  try {
    // Lo que restaban las pistas de cada cual al abrir la ventana, para compararlo.
    const shown = new Map(teamPending(submission).map(s => [s.id, s.hintPenalty ?? 0]))
    const result = await $fetch<{
      approved: { submissionId: string; hintPenalty?: number }[]
    }>(`${config.public.apiBase}/submissions/${submission.id}/approve-team`, {
      method: 'POST',
      body: { percentage: pct },
    })
    for (const a of result.approved) approvedIds.value.add(a.submissionId)
    const penaltyChanged = result.approved.some(
      a => shown.has(a.submissionId) && (a.hintPenalty ?? 0) !== shown.get(a.submissionId)
    )
    cancelEditing()
    emit('refresh')
    toast.success(
      t(
        'teacher.components.enigma_submissions_modal.team_approved',
        { team: submission.team.title, count: result.approved.length, pct },
        result.approved.length
      )
    )
    if (penaltyChanged) {
      toast.info(t('teacher.components.enigma_submissions_modal.team_penalty_changed'))
    }
    effects.play('enigma_approved')
  } catch (err) {
    const message = (err as { data?: { message?: string } }).data?.message
    toast.error(message || t('teacher.components.enigma_submissions_modal.approve_error'))
    // Alguna pudo aprobarse antes del fallo: se vuelve a leer la lista.
    if (props.enigma) await fetchSubmissions(props.enigma.id)
  } finally {
    approvingTeam.value = false
  }
}

// «hace 2 horas» en el idioma de la interfaz; la fecha completa, al pasar por encima.
const formatDate = (dateStr: string) => formatNotificationTime(dateStr, locale.value)
const formatFullDate = (dateStr: string) => formatNotificationDate(dateStr, locale.value)

// Modal open state
const isOpen = computed(() => !!props.enigma)

const handleClose = () => {
  emit('close')
}

// Reset when modal closes
watch(
  () => props.enigma,
  newVal => {
    if (!newVal) {
      editingSubmissionId.value = null
      selectedPct.value = 100
      approvedIds.value = new Set()
    }
  }
)
</script>

<template>
  <Modal
    :model-value="isOpen"
    :title="enigma?.title || t('teacher.components.enigma_submissions_modal.title_fallback')"
    size="lg"
    theme="light"
    @update:model-value="handleClose"
  >
    <template #header="{ titleId }">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <h3 :id="titleId" class="text-xl font-bold text-navy-700 truncate">{{ enigma?.title }}</h3>
        <div v-if="enigma" class="flex items-center gap-1.5 flex-shrink-0">
          <span
            v-if="showXp"
            class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-light text-navy-700"
          >
            <XpIcon class="w-3 h-3" />{{ baseRewards.xp }} XP
          </span>
          <span
            v-if="baseRewards.coins && showCoins"
            class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-light text-navy-700"
          >
            <CoinIcon class="w-3 h-3" />{{ baseRewards.coins }}
          </span>
          <span
            v-if="baseRewards.mana && showMana"
            class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-sky-light text-navy-700"
          >
            <ManaIcon class="w-3 h-3" />{{ baseRewards.mana }}
          </span>
        </div>
      </div>
    </template>

    <div class="flex flex-col min-h-[500px]">
      <InfoNote v-if="teamSet && canApprove" class="mb-4">
        {{ t('teacher.components.enigma_submissions_modal.team_note', { set: teamSet.title }) }}
      </InfoNote>
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex items-center justify-center py-8">
        <div class="text-center">
          <p class="text-red-500 font-semibold">{{ error }}</p>
          <Button variant="outline" size="sm" class="mt-2" @click="fetchSubmissions(enigma!.id)">
            {{ t('teacher.components.enigma_submissions_modal.retry') }}
          </Button>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="pendingSubmissions.length === 0"
        class="flex items-center justify-center flex-1"
      >
        <div class="text-center">
          <div
            class="w-16 h-16 rounded-full bg-mint/20 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircleIcon class="w-8 h-8 text-mint" />
          </div>
          <p class="text-navy-700 font-semibold">
            {{ t('teacher.components.enigma_submissions_modal.empty') }}
          </p>
        </div>
      </div>

      <!-- Student list -->
      <div v-else class="space-y-3 overflow-y-auto pr-1 min-h-[500px] max-h-[800px]">
        <div
          v-for="submission in pendingSubmissions"
          :key="submission.id"
          class="rounded-xl border border-gray-200 overflow-hidden bg-white hover:bg-gray-50 transition-colors"
        >
          <!-- Student row: en una ventana estrecha, las acciones bajan a su línea -->
          <div class="p-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <!-- Avatar -->
            <Avatar
              :src="submission.student.avatar"
              :name="submission.student.name"
              :seed="studentAvatarSeed(classId, submission.student.id)"
              size="sm"
            />

            <!-- Info -->
            <div class="flex-1 min-w-[9rem]">
              <p class="font-bold text-navy-700 text-base">{{ submission.student.name }}</p>
              <TeamBadge
                v-if="submission.team"
                :title="submission.team.title"
                :color="submission.team.color"
                :emblem="submission.team.emblem"
                size="sm"
                class="mt-0.5 text-xs"
              />
              <p v-if="submission.hintPenalty" class="text-xs font-medium text-navy-700">
                {{
                  t('teacher.components.enigma_submissions_modal.hint_penalty', {
                    count: submission.hintPenalty,
                  })
                }}
              </p>
              <time
                class="text-xs text-navy-700/70 block"
                :datetime="submission.submittedAt"
                :title="formatFullDate(submission.submittedAt)"
                >{{ formatDate(submission.submittedAt) }}</time
              >
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap items-center justify-end gap-2 ml-auto">
              <Button
                v-if="submission.hasFile"
                variant="outline"
                size="sm"
                :icon-left="ArrowDownTrayIcon"
                @click="downloadSubmission(submission)"
              >
                {{ t('teacher.components.enigma_submissions_modal.download') }}
              </Button>
              <template v-if="canApprove">
                <Button
                  v-if="editingSubmissionId !== submission.id"
                  variant="primary"
                  size="sm"
                  @click="startEditing(submission)"
                >
                  {{ t('teacher.components.enigma_submissions_modal.grade') }}
                </Button>
                <Button v-else variant="outline" size="sm" @click="cancelEditing">
                  {{ t('common.actions.cancel') }}
                </Button>
              </template>
            </div>
          </div>

          <!-- Inline review: % completado → escala todas las recompensas -->
          <Transition name="expand">
            <div v-if="canApprove && editingSubmissionId === submission.id" class="px-4 pb-4 pt-0">
              <div class="pt-3 border-t border-gray-100 space-y-3">
                <!-- Selector de porcentaje -->
                <div>
                  <p
                    :id="`pct-label-${submission.id}`"
                    class="text-xs font-medium text-navy-700/70 mb-1.5"
                  >
                    {{ t('teacher.components.enigma_submissions_modal.pct_label') }}
                  </p>
                  <div
                    class="flex items-center gap-2 flex-wrap"
                    role="group"
                    :aria-labelledby="`pct-label-${submission.id}`"
                  >
                    <button
                      v-for="p in pctPresets"
                      :key="p"
                      type="button"
                      :class="chipClass(selectedPct === p)"
                      :aria-pressed="selectedPct === p"
                      @click="selectedPct = p"
                    >
                      {{ p }}%
                    </button>
                    <div class="flex items-center gap-1 ml-1">
                      <input
                        v-model.number="selectedPct"
                        type="number"
                        min="0"
                        max="100"
                        :aria-label="t('teacher.components.enigma_submissions_modal.pct_custom')"
                        class="w-16 px-2 py-1.5 text-sm font-semibold text-center text-navy-700 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span class="text-sm text-navy-700/60">%</span>
                    </div>
                  </div>
                </div>

                <!-- Aprobar a todo el equipo aplica a cada cual su descuento: se dice antes -->
                <p
                  v-if="teamPending(submission).length > 1 && teamHasHintPenalty(submission)"
                  class="text-xs text-navy-700/80"
                >
                  {{ t('teacher.components.enigma_submissions_modal.team_hints_note') }}
                </p>

                <!-- Previsualización de recompensas + aprobar -->
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <div class="flex items-center gap-2.5 text-sm">
                    <span class="text-navy-700/70">{{
                      t('teacher.components.enigma_submissions_modal.will_receive')
                    }}</span>
                    <span
                      v-if="showXp"
                      class="inline-flex items-center gap-1 font-semibold text-navy-700"
                    >
                      <XpIcon class="w-4 h-4" />{{ awardedFor(submission).xp }} XP
                    </span>
                    <span
                      v-if="baseRewards.coins && showCoins"
                      class="inline-flex items-center gap-1 font-semibold text-navy-700"
                    >
                      <CoinIcon class="w-4 h-4" />{{ awardedFor(submission).coins }}
                    </span>
                    <span
                      v-if="baseRewards.mana && showMana"
                      class="inline-flex items-center gap-1 font-semibold text-navy-700"
                    >
                      <ManaIcon class="w-4 h-4" />{{ awardedFor(submission).mana }}
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <Button
                      v-if="teamPending(submission).length > 1"
                      variant="outline"
                      size="sm"
                      :loading="approvingTeam"
                      :disabled="!selectedPct || selectedPct <= 0"
                      @click="handleApproveTeam(submission)"
                    >
                      {{
                        t('teacher.components.enigma_submissions_modal.approve_team', {
                          count: teamPending(submission).length,
                          pct: selectedPct,
                        })
                      }}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      :disabled="!selectedPct || selectedPct <= 0"
                      @click="handleApprove(submission)"
                    >
                      {{
                        t('teacher.components.enigma_submissions_modal.approve', {
                          pct: selectedPct,
                        })
                      }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-center">
        <Button variant="primary" @click="handleClose">{{ t('common.actions.close') }}</Button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
/* Expand transition for inline XP controls */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease-out;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
