<template>
  <div class="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <div
      class="w-full max-w-7xl flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 sm:gap-8 lg:gap-16"
    >
      <!-- Columna Izquierda: Hero -->
      <div class="hidden lg:flex flex-col justify-center space-y-4 flex-1">
        <!-- Logo -->
        <div class="mb-0">
          <NuxtLink to="/" class="inline-block">
            <img
              src="/logo/itakai_color.svg"
              alt="ITAKAI"
              class="h-32 md:h-36 lg:h-40 cursor-pointer hover:opacity-90 transition-opacity"
            />
          </NuxtLink>
        </div>

        <!-- Título Hero - ENORME -->
        <h1
          class="hero-title font-bold text-white leading-[0.9] tracking-tight"
          v-html="$t('auth.forgot_password.hero_title').replace('\n', '<br>')"
        ></h1>

        <!-- Claim -->
        <p class="hero-claim text-white/90 w-full leading-relaxed">
          {{ $t('auth.forgot_password.hero_subtitle') }}
        </p>
      </div>

      <!-- Columna Derecha: Card de Forgot Password -->
      <div class="w-full max-w-md mx-auto lg:mx-0 flex-shrink-0">
        <!-- Logo móvil (solo visible en pantallas pequeñas) -->
        <div class="lg:hidden mb-4 sm:mb-6 text-center">
          <NuxtLink to="/" class="inline-block">
            <img
              src="/logo/itakai_color.svg"
              alt="ITAKAI"
              class="h-20 sm:h-28 mx-auto cursor-pointer hover:opacity-90 transition-opacity"
            />
          </NuxtLink>
        </div>

        <!-- Card con fondo lila -->
        <div
          class="bg-lilac rounded-3xl md:rounded-[32px] lg:rounded-[40px] shadow-2xl p-4 sm:p-6 lg:p-8"
        >
          <!-- Estado 1: Formulario de Email -->
          <div v-if="!emailSent">
            <!-- Header -->
            <div class="mb-4 sm:mb-6 text-center">
              <h2 class="text-2xl sm:text-3xl font-bold text-navy-700 mb-2">
                {{ $t('auth.forgot_password.card_title') }}
              </h2>
              <p class="text-base sm:text-lg md:text-xl text-navy-700/80">
                {{ $t('auth.forgot_password.card_subtitle') }}
              </p>
            </div>

            <!-- Formulario -->
            <form class="space-y-3 sm:space-y-4 forgot-form" @submit.prevent="handleForgotPassword">
              <!-- Email -->
              <FormField
                id="email"
                v-model="email"
                type="email"
                :label="$t('auth.forgot_password.email_label')"
                :placeholder="$t('auth.forgot_password.email_placeholder')"
                :required="true"
              />

              <!-- Error Message -->
              <div v-if="errorMessage" class="text-red-600 text-sm font-medium">
                {{ errorMessage }}
              </div>

              <!-- Submit Button -->
              <Button
                type="submit"
                variant="social"
                size="md"
                full-width
                class="auth-button"
                :disabled="isLoading"
                :loading="isLoading"
              >
                {{
                  isLoading
                    ? $t('auth.forgot_password.submit_loading')
                    : $t('auth.forgot_password.submit_button')
                }}
              </Button>
            </form>

            <!-- Back to Login -->
            <div class="mt-4 sm:mt-6 text-center">
              <p class="text-xs sm:text-sm text-navy-700/80 mb-2 sm:mb-3">
                {{ $t('auth.forgot_password.remembered_password') }}
              </p>
              <NuxtLink to="/auth/login" class="inline-block">
                <Button variant="primary" size="md">
                  {{ $t('auth.forgot_password.back_to_login') }}
                </Button>
              </NuxtLink>
            </div>
          </div>

          <!-- Estado 2: Success Message -->
          <div v-else class="text-center py-3 sm:py-4">
            <!-- Success Icon -->
            <div class="mb-4 sm:mb-6">
              <svg
                class="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-mint"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>

            <!-- Success Title -->
            <h3 class="text-2xl sm:text-3xl font-bold text-navy-700 mb-3 sm:mb-4">
              {{ $t('auth.forgot_password.success_title') }}
            </h3>

            <!-- Success Message -->
            <p class="text-sm sm:text-base text-navy-700/80 mb-4 sm:mb-6 leading-relaxed">
              {{ $t('auth.forgot_password.success_message') }}<br />
              <span class="font-bold text-navy-700">{{ email }}</span>
            </p>

            <p class="text-xs sm:text-sm text-navy-700/70 mb-6 sm:mb-8">
              {{ $t('auth.forgot_password.success_instructions') }}
            </p>

            <div v-if="resetUrl" class="mb-6 rounded-2xl bg-navy-50 px-4 py-3 text-left">
              <p class="text-xs sm:text-sm font-semibold text-navy-700 mb-2">
                {{ $t('auth.forgot_password.dev_reset_link') }}
              </p>
              <a
                :href="resetUrl"
                class="text-sm break-all text-purple hover:text-purple-dark underline"
              >
                {{ resetUrl }}
              </a>
            </div>

            <!-- Back to Login Button -->
            <NuxtLink to="/auth/login" class="inline-block">
              <Button variant="primary" size="md">
                {{ $t('auth.forgot_password.back_to_login') }}
              </Button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: computed(() => t('auth.forgot_password.page_title')),
  meta: [
    { name: 'description', content: computed(() => t('auth.forgot_password.page_description')) },
  ],
})

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const authStore = useAuthStore()

