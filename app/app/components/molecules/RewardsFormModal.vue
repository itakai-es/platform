<template>
  <Modal
    :model-value="modelValue"
    :title="t('teacher.components.rewards_form_modal.title')"
    size="md"
    theme="light"
    persistent
    @update:model-value="handleClose"
  >
    <div class="space-y-6">
      <!-- Badge Section -->
      <div>
        <label class="block text-sm font-medium text-navy-700 mb-3">
          {{ t('teacher.components.rewards_form_modal.badge_label') }}
        </label>

        <!-- Current Badge (if exists) -->
        <div v-if="currentBadge" class="mb-4">
          <div class="flex items-center gap-4 p-4 bg-purple/10 rounded-xl border-2 border-purple">
            <div
              class="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-md"
            >
              <img
                v-if="currentBadge.imageUrl"
                :src="getImageUrl(currentBadge.imageUrl)"
                :alt="currentBadge.name"
                class="w-16 h-16 object-cover"
              />
              <TrophyIcon v-else class="w-8 h-8 text-purple" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-navy-700">{{ currentBadge.name }}</p>
              <p class="text-sm text-navy-700/70 line-clamp-2">{{ currentBadge.description }}</p>
              <span
                v-if="currentBadge.rarity"
                class="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                :class="getRarityClasses(currentBadge.rarity)"
              >
                {{ getRarityLabel(currentBadge.rarity) }}
              </span>
            </div>
            <button
              type="button"
              class="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-500"
              :title="t('teacher.components.rewards_form_modal.remove_badge')"
              @click="removeBadge"
            >
              <TrashIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- No Badge Selected -->
        <div v-else class="mb-4">
          <div
            class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"
          >
            <div class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <TrophyIcon class="w-8 h-8 text-gray-400" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-500">
                {{ t('teacher.components.rewards_form_modal.no_badge_title') }}
              </p>
              <p class="text-sm text-gray-400">
                {{ t('teacher.components.rewards_form_modal.no_badge_description') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Toggle: Select existing or Create new -->
        <div class="flex items-center gap-2 mb-4">
          <button
            type="button"
            :class="[
              'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors',
              !isCreatingNew
                ? 'bg-navy-700 text-white'
                : 'bg-gray-100 text-navy-700 hover:bg-gray-200',
            ]"
            @click="isCreatingNew = false"
          >
            <SparklesIcon class="w-4 h-4 inline mr-1.5" />
            {{ t('teacher.components.rewards_form_modal.btn_select_existing') }}
          </button>
          <button
            type="button"
            :class="[
              'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isCreatingNew
                ? 'bg-navy-700 text-white'
                : 'bg-gray-100 text-navy-700 hover:bg-gray-200',
            ]"
            @click="isCreatingNew = true"
          >
            <PlusIcon class="w-4 h-4 inline mr-1.5" />
            {{ t('teacher.components.rewards_form_modal.btn_create_new') }}
          </button>
        </div>

        <!-- Select Existing Badge -->
        <div v-if="!isCreatingNew" class="space-y-3">
          <p class="text-sm text-navy-700/70">
            {{ t('teacher.components.rewards_form_modal.select_hint') }}
          </p>

          <div v-if="loadingBadges" class="flex items-center justify-center py-8">
            <div
              class="w-6 h-6 border-2 border-navy-700 border-t-transparent rounded-full animate-spin"
            />
          </div>

          <div
            v-else-if="availableBadges.length === 0"
            class="text-center py-8 bg-gray-50 rounded-xl"
          >
            <TrophyIcon class="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p class="text-sm text-gray-500">
              {{ t('teacher.components.rewards_form_modal.no_badges_created') }}
            </p>
            <button
              type="button"
              class="mt-3 text-sm text-purple hover:underline font-medium"
              @click="isCreatingNew = true"
            >
              {{ t('teacher.components.rewards_form_modal.btn_create_first') }}
            </button>
          </div>

          <div v-else class="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            <button
              v-for="badge in availableBadges"
              :key="badge.id"
              type="button"
              :class="[
                'p-3 rounded-xl border-2 transition-all text-left',
                selectedBadgeId === badge.id
                  ? 'border-purple bg-purple/10'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              ]"
              @click="selectBadge(badge)"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0"
                >
                  <img
                    v-if="badge.imageUrl"
                    :src="getImageUrl(badge.imageUrl)"
                    :alt="badge.name"
                    class="w-12 h-12 object-cover"
                  />
                  <TrophyIcon v-else class="w-6 h-6 text-purple" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-navy-700 text-sm truncate">{{ badge.name }}</p>
                  <span
                    v-if="badge.rarity"
                    class="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                    :class="getRarityClasses(badge.rarity)"
                  >
                    {{ getRarityLabel(badge.rarity) }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Create New Badge Form -->
        <div v-else class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-navy-700 mb-1.5">
              {{ t('teacher.components.rewards_form_modal.label_name') }}
              <span class="text-red-500">*</span>
            </label>
            <Input
              v-model="newBadge.name"
              :placeholder="t('teacher.components.rewards_form_modal.placeholder_name')"
              :error="!!errors.name"
            />
            <p v-if="errors.name" class="mt-1 text-xs text-red-500">{{ errors.name }}</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-navy-700 mb-1.5">
              {{ t('teacher.components.rewards_form_modal.label_description') }}
              <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="newBadge.description"
              rows="2"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              :class="{ 'border-red-300': errors.description }"
              :placeholder="t('teacher.components.rewards_form_modal.placeholder_description')"
            />
            <p v-if="errors.description" class="mt-1 text-xs text-red-500">
              {{ errors.description }}
            </p>
          </div>

          <!-- Image Upload -->
          <div>
            <label class="block text-sm font-medium text-navy-700 mb-1.5">
              {{ t('teacher.components.rewards_form_modal.label_image') }}
              <span class="text-navy-700/70 font-normal">{{
                t('teacher.components.rewards_form_modal.image_optional')
              }}</span>
            </label>
            <div
              class="relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer"
              :class="[
                selectedFile
                  ? 'border-purple bg-purple/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              ]"
              @click="fileInput?.click()"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                class="hidden"
                @change="handleFileSelect"
              />
              <div v-if="imagePreview" class="flex flex-col items-center">
                <img
                  :src="imagePreview"
                  alt="Preview"
                  class="w-16 h-16 object-cover rounded-full mb-2"
                />
                <span class="text-sm font-medium text-purple">{{
                  selectedFile?.name || t('teacher.components.rewards_form_modal.image_selected')
                }}</span>
                <button
                  type="button"
                  class="mt-2 text-xs text-red-500 hover:underline"
                  @click.stop="clearFile"
                >
                  {{ t('teacher.components.rewards_form_modal.btn_remove_image') }}
                </button>
              </div>
              <div v-else class="text-gray-500">
                <PhotoIcon class="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p class="text-sm">
                  {{ t('teacher.components.rewards_form_modal.upload_prompt') }}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  {{ t('teacher.components.rewards_form_modal.upload_hint') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Rarity -->
          <div>
            <label class="block text-sm font-medium text-navy-700 mb-1.5">
              {{ t('teacher.components.rewards_form_modal.label_rarity') }}
            </label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="rarity in rarityOptions"
                :key="rarity.value"
                type="button"
                :class="[
                  'py-2 px-3 rounded-xl text-xs font-medium transition-colors border-2',
                  newBadge.rarity === rarity.value
                    ? `${rarity.selectedClass} border-current`
                    : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100',
                ]"
                @click="newBadge.rarity = rarity.value"
              >
                {{ rarity.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="outline" @click="handleClose(false)">
        {{ t('teacher.components.rewards_form_modal.btn_cancel') }}
      </Button>
      <Button variant="primary" :disabled="isSubmitting" @click="handleSubmit">
        {{
          isSubmitting
            ? t('teacher.components.rewards_form_modal.btn_saving')
            : t('teacher.components.rewards_form_modal.btn_save')
        }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { TrophyIcon, TrashIcon, PlusIcon, SparklesIcon, PhotoIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()
const toast = useToast()
const { getImageUrl } = useImageUrl()

type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

interface BadgeReward {
  id: string
  name: string
  description?: string
  imageUrl?: string
  rarity?: BadgeRarity
}

interface Props {
  modelValue: boolean
  badge?: BadgeReward | null
  availableBadges?: BadgeReward[]
  loadingBadges?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  badge: null,
  availableBadges: () => [],
  loadingBadges: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: { badge: BadgeReward | null; isNew: boolean; file?: File | null }]
  loadBadges: []
}>()

const isSubmitting = ref(false)
const isCreatingNew = ref(false)
const selectedBadgeId = ref<string | null>(null)
const currentBadge = ref<BadgeReward | null>(null)
const imageError = ref(false)

// File upload
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

// New badge form
const newBadge = reactive({
  name: '',
  description: '',
  imageUrl: '',
  rarity: 'common' as BadgeRarity,
})

const errors = reactive({
  name: '',
  description: '',
})

const rarityOptions = computed(
  () =>
    [
      {
        value: 'common',
        label: t('teacher.components.rewards_form_modal.rarity.common'),
        selectedClass: 'bg-gray-200 text-gray-700',
      },
      {
        value: 'rare',
        label: t('teacher.components.rewards_form_modal.rarity.rare'),
        selectedClass: 'bg-sky/20 text-sky',
      },
      {
        value: 'epic',
        label: t('teacher.components.rewards_form_modal.rarity.epic'),
        selectedClass: 'bg-purple/20 text-purple',
      },
      {
        value: 'legendary',
        label: t('teacher.components.rewards_form_modal.rarity.legendary'),
        selectedClass: 'bg-yellow/20 text-yellow-dark',
      },
    ] as const
)

const getRarityClasses = (rarity?: string) => {
  const classes: Record<string, string> = {
    common: 'bg-gray-200 text-gray-700',
    rare: 'bg-sky/20 text-sky',
    epic: 'bg-purple/20 text-purple',
    legendary: 'bg-yellow/20 text-yellow-dark',
  }
  return classes[rarity || 'common'] || classes.common
}

const getRarityLabel = (rarity?: string) => {
  const key = rarity || 'common'
  return t(`teacher.components.rewards_form_modal.rarity.${key}`)
}

// Reset form when modal opens
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      resetForm()
      emit('loadBadges')
    }
  }
)

const resetForm = () => {
  currentBadge.value = props.badge ? { ...props.badge } : null
  selectedBadgeId.value = props.badge?.id || null
  isCreatingNew.value = false
  imageError.value = false
  newBadge.name = ''
  newBadge.description = ''
  newBadge.imageUrl = ''
  newBadge.rarity = 'common'
  errors.name = ''
  errors.description = ''
  // Clear file upload state
  clearFile()
}

const selectBadge = (badge: BadgeReward) => {
  selectedBadgeId.value = badge.id
  currentBadge.value = { ...badge }
}

const removeBadge = () => {
  currentBadge.value = null
  selectedBadgeId.value = null
}

const handleImageError = () => {
  imageError.value = true
  newBadge.imageUrl = ''
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    toast.error(t('teacher.components.rewards_form_modal.validation.image_size'))
    return
  }

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('teacher.components.rewards_form_modal.validation.image_type'))
    return
  }

  selectedFile.value = file

  // Create preview
  const reader = new FileReader()
  reader.onload = e => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const clearFile = () => {
  selectedFile.value = null
  imagePreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const validate = (): boolean => {
  let isValid = true
  errors.name = ''
  errors.description = ''

  if (isCreatingNew.value) {
    if (!newBadge.name.trim()) {
      errors.name = t('teacher.components.rewards_form_modal.validation.name_required')
      isValid = false
    }
    if (!newBadge.description.trim()) {
      errors.description = t(
        'teacher.components.rewards_form_modal.validation.description_required'
      )
      isValid = false
    }
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validate()) return

  isSubmitting.value = true

  try {
    if (isCreatingNew.value) {
      // Create new badge - use imagePreview (base64) as the image
      emit('submit', {
        badge: {
          id: `badge-new-${Date.now()}`,
          name: newBadge.name.trim(),
          description: newBadge.description.trim(),
          imageUrl: imagePreview.value || undefined,
          rarity: newBadge.rarity,
        },
        isNew: true,
        file: selectedFile.value,
      })
    } else {
      // Select existing or remove
      emit('submit', {
        badge: currentBadge.value,
        isNew: false,
      })
    }

    handleClose(false)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = (value: boolean) => {
  emit('update:modelValue', value)
}
</script>
