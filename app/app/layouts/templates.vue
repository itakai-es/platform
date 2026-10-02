<template>
  <PublicContentShell
    :section-label="t('common.nav.templates')"
    :section-to="ROUTE_NAMES.TEMPLATES"
  >
    <slot />
  </PublicContentShell>
</template>

<script setup lang="ts">
import { ROUTE_NAMES } from '~/utils/navigation'

/**
 * Layout del catálogo público de plantillas (Fase 3, C5).
 *
 * El mismo armazón que el centro de ayuda y el blog —barra sobria, contenido
 * y el pie del landing—, con el nombre de la sección en la barra: de cara al
 * público son la misma web.
 */

const { t } = useI18n()
</script>
