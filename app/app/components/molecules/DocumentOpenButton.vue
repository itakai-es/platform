<template>
  <!-- Abre, reproduce o descarga un documento de misión, según su tipo. -->
  <button
    type="button"
    class="w-10 h-10 rounded-xl bg-navy-700 hover:bg-navy-800 flex items-center justify-center flex-shrink-0 transition-colors shadow-md"
    :title="label"
    :aria-label="label"
    @click="open"
  >
    <component :is="icon" class="w-5 h-5 text-white" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  PlayCircleIcon,
} from '@heroicons/vue/24/outline'
import type { ProtectedDocument } from '~/composables/useProtectedFiles'

/**
 * El botón de abrir un documento de misión: un enlace se abre, un vídeo se
 * reproduce y el resto se descarga. Los que son un fichero de la plataforma se
 * piden a la API, que comprueba el acceso; los enlaces se abren tal cual.
 */
const props = defineProps<{ doc: ProtectedDocument }>()

const { t } = useI18n()
const { openDocument } = useProtectedFiles()

const label = computed(() =>
  props.doc.type === 'link'
    ? t('student.mission_detail.documents.action_open_link')
    : props.doc.type === 'video'
      ? t('student.mission_detail.documents.action_play_video')
      : t('student.mission_detail.documents.action_download')
)

const icon = computed(() =>
  props.doc.type === 'link'
    ? ArrowTopRightOnSquareIcon
    : props.doc.type === 'video'
      ? PlayCircleIcon
      : ArrowDownTrayIcon
)

const open = () => {
  void openDocument(props.doc)
}
</script>
