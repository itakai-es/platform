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
          v-html="$t('auth.login.hero_title').replace('\n', '<br>')"
        ></h1>

        <!-- Claim -->
        <p class="hero-claim text-white/90 w-full leading-relaxed">
          {{ $t('auth.login.hero_subtitle') }}
        </p>
      </div>

      <!-- Columna Derecha: Card de Login -->
      <div class="w-full max-w-md mx-auto lg:mx-0 flex-shrink-0">
        <!-- Logo móvil y tablet (oculto solo en desktop) -->
        <div class="lg:hidden mb-4 sm:mb-6 text-center">
          <NuxtLink to="/" class="inline-block">
            <img
              src="/logo/itakai_color.svg"
              alt="ITAKAI"
              class="h-20 sm:h-24 mx-auto cursor-pointer hover:opacity-90 transition-opacity"
            />
          </NuxtLink>
        </div>

        <!-- Card con fondo lila -->
        <div
          class="bg-lilac rounded-3xl md:rounded-[32px] lg:rounded-[40px] shadow-2xl p-4 sm:p-6 lg:p-8 relative overflow-hidden"
        >
          <!-- Header -->
          <div class="mb-4 sm:mb-6 text-center">
            <h2 class="text-2xl sm:text-3xl font-bold text-navy-700">
              {{ $t('auth.login.card_title') }}
            </h2>
            <p class="text-base sm:text-lg md:text-xl text-navy-700/80">
              {{ $t('auth.login.card_subtitle') }}
            </p>
          </div>

          <!-- Formulario -->
          <form class="space-y-3 sm:space-y-4 login-form" @submit.prevent="handleLogin">
            <!-- Email -->
            <FormField
              id="email"
              v-model="email"
              type="email"
              :label="$t('auth.login.email_label')"
              :placeholder="$t('auth.login.email_placeholder')"
              :required="true"
              data-testid="email-input"
            />

            <!-- Contraseña -->
            <FormField
              id="password"
              v-model="password"
              type="password"
              :label="$t('auth.login.password_label')"
              :placeholder="$t('auth.login.password_placeholder')"
              :required="true"
              data-testid="password-input"
            />

            <div v-if="errorMessage" class="text-red-600 text-sm font-medium">
              {{ errorMessage }}
            </div>

            <!-- Recordarme + Olvidaste contraseña -->
            <div class="flex items-center justify-between">
              <Checkbox
                id="remember-me"
                v-model="rememberMe"
                :label="$t('auth.login.remember_me')"
              />

              <NuxtLink
                to="/auth/recuperar-password"
                class="text-sm text-navy-700 link-underline hover:opacity-70"
              >
                {{ $t('auth.login.forgot_password') }}
              </NuxtLink>
            </div>

            <!-- Botón de Login -->
            <Button
              type="submit"
              variant="social"
              size="md"
              full-width
              :disabled="isLoading"
              :loading="isLoading"
              class="auth-button"
            >
              {{ isLoading ? $t('auth.login.submit_loading') : $t('auth.login.submit_button') }}
            </Button>
          </form>

          <!-- Separador "O continúa con" -->
          <div class="my-4 sm:my-6 text-center">
            <span class="text-xs sm:text-sm text-navy-700/70 font-medium">{{
              $t('auth.login.social_separator')
            }}</span>
          </div>

          <!-- Botones Sociales -->
          <div class="space-y-2 sm:space-y-2.5">
            <!-- Google -->
            <Button
              variant="social"
              size="md"
              full-width
              class="social-btn"
              @click="loginWithGoogle"
            >
              <svg class="w-5 h-5 flex-shrink-0 mr-2" viewBox="0 0 48 48">
                <path
                  fill="#FFC107"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                />
              </svg>
              <span class="text-sm sm:text-base">{{ $t('auth.login.social_google') }}</span>
            </Button>
          </div>

          <!-- Crear Cuenta -->
          <div class="mt-12 sm:mt-16 pb-12 sm:pb-16 text-center relative">
            <p class="text-xs sm:text-sm text-navy-700/80 mb-2 sm:mb-3">
              {{ $t('auth.login.no_account') }}
            </p>
            <NuxtLink to="/auth/registro" class="inline-block relative z-10">
              <Button variant="primary" size="md">
                {{ $t('auth.login.create_account') }}
              </Button>
            </NuxtLink>

            <!-- Polifemo mirando al formulario (oculto en mobile) -->
            <img
              src="/app/avatars/polifemo.svg"
              alt="Polifemo"
              class="absolute pointer-events-none polifemo-avatar hidden sm:block"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: computed(() => t('auth.login.page_title')),
  meta: [{ name: 'description', content: computed(() => t('auth.login.page_description')) }],
})

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  try {
    errorMessage.value = ''
    isLoading.value = true
    await authStore.login({
      email: email.value,
      password: password.value,
    })

    // Verificar si el usuario ha completado onboarding
    if (!authStore.user?.isOnboarded) {
      // Redirigir a onboarding para seleccionar rol
      router.push('/onboarding/seleccion-rol')
      return
    }

    // Redirigir al dashboard según el rol del usuario
    router.push(getDashboardByRole(authStore.user?.role ?? ''))
  } catch (error: any) {
    console.error('Error en login:', error)
    errorMessage.value = error?.data?.message || t('auth.login.validation.login_error')
  } finally {
    isLoading.value = false
  }
}

