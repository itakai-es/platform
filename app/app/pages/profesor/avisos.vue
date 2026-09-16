<template>
  <NotificationCenter />
</template>

<script setup lang="ts">
/** Avisos del profesorado: las entregas que le quedan por revisar. */

const { t } = useI18n()

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

useHead({ title: () => t('common.notifications.title') })
</script>
