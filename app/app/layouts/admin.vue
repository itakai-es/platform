<template>
  <div class="min-h-screen bg-bg-primary w-full overflow-x-hidden">
    <!-- Mobile Header (visible only on mobile/tablet) -->
    <MobileHeader
      title="ITAKAI"
      badge="ADMIN"
      badge-class="bg-red-500/20 text-red-400 border-red-500/50"
      @toggle-menu="mobileMenuOpen = !mobileMenuOpen"
    />

    <!-- Sidebar (Desktop only - Fixed position) -->
    <Sidebar
      :nav-items="navItems"
      :user-id="user?.id || 'admin'"
      :user-name="user?.name || t('common.roles.admin')"
      :user-subtitle="t('common.roles.admin_system')"
      user-role="admin"
      :hide-god-button="true"
    />

    <!-- Mobile Sidebar -->
    <MobileSidebar
      :is-open="mobileMenuOpen"
      :nav-items="navItems"
      home-route="/admin/inicio"
      badge="ADMIN"
      badge-class="bg-red-500/20 text-red-400"
      role="admin"
      :user-name="user?.name"
      @close="mobileMenuOpen = false"
    />

    <!-- Main Content with left margin for sidebar and top padding for mobile header -->
    <div class="flex-1 flex flex-col lg:ml-80 pt-14 lg:pt-0">
      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  HomeIcon,
  UsersIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  ServerIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()
const authStore = useAuthStore()
const { initTheme } = useTheme()
const user = computed(() => authStore.user)

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

onMounted(() => {
  initTheme()
})

type AdminNavItem = {
  type?: 'header' | 'link'
  label: string
  to?: string
  icon?: unknown
  exact?: boolean
}

// Navigation items with section headers
const navItems = computed<AdminNavItem[]>(() => [
  {
    to: '/admin/inicio',
    label: t('common.nav.dashboard'),
    icon: HomeIcon,
    exact: true,
  },
  {
    type: 'header',
    label: t('common.nav.section_management'),
  },
  {
    to: '/admin/usuarios',
    label: t('common.nav.users'),
    icon: UsersIcon,
  },
  {
    to: '/admin/clases',
    label: t('common.nav.classes'),
    icon: AcademicCapIcon,
  },
  {
    to: '/admin/misiones',
    label: t('common.nav.missions'),
    icon: RocketLaunchIcon,
  },
  {
    type: 'header',
    label: t('common.nav.section_system'),
  },
  {
    to: '/admin/estadisticas',
    label: t('common.nav.analytics'),
    icon: ChartBarIcon,
  },
  {
    to: '/admin/registros',
    label: t('common.nav.logs'),
    icon: ServerIcon,
  },
  {
    to: '/admin/configuracion',
    label: t('admin.settings.title'),
    icon: Cog6ToothIcon,
  },
])
</script>
