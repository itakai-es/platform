<template>
  <HelpPortal scope="profesor" />
</template>

<script setup lang="ts">
/** Portada del centro de ayuda para el profesorado (Fase 3, punto 17). */

const { t } = useI18n()

definePageMeta({ layout: 'help' })

useHead({
  title: () => `${t('common.help.hero.profesor.title')} · ${t('common.help.title')}`,
  meta: [{ name: 'description', content: () => t('common.help.hero.profesor.subtitle') }],
})
</script>
