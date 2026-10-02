<template>
  <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 flex flex-col">
    <!-- Toolbar -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-gray-50 border-b border-gray-200"
    >
      <div class="flex items-center gap-0.5 sm:gap-1 flex-wrap">
        <button
          type="button"
          class="p-1.5 sm:p-2 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-40"
          :disabled="!canUndo"
          @click="undo"
        >
          <ArrowUturnLeftIcon class="w-4 h-4" />
        </button>
        <button
          type="button"
          class="p-1.5 sm:p-2 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-40"
          :disabled="!canRedo"
          @click="redo"
        >
          <ArrowUturnRightIcon class="w-4 h-4" />
        </button>
        <div class="w-px h-5 bg-gray-300 mx-0.5 sm:mx-1" />
        <button
          type="button"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
          @click="insertFmt('**', '**')"
        >
          <span class="text-base sm:text-lg font-bold" style="font-family: Georgia, serif">B</span>
        </button>
        <button
          type="button"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
          @click="insertFmt('*', '*')"
        >
          <span class="text-base sm:text-lg italic" style="font-family: Georgia, serif">I</span>
        </button>
        <button
          type="button"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
          @click="insertFmt('<u>', '</u>')"
        >
          <span class="text-base sm:text-lg underline" style="font-family: Georgia, serif">U</span>
        </button>
        <button
          type="button"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
          @click="insertFmt('~~', '~~')"
        >
          <span class="text-base sm:text-lg line-through" style="font-family: Georgia, serif"
            >S</span
          >
        </button>
        <div class="w-px h-5 bg-gray-300 mx-0.5 sm:mx-1" />
        <button
          type="button"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
          @click="cycleHeading"
        >
          <span class="text-base sm:text-lg" style="font-family: Georgia, serif"
            ><span class="font-bold">T</span><span class="text-xs sm:text-sm">t</span></span
          >
        </button>
        <button
          type="button"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
          @click="insertFmt('- ', '')"
        >
          <ListBulletIcon class="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div v-if="aiEnabled" class="w-px h-5 bg-gray-300 mx-0.5 sm:mx-1" />
        <!-- AI Button -->
        <button
          v-if="aiEnabled"
          type="button"
          class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors bg-yellow hover:bg-[#FFD166] text-navy-700"
          @click="openAiModal"
        >
          <img :src="godAvatar" :alt="godName" class="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
          <span class="hidden sm:inline">{{ godName }}</span>
        </button>
      </div>
      <div v-if="showActions" class="flex items-center gap-2">
        <Button variant="ghost" size="sm" @click="$emit('cancel')">Cancelar</Button>
        <Button variant="primary" size="sm" @click="$emit('save', content)">Guardar</Button>
      </div>
    </div>

    <!-- Mobile: Tab switcher -->
    <div class="flex md:hidden border-b border-gray-200">
      <button
        type="button"
        class="flex-1 py-2 text-sm font-medium text-center transition-colors"
        :class="
          mobileTab === 'edit' ? 'text-navy-700 border-b-2 border-navy-700' : 'text-text-secondary'
        "
        @click="mobileTab = 'edit'"
      >
        Editar
      </button>
      <button
        type="button"
        class="flex-1 py-2 text-sm font-medium text-center transition-colors"
        :class="
          mobileTab === 'preview'
            ? 'text-navy-700 border-b-2 border-navy-700'
            : 'text-text-secondary'
        "
        @click="mobileTab = 'preview'"
      >
        Vista previa
      </button>
    </div>

    <!-- Mobile: Single panel -->
    <div class="flex-1 min-h-0 md:hidden">
      <textarea
        v-if="mobileTab === 'edit'"
        ref="editorRef"
        v-model="content"
        class="w-full h-full p-4 resize-none font-mono text-sm text-navy-700 outline-none"
        placeholder="Escribe en formato Markdown..."
        :aria-labelledby="labelledby"
        @input="pushUndo"
      />
      <div v-else class="h-full p-4 overflow-auto bg-gray-50">
        <div class="md-rendered" v-html="rendered" />
      </div>
    </div>

    <!-- Desktop: Split View -->
    <div class="hidden md:flex flex-1 min-h-0">
      <div class="flex-1 border-r border-gray-200">
        <textarea
          ref="editorRef"
          v-model="content"
          class="w-full h-full p-4 resize-none font-mono text-sm text-navy-700 outline-none"
          placeholder="Escribe en formato Markdown..."
          :aria-labelledby="labelledby"
          @input="pushUndo"
          @scroll="syncScroll"
        />
      </div>
      <div
        ref="previewRef"
        class="flex-1 p-4 overflow-auto bg-gray-50"
        @scroll="syncScrollFromPreview"
      >
        <div class="md-rendered" v-html="rendered" />
      </div>
    </div>

    <!-- AI Modal. Es un diálogo propio (Modal): así tiene su rol, su trampa
         de foco y su Escape aunque se abra desde otro diálogo. -->
    <Modal
      :model-value="showAiModal"
      :title="godName"
      size="xl"
      sticky-chrome
      close-on-esc
      :closable="!aiLoading"
      @close="closeAiModal"
    >
      <template #header="{ titleId }">
        <div class="flex items-center gap-3">
          <img :src="godAvatar" alt="" class="w-10 h-10 rounded-full" />
          <div>
            <h3 :id="titleId" class="font-bold text-navy-700">{{ godName }}</h3>
            <p v-if="contextLabel" class="text-xs text-text-secondary">{{ contextLabel }}</p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <!-- AI suggestion (streamed) -->
        <div
          v-if="aiSuggestion"
          class="bg-gray-50 rounded-xl p-6 md-rendered"
          v-html="renderedSuggestion"
        />

        <!-- Loading -->
        <div
          v-if="aiLoading && !aiSuggestion"
          role="status"
          class="flex items-center gap-2 text-text-secondary text-sm py-8 justify-center"
        >
          <SparklesIcon class="w-4 h-4 animate-pulse" aria-hidden="true" />
          <span>{{ t('common.markdown.generating') }}</span>
        </div>

        <!-- Fallo: la IA no ha respondido (tras los reintentos del composable) -->
        <p
          v-if="aiFailed && !aiSuggestion && !aiLoading"
          role="alert"
          class="flex items-start justify-center gap-1.5 text-sm text-navy-700 py-8"
        >
          <ExclamationCircleIcon class="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
          <span>{{ t('common.errors.generic') }}</span>
        </p>

        <!-- Empty state (sin pista, nada: si no, queda un hueco en blanco) -->
        <div v-else-if="!aiSuggestion && !aiLoading && aiModalHint" class="text-center py-8">
          <p class="text-text-secondary text-sm">{{ aiModalHint }}</p>
        </div>
      </div>

      <template v-if="!aiLoading" #footer>
        <!-- Accept/Reject (when suggestion ready) -->
        <div
          v-if="aiSuggestion"
          ref="aiActionsRef"
          class="w-full flex items-center justify-between gap-2"
        >
          <Button variant="outline" size="sm" @click="askForChanges">Quiero cambiar algo</Button>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" @click="closeAiModal">Descartar</Button>
            <Button variant="outline" size="sm" @click="replaceAllWithSuggestion"
              >Reemplazar todo</Button
            >
            <Button variant="primary" size="sm" @click="acceptAiSuggestion">{{
              t('common.markdown.insert_at_end')
            }}</Button>
          </div>
        </div>

        <!-- Input (when no suggestion or wants to change) -->
        <div v-else class="w-full flex gap-2">
          <input
            ref="aiInputRef"
            v-model="aiInput"
            type="text"
            class="flex-1 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-navy-700 outline-none focus:ring-2 focus:ring-gray-300"
            :placeholder="aiPlaceholder || 'Dile a la IA qué quieres...'"
            :aria-label="aiPlaceholder || 'Dile a la IA qué quieres...'"
            @keydown.enter="sendAi"
          />
          <button
            type="button"
            class="px-3.5 py-2.5 rounded-xl bg-navy-700 text-white disabled:opacity-40 hover:opacity-90 transition-colors"
            :disabled="!aiInput.trim()"
            :aria-label="t('common.markdown.send_to_ai')"
            @click="sendAi"
          >
            <PaperAirplaneIcon class="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ExclamationCircleIcon,
  ListBulletIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'
import { renderHelpMarkdownWithUploads } from '~/utils/help-images'
import { renderPageMarkdown } from '~/utils/markdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    godName: string
    godAvatar: string
    aiPlaceholder?: string
    /** Label shown under god name in modal */
    contextLabel?: string
    /** Hint shown in modal empty state */
    aiModalHint?: string
    /** System context injected into AI prompt so it knows what kind of content it's editing */
    aiSystemContext?: string
    /**
     * El botón de la IA sale salvo que se pase `false`. Con `withDefaults`:
     * una prop booleana que no se pasa vale `false`, no `undefined`, y el botón
     * no salía en ningún sitio.
     */
    aiEnabled?: boolean
    /**
     * Los botones Cancelar y Guardar de la barra, para quien escucha `cancel` y
     * `save`. Fuera cuando el editor va dentro de un formulario que ya tiene
     * los suyos, como el panel de contenidos.
     */
    showActions?: boolean
    /** El `id` de la etiqueta externa que da nombre al área de texto. */
    labelledby?: string
    /**
     * La vista previa enseña las imágenes, como el centro de ayuda y el blog,
     * con las subidas desde el panel apuntadas a la API. Solo para lo que
     * escriben administradores: en la historia, la guía y las misiones no se
     * admiten imágenes y se quedan fuera.
     */
    allowImages?: boolean
  }>(),
  { aiEnabled: true, showActions: true }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  cancel: []
  save: [content: string]
}>()

