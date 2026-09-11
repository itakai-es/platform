<template>
  <aside class="sidebar">
    <!-- User Profile Card (non-chat mode) -->
    <div v-if="!hideUserProfile" class="user-profile-card">
      <div class="user-dropdown-wrapper">
        <UserDropdown />
      </div>
      <div class="logo-wrapper">
        <img
          :src="theme === 'college' ? '/logo/itakai_color.svg' : '/logo/itakai_1tinta.svg'"
          alt="ITAKAI"
          class="sidebar-logo"
        />
      </div>
      <h3 class="user-name">{{ userName }}</h3>
      <p class="user-subtitle">{{ userSubtitle }}</p>
      <!-- Ver como alumno (modo demo): solo para profesores -->
      <button
        v-if="userRole === 'teacher'"
        type="button"
        class="mt-2 inline-flex items-center gap-1.5 rounded-full border border-navy-700/20 px-3 py-1 text-xs font-medium text-navy-700 transition-colors hover:bg-navy-700/5"
        @click="auth.enterStudentPreview()"
      >
        <EyeIcon class="h-3.5 w-3.5" />
        Ver como alumno
      </button>
      <div v-if="showProgress && progressPercentage !== undefined" class="progress-wrapper">
        <div class="progress-bar-new">
          <div class="progress-fill-new" :style="{ width: `${progressPercentage}%` }" />
        </div>
        <p v-if="userXp" class="xp-display">{{ userXp }}</p>
      </div>
    </div>

    <!-- Navigation Items OR Chat Conversations -->
    <nav
      :class="chatConversations !== undefined ? 'flex-1 flex flex-col px-2 min-h-0' : 'sidebar-nav'"
    >
      <!-- Chat Conversations Mode — buttons + list inside white container -->
      <template v-if="chatConversations !== undefined">
        <div
          class="bg-white rounded-2xl px-3 py-3 flex-1 flex flex-col overflow-hidden chat-conversations-container"
        >
          <!-- Fixed: Back + New buttons -->
          <div v-if="showBackButton && backRoute" class="mb-2 flex-shrink-0">
            <NuxtLink :to="backRoute" class="back-button">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>{{ $t('common.actions.back_to_dashboard') }}</span>
            </NuxtLink>
          </div>
          <div class="mb-3 flex-shrink-0">
            <button
              type="button"
              class="new-conversation-button"
              @click="$emit('new-conversation')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>{{ $t('common.sidebar.new_conversation') }}</span>
            </button>
          </div>

          <!-- Fixed: Separator -->
          <hr class="border-gray-100 my-2 flex-shrink-0" />

          <!-- Scrollable: Conversation list -->
          <div class="space-y-0.5 flex-1 overflow-y-auto min-h-0">
            <!-- Loading skeletons -->
            <template
              v-if="loadingConversations && (!chatConversations || chatConversations.length === 0)"
            >
              <div
                v-for="i in 6"
                :key="`skeleton-${i}`"
                class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl animate-pulse"
              >
                <div class="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                <div class="flex-1">
                  <div
                    class="h-4 bg-gray-200 rounded-lg"
                    :style="{ width: `${60 + ((i * 7) % 30)}%` }"
                  />
                </div>
              </div>
            </template>

            <!-- Conversations -->
            <template v-else>
              <ChatConversationItem
                v-for="conversation in chatConversations"
                :key="conversation.id"
                :conversation="conversation"
                :is-active="conversation.id === activeConversationId"
                @click="$emit('conversation-click', conversation)"
              />

              <!-- Load more trigger -->
              <div v-if="hasMoreConversations" class="py-2 flex justify-center">
                <button
                  class="text-xs text-text-muted hover:text-navy-700 transition-colors"
                  @click="$emit('load-more-conversations')"
                >
                  Cargar más...
                </button>
              </div>

              <!-- Empty state -->
              <div v-if="!chatConversations || chatConversations.length === 0" class="py-6 px-4">
                <p class="text-sm text-text-muted text-center">
                  {{ $t('common.sidebar.no_conversations') }}
                  <br />
                  {{ $t('common.sidebar.start_new') }}
                </p>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Regular Navigation Mode -->
      <template v-else>
        <template v-for="(item, index) in navItems" :key="index">
          <!-- Section Header -->
          <div v-if="item.type === 'header'" class="nav-section-header">
            <component :is="item.icon" v-if="item.icon" class="nav-section-icon" />
            <span class="nav-section-label">{{ item.label }}</span>
          </div>

          <!-- Nav Link -->
          <NavItem
            v-else-if="item.to"
            :to="item.to"
            :label="item.label"
            :icon="item.icon"
            :exact="item.exact"
            :indent="item.indent"
          />
        </template>
      </template>
    </nav>

    <!-- Chat with God Button -->
    <div v-if="!hideGodButton" class="sidebar-footer">
      <div class="god-button-container">
        <!-- God Avatar (Position Absolute) -->
        <div v-if="currentGod" class="god-avatar-wrapper">
          <img :src="currentGod.avatar" :alt="currentGod.name" class="god-avatar" />
          <!-- Speech Bubble (from avatar) -->
          <div class="speech-bubble">
            {{ currentGodMessage }}
          </div>
        </div>

        <!-- Button -->
        <button
          type="button"
          class="help-button"
          :style="buttonStyle"
          @click="$emit('help-center')"
        >
          <!-- Default Icon (when no god) -->
          <svg
            v-if="!currentGod"
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>

          <!-- Dynamic Text -->
          <span v-if="currentGod">{{
            $t('common.sidebar.chat_with', { name: currentGod.name })
          }}</span>
          <span v-else>{{ $t('common.sidebar.chat_with_god') }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EyeIcon } from '@heroicons/vue/24/outline'
