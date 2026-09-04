<template>
  <Modal
    :model-value="modelValue"
    :title="
      isEditing
        ? t('teacher.components.document_form_modal.edit_title')
        : t('teacher.components.document_form_modal.add_title')
    "
    size="md"
    theme="light"
    persistent
    @update:model-value="handleClose"
  >
    <div class="space-y-4">
      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-navy-700 mb-1.5">
          {{ t('teacher.components.document_form_modal.label_title') }}
          <span class="text-red-500">*</span>
        </label>
        <Input
          v-model="form.title"
          :placeholder="t('teacher.components.document_form_modal.placeholder_title')"
          :error="!!errors.title"
          required
        />
        <p v-if="errors.title" class="mt-1 text-xs text-red-500">{{ errors.title }}</p>
      </div>

      <!-- File or Link toggle -->
      <div class="flex items-center gap-4 pb-2">
        <button
          type="button"
          :class="[
            'flex-1 py-2 rounded-xl text-sm font-medium transition-colors',
            !isLinkMode ? 'bg-navy-700 text-white' : 'bg-gray-100 text-navy-700 hover:bg-gray-200',
          ]"
          @click="isLinkMode = false"
        >
          <ArrowUpTrayIcon class="w-4 h-4 inline mr-1.5" />
          {{ t('teacher.components.document_form_modal.btn_upload_file') }}
        </button>
        <button
          type="button"
          :class="[
            'flex-1 py-2 rounded-xl text-sm font-medium transition-colors',
            isLinkMode ? 'bg-navy-700 text-white' : 'bg-gray-100 text-navy-700 hover:bg-gray-200',
          ]"
          @click="isLinkMode = true; form.type = 'link'"
        >
          <LinkIcon class="w-4 h-4 inline mr-1.5" />
          {{ t('teacher.components.document_form_modal.btn_add_link') }}
        </button>
      </div>

      <!-- File Upload -->
      <div v-if="!isLinkMode">
        <label class="block text-sm font-medium text-navy-700 mb-1.5">
          {{ t('teacher.components.document_form_modal.label_file') }}
          <span class="text-red-500">*</span>
        </label>
        <div
          class="relative border-2 border-dashed rounded-xl p-4 text-center transition-colors"
          :class="[
            errors.file
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 hover:border-navy-700/50 hover:bg-gray-50',
            selectedFile ? 'bg-navy-700/5 border-navy-700/30' : '',
          ]"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.doc,.docx,.mp4,.mov,.avi,.webm,.png,.jpg,.jpeg,.gif,.svg,.webp"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            @change="handleFileSelect"
          />
          <div v-if="selectedFile" class="flex items-center justify-center gap-2">
            <component :is="getFileIcon(form.type)" class="w-5 h-5 text-green-600" />
            <span class="text-sm font-medium text-green-700">{{ selectedFile.name }}</span>
            <button
              type="button"
              class="ml-2 p-1 hover:bg-green-100 rounded-full transition-colors"
              @click.stop="clearFile"
            >
              <XMarkIcon class="w-4 h-4 text-green-600" />
            </button>
          </div>
          <div v-else class="text-gray-500">
            <ArrowUpTrayIcon class="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p class="text-sm">{{ t('teacher.components.document_form_modal.drop_hint') }}</p>
            <p class="text-xs text-gray-400 mt-1">
              {{ t('teacher.components.document_form_modal.file_types_hint') }}
            </p>
          </div>
        </div>
        <p v-if="errors.file" class="mt-1 text-xs text-red-500">{{ errors.file }}</p>
      </div>

      <!-- URL (for links) -->
      <div v-else>
        <label class="block text-sm font-medium text-navy-700 mb-1.5">
          {{ t('teacher.components.document_form_modal.label_url') }}
          <span class="text-red-500">*</span>
        </label>
        <Input v-model="form.url" type="url" placeholder="https://..." :error="!!errors.url" />
        <p v-if="errors.url" class="mt-1 text-xs text-red-500">{{ errors.url }}</p>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-navy-700 mb-1.5">
          {{ t('teacher.components.document_form_modal.label_description') }}
          <span class="text-navy-700/70 font-normal">{{
            t('teacher.components.document_form_modal.label_description_optional')
          }}</span>
        </label>
        <textarea
          v-model="form.description"
          rows="2"
          class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
          :placeholder="t('teacher.components.document_form_modal.placeholder_description')"
        />
      </div>

      <!-- Tags -->
      <div>
        <label class="block text-sm font-medium text-navy-700 mb-1.5">
          {{ t('teacher.components.document_form_modal.label_tags') }}
        </label>
        <Input
          v-model="newTag"
          type="text"
          :placeholder="t('teacher.components.document_form_modal.placeholder_tags')"
          @keydown="handleTagKeydown"
        />
        <div v-if="form.tags.length > 0" class="flex flex-wrap gap-2 mt-2">
          <span
            v-for="(tag, index) in form.tags"
            :key="index"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-white rounded-lg text-sm font-medium shadow-sm"
          >
            {{ tag }}
            <button
              type="button"
              class="w-4 h-4 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              @click="removeTag(index)"
            >
              <XMarkIcon class="w-3 h-3" />
            </button>
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="outline" @click="handleClose(false)">
        {{ t('teacher.components.document_form_modal.btn_cancel') }}
      </Button>
      <Button variant="primary" :disabled="isSubmitting" @click="handleSubmit">
        {{
          isSubmitting
            ? t('teacher.components.document_form_modal.btn_saving')
            : isEditing
              ? t('teacher.components.document_form_modal.btn_save')
              : t('teacher.components.document_form_modal.btn_add')
        }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import {
  XMarkIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  LinkIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()

type DocumentType = 'pdf' | 'video' | 'docx' | 'link' | 'image'

interface DocumentFormData {
  id?: string
  title: string
  type: DocumentType
  format: string
  metadata: string
  description: string
  tags: string[]
  url?: string
  file?: File
}

interface Props {
  modelValue: boolean
  document?: DocumentFormData | null
}

const props = withDefaults(defineProps<Props>(), {
  document: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: DocumentFormData]
}>()

const isEditing = computed(() => !!props.document?.id)
const isSubmitting = ref(false)
const newTag = ref('')

// Form state
const form = reactive<Omit<DocumentFormData, 'url'> & { url: string }>({
  title: '',
  type: 'pdf',
  format: 'PDF',
  metadata: '',
  description: '',
  tags: [],
  url: '',
})

const errors = reactive({
  title: '',
  url: '',
  file: '',
})

// File upload state
const isLinkMode = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// File type detection from extension
const getFileTypeFromExtension = (filename: string): DocumentType => {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'doc':
    case 'docx':
      return 'docx'
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'webm':
      return 'video'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return 'image'
    default:
      return 'pdf'
  }
}

// Handle file selection
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      errors.file = t('teacher.components.document_form_modal.validation.file_too_large')
      return
    }
    selectedFile.value = file
    form.type = getFileTypeFromExtension(file.name)
    form.format = formatMap[form.type]
    errors.file = ''
  }
}

