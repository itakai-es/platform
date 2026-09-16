<template>
  <div class="min-h-screen bg-bg-primary w-full overflow-x-hidden">
    <!-- Mobile Header (visible only on mobile/tablet) -->
    <MobileHeader
      title="ITAKAI"
      :unread-notifications="unreadNotifications"
      @toggle-menu="mobileMenuOpen = !mobileMenuOpen"
    />

    <!-- Sidebar (Desktop only - Fixed position) -->
    <Sidebar
      :nav-items="navItems"
      :user-id="user?.id || 'teacher'"
      :user-name="user?.name || t('common.roles.teacher')"
      :user-subtitle="t('common.roles.teacher')"
      :avatar="user?.avatar"
      :current-god="currentGod"
      user-role="teacher"
      show-account
      @help-center="openHelpCenter"
    />

    <!-- Mobile Sidebar -->
    <MobileSidebar
      :is-open="mobileMenuOpen"
      :nav-items="navItems"
      home-route="/profesor/inicio"
      role="teacher"
      :user-name="user?.name"
      :current-god="currentGod"
      show-account
      @close="mobileMenuOpen = false"
      @help-center="openHelpCenter"
    />

    <!-- Main Content with left margin for sidebar and top padding for mobile header -->
    <div class="flex-1 flex flex-col lg:ml-80 pt-14 lg:pt-0">
      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 max-w-full">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  HomeIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  UsersIcon,
  TrophyIcon,
  InformationCircleIcon,
  BookOpenIcon,
  BellIcon,
} from '@heroicons/vue/24/outline'
import { getHelpPortalByRole, getNotificationsByRole } from '~/utils/navigation'

const { t } = useI18n()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const aiAssistantStore = useAIAssistantStore()
const { initTheme } = useTheme()
const user = computed(() => authStore.user)

// Current god for sidebar (random, changes every 5 minutes)
const currentGod = computed(() => aiAssistantStore.currentGod)

// Avisos: carga, refresco periódico y contador de sin leer
const { enabled: notificationsEnabled, unreadCount: unreadNotifications } =
  useNotificationsPolling('teacher')

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

// Initialize random god rotation and theme on mount
onMounted(() => {
  initTheme()
  aiAssistantStore.initRandomGodRotation()

  // Fetch user profile (includes language preference for i18n sync)
  if (!profileStore.profile) {
    profileStore.fetchProfile()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  aiAssistantStore.stopRandomGodRotation()
})

// Chat with god handler - Navigate to AI assistant
const router = useRouter()
const openHelpCenter = () => {
  router.push('/profesor/asistente')
}

// Navigation items (MVP-only)
const navItems = computed(() => [
  {
    to: '/profesor/inicio',
    label: t('common.nav.dashboard'),
    icon: HomeIcon,
    exact: true,
  },
  // Solo con una sesión de profesor (lo decide el composable)
  ...(notificationsEnabled.value
    ? [
        {
          to: getNotificationsByRole('teacher') ?? '',
          label: t('common.notifications.title'),
          icon: BellIcon,
          badge: unreadNotifications.value,
          badgeLabel: t(
            'common.notifications.unread_count',
            { count: unreadNotifications.value },
            unreadNotifications.value
          ),
        },
      ]
    : []),
  {
    to: '/profesor/clases',
    label: t('common.nav.my_classes'),
    icon: AcademicCapIcon,
  },
  {
    to: '/profesor/misiones',
    label: t('common.nav.missions'),
    icon: RocketLaunchIcon,
  },
  {
    to: '/profesor/insignias',
    label: t('common.nav.badges'),
    icon: TrophyIcon,
  },
  {
    to: '/profesor/alumnos',
    label: t('common.nav.students'),
    icon: UsersIcon,
  },
  { type: 'divider' as const },
  {
    to: getHelpPortalByRole('teacher'),
    label: t('common.help.title'),
    icon: BookOpenIcon,
  },
  {
    to: '/profesor/acerca-de',
    label: t('common.nav.about'),
    icon: InformationCircleIcon,
  },
])
</script>
