<template>
  <PublicContentShell :section-label="t('common.help.title')" :section-to="portalPath(scope)">
    <!-- Selector de portada: toda la ayuda, profesorado o alumnado. En
         pantallas estrechas baja a una segunda fila a lo ancho, para que la
         barra no desborde. -->
    <template #nav>
      <OptionPillGroup
        :model-value="scope"
        :options="scopeOptions"
        :columns="3"
        :aria-label="t('common.help.scope_label')"
        class="w-full sm:w-auto"
      />
    </template>

    <slot />
  </PublicContentShell>
</template>

<script setup lang="ts">
import type { HelpScope } from '~/types/help.types'

/**
 * Layout del centro de ayuda (Fase 3, punto 17).
 *
 * El armazón (barra, contenido y pie) es el de toda la parte pública de
 * contenido, `PublicContentShell`, el mismo que el del blog; lo propio de la
 * ayuda es el selector de portada por rol.
 *
 * El layout no elige la portada: la fijan las páginas (cada portada la suya y
 * el artículo según su audiencia). Si la fijara aquí, su `onMounted` correría
 * después del de la página y pisaría lo que esta acaba de decidir.
 */

const { t } = useI18n()
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
