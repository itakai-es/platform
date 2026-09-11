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
                <NuxtLink
                  to="/ayuda"
                  class="text-base font-medium transition-colors text-white hover:text-navy-700 whitespace-nowrap"
                >
                  {{ $t('common.nav.help') }}
                </NuxtLink>
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

      <!-- SVG decorativo pegado a la barra. Es translúcido y toma el color de
           la foto de la portada que tiene detrás. -->
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
                <NuxtLink
                  to="/ayuda"
                  class="text-base font-medium transition-colors text-white hover:text-navy-700 whitespace-nowrap"
                >
                  {{ $t('common.nav.help') }}
                </NuxtLink>
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
    <LandingFooter />
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
</style>
