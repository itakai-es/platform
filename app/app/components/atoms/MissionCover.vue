<template>
  <!-- Solo dibujo: el título, el estado y la rareza van escritos al lado. -->
  <span
    class="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-offset-2"
    :class="[
      SIZE[size],
      on === 'dark'
        ? 'bg-navy-base-light ring-[5px] ring-offset-navy-base'
        : 'bg-bg-secondary ring-[3px] ring-offset-surface',
      locked ? 'ring-badge-bloqueada' : (RARITY_RING[rarity ?? 'comun'] ?? RARITY_RING.comun),
    ]"
    aria-hidden="true"
  >
    <img
      v-if="image && !broken"
      :src="image"
      alt=""
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover"
      :class="locked ? 'opacity-60 grayscale' : ''"
      @error="broken = true"
    />
    <RocketLaunchIcon
      v-else
      :class="[ICON[size], on === 'dark' ? 'text-white/60' : 'text-navy-700/50']"
    />
  </span>
</template>

<script setup lang="ts">
import { RocketLaunchIcon } from '@heroicons/vue/24/solid'

/**
 * La portada de una misión en un medallón redondo, con el aro del color de su
 * rareza: la de los medallones del mapa de misiones y la miniatura de cada misión
 * en los paneles de analítica. Sin portada (o si no carga), el cohete.
 *
 * - `cover`: la ruta tal cual llega de la API (`/uploads/…` o una URL).
 * - `rarity`: `comun`, `rara`, `epica` o `legendaria`. El aro es solo color: la
 *   rareza, si importa, va escrita al lado (`RarityBadge`).
 * - `locked`: cerrada; el aro gris y la portada apagada.
 * - `on`: `light` sobre blanco (por defecto) o `dark` sobre el tablero del mapa.
 * - `size`: `sm` (40 px), `md` (56 px), `auto` (40 px en el móvil y 56 desde
 *   `sm`, para filas que en el móvil necesitan el ancho) o `fill`, que ocupa su
 *   caja (el mapa).
 */
type Size = 'sm' | 'md' | 'auto' | 'fill'

const props = withDefaults(
  defineProps<{
    cover?: string | null
    rarity?: string | null
    locked?: boolean
    on?: 'light' | 'dark'
    size?: Size
  }>(),
  { cover: null, rarity: 'comun', locked: false, on: 'light', size: 'md' }
)

// Las clases van enteras: Tailwind solo genera las que lee.
const RARITY_RING: Record<string, string> = {
  comun: 'ring-badge-comun',
  rara: 'ring-purple-light',
  epica: 'ring-purple',
  legendaria: 'ring-badge-legendaria',
}

const SIZE: Record<Size, string> = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  auto: 'h-10 w-10 sm:h-14 sm:w-14',
  fill: 'h-full w-full',
}
const ICON: Record<Size, string> = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  auto: 'h-5 w-5 sm:h-6 sm:w-6',
  fill: 'h-8 w-8',
}

const { getImageUrl } = useImageUrl()
const image = computed(() => getImageUrl(props.cover) ?? null)

// Una portada que ya no está deja el cohete; se vuelve a intentar si cambia.
const broken = ref(false)
watch(image, () => {
  broken.value = false
})
</script>