const email = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const emailSent = ref(false)
const resetUrl = ref('')

async function handleForgotPassword() {
  try {
    errorMessage.value = ''

    if (!email.value) {
      errorMessage.value = t('auth.forgot_password.validation.email_required')
      return
    }

    isLoading.value = true
    const response = await authStore.requestPasswordReset(email.value)
    resetUrl.value = response.resetUrl || ''
    emailSent.value = true
  } catch (error) {
    console.error('Error en forgot password:', error)
    errorMessage.value = t('auth.forgot_password.validation.send_error')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Estilos específicos del forgot password - Labels más grandes y bold */
.forgot-form :deep(label) {
  font-size: 0.875rem !important; /* 14px base */
  font-weight: 700 !important; /* Bold */
  color: var(--color-navy-700) !important; /* Navy 700 */
}

@media (min-width: 640px) {
  .forgot-form :deep(label) {
    font-size: 1rem !important; /* 16px en tablet+ */
  }
}

/* Hero title - Responsive (exclusivo de auth pages) */
.hero-title {
  font-size: 4rem; /* 64px base (tablet) */
  line-height: 1;
  letter-spacing: -0.02em;
}

@media (min-width: 1024px) {
  .hero-title {
    font-size: 6rem; /* 96px en desktop */
  }
}

@media (min-width: 1280px) {
  .hero-title {
    font-size: 6rem; /* Mantener 96px (más pequeño que login) */
  }
}

/* Hero claim - Responsive (exclusivo de auth pages) */
.hero-claim {
  font-size: 1.25rem; /* 20px base (tablet) */
  line-height: 1.6;
}

@media (min-width: 1024px) {
  .hero-claim {
    font-size: 1.5rem; /* 24px en desktop */
  }
}

@media (min-width: 1280px) {
  .hero-claim {
    font-size: 1.75rem; /* 28px en desktop grande */
  }
}

/* Breakpoint custom: 1100px para cambio de layout */
@media (max-width: 1099px) {
  /* Ocultar hero en < 1100px */
  .hidden.lg\:flex {
    display: none !important;
  }

  /* Mostrar logo móvil en < 1100px */
  .lg\:hidden {
    display: block !important;
  }

  /* Centrar formulario en < 1100px */
  .lg\:mx-0 {
    margin-left: auto !important;
    margin-right: auto !important;
  }

  /* Mantener layout en columna */
  .lg\:flex-row {
    flex-direction: column !important;
  }

  .lg\:justify-between {
    justify-content: center !important;
  }
}

@media (min-width: 1100px) {
  /* Mostrar hero en >= 1100px */
  .hidden.lg\:flex {
    display: flex !important;
  }

  /* Ocultar logo móvil en >= 1100px */
  .lg\:hidden {
    display: none !important;
  }

  /* Layout dos columnas en >= 1100px */
  .lg\:flex-row {
    flex-direction: row !important;
  }

  .lg\:justify-between {
    justify-content: space-between !important;
  }

  .lg\:items-center {
    align-items: center !important;
  }

  .lg\:mx-0 {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .lg\:gap-16 {
    gap: 4rem !important;
  }
}

/* Mobile < 640px: Sin card, textos blancos */
@media (max-width: 639px) {
  /* Mobile: Sin card, formulario ocupa toda la pantalla */
  .bg-lilac {
    background-color: transparent !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
  }

  /* Container principal con padding normal */
  .min-h-screen {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  /* Logo móvil más pequeño y con más espacio */
  .lg\:hidden img {
    height: 4rem !important; /* 64px */
    margin-bottom: 2rem !important;
  }

  /* Header del form más compacto */
  .bg-lilac > div:first-child {
    margin-bottom: 1.5rem !important;
  }

  /* Textos blancos en mobile sin card */
  .bg-lilac h2,
  .bg-lilac h3 {
    font-size: 1.75rem !important; /* 28px */
    color: white !important;
  }

  .bg-lilac > div:first-child > p,
  .bg-lilac p {
    color: rgba(255, 255, 255, 0.9) !important;
  }

  /* Success message también en blanco */
  .bg-lilac .text-navy-700 {
    color: white !important;
  }

  /* Links blancos */
  .forgot-form a {
    color: white !important;
  }
}

/* MOBILE OVERRIDE: Labels y botones en < 640px (debe ir después de las reglas generales) */
@media (max-width: 639px) {
  /* Todos los labels del formulario blancos con máxima especificidad */
  .forgot-form :deep(label),
  .forgot-form label {
    color: white !important;
  }

  /* Auth button cambia a purple en mobile */
  .auth-button {
    background-color: var(--color-purple) !important; /* purple */
  }

  .auth-button:hover {
    background-color: #9357e5 !important; /* purple-dark */
  }

  .auth-button:active {
    background-color: #7a3fcc !important; /* purple-darker */
  }

  .auth-button:focus {
    --tw-ring-color: rgba(172, 116, 253, 0.3) !important; /* purple/30 */
  }
}
</style>
