<template>
  <div ref="rootRef">
    <draggable
      v-model="local"
      item-key="id"
      tag="ul"
      handle=".admin-drag-handle"
      :disabled="locked"
      :animation="200"
      ghost-class="opacity-50"
      :scroll="true"
      :scroll-sensitivity="150"
      :scroll-speed="20"
      :force-fallback="true"
      fallback-class="dragging-card"
      class="divide-y divide-border-primary"
      @end="onEnd"
    >
      <template #item="{ element, index }">
        <li
          class="group flex items-start gap-2 px-4 py-3 transition-colors hover:bg-bg-secondary sm:items-center sm:gap-3"
          :data-sortable-id="element.id"
        >
          <!-- Asa de arrastre: aparece al pasar el ratón o al recibir el foco en
               escritorio y está siempre a la vista en pantallas táctiles. Con el
               teclado, las flechas arriba y abajo mueven la fila una posición;
               Espacio o Intro la cogen y la sueltan (para lectores de pantalla). -->
          <span
            class="flex h-8 w-4 shrink-0 items-center justify-center"
            :aria-hidden="locked || undefined"
          >
            <span
              v-if="!locked"
              role="button"
              tabindex="0"
              data-sortable-handle
              aria-keyshortcuts="Space Enter ArrowUp ArrowDown Escape"
              :aria-roledescription="t('admin.help.reorder_handle_role')"
              :aria-pressed="grabbedId === element.id"
              :aria-label="t('admin.help.reorder_handle', { title: itemLabel(element) })"
              class="admin-drag-handle flex h-full w-full cursor-grab items-center justify-center rounded text-text-secondary transition-[opacity,color] duration-200 hover:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 active:cursor-grabbing group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
              :title="t('admin.help.drag_to_reorder')"
              @keydown="onHandleKeydown($event, element)"
              @click="onHandleClick($event, element)"
              @blur="onHandleBlur"
            >
              <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="4" r="1.5" />
                <circle cx="11" cy="4" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="11" cy="12" r="1.5" />
              </svg>
            </span>
          </span>

          <slot name="leading" :item="element" :index="index" />

          <!-- En móvil el texto ocupa todo el ancho y los datos bajan a su línea. -->
          <div
            class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 sm:flex-nowrap sm:pt-0"
          >
            <div class="min-w-0 basis-full sm:flex-1 sm:basis-auto">
              <slot name="main" :item="element" :index="index" />
            </div>
            <div v-if="$slots.meta" class="flex flex-wrap items-center gap-1.5 sm:shrink-0">
              <slot name="meta" :item="element" :index="index" />
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <slot name="actions" :item="element" :index="index" />
          </div>
        </li>
      </template>
    </draggable>

    <!-- Anuncia la nueva posición tras mover una fila con el teclado. -->
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string }">
import type { Ref } from 'vue'
import draggable from 'vuedraggable'

/**
 * La lista ordenable del panel (artículos de una categoría, categorías):
 * filas separadas con asa de arrastre, con las mismas opciones de arrastre que
 * los enigmas de una misión.
 *
 * Al soltar se llama a `save` con los ids en su nuevo orden. Mientras tanto la
 * lista enseña ese orden; si `save` devuelve `false`, vuelve al que tenía. La
 * lista se resincroniza cada vez que cambian los `items` (tras recargar).
 *
 * Cada fila expone sus partes como ranuras: `leading` (icono), `main` (título
 * y resumen), `meta` (insignias y datos) y `actions` (botones). La fila lleva
 * `data-sortable-id` para que quien la use pueda devolverle el foco.
 *
 * El asa también se maneja con el teclado: con el foco en ella, las flechas
 * arriba y abajo mueven la fila una posición, se guarda con el mismo `save`
 * y la nueva posición se anuncia. Sigue el patrón de «coger y soltar»:
 * Espacio o Intro (o la activación de un lector de pantalla en modo
 * exploración) coge la fila y lo anuncia, y Espacio, Intro o Escape la
 * sueltan. Con el orden bloqueado no se enfoca.
 */
