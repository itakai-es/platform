<template>
  <div />
</template>

<script setup lang="ts">
/**
 * Los correos de recuperación enviados antes de corregir el enlace apuntaban
 * aquí. Se llevan a la página de verdad con su token, sin pasar por el 404.
 */
definePageMeta({ layout: false })

const route = useRoute()
await navigateTo({ path: '/auth/restablecer-password', query: route.query }, { replace: true })
</script>
