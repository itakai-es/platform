<template>
  <div
    :class="[
      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all',
      isActive ? 'bg-yellow text-navy-700' : 'hover:bg-gray-50 text-navy-700',
    ]"
    @click="handleClick"
  >
    <!-- God avatar with white circle background -->
    <div
      class="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-white shadow-sm flex items-center justify-center"
    >
      <img :src="godAvatar" :alt="godName" class="w-7 h-7 object-contain" />
    </div>

    <!-- Title (truncated, full width) -->
    <p
      :class="[
        'flex-1 min-w-0 text-xs sm:text-sm font-medium truncate',
        isActive ? 'text-navy-700' : 'text-text-primary',
      ]"
    >
      {{ conversation.title }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ChatConversation } from '~/stores/aiAssistant'

const { t } = useI18n()

const ASSISTANT_AVATARS: Record<string, { name: string; avatar: string }> = {
  atenea: { name: 'Atenea', avatar: '/app/avatars/atenea.svg' },
  odiseo: { name: 'Odiseo', avatar: '/app/avatars/odiseo.svg' },
  penelope: { name: 'Penélope', avatar: '/app/avatars/penelope.svg' },
  polifemo: { name: 'Polifemo', avatar: '/app/avatars/polifemo.svg' },
  poseidon: { name: 'Poseidón', avatar: '/app/avatars/poseidon.svg' },
}

const props = withDefaults(
  defineProps<{
    conversation: ChatConversation
    isActive?: boolean
  }>(),
  {
    isActive: false,
  }
)

const emit = defineEmits<{
  click: [conversation: ChatConversation]
}>()

const godInfo = computed(
  () => ASSISTANT_AVATARS[props.conversation.assistantId] || ASSISTANT_AVATARS.atenea
)
const godAvatar = computed(() => godInfo.value?.avatar || '/app/avatars/atenea.svg')
const godName = computed(() => godInfo.value?.name || 'Atenea')

// Format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('common.time.now')
  if (diffMins < 60) return t('common.time.ago_min_short', { count: diffMins })
  if (diffHours < 24) return t('common.time.ago_hours_short', { count: diffHours })
  if (diffDays === 1) return t('common.time.yesterday')
  if (diffDays < 7) return t('common.time.ago_days', { count: diffDays })
  if (diffDays < 30) return t('common.time.ago_weeks', { count: Math.floor(diffDays / 7) })
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const handleClick = () => {
  emit('click', props.conversation)
}
</script>
