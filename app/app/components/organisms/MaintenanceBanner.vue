<template>
  <div v-if="maintenance">
    <!-- Bloqueo a pantalla completa para usuarios NO admin autenticados
         (el backend ya les devuelve 503; esto es la versión bonita). -->
    <div
      v-if="blockedUser"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-bg-primary p-6 text-center"
    >
      <div class="max-w-md space-y-3">
        <WrenchScrewdriverIcon class="w-12 h-12 mx-auto text-navy-700" />
        <h1 class="text-xl font-bold text-navy-700">{{ t('common.maintenance.title') }}</h1>
        <p class="text-text-secondary">{{ t('common.maintenance.message') }}</p>
      </div>
    </div>

    <!-- Aviso discreto arriba para admins (que sí pueden entrar) y visitantes. -->
    <div
      v-else
      class="fixed top-0 inset-x-0 z-[80] bg-navy-700 text-white text-center text-xs sm:text-sm py-1.5 px-4"
    >
      {{ isAdmin ? t('common.maintenance.admin_notice') : t('common.maintenance.title') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()
const instanceConfig = useInstanceConfig()
const authStore = useAuthStore()

const maintenance = computed(() => instanceConfig.value?.maintenanceMode === true)
const isAdmin = computed(() => authStore.user?.role === 'admin')
const blockedUser = computed(() => authStore.isAuthenticated && !isAdmin.value)
</script>
