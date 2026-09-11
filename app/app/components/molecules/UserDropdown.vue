<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger Button (Simple Icon) -->
    <button
      type="button"
      data-testid="user-dropdown-trigger"
      class="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
      :aria-label="t('common.user_dropdown.user_menu_label')"
      @click="toggleDropdown"
    >
      <svg
        class="w-4 h-4 text-text-secondary transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
      >
        <!-- Mi Perfil -->
        <NuxtLink
          v-if="authStore.user?.role !== 'admin'"
          :to="profileRoute"
          class="flex items-center gap-3 w-full px-4 py-3 text-sm text-navy-700 hover:bg-gray-50 transition-colors"
          @click="closeDropdown"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          {{ t('common.user_dropdown.my_profile') }}
        </NuxtLink>

        <!-- Centro de ayuda -->
        <NuxtLink
          to="/ayuda"
          class="flex items-center gap-3 w-full px-4 py-3 text-sm text-navy-700 hover:bg-gray-50 transition-colors"
          @click="closeDropdown"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          {{ t('common.help.title') }}
        </NuxtLink>

        <!-- Cerrar Sesión -->
        <button
          type="button"
          class="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
          @click="handleLogout"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {{ t('common.user_dropdown.logout') }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// Ruta de perfil según el rol del usuario
// Nota: admin no tiene página de perfil; el enlace está oculto con v-if en el template.
const profileRoute = computed(() => {
  const role = authStore.user?.role
  if (role === 'teacher') return '/profesor/perfil'
  return '/alumno/perfil'
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const handleLogout = async () => {
  closeDropdown()
  await authStore.logout()
  router.push('/auth/login')
}

// Cerrar dropdown al hacer click fuera
onClickOutside(dropdownRef, closeDropdown)
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.2s ease,
    0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
