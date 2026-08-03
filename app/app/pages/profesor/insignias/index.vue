<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Page Header -->
    <PageHeader :title="t('teacher.badges.title')" :subtitle="t('teacher.badges.subtitle')">
      <template #actions>
        <Button variant="primary" @click="openCreateModal">
          <PlusIcon class="w-5 h-5 mr-2" />
          {{ t('teacher.badges.new_badge') }}
        </Button>
      </template>
    </PageHeader>

    <!-- Filter Bar -->
    <FilterBar
      v-if="!loading && badges.length > 0"
      :search="searchQuery"
      :sort="selectedOrigin"
      :results-count="filteredBadges.length"
      search-placeholder="Buscar insignias..."
      :sort-options="originOptions"
      :has-active-filters="selectedRarities.length > 0"
      :active-filter-count="selectedRarities.length"
      variant="red"
      @update:search="searchQuery = $event"
      @update:sort="selectedOrigin = $event"
      @reset="resetFilters"
    >
      <template #filters>
        <MultiSelectDropdown
          v-model="selectedRarities"
          :options="rarityOptions"
          all-label="Todas las rarezas"
          plural-label="rarezas"
          class="sm:w-auto"
        />
      </template>
    </FilterBar>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      <div v-for="i in 12" :key="i" class="bg-white rounded-2xl p-4 shadow-sm">
        <div class="flex flex-col items-center">
          <Skeleton width="w-28" height="h-28" class="rounded-full mb-4" />
          <Skeleton width="w-24" height="h-5" class="mb-2" />
          <Skeleton width="w-16" height="h-6" class="rounded-full" />
        </div>
      </div>
    </div>

    <!-- Badges Grid -->
    <div
      v-else-if="filteredBadges.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      <BadgeRewardCard
        v-for="badge in filteredBadges"
        :key="badge.id"
        :badge="badge"
        :unlocked="true"
        @click="openDetailModal(badge)"
      />
    </div>

    <!-- Empty State (no badges at all) -->
    <EmptyState
      v-else-if="badges.length === 0"
      :icon="TrophyIcon"
      :title="t('teacher.badges.no_badges_title')"
      :description="t('teacher.badges.no_badges_description')"
    >
      <template #action>
        <Button variant="primary" @click="openCreateModal">
          <PlusIcon class="w-5 h-5 mr-2" />
          {{ t('teacher.badges.create_first') }}
        </Button>
      </template>
    </EmptyState>

    <!-- Empty filtered results -->
    <EmptyState
      v-else
      :icon="TrophyIcon"
      title="Sin resultados"
      description="No se encontraron insignias con esos filtros"
    />

    <!-- Badge Detail Modal (same style as student) -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="selectedBadge"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="selectedBadge = null"
        >
          <div class="absolute inset-0 bg-black/50" @click="selectedBadge = null" />
          <div class="relative bg-white rounded-2xl p-5 xs:p-6 max-w-sm w-full shadow-xl">
            <button
              class="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              @click="selectedBadge = null"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>

            <div class="flex flex-col items-center text-center">
              <!-- Badge Image -->
              <div class="relative mb-4">
                <img
                  v-if="selectedBadge.imageUrl"
                  :src="getImageUrl(selectedBadge.imageUrl)"
                  :alt="selectedBadge.name"
                  draggable="false"
                  class="w-32 h-32 xs:w-36 xs:h-36 object-cover rounded-full drop-shadow-lg select-none"
                />
                <div
                  v-else
                  class="w-32 h-32 rounded-full bg-purple/20 flex items-center justify-center"
                >
                  <TrophyIcon class="w-16 h-16 text-purple" />
                </div>
              </div>

              <!-- Rarity badge -->
              <span
                class="px-3 py-1 rounded-full text-xs font-semibold mb-3"
                :class="getRarityClasses(selectedBadge.rarity)"
              >
                {{ getRarityLabel(selectedBadge.rarity) }}
              </span>

              <!-- Name -->
              <h2 class="text-lg xs:text-xl font-bold text-navy-700 mb-2">
                {{ selectedBadge.name }}
              </h2>

              <!-- Description -->
              <p v-if="selectedBadge.description" class="text-sm text-navy-700/70 mb-5">
                {{ selectedBadge.description }}
              </p>
              <div v-else class="mb-5" />

              <!-- Actions -->
              <div class="flex gap-2 w-full">
                <Button
                  v-if="!selectedBadge.isSystem"
                  variant="primary"
                  class="flex-1"
                  @click="openEditModal(selectedBadge); selectedBadge = null"
                >
                  <PencilIcon class="w-4 h-4 mr-2" />
                  {{ t('teacher.badges.detail.btn_edit') }}
                </Button>
                <Button
                  v-if="!selectedBadge.isSystem"
                  variant="outline"
                  class="flex-1"
                  @click="confirmDelete(selectedBadge); selectedBadge = null"
                >
                  <TrashIcon class="w-4 h-4 mr-2" />
                  {{ t('teacher.badges.btn_delete') }}
                </Button>
                <Button
                  v-if="selectedBadge.isSystem"
                  variant="primary"
                  class="flex-1"
                  @click="selectedBadge = null"
                >
                  {{ t('teacher.badges.detail.btn_close') }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create/Edit Modal -->
    <Modal
      v-model="showFormModal"
      :title="
        editingBadge ? t('teacher.badges.form.edit_title') : t('teacher.badges.form.create_title')
      "
      size="xl"
      theme="light"
      persistent
    >
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Left: Form -->
        <div class="flex-1 space-y-4 min-w-0">
          <!-- Mission selector -->
          <div>
            <label class="block text-sm font-medium text-navy-700 mb-1.5">
              Misión asociada
              <span class="text-navy-700/50 font-normal">(opcional)</span>
            </label>
            <SelectDropdown
              v-model="form.missionId"
              :options="
                teacherMissions.map(m => ({
                  value: m.id,
                  label: `${m.title} (${rarityLabels[m.rarity] || 'Común'})`,
                }))
              "
              :placeholder="t('teacher.badges.form.no_mission')"
            />
          </div>

          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-navy-700 mb-1.5">
              {{ t('teacher.badges.form.label_name') }} <span class="text-red-500">*</span>
            </label>
            <div v-if="isGeneratingAI" class="h-11 bg-gray-100 animate-pulse rounded-2xl" />
            <Input
              v-else
              v-model="form.name"
              :placeholder="t('teacher.badges.form.placeholder_name')"
              :error="!!errors.name"
            />
            <p v-if="errors.name" class="mt-1 text-xs text-red-500">{{ errors.name }}</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-navy-700 mb-1.5">
              {{ t('teacher.badges.form.label_description') }}
              <span class="text-navy-700/50 font-normal">{{
                t('teacher.badges.form.image_optional')
              }}</span>
            </label>
            <div v-if="isGeneratingAI" class="h-20 bg-gray-100 animate-pulse rounded-xl" />
            <textarea
              v-else
              v-model="form.description"
              rows="2"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              :placeholder="t('teacher.badges.form.placeholder_description')"
            />
          </div>

          <!-- Image -->
          <div>
            <label class="block text-sm font-medium text-navy-700 mb-1.5">
              {{ t('teacher.badges.form.label_image') }} <span class="text-red-500">*</span>
            </label>
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              class="hidden"
              @change="handleFileSelect"
            />
            <div v-if="imagePreview" class="flex items-center gap-3 mb-3">
              <img
                :src="imagePreview"
                alt="Preview"
                class="w-12 h-12 object-cover rounded-lg flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <span class="text-sm font-medium text-navy-700 truncate block">{{
                  selectedFile?.name || t('teacher.badges.form.label_image')
                }}</span>
                <button
                  type="button"
                  class="text-xs text-text-secondary hover:underline"
                  @click="clearFile"
                >
                  {{ t('teacher.badges.form.btn_remove_image') }}
                </button>
              </div>
            </div>
            <Button variant="outline" size="sm" @click="fileInput?.click()">
              <PhotoIcon class="w-4 h-4 mr-2" />
              Subir imagen
            </Button>
            <p v-if="errors.image" class="mt-1 text-xs text-red-500">{{ errors.image }}</p>
          </div>
        </div>

        <!-- Right: Live Preview + Generate AI -->
        <div class="md:w-72 flex-shrink-0 flex flex-col items-center">
          <p class="text-sm font-medium text-text-secondary mb-3">
            {{ t('teacher.badges.form.preview_label') }}
          </p>
          <div class="w-full mb-3">
            <BadgeRewardCard
              :badge="
                isGeneratingAI ? { ...previewBadge, name: '', imageUrl: undefined } : previewBadge
              "
              :unlocked="true"
              :loading-image="isGeneratingAI"
              :loading-name="isGeneratingAI"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            full-width
            :disabled="isGeneratingAI || !form.missionId"
            @click="generateAllWithAI"
          >
            <SparklesIcon class="w-4 h-4 mr-2" :class="{ 'animate-pulse': isGeneratingAI }" />
            {{ isGeneratingAI ? 'Generando...' : 'Generar con IA' }}
          </Button>
        </div>
      </div>

      <template #footer>
        <Button
          v-if="editingBadge"
          variant="outline"
          @click="confirmDelete(editingBadge); closeFormModal()"
        >
          <TrashIcon class="w-4 h-4 mr-2" />
          {{ t('teacher.badges.btn_delete') }}
        </Button>
        <div class="flex-1" />
        <Button variant="outline" @click="closeFormModal">
          {{ t('teacher.badges.form.btn_cancel') }}
        </Button>
        <Button variant="primary" :disabled="isSubmitting" @click="handleSubmit">
          {{
            isSubmitting
              ? t('teacher.badges.form.btn_saving')
              : editingBadge
                ? t('teacher.badges.form.btn_save_changes')
                : t('teacher.badges.form.btn_create')
          }}
        </Button>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="t('teacher.badges.delete_title')"
      :message="t('teacher.badges.delete_confirm', { name: badgeToDelete?.name })"
      :confirm-text="t('teacher.badges.btn_delete')"
      :cancel-text="t('teacher.badges.form.btn_cancel')"
      variant="warning"
      :loading="isDeleting"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import {
  TrophyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'

const { getImageUrl } = useImageUrl()
const { t, locale } = useI18n()
const toast = useToast()
const config = useRuntimeConfig()
const authStore = useAuthStore()

useHead({
  title: () => t('teacher.badges.meta.title'),
  meta: [{ name: 'description', content: () => t('teacher.badges.meta.description') }],
})

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

// Types
interface Badge {
  id: string
  name: string
  description: string
  imageUrl?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  isSystem?: boolean
  missionId?: string
  missionTitle?: string
  className?: string
  classNarrative?: string
  createdAt: Date | string
  updatedAt?: Date | string
}

// Store (badge listing + CRUD live in the badge store).
const badgeStore = useBadgeStore()
const { badges: storeBadges, isLoading: storeLoading } = storeToRefs(badgeStore)

// State
// `badges` se expone como computed sobre el store para mantener la reactividad
// y evitar refs locales redundantes. El cast preserva los campos extra que la
// API devuelve (rarity, isSystem, missionId, ...) y que la página consume.
const badges = computed(() => storeBadges.value as unknown as Badge[])
const loading = computed(() => storeLoading.value)
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const editingBadge = ref<Badge | null>(null)
const selectedBadge = ref<Badge | null>(null)
const badgeToDelete = ref<Badge | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)

