<template>
  <span
    ref="triggerRef"
    class="relative inline-flex"
    @mouseenter="onEnter"
    @mouseleave="show = false"
    @focusin="onEnter"
    @focusout="show = false"
  >
    <slot />
    <Teleport :to="overlayTarget" defer>
      <Transition name="tooltip-fade">
        <span
          v-if="show && hasContent"
          ref="tooltipRef"
          role="tooltip"
          class="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-full rounded-lg shadow-lg"
          :class="[
            variant === 'light' ? 'bg-white' : 'bg-navy-700',
            $slots.content
              ? 'p-1'
              : ['px-2.5 py-1 text-xs font-medium whitespace-nowrap', variant === 'light' ? 'text-navy-700' : 'text-white'],
          ]"
          :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
        >
          <slot name="content">{{ text }}</slot>
          <span
            class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent"
            :class="variant === 'light' ? 'border-t-white' : 'border-t-navy-700'"
          />
        </span>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ text?: string; variant?: 'dark' | 'light' }>(), {
  variant: 'dark',
})

const slots = useSlots()
// Dentro de un modal, su capa; fuera, el body (ver `useOverlayTarget`).
const overlayTarget = useOverlayTarget()
const hasContent = computed(() => !!props.text || !!slots.content)

const show = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })

// Teleportado al body con posición fija para que ningún contenedor con
// overflow-hidden lo recorte. Centrado y 8px por encima del elemento,
// ajustado para no salirse de los bordes del viewport.
async function onEnter() {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  pos.value = { top: rect.top - 8, left: rect.left + rect.width / 2 }
  show.value = true

  await nextTick()
  const tip = tooltipRef.value
  if (!tip) return
  const half = tip.offsetWidth / 2
  const margin = 8
  const min = margin + half
  const max = window.innerWidth - margin - half
  if (min <= max) {
    pos.value = { ...pos.value, left: Math.min(Math.max(pos.value.left, min), max) }
  }
}
</script>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.12s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
