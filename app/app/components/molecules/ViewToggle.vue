<template>
  <!-- Control segmentado cuadrícula / lista (/ mapa). Mismo estilo de pills navy
       que el resto de la app (activo: navy relleno, inactivo: superficie con hover). -->
  <div
    class="inline-flex items-center gap-1 rounded-full border border-border-primary bg-surface p-1"
    role="group"
    :aria-label="t('common.actions.view_mode')"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      :aria-label="option.label"
      :title="option.label"
      class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-10 sm:w-10"
      :class="
        modelValue === option.value ? 'bg-navy-700 text-white' : 'text-navy-700 hover:bg-gray-50'
      "
      @click="$emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" class="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { Squares2X2Icon, ListBulletIcon, MapIcon } from '@heroicons/vue/24/outline'
import type { ViewMode } from '~/composables/useViewMode'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue: ViewMode
    /** Los modos que se ofrecen, en este orden. El mapa, solo donde existe. */
    modes?: ViewMode[]
  }>(),
  { modes: () => ['grid', 'list'] }
)
defineEmits<{ 'update:modelValue': [ViewMode] }>()

const options = computed(() =>
  props.modes.map(value => ({ value, label: label(value), icon: ICONS[value] }))
)

const ICONS: Record<ViewMode, Component> = {
  grid: Squares2X2Icon,
  list: ListBulletIcon,
  map: MapIcon,
}

function label(mode: ViewMode): string {
  switch (mode) {
    case 'list':
      return t('common.view_modes.list')
    case 'map':
      return t('common.view_modes.map')
    default:
      return t('common.view_modes.grid')
  }
}
</script>