async function loginWithGoogle() {
  const { signInWithPopup } = useGoogleAuth()

  try {
    errorMessage.value = ''
    isLoading.value = true

    // Esto abrirá el popup de Google y manejará el callback automáticamente
    await signInWithPopup()

    // El callback en useGoogleAuth ya llamó a authStore.loginWithGoogle()
    // Si llegamos aquí, el login fue exitoso

    // Verificar si el usuario necesita completar onboarding
    if (!authStore.user?.isOnboarded) {
      router.push('/onboarding/seleccion-rol')
      return
    }

    // Redirigir al dashboard según el rol del usuario
    router.push(getDashboardByRole(authStore.user?.role ?? ''))
  } catch (error: any) {
    // User closed the popup — not an error, just bail silently
    if (error?.code === 'cancelled') return
    console.error('Error en login con Google:', error)
    errorMessage.value =
      error?.data?.message || error?.message || t('auth.login.validation.google_error')
  } finally {
    isLoading.value = false
  }
}

function loginWithMicrosoft() {
  const message = t('auth.login.validation.microsoft_not_available')
  errorMessage.value = message
  toast.info(message)
}
</script>

<style scoped>
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

/* Polifemo - Siempre visible en tablet y desktop */
.polifemo-avatar {
  right: -380px;
  bottom: -500px;
  transform: rotate(-15deg);
  width: 700px;
  height: 700px;
  min-width: 700px;
  min-height: 700px;
  z-index: 0;
}

/* Mobile styles */
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
  .bg-lilac h2 {
    font-size: 1.75rem !important; /* 28px */
    color: white !important;
  }

  .bg-lilac > div:first-child > p {
    font-size: 1rem !important; /* 16px */
    color: rgba(255, 255, 255, 0.9) !important;
  }

  /* Link "Olvidaste contraseña" blanco */
  .login-form a {
    color: white !important;
  }

  /* Separador "O continúa con" blanco */
  .bg-lilac span {
    color: rgba(255, 255, 255, 0.8) !important;
  }

  /* Texto "¿No tienes cuenta?" blanco */
  .bg-lilac p {
    color: rgba(255, 255, 255, 0.9) !important;
  }

  /* Botones demo en móvil - bordes y textos blancos */
  .lg\:hidden .text-navy-700\/60 {
    color: rgba(255, 255, 255, 0.7) !important;
  }

  .lg\:hidden .border-navy-700\/20 {
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
}

/* Estilos específicos del login - Labels más grandes y bold */
.login-form :deep(label) {
  font-size: 0.875rem !important; /* 14px base */
  font-weight: 700 !important; /* Bold */
  color: var(--color-navy-700) !important; /* Navy 700 */
}

@media (min-width: 640px) {
  .login-form :deep(label) {
    font-size: 1rem !important; /* 16px en tablet+ */
  }
}

/* MOBILE OVERRIDE: Labels y botones en < 640px (debe ir después de las reglas generales) */
@media (max-width: 639px) {
  /* Todos los labels del formulario blancos con máxima especificidad */
  .login-form :deep(label),
  .login-form label {
    color: white !important;
  }

  /* Todos los botones auth cambian a color purple en mobile */
  .auth-button,
  .social-btn {
    background-color: var(--color-purple) !important; /* purple */
  }

  .auth-button:hover,
  .social-btn:hover {
    background-color: #9357e5 !important; /* purple-dark */
  }

  .auth-button:active,
  .social-btn:active {
    background-color: #7a3fcc !important; /* purple-darker */
  }

  .auth-button:focus,
  .social-btn:focus {
    --tw-ring-color: rgba(172, 116, 253, 0.3) !important; /* purple/30 */
  }
}

/* Hero title - Responsive (exclusivo de login) */
.hero-title {
  font-size: 4rem; /* 64px base (tablet) */
  line-height: 1;
  letter-spacing: -0.02em;
}

@media (min-width: 1100px) {
  .hero-title {
    font-size: 6rem; /* 96px en desktop */
  }
}

@media (min-width: 1280px) {
  .hero-title {
    font-size: 8rem; /* 128px en desktop grande */
  }
}

/* Hero claim - Responsive (exclusivo de login) */
.hero-claim {
  font-size: 1.25rem; /* 20px base (tablet) */
  line-height: 1.6;
}

@media (min-width: 1100px) {
  .hero-claim {
    font-size: 1.5rem; /* 24px en desktop */
  }
}

@media (min-width: 1280px) {
  .hero-claim {
    font-size: 1.75rem; /* 28px en desktop grande */
  }
}
</style>