const config = useRuntimeConfig()
const authStore = useAuthStore()
const { t, locale } = useI18n()
// En lo alto de `setup`: el composable llama a `useI18n()`, que fuera de aquí
// (por ejemplo, dentro del clic) lanza y la petición no llegaba a salir.
const { streamPrompt: streamAIPrompt } = useAIPrompt()

const content = ref(props.modelValue)
const editorRef = ref<HTMLTextAreaElement>()
const mobileTab = ref<'edit' | 'preview'>('edit')
const previewRef = ref<HTMLDivElement>()
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])

// AI modal
const showAiModal = ref(false)
const aiInput = ref('')
const aiInputRef = ref<HTMLInputElement>()
const aiActionsRef = ref<HTMLDivElement>()
const aiLoading = ref(false)
const aiSuggestion = ref('')
/** La última petición a la IA falló: sin esto, el diálogo volvía en silencio al principio. */
const aiFailed = ref(false)
let aiAbortController: AbortController | null = null

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)
const rendered = computed(() => renderPreview(content.value))
const renderedSuggestion = computed(() => renderPreview(aiSuggestion.value))

/** El markdown tal y como saldrá: con imágenes solo si el editor las admite. */
function renderPreview(raw: string) {
  return props.allowImages
    ? renderHelpMarkdownWithUploads(raw, config.public.apiBase)
    : renderPageMarkdown(raw)
}

