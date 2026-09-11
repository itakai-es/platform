<template>
  <div class="flex h-screen bg-bg-primary overflow-hidden">
    <!-- Desktop Sidebar con Historial de Conversaciones -->
    <Sidebar
      class="hidden lg:flex !w-[22rem] !bg-yellow"
      :user-name="userName"
      :user-subtitle="userSubtitle"
      :user-id="userId"
      :avatar="userAvatar"
      :show-progress="userRole === 'student'"
      :progress-percentage="progressPercentage"
      :current-god="currentGod"
      :user-role="userRole"
      :chat-conversations="conversations"
      :active-conversation-id="currentConversationId"
      :loading-conversations="aiStore.loadingConversations"
      :has-more-conversations="aiStore.hasMoreConversations"
      :show-back-button="true"
      :back-route="dashboardRoute"
      :hide-god-button="true"
      :hide-user-profile="true"
      @new-conversation="handleNewConversation"
      @conversation-click="handleConversationClick"
      @load-more-conversations="handleLoadMore"
      @help-center="handleHelpCenter"
    />

    <!-- Contenido Principal -->
    <main class="flex-1 flex flex-col overflow-hidden lg:ml-[22rem]">
      <!-- Mobile Header -->
      <header
        class="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3"
      >
        <!-- Hamburger Menu -->
        <button
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          @click="mobileMenuOpen = true"
        >
          <svg class="w-6 h-6 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <!-- Current Assistant Info (centered) -->
        <div class="flex-1 flex items-center justify-center gap-2">
          <img
            v-if="currentGod"
            :src="currentGod.avatar"
            :alt="currentGod.name"
            class="w-8 h-8 rounded-full"
          />
          <span class="text-sm font-semibold text-navy-700">{{
            currentGod?.name || $t('chat.assistant.itakai_assistant')
          }}</span>
        </div>

        <!-- Spacer to balance hamburger -->
        <div class="w-10 flex-shrink-0" />
      </header>

      <!-- Chat content - fills remaining space after mobile header -->
      <div class="w-full flex flex-col flex-1 min-h-0">
        <slot />
      </div>
    </main>

    <!-- Mobile Sidebar Drawer -->
    <Transition name="fade">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        @click="mobileMenuOpen = false"
      />
    </Transition>

    <Transition name="slide-right">
      <aside
        v-if="mobileMenuOpen"
        class="fixed inset-y-0 left-0 w-80 sm:w-[22rem] bg-yellow z-50 lg:hidden flex flex-col p-4 shadow-2xl"
      >
        <!-- White container (same as desktop sidebar) -->
        <div
          class="bg-white rounded-2xl px-3 py-3 flex-1 flex flex-col chat-conversations-container overflow-hidden"
        >
          <!-- Fixed: Back + Close row -->
          <div class="flex items-center gap-2 mb-2 flex-shrink-0">
            <NuxtLink
              :to="dashboardRoute"
              class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-navy-700 border border-gray-200 hover:bg-gray-50 transition-all"
              @click="mobileMenuOpen = false"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>{{ $t('common.actions.back_to_dashboard') }}</span>
            </NuxtLink>
            <button
              class="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all flex-shrink-0"
              :aria-label="$t('common.actions.close_menu')"
              @click="mobileMenuOpen = false"
            >
              <svg
                class="w-5 h-5 text-navy-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Fixed: New conversation button -->
          <div class="mb-3 flex-shrink-0">
            <button
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-navy-700 text-white hover:opacity-90 transition-all"
              @click="handleNewConversationMobile"
            >
              <PlusIcon class="w-5 h-5" />
              {{ $t('common.sidebar.new_conversation') }}
            </button>
          </div>

          <!-- Fixed: Separator -->
          <hr class="border-gray-100 my-2 flex-shrink-0" />

          <!-- Scrollable: Conversations list -->
          <div class="space-y-0.5 flex-1 overflow-y-auto min-h-0">
            <!-- Skeletons -->
            <template v-if="aiStore.loadingConversations && conversations.length === 0">
              <div
                v-for="i in 6"
                :key="`mob-sk-${i}`"
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

            <template v-else>
              <ChatConversationItem
                v-for="conv in conversations"
                :key="conv.id"
                :conversation="conv"
                :is-active="conv.id === currentConversationId"
                @click="handleConversationClickMobile(conv)"
              />

              <div v-if="aiStore.hasMoreConversations" class="py-2 flex justify-center">
                <button class="text-xs text-text-muted hover:text-navy-700" @click="handleLoadMore">
                  Cargar más...
                </button>
              </div>
            </template>
          </div>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useAIAssistantStore } from '~/stores/aiAssistant'
import { storeToRefs } from 'pinia'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { getDashboardByRole } from '~/utils/navigation'

const { t } = useI18n()
const authStore = useAuthStore()
const aiStore = useAIAssistantStore()

// Get user data from auth store
const { user } = storeToRefs(authStore)
const { conversations, currentConversationId, currentGod } = storeToRefs(aiStore)

// Mobile menu state
const mobileMenuOpen = ref(false)

// Compute user props for sidebar
const userName = computed(() => user.value?.name || t('chat.user_subtitles.default'))
const userId = computed(() => user.value?.id || 'user')
const userAvatar = computed(() => user.value?.avatar || undefined)
const userRole = computed(() => user.value?.role || 'student')

const userSubtitle = computed(() => {
  if (userRole.value === 'student') {
    return t('chat.user_subtitles.default')
  }
  if (userRole.value === 'teacher') {
    return t('chat.user_subtitles.teacher')
  }
  return t('chat.user_subtitles.default')
})

const progressPercentage = computed(() => {
  return undefined
})

// Dashboard route based on user role
const dashboardRoute = computed(() => getDashboardByRole(userRole.value))

// Handlers
const handleNewConversation = () => {
  aiStore.clearCurrentConversation()
}

const handleConversationClick = async (conversation: any) => {
  await aiStore.loadConversation(conversation.id)
}

const handleLoadMore = () => {
  aiStore.fetchConversations(true)
}

const handleHelpCenter = () => {
  // Navigate to chat (already here, so just clear conversation)
  aiStore.clearCurrentConversation()
}

// Mobile handlers
const handleNewConversationMobile = () => {
  handleNewConversation()
  mobileMenuOpen.value = false
}

const handleConversationClickMobile = async (conv: any) => {
  await handleConversationClick(conv)
  mobileMenuOpen.value = false
}

// Load conversations and start god rotation on mount (parallel for speed)
onMounted(async () => {
  // Init god rotation first (sync — sets randomGod immediately) so EmptyChat has a god to show
  await aiStore.initRandomGodRotation()
  // Then fetch conversations (may take time)
  await aiStore.fetchConversations()
})

// Clean up on unmount — clear conversation so next visit starts fresh
onUnmounted(() => {
  aiStore.stopRandomGodRotation()
  aiStore.clearCurrentConversation()
})
</script>

<style scoped>
/* Slide-right transition for mobile drawer */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-right-enter-from {
  transform: translateX(-100%);
}

.slide-right-leave-to {
  transform: translateX(-100%);
}

/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
