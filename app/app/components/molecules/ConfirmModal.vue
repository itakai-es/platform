<template>
  <Modal
    :model-value="modelValue"
    :title="title"
    size="sm"
    theme="light"
    persistent
    close-on-esc
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="text-center">
      <!-- Icon -->
      <div
        class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        :class="iconBgClass"
      >
        <component :is="iconComponent" class="w-8 h-8" :class="iconClass" />
      </div>

      <!-- Message -->
      <p class="text-navy-700 text-sm">{{ message }}</p>
    </div>

    <!-- Extra content (e.g. password confirmation) -->
    <form v-if="$slots.default" class="mt-4" @submit.prevent="handleConfirm">
      <slot />
    </form>

    <template #footer>
      <Button variant="outline" class="flex-1" @click="handleCancel">
        {{ cancelText }}
      </Button>
      <Button :variant="confirmVariant" class="flex-1" :disabled="loading" @click="handleConfirm">
        {{ loading ? t('common.actions.processing') : confirmText }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon, TrashIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'success'
  loading?: boolean
}

const { t } = useI18n()

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirmar acción',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  variant: 'danger',
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const iconComponent = computed(() => {
  switch (props.variant) {
    case 'danger':
      return TrashIcon
    case 'warning':
      return ExclamationTriangleIcon
    case 'success':
      return CheckCircleIcon
    default:
      return ExclamationTriangleIcon
  }
})

const iconBgClass = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'bg-navy-700/10'
    case 'warning':
      return 'bg-amber-100'
    case 'success':
      return 'bg-mint/20'
    default:
      return 'bg-gray-100'
  }
})

const iconClass = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'text-navy-700'
    case 'warning':
      return 'text-amber-500'
    case 'success':
      return 'text-mint'
    default:
      return 'text-gray-500'
  }
})

const confirmVariant = computed(() => {
  if (props.variant === 'danger') return 'danger' as const
  return 'primary' as const
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>