watch(content, v => emit('update:modelValue', v))
watch(
  () => props.modelValue,
  v => {
    if (v !== content.value) content.value = v
  }
)

/**
 * Las dos columnas se mueven juntas. Mover una por código dispara su propio
 * evento de scroll, el eco, que no hay que devolver: cada columna recuerda
 * dónde la dejó la otra y lo ignora. Una marca que se borrase en el siguiente
 * `requestAnimationFrame` no basta: Safari entrega el eco un fotograma
 * después, ya sin marca, y las columnas se lo devolvían sin parar, corriéndose
 * un píxel cada vez.
 */
let editorEcho: number | null = null
let previewEcho: number | null = null

/** Pone `to` en la misma proporción que `from`; devuelve dónde queda, si se ha movido. */
function follow(from: HTMLElement, to: HTMLElement) {
  const pct = from.scrollTop / (from.scrollHeight - from.clientHeight || 1)
  const before = to.scrollTop
  to.scrollTop = pct * (to.scrollHeight - to.clientHeight)
  return to.scrollTop === before ? null : to.scrollTop
}

function syncScroll() {
  const editor = editorRef.value
  const preview = previewRef.value
  if (!editor || !preview) return
  const echo = editor.scrollTop === editorEcho
  editorEcho = null
  if (!echo) previewEcho = follow(editor, preview)
}

function syncScrollFromPreview() {
  const editor = editorRef.value
  const preview = previewRef.value
  if (!editor || !preview) return
  const echo = preview.scrollTop === previewEcho
  previewEcho = null
  if (!echo) editorEcho = follow(preview, editor)
}

function pushUndo() {
  undoStack.value.push(content.value)
  redoStack.value = []
  if (undoStack.value.length > 50) undoStack.value.shift()
}

function undo() {
  if (!undoStack.value.length) return
  redoStack.value.push(content.value)
  content.value = undoStack.value.pop()!
}

