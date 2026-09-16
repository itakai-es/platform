<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastContainer />
  <MaintenanceBanner />
</template>

<script setup lang="ts">
// Entry point de la aplicación ITAKAI

const { locale } = useI18n()
const htmlLang = computed(
  () => APP_LANGUAGES.find(lang => lang.code === locale.value)?.lang ?? locale.value
)

// Idioma del documento, al día con el que se elija: lo usan los lectores de
// pantalla y el silabeo (`hyphens: auto`). Y las fuentes de Google Fonts.
useHead({
  htmlAttrs: { lang: htmlLang },
  link: [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: '',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
    },
  ],
})
</script>
