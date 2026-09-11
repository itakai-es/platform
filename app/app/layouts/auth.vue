<template>
  <div class="min-h-screen bg-navy-base relative overflow-hidden">
    <!-- Onda diagonal decorativa -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        class="absolute w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Onda diagonal principal -->
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

    <!-- Idioma y accesibilidad: los dos ajustes que hacen falta ANTES de poder
         entrar (quien no lee la pantalla tampoco puede iniciar sesión). -->
    <div class="absolute top-4 right-4 z-20 flex items-center gap-1">
      <AccessibilityMenu variant="light" />
      <LanguageSwitcher variant="light" />
    </div>

    <!-- Contenido de la página -->
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Layout de autenticación con fondo navy y onda diagonal
// Usado en: login, signup, forgot-password, onboarding
</script>