// File upload
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

// Live preview
const previewBadge = computed(() => ({
  id: 'preview',
  name: form.name || 'Nombre',
  description: form.description,
  imageUrl: imagePreview.value || undefined,
  rarity: badgeRarity.value as 'common' | 'rare' | 'epic' | 'legendary',
}))

// AI generation
const isGeneratingAI = ref(false)
const teacherStore = useTeacherStore()

// Filters
const searchQuery = ref('')
const selectedRarities = ref<string[]>([])
const selectedOrigin = ref('all')

const rarityOptions = [
  { value: 'common', label: 'Común' },
  { value: 'rare', label: 'Rara' },
  { value: 'epic', label: 'Épica' },
  { value: 'legendary', label: 'Legendaria' },
]

const originOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'mine', label: 'Mis insignias' },
  { value: 'system', label: t('teacher.badges.filter_system') },
]

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    selectedRarities.value.length > 0 ||
    selectedOrigin.value !== 'all'
  )
})

const resetFilters = () => {
  searchQuery.value = ''
  selectedRarities.value = []
  selectedOrigin.value = 'all'
}

const filteredBadges = computed(() => {
  let result = [...badges.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(
      b => b.name.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)
    )
  }

  if (selectedRarities.value.length > 0) {
    result = result.filter(b => selectedRarities.value.includes(b.rarity || 'common'))
  }

  if (selectedOrigin.value === 'mine') {
    result = result.filter(b => !b.isSystem)
  } else if (selectedOrigin.value === 'system') {
    result = result.filter(b => b.isSystem)
  }

  return result
})

