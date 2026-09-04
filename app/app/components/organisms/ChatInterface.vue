<template>
  <div data-testid="chat-interface" class="flex flex-col h-full bg-navy-deep">
    <!-- Chat Header -->
    <div class="flex-shrink-0 px-6 py-4 border-b border-navy-medium">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          :style="{ backgroundColor: `${assistant?.color || '#6FEDB7'}20` }"
        >
          {{ assistant?.avatar || '🤖' }}
        </div>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">
            {{ assistant?.name || t('chat.assistant.default_name') }}
          </h2>
          <p class="text-sm text-text-secondary">
            {{ assistant?.title || t('chat.assistant.default_title') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <!-- Welcome Message (when no messages) -->
      <div
        v-if="!conversation || conversation.messages.length === 0"
        class="flex items-center justify-center h-full"
      >
        <div class="text-center max-w-md">
          <div
            class="w-20 h-20 mx-auto mb-4 rounded-full bg-mint/10 flex items-center justify-center text-4xl"
          >
            {{ assistant?.avatar || '👋' }}
          </div>
          <h3 class="text-xl font-semibold text-text-primary mb-2">
            {{
              assistant?.name
                ? t('chat.interface.welcome_greeting', { name: assistant.name })
                : t('chat.interface.welcome_greeting_default')
            }}
          </h3>
          <p class="text-text-secondary">
            {{ assistant?.description || t('chat.assistant.default_description') }}
          </p>
          <div class="mt-6 space-y-2">
            <p class="text-sm text-text-muted">{{ t('chat.interface.ask_about') }}</p>
            <div class="flex flex-wrap gap-2 justify-center">
              <span
                v-for="specialty in assistant?.specialties.slice(0, 4) || []"
                :key="specialty"
                class="px-3 py-1 rounded-full text-xs bg-navy-medium text-text-secondary"
              >
                {{ specialty }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Messages -->
      <div
        v-for="message in conversation?.messages || []"
        :key="message.id"
        data-testid="chat-message"
        class="flex"
        :class="[message.role === 'user' ? 'justify-end' : 'justify-start']"
      >
        <div
          class="max-w-[75%] rounded-lg p-3"
          :class="[
            message.role === 'user'
              ? 'bg-mint text-navy-deep'
              : 'bg-navy-dark text-text-primary border border-navy-medium',
          ]"
        >
          <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
          <p
            class="text-xs mt-1"
            :class="[message.role === 'user' ? 'text-navy-dark/70' : 'text-text-muted']"
          >
            {{ formatTime(message.timestamp) }}
          </p>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="flex justify-start">
        <div class="bg-navy-dark border border-navy-medium rounded-lg p-3">
          <div class="flex items-center gap-1">
            <div
              class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style="animation-delay: 0ms"
            ></div>
            <div
              class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style="animation-delay: 150ms"
            ></div>
            <div
              class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style="animation-delay: 300ms"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="flex-shrink-0 px-6 py-4 border-t border-navy-medium">
      <form class="flex gap-2" @submit.prevent="handleSendMessage">
        <input
          v-model="messageInput"
          type="text"
          :placeholder="inputPlaceholder"
          class="flex-1 px-4 py-3 bg-navy-dark border border-navy-medium rounded-xl text-text-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-mint focus:border-transparent"
          :disabled="isSending || isTyping"
        />
        <button
          type="submit"
          class="px-6 py-3 bg-mint text-navy-deep rounded-xl font-medium hover:bg-mint/90 focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2 focus:ring-offset-navy-deep disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          :disabled="!messageInput.trim() || isSending || isTyping"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Assistant, Conversation } from '~/types/chat.types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const { t } = useI18n()

interface Props {
  assistant: Assistant | null
  conversation: Conversation | null
  isTyping?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isTyping: false,
})

const emit = defineEmits<{
  sendMessage: [message: string]
}>()

const messageInput = ref('')
const isSending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const inputPlaceholder = computed(() => {
  if (props.isTyping) return t('chat.interface.input_typing')
  if (isSending.value) return t('chat.interface.input_sending')
  return t('chat.interface.input_placeholder')
})

const formatTime = (timestamp: Date) => {
  return format(new Date(timestamp), 'HH:mm', { locale: es })
}

const handleSendMessage = async () => {
  if (!messageInput.value.trim() || isSending.value || props.isTyping) return

  const message = messageInput.value.trim()
  messageInput.value = ''
  isSending.value = true

  try {
    emit('sendMessage', message)
  } finally {
    isSending.value = false
  }
}

// Auto-scroll to bottom when messages change
watch(
  () => [props.conversation?.messages.length, props.isTyping],
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }
)
</script>