import { getAvatarUrl } from '~/utils/avatar'
import type { ChatConversation } from '~/stores/aiAssistant'

const { t, tm, rt } = useI18n()
const { theme } = useTheme()
const auth = useAuthStore()

interface NavItem {
  type?: 'header' | 'link'
  label: string
  to?: string
  icon?: any
  exact?: boolean
  indent?: boolean
}

interface CurrentGod {
  id: string
  name: string
  avatar: string
  color: string
}

interface Props {
  navItems?: NavItem[]
  userName: string
  userSubtitle: string
  userXp?: string // XP display (e.g., "850 / 2500 XP")
  userId: string
  avatar?: string
  showProgress?: boolean
  progressPercentage?: number
  currentGod?: CurrentGod | null
  userRole?: 'student' | 'teacher' | 'admin'
  // Chat mode props
  chatConversations?: ChatConversation[]
  activeConversationId?: string | null
  loadingConversations?: boolean
  hasMoreConversations?: boolean
  showBackButton?: boolean
  backRoute?: string
  hideGodButton?: boolean
  hideUserProfile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  navItems: () => [],
  showBackButton: false,
  hideGodButton: false,
  hideUserProfile: false,
})

defineEmits(['help-center', 'new-conversation', 'conversation-click', 'load-more-conversations'])

// Get avatar URL (with default if not provided)
const avatarUrl = computed(() => {
  return getAvatarUrl({
    id: props.userId,
    avatar: props.avatar,
  })
})

// Get user initials (for admin without avatar)
const userInitials = computed(() => {
  if (!props.userName) return 'AD'

  const nameParts = props.userName.trim().split(' ')
  if (nameParts.length >= 2) {
    // First letter of first name + first letter of last name
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
  }
  // If only one name, take first two letters
  return props.userName.substring(0, 2).toUpperCase()
})

// Calculate luminance of a color to determine if text should be black or white
function getTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

// Computed style for button
const buttonStyle = computed(() => {
  if (!props.currentGod) {
    return {}
  }

  return {
    backgroundColor: props.currentGod.color,
    color: getTextColor(props.currentGod.color),
  }
})

// God messages by role (from i18n translation arrays)
const godMessagesByRole = computed(() => ({
  student: (tm('chat.god_messages.student') as any[]).map(msg => rt(msg)),
  teacher: (tm('chat.god_messages.teacher') as any[]).map(msg => rt(msg)),
  admin: (tm('chat.god_messages.admin') as any[]).map(msg => rt(msg)),
}))

// Random message for current god based on user role
const currentGodMessage = computed(() => {
  if (!props.currentGod) return ''

  const role = props.userRole || 'student'
  const messages = godMessagesByRole.value[role] || godMessagesByRole.value.student
  const randomIndex = Math.floor(Math.random() * messages.length)

  return messages[randomIndex]
})
</script>

