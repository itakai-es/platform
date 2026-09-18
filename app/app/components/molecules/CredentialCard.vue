<template>
  <!-- Tarjeta para recortar: el borde discontinuo marca el corte, y al imprimir
       no se parte entre dos páginas. -->
  <article
    class="break-inside-avoid rounded-2xl border-2 border-dashed border-navy-700/30 bg-white p-4 text-navy-700"
    :aria-label="name"
  >
    <header class="mb-3 flex items-baseline justify-between gap-3 border-b border-navy-700/10 pb-2">
      <p class="min-w-0 break-words text-base font-bold">{{ name }}</p>
      <p class="shrink-0 text-xs text-navy-700/70">{{ className }}</p>
    </header>

    <dl class="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5 text-sm">
      <dt class="text-navy-700/70">{{ t('teacher.classes.detail.credentials.card_username') }}</dt>
      <dd class="break-all font-mono font-bold">{{ username }}</dd>

      <dt class="text-navy-700/70">{{ t('teacher.classes.detail.credentials.card_password') }}</dt>
      <dd class="font-mono text-base font-bold tracking-wider">{{ password }}</dd>

      <dt class="text-navy-700/70">{{ t('teacher.classes.detail.credentials.card_login_url') }}</dt>
      <dd class="break-all">{{ loginUrl }}</dd>

      <dt class="text-navy-700/70">
        {{ t('teacher.classes.detail.credentials.card_class_code') }}
      </dt>
      <dd class="font-mono font-bold tracking-widest">{{ classCode }}</dd>
    </dl>

    <footer class="mt-3 flex items-end justify-between gap-3">
      <p class="text-xs font-medium">
        {{ t('teacher.classes.detail.credentials.card_first_login') }}
      </p>
      <Button
        class="shrink-0 print:hidden"
        variant="outline"
        size="sm"
        :icon-left="ClipboardDocumentIcon"
        :aria-label="t('teacher.classes.detail.credentials.copy_label', { name })"
        @click="emit('copy')"
      >
        {{ t('teacher.classes.detail.credentials.copy') }}
      </Button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { ClipboardDocumentIcon } from '@heroicons/vue/24/outline'

/**
 * Una tarjeta de la hoja de credenciales: lo que el alumno necesita para entrar
 * por primera vez. El texto va en el idioma de la interfaz de quien la imprime.
 * «Copiar» solo avisa: qué se copia y cómo lo decide la hoja.
 */
defineProps<{
  name: string
  username: string
  password: string
  className: string
  classCode: string
  loginUrl: string
}>()

const emit = defineEmits<{ copy: [] }>()

const { t } = useI18n()
</script>
