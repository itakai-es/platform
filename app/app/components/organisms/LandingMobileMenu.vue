<template>
  <!-- Overlay -->
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-50"
      aria-hidden="true"
      @click="emit('close')"
    />
  </Transition>

  <!-- Sidebar -->
  <Transition name="slide">
    <aside
      v-if="isOpen"
      class="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation menu"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <NuxtLink to="/" class="flex items-center gap-2" @click="emit('close')">
          <img src="/logo/itakai_color.svg" alt="ITAKAI" class="h-10" />
        </NuxtLink>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          :aria-label="t('common.actions.close_menu')"
          @click="emit('close')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-6 h-6 text-navy-700"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto py-6 px-6">
        <ul class="space-y-2">
          <li>
            <NuxtLink
              to="/#features"
              class="block px-4 py-3 rounded-lg text-navy-700 font-medium hover:bg-gray-100 transition-colors"
              @click="emit('close')"
            >
              {{ t('common.nav.features') }}
            </NuxtLink>
          </li>
          <li>
            <a
              href="https://gamifp.es/blog/"
              target="_blank"
              rel="noopener noreferrer"
              class="block px-4 py-3 rounded-lg text-navy-700 font-medium hover:bg-gray-100 transition-colors"
              @click="emit('close')"
            >
              {{ t('common.nav.blog') }}
            </a>
          </li>
          <li>
            <NuxtLink
              to="/ayuda"
              class="block px-4 py-3 rounded-lg text-navy-700 font-medium hover:bg-gray-100 transition-colors"
              @click="emit('close')"
            >
              {{ t('common.nav.help') }}
            </NuxtLink>
          </li>
        </ul>

        <!-- Divider -->
        <div class="my-6 border-t border-gray-200" />

        <!-- Idioma y accesibilidad: los dos ajustes que hacen falta antes de entrar -->
        <div class="mb-4 flex flex-wrap items-center justify-center gap-2">
          <LanguageSwitcher variant="dark" />
          <AccessibilityMenu variant="dark" modal />
        </div>

        <!-- CTA Buttons -->
        <div class="space-y-3">
          <Button
            variant="outline"
            size="md"
            class="w-full !border-navy-700 !text-navy-700 hover:!bg-navy-700 hover:!text-white"
            @click="handleSignup"
          >
            {{ t('common.actions.create_new_account') }}
          </Button>
          <Button variant="primary" size="md" class="w-full" @click="handleLogin">
            {{ t('common.actions.enter') }}
          </Button>
        </div>
      </nav>

      <!-- Footer -->
      <div class="p-6 border-t border-gray-200">
        <p class="text-xs text-gray-500 text-center">
          {{ t('common.landing.footer_copyright_alt', { year: new Date().getFullYear() }) }}
        </p>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { watch, onUnmounted } from 'vue'

const { t } = useI18n()

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

// Handle navigation
const handleSignup = () => {
  emit('close')
  router.push('/auth/registro')
}

const handleLogin = () => {
  emit('close')
  router.push('/auth/login')
}

// Bloquea el scroll de la página mientras el menú está abierto. Es el mismo
// bloqueo compartido que usa Modal: cerrar la ventana de Accesibilidad no lo
// libera mientras el menú siga abierto.
const { lock, unlock } = useBodyScrollLock()
watch(
  () => props.isOpen,
  isOpen => (isOpen ? lock() : unlock())
)

// Close on escape key
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

// Add/remove event listener
watch(
  () => props.isOpen,
  isOpen => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    } else {
      document.removeEventListener('keydown', handleEscape)
    }
  }
)

onUnmounted(() => {
  unlock()
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 300ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition for sidebar */
.slide-enter-active,
.slide-leave-active {
  transition: transform 300ms ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
