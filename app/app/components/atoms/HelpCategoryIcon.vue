<template>
  <span
    class="flex shrink-0 items-center justify-center"
    :class="[SIZES[size].box, onCard ? 'bg-white/60' : '']"
    :style="onCard ? undefined : { backgroundColor: `var(--color-card-${helpCardType(accent)})` }"
  >
    <component :is="helpIcon(icon)" class="text-navy-700" :class="SIZES[size].icon" />
  </span>
</template>

<script setup lang="ts">
import { helpCardType } from '~/utils/help-accents'
import { helpIcon } from '~/utils/help-icons'

/**
 * La tesela con el icono de una categoría del centro de ayuda: en el panel de
 * administración, en las listas de artículos y en las cabeceras de categoría.
 *
 * Sobre su propio color, salvo con `onCard`: encima de una tarjeta que ya
 * lleva el color de la categoría el fondo sería invisible, así que va en
 * blanco translúcido. El radio es el mismo en todos los tamaños salvo en el
 * más pequeño, donde se reduce para que no quede un círculo.
 */
type Size = 'sm' | 'md' | 'lg' | 'xl'

withDefaults(
  defineProps<{
    icon?: string | null
    accent?: string | null
    size?: Size
    onCard?: boolean
  }>(),
  { icon: null, accent: null, size: 'sm', onCard: false }
)

const SIZES: Record<Size, { box: string; icon: string }> = {
  sm: { box: 'h-6 w-6 rounded-lg', icon: 'h-3.5 w-3.5' },
  md: { box: 'h-9 w-9 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
  xl: { box: 'h-12 w-12 rounded-xl', icon: 'h-7 w-7' },
}
</script>
