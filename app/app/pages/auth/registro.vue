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
          v-html="$t('auth.signup.hero_title').replace('\n', '<br>')"
        ></h1>

        <!-- Claim -->
        <p class="hero-claim text-white/90 w-full leading-relaxed">
          {{ $t('auth.signup.hero_subtitle') }}
        </p>

        <!-- Características -->
        <div class="space-y-3 mt-6 md:mt-8">
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 md:w-6 md:h-6 text-mint flex-shrink-0 mt-1"
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
            <p class="text-sm sm:text-base lg:text-lg text-white/80">
              {{ $t('auth.signup.hero_feature_1') }}
            </p>
          </div>
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 md:w-6 md:h-6 text-orange-500 flex-shrink-0 mt-1"
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
            <p class="text-sm sm:text-base lg:text-lg text-white/80">
              {{ $t('auth.signup.hero_feature_2') }}
            </p>
          </div>
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 md:w-6 md:h-6 text-purple flex-shrink-0 mt-1"
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
            <p class="text-sm sm:text-base lg:text-lg text-white/80">
              {{ $t('auth.signup.hero_feature_3') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Card de Signup -->
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
          <!-- Header -->
          <div class="mb-4 sm:mb-6 text-center">
            <h2 class="text-2xl sm:text-3xl font-bold text-navy-700 mb-2">
              {{ $t('auth.signup.card_title') }}
            </h2>
            <p class="text-base sm:text-lg md:text-xl text-navy-700/80">
              {{ $t('auth.signup.step_indicator', { step }) }}
            </p>
          </div>

          <!-- Registro cerrado por el administrador de la instancia -->
          <div v-if="registrationClosed" class="text-center py-6">
            <p class="text-base sm:text-lg font-semibold text-navy-700">
              {{ $t('auth.signup.registration_closed') }}
            </p>
          </div>

          <template v-else>
          <!-- Formulario -->
          <form class="space-y-3 sm:space-y-4 signup-form" @submit.prevent="handleSubmit">
            <!-- PASO 1: Información personal -->
            <div v-if="step === 1" class="space-y-3 sm:space-y-4">
              <!-- Nombre completo -->
              <FormField
                id="name"
                v-model="name"
                type="text"
                :label="$t('auth.signup.name_label')"
                :placeholder="$t('auth.signup.name_placeholder')"
                :required="true"
              />

              <!-- Email -->
              <FormField
                id="email"
                v-model="email"
                type="email"
                :label="$t('auth.signup.email_label')"
                :placeholder="$t('auth.signup.email_placeholder')"
                :required="true"
              />

              <!-- Error Message -->
              <div v-if="errorMessage" class="text-red-600 text-sm font-medium">
                {{ errorMessage }}
              </div>

              <!-- Botón Siguiente -->
              <Button type="submit" variant="social" size="md" full-width class="auth-button">
                {{ $t('auth.signup.next_button') }}
              </Button>
            </div>

            <!-- PASO 2: Contraseña y rol -->
            <div v-if="step === 2" class="space-y-3 sm:space-y-4">
              <!-- Password -->
              <FormField
                id="password"
                v-model="password"
                type="password"
                :label="$t('auth.signup.password_label')"
                :placeholder="$t('auth.signup.password_placeholder')"
                :required="true"
                :hint="$t('auth.signup.password_hint')"
              />

              <!-- Confirm Password -->
              <FormField
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                :label="$t('auth.signup.confirm_password_label')"
                :placeholder="$t('auth.signup.confirm_password_placeholder')"
                :required="true"
                :error-message="passwordMatchError"
              />

              <Checkbox
                id="accept-terms"
                v-model="acceptTerms"
                :label="$t('auth.signup.accept_terms')"
              />

              <!-- Error Message -->
              <div v-if="errorMessage" class="text-red-600 text-sm font-medium">
                {{ errorMessage }}
              </div>

              <!-- Botones: Atrás y Crear Cuenta -->
              <div class="flex gap-2 sm:gap-3">
                <Button variant="outline" size="md" class="flex-1" @click="step = 1">
                  {{ $t('auth.signup.back_button') }}
                </Button>
                <Button
                  type="submit"
                  variant="social"
                  size="md"
                  class="flex-1 auth-button"
                  :disabled="isLoading"
                  :loading="isLoading"
                >
                  {{
                    isLoading ? $t('auth.signup.submit_loading') : $t('auth.signup.submit_button')
                  }}
                </Button>
              </div>
            </div>
          </form>

          <!-- Separador "O continúa con" -->
          <div class="my-4 sm:my-6 text-center">
            <span class="text-xs sm:text-sm text-navy-700/70 font-medium">{{
              $t('auth.signup.social_separator')
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
              @click="signupWithGoogle"
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
              <span class="text-sm sm:text-base">{{ $t('auth.signup.social_google') }}</span>
            </Button>
          </div>

          </template>

          <!-- Login Link -->
          <div class="mt-4 sm:mt-6 text-center">
            <p class="text-xs sm:text-sm text-navy-700/80 mb-2 sm:mb-3">
              {{ $t('auth.signup.has_account') }}
            </p>
            <NuxtLink to="/auth/login" class="inline-block">
              <Button variant="primary" size="md">
                {{ $t('auth.signup.login_link') }}
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
  title: computed(() => t('auth.signup.page_title')),
  meta: [{ name: 'description', content: computed(() => t('auth.signup.page_description')) }],
})

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Registro abierto/cerrado según la config de la instancia (panel de admin).
const instanceConfig = useInstanceConfig()
const registrationClosed = computed(() => instanceConfig.value?.registrationOpen === false)

const step = ref(1)
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptTerms = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

// Validación de contraseñas en tiempo real
const passwordMatchError = computed(() => {
  if (confirmPassword.value && password.value !== confirmPassword.value) {
    return t('auth.signup.validation.passwords_dont_match')
  }
  return ''
})

function handleSubmit() {
  if (step.value === 1) {
    handleStep1()
  } else if (step.value === 2) {
    handleSignup()
  }
}

function handleStep1() {
  errorMessage.value = ''

  // Validaciones del paso 1
  if (!name.value) {
    errorMessage.value = t('auth.signup.validation.name_required')
    return
  }

  if (!email.value) {
    errorMessage.value = t('auth.signup.validation.email_required')
    return
  }

  // Validación básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    errorMessage.value = t('auth.signup.validation.email_invalid')
    return
  }

  // Avanzar al paso 2
  step.value = 2
}

async function handleSignup() {
  try {
    errorMessage.value = ''

    // Validaciones del paso 2
    if (!password.value || !confirmPassword.value) {
      errorMessage.value = t('auth.signup.validation.all_fields_required')
      return
    }

    if (password.value !== confirmPassword.value) {
      errorMessage.value = t('auth.signup.validation.passwords_dont_match')
      return
    }

    if (password.value.length < 8) {
      errorMessage.value = t('auth.signup.validation.password_min_length')
      return
    }

    if (!acceptTerms.value) {
      errorMessage.value = t('auth.signup.validation.accept_terms_required')
      return
    }

    isLoading.value = true

    await authStore.signup({
      name: name.value,
      email: email.value,
      password: password.value,
      acceptTerms: acceptTerms.value,
      // role se selecciona en onboarding
    })

    // Redirigir a onboarding para seleccionar rol
    router.push('/onboarding/seleccion-rol')
  } catch (error) {
    console.error('Error en signup:', error)
    errorMessage.value = t('auth.signup.validation.signup_error')
  } finally {
    isLoading.value = false
  }
}

async function signupWithGoogle() {
  const { signInWithPopup } = useGoogleAuth()

  try {
    errorMessage.value = ''
    isLoading.value = true

    await signInWithPopup()

    if (!authStore.user?.isOnboarded) {
      router.push('/onboarding/seleccion-rol')
      return
    }

    router.push(getDashboardByRole(authStore.user?.role ?? ''))
  } catch (error: any) {
    console.error('Error en signup con Google:', error)
    errorMessage.value =
      error?.data?.message || error?.message || t('auth.signup.validation.google_error')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Estilos específicos del signup - Labels más grandes y bold */
.signup-form :deep(label) {
  font-size: 0.875rem !important; /* 14px base */
  font-weight: 700 !important; /* Bold */
  color: #23245d !important; /* Navy 700 */
}

@media (min-width: 640px) {
  .signup-form :deep(label) {
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
    font-size: 6rem; /* Mantener 96px en signup (más pequeño que login) */
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
  .bg-lilac h2 {
    font-size: 1.75rem !important; /* 28px */
    color: white !important;
  }

  .bg-lilac > div:first-child > p {
    font-size: 1rem !important; /* 16px */
    color: rgba(255, 255, 255, 0.9) !important;
  }

  /* Link "Ya tienes cuenta" blanco */
  .signup-form a {
    color: white !important;
  }

  /* Separador "O continúa con" blanco */
  .bg-lilac span {
    color: rgba(255, 255, 255, 0.8) !important;
  }

  /* Texto "¿Ya tienes cuenta?" blanco */
  .bg-lilac p {
    color: rgba(255, 255, 255, 0.9) !important;
  }
}

/* MOBILE OVERRIDE: Labels y botones en < 640px (debe ir después de las reglas generales) */
@media (max-width: 639px) {
  /* Todos los labels del formulario blancos con máxima especificidad */
  .signup-form :deep(label),
  .signup-form label {
    color: white !important;
  }

  /* Todos los botones auth cambian a color purple en mobile */
  .auth-button,
  .social-btn {
    background-color: #ac74fd !important; /* purple */
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
</style>