<style scoped>
.sidebar {
  @apply w-72 bg-white flex flex-col;
  @apply hidden lg:flex;
  @apply fixed;
  top: 1rem;
  left: 1rem;
  height: calc(100vh - 2rem); /* 100vh - py-4 (1rem top + 1rem bottom) */
  border-radius: 40px;
  padding: 24px 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  z-index: 40;
}

/* Back Button */
.back-button-wrapper {
  @apply mb-2;
}

.back-button {
  @apply w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl;
  @apply text-sm font-medium text-navy-700 border border-gray-200;
  @apply hover:bg-gray-50 transition-all;
}

/* New Conversation Button */
.new-conversation-wrapper {
  @apply mb-3;
}

.new-conversation-button {
  @apply w-full flex items-center justify-center gap-2;
  @apply px-4 py-2.5 rounded-xl;
  @apply text-sm font-semibold;
  @apply bg-navy-700 text-white;
  @apply hover:opacity-90 transition-all;
}

/* Empty Conversations State */
.empty-conversations {
  @apply py-8 px-4;
}

/* User Profile Card */
.user-profile-card {
  @apply flex flex-col items-center relative;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border-primary);
  margin-bottom: 16px;
}

.user-dropdown-wrapper {
  @apply absolute;
  top: 0;
  right: 0;
  z-index: 50;
}

.logo-wrapper {
  @apply mb-4;
}

.sidebar-logo {
  @apply h-24 w-auto;
}

.user-name {
  @apply text-lg font-bold text-center mb-1;
  color: var(--color-navy-700);
}

.user-subtitle {
  @apply text-sm text-center;
  color: var(--color-text-muted);
}

.progress-wrapper {
  @apply w-full mt-4;
}

.progress-bar-new {
  @apply w-full h-2 rounded-full overflow-hidden;
  background-color: var(--color-border-primary);
}

.progress-fill-new {
  @apply h-full transition-all duration-500 ease-out rounded-full;
  background: linear-gradient(90deg, var(--color-red) 0%, var(--color-red-light) 100%);
}

.xp-display {
  @apply text-xs text-center mt-1;
  color: var(--color-text-muted);
}

/* Navigation */
.sidebar-nav {
  @apply flex-1 overflow-y-auto space-y-1 px-2;
  scrollbar-width: none; /* Firefox */
}
.sidebar-nav::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}
.chat-conversations-container {
  scrollbar-width: none;
}
.chat-conversations-container::-webkit-scrollbar {
  display: none;
}

.nav-section-header {
  @apply flex items-center gap-2 px-3 py-2 mt-3 mb-1;
}

.nav-section-icon {
  @apply w-5 h-5;
  color: #5b5675;
}

.nav-section-label {
  @apply text-sm font-semibold;
  color: #5b5675;
}

/* Footer */
.sidebar-footer {
  @apply pt-4;
  border-top: 1px solid var(--color-border-primary);
  margin-top: 16px;
}

/* God Button Container */
.god-button-container {
  @apply relative;
}

/* God Avatar Wrapper (Absolute Position) */
.god-avatar-wrapper {
  @apply absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
}

/* God Avatar (Large) */
.god-avatar {
  @apply w-16 h-16 rounded-full;
  object-fit: contain;
  object-position: center;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: white;
  padding: 4px;
}

/* Speech Bubble */
.speech-bubble {
  @apply absolute;
  left: calc(100% - 8px);
  top: -40px;
  background-color: white;
  color: var(--color-navy-700);
  padding: 8px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  z-index: 20;
}

/* Speech Bubble Arrow (pointing down-left to avatar) */
.speech-bubble::before {
  content: '';
  position: absolute;
  left: 0px;
  top: 90%;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
  transform: rotateZ(25deg);
}

/* Help Button */
.help-button {
  @apply w-full flex items-center justify-center gap-2;
  @apply py-3 rounded-full;
  @apply transition-all duration-200;
  background-color: #5b5675;
  color: white;
  font-size: 14px;
  font-weight: 600;
  filter: saturate(1.4) brightness(0.9);
  padding-left: 60px; /* Extra space for avatar */
  padding-right: 16px;
}

.help-button:hover {
  filter: saturate(1.5) brightness(0.85);
}
</style>
