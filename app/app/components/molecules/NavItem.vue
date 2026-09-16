<template>
  <component
    :is="to ? NuxtLink : 'button'"
    v-bind="to ? { to } : { type: 'button' }"
    class="nav-item group"
    :class="[
      { 'nav-item-active': isActive },
      { 'nav-item-indent': indent },
      { 'w-full text-left': !to },
    ]"
  >
    <component
      :is="icon"
      class="nav-item-icon"
      :class="isActive ? 'text-indigo-900' : 'text-gray-600 group-hover:text-indigo-900'"
    />
    <span
      class="nav-item-label"
      :class="
        isActive ? 'text-indigo-900 font-semibold' : 'text-gray-700 group-hover:text-indigo-900'
      "
    >
      {{ label }}
    </span>
    <!-- Con `badgeLabel` el lector oye «Avisos, 3 sin leer» y no el número pintado. -->
    <template v-if="badge">
      <span v-if="badgeLabel" class="sr-only">, {{ badgeLabel }}</span>
      <span
        class="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full"
        :class="badgeClass"
        :aria-hidden="badgeLabel ? 'true' : undefined"
      >
        {{ formatUnreadBadge(badge) }}
      </span>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed, resolveComponent } from 'vue'
import { useRoute } from 'vue-router'
import { formatUnreadBadge } from '~/utils/notifications'

// Sin `to` el elemento es una acción (p. ej. cerrar sesión): se pinta como
// botón y el clic llega por el listener que ponga quien lo use.
const NuxtLink = resolveComponent('NuxtLink')

interface Props {
  to?: string
  label: string
  icon: any
  /** Contador junto a la etiqueta; con 0 no se pinta y a partir de 100 sale «99+». */
  badge?: number
  /** Texto accesible del contador, ya traducido (p. ej. «3 sin leer»). */
  badgeLabel?: string
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger'
  exact?: boolean
  indent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  badge: undefined,
  badgeLabel: undefined,
  badgeVariant: 'primary',
  exact: false,
  indent: false,
})

const route = useRoute()

const isActive = computed(() => {
  if (!props.to) return false

  if (props.exact) {
    return route.path === props.to
  }

  // Special handling: if we're on a mission detail page (nested under classes),
  // only mark "Misiones" as active, not "Mis Clases"
  const isMissionDetailPage = route.path.includes('/clases/') && route.path.includes('/misiones/')

  if (isMissionDetailPage) {
    // If this nav item is for "classes", don't mark it active on mission pages
    if (props.to.endsWith('/clases')) {
      return false
    }
    // If this nav item is for "missions", mark it active
    if (props.to.endsWith('/misiones')) {
      return true
    }
  }

  return route.path.startsWith(props.to)
})

// `primary` (blanco sobre azul noche) es la que da contraste de sobra con
// texto de 12 px; las demás variantes no llegan a 4,5:1 con blanco.
const badgeClass = computed(() => {
  const variants = {
    primary: 'bg-primary text-text-inverse',
    success: 'bg-success text-text-inverse',
    warning: 'bg-warning text-text-inverse',
    danger: 'bg-error text-text-inverse',
  }
  return variants[props.badgeVariant]
})
</script>

<style scoped>
.nav-item {
  @apply flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200;
  @apply hover:bg-gray-50 hover:opacity-100;
  outline: none !important;
}

/* Sin contorno al pulsar con el ratón, pero con anillo al llegar con teclado. */
.nav-item:focus:not(:focus-visible) {
  outline: none !important;
  box-shadow: none !important;
}

.nav-item:focus-visible {
  @apply ring-2 ring-inset ring-navy-700;
}

.nav-item-active {
  background-color: #e8e4f3;
}

.nav-item-indent {
  @apply pl-12;
}

.nav-item-icon {
  @apply w-5 h-5 transition-colors duration-200 flex-shrink-0;
}

.nav-item-label {
  @apply text-sm font-medium transition-colors duration-200;
}
</style>
