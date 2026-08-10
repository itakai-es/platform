<template>
  <!-- Franja de aviso del modo "Ver como alumno". Solo aparece cuando el
       profesor está en la vista previa de alumno (nunca para alumnos reales). -->
  <div
    v-if="auth.isStudentPreview"
    class="flex flex-shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-yellow px-4 py-2 text-sm font-medium text-navy-700"
  >
    <span class="inline-flex items-center gap-1.5">
      <EyeIcon class="h-4 w-4" />
      {{ t('common.student_preview.banner') }}
    </span>
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full bg-navy-700 px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      @click="auth.exitStudentPreview()"
    >
      <ArrowUturnLeftIcon class="h-3.5 w-3.5" />
      Volver a profesor
    </button>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon, ArrowUturnLeftIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()

const auth = useAuthStore()
</script>
