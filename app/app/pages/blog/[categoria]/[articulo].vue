<template>
  <HelpArticleTemplate area="blog" />
</template>

<script setup lang="ts">
/** Una entrada del blog (Fase 3, B3). */

definePageMeta({
  layout: 'blog',
  /** Clave fija, como en la ayuda: saltar entre entradas no rehace la página. */
  key: 'blog-articulo',
})
</script>
