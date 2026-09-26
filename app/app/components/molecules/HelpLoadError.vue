<template>
  <EmptyState
    :icon="ExclamationTriangleIcon"
    :title="t('common.help.load_error')"
    :description="t('common.errors.generic')"
  >
    <template #action>
      <Button variant="outline" @click="ensureIndex">{{ t('common.help.retry') }}</Button>
    </template>
  </EmptyState>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import type { HelpArea } from '~/types/help.types'

/**
 * El índice de la ayuda o del blog no ha llegado (sin conexión, la API
 * caída…): se dice, en vez de enseñar un «todavía no hay nada» que no es
 * verdad, y se deja reintentar. Mientras se reintenta, la página vuelve a su
 * esqueleto.
 */

const props = withDefaults(defineProps<{ area?: HelpArea }>(), { area: 'ayuda' })

const { t } = useI18n()
const { ensureIndex } = useHelp(props.area)
</script>
