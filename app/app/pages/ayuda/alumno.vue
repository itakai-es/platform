<template>
  <HelpPortal scope="alumno" />
</template>

<script setup lang="ts">
/** Portada del centro de ayuda para el alumnado (Fase 3, punto 17). */

const { t } = useI18n()

definePageMeta({ layout: 'help' })

useHead({
  title: () => `${t('common.help.hero.alumno.title')} · ${t('common.help.title')}`,
  meta: [{ name: 'description', content: () => t('common.help.hero.alumno.subtitle') }],
})
</script>
