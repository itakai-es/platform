<template>
  <div class="flex justify-start w-full mb-4">
    <!-- Avatar (opcional) -->
    <Avatar
      v-if="showAvatar && assistantAvatar"
      :src="assistantAvatar"
      color="purple"
      size="xs"
      class="mr-3 mt-1 flex-shrink-0"
    />

    <!-- Typing Bubble -->
    <div class="bg-lilac/30 px-5 py-3 rounded-2xl rounded-bl-sm">
      <div class="flex items-center space-x-2">
        <div
          class="w-2 h-2 bg-purple rounded-full animate-bounce"
          style="animation-delay: 0ms"
        ></div>
        <div
          class="w-2 h-2 bg-purple rounded-full animate-bounce"
          style="animation-delay: 150ms"
        ></div>
        <div
          class="w-2 h-2 bg-purple rounded-full animate-bounce"
          style="animation-delay: 300ms"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    showAvatar?: boolean
    assistantAvatar?: string
  }>(),
  {
    showAvatar: true,
  }
)
</script>
