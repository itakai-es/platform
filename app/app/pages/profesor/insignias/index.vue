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
      :search-placeholder="t('teacher.badges.search_placeholder')"
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
          :all-label="t('teacher.components.mission_filter_bar.all_rarities')"
          :plural-label="t('teacher.components.mission_filter_bar.plural_rarities')"
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

    <!-- Dos bloques: las tuyas, que se editan al abrirlas, y las de ITAKAI, que
         se conceden solas. El buscador y los filtros actúan sobre las dos. -->
    <template v-else-if="badgeSections.length > 0">
      <section
        v-for="section in badgeSections"
        :key="section.key"
        :aria-labelledby="`badges-section-${section.key}`"
      >
        <h2 :id="`badges-section-${section.key}`" class="text-lg font-bold text-navy-700">
          {{ section.title }}
        </h2>
        <p v-if="section.badges.length > 0" class="mt-0.5 mb-3 text-sm text-navy-700/70">
          {{ section.hint }}
        </p>
        <div
          v-if="section.badges.length > 0"
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          <BadgeRewardCard
            v-for="badge in section.badges"
            :key="badge.id"
            :badge="badge"
            :unlocked="true"
            @click="openBadge(badge)"
          />
        </div>
        <!-- Aún no tiene ninguna propia: invita a crear la primera -->
        <EmptyState
          v-else
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
      </section>
    </template>

    <!-- Empty filtered results -->
    <EmptyState
      v-else
      :icon="TrophyIcon"
      :title="t('teacher.badges.no_results_title')"
      :description="t('teacher.badges.no_results_description')"
    />

    <!-- Detalle de una insignia que no se puede editar: por qué, cómo se gana
         si es de ITAKAI y, como en las plantillas ajenas, hacerse una propia. -->
    <Modal v-model="showDetail" :title="detailBadge?.name" size="sm" theme="light">
      <div v-if="detailBadge" class="flex flex-col items-center text-center">
        <img
          v-if="detailBadge.imageUrl"
          :src="getImageUrl(detailBadge.imageUrl)"
          alt=""
          draggable="false"
          class="mb-4 w-32 h-32 xs:w-36 xs:h-36 object-cover rounded-full drop-shadow-lg select-none"
        />
        <div
          v-else
          class="mb-4 w-32 h-32 rounded-full bg-purple/20 flex items-center justify-center"
        >
          <TrophyIcon class="w-16 h-16 text-purple" aria-hidden="true" />
        </div>

        <BadgeRarityPill :rarity="detailBadge.rarity" size="sm" class="mb-3" />

        <!-- La de ITAKAI no lleva su descripción: dice cómo se gana, lo mismo que la
             nota de debajo, que va en el idioma de la app -->
        <p
          v-if="detailBadge.description && !detailBadge.isSystem"
          class="text-sm text-navy-700/70 mb-4"
        >
          {{ detailBadge.description }}
        </p>

        <InfoNote class="w-full text-left">{{ lockedReason }}</InfoNote>
      </div>

      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-end gap-3">
          <Button variant="outline" @click="showDetail = false">
            {{ t('teacher.badges.detail.btn_close') }}
          </Button>
          <Button variant="primary" @click="createSimilar">
            <DocumentDuplicateIcon class="w-4 h-4 mr-2" aria-hidden="true" />
            {{ t('teacher.badges.detail.btn_copy') }}
          </Button>
        </div>
      </template>
    </Modal>

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
              {{ t('teacher.badges.form.label_mission') }}
              <span class="text-navy-700/70 font-normal">{{
                t('teacher.badges.form.image_optional')
              }}</span>
            </label>
            <SelectDropdown
              v-model="form.missionId"
              :options="
                teacherMissions.map(m => ({
                  value: m.id,
                  label: `${m.title} (${missionRarityName(m.rarity)})`,
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
              <span class="text-navy-700/70 font-normal">{{
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
                alt=""
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
              <PhotoIcon class="w-4 h-4 mr-2" aria-hidden="true" />
              {{ t('teacher.badges.form.btn_upload_image') }}
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
            {{
              isGeneratingAI
                ? t('teacher.badges.form.btn_generating')
                : t('teacher.badges.form.btn_generate')
            }}
          </Button>
        </div>
      </div>

      <template #footer>
        <Button v-if="editingBadge" variant="outline" @click="deleteEditingBadge">
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
  TrashIcon,
  PhotoIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
} from '@heroicons/vue/24/outline'
import { canInClass } from '~/utils/class-access'

const { getImageUrl } = useImageUrl()
const { t, locale } = useI18n()
const { formatNumber } = useNumberFormat()
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
  /** Quien la mira puede cambiarla y borrarla (lo decide la API, `manageableBadgesWhere`). */
  canEdit?: boolean
  /** Cómo se gana una del sistema, que se concede sola. */
  trigger?: { type: string; value: number } | null
  /** La creó quien la mira. Una ajena vinculada no sale de la clase de su misión. */
  isMine?: boolean
  missionId?: string
  missionClassId?: string | null
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
// La del detalle se queda al cerrarlo, para que no se vacíe mientras se va.
const showDetail = ref(false)
const detailBadge = ref<Badge | null>(null)
const badgeToDelete = ref<Badge | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)

// File upload
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
// La ruta guardada de la imagen (la de la IA, la de la insignia que se edita o
// la de la que se toma de modelo): se envía tal cual, no la URL ya resuelta. Un
// fichero subido la sustituye.
const imagePath = ref<string | null>(null)

// Live preview
const previewBadge = computed(() => ({
  id: 'preview',
  name: form.name || t('teacher.badges.form.label_name'),
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

const rarityOptions = computed(() =>
  (['common', 'rare', 'epic', 'legendary'] as const).map(value => ({
    value,
    label: t(`teacher.components.mission_filter_bar.rarity.${value}`),
  }))
)

// Con las mismas palabras que las secciones de la lista.
const originOptions = computed(() => [
  { value: 'all', label: t('teacher.badges.filter_all') },
  { value: 'mine', label: t('teacher.badges.sections.own') },
  { value: 'system', label: t('teacher.badges.sections.system') },
])

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

// Las tuyas primero (las que has creado y las de las misiones que puedes
// editar) y después las de ITAKAI, que se conceden solas. Sin ninguna propia,
// su bloque invita a crear la primera, salvo si se busca o se filtra otra cosa.
const ownBadgeCount = computed(() => badges.value.filter(b => !b.isSystem).length)
const badgeSections = computed(() => {
  const own = filteredBadges.value.filter(b => !b.isSystem)
  const system = filteredBadges.value.filter(b => b.isSystem)
  const inviteOwn =
    ownBadgeCount.value === 0 &&
    !searchQuery.value.trim() &&
    selectedRarities.value.length === 0 &&
    selectedOrigin.value !== 'system'
  return [
    {
      key: 'own',
      title: t('teacher.badges.sections.own'),
      hint: t('teacher.badges.sections.own_hint'),
      badges: own,
      visible: own.length > 0 || inviteOwn,
    },
    {
      key: 'system',
      title: t('teacher.badges.sections.system'),
      hint: t('teacher.badges.sections.system_hint'),
      badges: system,
      visible: system.length > 0,
    },
  ].filter(section => section.visible)
})

/** Por qué no se puede editar la del detalle y, si es de ITAKAI, cómo se gana. */
const lockedReason = computed(() => {
  const badge = detailBadge.value
  if (!badge) return ''
  if (!badge.isSystem) return t('teacher.badges.detail.not_yours')
  const trigger = badge.trigger
  if (!trigger) return t('teacher.badges.detail.system_generic')
  const count = formatNumber(trigger.value)
  switch (trigger.type) {
    case 'level_reached':
      return t('teacher.badges.detail.system_level', { count })
    case 'missions_completed':
      return t('teacher.badges.detail.system_missions', { count }, trigger.value)
    case 'xp_total':
      return t('teacher.badges.detail.system_xp', { count })
    default:
      return t('teacher.badges.detail.system_generic')
  }
})

// Form. `rarity` es la de una insignia sin misión; con misión, manda la de esta.
const form = reactive({ name: '', description: '', missionId: '', rarity: 'common' })
const errors = reactive({ name: '', description: '', image: '' })

/** La rareza de una misión («comun», «rara»…), con su nombre en el idioma de la app. */
const MISSION_RARITIES = ['comun', 'rara', 'epica', 'legendaria']
const missionRarityName = (rarity: string) =>
  t(`student.components.rarity_badge.${MISSION_RARITIES.includes(rarity) ? rarity : 'comun'}`)
const { recentMissions: storeRecentMissions } = storeToRefs(teacherStore)
// `allTeacherMissions` se deriva del teacher store en lugar de mantener un ref
// local redundante; así una sola fuente de verdad alimenta el selector.
const allTeacherMissions = computed<
  Array<{
    id: string
    classId: string
    title: string
    rarity: string
    description?: string
    className?: string
    classNarrative?: string
  }>
>(() =>
  (storeRecentMissions.value || []).map((m: any) => ({
    id: m.id,
    classId: m.classId,
    title: m.title,
    rarity: m.rarity || 'comun',
    description: m.description,
    className: m.className,
    classNarrative: m.classNarrative,
  }))
)

// Solo misiones sin insignia (o la de la que se edita) y de clases donde se
// pueden editar: una insignia se vincula a una misión que se puede cambiar.
const editableClassIds = computed(
  () =>
    new Set(teacherStore.classes.filter(c => canInClass(c.myAccess, 'mission.edit')).map(c => c.id))
)
// Una insignia ajena ya vinculada solo cambia a otra misión de su misma clase.
const lockedClassId = computed(() => {
  const badge = editingBadge.value
  return badge?.missionId && !badge.isMine ? (badge.missionClassId ?? null) : null
})
const teacherMissions = computed(() => {
  const missionIdsWithBadge = new Set(badges.value.filter(b => b.missionId).map(b => b.missionId))
  return allTeacherMissions.value.filter(m => {
    if (editingBadge.value?.missionId === m.id) return true
    if (lockedClassId.value && m.classId !== lockedClassId.value) return false
    return editableClassIds.value.has(m.classId) && !missionIdsWithBadge.has(m.id)
  })
})

// Auto-set rarity from selected mission
const selectedMission = computed(() => allTeacherMissions.value.find(m => m.id === form.missionId))
const badgeRarity = computed(() => {
  if (!selectedMission.value) return form.rarity
  const map: Record<string, string> = {
    comun: 'common',
    rara: 'rare',
    epica: 'epic',
    legendaria: 'legendary',
  }
  return map[selectedMission.value.rarity] || selectedMission.value.rarity || 'common'
})

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
/** Pone en el formulario la imagen guardada de una insignia. */
const loadBadgeImage = (badge: Badge) => {
  imagePath.value = badge.imageUrl || null
  imagePreview.value = getImageUrl(badge.imageUrl) || null
}
const openEditModal = (badge: Badge) => {
  editingBadge.value = badge
  form.name = badge.name
  form.description = badge.description
  form.missionId = badge.missionId || ''
  form.rarity = badge.rarity || 'common'
  loadBadgeImage(badge)
  showFormModal.value = true
}
/** La que se puede editar se abre para editarla; las demás, en su detalle. */
const openBadge = (badge: Badge) => {
  if (badge.canEdit) {
    openEditModal(badge)
  } else {
    detailBadge.value = badge
    showDetail.value = true
  }
}
/** «Crear una parecida»: una nueva con el nombre, la rareza y la imagen de la del detalle. */
const createSimilar = () => {
  const badge = detailBadge.value
  if (!badge) return
  showDetail.value = false
  openCreateModal()
  // Con otro nombre: dos insignias que se llaman igual no se distinguen.
  form.name = t('teacher.badges.form.copy_name', { name: badge.name })
  form.rarity = badge.rarity || 'common'
  loadBadgeImage(badge)
}
const closeFormModal = () => {
  showFormModal.value = false
  resetForm()
}
const confirmDelete = (badge: Badge) => {
  badgeToDelete.value = badge
  showDeleteModal.value = true
}
const deleteEditingBadge = () => {
  if (editingBadge.value) confirmDelete(editingBadge.value)
  closeFormModal()
}

// Form
const resetForm = () => {
  form.name = ''
  form.description = ''
  form.missionId = ''
  form.rarity = 'common'
  errors.name = ''
  errors.description = ''
  errors.image = ''
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
  imagePath.value = null
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
    errors.image = t('teacher.badges.validation.image_required')
    isValid = false
  }
  return isValid
}

const handleSubmit = async () => {
  if (!validate()) return
  isSubmitting.value = true
  try {
    // La ruta guardada si la hay (IA, la que se edita o la de modelo); si se
    // ha subido un fichero, su base64.
    const imageUrl = (!selectedFile.value && imagePath.value) || imagePreview.value || undefined
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
    toast.error(t('teacher.badges.save_error'))
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
    toast.error(t('teacher.badges.delete_error'))
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
      imagePath.value = imgRes.imageUrl
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
