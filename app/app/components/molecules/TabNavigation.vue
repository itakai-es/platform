<template>
  <div class="border-b border-navy-700/10">
    <nav class="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base transition-all duration-200',
          activeTab === tab.id
            ? 'border-student text-navy-700 font-semibold'
            : 'border-transparent text-navy-700/70 hover:text-navy-700/80 hover:border-navy-700/30',
        ]"
        :aria-current="activeTab === tab.id ? 'page' : undefined"
        @click="handleTabClick(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
export interface Tab {
  id: string
  label: string
}

interface Props {
  tabs: Tab[]
  activeTab: string
  variant?: 'default' | 'underline'
}

interface Emits {
  (e: 'tab-change', tabId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const emit = defineEmits<Emits>()

const handleTabClick = (tabId: string) => {
  emit('tab-change', tabId)
}
</script>

<style scoped>
/* Hide scrollbar but keep functionality */
nav::-webkit-scrollbar {
  display: none;
}
nav {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
