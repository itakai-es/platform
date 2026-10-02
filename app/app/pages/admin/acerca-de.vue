<template>
  <AboutTemplate :home-route="ROUTE_NAMES.ADMIN_DASHBOARD" />
</template>

<script setup lang="ts">
/** «Acerca de» de la administración: el contenido vive en AboutTemplate. */
import { ROUTE_NAMES } from '~/utils/navigation'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'onboarding', 'role'],
  role: 'admin',
})
</script>
