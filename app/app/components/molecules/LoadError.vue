<template>
  <EmptyState
    :icon="rateLimited ? ClockIcon : ExclamationTriangleIcon"
    :title="rateLimited ? t('common.errors.rate_limited_title') : t('common.help.load_error')"
    :description="rateLimited ? t('common.errors.rate_limited') : t('common.errors.generic')"
    :heading-level="headingLevel"
  >
    <template #action>
      <Button variant="outline" @click="emit('retry')">{{ t('common.help.retry') }}</Button>
    </template>
  </EmptyState>
</template>

<script setup lang="ts">
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

/**
 * El contenido de una página pública no ha llegado (sin conexión, la API
 * caída…): se dice, en vez de enseñar un «todavía no hay nada» que no es
 * verdad, y se deja reintentar. Quien lo pinta decide qué hacer al reintentar.
 *
 * Con `rate-limited`, la API ha cortado por demasiadas consultas seguidas. El
 * aviso no culpa a quien mira: un centro educativo entero sale a internet por
 * la misma conexión, así que el cupo puede haberlo gastado otra persona.
 */

withDefaults(
  defineProps<{
    /** La API ha respondido 429: hay que esperar un poco antes de reintentar. */
    rateLimited?: boolean
    /** Nivel del título del aviso (el de `EmptyState`). */
    headingLevel?: 1 | 2 | 3
  }>(),
  { headingLevel: 3 }
)

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
</script>
