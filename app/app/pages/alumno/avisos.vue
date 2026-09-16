<template>
  <NotificationCenter />
</template>

<script setup lang="ts">
/** Avisos del alumnado: revisiones, plazos, clases e insignias. */
import { getDashboardByRole } from '~/utils/navigation'

const { t } = useI18n()

definePageMeta({
  layout: 'student',
  middleware: [
    'auth',
    'role',
    // En «Ver como alumno» los avisos serían los del profesor: al inicio
    () => {
      if (useAuthStore().isStudentPreview) {
        return navigateTo(getDashboardByRole('student'), { replace: true })
      }
    },
  ],
})

useHead({ title: () => t('common.notifications.title') })
</script>
