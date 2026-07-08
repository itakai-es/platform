<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" :class="viewportClasses">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="handleBackdropClick" />

        <!-- Modal Container -->
        <div :class="containerClasses">
          <div :class="modalClasses" @click.stop>
            <!-- Header -->
            <div v-if="title || $slots.header" :class="headerClasses">
              <slot name="header">
                <h3 :class="titleClasses">{{ title }}</h3>
              </slot>
              <button
                v-if="closable"
                type="button"
                :class="closeButtonClasses"
                @click="handleClose"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div :class="bodyClasses">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" :class="footerClasses">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  theme?: 'light' | 'dark'
  closable?: boolean
  persistent?: boolean // Prevents closing on backdrop click
  /**
   * Si true, la altura del modal se limita a la ventana y el scroll queda
   * dentro del body (header y footer se quedan pegados arriba/abajo).
   * Por defecto false para mantener el comportamiento clásico (scroll de la
   * ventana entera cuando el contenido crece).
   */
  stickyChrome?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  theme: 'light',
  closable: true,
  persistent: false,
  stickyChrome: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const viewportClasses = computed(() =>
  props.stickyChrome
    ? 'fixed inset-0 z-50 overflow-hidden'
    : 'fixed inset-0 z-50 overflow-y-auto'
)

const containerClasses = computed(() =>
  props.stickyChrome
    ? 'flex h-full items-center justify-center p-4'
    : 'flex min-h-full items-center justify-center p-4'
)

const modalClasses = computed(() => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  }

  const themes = {
    light: 'bg-white border-gray-100',
    dark: 'bg-navy-dark border-navy-medium',
  }

  // Con stickyChrome forzamos altura fija ~92vh para que la ventana no "salte"
  // según el contenido — siempre ocupa el mismo espacio en pantalla.
  const layout = props.stickyChrome
    ? 'flex flex-col h-[92vh] max-h-[92vh]'
    : ''

  return `relative w-full ${sizes[props.size]} ${themes[props.theme]} rounded-2xl shadow-xl transition-all overflow-hidden ${layout}`
})

const headerClasses = computed(() => {
  const themes = {
    light: 'border-gray-100',
    dark: 'border-navy-medium',
  }
  const layout = props.stickyChrome ? 'flex-shrink-0' : ''
  return `flex items-center justify-between p-6 pb-4 border-b ${themes[props.theme]} ${layout}`
})

const titleClasses = computed(() => {
  const themes = {
    light: 'text-navy-700',
    dark: 'text-text-primary',
  }
  return `text-xl font-bold ${themes[props.theme]}`
})

const closeButtonClasses = computed(() => {
  const themes = {
    light: 'p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500',
    dark: 'text-text-secondary hover:text-text-primary transition-colors',
  }
  return themes[props.theme]
})

const bodyClasses = computed(() => {
  const themes = {
    light: 'p-6 text-text-secondary',
    dark: 'p-6 text-text-secondary',
  }
  const layout = props.stickyChrome ? 'flex-1 overflow-y-auto min-h-0' : ''
  return `${themes[props.theme]} ${layout}`
})

const footerClasses = computed(() => {
  const themes = {
    light: 'flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100',
    dark: 'flex items-center justify-end gap-3 p-6 border-t border-navy-medium',
  }
  const layout = props.stickyChrome ? 'flex-shrink-0' : ''
  return `${themes[props.theme]} ${layout}`
})

const handleClose = () => {
  if (props.closable) {
    emit('update:modelValue', false)
    emit('close')
  }
}

const handleBackdropClick = () => {
  if (!props.persistent) {
    handleClose()
  }
}

// Bloquear scroll del body cuando el modal está abierto
watch(
  () => props.modelValue,
  isOpen => {
    if (import.meta.client) {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
  }
)

// Cleanup cuando el componente se desmonta
onUnmounted(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
