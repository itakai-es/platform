<template>
  <HelpPortal scope="todo" />
</template>

<script setup lang="ts">
/** Portada del centro de ayuda con todo el contenido (Fase 3, punto 17). */

const { t } = useI18n()

definePageMeta({ layout: 'help' })

useHead({
  title: () => t('common.help.meta.title'),
  meta: [{ name: 'description', content: () => t('common.help.meta.description') }],
})
</script>
