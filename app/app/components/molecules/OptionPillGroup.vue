<template>
  <!-- Con enlaces es navegación (un `nav` con nombre); sin ellos, un grupo de
       conmutadores. La píldora es la misma en los dos casos. -->
  <component
    :is="navigates ? 'nav' : 'div'"
    class="grid gap-2"
    :class="fluid ? undefined : columnsClass"
    :style="fluid ? fluidStyle : undefined"
    :role="navigates ? undefined : 'group'"
    :aria-label="ariaLabel"
  >
    <component
      :is="option.to ? NuxtLink : 'button'"
      v-for="option in options"
      :key="option.value"
      v-bind="pillAttrs(option)"
      class="min-w-0 break-words hyphens-auto rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors"
      :class="
        modelValue === option.value
          ? 'border-navy-700 bg-navy-700 text-white'
          : 'border-border-primary bg-surface text-navy-700 hover:bg-gray-50'
      "
      @click="emit('update:modelValue', option.value)"
    >
      <slot name="option" :option="option" :selected="modelValue === option.value">
        {{ option.label }}
      </slot>
    </component>
  </component>
</template>

<script setup lang="ts" generic="T extends string">
/**
 * Grupo de opciones excluyentes en forma de píldoras.
 *
 * Es el patrón que ya usaba el selector de «Menú superior» del perfil, repetido
 * en las dos páginas de perfil; vive aquí para que cualquier ajuste corto
 * (accesibilidad, menú…) lo comparta en lugar de volver a copiarlo.
 *
 * Si las opciones llevan `to`, cada píldora es un enlace (se puede abrir en
 * otra pestaña) y la elegida se marca con `aria-current` en vez de
 * `aria-pressed`: cambia de página, no conmuta un ajuste.
 */
interface Option {
  value: T
  label: string
  to?: string
}

interface Props {
  modelValue: T
  options: Option[]
  /** Máximo de columnas de la rejilla. Por defecto, una por opción. */
  columns?: number
  /**
   * Rejilla que se adapta al hueco: como mucho `columns` columnas, menos si no
   * caben. Solo sirve dentro de un contenedor con ancho definido (un panel, una
   * ventana); en uno de ancho automático se quedaría en una columna.
   */
  fluid?: boolean
  /** Ancho mínimo de cada píldora en modo `fluid`. */
  minItemWidth?: string
  ariaLabel?: string
}

const props = defineProps<Props>()

const NuxtLink = resolveComponent('NuxtLink')
const route = useRoute()

const navigates = computed(() => props.options.some(option => option.to))

/**
 * Los atributos propios de cada píldora. En un enlace, «page» solo si es
 * exactamente la página actual; si no, la sección en la que se está.
 */
function pillAttrs(option: Option) {
  const selected = props.modelValue === option.value
  if (option.to) {
    return {
      to: option.to,
      'aria-current': selected ? (route.path === option.to ? 'page' : 'true') : undefined,
    }
  }
  return { type: 'button', 'aria-pressed': selected }
}

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

// Las clases van explícitas y no interpoladas: Tailwind escanea el fuente y no
// generaría `grid-cols-N` si el número se construyera en tiempo de ejecución.
const COLUMN_CLASSES: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

const columnsClass = computed(
  () => COLUMN_CLASSES[props.columns ?? props.options.length] ?? 'grid-cols-3'
)

/**
 * Modo `fluid`: en un hueco estrecho (un menú móvil, una ventana en el
 * teléfono, letra muy grande) pasa a menos columnas en vez de aplastar las
 * píldoras y cortar el texto. El mínimo va en rem, así que crece con el tamaño
 * de letra elegido. El hueco entre columnas es el de `gap-2` (0.5rem).
 */
const fluidStyle = computed(() => {
  const columns = Math.max(1, props.columns ?? props.options.length)
  const min = props.minItemWidth ?? '7rem'
  const fraction = `calc((100% - ${columns - 1} * 0.5rem) / ${columns})`
  return {
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, max(${min}, ${fraction})), 1fr))`,
  }
})
</script>
