<template>
  <div class="relative">
    <!-- Flecha izquierda: flota sobre las pestañas (no ocupa ancho) y solo
         aparece cuando queda scroll en ese sentido. El degradado navy hace que
         las pestañas se desvanezcan bajo ella en vez de quedar cortadas. -->
    <div
      v-if="canScrollLeft"
      class="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pr-8 bg-gradient-to-r from-navy-700 via-navy-700 to-transparent"
    >
      <button
        type="button"
        :class="arrowClass"
        :aria-label="t('common.actions.scroll_left')"
        @click="scrollByStep(-1)"
      >
        <ChevronLeftIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Pestañas como NuxtLink: cada una tiene su URL real. El scroll-padding
         evita que una pestaña quede parada justo debajo de una flecha. -->
    <div
      ref="scroller"
      class="flex gap-0 overflow-x-auto scrollbar-none scroll-px-12"
      @scroll="sync"
    >
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="tabHref(tab.id)"
        :data-active="activeTab === tab.id"
        :class="[
          'px-3 sm:px-4 md:px-6 lg:px-8 py-3 text-sm sm:text-base font-medium transition-colors flex items-center gap-2 rounded-t-2xl whitespace-nowrap flex-shrink-0 hover:opacity-100',
          activeTab === tab.id
            ? 'bg-surface text-navy-700'
            : 'text-white/70 hover:text-white hover:bg-white/10',
        ]"
      >
        <component :is="tab.icon" v-if="menuDisplay !== 'text'" class="w-5 h-5" />
        <span v-if="menuDisplay !== 'icon'" :class="menuDisplay === 'both' ? 'hidden sm:inline' : ''"
          >{{ tab.label }}</span
        >
      </NuxtLink>
    </div>

    <!-- Flecha derecha -->
    <div
      v-if="canScrollRight"
      class="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-end pl-8 bg-gradient-to-l from-navy-700 via-navy-700 to-transparent"
    >
      <button
        type="button"
        :class="arrowClass"
        :aria-label="t('common.actions.scroll_right')"
        @click="scrollByStep(1)"
      >
        <ChevronRightIcon class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()

// Preferencia de usuario: icono / texto / ambos en las pestañas.
const menuDisplay = useMenuDisplay()

const props = defineProps<{
  /** Pestañas a renderizar como NuxtLink. */
  tabs: Array<{ id: string; label: string; icon: Component }>
  /** ID de la pestaña activa (la del segmento actual de la URL). */
  activeTab: string
  /** Constructor del destino (:to) de una tab por su id (p. ej. tabId => `/.../id/tabId`). */
  tabHref: (tabId: string) => RouteLocationRaw
}>()

// El contenedor del degradado es pointer-events-none para no bloquear las
// pestañas que quedan debajo; el botón vuelve a activarlos sobre sí mismo.
const arrowClass =
  'pointer-events-auto flex flex-shrink-0 items-center justify-center w-8 h-8 rounded-full bg-navy-dark text-white shadow-lg ring-1 ring-white/20 transition-colors hover:bg-navy-darker'

const scroller = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

/** Recalcula en qué extremos queda scroll disponible (y por tanto qué flecha se ve). */
function sync() {
  const el = scroller.value
  if (!el) return
  // Margen de 1px: los anchos fraccionarios dejan restos que no son scroll real.
  const max = el.scrollWidth - el.clientWidth
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft < max - 1
}

/** Desplaza ~80% del ancho visible en la dirección indicada (-1 izq, 1 der). */
function scrollByStep(direction: number) {
  const el = scroller.value
  if (!el) return
  el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
}

/** Centra la pestaña activa para que nunca quede escondida tras un cambio de ruta. */
function scrollActiveIntoView() {
  const el = scroller.value
  if (!el) return
  const active = el.querySelector<HTMLElement>('[data-active="true"]')
  active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
}

let observer: ResizeObserver | null = null

onMounted(() => {
  sync()
  if (typeof ResizeObserver !== 'undefined' && scroller.value) {
    observer = new ResizeObserver(sync)
    observer.observe(scroller.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

// Al cambiar las pestañas (nº o etiquetas, p. ej. al cambiar de idioma) o el modo
// de menú cambia el ancho total: hay que recalcular tras el repintado.
watch(
  () => [props.tabs.map(tab => tab.label).join('|'), menuDisplay.value],
  () => nextTick(sync),
)
watch(
  () => props.activeTab,
  () => nextTick(scrollActiveIntoView),
)
</script>
