<script setup lang="ts">
import { ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon } from '@heroicons/vue/24/solid'

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
  fileName?: string
  fileUrl?: string
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
})
const emit = defineEmits<Emits>()

const config = useRuntimeConfig()
const toast = useToast()
const { t } = useI18n()
const effects = useEffects()

// State
const submissions = ref<Submission[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const editingSubmissionId = ref<string | null>(null)
const selectedPct = ref<number>(100)
const approvedIds = ref<Set<string>>(new Set())

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
    const response = await $fetch<{ submissions: Submission[]; total: number; pending: number }>(
      `${config.public.apiBase}/submissions/teacher/enigmas/${enigmaId}`
    )
    submissions.value = response.submissions || []

    // Debug: ver qué datos estamos recibiendo
    if (submissions.value.length > 0) {
    }
  } catch (err: any) {
    console.error('Error fetching submissions:', err)
    error.value = err.data?.message || err.message || 'Error al cargar entregas'
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

// Recompensas que recibirá el estudiante con el % seleccionado.
const awarded = computed(() => {
  const pct = (selectedPct.value || 0) / 100
  return {
    xp: Math.round(baseRewards.value.xp * pct),
    coins: Math.round(baseRewards.value.coins * pct),
    mana: Math.round(baseRewards.value.mana * pct),
  }
})

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

  // Capturar las recompensas antes de resetear el porcentaje.
  const { xp: awardedXp, coins: awardedCoins, mana: awardedMana } = awarded.value
  const pct = selectedPct.value

  try {
    await $fetch(`${config.public.apiBase}/submissions/${submission.id}/approve`, {
      method: 'POST',
      body: {
        xpAwarded: awardedXp,
        coinsAwarded: awardedCoins,
        manaAwarded: awardedMana,
        percentage: pct,
      },
    })

    // Mark as approved locally
    approvedIds.value.add(submission.id)
    cancelEditing()

    // Emit refresh to update parent
    emit('refresh')

    toast.success(
      t('common.toast.submission_student_approved', {
        name: submission.student.name,
        xp: awardedXp,
      })
    )
    // Feedback al profe por aprobar (sparkle + success).
    effects.play('enigma_approved')
  } catch (err: any) {
    console.error('Error approving submission:', err)
    toast.error(err.data?.message || err.message || 'Error al aprobar entrega')
  }
}

const downloadFile = async (submission: Submission) => {
  try {
    // Construct file URL
    let fileUrl = submission.fileUrl
    if (!fileUrl) {
      console.error('No fileUrl available for submission:', submission)
      toast.error(t('common.toast.download_not_found'))
      return
    }

    // Make absolute URL
    if (!fileUrl.startsWith('http')) {
      fileUrl = `${config.public.apiBase}${fileUrl}`
    }

    // Fetch the file
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Create blob and download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = submission.fileName || 'archivo'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error downloading file:', error)
    toast.error(t('common.toast.download_error'))
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffHours < 1) return 'Hace menos de 1 hora'
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

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
    :title="enigma?.title || 'Entregas'"
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
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex items-center justify-center py-8">
        <div class="text-center">
          <p class="text-red-500 font-semibold">{{ error }}</p>
          <Button variant="outline" size="sm" class="mt-2" @click="fetchSubmissions(enigma!.id)">
            Reintentar
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
          <p class="text-navy-700 font-semibold">No hay entregas pendientes de revisión</p>
        </div>
      </div>

      <!-- Student list -->
      <div v-else class="space-y-3 overflow-y-auto pr-1 min-h-[500px] max-h-[800px]">
        <div
          v-for="submission in pendingSubmissions"
          :key="submission.id"
          class="rounded-xl border border-gray-200 overflow-hidden bg-white hover:bg-gray-50 transition-colors"
        >
          <!-- Student row -->
          <div class="p-4 flex items-center gap-4">
            <!-- Avatar -->
            <img
              v-if="submission.student.avatar"
              :src="submission.student.avatar"
              :alt="submission.student.name"
              class="w-12 h-12 rounded-full object-contain flex-shrink-0 bg-gray-100"
            />
            <div
              v-else
              class="w-12 h-12 rounded-full flex items-center justify-center bg-purple/20 text-purple font-bold text-base flex-shrink-0"
            >
              {{ getInitials(submission.student.name) }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <p class="font-bold text-navy-700 text-base">{{ submission.student.name }}</p>
              <span class="text-xs text-navy-700/70 block">{{
                formatDate(submission.submittedAt)
              }}</span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <Button
                v-if="submission.fileName"
                variant="outline"
                size="sm"
                :icon-left="ArrowDownTrayIcon"
                @click="downloadFile(submission)"
              >
                Descargar
              </Button>
              <Button
                v-if="editingSubmissionId !== submission.id"
                variant="primary"
                size="sm"
                @click="startEditing(submission)"
              >
                Valorar
              </Button>
              <Button v-else variant="outline" size="sm" @click="cancelEditing"> Cancelar </Button>
            </div>
          </div>

          <!-- Inline review: % completado → escala todas las recompensas -->
          <Transition name="expand">
            <div v-if="editingSubmissionId === submission.id" class="px-4 pb-4 pt-0">
              <div class="pt-3 border-t border-gray-100 space-y-3">
                <!-- Selector de porcentaje -->
                <div>
                  <p class="text-xs font-medium text-navy-700/70 mb-1.5">% completado de la tarea</p>
                  <div class="flex items-center gap-2 flex-wrap">
                    <button
                      v-for="p in pctPresets"
                      :key="p"
                      type="button"
                      :class="chipClass(selectedPct === p)"
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
                        class="w-16 px-2 py-1.5 text-sm font-semibold text-center text-navy-700 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span class="text-sm text-navy-700/60">%</span>
                    </div>
                  </div>
                </div>

                <!-- Previsualización de recompensas + aprobar -->
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <div class="flex items-center gap-2.5 text-sm">
                    <span class="text-navy-700/70">Recibirá</span>
                    <span
                      v-if="showXp"
                      class="inline-flex items-center gap-1 font-semibold text-navy-700"
                    >
                      <XpIcon class="w-4 h-4" />{{ awarded.xp }} XP
                    </span>
                    <span
                      v-if="baseRewards.coins && showCoins"
                      class="inline-flex items-center gap-1 font-semibold text-navy-700"
                    >
                      <CoinIcon class="w-4 h-4" />{{ awarded.coins }}
                    </span>
                    <span
                      v-if="baseRewards.mana && showMana"
                      class="inline-flex items-center gap-1 font-semibold text-navy-700"
                    >
                      <ManaIcon class="w-4 h-4" />{{ awarded.mana }}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    :disabled="!selectedPct || selectedPct <= 0"
                    @click="handleApprove(submission)"
                  >
                    Aprobar {{ selectedPct }}%
                  </Button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-center">
        <Button variant="primary" @click="handleClose"> Cerrar </Button>
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
