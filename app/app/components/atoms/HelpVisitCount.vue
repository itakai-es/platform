<template>
  <span class="inline-flex items-center gap-1.5">
    <EyeIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
    {{ t('common.help.visit_count', { count: formattedCount }, count) }}
  </span>
</template>

<script setup lang="ts">
import { EyeIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{ count: number }>()
const { t, locale } = useI18n()
const formattedCount = computed(() => new Intl.NumberFormat(locale.value).format(props.count))
</script>
