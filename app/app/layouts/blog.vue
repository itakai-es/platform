<template>
  <PublicContentShell :section-label="t('common.nav.blog')" :section-to="helpBasePath('blog')">
    <slot />
  </PublicContentShell>
</template>

<script setup lang="ts">
import { helpBasePath } from '~/utils/help-area'

/**
 * Layout del blog (Fase 3, B3).
 *
 * El mismo armazón que el centro de ayuda —barra sobria, contenido y el pie
 * del landing—, sin el selector de portada por rol, que es cosa de la ayuda:
 * el blog es uno solo, para todos.
 */

const { t } = useI18n()
</script>
