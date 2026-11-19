<template>
  <div :class="cardClasses" :style="cardStyle">
    <div v-if="$slots.header" class="border-b border-border-primary pb-4 mb-4">
      <slot name="header" />
    </div>

    <div :class="contentClasses">
      <slot />
    </div>

    <div v-if="$slots.footer" class="border-t border-border-primary pt-4 mt-4">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Card component with consistent styling
 *
 * Gap and Padding are aligned for visual consistency:
 * - 'none': No spacing/padding
 * - 'sm': 16px (p-4 / space-y-4)
 * - 'md': 24px (p-6 / space-y-6) - DEFAULT
 * - 'lg': 32px (p-8 / space-y-8)
 *
 * Use `flex` prop when Card is in a grid and needs to stretch:
 * - Adds flex-col to card and flex-1 to content
 * - Allows content to fill the card height
 */
interface Props {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  gap?: 'none' | 'sm' | 'md' | 'lg'
  type: 'ia' | 'stats' | 'pending' | 'clases' | 'info' | 'settings' | 'xpbar'
  flex?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hoverable: false,
  padding: 'md',
  gap: 'md',
  flex: false,
})

// Mapa de colores por tipo (usa CSS variables para respetar el tema activo)
const colorMap: Record<string, string> = {
  ia: 'var(--color-card-ia)',
  stats: 'var(--color-card-stats)',
  pending: 'var(--color-card-pending)',
  clases: 'var(--color-card-clases)',
  info: 'var(--color-card-info)',
  settings: '#F3F4F6', // Gris claro neutro (sin tema)
  xpbar: 'var(--color-card-xpbar)', // El de la barra de nivel de la clase
}

const cardClasses = computed(() => {
  const base = 'rounded-2xl shadow-lg transition-all duration-200 min-w-0 max-w-full'
  const hover = props.hoverable ? 'hover:shadow-xl cursor-pointer' : ''
  const flexClass = props.flex ? 'flex flex-col h-full' : ''

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return [base, hover, paddings[props.padding], flexClass].join(' ')
})

const contentClasses = computed(() => {
  // When flex is enabled, use gap instead of space-y for proper flex stretching
  if (props.flex) {
    const flexGaps: Record<string, string> = {
      none: '',
      sm: 'gap-4', // 16px
      md: 'gap-6', // 24px
      lg: 'gap-8', // 32px
    }
    return `flex-1 flex flex-col ${flexGaps[props.gap]}`
  }

  // Gap matches padding for consistent visual rhythm (non-flex cards)
  const gaps: Record<string, string> = {
    none: '',
    sm: 'space-y-4', // 16px - matches p-4
    md: 'space-y-6', // 24px - matches p-6
    lg: 'space-y-8', // 32px - matches p-8
  }

  return gaps[props.gap]
})

const cardStyle = computed(() => {
  const color = colorMap[props.type]
  if (!color) return {}

  return {
    backgroundColor: color,
    borderLeft: 'var(--card-accent-left) solid var(--color-card-accent)',
  }
})
</script>
