<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navbar Estático (pegado al contenido) - DOBLE DE GRANDE -->
    <header ref="staticNavbar" class="absolute top-0 left-0 right-0 z-40">
      <!-- Navbar Content con Background -->
      <div class="relative pt-5">
        <!-- Background Layer con Opacidad (solo para el navbar, no el SVG) -->
        <div
          class="absolute inset-0 backdrop-blur-md"
          style="background: var(--color-sky); opacity: 0.5"
        ></div>

        <!-- Contenido del Navbar -->
        <div class="mx-auto px-4 md:px-6 lg:px-8 relative z-10" style="max-width: 1050px">
          <div class="flex items-center justify-between">
            <!-- Logo DOBLE DE GRANDE -->
            <NuxtLink to="/" class="flex items-center gap-3">
              <img
                src="/logo/itakai_ico_1tinta.svg"
                alt="ITAKAI"
                class="h-20 md:h-24 transition-all duration-300 brightness-0 invert"
              />
            </NuxtLink>

            <!-- Desktop Navigation + CTA Buttons -->
            <div class="hidden lg:flex items-center gap-6">
              <!-- Navigation Links -->
              <nav class="flex items-center gap-6">
                <NuxtLink
                  to="/#features"
                  class="text-base font-medium transition-colors text-white hover:text-navy-700"
                >
                  {{ $t('common.nav.features') }}
                </NuxtLink>
                <a
                  href="https://gamifp.es/blog/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-base font-medium transition-colors text-white hover:text-navy-700"
                >
                  {{ $t('common.nav.blog') }}
                </a>
              </nav>

              <!-- CTA Buttons + Language -->
              <div class="flex items-center gap-3">
                <AccessibilityMenu variant="light" />
                <LanguageSwitcher variant="light" />
                <Button
                  variant="outline"
                  size="md"
                  class="!text-white !border-white hover:!bg-white/10"
                  @click="router.push('/auth/registro')"
                >
                  {{ $t('common.actions.create_new_account') }}
                </Button>
                <Button variant="primary" size="md" @click="router.push('/auth/login')">
                  {{ $t('common.actions.enter') }}
                </Button>
              </div>
            </div>

            <!-- Mobile Hamburger Button -->
            <button
              class="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              :aria-label="$t('common.actions.open_menu')"
              @click="isMobileMenuOpen = true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-8 h-8 text-white"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- SVG Decorativo pegado al navbar (SIN fondo azul) -->
      <div class="w-full">
        <img
          src="/app/landing/top_bar.svg"
          alt=""
          class="w-full block"
          style="display: block; width: 100%"
        />
      </div>
    </header>

    <!-- Navbar Fijo (aparece al hacer scroll) -->
    <Transition name="slide-down">
      <header
        v-if="showFixedNavbar"
        class="fixed top-0 left-0 right-0 z-50 shadow-lg py-5"
        style="background: var(--color-sky)"
      >
        <div class="mx-auto px-4 md:px-6 lg:px-8" style="max-width: 1050px">
          <div class="flex items-center justify-between">
            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center gap-3">
              <img
                src="/logo/itakai_ico_1tinta.svg"
                alt="ITAKAI"
                class="h-12 md:h-14 transition-all duration-300 brightness-0 invert"
              />
            </NuxtLink>

            <!-- Desktop Navigation + CTA Buttons -->
            <div class="hidden lg:flex items-center gap-6">
              <!-- Navigation Links -->
              <nav class="flex items-center gap-6">
                <NuxtLink
                  to="/#features"
                  class="text-base font-medium transition-colors text-white hover:text-navy-700"
                >
                  {{ $t('common.nav.features') }}
                </NuxtLink>
                <a
                  href="https://gamifp.es/blog/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-base font-medium transition-colors text-white hover:text-navy-700"
                >
                  {{ $t('common.nav.blog') }}
                </a>
              </nav>

              <!-- CTA Buttons + Language -->
              <div class="flex items-center gap-3">
                <AccessibilityMenu variant="light" />
                <LanguageSwitcher variant="light" />
                <Button
                  variant="outline"
                  size="md"
                  class="!text-white !border-white hover:!bg-white/10"
                  @click="router.push('/auth/registro')"
                >
                  {{ $t('common.actions.create_new_account') }}
                </Button>
                <Button variant="primary" size="md" @click="router.push('/auth/login')">
                  {{ $t('common.actions.enter') }}
                </Button>
              </div>
            </div>

            <!-- Mobile Hamburger Button -->
            <button
              class="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              :aria-label="$t('common.actions.open_menu')"
              @click="isMobileMenuOpen = true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-7 h-7 text-white"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>
    </Transition>

    <!-- Mobile Menu -->
    <LandingMobileMenu :is-open="isMobileMenuOpen" @close="isMobileMenuOpen = false" />

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="text-white relative pb-32 sm:pb-36 md:pb-40" style="background-color: #004">
      <!-- Wave Divider Top -->
      <div class="footer-wave-divider">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 2000 211.84"
          preserveAspectRatio="none"
        >
          <path
            fill="#004"
            d="M2000,181.2c-45.27,8.01-110.81,14.02-205.73,14.73C1483.94,198.23,1286.11-1.91,1026.44.01c-259.67,1.93-300.17,91.73-534.51,93.47C267.65,95.15,256.02,45.36,0,42.98v168.86h2000v-30.64Z"
          />
        </svg>
      </div>

      <div class="mx-auto px-4 md:px-6 lg:px-8 py-12" style="max-width: 1050px">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <!-- Logo -->
          <div class="flex justify-center md:justify-start">
            <img
              src="/logo/itakai_1tinta.svg"
              alt="ITAKAI"
              class="h-32 sm:h-40 md:h-48 brightness-0 invert opacity-60"
            />
          </div>

          <!-- Plataforma -->
          <div class="text-center md:text-left">
            <h4 class="text-base font-semibold mb-4 text-white">
              {{ $t('common.footer.platform') }}
            </h4>
            <ul class="space-y-2">
              <li>
                <NuxtLink to="/auth/login" class="text-sm text-gray-300">
                  {{ $t('common.footer.system_access') }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/auth/login" class="text-sm text-gray-300">
                  {{ $t('common.footer.teacher_panel') }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/auth/login" class="text-sm text-gray-300">
                  {{ $t('common.footer.student_panel') }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Soporte -->
          <div class="text-center md:text-left">
            <h4 class="text-base font-semibold mb-4 text-white">
              {{ $t('common.footer.support') }}
            </h4>
            <ul class="space-y-2">
              <li>
                <NuxtLink to="/docs" class="text-sm text-gray-300">
                  {{ $t('common.footer.help_center') }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/docs" class="text-sm text-gray-300">
                  {{ $t('common.footer.documentation') }}
                </NuxtLink>
              </li>
              <li>
                <a
                  href="https://gamifp.es/contacto/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-gray-300"
                >
                  {{ $t('common.footer.contact') }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div class="text-center md:text-left">
            <h4 class="text-base font-semibold mb-4 text-white">{{ $t('common.footer.legal') }}</h4>
            <ul class="space-y-2">
              <li>
                <NuxtLink to="/terms" class="text-sm text-gray-300">
                  {{ $t('common.footer.terms_of_service') }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/privacy-policy" class="text-sm text-gray-300">
                  {{ $t('common.footer.privacy_policy') }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/cookies" class="text-sm text-gray-300">
                  {{ $t('common.footer.cookies') }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/licenses" class="text-sm text-gray-300">
                  {{ $t('common.footer.licenses') }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="border-t border-white/10 mt-8 pt-6">
          <p class="text-sm text-center text-gray-400">
            {{ $t('common.landing.footer_copyright_alt', { year: new Date().getFullYear() }) }}
          </p>
        </div>
      </div>

      <!-- Avatars -->
      <div
        class="absolute bottom-0 right-4 sm:right-8 lg:right-[calc((100%-1050px)/2)] pointer-events-none"
      >
        <img
          src="/app/landing/avatars_base.png"
          alt=""
          class="h-28 sm:h-36 md:h-40 lg:h-48 object-contain object-bottom"
        />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Mobile menu state
const isMobileMenuOpen = ref(false)

// Fixed navbar state
const staticNavbar = ref<HTMLElement | null>(null)
const showFixedNavbar = ref(false)

// Scroll handler
const handleScroll = () => {
  if (staticNavbar.value) {
    const navbarBottom = staticNavbar.value.getBoundingClientRect().bottom
    showFixedNavbar.value = navbarBottom < 0
  }
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll() // Check initial state
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* Slide down animation for fixed navbar */
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    transform 300ms ease,
    opacity 300ms ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Footer wave divider */
.footer-wave-divider {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  line-height: 0;
  transform: translateY(-99%);
}

.footer-wave-divider svg {
  display: block;
  width: calc(100% + 1.3px);
  height: 60px;
}

@media (min-width: 768px) {
  .footer-wave-divider svg {
    height: 100px;
  }
}

@media (min-width: 1024px) {
  .footer-wave-divider svg {
    height: 140px;
  }
}

@media (min-width: 1280px) {
  .footer-wave-divider svg {
    height: 180px;
  }
}
</style>
