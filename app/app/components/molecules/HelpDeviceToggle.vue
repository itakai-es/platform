<template>
  <div
    class="flex items-center justify-between gap-3 bg-navy-700 px-4 py-2.5 text-white"
  >
    <span class="text-sm font-medium">{{ t('common.help.device.label') }}</span>
    <div class="flex rounded-full bg-white/10 p-1" role="group" :aria-label="t('common.help.device.label')">
      <button
        v-for="mode in (['desktop', 'mobile'] as const)"
        :key="mode"
        type="button"
        class="rounded-full px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow"
        :class="modelValue === mode ? 'bg-white text-navy-700' : 'text-white/80 hover:text-white'"
        :aria-pressed="modelValue === mode"
        @click="emit('update:modelValue', mode)"
      >
        {{ t(`common.help.device.${mode}`) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HelpDevice } from '~/composables/useHelpDevice'

/** La barra «Ver en: Ordenador · Móvil» de las guías que tienen las dos versiones. */
defineProps<{ modelValue: HelpDevice }>()
const emit = defineEmits<{ 'update:modelValue': [value: HelpDevice] }>()
const { t } = useI18n()
</script>
