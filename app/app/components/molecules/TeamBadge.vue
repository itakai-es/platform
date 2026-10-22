<template>
  <span class="inline-flex min-w-0 items-center gap-2">
    <span
      class="flex flex-shrink-0 items-center justify-center rounded-full border border-navy-700/20 text-navy-700"
      :class="[look.soft, BOX[size]]"
      aria-hidden="true"
    >
      <component :is="emblemIcon" :class="ICON[size]" />
    </span>
    <span v-if="title" class="min-w-0 truncate font-semibold text-navy-700">{{ title }}</span>
    <slot />
  </span>
</template>

<script setup lang="ts">
import type { TeamColor, TeamEmblem } from '~/types/team.types'
import { teamColorOf, teamEmblemOf } from '~/utils/team-style'

/**
 * Un equipo en una línea: su emblema sobre su color y su nombre. El color nunca
 * va solo (lleva emblema y nombre), así que se distingue también con los modos
 * de daltonismo. La ranura va detrás del nombre (puntos, integrantes…).
 * Sin `title`, solo el emblema: para cuando el nombre ya va al lado con otra letra
 * (el resultado de la ruleta).
 */
const props = withDefaults(
  defineProps<{
    title: string
    color?: TeamColor | null
    emblem?: TeamEmblem | null
    /** Posición del equipo: da el color y el emblema si no tiene. */
    index?: number
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { color: null, emblem: null, index: 0, size: 'md' }
)

const BOX = { sm: 'h-6 w-6', md: 'h-9 w-9', lg: 'h-14 w-14' } as const
const ICON = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-8 w-8' } as const

const look = computed(() => teamColorOf(props.color, props.index))
const emblemIcon = computed(() => teamEmblemOf(props.emblem, props.index))
</script>
