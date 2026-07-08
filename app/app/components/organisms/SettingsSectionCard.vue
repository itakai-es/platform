<template>
  <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
    <div class="flex items-center gap-3 mb-1">
      <component :is="icon" class="w-6 h-6 text-navy-700" />
      <h3 class="text-lg font-bold text-navy-700">{{ title }}</h3>
    </div>
    <p v-if="description" class="text-sm text-navy-700/70 mb-6">{{ description }}</p>

    <form class="space-y-5" @submit.prevent="emit('save')">
      <slot />
      <hr class="border-border-primary" />
      <div class="flex justify-end">
        <Button type="submit" variant="primary" size="md" :loading="saving">{{ saveLabel }}</Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Tarjeta blanca de sección de configuración (estética admin), con cabecera
 * icono + título + descripción, un slot para los campos y un botón de guardar.
 * Evita repetir el mismo envoltorio en cada sección de la página de config.
 */
defineProps<{
  icon: Component
  title: string
  description?: string
  saving?: boolean
  saveLabel: string
}>()

const emit = defineEmits<{ save: [] }>()
</script>
