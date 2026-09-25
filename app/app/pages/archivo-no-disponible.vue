<template>
  <AuthCardShell
    :title="t('common.file_unavailable.title')"
    :subtitle="t('common.file_unavailable.message')"
  >
    <Button variant="primary" size="lg" class="w-full" @click="goBack">
      {{ t('common.actions.back_to_dashboard') }}
    </Button>
  </AuthCardShell>
</template>

<script setup lang="ts">
/**
 * A donde lleva un enlace de fichero que ya no vale (ha caducado o el fichero ya
 * no está). El mensaje se ve en el idioma de la interfaz, que es lo que no puede
 * hacer la respuesta de la API.
 */
import { getDashboardByRole } from '~/utils/navigation'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

useHead({
  title: () => t('common.file_unavailable.title'),
})

definePageMeta({
  layout: 'auth',
})

// El enlace se abre en una pestaña nueva, así que lo natural es cerrarla; si el
// navegador no lo permite, se vuelve a donde tenga sentido para quien mira.
const goBack = () => {
  window.close()
  const role = authStore.user?.role
  void router.push(role ? getDashboardByRole(role) : '/')
}
</script>
