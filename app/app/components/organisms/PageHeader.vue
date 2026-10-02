<template>
  <div class="mb-8">
    <!-- Breadcrumbs -->
    <Breadcrumb v-if="breadcrumbs && breadcrumbs.length > 0" :items="breadcrumbs" />

    <!-- Title Section -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div class="min-w-0">
        <!-- tabindex -1: una página puede llevar el foco al título (p. ej. al
             vaciarse una lista con el teclado) sin que entre en el orden de Tab -->
        <h1
          tabindex="-1"
          class="text-2xl sm:text-3xl font-bold text-navy-700 mb-2 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-base text-navy-700/80">
          {{ subtitle }}
        </p>
        <!-- Lo que acompaña al título, como las etiquetas de una ficha -->
        <div v-if="$slots.meta" class="mt-3">
          <slot name="meta" />
        </div>
      </div>

      <!-- Action Buttons Slot -->
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <!-- Tabs Slot -->
    <div v-if="$slots.tabs" class="mt-6">
      <slot name="tabs" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BreadcrumbItem } from '../molecules/Breadcrumb.vue'

interface Props {
  breadcrumbs?: BreadcrumbItem[]
  title: string
  subtitle?: string
}

defineProps<Props>()
</script>
