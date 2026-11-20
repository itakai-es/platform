<template>
  <div class="md-rendered">
    <template v-for="(part, index) in parts" :key="index">
      <div v-if="part.code !== undefined" class="help-code-block my-4 flex items-start rounded-xl bg-[#1a1f3a]">
        <pre class="min-w-0 flex-1"><code>{{ part.code }}</code></pre>
        <IconButton
          class="mr-2 mt-2 grid min-h-9 min-w-9 shrink-0 place-items-center bg-white"
          :icon="copied === part ? CheckIcon : ClipboardDocumentIcon"
          :label="copied === part ? t('common.copy.copied') : t('common.help.copy_block')"
          :title="copied === part ? t('common.copy.copied') : t('common.help.copy_block')"
          @click="copy(part)"
        />
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else class="contents" v-html="part.html" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline'
import { copyText } from '~/utils/clipboard'

interface MarkdownPart {
  html?: string
  code?: string
}

/** Recibe el HTML ya saneado de la lección y añade controles a sus bloques de código. */
const props = defineProps<{ html: string }>()
const { t } = useI18n()
const toast = useToast()
const copied = shallowRef<MarkdownPart>()
let resetTimer: ReturnType<typeof setTimeout> | undefined

const parts = computed<MarkdownPart[]>(() => {
  if (typeof document === 'undefined') return [{ html: props.html }]
  const template = document.createElement('template')
  template.innerHTML = props.html
  const buffer = document.createElement('div')
  const result: MarkdownPart[] = []

  function flushHtml() {
    if (!buffer.textContent?.trim() && !buffer.firstElementChild) return
    result.push({ html: buffer.innerHTML })
    buffer.replaceChildren()
  }

  for (const node of Array.from(template.content.childNodes)) {
    const code = node instanceof HTMLPreElement && node.querySelector(':scope > code')
    if (code) {
      flushHtml()
      result.push({ code: (code.textContent ?? '').replace(/\n$/, '') })
    } else {
      buffer.append(node)
    }
  }
  flushHtml()
  return result
})

async function copy(part: MarkdownPart) {
  if (part.code === undefined) return
  try {
    await copyText(part.code)
    copied.value = part
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (copied.value = undefined), 2000)
    toast.success(t('common.copy.copied'))
  } catch {
    toast.error(t('common.copy.error'))
  }
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<style scoped>
.help-code-block > pre {
  margin: 0;
}
</style>
