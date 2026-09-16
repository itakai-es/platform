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
    <span
      v-if="badge"
      class="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full"
      :class="badgeClass"
    >
      {{ badge }}
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, resolveComponent } from 'vue'
import { useRoute } from 'vue-router'

// Sin `to` el elemento es una acción (p. ej. cerrar sesión): se pinta como
// botón y el clic llega por el listener que ponga quien lo use.
const NuxtLink = resolveComponent('NuxtLink')

interface Props {
  to?: string
  label: string
  icon: any
  badge?: string | number
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger'
  exact?: boolean
  indent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  badge: undefined,
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

.nav-item:focus,
.nav-item:focus-visible {
  outline: none !important;
  box-shadow: none !important;
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