// Clear selected file
const clearFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  form.type = 'pdf'
  form.format = 'PDF'
}

// Get icon for file type
const getFileIcon = (type: DocumentType) => {
  switch (type) {
    case 'pdf':
      return DocumentTextIcon
    case 'video':
      return VideoCameraIcon
    case 'docx':
      return DocumentIcon
    case 'image':
      return PhotoIcon
    default:
      return DocumentIcon
  }
}

// Format mapping
const formatMap: Record<DocumentType, string> = {
  pdf: 'PDF',
  video: 'MP4',
  docx: 'DOCX',
  link: 'HTML',
  image: 'PNG',
}

// Auto-generate metadata based on document type (simulates file analysis)
const generateMetadata = (type: DocumentType): string => {
  switch (type) {
    case 'pdf':
      return `${Math.floor(Math.random() * 20) + 5} páginas`
    case 'docx':
      return `${Math.floor(Math.random() * 15) + 3} páginas`
    case 'video':
      return `${Math.floor(Math.random() * 15) + 5} min`
    case 'link':
      return 'Recurso externo'
    case 'image':
      return `${Math.floor(Math.random() * 3000) + 500} KB`
    default:
      return ''
  }
}

// Auto-update format when type changes
watch(
  () => form.type,
  newType => {
    form.format = formatMap[newType]
  }
)

// Reset form when modal opens/closes or document changes
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      resetForm()
    }
  }
)

watch(
  () => props.document,
  () => {
    if (props.modelValue) {
      resetForm()
    }
  },
  { deep: true }
)

const resetForm = () => {
  if (props.document) {
    form.title = props.document.title
    form.type = props.document.type
    form.format = props.document.format
    form.metadata = props.document.metadata
    form.description = props.document.description
    form.tags = [...(props.document.tags || [])]
    form.url = props.document.url || ''
    isLinkMode.value = props.document.type === 'link'
  } else {
    form.title = ''
    form.type = 'pdf'
    form.format = 'PDF'
    form.metadata = ''
    form.description = ''
    form.tags = []
    form.url = ''
    isLinkMode.value = false
  }
  newTag.value = ''
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  errors.title = ''
  errors.url = ''
  errors.file = ''
}

const handleTagKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    addTag()
  }
}

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
    newTag.value = ''
  }
}

const removeTag = (index: number) => {
  form.tags.splice(index, 1)
}

const validate = (): boolean => {
  let isValid = true
  errors.title = ''
  errors.url = ''
  errors.file = ''

  if (!form.title.trim()) {
    errors.title = t('teacher.components.document_form_modal.validation.title_required')
    isValid = false
  }

  if (isLinkMode.value && !form.url?.trim()) {
    errors.url = t('teacher.components.document_form_modal.validation.url_required')
    isValid = false
  }

  // Only require file for new documents (not editing)
  if (!isLinkMode.value && !isEditing.value && !selectedFile.value) {
    errors.file = t('teacher.components.document_form_modal.validation.file_required')
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validate()) return

  isSubmitting.value = true

  try {
    emit('submit', {
      id: props.document?.id,
      title: form.title.trim(),
      type: form.type,
      format: form.format,
      metadata: props.document?.id ? form.metadata : generateMetadata(form.type),
      description: form.description.trim(),
      tags: form.tags,
      url: form.url?.trim(),
      file: selectedFile.value || undefined,
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
