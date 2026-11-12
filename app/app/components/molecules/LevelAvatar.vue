<template>
  <!-- El anillo es solo dibujo: el nivel y su XP van escritos al lado. -->
  <ProgressRing
    :value="percentFraction(progress)"
    :stroke="RING[size].stroke"
    :tone="tone"
    :class="RING[size].box"
    :arc-testid="arcTestid"
  >
    <Avatar :src="src" :name="name" :seed="seed" :size="size" />
  </ProgressRing>
</template>

<script setup lang="ts">
import { percentFraction } from '~/utils/progress-ring'

/**
 * El avatar de un estudiante dentro del anillo de su nivel: lo lleno es lo que
 * lleva del nivel hacia el siguiente. En la cabecera de la página del estudiante
 * (profesorado) y en la barra de nivel de la clase del alumnado (`ClassXPBar`).
 *
 * El nivel, su título y la XP que lleva van siempre escritos al lado: el anillo
 * no dice nada que no esté en texto. Se llena al aparecer, salvo con «Reducir
 * movimiento».
 *
 * - `progress`: de 0 a 100 (en el último nivel, 100).
 * - `size`: el del `Avatar` (`sm`, `md` o `lg`); el anillo va alrededor.
 */
type Size = 'sm' | 'md' | 'lg'

withDefaults(
  defineProps<{
    src?: string | null
    name?: string | null
    seed?: string | null
    progress: number
    size?: Size
    tone?: 'navy' | 'purple'
    arcTestid?: string
  }>(),
  { src: null, name: null, seed: null, size: 'md', tone: 'purple', arcTestid: undefined }
)

// Las clases van enteras: Tailwind solo genera las que lee. El hueco entre el
// avatar y el trazo, unos 2 px en cada tamaño.
const RING: Record<Size, { box: string; stroke: number }> = {
  sm: { box: 'h-16 w-16', stroke: 8 },
  md: { box: 'h-[4.75rem] w-[4.75rem]', stroke: 7 },
  lg: { box: 'h-32 w-32', stroke: 6 },
}
</script>
