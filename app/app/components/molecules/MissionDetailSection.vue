<template>
  <article
    :id="id"
    class="rounded-2xl p-4 sm:p-6 shadow-lg"
    :class="id ? 'scroll-mt-4' : undefined"
    :style="{
      backgroundColor: `var(--color-section-${tone})`,
      borderLeft: 'var(--card-accent-left) solid var(--color-card-accent)',
    }"
    :aria-labelledby="headingId"
  >
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-2 min-w-0">
        <component
          :is="icon"
          class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
          :style="{ color: 'var(--color-section-heading)' }"
          aria-hidden="true"
        />
        <h2
          :id="headingId"
          class="text-lg sm:text-2xl font-extrabold"
          :style="{ color: 'var(--color-section-heading)' }"
        >
          {{ title }}
        </h2>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </article>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Una sección del detalle de una misión (historia, enigmas, pistas,
 * documentos): la tarjeta con el color de su sección, el icono y el título y, a
 * la derecha, sus acciones (`#actions`). Los colores son los tokens de cada
 * tema (`--color-section-…`), así que cambian con él.
 */
withDefaults(
  defineProps<{
    title: string
    icon: Component
    /** Fondo de la sección: el token `--color-section-<tone>`. */
    tone?: 'purple' | 'enigmas' | 'hints'
    /** Ancla de la sección (para llevar a ella desde otro sitio). */
    id?: string
  }>(),
  { tone: 'purple', id: undefined }
)

const headingId = useId()
</script>
