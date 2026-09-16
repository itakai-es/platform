<template>
  <AdminContentManager area="blog" />
</template>

<script setup lang="ts">
/** Sección «Blog» del panel: las entradas del blog, aparte del centro de ayuda. */

const { t } = useI18n()

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
})

useHead({ title: () => t('admin.blog.title') })
</script>
