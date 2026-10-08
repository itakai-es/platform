<template>
  <InfoNote v-if="pending">
    {{
      context === 'signup'
        ? t('common.templates.use.pending_signup')
        : t('common.templates.use.pending_login')
    }}
  </InfoNote>
</template>

<script setup lang="ts">
import { peekPendingTemplate } from '~/utils/pending-template'

/**
 * Aviso de las pantallas de entrar y de crear la cuenta cuando se llega desde
 * «Usar esta plantilla»: al terminar se vuelve a la plantilla para importarla
 * (ver `utils/pending-template.ts`). Sin plantilla pendiente no pinta nada.
 */

defineProps<{
  /** En qué pantalla está: entrar (`login`) o crear la cuenta (`signup`). */
  context: 'login' | 'signup'
}>()

const { t } = useI18n()

/** Se mira al montarse: el almacén del navegador no existe antes. */
const pending = ref(false)
onMounted(() => {
  pending.value = peekPendingTemplate() !== null
})
</script>