// Form
const form = reactive({ name: '', description: '', missionId: '' })
const errors = reactive({ name: '', description: '', image: '' })

const rarityLabels: Record<string, string> = {
  comun: 'Común',
  rara: 'Rara',
  epica: 'Épica',
  legendaria: 'Legendaria',
  common: 'Común',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Legendaria',
}
const { recentMissions: storeRecentMissions } = storeToRefs(teacherStore)
// `allTeacherMissions` se deriva del teacher store en lugar de mantener un ref
// local redundante; así una sola fuente de verdad alimenta el selector.
const allTeacherMissions = computed<
  Array<{
    id: string
    title: string
    rarity: string
    description?: string
    className?: string
    classNarrative?: string
  }>
>(() =>
  (storeRecentMissions.value || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    rarity: m.rarity || 'comun',
    description: m.description,
    className: m.className,
    classNarrative: m.classNarrative,
  }))
)

// Only show missions without a badge (or the current one being edited)
const teacherMissions = computed(() => {
  const missionIdsWithBadge = new Set(badges.value.filter(b => b.missionId).map(b => b.missionId))
  return allTeacherMissions.value.filter(m => {
    if (editingBadge.value?.missionId === m.id) return true
    return !missionIdsWithBadge.has(m.id)
  })
})

// Auto-set rarity from selected mission
const selectedMission = computed(() => allTeacherMissions.value.find(m => m.id === form.missionId))
const badgeRarity = computed(() => {
  if (!selectedMission.value) return 'common'
  const map: Record<string, string> = {
    comun: 'common',
    rara: 'rare',
    epica: 'epic',
    legendaria: 'legendary',
  }
  return map[selectedMission.value.rarity] || selectedMission.value.rarity || 'common'
})

