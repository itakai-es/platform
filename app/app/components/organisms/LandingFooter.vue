<template>
  <footer class="text-white relative pb-32 sm:pb-36 md:pb-40" style="background-color: #004">
    <!-- Wave Divider Top -->
    <div class="footer-wave-divider" :class="`footer-wave-divider--${wave}`">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 211.84" preserveAspectRatio="none">
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
              <NuxtLink to="/ayuda" class="text-sm text-gray-300">
                {{ $t('common.footer.help_center') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/ayuda" class="text-sm text-gray-300">
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
</template>

<script setup lang="ts">
/**
 * Pie de la parte pública de ITAKAI.
 *
 * Lo comparten el landing y el centro de ayuda: son la misma web de cara al
 * público y el pie tiene que ser el mismo, con su onda, sus cuatro columnas y
 * los avatares. Vive aquí para no tenerlo copiado en dos layouts.
 */

withDefaults(
  defineProps<{
    /**
     * Altura de la onda. La `alta` es la del landing, pensada para rematar una
     * sección de portada. La `baja` es para páginas de contenido: la onda se
     * pinta por encima de lo que tiene justo arriba, y ahí una de 180 píxeles
     * se mete demasiado dentro de lo que se está leyendo.
     */
    wave?: 'alta' | 'baja'
  }>(),
  { wave: 'alta' }
)
</script>

<style scoped>
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
  .footer-wave-divider--alta svg {
    height: 100px;
  }
}

@media (min-width: 1024px) {
  .footer-wave-divider--alta svg {
    height: 140px;
  }
}

@media (min-width: 1280px) {
  .footer-wave-divider--alta svg {
    height: 180px;
  }
}

@media (min-width: 768px) {
  .footer-wave-divider--baja svg {
    height: 76px;
  }
}
</style>
