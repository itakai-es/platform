<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?:
    | 'default'
    | 'common'
    | 'rare'
    | 'epic'
    | 'legendary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'epica'
    | 'rara'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
})

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center font-medium rounded-full'

  // Variantes según ITAKAI Official Brand Colors. En las de fondo claro el
  // texto va en navy: el color del estado lo dan el fondo y el borde, y el
  // texto de 12-14 px mantiene el contraste mínimo (4,5:1).
  const variants = {
    default: 'bg-bg-tertiary text-text-primary',
    common: 'bg-bg-secondary text-text-primary border border-border-primary',

    // Rarities con colores ITAKAI (legacy - mantener para backward compatibility)
    rare: 'bg-sky-light text-text-primary border border-sky', // Sky blue
    epic: 'bg-purple-light text-text-primary border border-purple', // Purple brand
    legendary: 'bg-yellow-light text-text-primary border-2 border-yellow', // Yellow brand

    // Rarities ITAKAI (épica y rara mismo color #ac74fd)
    epica: 'bg-badge-epica text-badge-text-light', // Purple #ac74fd
    rara: 'bg-badge-rara text-badge-text-light', // Purple #ac74fd (mismo color)

    // Semantic states con colores ITAKAI
    success: 'bg-mint-light text-text-primary border border-mint', // Mint
    warning: 'bg-yellow-light text-text-primary border border-yellow', // Yellow
    danger: 'bg-red-light text-text-primary border border-red', // Red/pink
    info: 'bg-sky-light text-text-primary border border-sky', // Sky blue
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return [base, variants[props.variant], sizes[props.size]].join(' ')
})
</script>