function redo() {
  if (!redoStack.value.length) return
  undoStack.value.push(content.value)
  content.value = redoStack.value.pop()!
}

function insertFmt(before: string, after: string) {
  const el = editorRef.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = content.value.slice(start, end)
  pushUndo()
  content.value =
    content.value.slice(0, start) +
    before +
    (selected || 'texto') +
    after +
    content.value.slice(end)
  nextTick(() => {
    el.focus()
    el.setSelectionRange(
      start + before.length,
      start + before.length + (selected || 'texto').length
    )
  })
}

function cycleHeading() {
  const el = editorRef.value
  if (!el) return
  const pos = el.selectionStart
  const text = content.value
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  const lineEnd = text.indexOf('\n', pos)
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd)
  pushUndo()
  if (line.startsWith('### '))
    content.value = text.slice(0, lineStart) + line.slice(4) + text.slice(lineStart + line.length)
  else if (line.startsWith('## '))
    content.value =
      text.slice(0, lineStart) + '### ' + line.slice(3) + text.slice(lineStart + line.length)
  else if (line.startsWith('# '))
    content.value =
      text.slice(0, lineStart) + '## ' + line.slice(2) + text.slice(lineStart + line.length)
  else content.value = text.slice(0, lineStart) + '# ' + line + text.slice(lineStart + line.length)
}

function openAiModal() {
  showAiModal.value = true
  aiSuggestion.value = ''
  aiFailed.value = false
  aiInput.value = ''
  // Doble `nextTick`: el Modal enfoca el diálogo tras el primero; el campo
  // debe recibir el foco después.
  nextTick(() => nextTick(() => aiInputRef.value?.focus()))
}

function closeAiModal() {
  showAiModal.value = false
  aiSuggestion.value = ''
  aiFailed.value = false
  aiInput.value = ''
}

async function sendAi() {
  if (!aiInput.value.trim() || aiLoading.value) return
  const prompt = aiInput.value.trim()
  aiInput.value = ''
  aiSuggestion.value = ''
  aiFailed.value = false
  // Mientras carga, el pie (con el campo) se desmonta: el foco pasa al diálogo
  // para no caer en el body, donde se pierden la trampa de foco y Escape.
  aiInputRef.value?.closest<HTMLElement>('[role="dialog"]')?.focus()
  aiLoading.value = true

  try {
    const sysCtx =
      props.aiSystemContext ||
      (locale.value === 'en'
        ? 'The teacher is editing content.'
        : 'Quien imparte la clase está editando contenido.')
    const aiTarget = ref('')
    await streamAIPrompt(
      'editor.assist',
      {
        content: content.value.slice(0, 1500),
        request: prompt,
        systemContext: sysCtx,
      },
      aiTarget
    )
    aiSuggestion.value = aiTarget.value
    aiLoading.value = false
  } catch {
    if (aiAbortController?.signal.aborted) return
    aiSuggestion.value = ''
    aiFailed.value = true
  } finally {
    aiAbortController = null
    aiLoading.value = false
    // Al volver el pie, el foco va a sus acciones (sugerencia) o al campo (fallo).
    if (showAiModal.value) nextTick(focusAiFooter)
  }
}

function focusAiFooter() {
  if (aiSuggestion.value) aiActionsRef.value?.querySelector('button')?.focus()
  else aiInputRef.value?.focus()
}

function askForChanges() {
  aiSuggestion.value = ''
  nextTick(focusAiFooter)
}

onBeforeUnmount(() => {
  aiAbortController?.abort()
})

function replaceAllWithSuggestion() {
  if (!aiSuggestion.value) return
  pushUndo()
  let cleaned = aiSuggestion.value.trim()
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  )
    cleaned = cleaned.slice(1, -1)
  content.value = cleaned
  closeAiModal()
  nextTick(() => editorRef.value?.focus())
}

function acceptAiSuggestion() {
  if (!aiSuggestion.value) return
  pushUndo()
  // Clean AI output: remove surrounding quotes
  let cleaned = aiSuggestion.value.trim()
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1)
  }
  const el = editorRef.value
  const pos = el ? el.selectionStart : content.value.length
  content.value = content.value.slice(0, pos) + '\n\n' + cleaned + '\n\n' + content.value.slice(pos)
  closeAiModal()
  nextTick(() => editorRef.value?.focus())
}
</script>
