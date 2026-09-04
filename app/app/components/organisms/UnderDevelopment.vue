<template>
  <div class="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
    <!-- God Avatar -->
    <div class="mb-8">
      <img :src="effectiveGodAvatar" :alt="effectiveGodName" class="w-40 h-40 rounded-full" />
    </div>

    <!-- Main Message -->
    <h2 class="text-h2 text-text-primary mb-4">
      {{ title }}
    </h2>

    <!-- Description -->
    <p class="text-lg text-text-secondary mb-8 max-w-2xl">
      {{ description }}
    </p>

    <!-- Under Development Badge -->
    <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-8" :style="badgeStyle">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
      <span class="font-semibold">{{ t('common.status.under_development') }}</span>
    </div>

    <!-- Optional Back Button -->
    <NuxtLink :to="backRoute">
      <button
        class="px-6 py-3 rounded-full font-semibold text-white transition-all duration-200 hover:opacity-90"
        :style="buttonStyle"
      >
        {{ backButtonText || t('common.under_development.back_to_dashboard') }}
      </button>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getDashboardByRole } from '~/utils/navigation'

const { t } = useI18n()

interface Props {
  title: string
  description: string
  godAvatar?: string
  godName?: string
  backRoute?: string
  backButtonText?: string
}

const aiStore = useAIAssistantStore()

const props = withDefaults(defineProps<Props>(), {
  godAvatar: undefined,
  godName: undefined,
  backRoute: undefined,
  backButtonText: undefined,
})

// Use prop if provided, otherwise random god from store
const effectiveGodName = computed(() => props.godName || aiStore.currentGod?.name || 'Atenea')
const effectiveGodAvatar = computed(
  () => props.godAvatar || aiStore.currentGod?.avatar || '/app/avatars/atenea.svg'
)

// Dashboard URL by user role
const authStore = useAuthStore()
const dashboardRoute = computed(() =>
  getDashboardByRole(authStore.user?.role ?? '')
)

// Use custom backRoute if provided, otherwise use auto-detected dashboard route
const backRoute = computed(() => props.backRoute || dashboardRoute.value)

// Map god names to their colors (extracted from SVGs)
const godColors: Record<string, string> = {
  // Colores de identidad de cada dios, no estados de la interfaz: se quedan
  // literales a propósito. Si fueran por tokens, el modo de daltonismo le
  // cambiaría el color a los personajes, que es justo lo que no queremos.
  Atenea: '#00AAFC', // Blue/Azul (principal color de Atenea)
  Odisseu: '#FFC338', // Yellow/Amarillo dorado (color de Odisseu)
  Penelope: '#FF3C52', // Red/Rojo (color principal de Penelope)
  Polifem: '#AC74FD', // Purple/Morado (color principal de Polifem)
  Posido: '#6CF3AF', // Green/Verde menta (color principal de Posido)
}

// Get color based on god name
const godColor = computed(() => {
  return godColors[effectiveGodName.value] || '#AC74FD' // Default purple
})

// Badge style with god color
const badgeStyle = computed(() => ({
  backgroundColor: `${godColor.value}15`, // 15 = ~8% opacity
  borderColor: `${godColor.value}50`, // 50 = ~31% opacity
  border: `1px solid`,
  color: godColor.value,
}))

// Button style with god color
const buttonStyle = computed(() => ({
  backgroundColor: godColor.value,
}))
</script>
