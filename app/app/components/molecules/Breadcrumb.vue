<template>
  <nav aria-label="Breadcrumb" class="mb-4">
    <ol class="flex items-center gap-2 text-sm">
      <li v-for="(item, index) in items" :key="index" class="flex items-center gap-2">
        <!-- Link -->
        <NuxtLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="text-navy-700 font-medium hover:opacity-70 transition-opacity"
        >
          {{ item.label }}
        </NuxtLink>

        <!-- Current page (no link) -->
        <span v-else class="text-navy-700/70 font-medium">
          {{ item.label }}
        </span>

        <!-- Separator -->
        <span v-if="index < items.length - 1" class="text-navy-700/40" aria-hidden="true">
          &gt;
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
  to?: string
}

interface Props {
  items: BreadcrumbItem[]
}

defineProps<Props>()
</script>
