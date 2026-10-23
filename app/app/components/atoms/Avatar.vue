<template>
  <div
    class="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-navy-700/20 leading-none text-navy-700"
    :class="[SIZES[size], showsImage ? look.soft : INITIALS_FILL[tone]]"
    :style="ringStyle"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <img
      v-if="showsImage"
      :src="image ?? undefined"
      alt=""
      loading="lazy"
      decoding="async"
      class="h-full w-full"
      :class="imageClass"
      @error="broken = true"
    />
    <!-- Sin color propio: hereda el del círculo (en el tema university, el amarillo lo pone en blanco) -->
    <span v-else class="font-bold">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import type { TeamColor } from '~/types/team.types'
import {
  avatarColorOf,
  avatarInitials,
  catalogKeyOf,
  portraitOf,
  teacherAvatarOf,
} from '~/utils/avatar'
import { teamColorOf } from '~/utils/team-style'

/**
 * El avatar de una persona, en un círculo: el único sitio de la aplicación que
 * lo pinta (ver `utils/avatar.ts`).
 *
 * - Del alumnado: `src` (personaje del catálogo o imagen generada) y `seed`
 *   (`studentAvatarSeed(clase, estudiante)`), que da el color de fondo.
 * - Del profesorado: `avatarKey` (la clave de su catálogo, o nada) y `seed` (su
 *   id). Sin retrato salen sus iniciales sobre el color.
 *
 * En los tamaños pequeños (hasta `md`) un personaje del catálogo sale en
 * retrato, de cabeza y hombros; en los grandes, entero. Si la imagen no carga,
 * quedan las iniciales.
 *
 * Al lado del nombre es decorativo (el lector de pantalla no lo lee dos veces);
 * cuando va solo, `label` le da nombre.
 */
type AvatarSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  /** Imagen: un personaje del catálogo del alumnado o una generada con IA. */
  src?: string | null
  /** Clave del catálogo docente (el avatar del profesorado). */
  avatarKey?: string | null
  /** Nombre de la persona: da las iniciales cuando no hay imagen. */
  name?: string | null
  /** Texto para el lector de pantalla cuando el avatar va solo, sin el nombre al lado. */
  label?: string
  /** De dónde sale el color de fondo si no se da `color` (un id). */
  seed?: string | null
  /** Color de fondo de la paleta, si se quiere uno concreto. */
  color?: TeamColor | null
  size?: AvatarSize
  /** Marco de color alrededor del avatar (color del tramo de nivel de la clase). */
  ringColor?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  avatarKey: null,
  name: null,
  label: undefined,
  seed: null,
  color: null,
  size: 'md',
  ringColor: null,
})

/** Tamaños, de 20 a 112 px; las iniciales crecen con el círculo. */
const SIZES: Record<AvatarSize, string> = {
  xxs: 'h-5 w-5 text-[0.5rem]',
  xs: 'h-9 w-9 text-xs',
  sm: 'h-12 w-12 text-sm',
  md: 'h-15 w-15 text-base',
  lg: 'h-26 w-26 text-2xl',
  xl: 'h-28 w-28 text-3xl',
}

/** Hasta este tamaño, retrato; por encima, el personaje entero. */
const SMALL: AvatarSize[] = ['xxs', 'xs', 'sm', 'md']

const small = computed(() => SMALL.includes(props.size))
const teacherAvatar = computed(() => teacherAvatarOf(props.avatarKey))

const { getImageUrl } = useImageUrl()

/** La imagen que se pinta; una generada con IA vive en la API (`/uploads/…`). */
const image = computed(() => {
  const src = props.src || teacherAvatar.value?.portrait || null
  return (small.value && portraitOf(src)) || getImageUrl(src) || null
})

// Una imagen que no carga (un fichero que ya no está) deja las iniciales. Se
// vuelve a intentar si cambia la imagen.
const broken = ref(false)
watch(image, () => {
  broken.value = false
})

/**
 * Un retrato o una imagen generada llenan el círculo (la generada, recortada por
 * arriba, que es donde está la cara); el personaje entero cabe dentro.
 */
const imageClass = computed(() => {
  if (!small.value) return 'object-contain p-1'
  return catalogKeyOf(props.src) ? 'object-cover' : 'object-cover object-top'
})

const showsImage = computed(() => Boolean(image.value) && !broken.value)

/** El color del avatar: el pedido, el de su entrada del catálogo docente o el que le toca al id. */
const tone = computed<TeamColor>(
  () => props.color ?? teacherAvatar.value?.color ?? avatarColorOf(props.seed ?? props.name)
)

/** Detrás de una imagen, el tono suave del color, como el emblema de un equipo. */
const look = computed(() => teamColorOf(tone.value))

/**
 * Fondo del círculo con iniciales: un tono que deje leer las iniciales navy (más
 * de 4,5:1) y que distinga a dos docentes entre sí, los seis a la vez, en el tema
 * por defecto, en el university y en los modos de daltonismo. Por eso no es
 * siempre el fuerte (el morado, el cielo y el rojo fuertes se oscurecen en algún
 * tema o modo) ni el claro: el rojo claro (`red-light`) se vuelve gris en el tema
 * university, como el lila, y melocotón en los modos de daltonismo, como el
 * melocotón; `red-light-alt` sigue siendo rojo, o naranja, en todos.
 * El amarillo es navy en el tema university, y la regla del tema pone en blanco
 * las iniciales, que heredan el color del círculo.
 *
 * `tests/avatar.test.mjs` lo comprueba con los colores de cada tema y modo.
 */
const INITIALS_FILL: Record<TeamColor, string> = {
  purple: 'bg-lilac',
  yellow: 'bg-yellow',
  mint: 'bg-mint',
  sky: 'bg-sky-light-alt',
  red: 'bg-red-light-alt',
  peach: 'bg-peach',
}

const initials = computed(() => avatarInitials(props.name))

// El marco es un doble anillo (hueco del color de la superficie + color del
// tramo) con box-shadow, así no altera el tamaño del avatar ni recorta la imagen.
const ringStyle = computed(() =>
  props.ringColor
    ? { boxShadow: `0 0 0 2px rgb(var(--color-surface-rgb)), 0 0 0 4px ${props.ringColor}` }
    : undefined
)
</script>
