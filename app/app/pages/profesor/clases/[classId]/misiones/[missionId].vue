<template>
  <div>
    <!-- Narrative Editor (full content area) -->
    <div v-if="isEditingNarrative" class="h-[calc(100vh-64px)]">
      <MarkdownEditor
        v-model="narrativeEditContent"
        class="h-full"
        :god-name="god.name"
        :god-avatar="god.avatar"
        ai-placeholder="Ej: Añade más detalles sobre el mundo de la misión..."
        context-label="Editando la historia de la misión"
        ai-system-context="El profesor esta editando la NARRATIVA/HISTORIA de una misión gamificada. Genera contenido narrativo, inmersivo y creativo."
        @cancel="isEditingNarrative = false"
        @save="saveNarrative"
      />
    </div>

    <MissionDetailTemplate
      v-else
      mode="teacher"
      :class-id="classId"
      :mission-id="missionId"
      :mission="mission"
      :loading="loading"
      :error="error"
      :tabs="tabs"
      :active-tab="activeTab"
      :tab-href="tabHref"
      @update-title="updateMissionTitle"
      @update-deadline="updateMissionDeadline"
      @edit-narrative="editNarrative"
      @add-enigma="addEnigma"
      @edit-enigma="editEnigma"
      @delete-enigma="deleteEnigma"
      @reorder-enigmas="reorderEnigmas"
      @add-document="addDocument"
      @edit-document="editDocument"
      @delete-document="deleteDocument"
      @reorder-documents="reorderDocuments"
      @edit-rewards="editRewards"
      @view-submissions="openSubmissionsModal"
    >
      <!-- Pestaña Ajustes: título, fecha límite e imagen de la misión -->
      <template #tab="{ activeTab: current }">
        <MissionConfigPanel
          v-if="current === 'ajustes'"
          :mission-id="missionId"
          :mission="mission"
          @update="onSettingsUpdate"
        />
      </template>
    </MissionDetailTemplate>

    <!-- Submissions Modal -->
    <EnigmaSubmissionsModal
      :enigma="selectedEnigma"
      :class-id="classId"
      :show-xp="classCfg.xp"
      :show-coins="classCfg.coins"
      :show-mana="classCfg.mana"
      @close="closeSubmissionsModal"
      @refresh="updateEnigmaSubmissionsCount"
    />

    <!-- Enigma Form Modal (Add/Edit) -->
    <EnigmaFormModal
      v-model="showEnigmaModal"
      :enigma="enigmaToEdit"
      :rewards-locked="editingRewardsLocked"
      :show-xp="classCfg.xp"
      :show-coins="classCfg.coins"
      :show-mana="classCfg.mana"
      @submit="handleEnigmaSubmit"
    />

    <!-- Document Form Modal (Add/Edit) -->
    <DocumentFormModal
      v-model="showDocumentModal"
      :document="documentToEdit"
      @submit="handleDocumentSubmit"
    />

    <!-- Confirm Delete Modal -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="deleteModalConfig.title"
      :message="deleteModalConfig.message"
      :confirm-text="deleteModalConfig.confirmText"
      :loading="isDeleting"
      variant="danger"
      @confirm="handleConfirmDelete"
    />

    <!-- Rewards Form Modal -->
    <RewardsFormModal
      v-model="showRewardsModal"
      :badge="mission?.badgeReward"
      :available-badges="availableBadges"
      :loading-badges="loadingBadges"
      @submit="handleRewardsSubmit"
      @load-badges="fetchAvailableBadges"
    />
  </div>
</template>

