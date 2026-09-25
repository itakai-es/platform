<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger Button -->
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      :class="triggerClasses"
      :aria-labelledby="labelledby ? `${labelledby} ${valueId}` : undefined"
      :aria-describedby="describedby"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
      @keydown.esc="onTriggerEsc"
    >
      <span :id="valueId" class="truncate">{{ selectedLabel }}</span>
      <ChevronDownIcon
        :class="[
          'w-4 h-4 text-navy-700/70 transition-transform duration-200 flex-shrink-0',
          isOpen ? 'rotate-180' : '',
        ]"
      />
    </button>

    <!-- Dropdown Menu. Se teletransporta a <body> y se posiciona `fixed` respecto
         al botón para que ningún ancestro con overflow (p. ej. el <main> con scroll
         o las barras con overflow-x) lo recorte. -->
    <Teleport :to="overlayTarget" defer>
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div
          v-if="isOpen"
          ref="menuRef"
          :style="menuStyle"
          class="fixed z-50 min-w-[200px] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
          @keydown.esc.stop="closeMenu"
        >
          <!-- Buscador (opcional): útil en listas largas (provincias, asignaturas…) -->
          <div v-if="isSearchable" class="border-b border-gray-100 p-2">
            <input
              ref="searchRef"
              v-model="query"
              type="text"
              :placeholder="searchPlaceholder"
              :aria-label="searchPlaceholder"
              class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              @click.stop
            />
          </div>
          <div class="py-1 overflow-y-auto" :style="{ maxHeight: `${listMaxHeight}px` }">
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            :class="[
              'w-full px-4 py-2.5 text-left text-sm transition-colors duration-150 flex items-center gap-3',
              modelValue === option.value
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-navy-700 hover:bg-gray-50',
            ]"
            @click="selectOption(option)"
          >
            <CheckIcon
              v-if="modelValue === option.value"
              class="w-4 h-4 text-primary flex-shrink-0"
            />
            <span :class="['min-w-0', modelValue !== option.value ? 'ml-7' : '']">
              <span class="block">{{ option.label }}</span>
              <span v-if="option.hint" class="block text-xs font-normal text-text-secondary">
                {{ option.hint }}
              </span>
            </span>
          </button>
          <p
            v-if="isSearchable && filteredOptions.length === 0"
            class="px-4 py-2.5 text-sm text-text-secondary"
            role="status"
          >
            {{ searching ? searchingText : noResultsText }}
          </p>
          </div>
          <p
            v-if="remoteHasMore"
            class="border-t border-gray-100 px-4 py-2 text-xs text-text-secondary"
          >
            {{ moreText }}
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'

interface Option {
  value: string | number
  label: string
  /** Segunda línea, más discreta (p. ej. el profesor de una clase). */
  hint?: string
}

/** Resultado de una búsqueda en el servidor: primeras coincidencias y si hay más. */
interface RemoteResult {
  options: Option[]
  hasMore?: boolean
}

interface Props {
  modelValue: string | number
  options: Option[]
  placeholder?: string
  disabled?: boolean
  /** Muestra un buscador dentro del desplegable (útil en listas largas). */
  searchable?: boolean
  searchPlaceholder?: string
  noResultsText?: string
  /** Resalta el campo en rojo para señalar un valor requerido que falta. */
  error?: boolean
  /**
   * El `id` de la etiqueta externa que da nombre al desplegable. Se encadena
   * con el valor elegido para que el lector anuncie los dos.
   */
  labelledby?: string
  /** El `id` de la pista o el error que describen el desplegable. */
  describedby?: string
  /**
   * Busca las opciones en el servidor según lo escrito, para listas que no se
   * pueden cargar enteras (las clases de toda la instancia). Implica buscador.
   * Las `options` fijas se muestran siempre delante de los resultados.
   */
  remoteSearch?: (query: string) => Promise<RemoteResult>
  /** Etiqueta del valor elegido cuando no está entre las opciones cargadas. */
  valueLabel?: string
  searchingText?: string
  /** Aviso bajo la lista cuando la búsqueda tiene más coincidencias. */
  moreText?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Seleccionar...',
  disabled: false,
  searchable: false,
  searchPlaceholder: 'Buscar...',
  noResultsText: 'Sin resultados',
  error: false,
  remoteSearch: undefined,
  valueLabel: undefined,
  searchingText: 'Buscando…',
  moreText: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const valueId = useId()
const overlayTarget = useOverlayTarget()
const dropdownRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const query = ref('')

const isSearchable = computed(() => props.searchable || !!props.remoteSearch)
const remoteOptions = ref<Option[]>([])
const remoteHasMore = ref(false)
const searching = ref(false)
/** La opción elegida: con búsqueda remota puede no estar en los resultados de ahora. */
const picked = ref<Option | null>(null)
let searchSeq = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

/** Solo cuenta la última búsqueda: una respuesta vieja no pisa a una nueva. */
async function runRemoteSearch(q: string) {
  if (!props.remoteSearch) return
  const seq = ++searchSeq
  searching.value = true
  try {
    const result = await props.remoteSearch(q)
    if (seq !== searchSeq) return
    remoteOptions.value = result.options
    remoteHasMore.value = !!result.hasMore
  } catch {
    if (seq !== searchSeq) return
    remoteOptions.value = []
    remoteHasMore.value = false
  } finally {
    if (seq === searchSeq) searching.value = false
  }
}

watch(query, q => {
  if (!props.remoteSearch || !isOpen.value) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => runRemoteSearch(q.trim()), 250)
})

