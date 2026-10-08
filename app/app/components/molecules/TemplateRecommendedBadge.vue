<template>
  <!-- La estrella amarilla es la de lo destacado en toda la aplicación (los
       artículos destacados de la ayuda); el texto la nombra para quien no la ve. -->
  <Badge variant="warning" size="sm" class="gap-1">
    <StarIcon class="h-3.5 w-3.5 flex-shrink-0 text-navy-700" aria-hidden="true" />
    {{ t('common.templates.recommended') }}
  </Badge>
</template>

<script setup lang="ts">
import { StarIcon } from '@heroicons/vue/24/solid'

/**
 * El distintivo de una plantilla recomendada por la administración: el mismo
 * en las tarjetas de los dos catálogos, en la ficha pública, en la
 * previsualización del profesorado y en el panel.
 */

const { t } = useI18n()
</script>