<script setup lang="ts">
import {
  Squares2X2Icon as Squares2X2IconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/vue/24/solid'
import type {
  MissionDetail,
  MissionEnigmaDetail as MissionEnigma,
  MissionDocumentDetail as MissionDocument,
  BadgeRewardDetail as BadgeReward,
} from '~/types/mission-detail.types'
import { resolveClassSettings } from '~/utils/class-settings'

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

const route = useRoute()
const router = useRouter()
const classId = route.params.classId as string
const missionId = computed(() => route.params.missionId as string)

// --------- Pestañas del detalle (como en una clase) ---------
const tabs = computed(() => [
  { id: 'resumen', label: t('teacher.missions.detail.tabs.summary'), icon: Squares2X2IconSolid },
  { id: 'ajustes', label: t('teacher.missions.detail.tabs.settings'), icon: Cog6ToothIconSolid },
])

// Pestaña activa desde ?tab=; el resumen es la vista por defecto (sin query).
const activeTab = computed(() => (route.query.tab as string) || 'resumen')

function tabHref(tabId: string) {
  return tabId === 'resumen' ? { query: {} } : { query: { tab: tabId } }
}

// El panel ya persiste los cambios; recargamos la misión desde el backend (con
// force) para que TODO lo derivado —bonus de XP de misión, etiqueta de estado
// calculada, portada— refleje exactamente lo guardado, sin duplicar lógica.
async function onSettingsUpdate() {
  const fresh = await missionStore.ensureTeacherMissionById(missionId.value, true)
  if (fresh) mission.value = fresh as unknown as MissionDetail
}

// Store
const missionStore = useMissionStore()

// State
const mission = ref<MissionDetail | null>(null)
// Per-class feature flags (hide enigma reward rows for disabled resources)
const classCfg = computed(() => resolveClassSettings(mission.value?.classSettings))
const loading = ref(true)
const error = ref<string | null>(null)
const selectedEnigma = ref<MissionEnigma | null>(null)

// Enigma form modal state
const showEnigmaModal = ref(false)
const enigmaToEdit = ref<{
  id?: string
  title: string
  xp: number
  coins: number
  mana: number
  description: string
  objectives: string[]
  isOptional: boolean
} | null>(null)

// Document form modal state
const showDocumentModal = ref(false)
const documentToEdit = ref<{
  id?: string
  title: string
  type: 'pdf' | 'video' | 'docx' | 'link' | 'image'
  format: string
  metadata: string
  description: string
  tags: string[]
  url?: string
} | null>(null)

// Delete confirmation modal state
const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteTarget = ref<{ type: 'enigma' | 'document'; id: string; name: string } | null>(null)

// Rewards modal state
const showRewardsModal = ref(false)
const availableBadges = ref<BadgeReward[]>([])
const loadingBadges = ref(false)

const deleteModalConfig = computed(() => {
  if (!deleteTarget.value) {
    return { title: '', message: '', confirmText: '' }
  }
  const isEnigma = deleteTarget.value.type === 'enigma'
  return {
    title: isEnigma ? 'Eliminar Enigma' : 'Eliminar Documento',
    message: `¿Estás seguro de eliminar "${deleteTarget.value.name}"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
  }
})

const toast = useToast()
const { t } = useI18n()

// Dynamic title
useHead({
  title: computed(() =>
    mission.value
      ? t('teacher.missions.detail.meta.title', { title: mission.value.title })
      : t('teacher.missions.detail.meta.title_loading')
  ),
  meta: [
    {
      name: 'description',
      content: computed(
        () => mission.value?.description || t('teacher.missions.detail.meta.description_fallback')
      ),
    },
  ],
})

// Fetch mission data from store (uses cache, endpoint del profesor)
// Usa ensureTeacherMissionById (idempotente) en lugar de fetchMissionById
// para evitar carreras y reusar la caché de detalle teacher del store.
const fetchMission = async (force = false) => {
  loading.value = true
  error.value = null

  try {
    const fetchedMission = await missionStore.ensureTeacherMissionById(missionId.value, force)
    mission.value = fetchedMission as unknown as MissionDetail
  } catch (err: any) {
    error.value = err.message || 'Error al cargar la mision'
    console.error('Error fetching mission:', err)
  } finally {
    loading.value = false
  }
}

// Update submissions count for a specific enigma
const updateEnigmaSubmissionsCount = () => {
  if (selectedEnigma.value && mission.value?.enigmas) {
    const enigma = mission.value.enigmas.find(e => e.id === selectedEnigma.value?.id)
    if (enigma && enigma.submissionsCount && enigma.submissionsCount > 0) {
      enigma.submissionsCount--
    }
  }
}

const updateMissionTitle = async (title: string) => {
  const config = useRuntimeConfig()
  try {
    await $fetch(`${config.public.apiBase}/missions/${missionId.value}`, {
      method: 'PATCH',
      body: { title },
    })
    if (mission.value) mission.value.title = title
  } catch (err) {
    console.error('Error updating mission title:', err)
  }
}

const updateMissionDeadline = async (deadline: string | null) => {
  const config = useRuntimeConfig()
  try {
    await $fetch(`${config.public.apiBase}/missions/${missionId.value}`, {
      method: 'PATCH',
      body: { deadline },
    })
    if (mission.value) mission.value.deadline = deadline ?? ''
  } catch (err) {
    console.error('Error updating mission deadline:', err)
  }
}

const isEditingNarrative = ref(false)
const narrativeEditContent = ref('')
const aiStore = useAIAssistantStore()
const god = computed(
  () => aiStore.currentGod || { id: 'atenea', name: 'Atenea', avatar: '/app/avatars/atenea.svg' }
)

const editNarrative = () => {
  narrativeEditContent.value = mission.value?.description || ''
  isEditingNarrative.value = true
}

const saveNarrative = async (content: string) => {
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.apiBase}/teacher/missions/${missionId.value}`, {
      method: 'PUT',
      body: { description: content },
    })
    if (mission.value) mission.value.description = content
    isEditingNarrative.value = false
  } catch (err) {
    console.error('Error saving narrative:', err)
  }
}

// Rewards become raise-only once a student has completed the enigma; the form
// disables presets below the current value so the teacher can't pick them.
const editingRewardsLocked = ref(false)

const addEnigma = () => {
  enigmaToEdit.value = null
  editingRewardsLocked.value = false
  showEnigmaModal.value = true
}

const editEnigma = (enigma: MissionEnigma) => {
  enigmaToEdit.value = {
    id: enigma.id,
    title: enigma.title,
    xp: enigma.xp,
    coins: enigma.coins ?? 0,
    mana: enigma.mana ?? 0,
    description: enigma.description,
    objectives: enigma.objectives || [],
    isOptional: enigma.isOptional || false,
  }
  editingRewardsLocked.value = (enigma.completedCount ?? 0) > 0
  showEnigmaModal.value = true
}

// Handle enigma form submission
interface EnigmaFormData {
  id?: string
  title: string
  xp: number
  coins: number
  mana: number
  description: string
  objectives: string[]
  isOptional: boolean
}

const handleEnigmaSubmit = async (data: EnigmaFormData) => {
  try {
    const config = useRuntimeConfig()
    const isEditing = !!data.id

    if (isEditing) {
      // Update existing enigma
      const response = await $fetch<{ message: string; enigma: MissionEnigma }>(
        `${config.public.apiBase}/missions/${missionId.value}/enigmas/${data.id}`,
        {
          method: 'PUT',
          body: {
            title: data.title,
            xp: data.xp,
            coins: data.coins,
            mana: data.mana,
            description: data.description,
            objectives: data.objectives,
            isOptional: data.isOptional,
          },
        }
      )

      // Update local state (replace array to trigger reactivity)
      if (mission.value?.enigmas) {
        mission.value.enigmas = mission.value.enigmas.map(e =>
          e.id === data.id ? response.enigma : e
        )
      }

      toast.success(t('common.toast.enigma_updated'))
    } else {
      // Create new enigma
      const response = await $fetch<{ message: string; enigma: MissionEnigma }>(
        `${config.public.apiBase}/missions/${missionId.value}/enigmas`,
        {
          method: 'POST',
          body: {
            title: data.title,
            xp: data.xp,
            coins: data.coins,
            mana: data.mana,
            description: data.description,
            objectives: data.objectives,
            isOptional: data.isOptional,
          },
        }
      )

      // Add to local state (replace array to trigger reactivity)
      if (mission.value) {
        mission.value.enigmas = [...(mission.value.enigmas || []), response.enigma]
      }

      toast.success(t('common.toast.enigma_added'))
    }

    showEnigmaModal.value = false
    enigmaToEdit.value = null
  } catch (err) {
    console.error('Error saving enigma:', err)
    const message = (err as { data?: { message?: string } })?.data?.message
    toast.error(message || t('common.toast.enigma_save_error'))
  }
}

const deleteEnigma = (enigmaId: string) => {
  const enigma = mission.value?.enigmas?.find(e => e.id === enigmaId)
  if (!enigma) return

  if (enigma.totalSubmissions && enigma.totalSubmissions > 0) {
    toast.error(t('teacher.missions.detail.toast.enigma_has_submissions'))
    return
  }

  deleteTarget.value = { type: 'enigma', id: enigmaId, name: enigma.title }
  showDeleteModal.value = true
}

const reorderEnigmas = async (enigmaIds: string[]) => {
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.apiBase}/missions/${missionId.value}/enigmas/reorder`, {
      method: 'PUT',
      body: { ids: enigmaIds },
    })

    // Actualizar el estado local con el nuevo orden
    if (mission.value?.enigmas) {
      mission.value.enigmas = enigmaIds
        .map(id => mission.value?.enigmas?.find(e => e.id === id))
        .filter(Boolean) as MissionEnigma[]
    }
  } catch (err) {
    console.error('Error reordering enigmas:', err)
  }
}

const addDocument = () => {
  documentToEdit.value = null
  showDocumentModal.value = true
}

const editDocument = (doc: MissionDocument) => {
  documentToEdit.value = {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    format: doc.format,
    metadata: doc.metadata,
    description: doc.description,
    tags: doc.tags || [],
  }
  showDocumentModal.value = true
}

// Handle document form submission
interface DocumentFormData {
  id?: string
  title: string
  type: 'pdf' | 'video' | 'docx' | 'link' | 'image'
  format: string
  metadata: string
  description: string
  tags: string[]
  url?: string
  file?: File
}

const handleDocumentSubmit = async (data: DocumentFormData) => {
  try {
    const config = useRuntimeConfig()
    const isEditing = !!data.id

    if (isEditing) {
      // Update existing document (JSON request - no file upload on edit for now)
      const response = await $fetch<{ message: string; document: MissionDocument }>(
        `${config.public.apiBase}/missions/${missionId.value}/documents/${data.id}`,
        {
          method: 'PUT',
          body: {
            title: data.title,
            type: data.type,
            format: data.format,
            metadata: data.metadata,
            description: data.description,
            tags: data.tags,
          },
        }
      )

      // Update local state
      if (mission.value?.documents) {
        mission.value.documents = mission.value.documents.map(d =>
          d.id === data.id ? response.document : d
        )
      }

      toast.success(t('common.toast.document_updated'))
    } else {
      // Create new document with file upload (multipart form data)
      const formData = new FormData()
      formData.append('name', data.title)
      if (data.description) {
        formData.append('description', data.description)
      }
      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags))
      }
      if (data.file) {
        formData.append('file', data.file)
      }
      if (data.url) {
        formData.append('url', data.url)
      }
      if (data.type) {
        formData.append('type', data.type)
      }

      const response = await $fetch<{ message: string; document: MissionDocument }>(
        `${config.public.apiBase}/missions/${missionId.value}/documents`,
        {
          method: 'POST',
          body: formData,
        }
      )

      // Add to local state
      if (mission.value) {
        mission.value.documents = [...(mission.value.documents || []), response.document]
      }

      toast.success(t('common.toast.document_added'))
    }

    showDocumentModal.value = false
    documentToEdit.value = null
  } catch (err) {
    console.error('Error saving document:', err)
    toast.error(t('common.toast.document_save_error'))
  }
}

const deleteDocument = (docId: string) => {
  const doc = mission.value?.documents?.find(d => d.id === docId)
  if (!doc) return

  deleteTarget.value = { type: 'document', id: docId, name: doc.title }
  showDeleteModal.value = true
}

const handleConfirmDelete = async () => {
  if (!deleteTarget.value) return

  isDeleting.value = true
  const { type, id } = deleteTarget.value

  try {
    const config = useRuntimeConfig()

    if (type === 'enigma') {
      await $fetch(`${config.public.apiBase}/missions/${missionId.value}/enigmas/${id}`, {
        method: 'DELETE',
      })

      // Update local state
      if (mission.value?.enigmas) {
        mission.value.enigmas = mission.value.enigmas.filter(e => e.id !== id)
      }

      toast.success(t('common.toast.enigma_deleted'))
    } else {
      await $fetch(`${config.public.apiBase}/missions/${missionId.value}/documents/${id}`, {
        method: 'DELETE',
      })

      // Update local state
      if (mission.value?.documents) {
        mission.value.documents = mission.value.documents.filter(d => d.id !== id)
      }

      toast.success(t('common.toast.document_deleted'))
    }

    showDeleteModal.value = false
    deleteTarget.value = null
  } catch (err) {
    console.error(`Error deleting ${type}:`, err)
    toast.error(
      type === 'enigma'
        ? t('common.toast.enigma_delete_error')
        : t('common.toast.document_delete_error')
    )
  } finally {
    isDeleting.value = false
  }
}

const reorderDocuments = async (docIds: string[]) => {
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.apiBase}/missions/${missionId.value}/documents/reorder`, {
      method: 'PUT',
      body: { ids: docIds },
    })

    // Actualizar el estado local con el nuevo orden
    if (mission.value?.documents) {
      mission.value.documents = docIds
        .map(id => mission.value?.documents?.find(d => d.id === id))
        .filter(Boolean) as MissionDocument[]
    }
  } catch (err) {
    console.error('Error reordering documents:', err)
  }
}

