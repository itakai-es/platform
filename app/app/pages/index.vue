<template>
  <div class="landing-page">
    <!-- HERO SECTION -->
    <section class="hero-section relative" style="margin-top: 0; position: relative; z-index: 1">
      <!-- Background with Overlay -->
      <div class="hero-background">
        <div class="hero-overlay"></div>
      </div>

      <!-- Hero Content -->
      <div class="hero-content mx-auto px-4 relative z-10">
        <div
          class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
          style="margin-top: 200px"
        >
          <!-- Logo ITAKAI - Columna izquierda -->
          <div class="lg:col-span-4 flex justify-center">
            <img src="/logo/itakai_color.svg" alt="ITAKAI" class="w-80 max-w-xs lg:max-w-full" />
          </div>

          <!-- Texto - Columna derecha -->
          <div class="lg:col-span-8 text-center lg:text-left">
            <!-- Title -->
            <h1
              class="hero-title text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-0"
            >
              {{ $t('common.landing.hero_title') }}
            </h1>

            <!-- Subtitle -->
            <p class="hero-subtitle text-base md:text-lg lg:text-xl text-white/90 mt-0 mb-10">
              {{ $t('common.landing.hero_subtitle') }}
            </p>

            <!-- CTA Button -->
            <div class="flex justify-center lg:justify-start">
              <Button
                variant="outline"
                size="lg"
                class="!text-white !border-white hover:!bg-white/10 gap-2"
                @click="router.push('/auth/registro')"
              >
                <span>{{ $t('common.landing.cta_start') }}</span>
                <img src="/app/landing/comenzar.svg" alt="" class="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Wave Divider -->
      <div class="wave-divider">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 2000 117.99"
          preserveAspectRatio="none"
        >
          <path
            fill="#fff"
            d="M2000,42.43c-52.78-6.22-118.1-9.19-203.58-5-149.05,7.32-298.04,50.59-509.14,59.36C1045.53,106.85,975.81-11.55,754.63.92s-263.31,65.63-440.36,72.99c-87.7,3.65-211.57,2.9-314.26,1.21v42.86h2000V42.43Z"
          />
        </svg>
      </div>
    </section>

    <!-- FEATURES SECTION: ¿Qué puedes hacer con ITAKAI? -->
    <section id="features" class="features-section bg-white relative">
      <div
        class="mx-auto px-4 pt-16 md:pt-20 lg:pt-28 pb-24 md:pb-32 lg:pb-40 relative"
        style="max-width: calc(1280px - 400px); z-index: 20"
      >
        <!-- Section Header -->
        <div class="text-center mb-12 md:mb-16">
          <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-red mb-4 md:mb-6">
            {{ $t('common.landing.features_title') }}
          </h2>
          <p class="text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            {{ $t('common.landing.features_subtitle') }}
          </p>
        </div>

        <!-- Features Grid (Sin Cards) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          <!-- Gamificación Completa -->
          <div class="flex flex-col items-center text-center">
            <img
              src="/app/landing/iconos/gamisicacion.svg"
              alt=""
              class="w-16 h-16 md:w-20 md:h-20 mb-4"
            />
            <h3 class="text-xl md:text-2xl font-bold text-navy-700 mb-3 whitespace-nowrap">
              {{ $t('common.landing.feature_gamification_title') }}
            </h3>
            <p class="text-base text-gray-600">
              {{ $t('common.landing.feature_gamification_desc') }}
            </p>
          </div>

          <!-- Narrativa Inmersiva -->
          <div class="flex flex-col items-center text-center">
            <img
              src="/app/landing/iconos/narrativa.svg"
              alt=""
              class="w-16 h-16 md:w-20 md:h-20 mb-4"
            />
            <h3 class="text-xl md:text-2xl font-bold text-navy-700 mb-3 whitespace-nowrap">
              {{ $t('common.landing.feature_narrative_title') }}
            </h3>
            <p class="text-base text-gray-600">
              {{ $t('common.landing.feature_narrative_desc') }}
            </p>
          </div>

          <!-- Trabajo en Equipo -->
          <div class="flex flex-col items-center text-center">
            <img
              src="/app/landing/iconos/familia.svg"
              alt=""
              class="w-16 h-16 md:w-20 md:h-20 mb-4"
            />
            <h3 class="text-xl md:text-2xl font-bold text-navy-700 mb-3 whitespace-nowrap">
              {{ $t('common.landing.feature_teamwork_title') }}
            </h3>
            <p class="text-base text-gray-600">
              {{ $t('common.landing.feature_teamwork_desc') }}
            </p>
          </div>

          <!-- Análisis Inteligente -->
          <div class="flex flex-col items-center text-center">
            <img
              src="/app/landing/iconos/analisis.svg"
              alt=""
              class="w-16 h-16 md:w-20 md:h-20 mb-4"
            />
            <h3 class="text-xl md:text-2xl font-bold text-navy-700 mb-3 whitespace-nowrap">
              {{ $t('common.landing.feature_analytics_title') }}
            </h3>
            <p class="text-base text-gray-600">
              {{ $t('common.landing.feature_analytics_desc') }}
            </p>
          </div>

          <!-- Acceso Universal -->
          <div class="flex flex-col items-center text-center">
            <img
              src="/app/landing/iconos/acceso.svg"
              alt=""
              class="w-16 h-16 md:w-20 md:h-20 mb-4"
            />
            <h3 class="text-xl md:text-2xl font-bold text-navy-700 mb-3 whitespace-nowrap">
              {{ $t('common.landing.feature_access_title') }}
            </h3>
            <p class="text-base text-gray-600">
              {{ $t('common.landing.feature_access_desc') }}
            </p>
          </div>

          <!-- IA Educativa -->
          <div class="flex flex-col items-center text-center">
            <img src="/app/landing/iconos/ia.svg" alt="" class="w-16 h-16 md:w-20 md:h-20 mb-4" />
            <h3 class="text-xl md:text-2xl font-bold text-navy-700 mb-3 whitespace-nowrap">
              {{ $t('common.landing.feature_ai_title') }}
            </h3>
            <p class="text-base text-gray-600">
              {{ $t('common.landing.feature_ai_desc') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- PROFILES SECTION: Elige tu perfil -->
    <section
      class="profiles-section relative pt-16 md:pt-20 lg:pt-24 pb-40 sm:pb-52 md:pb-64 lg:pb-80 overflow-visible"
      style="background-color: #000044"
    >
      <!-- Wave Divider Top (pegada al top) -->
      <div class="absolute top-0 left-0 w-full" style="transform: translateY(-99%)">
        <img src="/app/landing/sep_b1.svg" alt="" class="w-full h-auto block" />
      </div>

      <!-- Ondas decorativas de fondo -->
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
            fill="#000066"
            opacity="0.4"
          />
          <path
            d="M-100 200 Q360 0 720 150 T1540 200 L1540 500 Q1080 300 720 450 T-100 500 Z"
            fill="#000088"
            opacity="0.3"
          />
        </svg>
      </div>

      <div class="mx-auto px-4 relative z-10" style="max-width: calc(1280px - 200px)">
        <!-- Section Header -->
        <div class="text-center mb-8 md:mb-12">
          <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            {{ $t('common.landing.profiles_title') }}
          </h2>
        </div>

        <!-- Profile Cards (centradas) -->
        <div class="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <!-- Card Docente (Amarillo) -->
          <div
            class="relative rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col shadow-2xl cursor-pointer"
            style="background-color: rgb(254, 195, 55)"
            @click="router.push('/auth/registro?role=teacher')"
          >
            <!-- Ribbon -->
            <div
              class="absolute left-5 md:left-6 w-10 md:w-12 bg-white shadow-lg"
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
                top: -10px;
                height: 3rem;
                border-radius: 4px;
              "
            ></div>

            <div class="relative z-10 flex flex-col h-full mt-4">
              <div class="mb-3 md:mb-4">
                <h3 class="text-2xl md:text-3xl font-bold text-navy-700">
                  {{ $t('auth.role_selection.teacher.title') }}
                </h3>
                <p class="text-navy-700/80 text-right text-xs md:text-sm" style="margin-top: -4px">
                  {{ $t('auth.role_selection.teacher.subtitle') }}
                </p>
              </div>

              <div class="my-6 flex-1 flex justify-center">
                <div class="flex flex-col space-y-2">
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-navy-700 flex-shrink-0"
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
                    <span class="text-base font-semibold text-navy-700">{{
                      $t('auth.role_selection.teacher.feature_missions')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-navy-700 flex-shrink-0"
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
                    <span class="text-base font-semibold text-navy-700">{{
                      $t('auth.role_selection.teacher.feature_dashboard')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-navy-700 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      ></path>
                    </svg>
                    <span class="text-base font-semibold text-navy-700">{{
                      $t('auth.role_selection.teacher.feature_badges')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-navy-700 flex-shrink-0"
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
                    <span class="text-base font-semibold text-navy-700">{{
                      $t('auth.role_selection.teacher.feature_ai')
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Botón -->
              <button
                class="w-full h-11 px-6 bg-navy-700 hover:bg-navy-800 text-white text-sm font-medium rounded-full transition-all duration-200 shadow-lg hover:shadow-xl mt-4 mb-6"
              >
                {{ $t('auth.role_selection.teacher.button') }}
              </button>

              <div class="flex justify-end items-end">
                <img
                  src="/app/inicio_perfil/docente.svg"
                  alt="Docente"
                  class="h-20 md:h-24 object-contain opacity-60"
                />
              </div>
            </div>
          </div>

          <!-- Card Estudiante (Verde) -->
          <div
            class="relative rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col shadow-2xl cursor-pointer"
            style="background-color: rgb(108, 243, 174)"
            @click="router.push('/auth/registro?role=student')"
          >
            <!-- Ribbon -->
            <div
              class="absolute left-5 md:left-6 w-10 md:w-12 bg-white shadow-lg"
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
                top: -10px;
                height: 3rem;
                border-radius: 4px;
              "
            ></div>

            <div class="relative z-10 flex flex-col h-full mt-4">
              <div class="mb-3 md:mb-4">
                <h3 class="text-2xl md:text-3xl font-bold text-navy-700">
                  {{ $t('auth.role_selection.student.title') }}
                </h3>
                <p class="text-navy-700/80 text-right text-xs md:text-sm" style="margin-top: -4px">
                  {{ $t('auth.role_selection.student.subtitle') }}
                </p>
              </div>

              <div class="my-6 flex-1 flex justify-center">
                <div class="flex flex-col space-y-2">
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-navy-700 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    <span class="text-base font-semibold text-navy-700">{{
                      $t('auth.role_selection.student.feature_missions')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-navy-700 flex-shrink-0"
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
                    <span class="text-base font-semibold text-navy-700">{{
                      $t('auth.role_selection.student.feature_levels')
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-navy-700 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      ></path>
                    </svg>
                    <span class="text-base font-semibold text-navy-700">{{
                      $t('auth.role_selection.student.feature_rankings')
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Botón -->
              <button
                class="w-full h-11 px-6 bg-navy-700 hover:bg-navy-800 text-white text-sm font-medium rounded-full transition-all duration-200 shadow-lg hover:shadow-xl mt-4 mb-6"
              >
                {{ $t('auth.role_selection.student.button') }}
              </button>

              <div class="flex justify-end items-end">
                <img
                  src="/app/inicio_perfil/estudiante.svg"
                  alt="Estudiante"
                  class="h-20 md:h-24 object-contain opacity-60"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Wave Divider Bottom -->
      <div class="wave-divider-bottom">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 2000 117.99"
          preserveAspectRatio="none"
        >
          <path
            fill="#fff"
            d="M0,75.56c52.78,6.22,118.1,9.19,203.58,5,149.05-7.32,298.04-50.59,509.14-59.36C954.47,11.14,1024.19,129.54,1245.37,117.07s263.31-65.63,440.36-72.99c87.7-3.65,211.57-2.9,314.26-1.21V0H0v75.56Z"
          />
        </svg>
      </div>

      <!-- Polyfem Character -->
      <div
        class="absolute bottom-0 left-0 pointer-events-none hidden sm:block"
        style="z-index: 0; transform: translateY(40%)"
      >
        <img
          :src="'/app/landing/polyfem.png'"
          alt="Polyfem"
          class="h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[35rem] object-contain"
          style="transform: rotate(-15deg)"
        />
      </div>
    </section>

    <!-- ABOUT/STATS SECTION: ¿Qué es ITAKAI? -->
    <section class="about-section relative py-16 md:py-20 lg:py-28 bg-white">
      <!-- Wave Divider Top (pegada al top) -->
      <div class="absolute top-0 left-0 w-full" style="transform: translateY(-99%)">
        <img src="/app/landing/sep_w2.png" alt="" class="w-full h-auto block" />
      </div>

      <!-- Background Wave -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <img
          src="/app/landing/backg_c.png"
          alt=""
          class="w-full h-auto object-contain object-center"
        />
      </div>

      <div class="mx-auto px-4 relative z-10" style="max-width: calc(1280px - 200px)">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <!-- Stats Column -->
          <div class="text-center lg:text-left">
            <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-red mb-8">
              {{ $t('common.landing.about_title') }}
            </h2>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p
              class="text-base md:text-lg text-gray-600 mb-4 leading-relaxed"
              v-html="$t('common.landing.about_description_1')"
            ></p>
            <p class="text-base md:text-lg text-gray-600 mb-10 leading-relaxed">
              {{ $t('common.landing.about_description_2') }}
            </p>

            <!-- Stats -->
            <div class="flex flex-col gap-4 items-center lg:items-start">
              <div class="stat-item">
                <span class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-red"
                  >25K+</span
                >
                <p class="text-lg text-red font-medium">{{ $t('common.landing.stat_students') }}</p>
              </div>
              <div class="stat-item">
                <span class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-red"
                  >4K+</span
                >
                <p class="text-lg text-red font-medium">{{ $t('common.landing.stat_teachers') }}</p>
              </div>
              <div class="stat-item">
                <span class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-red"
                  >250+</span
                >
                <p class="text-lg text-red font-medium">{{ $t('common.landing.stat_centers') }}</p>
              </div>
            </div>
          </div>

          <!-- Image: Girl with tablet -->
          <div class="relative flex justify-center">
            <img
              src="/app/landing/girl_tablet_01.png"
              alt="Niña usando ITAKAI en tablet"
              class="max-w-full max-h-[350px] sm:max-h-[500px] md:max-h-[600px] lg:max-h-[700px] xl:max-h-[900px] object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- PARTNERS SECTION: ¿Quienes somos? -->
    <section
      class="partners-section pt-16 md:pt-20 lg:pt-24 pb-32 md:pb-40 lg:pb-48 xl:pb-56 bg-white"
    >
      <div class="mx-auto px-4" style="max-width: calc(1280px - 200px)">
        <!-- Section Header -->
        <div class="text-center mb-12 md:mb-16">
          <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-red mb-8">
            {{ $t('common.landing.partners_title') }}
          </h2>
        </div>

        <!-- Institutions Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-16">
          <!-- CIPFP Ausiàs March -->
          <a
            href="https://www.ausiasmarch.net/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex flex-col items-center text-center hover:opacity-80 transition-opacity"
          >
            <div class="w-56 h-36 flex items-center justify-center">
              <img
                src="/app/landing/logos/logo_ausias.jpg"
                alt="CIPFP Ausiàs March"
                class="max-w-full max-h-full object-contain"
              />
            </div>
            <h3 class="text-xl md:text-2xl font-bold" style="color: var(--color-primary)">
              CIPFP Ausiàs March
            </h3>
            <p class="text-base" style="color: var(--color-primary)">València</p>
          </a>

          <!-- IES l'Estació -->
          <a
            href="https://portal.edu.gva.es/iestacio/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex flex-col items-center text-center hover:opacity-80 transition-opacity"
          >
            <div class="w-56 h-36 flex items-center justify-center">
              <img
                src="/app/landing/logos/logo_estacio.jpg"
                alt="IES l'Estació"
                class="max-w-full max-h-full object-contain"
              />
            </div>
            <h3 class="text-xl md:text-2xl font-bold" style="color: var(--color-primary)">
              IES l'Estació
            </h3>
            <p class="text-base" style="color: var(--color-primary)">Ontinyent</p>
          </a>

          <!-- CIPFP Alan Turing -->
          <a
            href="https://fpalanturing.es/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex flex-col items-center text-center hover:opacity-80 transition-opacity"
          >
            <div class="w-56 h-36 flex items-center justify-center">
              <img
                src="/app/landing/logos/logo_alan.jpg"
                alt="CIPFP Alan Turing"
                class="max-w-full max-h-full object-contain"
              />
            </div>
            <h3 class="text-xl md:text-2xl font-bold" style="color: var(--color-primary)">
              CIPFP Alan Turing
            </h3>
            <p class="text-base" style="color: var(--color-primary)">Málaga</p>
          </a>
        </div>

        <!-- Separator Line -->
        <div class="border-t border-gray-300 mb-12"></div>

        <!-- Institutional Logos -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <a
            href="https://www.educacionfpydeportes.gob.es/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <div class="w-56 h-36 flex items-center justify-center">
              <img
                src="/app/landing/logos/logo_gobierno.jpg"
                alt="Gobierno de España - Ministerio de Educación, Formación Profesional y Deportes"
                class="max-w-full max-h-full object-contain"
              />
            </div>
          </a>
          <a
            href="https://next-generation-eu.europa.eu/index_es"
            target="_blank"
            rel="noopener noreferrer"
            class="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <div class="w-56 h-36 flex items-center justify-center">
              <img
                src="/app/landing/logos/logo_eu.jpg"
                alt="Financiado por la Unión Europea - NextGenerationEU"
                class="max-w-full max-h-full object-contain"
              />
            </div>
          </a>
          <a
            href="https://planderecuperacion.gob.es/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <div class="w-56 h-36 flex items-center justify-center">
              <img
                src="/app/landing/logos/logo_plan.jpg"
                alt="Plan de Recuperación, Transformación y Resiliencia"
                class="max-w-full max-h-full object-contain"
              />
            </div>
          </a>
          <a
            href="https://planderecuperacion.gob.es/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <div class="w-56 h-36 flex items-center justify-center">
              <img
                src="/app/landing/logos/logo_plan_2.png"
                alt="Pla de Recuperació, Transformació i Resiliència"
                class="max-w-full max-h-full object-contain"
              />
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- AI GODS SECTION (Mantener del diseño anterior) -->
    <section v-if="false" id="gods" class="py-16 md:py-20 lg:py-28 bg-gray-50">
      <div class="mx-auto px-4" style="max-width: calc(1280px - 400px)">
        <div class="text-center mb-12 md:mb-16">
          <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-700 mb-4 md:mb-6">
            {{ $t('common.landing.gods_title') }}
          </h2>
          <p class="text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            {{ $t('common.landing.gods_subtitle') }}
          </p>
        </div>

        <div
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto"
        >
          <!-- Atenea -->
          <div class="bg-white rounded-2xl p-4 md:p-6 text-center">
            <div
              class="w-20 h-20 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 rounded-full overflow-hidden border-4 border-yellow/20"
            >
              <img
                src="/app/avatars/atenea.svg"
                alt="Atenea"
                class="w-full h-full object-contain"
              />
            </div>
            <h3 class="text-base md:text-lg font-semibold text-navy-700 mb-2">Atenea</h3>
            <Badge variant="epica" class="mb-2 md:mb-3 text-xs">{{ $t('common.landing.gods.atenea.domain') }}</Badge>
            <p class="text-xs md:text-sm text-gray-600">
              {{ $t('common.landing.gods.atenea.description') }}
            </p>
          </div>

          <!-- Odiseo -->
          <div class="bg-white rounded-2xl p-4 md:p-6 text-center">
            <div
              class="w-20 h-20 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 rounded-full overflow-hidden border-4 border-purple/20"
            >
              <img
                src="/app/avatars/odiseo.svg"
                alt="Odiseo"
                class="w-full h-full object-contain"
              />
            </div>
            <h3 class="text-base md:text-lg font-semibold text-navy-700 mb-2">Odiseo</h3>
            <Badge variant="rara" class="mb-2 md:mb-3 text-xs">{{ $t('common.landing.gods.odiseo.domain') }}</Badge>
            <p class="text-xs md:text-sm text-gray-600">
              {{ $t('common.landing.gods.odiseo.description') }}
            </p>
          </div>

          <!-- Penélope -->
          <div class="bg-white rounded-2xl p-4 md:p-6 text-center">
            <div
              class="w-20 h-20 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 rounded-full overflow-hidden border-4 border-mint/20"
            >
              <img
                src="/app/avatars/penelope.svg"
                alt="Penélope"
                class="w-full h-full object-contain"
              />
            </div>
            <h3 class="text-base md:text-lg font-semibold text-navy-700 mb-2">Penélope</h3>
            <Badge variant="success" class="mb-2 md:mb-3 text-xs">{{ $t('common.landing.gods.penelope.domain') }}</Badge>
            <p class="text-xs md:text-sm text-gray-600">{{ $t('common.landing.gods.penelope.description') }}</p>
          </div>

          <!-- Polifemo -->
          <div class="bg-white rounded-2xl p-4 md:p-6 text-center">
            <div
              class="w-20 h-20 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 rounded-full overflow-hidden border-4 border-sky-blue/20"
            >
              <img
                src="/app/avatars/polifemo.svg"
                alt="Polifemo"
                class="w-full h-full object-contain"
              />
            </div>
            <h3 class="text-base md:text-lg font-semibold text-navy-700 mb-2">Polifemo</h3>
            <Badge variant="info" class="mb-2 md:mb-3 text-xs">{{ $t('common.landing.gods.polifemo.domain') }}</Badge>
            <p class="text-xs md:text-sm text-gray-600">{{ $t('common.landing.gods.polifemo.description') }}</p>
          </div>

          <!-- Poseidón -->
          <div class="bg-white rounded-2xl p-4 md:p-6 text-center">
            <div
              class="w-20 h-20 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 rounded-full overflow-hidden border-4 border-purple/20"
            >
              <img
                src="/app/avatars/poseidon.svg"
                alt="Poseidón"
                class="w-full h-full object-contain"
              />
            </div>
            <h3 class="text-base md:text-lg font-semibold text-navy-700 mb-2">Poseidón</h3>
            <Badge variant="warning" class="mb-2 md:mb-3 text-xs">{{ $t('common.landing.gods.poseidon.domain') }}</Badge>
            <p class="text-xs md:text-sm text-gray-600">{{ $t('common.landing.gods.poseidon.description') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CTA SECTION -->
    <section
      v-if="false"
      class="py-16 md:py-20 lg:py-28 bg-gradient-to-br from-purple via-purple-hover to-navy-700 text-white"
    >
      <div class="mx-auto px-4 text-center" style="max-width: calc(1280px - 400px)">
        <div class="max-w-3xl mx-auto">
          <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {{ $t('common.landing.cta_final_title') }}
          </h2>
          <p class="text-lg md:text-xl text-white/90 mb-10">
            {{ $t('common.landing.cta_final_subtitle') }}
          </p>
          <Button variant="secondary-yellow" size="lg" @click="router.push('/auth/registro')">
            {{ $t('common.landing.cta_final_button') }}
            <template #iconRight>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </template>
          </Button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()

definePageMeta({
  layout: 'landing',
})

// SEO
useHead({
  title: computed(() => t('common.meta.site_title')),
  meta: [
    {
      name: 'description',
      content: computed(() => t('common.meta.site_description')),
    },
    {
      property: 'og:title',
      content: computed(() => t('common.meta.og_title')),
    },
    {
      property: 'og:description',
      content: computed(() => t('common.meta.og_description')),
    },
  ],
})
</script>

<style scoped>
/* Hero Section */
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 10rem;
  padding-bottom: 8rem;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/app/landing/foto_top2.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.hero-content {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.hero-title {
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  line-height: 1.2;
}

.hero-subtitle {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  line-height: 1.5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hero-section {
    min-height: 85vh;
    padding-bottom: 6rem;
  }

  .hero-content {
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
  }
}

/* Wave Divider */
.wave-divider {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  line-height: 0;
  z-index: 10;
}

.wave-divider img,
.wave-divider svg {
  display: block;
  width: calc(100% + 1.3px);
  height: 60px;
}

@media (min-width: 768px) {
  .wave-divider img,
  .wave-divider svg {
    height: 80px;
  }
}

@media (min-width: 1024px) {
  .wave-divider img,
  .wave-divider svg {
    height: 100px;
  }
}

/* Wave Divider Top (for profiles section) */
.wave-divider-top {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  line-height: 0;
  transform: translateY(-99%);
}

.wave-divider-top img,
.wave-divider-top svg {
  display: block;
  width: calc(100% + 1.3px);
  height: 60px;
}

@media (min-width: 768px) {
  .wave-divider-top img,
  .wave-divider-top svg {
    height: 80px;
  }
}

@media (min-width: 1024px) {
  .wave-divider-top img,
  .wave-divider-top svg {
    height: 100px;
  }
}

/* Wave Divider Bottom */
.wave-divider-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  line-height: 0;
  transform: translateY(98%);
}

.wave-divider-bottom svg {
  display: block;
  width: calc(100% + 1.3px);
  height: 60px;
}

@media (min-width: 768px) {
  .wave-divider-bottom svg {
    height: 80px;
  }
}

@media (min-width: 1024px) {
  .wave-divider-bottom svg {
    height: 100px;
  }
}

/* Shadow 3xl for profile cards hover */
.shadow-3xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
}
</style>