const props = defineProps<{
  items: T[]
  /** Orden bloqueado (lista incompleta o sin permiso): sin asa ni arrastre. */
  locked?: boolean
  /** El nombre de cada elemento, para el nombre accesible de su asa. */
  itemLabel: (item: T) => string
  save: (orderedIds: string[]) => Promise<boolean>
}>()

defineSlots<{
  leading?: (props: { item: T; index: number }) => unknown
  main?: (props: { item: T; index: number }) => unknown
  meta?: (props: { item: T; index: number }) => unknown
  actions?: (props: { item: T; index: number }) => unknown
}>()

const { t } = useI18n()

const local = ref<T[]>([]) as Ref<T[]>

watch(
  () => props.items,
  items => {
    local.value = [...items]
  },
  { immediate: true }
)

const rootRef = ref<HTMLElement | null>(null)
/** Un movimiento con teclado en curso: los demás se ignoran hasta que acabe. */
const moving = ref(false)
/** La fila cogida con Espacio o Intro, si hay alguna. */
const grabbedId = ref<string | null>(null)
const announcement = ref('')

/** Anuncia un texto aunque coincida con el anterior. */
async function announce(text: string) {
  announcement.value = ''
  await nextTick()
  announcement.value = text
}

/** Coge la fila o la suelta si ya estaba cogida. */
function toggleGrab(item: T) {
  const title = props.itemLabel(item)
  if (grabbedId.value === item.id) {
    grabbedId.value = null
    void announce(t('admin.help.reorder_dropped', { title }))
  } else {
    grabbedId.value = item.id
    void announce(t('admin.help.reorder_grabbed', { title }))
  }
}

/**
 * Teclas sobre el asa. Espacio o Intro cogen o sueltan la fila y Escape la
 * suelta. Flecha arriba o abajo la mueve una posición (en los extremos no hace
 * nada), guarda y devuelve el foco al asa de la fila movida.
 */
async function onHandleKeydown(event: KeyboardEvent, item: T) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    toggleGrab(item)
    return
  }
  if (event.key === 'Escape') {
    if (grabbedId.value !== item.id) return
    event.preventDefault()
    toggleGrab(item)
    return
  }
  const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
  if (!delta) return
  event.preventDefault()
  if (props.locked || moving.value) return
  const id = item.id
  const index = local.value.findIndex(entry => entry.id === id)
  const target = index + delta
  if (index < 0 || target < 0 || target >= local.value.length) return

  const next = [...local.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  local.value = next
  moving.value = true
  try {
    let ok = false
    try {
      ok = await props.save(next.map(entry => entry.id))
    } catch {
      ok = false
    }
    if (!ok) local.value = [...props.items]

    await nextTick()
    const position = local.value.findIndex(entry => entry.id === id) + 1
    if (ok && position > 0) {
      void announce(t('admin.help.moved_to_position', { position, total: local.value.length }))
    }
    rootRef.value
      ?.querySelector<HTMLElement>(`[data-sortable-id="${id}"] [data-sortable-handle]`)
      ?.focus()
  } finally {
    moving.value = false
  }
}

/**
 * Un lector de pantalla en modo exploración no envía las teclas, sino un clic
 * sin puntero (`detail` 0): lo tratamos como Espacio. Los clics del ratón no
 * cogen nada; el ratón arrastra.
 */
function onHandleClick(event: MouseEvent, item: T) {
  if (event.detail !== 0) return
  toggleGrab(item)
}

/** Al salir del asa se suelta la fila, salvo mientras se recoloca al moverla. */
function onHandleBlur() {
  if (!moving.value) grabbedId.value = null
}

async function onEnd(event: { oldIndex?: number; newIndex?: number }) {
  if (event.oldIndex === event.newIndex) return
  const ok = await props.save(local.value.map(item => item.id))
  if (!ok) local.value = [...props.items]
}
</script>

<style scoped>
/* La fila mientras se arrastra, como las tarjetas de enigma. */
.dragging-card {
  opacity: 0.9;
  box-shadow: 0 10px 40px rgb(0 0 0 / 0.15);
  transform: rotate(1deg);
  z-index: 9999;
  background-color: var(--color-surface);
}

/* Como las asas de los enigmas: en táctil el gesto es del arrastre, no del
   desplazamiento ni de la selección. */
.admin-drag-handle {
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>
