<template>
  <!-- La rareza de una insignia, escrita: el color solo acompaña -->
  <span class="rounded-full px-3 py-1" :class="[SIZE[size], unlocked ? PILL[key] : LOCKED]">
    {{ t(`student.achievements.rarity.${key}`) }}
  </span>
</template>

<script setup lang="ts">
/**
 * La píldora con la rareza de una insignia («Común», «Rara», «Épica»,
 * «Legendaria»), en el idioma de la app: en su tarjeta (`BadgeRewardCard`, `md`) y
 * en su detalle (`sm`), para el alumnado y para el profesorado. Si aún no se ha
 * conseguido, en gris (con su texto legible).
 *
 * La API de insignias da la rareza en inglés (`common`, `rare`…); otra cualquiera
 * se toma por común.
 */
type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

const props = withDefaults(
  defineProps<{
    rarity?: string | null
    unlocked?: boolean
    size?: 'sm' | 'md'
  }>(),
  { rarity: 'common', unlocked: true, size: 'md' }
)

const { t } = useI18n()

// Las clases van enteras: Tailwind solo genera las que lee.
const PILL: Record<BadgeRarity, string> = {
  common: 'bg-gray-200 text-gray-700',
  rare: 'bg-sky-100 text-sky-700',
  epic: 'bg-violet-100 text-violet-700',
  legendary: 'bg-amber-100 text-amber-800',
}
const LOCKED = 'bg-gray-100 text-gray-600'
const SIZE = { sm: 'text-xs font-semibold', md: 'text-sm font-medium' } as const

const key = computed<BadgeRarity>(() =>
  props.rarity && props.rarity in PILL ? (props.rarity as BadgeRarity) : 'common'
)
</script>
