<template>
  <div ref="container" class="relative">
    <button
      type="button"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-sm"
      :class="variant === 'light' ? 'text-white hover:bg-white/15' : 'text-navy-700 hover:bg-gray-100'"
      :aria-expanded="isOpen"
      :aria-label="t('common.accessibility.title')"
      @click="isOpen = !isOpen"
    >
      <EyeIcon class="w-4 h-4" />
      <span class="hidden sm:inline">{{ t('common.accessibility.title') }}</span>
      <ChevronDownIcon class="w-3 h-3 transition-transform" :class="isOpen ? 'rotate-180' : ''" />
    </button>

    <Transition name="dropdown">
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

withDefaults(defineProps<{ variant?: 'light' | 'dark' }>(), { variant: 'light' })

const { t } = useI18n()
const isOpen = ref(false)
const container = ref<HTMLElement | null>(null)

const handleClickOutside = (event: MouseEvent) => {
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
