<template>
  <!-- Va dentro de un <dl>: el botón vive en el <dd> para que la lista siga siendo válida. -->
  <div class="rounded-xl bg-navy-700/5 px-3 py-2">
    <dt class="text-xs uppercase tracking-wide text-navy-700/70">{{ label }}</dt>
    <dd class="flex items-center justify-between gap-2">
      <span
        class="min-w-0 break-all text-base font-bold text-navy-700"
        :class="{ 'font-mono': mono }"
      >
        {{ value }}
      </span>
      <IconButton
        v-if="copyable"
        class="shrink-0"
        :icon="copied ? CheckIcon : ClipboardDocumentIcon"
        :label="t('common.copy.label', { what: label })"
        @click="copy"
      />
    </dd>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline'
import { copyText } from '~/utils/clipboard'

/**
 * Un dato de una cuenta en su recuadro: etiqueta y valor. Si se entrega para
 * apuntarlo o pegarlo (usuario, contraseña temporal…), lleva su botón de
 * copiar: al copiar, el icono pasa a ser una marca un momento y sale el aviso
 * de siempre. Donde solo se enseña, como el usuario en el propio perfil, va
 * sin botón.
 */
const props = withDefaults(
  defineProps<{
    label: string
    value: string
    /** Con botón de copiar. */
    copyable?: boolean
    /** En monoespaciada, para lo que se teclea letra a letra (usuario, contraseña). */
    mono?: boolean
  }>(),
  { copyable: true, mono: true }
)

const { t } = useI18n()
const toast = useToast()

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

const copy = async () => {
  try {
    await copyText(props.value)
    copied.value = true
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (copied.value = false), 2000)
    toast.success(t('common.copy.copied', { what: props.label }))
  } catch {
    toast.error(t('common.copy.error'))
  }
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>
