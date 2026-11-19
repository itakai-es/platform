<template>
  <div :class="gridClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * CardGrid - Consistent grid layout for card components
 *
 * Use this for grids of MissionCards, ClassCards, StudentCards, etc.
 * Ensures consistent spacing (gap-6 = 24px) across the app.
 *
 * Columns:
 * - 'auto': 1 col mobile, 2 tablet, 3 desktop (default)
 * - '2': 1 col mobile, 2 tablet+
 * - '2x2': Always 2 cols (for stats grids)
 * - '3': 1 col hasta desktop, 3 desde ahí: tres tarjetas, siempre en filas completas
 * - '3-fixed': Always 3 cols (for small stat cards)
 * - '4': 1 col mobile, 2 tablet, 4 2xl: cuatro tarjetas, siempre en filas completas
 * - '6': 2 col mobile, 3 tablet, 4 desktop, 5 lg, 6 xl (for badges)
 * - 'tiles': cifras (`StatTile`) sin tarjetas descolgadas: 2 por fila en el móvil
 *   y 3 desde `lg`, y las de la última fila se reparten todo el ancho. Con 4
 *   cifras, 4 por fila en una tarjeta ancha (`tiles-4`).
 */
interface Props {
  cols?: 'auto' | '2' | '2-wide' | '2x2' | '3' | '3-fixed' | '4' | '6' | 'tiles' | 'tiles-4'
  flex?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cols: 'auto',
  flex: false,
})

const gridClasses = computed(() => {
  // Las cifras, más juntas en el móvil: a 375 px cada hueco cuenta.
  const base =
    props.cols.startsWith('tiles') || props.cols === '2x2' ? 'grid gap-3 sm:gap-6' : 'grid gap-6'

  const colsMap: Record<string, string> = {
    auto: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    '2': 'grid-cols-1 md:grid-cols-2',
    '2-wide': 'grid-cols-1 xl:grid-cols-2',
    '2x2': 'grid-cols-2',
    '3': 'grid-cols-1 lg:grid-cols-3',
    '3-fixed': 'grid-cols-1 sm:grid-cols-3',
    '4': 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-4',
    '6': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    // Las clases van enteras: Tailwind solo genera las que lee.
    tiles:
      'grid-cols-2 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2 lg:grid-cols-6 lg:[&>*]:col-span-2 lg:[&>*:last-child:nth-child(3n+1)]:col-span-6 lg:[&>*:last-child:nth-child(3n+2)]:col-span-3 lg:[&>*:nth-last-child(2):nth-child(3n+1)]:col-span-3',
    'tiles-4': 'grid-cols-2 lg:grid-cols-4',
  }

  const flexClass = props.flex ? 'flex-1' : ''

  return `${base} ${colsMap[props.cols]} ${flexClass}`.trim()
})
</script>
