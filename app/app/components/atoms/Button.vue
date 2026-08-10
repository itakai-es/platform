<template>
  <button :type="type" :disabled="disabled || loading" :class="buttonClasses" @click="handleClick">
    <!-- No spinner visible (ITAKAI official spec) -->
    <component :is="iconLeft" v-if="iconLeft" :class="iconClasses" />
    <slot />
    <component :is="iconRight" v-if="iconRight" :class="iconClasses" />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?:
    | 'primary'
    | 'secondary'
    | 'secondary-purple'
    | 'secondary-yellow'
    | 'secondary-lilac'
    | 'secondary-mint'
    | 'outline'
    | 'ghost'
    | 'danger'
    | 'social'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  iconLeft?: any
  iconRight?: any
  fullWidth?: boolean
  align?: 'center' | 'left'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false,
  align: 'center',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => {
  // Base: siempre píldora (rounded-full), DM Sans font-medium
  // text-left/text-center: si la etiqueta salta a dos líneas, que siga la
  // alineación del botón (el user-agent centra el texto de los <button>).
  const alignment =
    props.align === 'left' ? 'justify-start text-left' : 'justify-center text-center'
  const base = `inline-flex items-center ${alignment} font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full`

  // Variantes según ITAKAI Official Brand Specs
  const variants = {
    // Primary: navy 700 (#23245d) + texto blanco
    primary: 'bg-navy-700 text-white hover:bg-navy-dark focus:ring-navy-700',

    // Secondary purple: purple brand (#ac74fd) + texto blanco
    secondary: 'bg-purple text-white hover:bg-purple-hover focus:ring-purple',

    // Secondary purple variant: explícito (mismo que secondary)
    'secondary-purple': 'bg-purple text-white hover:bg-purple-hover focus:ring-purple',

    // Secondary yellow: yellow brand (#ffc338) + texto navy 700
    'secondary-yellow': 'bg-yellow text-navy-700 hover:bg-yellow-hover focus:ring-yellow',

    // Secondary lilac: lilac panel (#d6bcfd) + texto navy 700
    'secondary-lilac': 'bg-lilac text-navy-700 hover:bg-lilac-hover focus:ring-lilac',

    // Secondary mint: mint brand (#6FEDB7) + texto navy 700
    'secondary-mint': 'bg-mint text-navy-700 hover:bg-mint/90 focus:ring-mint',

    // Outline: transparente + borde navy 700 + texto navy 700 → hover texto blanco
    outline:
      'bg-transparent border-2 border-navy-700 text-navy-700 hover:bg-navy-700 hover:text-white focus:ring-navy-700',

    // Ghost: solo texto, muy sutil, sin fondo
    ghost: 'bg-transparent text-text-tertiary hover:text-text-secondary focus:ring-text-tertiary',

    // Danger: red/pink brand (#ff3c52) + texto blanco
    danger: 'bg-red text-white hover:bg-red-hover focus:ring-red',

    // Social: para botones de OAuth (Google, Microsoft, etc.)
    // Mismo estilo que purple-dark optimizado para iconos de providers
    social:
      'bg-purple-dark text-white hover:bg-purple-dark-hover active:bg-purple-dark-active focus:ring-purple-dark/30 shadow-sm hover:shadow-md active:translate-y-px',
  }

  // Tamaños según ITAKAI Official Specs - Responsive. Altura MÍNIMA en vez de
  // fija: con una línea el botón mide lo de siempre (32/42/48px), y si la
  // etiqueta salta a dos líneas crece con su padding en lugar de desbordarse.
  const sizes = {
    // Small: 32-34px height responsive (chips de acción, ej. botones amarillos Atenea)
    sm: 'text-xs sm:text-sm px-3 sm:px-4 py-1 min-h-[32px] sm:min-h-[34px] leading-snug',

    // Medium: 42-46px height responsive (estándar CTAs)
    md: 'text-sm sm:text-base px-4 sm:px-6 py-1.5 min-h-[42px] sm:min-h-[46px] leading-snug',

    // Large: 48-54px height responsive (ancho + icono, botones sociales)
    lg: 'text-base sm:text-lg px-6 sm:px-8 py-2 min-h-[48px] sm:min-h-[54px] leading-snug',
  }

  const width = props.fullWidth ? 'w-full' : ''

  return [base, variants[props.variant], sizes[props.size], width].join(' ')
})

const iconClasses = computed(() => {
  // Íconos responsivos según tamaño del botón
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const spacing = props.iconLeft ? 'mr-2' : 'ml-2'

  // stroke-2 ensures consistent visual weight across different outline icons
  // flex-shrink-0: que el texto a dos líneas no encoja el icono
  return [sizes[props.size], spacing, 'stroke-2 flex-shrink-0'].join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>
