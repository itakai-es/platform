<template>
  <div class="min-h-screen bg-bg-primary w-full overflow-x-hidden">
    <!-- Mobile Header (visible only on mobile/tablet) -->
    <MobileHeader title="ITAKAI" @toggle-menu="mobileMenuOpen = !mobileMenuOpen" />

    <!-- Sidebar (Desktop only - Fixed position) -->
    <Sidebar
      :nav-items="navItems"
      :user-id="user?.id || 'student'"
      :user-name="user?.name || t('common.roles.student')"
      :user-subtitle="t('common.roles.student')"
      :avatar="user?.avatar"
      :current-god="currentGod"
      user-role="student"
      @help-center="openHelpCenter"
    />

    <!-- Mobile Sidebar -->
    <MobileSidebar
      :is-open="mobileMenuOpen"
      :nav-items="navItems"
      home-route="/alumno/inicio"
      :current-god="currentGod"
      :action-button="{
        label: t('common.mobile_sidebar.join_class'),
        to: '/alumno/clases?join=true',
      }"
      @close="mobileMenuOpen = false"
      @help-center="openHelpCenter"
    />

    <!-- Main Content with left margin for sidebar and top padding for mobile header -->
    <div class="flex-1 flex flex-col lg:ml-80 pt-14 lg:pt-0">
      <!-- Aviso "Ver como alumno" (solo en preview del profesor) -->
      <StudentPreviewBanner />
      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  HomeIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  UserIcon,
  TrophyIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const gamificationStore = useGamificationStore()
const aiAssistantStore = useAIAssistantStore()
const { initTheme } = useTheme()
const user = computed(() => authStore.user)

// Current god for sidebar (random, changes every 5 minutes)
const currentGod = computed(() => aiAssistantStore.currentGod)

// Mobile menu state
const mobileMenuOpen = ref(false)

// Body scroll lock for mobile menu
const { lock, unlock } = useBodyScrollLock()

// Watch mobile menu state to lock/unlock body scroll
watch(mobileMenuOpen, isOpen => {
  if (isOpen) {
    lock()
  } else {
    unlock()
  }
})

// Initialize random god rotation and fetch profile on mount
onMounted(() => {
  initTheme()
  aiAssistantStore.initRandomGodRotation()

  // Fetch user profile (includes language preference for i18n sync)
  if (!profileStore.profile) {
    profileStore.fetchProfile()
  }

  // Fetch gamification profile if not already loaded
  if (!gamificationStore.profile) {
    gamificationStore.fetchProfile()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  aiAssistantStore.stopRandomGodRotation()
})

// Chat with god handler - Navigate to AI assistant
const router = useRouter()
const openHelpCenter = () => {
  router.push('/alumno/asistente')
}

// Navigation items (MVP)
const navItems = computed(() => [
  {
    to: '/alumno/inicio',
    label: t('common.nav.dashboard'),
    icon: HomeIcon,
    exact: true,
  },
  {
    to: '/alumno/clases',
    label: t('common.nav.my_classes'),
    icon: AcademicCapIcon,
  },
  {
    to: '/alumno/misiones',
    label: t('common.nav.missions'),
    icon: RocketLaunchIcon,
  },
  {
    to: '/alumno/insignias',
    label: t('common.nav.badges'),
    icon: TrophyIcon,
  },
])
</script>
