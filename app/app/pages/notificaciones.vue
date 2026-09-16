<script setup lang="ts">
/**
 * `/notificaciones` era la página de avisos común a todos los roles. Ahora cada
 * rol tiene la suya dentro de su sección (con su menú), así que esta ruta solo
 * redirige, por si queda algún enlace antiguo. Sin rol con avisos (o en «Ver
 * como alumno»), al inicio.
 */
import { getDashboardByRole, getNotificationsByRole } from '~/utils/navigation'

definePageMeta({
  middleware: [
    'auth',
    () => {
      const authStore = useAuthStore()
      const role = authStore.user?.role ?? ''
      const target = authStore.isStudentPreview ? undefined : getNotificationsByRole(role)
      return navigateTo(target ?? getDashboardByRole(role), {
        replace: true,
      })
    },
  ],
})
</script>

<template>
  <div />
</template>
