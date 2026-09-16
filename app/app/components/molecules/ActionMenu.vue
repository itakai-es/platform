<template>
  <div ref="rootRef" class="relative inline-flex">
    <button
      ref="triggerRef"
      type="button"
      class="rounded-lg p-2 text-navy-700/70 transition-colors hover:bg-purple-light hover:text-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-1"
      :class="open && 'bg-purple-light text-navy-700'"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      @click="toggle"
      @keydown.down.prevent="openAt('first')"
      @keydown.up.prevent="openAt('last')"
      @keydown.esc="onTriggerEsc"
    >
      <EllipsisVerticalIcon class="h-4 w-4" aria-hidden="true" />
    </button>

    <!-- Se teletransporta a la capa de superposición y se posiciona `fixed`
         respecto al disparador: así ninguna tarjeta ni contenedor con scroll
         lo recorta, y dentro de un modal sigue formando parte del diálogo. -->
    <Teleport :to="overlayTarget" defer>
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          :id="menuId"
          ref="menuRef"
          role="menu"
          :aria-label="label"
          :style="menuStyle"
          class="fixed z-50 w-44 rounded-xl border border-border-primary bg-surface py-1 shadow-lg"
          @keydown="onMenuKeydown"
        >
          <template
            v-for="(item, index) in items"
            :key="isDivider(item) ? `divider-${index}` : item.id"
          >
            <div
              v-if="isDivider(item)"
              role="separator"
              class="my-1 border-t border-border-primary"
            />
            <!-- Las opciones deshabilitadas siguen siendo alcanzables con las
                 flechas (se anuncian como no disponibles), pero no hacen nada. -->
            <button
              v-else
              type="button"
              role="menuitem"
              tabindex="-1"
              data-menu-item
              :aria-disabled="item.disabled || undefined"
              :class="itemClasses(item)"
              @click="choose(item)"
            >
              <component
                :is="item.icon"
                v-if="item.icon"
                class="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{{ item.label }}</span>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { EllipsisVerticalIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'
import type { ActionMenuDivider, ActionMenuItem, ActionMenuOption } from '~/types/action-menu.types'

/**
 * El menú de acciones «⋮» de las filas y tarjetas del panel. Botón de solo
 * icono (su nombre accesible es `label`) que abre una lista de opciones.
 *
 * Teclado como en la guía de ARIA para menús: flecha abajo/arriba en el
 * disparador lo abre en la primera/última opción; dentro, las flechas, Inicio
 * y Fin mueven el foco; Escape cierra y devuelve el foco al disparador; Tab
 * cierra y deja seguir. Un clic fuera también lo cierra.
 *
 * Al elegir una opción el menú se cierra y el foco vuelve al disparador antes
 * de emitir `select`: quien la gestione puede moverlo después a otro sitio.
 */
const props = defineProps<{
  label: string
  items: ActionMenuItem[]
}>()

const emit = defineEmits<{ select: [id: string] }>()

const menuId = useId()
const overlayTarget = useOverlayTarget()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const open = ref(false)
const menuStyle = ref<Record<string, string>>({})

function isDivider(item: ActionMenuItem): item is ActionMenuDivider {
  return 'divider' in item
}

function itemClasses(item: ActionMenuOption) {
  return [
    // El anillo interior marca la opción con foco al moverse con el teclado.
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset',
    item.danger
      ? 'text-red hover:bg-red/10 focus:bg-red/10 focus-visible:ring-red'
      : 'text-text-primary hover:bg-surface-hover focus:bg-surface-hover focus-visible:ring-navy-700',
    item.disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : '',
  ]
}

const GAP = 4
const MARGIN = 16

/** Debajo del disparador, alineado a su derecha; arriba si abajo no cabe. */
function updatePosition() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const height = menuRef.value?.offsetHeight ?? 0
  const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN
  const openUp = height > spaceBelow && rect.top - GAP - MARGIN > spaceBelow
  const style: Record<string, string> = {
    right: `${Math.max(MARGIN, window.innerWidth - rect.right)}px`,
  }
  if (openUp) style.bottom = `${window.innerHeight - rect.top + GAP}px`
  else style.top = `${rect.bottom + GAP}px`
  menuStyle.value = style
}

function menuItems() {
  return Array.from(menuRef.value?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? [])
}

function focusItem(position: 'first' | 'last' | number) {
  const list = menuItems()
  if (!list.length) return
  const index =
    position === 'first'
      ? 0
      : position === 'last'
        ? list.length - 1
        : (position + list.length) % list.length
  list[index]?.focus()
}

async function openAt(position: 'first' | 'last') {
  open.value = true
  await nextTick()
  updatePosition()
  focusItem(position)
}

function toggle() {
  if (open.value) close()
  else openAt('first')
}

/** Cierra; con `restoreFocus`, el foco vuelve al disparador. */
function close({ restoreFocus = false } = {}) {
  if (!open.value) return
  open.value = false
  if (restoreFocus) triggerRef.value?.focus()
}

function onTriggerEsc(event: KeyboardEvent) {
  if (!open.value) return
  // Con el menú abierto, Escape solo lo cierra (no el diálogo que lo contenga).
  event.stopPropagation()
  close({ restoreFocus: true })
}

function onMenuKeydown(event: KeyboardEvent) {
  const list = menuItems()
  const current = list.indexOf(document.activeElement as HTMLElement)
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusItem(current + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusItem(current < 0 ? 'last' : current - 1)
      break
    case 'Home':
      event.preventDefault()
      focusItem('first')
      break
    case 'End':
      event.preventDefault()
      focusItem('last')
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      close({ restoreFocus: true })
      break
    case 'Tab':
      // El foco vuelve al disparador y el Tab sigue su camino desde ahí.
      close({ restoreFocus: true })
      break
  }
}

function choose(item: ActionMenuOption) {
  if (item.disabled) return
  close({ restoreFocus: true })
  emit('select', item.id)
}

function onReposition() {
  if (open.value) updatePosition()
}

watch(open, value => {
  if (value) {
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
  } else {
    window.removeEventListener('scroll', onReposition, true)
    window.removeEventListener('resize', onReposition)
  }
})

// Si las opciones cambian con el menú abierto (p. ej. tras recargar), se recoloca.
watch(
  () => props.items,
  () => nextTick(onReposition)
)

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onReposition, true)
  window.removeEventListener('resize', onReposition)
})

// El menú vive fuera de `rootRef` (teleport): hacer clic dentro no lo cierra.
onClickOutside(rootRef, () => close(), { ignore: [menuRef] })
</script>
