<script setup lang="ts">
/**
 * `/profesor/clases/:id/entregas` era un listado de entregas pendientes de la
 * clase. Las entregas se revisan ahora en su misión («Ver entregas» de cada
 * enigma), así que esta ruta solo redirige a las misiones de la clase: los
 * avisos de entrega nueva antiguos llevan aquí y tienen que seguir sirviendo.
 */
definePageMeta({
  redirect: to => `/profesor/clases/${String(to.params.id)}/misiones`,
})
</script>

<template>
  <div />
</template>
