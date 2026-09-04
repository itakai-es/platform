<template>
  <Modal
    :model-value="modelValue"
    :title="t('student.components.submission_modal.title')"
    size="md"
    theme="light"
    persistent
    @update:model-value="handleClose"
  >
    <div class="space-y-4">
      <!-- Enigma info -->
      <div v-if="enigma" class="bg-gray-50 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0"
          >
            <span class="text-white font-bold text-sm">{{ enigmaNumber }}</span>
          </div>
          <div>
            <h4 class="font-semibold text-navy-700">{{ enigma.title }}</h4>
            <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span
                v-if="showXp"
                class="inline-flex items-center gap-1 text-xs text-navy-700 bg-purple-light px-2 py-0.5 rounded-full"
              >
                <XpIcon class="w-3 h-3" />{{ enigma.xp }} XP
              </span>
              <span
                v-if="enigma.coins && showCoins"
                class="inline-flex items-center gap-1 text-xs text-navy-700 bg-yellow-light px-2 py-0.5 rounded-full"
              >
                <CoinIcon class="w-3 h-3" />{{ enigma.coins }}
              </span>
              <span
                v-if="enigma.mana && showMana"
                class="inline-flex items-center gap-1 text-xs text-navy-700 bg-sky-light px-2 py-0.5 rounded-full"
              >
                <ManaIcon class="w-3 h-3" />{{ enigma.mana }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- File Upload -->
      <div>
        <label class="block text-sm font-medium text-navy-700 mb-1.5">
          {{ t('student.components.submission_modal.file_label') }}
          <span class="text-red-500">{{
            t('student.components.submission_modal.file_required')
          }}</span>
        </label>
        <div
          class="relative border-2 border-dashed rounded-xl p-6 text-center transition-colors"
          :class="[
            errors.file
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 hover:border-primary hover:bg-gray-50',
            selectedFile ? 'bg-primary/5 border-primary/40' : '',
            isDragging ? 'border-primary bg-gray-50' : '',
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".zip,.rar,.7z"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            @change="handleFileSelect"
          />
          <div v-if="selectedFile" class="flex flex-col items-center gap-2">
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArchiveBoxIcon class="w-6 h-6 text-primary" />
            </div>
            <div class="text-center">
              <p class="text-sm font-medium text-navy-700">{{ selectedFile.name }}</p>
              <p class="text-xs text-navy-700/70">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
          </div>
          <div v-else class="text-gray-500">
            <ArrowUpTrayIcon class="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p class="text-sm font-medium">
              {{ t('student.components.submission_modal.drag_hint') }}
            </p>
            <p class="text-xs text-gray-400 mt-1">
              {{ t('student.components.submission_modal.file_types') }}
            </p>
          </div>
        </div>
        <p v-if="errors.file" class="mt-1 text-xs text-red-500">{{ errors.file }}</p>
      </div>
    </div>

    <template #footer>
      <Button variant="outline" @click="handleClose(false)">
        {{ t('student.components.submission_modal.cancel_button') }}
      </Button>
      <Button variant="primary" :disabled="isSubmitting || !selectedFile" @click="handleSubmit">
        {{
          isSubmitting
            ? t('student.components.submission_modal.submitting_button')
            : t('student.components.submission_modal.submit_button')
        }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ArrowUpTrayIcon, ArchiveBoxIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()

interface Enigma {
  id: string
  title: string
  xp: number
  coins?: number
  mana?: number
}

interface Props {
  modelValue: boolean
  enigma?: Enigma | null
  enigmaNumber?: number
  // Hide a reward chip when that resource is disabled for the class.
  showXp?: boolean
  showCoins?: boolean
  showMana?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enigma: null,
  enigmaNumber: 1,
  showXp: true,
  showCoins: true,
  showMana: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: { enigmaId: string; file: File }]
}>()

const isSubmitting = ref(false)
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const errors = reactive({
  file: '',
})

// Reset form when modal opens
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      resetForm()
    }
  }
)

const resetForm = () => {
  selectedFile.value = null
  errors.file = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  validateAndSetFile(file)
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  validateAndSetFile(file)
}

const validateAndSetFile = (file?: File) => {
  if (!file) return

  // Check file type
  const validExtensions = ['.zip', '.rar', '.7z']
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!validExtensions.includes(extension)) {
    errors.file = t('student.components.submission_modal.validation.invalid_type')
    return
  }

  // Check file size (max 50MB)
  if (file.size > 50 * 1024 * 1024) {
    errors.file = t('student.components.submission_modal.validation.file_too_large')
    return
  }

  selectedFile.value = file
  errors.file = ''
}

const clearFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const validate = (): boolean => {
  errors.file = ''

  if (!selectedFile.value) {
    errors.file = t('student.components.submission_modal.validation.file_required')
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validate() || !props.enigma) return

  isSubmitting.value = true

  try {
    emit('submit', {
      enigmaId: props.enigma.id,
      file: selectedFile.value!,
    })

    handleClose(false)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = (value: boolean) => {
  emit('update:modelValue', value)
}
</script>
