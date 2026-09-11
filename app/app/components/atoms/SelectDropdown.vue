<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger Button -->
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      :class="triggerClasses"
      @click="toggleDropdown"
    >
      <span class="truncate">{{ selectedLabel }}</span>
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
    <Teleport to="body">
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
        >
          <!-- Buscador (opcional): útil en listas largas (provincias, asignaturas…) -->
          <div v-if="searchable" class="border-b border-gray-100 p-2">
            <input
              ref="searchRef"
              v-model="query"
              type="text"
              :placeholder="searchPlaceholder"
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
            <span :class="modelValue !== option.value ? 'ml-7' : ''">
              {{ option.label }}
            </span>
          </button>
          <p
            v-if="searchable && filteredOptions.length === 0"
            class="px-4 py-2.5 text-sm text-text-secondary"
          >
            {{ noResultsText }}
          </p>
          </div>
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
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Seleccionar...',
  disabled: false,
  searchable: false,
  searchPlaceholder: 'Buscar...',
  noResultsText: 'Sin resultados',
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const dropdownRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const query = ref('')

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
  listMaxHeight.value = Math.min(320, avail - (props.searchable ? 56 : 0))
  const style: Record<string, string> = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
  if (openUp) style.bottom = `${window.innerHeight - rect.top + gap}px`
  else style.top = `${rect.bottom + gap}px`
  menuStyle.value = style
}

const selectedLabel = computed(() => {
  const selected = props.options.find(opt => opt.value === props.modelValue)
  return selected?.label || props.placeholder
})

/** Normaliza para buscar sin distinguir mayúsculas ni acentos. */
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

const filteredOptions = computed(() => {
  if (!props.searchable || !query.value.trim()) return props.options
  const q = normalize(query.value.trim())
  return props.options.filter(opt => normalize(opt.label).includes(q))
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

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value)
  isOpen.value = false
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
      if (props.searchable) searchRef.value?.focus()
    })
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
  } else {
    query.value = ''
    window.removeEventListener('scroll', onReposition, true)
    window.removeEventListener('resize', onReposition)
  }
})

onBeforeUnmount(() => {
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