// Rarity helpers (same as student BadgeRewardCard)
const getRarityClasses = (rarity?: string) => {
  const classes: Record<string, string> = {
    common: 'bg-gray-200 text-gray-700',
    rare: 'bg-sky-100 text-sky-700',
    epic: 'bg-violet-100 text-violet-700',
    legendary: 'bg-amber-100 text-amber-800',
  }
  return classes[rarity || 'common'] || classes.common
}

const getRarityLabel = (rarity?: string) => {
  const labels: Record<string, string> = {
    common: 'Común',
    rare: 'Rara',
    epic: 'Épica',
    legendary: 'Legendaria',
  }
  return labels[rarity || 'common'] || 'Común'
}

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Fetch badges
// Tras crear/editar/eliminar invalidamos la cache del store y volvemos a llamar
// ensureBadges() para refrescar el listado desde la API.
const refreshBadges = async () => {
  badgeStore.invalidate()
  await badgeStore.ensureBadges()
}

// Modal actions
const openCreateModal = () => {
  editingBadge.value = null
  resetForm()
  showFormModal.value = true
}
const openEditModal = (badge: Badge) => {
  editingBadge.value = badge
  form.name = badge.name
  form.description = badge.description
  form.missionId = badge.missionId || ''
  if (badge.imageUrl) imagePreview.value = getImageUrl(badge.imageUrl) || badge.imageUrl
  showFormModal.value = true
}
const openDetailModal = (badge: Badge) => {
  if (!badge.isSystem) {
    openEditModal(badge)
  } else {
    selectedBadge.value = badge
  }
}
const closeFormModal = () => {
  showFormModal.value = false
  resetForm()
}
const confirmDelete = (badge: Badge) => {
  badgeToDelete.value = badge
  showDeleteModal.value = true
}

