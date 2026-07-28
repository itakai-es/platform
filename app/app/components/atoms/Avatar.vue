<template>
  <div :class="avatarClasses" :style="ringStyle">
    <img v-if="src" :src="src" :alt="alt" class="w-full h-full object-contain p-1" />
    <span v-else class="text-text-primary font-bold">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  src?: string
  alt?: string
  size?: 'xs' | 'md' | 'lg'
  username?: string
  /** Marco de color alrededor del avatar (color del tramo de nivel de la clase). */
  ringColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  alt: 'Avatar',
})

// El marco es un doble anillo (hueco blanco + color del tramo) con box-shadow,
// así no altera el tamaño del avatar ni recorta la imagen.
const ringStyle = computed(() =>
  props.ringColor ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${props.ringColor}` } : {}
)

const avatarClasses = computed(() => {
  const base = 'rounded-full bg-lila-medium flex items-center justify-center overflow-hidden'

  const sizes = {
    xs: 'w-9 h-9 text-xs', // 36px - listado/hijos
    md: 'w-15 h-15 text-sm', // 60px - sidebar/panel
    lg: 'w-26 h-26 text-xl', // 104px - perfil
  }

  return [base, sizes[props.size]].join(' ')
})

const initials = computed(() => {
  if (!props.username) return '?'
  return props.username.slice(0, 2).toUpperCase()
})
</script>
