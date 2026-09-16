<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" :class="viewportClasses">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="handleBackdropClick" />

        <!-- Modal Container. Es un diálogo: recibe el foco al abrirse, Escape
             lo cierra como la X (si es `closable` y `closeOnEsc`, que por
             defecto es lo contrario de `persistent`, para no descartar un
             formulario a medias) y al cerrarse devuelve el foco. -->
        <div :class="containerClasses">
          <div
            ref="modalRef"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title || $slots.header ? titleId : undefined"
            :aria-label="$slots.header ? title : undefined"
            tabindex="-1"
            :class="modalClasses"
            @click.stop
            @keydown.esc="handleEsc"
            @keydown.tab="trapTab"
          >
            <!-- Centinela: el foco que sale hacia atrás de un reproductor
                 incrustado (su teclado no llega aquí) vuelve al final. -->
            <span tabindex="0" data-focus-guard class="sr-only" @focus="focusLast" />

            <!-- Header. Una cabecera propia recibe `titleId` para su título;
                 si no lo usa, `title` queda como nombre de respaldo. -->
            <div v-if="title || $slots.header" :class="headerClasses">
              <slot name="header" :title-id="titleId">
                <h3 :id="titleId" :class="titleClasses">{{ title }}</h3>
              </slot>
              <button
                v-if="closable"
                type="button"
                :class="closeButtonClasses"
                :aria-label="t('common.actions.close')"
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

            <!-- Capa de menús y tooltips: dentro del diálogo para que
                 `aria-modal` no los deje inertes. `position: fixed` los saca
                 del recorte de `overflow-hidden`. -->
            <div :id="layerId" />

            <!-- Centinela: el foco que sale hacia delante de un reproductor
                 incrustado vuelve al principio en vez de salir del diálogo. -->
            <span tabindex="0" data-focus-guard class="sr-only" @focus="focusFirst" />
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
   * Escape cierra el diálogo. Sin indicar (`null`), solo si no es
   * `persistent`. El `null` evita que Vue lo convierta en `false`.
   */
  closeOnEsc?: boolean | null
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
  closeOnEsc: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const { t } = useI18n()

const titleId = useId()
const modalRef = ref<HTMLElement | null>(null)

// Un id válido como selector CSS, sea cual sea el formato de `useId`.
const layerId = `modal-layer-${useId()}`.replace(/[^\w-]/g, '-')
provide(OVERLAY_LAYER_KEY, `#${layerId}`)

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'video[controls]',
  'audio[controls]',
  '[tabindex]:not([tabindex="-1"])',
]
  .map(selector => `${selector}:not([data-focus-guard])`)
  .join(', ')

/** Los elementos del diálogo que reciben el foco con Tab, en orden. */
function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    el => el.getClientRects().length > 0
  )
}

function focusFirst() {
  const root = modalRef.value
  if (root) (focusables(root)[0] ?? root).focus()
}

function focusLast() {
  const root = modalRef.value
  if (root) (focusables(root).at(-1) ?? root).focus()
}

/**
 * Retiene el foco dentro del diálogo: con `aria-modal` lo de detrás no existe
 * para el lector, así que el teclado tampoco debe llegar ahí. La lista se
 * calcula en cada pulsación porque el contenido del slot cambia.
 */
function trapTab(event: KeyboardEvent) {
  const root = modalRef.value
  if (!root) return
  const list = focusables(root)
  const first = list[0]
  const last = list[list.length - 1]
  if (!first || !last) {
    event.preventDefault()
    root.focus()
    return
  }
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === root)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || active === root)) {
    event.preventDefault()
    first.focus()
  }
}

/** Quien tenía el foco antes de abrir, para devolvérselo al cerrar. */
let opener: HTMLElement | null = null

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

  return `relative w-full ${sizes[props.size]} ${themes[props.theme]} rounded-2xl shadow-xl transition-all overflow-hidden focus:outline-none ${layout}`
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

const handleEsc = (event: KeyboardEvent) => {
  if (!(props.closeOnEsc ?? !props.persistent)) return
  // Un diálogo anidado no debe cerrar también el que lo contiene.
  event.stopPropagation()
  handleClose()
}

const handleBackdropClick = () => {
  if (!props.persistent) {
    handleClose()
  }
}

// Bloqueo compartido: un diálogo abierto desde otro (o desde un menú que ya
// bloquea el scroll) no libera la página al cerrarse si queda algo abierto.
const { lock: lockScroll, unlock: unlockScroll } = useBodyScrollLock()

// Bloquear scroll del body cuando el modal está abierto, y mover el foco:
// dentro al abrir (el nodo aparece tras el `v-if`, de ahí el `nextTick`) y
// de vuelta a quien lo tenía al cerrar.
watch(
  () => props.modelValue,
  async isOpen => {
    if (!import.meta.client) return
    if (isOpen) {
      lockScroll()
      opener = document.activeElement as HTMLElement | null
      await nextTick()
      modalRef.value?.focus()
    } else {
      unlockScroll()
      opener?.focus()
      opener = null
    }
  }
)

// Cleanup cuando el componente se desmonta
onUnmounted(unlockScroll)
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
