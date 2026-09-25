<template>
  <div class="border-b border-navy-700/10">
    <!-- Con `idPrefix` son pestañas de verdad (tablist): cada una controla su
         panel y se recorren con las flechas. Sin él, una fila de botones. -->
    <component
      :is="idPrefix ? 'div' : 'nav'"
      class="-mb-px flex gap-6 overflow-x-auto"
      :role="idPrefix ? 'tablist' : undefined"
      :aria-label="ariaLabel ?? 'Tabs'"
    >
      <button
        v-for="(tab, index) in tabs"
        :id="idPrefix ? tabElementId(idPrefix, tab.id) : undefined"
        :key="tab.id"
        ref="tabRefs"
        type="button"
        :class="[
          'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base transition-all duration-200',
          activeTab === tab.id
            ? 'border-student text-navy-700 font-semibold'
            : 'border-transparent text-navy-700/70 hover:text-navy-700/80 hover:border-navy-700/30',
        ]"
        :role="idPrefix ? 'tab' : undefined"
        :aria-selected="idPrefix ? activeTab === tab.id : undefined"
        :aria-controls="idPrefix ? tabPanelId(idPrefix, tab.id) : undefined"
        :tabindex="idPrefix && activeTab !== tab.id ? -1 : undefined"
        :aria-current="!idPrefix && activeTab === tab.id ? 'page' : undefined"
        @click="handleTabClick(tab.id)"
        @keydown="onKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </component>
  </div>
</template>

<script setup lang="ts">
import { tabElementId, tabPanelId } from '~/utils/tabs'

export interface Tab {
  id: string
  label: string
}

interface Props {
  tabs: Tab[]
  activeTab: string
  variant?: 'default' | 'underline'
  /**
   * Prefijo de ids para usarlas como pestañas accesibles. La pestaña lleva el
   * id `tabElementId(prefijo, id)` y controla el panel `tabPanelId(prefijo, id)`,
   * que pone quien las usa (con `role="tabpanel"` y `aria-labelledby`).
   */
  idPrefix?: string
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  idPrefix: undefined,
  ariaLabel: undefined,
})

interface Emits {
  (e: 'tab-change', tabId: string): void
}

const emit = defineEmits<Emits>()

const tabRefs = ref<HTMLButtonElement[]>([])

const handleTabClick = (tabId: string) => {
  emit('tab-change', tabId)
}

/**
 * Teclado de las pestañas: flechas a los lados, Inicio y Fin. La pestaña a la
 * que se llega se activa y recibe el foco.
 */
function onKeydown(event: KeyboardEvent, index: number) {
  if (!props.idPrefix) return
  const last = props.tabs.length - 1
  const targets: Record<string, number> = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowLeft: index === 0 ? last : index - 1,
    Home: 0,
    End: last,
  }
  const next = targets[event.key]
  if (next === undefined) return
  event.preventDefault()
  const tab = props.tabs[next]
  if (!tab) return
  emit('tab-change', tab.id)
  tabRefs.value[next]?.focus()
}
</script>

<style scoped>
/* Hide scrollbar but keep functionality */
[role='tablist']::-webkit-scrollbar,
nav::-webkit-scrollbar {
  display: none;
}
[role='tablist'],
nav {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
