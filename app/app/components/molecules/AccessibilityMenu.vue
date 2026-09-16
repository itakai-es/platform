<template>
  <div ref="container" class="relative">
    <button
      type="button"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-sm"
      :class="
        variant === 'light' ? 'text-white hover:bg-white/15' : 'text-navy-700 hover:bg-gray-100'
      "
      :aria-expanded="modal ? undefined : isOpen"
      :aria-haspopup="modal ? 'dialog' : undefined"
      :aria-label="t('common.accessibility.title')"
      @click="toggle"
    >
      <EyeIcon class="w-4 h-4" />
      <span :class="modal ? '' : 'hidden sm:inline'">{{ t('common.accessibility.title') }}</span>
      <ChevronDownIcon
        v-if="!modal"
        class="w-3 h-3 transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </button>

    <AccessibilityModal v-if="modal" v-model="isOpen" />
    <Transition v-else name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-1 w-[min(20rem,calc(100vw-2rem))] max-h-[80vh] overflow-y-auto scrollbar-subtle bg-white rounded-xl shadow-lg border border-gray-100 z-50 p-4"
      >
        <AccessibilityControls />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

/**
 * Accesibilidad en las pantallas públicas (Fase 3, punto 14).
 *
 * Quien no puede leer la pantalla de login tampoco puede iniciar sesión para
 * agrandar la letra, así que los ajustes tienen que estar antes de la sesión.
 * Se coloca junto al selector de idioma y comparte su forma: mismo botón, mismo
 * desplegable. Sin sesión el ajuste vive en el navegador; al iniciar sesión,
 * manda el perfil.
 */

/**
 * `modal`: en los menús móviles no cabe un desplegable (su scroll lo recorta y
 * el ancho no da para los controles), así que el botón abre los ajustes en una
 * ventana. Ahí la etiqueta se ve siempre.
 */
const props = withDefaults(defineProps<{ variant?: 'light' | 'dark'; modal?: boolean }>(), {
  variant: 'light',
  modal: false,
})

const { t } = useI18n()
const isOpen = ref(false)
const container = ref<HTMLElement | null>(null)

const toggle = () => {
  isOpen.value = !isOpen.value
}

const handleClickOutside = (event: MouseEvent) => {
  if (props.modal) return
  if (container.value && !container.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
