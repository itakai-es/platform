<template>
  <!-- Solo dibujo: lo que significa va siempre escrito al lado. -->
  <span
    class="inline-flex flex-shrink-0 items-center justify-center rounded-full"
    :class="[TONE[tone], SIZE[size].box]"
    aria-hidden="true"
  >
    <component :is="icon" v-bind="iconProps" :class="SIZE[size].icon" />
  </span>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Un icono en blanco dentro de un círculo macizo de color de marca: el patrón de
 * los estados de la app (el del mapa de misiones, la salida y la meta) para dar
 * presencia a una cifra (`StatTile`), al motivo de una dificultad (`SignalList`)
 * o a cada punto de una línea de tiempo (`RecentActivityCard`).
 *
 * - `tone`: `navy` (azul marino, por defecto) o `purple` (el morado oscuro de
 *   marca, que da contraste con el blanco). De token: lo cambian las paletas de
 *   daltonismo y el alto contraste.
 * - `size`: `xs` (para ir encima de un avatar), `sm`, `md` y `lg`, en rem.
 * - `iconProps`: lo que haga falta pasarle al icono (`{ mono: true }` para la
 *   estrella de la XP, que así sale en blanco).
 *
 * Va oculto al lector de pantalla: el texto que acompaña dice lo mismo.
 */
type Tone = 'navy' | 'purple'
type Size = 'xs' | 'sm' | 'md' | 'lg'

withDefaults(
  defineProps<{
    icon: Component
    tone?: Tone
    size?: Size
    iconProps?: Record<string, unknown>
  }>(),
  { tone: 'navy', size: 'md', iconProps: undefined }
)

const TONE: Record<Tone, string> = {
  navy: 'bg-navy-700 text-white',
  purple: 'bg-purple-dark text-white',
}

const SIZE: Record<Size, { box: string; icon: string }> = {
  xs: { box: 'h-5 w-5', icon: 'h-3 w-3' },
  sm: { box: 'h-7 w-7', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { box: 'h-12 w-12', icon: 'h-6 w-6' },
}
</script>