// Form
const resetForm = () => {
  form.name = ''
  form.description = ''
  form.missionId = ''
  errors.name = ''
  errors.description = ''
  errors.image = ''
  ;(window as any).__badgeRawImagePath = null
  clearFile()
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    toast.error(t('teacher.badges.validation.image_size'))
    return
  }
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('teacher.badges.validation.image_type'))
    return
  }
  selectedFile.value = file
  const reader = new FileReader()
  reader.onload = e => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const clearFile = () => {
  selectedFile.value = null
  imagePreview.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const validate = (): boolean => {
  let isValid = true
  errors.name = ''
  errors.description = ''
  errors.image = ''
  if (!form.name.trim()) {
    errors.name = t('teacher.badges.validation.name_required')
    isValid = false
  } else if (form.name.trim().length < 3) {
    errors.name = t('teacher.badges.validation.name_min_length')
    isValid = false
  }
  if (!imagePreview.value) {
    errors.image = 'La imagen es obligatoria. Sube una o genera con IA.'
    isValid = false
  }
  return isValid
}

const handleSubmit = async () => {
  if (!validate()) return
  isSubmitting.value = true
  try {
    // Use raw AI path if available, otherwise use base64 from file upload
    const aiPath = (window as any).__badgeRawImagePath
    const imageUrl = aiPath && !selectedFile.value ? aiPath : imagePreview.value || undefined
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl,
      rarity: badgeRarity.value,
      missionId: form.missionId || undefined,
    } as any
    if (editingBadge.value) {
      await badgeStore.updateBadge(editingBadge.value.id, payload)
    } else {
      await badgeStore.createBadge(payload)
    }
    await refreshBadges()
    closeFormModal()
  } catch (error) {
    console.error('Error saving badge:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async () => {
  if (!badgeToDelete.value) return
  isDeleting.value = true
  try {
    await badgeStore.deleteBadge(badgeToDelete.value.id)
    await refreshBadges()
    showDeleteModal.value = false
    badgeToDelete.value = null
  } catch (error) {
    console.error('Error deleting badge:', error)
  } finally {
    isDeleting.value = false
  }
}

function buildAIContext() {
  const mission = selectedMission.value
  const parts: string[] = []
  if (mission) {
    parts.push(`Misión: ${mission.title}`)
    if (mission.description) parts.push(`Descripción misión: ${mission.description.slice(0, 300)}`)
    if (mission.className) {
      parts.push(`Clase: ${mission.className}`)
      // Get narrative from teacher classes
      const cls = (teacherStore.classes || []).find((c: any) => c.name === mission.className)
      if (cls && (cls as any).narrative)
        parts.push(`Narrativa de la clase: ${((cls as any).narrative as string).slice(0, 400)}`)
    }
  }
  return parts.join('. ')
}

async function generateAllWithAI() {
  if (isGeneratingAI.value) return
  isGeneratingAI.value = true
  try {
    const context = buildAIContext()

    // Step 1: Generate name + description via centralized prompt
    const { callPrompt } = useAIPrompt()
    const fullText = await callPrompt('badge.generate', { context: context || '' })
    if (fullText) {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.name) form.name = String(parsed.name).trim().slice(0, 80)
        if (parsed.description) form.description = String(parsed.description).trim().slice(0, 200)
      }
    }

    // Step 2: Generate image based on the name
    const imagePrompt = [form.name, form.description, context].filter(Boolean).join('. ')
    const imgRes = await $fetch<{ imageUrl: string }>(`${config.public.apiBase}/ai/badge-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.tokens?.accessToken}` },
      body: {
        prompt: imagePrompt,
        name: form.name,
        description: form.description,
        locale: locale.value,
      },
    })

    if (imgRes?.imageUrl) {
      const fullUrl = imgRes.imageUrl.startsWith('http')
        ? imgRes.imageUrl
        : `${config.public.apiBase}${imgRes.imageUrl}`
      imagePreview.value = fullUrl
      selectedFile.value = null
      ;(window as any).__badgeRawImagePath = imgRes.imageUrl
    }
  } catch (error) {
    console.error('Error generating badge:', error)
  } finally {
    isGeneratingAI.value = false
  }
}

onMounted(async () => {
  // Listado de badges: ensureBadges() respeta la cache del store y evita
  // refetches innecesarios cuando ya hay datos cargados.
  badgeStore.ensureBadges()
  // Clases y misiones recientes vienen del teacher store con su propia cache.
  teacherStore.ensureClasses()
  try {
    await teacherStore.ensureRecentMissions()
  } catch {}
})
</script>
