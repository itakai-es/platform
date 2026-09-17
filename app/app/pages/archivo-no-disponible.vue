<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl space-y-6 text-center">
      <h1 class="text-3xl font-bold text-navy-700">{{ t('common.file_unavailable.title') }}</h1>
      <p class="text-navy-700/70">{{ t('common.file_unavailable.message') }}</p>
      <Button variant="primary" @click="goBack">
        {{ t('common.actions.back_to_dashboard') }}
      </Button>
    </div>
  </div>
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
