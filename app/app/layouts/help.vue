<template>
  <div class="flex min-h-screen flex-col bg-bg-primary">
    <!-- Barra propia: sencilla, en el flujo de la página y sin adornos
         flotantes. El layout del landing tiene una cabecera absoluta con una
         onda decorativa pensada para ir sobre la foto de la portada; en una
         página de documentación solo estorba. -->
    <header class="sticky top-0 z-40 border-b border-border-primary bg-surface">
      <div
        class="container mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 md:px-6 lg:px-8"
      >
        <NuxtLink
          to="/"
          class="flex shrink-0 items-center"
          :aria-label="t('common.actions.back_to_dashboard')"
        >
          <img src="/logo/itakai_color.svg" alt="ITAKAI" class="h-10 md:h-11" />
        </NuxtLink>

        <NuxtLink
          :to="portalPath(scope)"
          class="text-sm font-semibold text-navy-700 transition-colors hover:text-purple"
        >
          {{ t('common.help.title') }}
        </NuxtLink>

        <div class="ml-auto flex items-center gap-1">
          <AccessibilityMenu variant="dark" />
          <LanguageSwitcher variant="dark" />
          <Button
            v-if="authStore.isAuthenticated"
            variant="outline"
            size="sm"
            class="ml-1 hidden sm:inline-flex"
            @click="router.push(getDashboardByRole(authStore.userRole ?? ''))"
          >
            {{ t('common.help.back_to_app') }}
          </Button>
          <Button
            v-else
            variant="primary"
            size="sm"
            class="ml-1 hidden sm:inline-flex"
            @click="router.push('/auth/login')"
          >
            {{ t('common.actions.enter') }}
          </Button>
        </div>

        <!-- Selector de portada: toda la ayuda, profesorado o alumnado. Va
             detrás de los controles también en el DOM, sin `order`, para que
             el tabulador siga el orden visual. En pantallas estrechas baja a
             una segunda fila a lo ancho, para que la barra no desborde. -->
        <OptionPillGroup
          :model-value="scope"
          :options="scopeOptions"
          :columns="3"
          :aria-label="t('common.help.scope_label')"
          class="w-full sm:w-auto"
        />
      </div>
    </header>

    <!-- El contenido ocupa como mínimo la ventana entera (menos la barra), para
         que el pie no asome a media pantalla en un artículo corto, y reserva
         abajo el alto de la onda, que se pinta por encima de lo que tiene
         justo arriba. -->
    <main class="flex-1 p-4 pb-24 md:p-6 md:pb-28" style="min-height: calc(100vh - 4.3rem)">
      <div class="mx-auto max-w-5xl">
        <slot />
      </div>
    </main>

    <LandingFooter wave="baja" />
  </div>
</template>

<script setup lang="ts">
import { getDashboardByRole } from '~/utils/navigation'
import type { HelpScope } from '~/types/help.types'

/**
 * Layout del centro de ayuda (Fase 3, punto 17).
 *
 * Barra propia y sobria —logo, acceso a la ayuda, selector de portada,
 * accesibilidad e idioma—, que no flota sobre el contenido, así que las páginas
 * no tienen que dejar huecos ni esquivar decoraciones. El pie sí es el mismo
 * que el del landing: de cara al público son la misma web.
 *
 * El layout no elige la portada: la fijan las páginas (cada portada la suya y
 * el artículo según su audiencia). Si la fijara aquí, su `onMounted` correría
 * después del de la página y pisaría lo que esta acaba de decidir.
 */

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { scope, portalPath } = useHelp()

/**
 * Las tres portadas. Las etiquetas de profesorado y alumnado son las mismas
 * que se enseñan en las píldoras y filtros del panel.
 */
const scopeOptions = computed(() => [
  { value: 'todo' as HelpScope, label: t('common.help.scope_todo'), to: portalPath('todo') },
  ...(['profesor', 'alumno'] as const).map(value => ({
    value: value as HelpScope,
    label: t(`common.help.audience.${value}`),
    to: portalPath(value),
  })),
])
</script>
