<template>
  <NuxtLink :to="to" :class="buttonClasses" :style="buttonStyle">
    <slot />
  </NuxtLink>
</template>

<script setup lang="ts">
interface Props {
  to: string
  type: 'ia' | 'stats' | 'pending' | 'clases'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  centered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  fullWidth: false,
  centered: false,
})

// Mapa de colores por tipo (en RGB)
const colorMap: Record<string, string> = {
  ia: '254 224 154',
  stats: '212 185 252',
  pending: '255 156 167',
  clases: '108 243 175',
}

const buttonClasses = computed(() => {
  const base = 'font-medium rounded-lg text-navy-700'
  const width = props.fullWidth ? 'block w-full' : 'inline-block'
  const align = props.centered ? 'text-center' : ''

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return [base, width, align, sizes[props.size]].join(' ')
})

const buttonStyle = computed(() => {
  const color = colorMap[props.type]
  return {
    backgroundColor: `rgb(${color} / 0.3)`,
  }
})
</script>
