<template>
  <HelpPortal area="blog" />
</template>

<script setup lang="ts">
/** Portada del blog: categorías y entradas de la más reciente a la más antigua (Fase 3, B3). */

const { t } = useI18n()

definePageMeta({ layout: 'blog' })

useHead({
  title: () => t('common.blog.meta.title'),
  meta: [{ name: 'description', content: () => t('common.blog.meta.description') }],
})
</script>
