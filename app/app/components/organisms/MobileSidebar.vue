<template>
  <!-- Overlay -->
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="mobile-sidebar-overlay"
      data-testid="mobile-sidebar-overlay"
      @click="emit('close')"
    />
  </Transition>

  <!-- Drawer -->
  <Transition name="slide">
    <aside v-if="isOpen" class="mobile-sidebar" data-testid="mobile-sidebar">
      <!-- Header with close button -->
      <div class="mobile-sidebar-header-wrapper">
        <div class="mobile-sidebar-header">
          <NuxtLink :to="homeRoute" class="flex items-center gap-2" @click="emit('close')">
            <img
              :src="theme === 'college' ? '/logo/itakai_color.svg' : '/logo/itakai_1tinta.svg'"
              alt="ITAKAI"
              class="h-8 w-auto"
            />
            <span v-if="badge" :class="badgeClass" class="px-2 py-0.5 text-xs font-bold rounded">
              {{ badge }}
            </span>
          </NuxtLink>

          <div class="flex items-center gap-2">
            <!-- User Dropdown for logout -->
            <UserDropdown />

            <button
              class="close-btn"
              :aria-label="t('common.actions.close_menu')"
              data-testid="mobile-sidebar-close-btn"
              @click="emit('close')"
            >
              <XMarkIcon class="w-6 h-6 text-text-primary" />
            </button>
          </div>
        </div>

        <!-- Action Button (e.g., Join Class for students) -->
        <div v-if="actionButton" class="px-4 pb-3">
          <NuxtLink :to="actionButton.to" @click="emit('close')">
            <button
              class="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white rounded-full text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <PlusIcon class="w-4 h-4" />
              {{ actionButton.label }}
            </button>
          </NuxtLink>
        </div>
      </div>

      <!-- Navigation Items -->
      <nav class="mobile-sidebar-nav">
        <template v-for="(item, index) in navItems" :key="index">
          <!-- Section Header -->
          <div v-if="item.type === 'header'" class="px-4 py-2 mt-2">
            <p class="text-xs font-semibold text-text-muted uppercase">
              {{ item.label }}
            </p>
          </div>

          <!-- Nav Link -->
          <NavItem
            v-else-if="item.to"
            :to="item.to"
            :label="item.label"
            :icon="item.icon"
            :exact="item.exact"
            @click="emit('close')"
          />
        </template>
      </nav>

      <!-- AI Chat Section (Always at bottom) -->
      <div v-if="currentGod" class="mobile-sidebar-footer-ai">
        <div class="ai-chat-card" :style="aiChatCardStyle">
          <div class="flex items-center gap-3 mb-3">
            <img :src="currentGod.avatar" :alt="currentGod.name" class="w-12 h-12 rounded-full" />
            <div>
              <p class="text-xs text-white/70">{{ t('common.sidebar.chat_with_label') }}</p>
              <p class="text-sm font-bold text-white">{{ currentGod.name }}</p>
            </div>
          </div>
          <button
            class="w-full py-2 px-4 rounded-full font-semibold transition-all duration-200 hover:opacity-90"
            :style="aiChatButtonStyle"
            @click="handleChatClick"
          >
            {{ t('common.sidebar.chat_with', { name: currentGod.name }) }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="$slots.footer" class="mobile-sidebar-footer">
        <slot name="footer" />
      </div>

      <!-- Default Footer for Other Roles (Badge Card) -->
      <div v-else-if="roleInfo" class="mobile-sidebar-footer">
        <div class="role-badge-card" :class="roleInfo.cardClass">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="roleInfo.iconBgClass"
            >
              <component :is="roleInfo.icon" class="w-6 h-6" :class="roleInfo.iconClass" />
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-text-primary">{{ roleInfo.title }}</p>
              <p class="text-xs text-text-muted">{{ userName }}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  XMarkIcon,
  PlusIcon,
  AcademicCapIcon,
  UsersIcon,
  ShieldCheckIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()
const { theme } = useTheme()

interface NavItem {
  type?: 'header' | 'link'
  label: string
  to?: string
  icon?: any
  exact?: boolean
}

interface God {
  id: string
  name: string
  avatar: string
  color: string
}

interface ActionButton {
  label: string
  to: string
}

interface Props {
  isOpen: boolean
  navItems: NavItem[]
  homeRoute: string
  badge?: string
  badgeClass?: string

  // Legacy props (kept for backwards compatibility, but no longer used)
  showLevelProgress?: boolean
  level?: number
  xp?: number
  xpForNextLevel?: number
  title?: string

  // For role badge
  role?: 'student' | 'teacher' | 'admin'
  userName?: string

  // For AI chat
  currentGod?: God | null

  // For action button (e.g., Join Class)
  actionButton?: ActionButton | null
}

const props = withDefaults(defineProps<Props>(), {
  badgeClass: 'bg-red-500/20 text-red-400',
  showLevelProgress: false,
  level: 1,
  xp: 0,
  xpForNextLevel: 100,
  title: 'Mortal',
  currentGod: null,
  actionButton: null,
})

const emit = defineEmits(['close', 'help-center'])

// XP Progress calculations for student (using xp-calculator values)
const xpProgress = computed(() => {
  if (props.xpForNextLevel <= 0) return 0
  return Math.min((props.xp / props.xpForNextLevel) * 100, 100)
})
const xpToNextLevel = computed(() => Math.max(0, props.xpForNextLevel - props.xp))

// Role badge info
const roleInfo = computed(() => {
  if (props.showLevelProgress) return null

  const roleMap: Record<
    'teacher' | 'admin',
    {
      title: string
      icon: any
      iconBgClass: string
      iconClass: string
      cardClass: string
    }
  > = {
    teacher: {
      title: t('common.roles.teacher'),
      icon: AcademicCapIcon,
      iconBgClass: 'bg-accent/20',
      iconClass: 'text-accent',
      cardClass: 'bg-accent/10 border border-accent/30',
    },
    admin: {
      title: t('common.roles.admin'),
      icon: ShieldCheckIcon,
      iconBgClass: 'bg-error/20',
      iconClass: 'text-error',
      cardClass: 'bg-error/10 border border-error/30',
    },
  }

  return props.role && (props.role === 'teacher' || props.role === 'admin')
    ? roleMap[props.role]
    : null
})

// AI Chat styling
const aiChatCardStyle = computed(() => {
  if (!props.currentGod) return {}
  return {
    backgroundColor: props.currentGod.color,
    borderRadius: '12px',
    padding: '12px',
  }
})

// Calculate luminance for text color (WCAG formula)
function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff

  const [rs, gs, bs] = [r, g, b].map(c => {
    const srgb = c / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

const aiChatButtonStyle = computed(() => {
  if (!props.currentGod) return {}
  const luminance = getLuminance(props.currentGod.color)
  const textColor = luminance > 0.5 ? '#000000' : '#FFFFFF'

  return {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: textColor,
  }
})

// Handle chat click
const handleChatClick = () => {
  emit('help-center')
  emit('close')
}
</script>

<style scoped>
/* Overlay */
.mobile-sidebar-overlay {
  @apply fixed inset-0 bg-black/60 backdrop-blur-sm z-40;
}

/* Drawer */
.mobile-sidebar {
  @apply fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-surface border-r border-border-primary z-50;
  @apply flex flex-col overflow-hidden;
}

.mobile-sidebar-header-wrapper {
  @apply border-b border-border-primary;
}

.mobile-sidebar-header {
  @apply px-4 py-4 flex items-center justify-between;
}

.close-btn {
  @apply p-2 rounded-lg hover:bg-surface-hover transition-colors;
}

.mobile-sidebar-nav {
  @apply flex-1 px-3 py-4 space-y-1 overflow-y-auto;
}

.mobile-sidebar-footer-ai {
  @apply px-3 pb-3 border-t border-border-primary pt-3;
}

.mobile-sidebar-footer {
  @apply px-3 pb-4 border-t border-border-primary;
}

.level-card {
  @apply mt-4 p-3 bg-bg-tertiary rounded-lg;
}

.progress-bar {
  @apply w-full h-2 bg-bg-secondary rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full transition-all duration-500 ease-out rounded-full;
  background: linear-gradient(90deg, var(--color-red) 0%, var(--color-red-light) 100%);
}

.role-badge-card {
  @apply mt-4 p-3 rounded-lg;
}

.ai-chat-card {
  @apply transition-all duration-200;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  @apply transition-opacity duration-300;
}

.fade-enter-from,
.fade-leave-to {
  @apply opacity-0;
}

.slide-enter-active,
.slide-leave-active {
  @apply duration-300 ease-out;
}

.slide-enter-from,
.slide-leave-to {
  @apply -translate-x-full;
}
</style>
