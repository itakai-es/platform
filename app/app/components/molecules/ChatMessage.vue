<template>
  <div :class="['flex w-full mb-4', message.role === 'user' ? 'justify-end' : 'justify-start']">
    <!-- Avatar (solo para assistant) -->
    <Avatar
      v-if="message.role === 'assistant' && assistantAvatar"
      :src="assistantAvatar"
      size="xs"
      class="mr-2 sm:mr-3 mt-1 flex-shrink-0"
    />

    <!-- Message Bubble -->
    <div
      :class="[
        'max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl',
        message.role === 'user'
          ? 'bg-navy-700 text-white rounded-br-sm'
          : 'bg-gray-100 text-text-primary rounded-bl-sm',
      ]"
    >
      <!-- Content -->
      <div
        :class="[
          'text-sm sm:text-base leading-relaxed',
          message.role === 'assistant' ? 'chat-markdown' : 'whitespace-pre-wrap',
        ]"
        v-html="formattedContent"
      />

      <!-- Sources (si existen) -->
      <div
        v-if="message.metadata?.sources && message.metadata.sources.length > 0"
        class="mt-3 flex flex-wrap gap-2"
      >
        <a
          v-for="(source, i) in message.metadata.sources"
          :key="i"
          :href="source.url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs px-3 py-1.5 bg-white/60 border border-border-primary rounded-full hover:bg-white hover:shadow-sm transition-all flex items-center gap-1"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          {{ source.title || `Fuente ${i + 1}` }}
        </a>
      </div>

      <!--  Timestamp -->
      <p
        :class="['text-xs mt-2', message.role === 'user' ? 'text-navy-700/70' : 'text-text-muted']"
      >
        {{ formatTime(message.timestamp) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '~/utils/markdown'

export interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date | string
  metadata?: {
    sources?: Array<{
      title?: string
      url: string
    }>
  }
}

const props = defineProps<{
  message: ChatMessageData
  assistantAvatar?: string
}>()

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const formattedContent = computed(() => {
  if (props.message.role === 'assistant') {
    return renderMarkdown(props.message.content)
  }
  // User messages: plain escaped text, no markdown parsing
  return escapeHtml(props.message.content).replace(/\n/g, '<br />')
})

// Format time
const formatTime = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
/* Markdown styles for assistant chat bubbles */
.chat-markdown :deep(h3) {
  font-size: 1rem;
  font-weight: 700;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}
.chat-markdown :deep(h4) {
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}
.chat-markdown :deep(h5),
.chat-markdown :deep(h6) {
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 0.25rem;
  margin-bottom: 0.125rem;
}
.chat-markdown :deep(p) {
  margin-bottom: 0.5rem;
}
.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-markdown :deep(strong) {
  font-weight: 800;
}
.chat-markdown :deep(em) {
  font-style: italic;
}
.chat-markdown :deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.chat-markdown :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.chat-markdown :deep(li) {
  margin-bottom: 0.125rem;
}
.chat-markdown :deep(code) {
  background: rgba(0, 0, 0, 0.08);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, monospace;
}
.chat-markdown :deep(pre) {
  background: #0a0e27;
  color: #fff;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
  overflow-x: auto;
}
.chat-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}
.chat-markdown :deep(a) {
  color: #ffd166;
  text-decoration: underline;
}
.chat-markdown :deep(a:hover) {
  opacity: 0.8;
}
.chat-markdown :deep(blockquote) {
  border-left: 3px solid #ffd166;
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  opacity: 0.9;
}
.chat-markdown :deep(hr) {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin: 0.5rem 0;
}
.chat-markdown :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
  font-size: 0.875rem;
}
.chat-markdown :deep(th),
.chat-markdown :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0.375rem 0.5rem;
  text-align: left;
}
.chat-markdown :deep(th) {
  font-weight: 600;
  background: rgba(0, 0, 0, 0.05);
}
</style>
