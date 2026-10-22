<template>
  <div class="min-h-screen bg-navy-base relative overflow-hidden flex flex-col">
    <!-- Onda diagonal decorativa (del layout auth) -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        class="absolute w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-100 300 Q360 100 720 250 T1540 300 L1540 600 Q1080 400 720 550 T-100 600 Z"
          fill="#0a0a52"
          opacity="0.3"
        />
        <path
          d="M-100 200 Q360 0 720 150 T1540 200 L1540 500 Q1080 300 720 450 T-100 500 Z"
          fill="#151570"
          opacity="0.2"
        />
      </svg>
    </div>

    <!-- Contenido principal -->
    <div class="relative z-10 flex-1 flex flex-col">
      <!-- Header -->
      <div class="container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 text-center">
        <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4">
          {{ $t('auth.role_selection.header') }}
        </h1>
      </div>

      <!-- Cards de roles -->
      <div class="container mx-auto px-4 sm:px-6 flex justify-center">
        <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <!-- Card Docente (Amarillo) -->
          <div
            class="relative rounded-2xl sm:rounded-3xl md:rounded-[32px] p-5 sm:p-6 md:p-8 flex flex-col shadow-2xl hover:shadow-3xl transition-all duration-300"
            style="background-color: rgb(254, 195, 55)"
          >
            <!-- Ribbon/Bookmark con forma de etiqueta -->
            <div
              class="absolute left-5 sm:left-8 w-12 sm:w-14 bg-white shadow-lg"
              style="
                clip-path: polygon(
                  0px 0px,
                  100% 0px,
                  100% 90%,
                  100% 100%,
                  50% 75%,
                  0% 100%,
                  0px 90%
                );
                top: -12px;
                height: 3.8rem;
                border-radius: 5px;
              "
            ></div>

            <!-- Contenido -->
            <div class="relative z-10 flex flex-col h-full mt-4 sm:mt-6">
              <!-- Header -->
              <div class="mb-4 sm:mb-6">
                <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-navy-700 leading-tight">
                  {{ $t('auth.role_selection.teacher.title') }}
                </h2>
                <p
                  class="text-navy-700/80 text-right text-sm sm:text-base md:text-lg"
                  style="margin-top: -10px"
                >
                  {{ $t('auth.role_selection.teacher.subtitle') }}
                </p>
              </div>

              <!-- Features -->
              <div class="mb-4 sm:mb-6 flex-1 flex justify-center">
                <div class="flex flex-col space-y-1 sm:space-y-0">
                  <div class="flex items-center gap-2 sm:gap-3">
                    <svg
                      class="w-4 h-4 sm:w-5 sm:h-5 text-navy-700 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      ></path>
                    </svg>
                    <span class="text-sm sm:text-base md:text-lg text-navy-700">{{
                      $t('auth.role_selection.teacher.feature_missions')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2 sm:gap-3">
                    <svg
                      class="w-4 h-4 sm:w-5 sm:h-5 text-navy-700 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      ></path>
                    </svg>
                    <span class="text-sm sm:text-base md:text-lg text-navy-700">{{
                      $t('auth.role_selection.teacher.feature_dashboard')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2 sm:gap-3">
                    <svg
                      class="w-4 h-4 sm:w-5 sm:h-5 text-navy-700 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                      ></path>
                    </svg>
                    <span class="text-sm sm:text-base md:text-lg text-navy-700">{{
                      $t('auth.role_selection.teacher.feature_badges')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2 sm:gap-3">
                    <svg
                      class="w-4 h-4 sm:w-5 sm:h-5 text-navy-700 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      ></path>
                    </svg>
                    <span class="text-sm sm:text-base md:text-lg text-navy-700">{{
                      $t('auth.role_selection.teacher.feature_ai')
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Botón -->
              <button
                :disabled="isLoading"
                class="h-11 sm:h-12 px-4 sm:px-6 md:px-8 bg-navy-700 hover:bg-navy-dark active:bg-navy-darker text-white text-sm sm:text-base rounded-full transition-all duration-200 shadow-lg hover:shadow-xl active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed mb-3 sm:mb-4"
                @click="selectRole('teacher')"
              >
                {{
                  isLoading && selectedRole === 'teacher'
                    ? $t('auth.role_selection.teacher.button_loading')
                    : $t('auth.role_selection.teacher.button')
                }}
              </button>

              <!-- Ilustración oficial -->
              <div class="flex justify-end items-end">
                <img
                  src="/app/inicio_perfil/docente.svg"
                  alt="Docente"
                  class="h-24 sm:h-28 md:h-32 object-contain opacity-60"
                />
              </div>
            </div>
          </div>

          <!-- Card Estudiante (Verde/Mint) -->
          <div
            class="relative rounded-2xl sm:rounded-3xl md:rounded-[32px] p-5 sm:p-6 md:p-8 flex flex-col shadow-2xl hover:shadow-3xl transition-all duration-300"
            style="background-color: rgb(108, 243, 174)"
          >
            <!-- Ribbon/Bookmark con forma de etiqueta -->
            <div
              class="absolute left-5 sm:left-8 w-12 sm:w-14 bg-white shadow-lg"
              style="
                clip-path: polygon(
                  0px 0px,
                  100% 0px,
                  100% 90%,
                  100% 100%,
                  50% 75%,
                  0% 100%,
                  0px 90%
                );
                top: -12px;
                height: 3.8rem;
                border-radius: 5px;
              "
            ></div>

            <!-- Contenido -->
            <div class="relative z-10 flex flex-col h-full mt-4 sm:mt-6">
              <!-- Header -->
              <div class="mb-4 sm:mb-6">
                <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-navy-700 leading-tight">
                  {{ $t('auth.role_selection.student.title') }}
                </h2>
                <p
                  class="text-navy-700/80 text-right text-sm sm:text-base md:text-lg"
                  style="margin-top: -10px"
                >
                  {{ $t('auth.role_selection.student.subtitle') }}
                </p>
              </div>

              <!-- Features -->
              <div class="mb-4 sm:mb-6 flex-1 flex justify-center">
                <div class="flex flex-col space-y-1 sm:space-y-0">
                  <div class="flex items-center gap-2 sm:gap-3">
                    <svg
                      class="w-4 h-4 sm:w-5 sm:h-5 text-navy-700 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    <span class="text-sm sm:text-base md:text-lg text-navy-700">{{
                      $t('auth.role_selection.student.feature_missions')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2 sm:gap-3">
                    <svg
                      class="w-4 h-4 sm:w-5 sm:h-5 text-navy-700 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                    <span class="text-sm sm:text-base md:text-lg text-navy-700">{{
                      $t('auth.role_selection.student.feature_levels')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2 sm:gap-3">
                    <svg
                      class="w-4 h-4 sm:w-5 sm:h-5 text-navy-700 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      ></path>
                    </svg>
                    <span class="text-sm sm:text-base md:text-lg text-navy-700">{{
                      $t('auth.role_selection.student.feature_rankings')
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Botón -->
              <button
                :disabled="isLoading"
                class="h-11 sm:h-12 px-4 sm:px-6 md:px-8 bg-navy-700 hover:bg-navy-dark active:bg-navy-darker text-white text-sm sm:text-base rounded-full transition-all duration-200 shadow-lg hover:shadow-xl active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed mb-3 sm:mb-4"
                @click="selectRole('student')"
              >
                {{
                  isLoading && selectedRole === 'student'
                    ? $t('auth.role_selection.student.button_loading')
                    : $t('auth.role_selection.student.button')
                }}
              </button>

              <!-- Ilustración oficial -->
              <div class="flex justify-end items-end">
                <img
                  src="/app/inicio_perfil/estudiante.svg"
                  alt="Estudiante"
                  class="h-24 sm:h-28 md:h-32 object-contain opacity-60"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div class="max-w-4xl mx-auto">
          <!-- Mensaje informativo -->
          <p class="text-center text-white text-xs sm:text-sm mb-2 sm:mb-3">
            {{ $t('auth.role_selection.footer_message') }}
          </p>

          <!-- Links del footer -->
          <div class="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <!-- Volver -->
            <button
              class="flex items-center gap-1.5 sm:gap-2 text-white hover:opacity-80 transition-opacity"
              @click="goBack"
            >
              <img
                src="/app/inicio_perfil/ico_volver.svg"
                alt=""
                class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                style="filter: brightness(0) saturate(100%) invert(100%)"
              />
              <span>{{ $t('auth.role_selection.footer_back') }}</span>
            </button>
            <!-- Demo -->
            <a
              href="#"
              class="flex items-center gap-1.5 sm:gap-2 text-white hover:opacity-80 transition-opacity"
            >
              <img
                src="/app/inicio_perfil/ico_demo.svg"
                alt=""
                class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                style="filter: brightness(0) saturate(100%) invert(100%)"
              />
              <span>{{ $t('auth.role_selection.footer_demo') }}</span>
            </a>
            <!-- Inicio -->
            <NuxtLink
              to="/"
              class="flex items-center gap-1.5 sm:gap-2 text-white hover:opacity-80 transition-opacity"
            >
              <img
                src="/app/inicio_perfil/ico_inicio.svg"
                alt=""
                class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                style="filter: brightness(0) saturate(100%) invert(100%)"
              />
              <span>{{ $t('auth.role_selection.footer_home') }}</span>
            </NuxtLink>
            <!-- Ayuda -->
            <a
              href="#"
              class="flex items-center gap-1.5 sm:gap-2 text-white hover:opacity-80 transition-opacity"
            >
              <img
                src="/app/inicio_perfil/ico_ayuda.svg"
                alt=""
                class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                style="filter: brightness(0) saturate(100%) invert(100%)"
              />
              <span>{{ $t('auth.role_selection.footer_help') }}</span>
            </a>
          </div>

          <!-- Logo -->
          <div class="flex justify-center mt-3 sm:mt-4">
            <img src="/logo/itakai_color.svg" alt="ITAKAI" class="h-12 sm:h-14 md:h-16" />
          </div>
        </div>
      </div>
    </div>
    <!-- Llega desde «Usar esta plantilla» y elige estudiante: se avisa antes,
         porque con esa cuenta nunca podrá importarla -->
    <ConfirmModal
      v-model="studentWarningOpen"
      variant="warning"
      :title="t('auth.role_selection.template_warning.title')"
      :message="t('auth.role_selection.template_warning.message')"
      :confirm-text="t('auth.role_selection.template_warning.confirm')"
      :cancel-text="t('auth.role_selection.template_warning.cancel')"
      @confirm="confirmStudent"
    />
  </div>
</template>

<script setup lang="ts">
import { clearPendingTemplate, peekPendingTemplate } from '~/utils/pending-template'

const { t } = useI18n()

useHead({
  title: computed(() => t('auth.role_selection.page_title')),
  meta: [
    { name: 'description', content: computed(() => t('auth.role_selection.page_description')) },
  ],
})

definePageMeta({
  layout: false, // Sin layout porque ya tiene su propio diseño completo
  middleware: 'auth', // Solo usuarios autenticados
})

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const selectedRole = ref<'student' | 'teacher' | null>(null)
/** El aviso de que con una cuenta de estudiante no se pueden usar plantillas. */
const studentWarningOpen = ref(false)

async function selectRole(role: 'student' | 'teacher') {
  // Con una plantilla pendiente (ver utils/pending-template.ts), estudiante no
  // podrá usarla nunca: antes de elegirlo, se dice.
  if (role === 'student' && peekPendingTemplate()) {
    studentWarningOpen.value = true
    return
  }
  await completeRole(role)
}

/** Sigue como estudiante a sabiendas: la plantilla pendiente se descarta. */
async function confirmStudent() {
  studentWarningOpen.value = false
  clearPendingTemplate()
  await completeRole('student')
}

async function completeRole(role: 'student' | 'teacher') {
  try {
    isLoading.value = true
    selectedRole.value = role

    // Completar onboarding con el rol seleccionado
    await authStore.completeOnboarding(role)

    // Redirigir al dashboard del rol seleccionado. Al del profesorado, con una
    // plantilla pendiente, lo cambia por su ficha middleware/pending-template.global.ts.
    router.push(getDashboardByRole(role))
  } catch (error) {
    console.error('Error completing onboarding:', error)
    // TODO: Mostrar mensaje de error al usuario
  } finally {
    isLoading.value = false
    selectedRole.value = null
  }
}

function goBack() {
  router.back()
}
</script>

<style scoped>
/* Sombras más pronunciadas para hover */
.shadow-3xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
}
</style>
