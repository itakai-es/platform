<template>
  <Card type="settings">
    <div class="p-6">
      <div class="flex items-center gap-3 mb-4">
        <EyeIcon class="w-6 h-6 text-navy-700" />
        <h3 class="text-lg font-bold text-navy-700">
          {{ t('common.accessibility.title') }}
        </h3>
      </div>
      <p class="text-sm text-navy-700/70 mb-5">
        {{ t('common.accessibility.description') }}
      </p>

      <AccessibilityControls />
    </div>
  </Card>
</template>

<script setup lang="ts">
import { EyeIcon } from '@heroicons/vue/24/outline'

/**
 * Ajustes de accesibilidad del perfil (Fase 3, punto 14).
 *
 * Es la misma tarjeta para alumno y profesor: los ajustes son de plataforma, no
 * dependen del rol, así que las dos páginas de perfil montan este componente en
 * vez de repetir el bloque. Los controles en sí viven en
 * `AccessibilityControls`, que comparte con el menú de las pantallas públicas.
 */

const { t } = useI18n()
</script>