const editRewards = () => {
  showRewardsModal.value = true
}

// Fetch available badges for the teacher
const fetchAvailableBadges = async () => {
  loadingBadges.value = true
  try {
    const config = useRuntimeConfig()
    const response = await $fetch<{ badges: BadgeReward[] }>(
      `${config.public.apiBase}/teacher/badges`
    )
    availableBadges.value = response.badges
  } catch (err) {
    console.error('Error fetching badges:', err)
    availableBadges.value = []
  } finally {
    loadingBadges.value = false
  }
}

// Handle rewards form submission
const handleRewardsSubmit = async (data: { badge: BadgeReward | null; isNew: boolean }) => {
  try {
    const config = useRuntimeConfig()

    if (data.isNew && data.badge) {
      // First create the new badge
      const createResponse = await $fetch<{ badge: BadgeReward }>(
        `${config.public.apiBase}/teacher/badges`,
        {
          method: 'POST',
          body: {
            name: data.badge.name,
            description: data.badge.description,
            imageUrl: data.badge.imageUrl,
            rarity: data.badge.rarity,
          },
        }
      )
      data.badge = { ...createResponse.badge }
    }

    // Update mission with badge
    await $fetch(`${config.public.apiBase}/missions/${missionId.value}/rewards`, {
      method: 'PUT',
      body: {
        badgeId: data.badge?.id || null,
      },
    })

    // Update local state
    if (mission.value) {
      mission.value.badgeReward = data.badge || undefined
    }

    toast.success(data.badge ? t('common.toast.badge_assigned') : t('common.toast.badge_removed'))
    showRewardsModal.value = false
  } catch (err) {
    console.error('Error saving rewards:', err)
    toast.error('No se pudo actualizar la recompensa de la misión')
  }
}

