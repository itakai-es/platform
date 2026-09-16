<template>
  <AdminContentManager area="ayuda" />
</template>

<script setup lang="ts">
/** Sección «Centro de ayuda» del panel: guías, tutoriales, preguntas y vídeos. */

const { t } = useI18n()

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
})

useHead({ title: () => t('admin.help.title') })
</script>
