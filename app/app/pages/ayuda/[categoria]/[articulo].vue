<template>
  <HelpArticleTemplate area="ayuda" />
</template>

<script setup lang="ts">
/** Un artículo del centro de ayuda (Fase 3, punto 17). */

definePageMeta({
  layout: 'help',
  /**
   * Clave fija: por defecto Nuxt rehace la página en cada cambio de ruta, así
   * que saltar de un artículo a otro desde el índice lateral desmontaba el
   * componente, vaciaba el artículo y sacaba el esqueleto entero —lateral
   * incluido— para cambiar solo el texto. Con una clave que no cambia se
   * reutiliza la misma instancia y quien recarga es el `watch` de la
   * plantilla, que deja lo anterior en pantalla mientras llega lo nuevo.
   */
  key: 'ayuda-articulo',
})
</script>