// Submissions modal — la aprobación la realiza el propio EnigmaSubmissionsModal
// (POST /submissions/:id/approve con el %); aquí solo refrescamos el contador.
const openSubmissionsModal = (enigma: MissionEnigma) => {
  selectedEnigma.value = enigma
}

// `?entregas=<enigmaId>` (el aviso de entrega nueva) abre al cargar la ventana
// de entregas de ese enigma. El parámetro se quita al cerrarla, o en el acto si
// el enigma ya no existe; `?tab=` y lo demás de la URL se conservan.
const submissionsQuery = () => {
  const value = route.query.entregas
  return typeof value === 'string' && value ? value : null
}

const clearSubmissionsQuery = () => {
  if (!('entregas' in route.query)) return
  const { entregas: _removed, ...query } = route.query
  router.replace({ query })
}

const openSubmissionsFromQuery = () => {
  const enigmaId = submissionsQuery()
  if (!enigmaId || !mission.value) return
  const enigma = mission.value.enigmas?.find(e => e.id === enigmaId)
  if (enigma) selectedEnigma.value = enigma
  else clearSubmissionsQuery()
}

const closeSubmissionsModal = () => {
  selectedEnigma.value = null
  clearSubmissionsQuery()
}

// Load mission data on mount. Si se llega desde un aviso, con datos frescos:
// el número de entregas del enigma puede haber cambiado desde la caché.
onMounted(async () => {
  await fetchMission(!!submissionsQuery())
  openSubmissionsFromQuery()
})

// Cambio de misión (otra misión, quizá desde un aviso) o solo de `?entregas=`
// (un aviso de otro enigma con esta misión ya abierta). En un único watch para
// no buscar el enigma nuevo en la misión anterior.
watch(
  () => [route.params.missionId, route.query.entregas] as const,
  ([newId, entregas], [oldId, oldEntregas]) => {
    if (newId && newId !== oldId) {
      void fetchMission(!!submissionsQuery()).then(openSubmissionsFromQuery)
    } else if (entregas && entregas !== oldEntregas && !loading.value) {
      openSubmissionsFromQuery()
    }
  }
)
</script>
