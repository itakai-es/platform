<template>
  <LoadError @retry="ensureIndex" />
</template>

<script setup lang="ts">
import type { HelpArea } from '~/types/help.types'

/**
 * El índice de la ayuda o del blog no ha llegado (sin conexión, la API
 * caída…): se dice, en vez de enseñar un «todavía no hay nada» que no es
 * verdad, y se deja reintentar. Mientras se reintenta, la página vuelve a su
 * esqueleto.
 */

const props = withDefaults(defineProps<{ area?: HelpArea }>(), { area: 'ayuda' })

const { ensureIndex } = useHelp(props.area)
</script>
