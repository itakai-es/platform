<script setup lang="ts">
/**
 * `/docs` era el marcador de posición del centro de ayuda y está enlazado desde
 * el pie de la landing desde el primer día. Ahora que la ayuda existe de verdad
 * en `/ayuda` (Fase 3, punto 17), esta ruta se mantiene y redirige: los enlaces
 * que ya circulan por ahí tienen que seguir llevando a algún sitio.
 */
definePageMeta({
  redirect: '/ayuda',
})
</script>

<template>
  <div />
</template>
