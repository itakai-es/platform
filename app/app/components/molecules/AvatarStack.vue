<template>
  <!-- Los avatares, unos sobre otros, y «+N» con el resto. Cada avatar dice el
       nombre al lector de pantalla y, al pasar el ratón, en su `title`. -->
  <!-- Si no cabe (pantalla estrecha, letra grande), sigue en otra línea; el
       margen de la izquierda compensa el solape del primero de cada línea. -->
  <ul class="flex flex-wrap items-center gap-y-1" :class="PAD[size]" :aria-label="label">
    <li
      v-for="person in stack.shown"
      :key="person.id"
      class="rounded-full ring-2 ring-white"
      :class="OVERLAP[size]"
      :title="person.name"
    >
      <Avatar
        :src="person.avatar"
        :name="person.name"
        :seed="person.seed"
        :label="person.name"
        :size="size"
      />
    </li>
    <li
      v-if="stack.more > 0"
      class="flex items-center justify-center rounded-full bg-navy-700 font-bold text-white ring-2 ring-white"
      :class="[OVERLAP[size], MORE[size]]"
      :title="rest || undefined"
    >
      <span aria-hidden="true">+{{ formatNumber(stack.more) }}</span>
      <span class="sr-only">{{ t('common.mission_map.detail.completed_more', { n: stack.more }) }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { avatarStack } from '~/utils/avatar'
import { formatConjunction } from '~/utils/list-format'

/**
 * Una pila de avatares de personas, como mucho `max` huecos: si son más, el
 * último es «+N», que dice al pasar el ratón quiénes son (si se saben). La de
 * quien ha completado una misión, en el detalle del mapa y en el panel de la
 * clase.
 *
 * - `people`: cada persona con `id`, `name`, `avatar` y `seed`
 *   (`studentAvatarSeed(clase, estudiante)`), en el orden en que se enseñan.
 * - `total`: cuántas son de verdad, si `people` trae solo las primeras (la API
 *   manda como mucho cinco).
 * - `label`: el nombre de la lista para el lector de pantalla («Quién la ha
 *   completado»).
 * - `size`: `xs` (por defecto, 36 px) o `xxs`, para filas apretadas.
 */
export interface StackPerson {
  id: string
  name: string
  avatar: string | null
  seed: string
}

const props = withDefaults(
  defineProps<{
    people: StackPerson[]
    total?: number
    max?: number
    label: string
    size?: 'xxs' | 'xs'
  }>(),
  { total: undefined, max: 8, size: 'xs' }
)

const { t, locale } = useI18n()
const { formatNumber } = useNumberFormat()

// Las clases van enteras: Tailwind solo genera las que lee.
const OVERLAP = { xxs: '-ml-1.5', xs: '-ml-2' } as const
const PAD = { xxs: 'pl-1.5', xs: 'pl-2' } as const
const MORE = { xxs: 'h-5 min-w-[1.25rem] px-1 text-[0.625rem]', xs: 'h-9 min-w-[2.25rem] px-1.5 text-xs' } as const

const stack = computed(() => avatarStack(props.people, props.max, props.total ?? props.people.length))

/** Los nombres que no caben y se saben, unidos como en el idioma de la app. */
const rest = computed(() =>
  formatConjunction(
    props.people.slice(stack.value.shown.length).map(person => person.name),
    locale.value,
    t('common.mission_map.and')
  )
)
</script>
