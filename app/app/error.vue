<template>
  <div class="min-h-screen flex items-center justify-center bg-navy-deep">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-text-primary">{{ error?.statusCode || 500 }}</h1>
      <p class="text-xl text-gray-300 mt-4">{{ error?.message || 'Error inesperado' }}</p>
      <button class="btn-primary mt-6" @click="handleError">{{ t('common.actions.back_to_dashboard') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

import { getDashboardByRole } from '~/utils/navigation'

const error = useError()
const authStore = useAuthStore()

const handleError = () => {
  const role = authStore.user?.role
  const redirect = role ? getDashboardByRole(role) : '/'
  clearError({ redirect })
}
</script>