// El menú va teletransportado a <body> con posición `fixed`, así que calculamos
// su posición a partir del rect del botón. Se recalcula al abrir y en scroll/resize.
const menuStyle = ref<Record<string, string>>({})
const listMaxHeight = ref(320)

function updatePosition() {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const gap = 8
  const margin = 16 // aire respecto al borde de la ventana
  const spaceBelow = window.innerHeight - rect.bottom - gap - margin
  const spaceAbove = rect.top - gap - margin
  // Abre hacia arriba solo si abajo no cabe un menú razonable y arriba hay más sitio.
  const openUp = spaceBelow < 200 && spaceAbove > spaceBelow
  const avail = Math.max(120, openUp ? spaceAbove : spaceBelow)
  listMaxHeight.value = Math.min(320, avail - (isSearchable.value ? 56 : 0))
  const style: Record<string, string> = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
  if (openUp) style.bottom = `${window.innerHeight - rect.top + gap}px`
  else style.top = `${rect.bottom + gap}px`
  menuStyle.value = style
}

const selectedLabel = computed(() => {
  const selected =
    props.options.find(opt => opt.value === props.modelValue) ??
    remoteOptions.value.find(opt => opt.value === props.modelValue) ??
    (picked.value?.value === props.modelValue ? picked.value : null)
  if (selected) return selected.label
  if (props.modelValue !== '' && props.valueLabel) return props.valueLabel
  return props.placeholder
})

/** Normaliza para buscar sin distinguir mayúsculas ni acentos. */
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

const filteredOptions = computed(() => {
  const q = normalize(query.value.trim())
  const fixed =
    isSearchable.value && q
      ? props.options.filter(opt => normalize(opt.label).includes(q))
      : props.options
  return props.remoteSearch ? [...fixed, ...remoteOptions.value] : fixed
})

const triggerClasses = computed(() => {
  const base =
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-2xl text-sm sm:text-base flex items-center justify-between gap-2 transition-colors duration-200 outline-none'
  const normal = 'border-border-primary bg-surface text-text-primary'
  const active = 'border-primary bg-surface text-text-primary ring-2 ring-primary/20'
  const errorStyle = 'border-red-500 bg-surface text-text-primary ring-2 ring-red-500/20'
  const disabledStyle = 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'

  const state = props.disabled
    ? disabledStyle
    : isOpen.value
      ? active
      : props.error
        ? errorStyle
        : normal
  return [base, state].join(' ')
})

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

/**
 * Cierra el menú. Si el foco estaba dentro (teclado o buscador), vuelve al
 * botón: el menú se desmonta y, sin esto, el foco caería en <body> y el
 * siguiente Tab saldría del diálogo que lo contenga.
 */
// Con el menú abierto y el foco en el botón, Escape solo cierra el menú (no
// el diálogo que lo contiene); cerrado, deja pasar el evento.
function onTriggerEsc(event: KeyboardEvent) {
  if (!isOpen.value) return
  event.stopPropagation()
  closeMenu()
}

function closeMenu() {
  if (menuRef.value?.contains(document.activeElement)) triggerRef.value?.focus()
  isOpen.value = false
}

const selectOption = (option: Option) => {
  picked.value = option
  emit('update:modelValue', option.value)
  closeMenu()
}

// Reposiciona mientras esté abierto: el scroll ocurre en contenedores internos
// (el <main> del layout), por eso el listener va en captura para enterarnos.
function onReposition() {
  if (isOpen.value) updatePosition()
}

watch(isOpen, open => {
  if (open) {
    // Posiciona antes de pintar y engancha listeners de scroll/resize.
    nextTick(() => {
      updatePosition()
      if (isSearchable.value) searchRef.value?.focus()
    })
    if (props.remoteSearch) runRemoteSearch('')
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
  } else {
    query.value = ''
    clearTimeout(searchTimer)
    window.removeEventListener('scroll', onReposition, true)
    window.removeEventListener('resize', onReposition)
  }
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  window.removeEventListener('scroll', onReposition, true)
  window.removeEventListener('resize', onReposition)
})

// El menú vive fuera de `dropdownRef` (teleport), así que se ignora explícitamente
// para que hacer clic dentro del desplegable no lo cierre.
onClickOutside(
  dropdownRef,
  () => {
    isOpen.value = false
  },
  { ignore: [menuRef] }
)
</script>
