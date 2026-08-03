<template>
  <div ref="container" class="relative">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium text-sm"
      :class="
        variant === 'light' ? 'text-white hover:bg-white/15' : 'text-navy-700 hover:bg-gray-100'
      "
      @click="isOpen = !isOpen"
    >
      <!-- Globe icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="w-4 h-4"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
      <span class="uppercase">{{ locale }}</span>
      <!-- Chevron -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2.5"
        stroke="currentColor"
        class="w-3 h-3 transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-1 w-44 max-h-80 overflow-y-auto scrollbar-subtle bg-white rounded-xl shadow-lg border border-gray-100 z-50"
      >
        <button
          v-for="lang in APP_LANGUAGES"
          :key="lang.code"
          class="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-navy-700 hover:bg-gray-50 transition-colors"
          :class="locale === lang.code ? 'font-semibold bg-blue-50' : 'font-normal'"
          @click="select(lang.code)"
        >
          <span class="w-7 text-xs font-bold uppercase text-center text-blue-600">{{
            lang.code
          }}</span>
          <span class="truncate">{{ lang.endonym }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { APP_LANGUAGES } from '~/utils/app-languages'
import type { AppLanguage } from '~/utils/app-languages'

const props = withDefaults(
  defineProps<{
    variant?: 'light' | 'dark'
  }>(),
  {
    variant: 'light',
  }
)

// La lista y los nombres salen de APP_LANGUAGES: aquí se muestra el endónimo
// (cada idioma en sí mismo) porque quien busca su idioma no lee el activo.
const { locale, changeLanguage } = useLocale()
const isOpen = ref(false)
const container = ref<HTMLElement | null>(null)

const select = async (lang: AppLanguage) => {
  await changeLanguage(lang)
  isOpen.value = false
}

const handleClickOutside = (e: MouseEvent) => {
  if (container.value && !container.value.contains(e.target as Node)) {
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
