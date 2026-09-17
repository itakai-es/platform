<template>
  <div>
    <MissionDetailTemplate
      mode="student"
      :class-id="classId"
      :mission-id="missionId"
      :mission="mission"
      :loading="loading"
      :error="error"
      @upload-submission="openSubmissionModal"
      @resource-click="handleResourceClick"
      @atenea-action="handleAteneaAction"
    />

    <!-- Submission Modal -->
    <SubmissionModal
      v-model="showSubmissionModal"
      :enigma="selectedEnigmaForSubmission"
      :enigma-number="selectedEnigmaNumber"
      :show-xp="classCfg.xp"
      :show-coins="classCfg.coins"
      :show-mana="classCfg.mana"
      @submit="handleSubmissionSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  MissionDetail,
  MissionEnigmaDetail as MissionEnigma,
  MissionDocumentDetail as MissionDocument,
} from '~/types/mission-detail.types'
import { resolveClassSettings } from '~/utils/class-settings'

const { t } = useI18n()

definePageMeta({
  layout: 'student',
  middleware: ['auth', 'role'],
})

const route = useRoute()
const classId = route.params.classId as string
const missionId = computed(() => route.params.missionId as string)

// Store
const missionStore = useMissionStore()

// State
const mission = ref<MissionDetail | null>(null)
// Per-class feature flags (hide reward chips for disabled resources)
const classCfg = computed(() => resolveClassSettings(mission.value?.classSettings))
const loading = ref(true)
const error = ref<string | null>(null)

// Submission modal state
const showSubmissionModal = ref(false)
const selectedEnigmaForSubmission = ref<{
  id: string
  title: string
  xp: number
  coins: number
  mana: number
} | null>(null)
const selectedEnigmaNumber = ref(1)

const toast = useToast()
const { openDocument } = useProtectedFiles()

// Dynamic title
useHead({
  title: computed(() =>
    mission.value
      ? t('student.mission_detail.meta.title', { title: mission.value.title })
      : t('student.mission_detail.meta.title_loading')
  ),
  meta: [
    {
      name: 'description',
      content: computed(
        () => mission.value?.description || t('student.mission_detail.meta.description_fallback')
      ),
    },
  ],
})

// Fetch mission data from store (uses cache via ensureMissionById)
const fetchMission = async () => {
  loading.value = true
  error.value = null

  try {
    const fetchedMission = await missionStore.ensureMissionById(missionId.value)
    mission.value = fetchedMission as unknown as MissionDetail
  } catch (err: any) {
    error.value = err.message || t('student.mission_detail.error.loading_error')
    console.error('Error fetching mission:', err)
  } finally {
    loading.value = false
  }
}

// Support documents
const supportDocuments = computed(() => mission.value?.documents || [])

// Handle AI assistant actions — use current god name instead of hardcoded "Atenea"
const aiStore = useAIAssistantStore()
const handleAteneaAction = (action: 'chat' | 'help' | 'start') => {
  const godName = aiStore.currentGod?.name || 'Atenea'
  const title = mission.value?.title || ''
  const messages: Record<string, string> = {
    chat: `Hola ${godName}, quiero charlar sobre la misión "${title}"`,
    help: `Hola ${godName}, necesito ayuda con la misión "${title}"`,
    start: `Hola ${godName}, estoy listo para empezar la misión "${title}". ¿Por dónde empiezo?`,
  }
  navigateTo({
    path: '/alumno/asistente',
    query: { message: messages[action], assistantId: aiStore.currentGod?.id },
  })
}

// Scroll to documents section
const scrollToDocuments = () => {
  const el = document.getElementById('documentos-apoyo')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Open submission modal
const openSubmissionModal = (enigmaId: string) => {
  // Block submissions if mission has expired
  if (mission.value?.status === 'expirada') {
    toast.error(t('student.mission_detail.submission.expired_error'))
    return
  }

  const enigma = mission.value?.enigmas?.find(e => e.id === enigmaId)
  if (!enigma) return

  const enigmaIndex = mission.value?.enigmas?.findIndex(e => e.id === enigmaId) ?? 0

  selectedEnigmaForSubmission.value = {
    id: enigma.id,
    title: enigma.title,
    xp: enigma.xp,
    coins: enigma.coins ?? 0,
    mana: enigma.mana ?? 0,
  }
  selectedEnigmaNumber.value = enigmaIndex + 1
  showSubmissionModal.value = true
}

// Handle submission from modal
const handleSubmissionSubmit = async (data: { enigmaId: string; file: File }) => {
  try {
    const config = useRuntimeConfig()

    // Upload file via FormData
    const formData = new FormData()
    formData.append('file', data.file)

    const response = await $fetch<{
      submission: {
        id: string
        enigmaId: string
        enigmaTitle: string
        missionTitle: string
        status: string
        fileName: string
        submittedAt: string
      }
      message: string
    }>(`${config.public.apiBase}/submissions/enigmas/${data.enigmaId}`, {
      method: 'POST',
      body: formData,
    })

    // Update enigma status locally instead of refetching entire mission
    if (mission.value?.enigmas) {
      const enigma = mission.value.enigmas.find(e => e.id === data.enigmaId)
      if (enigma) {
        enigma.status = 'pendiente'
      }
    }

    toast.success(response.message || t('student.mission_detail.submission.success'))

    // Close modal and clear selection
    showSubmissionModal.value = false
    selectedEnigmaForSubmission.value = null
  } catch (err) {
    console.error('Error submitting enigma:', err)
    toast.error(t('student.mission_detail.submission.error'))
  }
}

// Handle resource click
const handleResourceClick = async (resourceName: string) => {
  const doc = supportDocuments.value.find(
    d =>
      d.title.toLowerCase().includes(resourceName.toLowerCase()) ||
      resourceName.toLowerCase().includes(d.title.toLowerCase().split(':')[0])
  )

  if (!doc || (!doc.storedFile && !doc.fileUrl)) {
    scrollToDocuments()
    return
  }

  // El aviso de descarga espera a que el fichero salga de verdad: si no hay
  // acceso o el documento ya no está, solo se ve el error.
  const opened = await openDocument(doc)
  if (opened && doc.storedFile && doc.type !== 'video') {
    toast.success(`${t('student.mission_detail.submission.downloading')} "${doc.title}"`)
  }
}

// Load mission data on mount
onMounted(() => {
  fetchMission()
})

// Watch for route changes (when switching between missions)
watch(
  () => route.params.missionId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      fetchMission()
    }
  }
)
</script>
