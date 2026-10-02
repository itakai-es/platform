<template>
  <AboutTemplate :home-route="ROUTE_NAMES.TEACHER_DASHBOARD" />
</template>

<script setup lang="ts">
/** «Acerca de» del profesorado: el contenido vive en AboutTemplate. */
import { ROUTE_NAMES } from '~/utils/navigation'

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'onboarding', 'role'],
})
</script>
