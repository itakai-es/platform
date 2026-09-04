import type { Config } from 'tailwindcss'

/**
 * Tonos numéricos de la paleta cruda de Tailwind que la aplicación usa de
 * verdad, enrutados por variable CSS para que los modos de accesibilidad
 * (daltonismo, alto contraste) puedan remapearlos. Los valores por defecto
 * están en `app/assets/css/tailwind.css` y son los de Tailwind, así que esto
 * no cambia nada de lo que se ve hoy.
 *
 * El formato `rgb(var(--x) / <alpha-value>)` es el que conserva los
 * modificadores de opacidad (`bg-red-500/20`).
 */
const paletteScale = (name: string, shades: number[]) =>
  Object.fromEntries(
    shades.map(shade => [shade, `rgb(var(--palette-${name}-${shade}) / <alpha-value>)`])
  )

/**
 * ITAKAI Tailwind Configuration
 *
 * Sistema de diseño centralizado usando CSS Variables.
 * Cualquier cambio en app/assets/css/tailwind.css se reflejará aquí.
 *
 * IMPORTANTE: Todos los paths usan 'app/' debido a srcDir configurado en nuxt.config.ts
 */

export default {
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/composables/**/*.{js,ts}',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
  ],

  theme: {
    extend: {
      /* ============================================
         RESPONSIVE BREAKPOINTS
         ============================================ */
      screens: {
        xs: '475px', // Móvil grande (iPhone 12/13 Pro)
        sm: '640px', // Tablet pequeña
        md: '768px', // Tablet
        lg: '1024px', // Desktop
        xl: '1280px', // Desktop grande
        '2xl': '1536px', // Desktop XL
        '3xl': '1800px', // Desktop XXL (para layouts complejos como el podio horizontal)
      },

      /* ============================================
         COLORES - Usando CSS Variables
         ============================================ */
      colors: {
        // Backgrounds
        bg: {
          primary: 'rgb(var(--color-bg-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-bg-secondary-rgb) / <alpha-value>)',
          tertiary: 'rgb(var(--color-bg-tertiary-rgb) / <alpha-value>)',
        },

        // Surface (cards, containers)
        surface: {
          DEFAULT: 'rgb(var(--color-surface-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-surface-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-surface-active-rgb) / <alpha-value>)',
        },

        // Text
        text: {
          primary: 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
          tertiary: 'rgb(var(--color-text-tertiary-rgb) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted-rgb) / <alpha-value>)',
          inverse: 'rgb(var(--color-text-inverse-rgb) / <alpha-value>)',
        },

        // Brand colors
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-primary-active-rgb) / <alpha-value>)',
          light: 'var(--color-primary-light)',
        },

        secondary: {
          DEFAULT: 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-secondary-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-secondary-active-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-secondary-light-rgb) / <alpha-value>)',
        },

        accent: {
          DEFAULT: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-accent-active-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light-rgb) / <alpha-value>)',
        },

        // Semantic colors
        success: {
          DEFAULT: 'rgb(var(--color-success-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-success-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-success-dark-rgb) / <alpha-value>)',
        },

        warning: {
          DEFAULT: 'rgb(var(--color-warning-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-warning-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-warning-dark-rgb) / <alpha-value>)',
        },

        error: {
          DEFAULT: 'rgb(var(--color-error-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-error-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-error-dark-rgb) / <alpha-value>)',
        },

        info: {
          DEFAULT: 'rgb(var(--color-info-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-info-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-info-dark-rgb) / <alpha-value>)',
        },

        // Borders
        border: {
          primary: 'rgb(var(--color-border-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-border-secondary-rgb) / <alpha-value>)',
          tertiary: 'rgb(var(--color-border-tertiary-rgb) / <alpha-value>)',
        },

        // Badges - Status & State Colors
        badge: {
          urgente: 'rgb(var(--color-badge-urgente-rgb) / <alpha-value>)',
          activa: 'rgb(var(--color-badge-activa-rgb) / <alpha-value>)',
          pendiente: 'rgb(var(--color-badge-pendiente-rgb) / <alpha-value>)',
          bloqueada: 'rgb(var(--color-badge-bloqueada-rgb) / <alpha-value>)',
          comun: 'rgb(var(--color-badge-comun-rgb) / <alpha-value>)',
          rara: 'rgb(var(--color-badge-rara-rgb) / <alpha-value>)',
          epica: 'rgb(var(--color-badge-epica-rgb) / <alpha-value>)',
          legendaria: 'rgb(var(--color-badge-legendaria-rgb) / <alpha-value>)',
          'text-light': 'rgb(var(--color-badge-text-light-rgb) / <alpha-value>)',
          'text-dark': 'rgb(var(--color-badge-text-dark-rgb) / <alpha-value>)',
        },

        // Barra de progreso: los tokens existían desde el principio pero no había
        // utilidad, así que los componentes escribían el hex a mano.
        progress: {
          track: 'rgb(var(--color-progress-track-rgb) / <alpha-value>)',
          fill: 'rgb(var(--color-progress-fill-rgb) / <alpha-value>)',
        },

        /* ============================================
           ITAKAI BRAND COLORS - Official Palette
           ============================================ */

        // Navy 700 - Text, Headers, Primary Buttons
        navy: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          base: 'rgb(var(--color-navy-base-rgb) / <alpha-value>)', // #03003C - Login hero bg
          'base-light': 'rgb(var(--color-navy-base-light-rgb) / <alpha-value>)', // #0a0a52 - Onda
          700: 'rgb(var(--color-navy-700-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-navy-700-hover-rgb) / <alpha-value>)',
          darker: 'rgb(var(--color-navy-700-active-rgb) / <alpha-value>)',
        },

        // Purple Brand - Accent, Buttons, Labels
        purple: {
          DEFAULT: 'rgb(var(--color-purple-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-purple-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-purple-active-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-purple-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-purple-dark-rgb) / <alpha-value>)', // #5a3a8d - Social buttons
          'dark-hover': 'rgb(var(--color-purple-dark-hover-rgb) / <alpha-value>)',
          'dark-active': 'rgb(var(--color-purple-dark-active-rgb) / <alpha-value>)',
          ...paletteScale('purple', [200, 500]),
        },

        // Lilac Panel - Login Panels, Light Surfaces
        lilac: {
          DEFAULT: 'rgb(var(--color-lilac-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-lilac-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-lilac-active-rgb) / <alpha-value>)',
        },

        // Yellow Brand - AI Success, Chips, CTAs
        yellow: {
          DEFAULT: 'rgb(var(--color-yellow-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-yellow-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-yellow-active-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-yellow-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-yellow-dark-rgb) / <alpha-value>)',
          ...paletteScale('yellow', [100, 200, 500, 600, 700]),
        },

        // Mint Brand - Positive States, Success
        mint: {
          DEFAULT: 'rgb(var(--color-mint-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-mint-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-mint-active-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-mint-light-rgb) / <alpha-value>)',
        },

        // Peach Brand - KPI/Fechas Cards
        peach: {
          DEFAULT: 'rgb(var(--color-peach-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-peach-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-peach-active-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-peach-light-rgb) / <alpha-value>)',
        },

        // Sky Blue Brand - Stats Cards, Info
        sky: {
          DEFAULT: 'rgb(var(--color-sky-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-sky-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-sky-active-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-sky-light-rgb) / <alpha-value>)',
          'light-alt': 'rgb(var(--color-sky-light-alt-rgb) / <alpha-value>)',
          ...paletteScale('sky', [100, 200, 300, 700]),
        },

        // Green Brand - Active States, Success Vivid
        green: {
          DEFAULT: 'rgb(var(--color-green-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-green-light-rgb) / <alpha-value>)',
          ...paletteScale('green', [50, 100, 400, 500, 600, 700]),
        },

        // Red/Pink Brand - Urgent Badges, Errors
        red: {
          DEFAULT: 'rgb(var(--color-red-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-red-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--color-red-active-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-red-light-rgb) / <alpha-value>)',
          'light-alt': 'rgb(var(--color-red-light-alt-rgb) / <alpha-value>)',
          ...paletteScale('red', [50, 100, 200, 300, 400, 500, 600, 700]),
        },

        /* Tonos crudos que la aplicación usa y que deben responder a los
           modos de accesibilidad (ver `paletteScale`). */
        amber: paletteScale('amber', [50, 100, 200, 500, 600, 700, 800]),
        orange: paletteScale('orange', [500]),
        blue: paletteScale('blue', [50, 100, 200, 500, 600, 700]),
        indigo: paletteScale('indigo', [900]),
        violet: paletteScale('violet', [100, 200, 700]),
        emerald: paletteScale('emerald', [500]),
        gray: paletteScale('gray', [50, 100, 200, 300, 400, 500, 600, 700]),
      },

      /* ============================================
         TIPOGRAFÍA
         ============================================ */
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
        display: 'var(--font-display)',
      },

      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-body)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--leading-normal)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-snug)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }],
        '5xl': ['var(--text-5xl)', { lineHeight: 'var(--leading-tight)' }],
        // Heading Sizes - Design System 2.0
        h1: [
          'var(--text-h1)',
          {
            lineHeight: 'var(--leading-h1)',
            letterSpacing: 'var(--tracking-tighter)',
            fontWeight: 'var(--font-bold)',
          },
        ],
        h2: [
          'var(--text-h2)',
          {
            lineHeight: 'var(--leading-h2)',
            letterSpacing: 'var(--tracking-tight)',
            fontWeight: 'var(--font-bold)',
          },
        ],
        h3: [
          'var(--text-h3)',
          {
            lineHeight: 'var(--leading-h3)',
            letterSpacing: 'var(--tracking-normal)',
            fontWeight: 'var(--font-semibold)',
          },
        ],
        h4: [
          'var(--text-h4)',
          {
            lineHeight: 'var(--leading-h4)',
            letterSpacing: 'var(--tracking-normal)',
            fontWeight: 'var(--font-semibold)',
          },
        ],
      },

      fontWeight: {
        normal: 'var(--font-normal)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
        bold: 'var(--font-bold)',
        extrabold: 'var(--font-extrabold)',
      },

      lineHeight: {
        none: 'var(--leading-none)',
        tight: 'var(--leading-tight)',
        snug: 'var(--leading-snug)',
        normal: 'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
        loose: 'var(--leading-loose)',
      },

      /* Letter Spacing (Tracking) - Design System 2.0 */
      letterSpacing: {
        tighter: 'var(--tracking-tighter)', // -0.5% para H1
        tight: 'var(--tracking-tight)', // -0.25% para H2
        normal: 'var(--tracking-normal)', // 0% para H3/H4
      },

      /* ============================================
         SPACING
         ============================================ */
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
      },

      /* ============================================
         CUSTOM WIDTH/HEIGHT - Avatar Sizes
         ============================================ */
      width: {
        9: '36px', // Avatar xs
        15: '60px', // Avatar md
        26: '104px', // Avatar lg
      },

      height: {
        9: '36px', // Avatar xs
        15: '60px', // Avatar md
        26: '104px', // Avatar lg
      },

      /* ============================================
         BORDER RADIUS
         ============================================ */
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      /* ============================================
         SHADOWS
         ============================================ */
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        inner: 'var(--shadow-inner)',
      },

      /* ============================================
         TRANSITIONS
         ============================================ */
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '300ms',
      },

      /* ============================================
         Z-INDEX
         ============================================ */
      zIndex: {
        base: '0',
        dropdown: '1000',
        sticky: '1100',
        fixed: '1200',
        'modal-backdrop': '1300',
        modal: '1400',
        popover: '1500',
        tooltip: '1600',
      },

      /* ============================================
         ANIMATIONS
         ============================================ */
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 200ms ease-in-out',
        'fade-out': 'fade-out 200ms ease-in-out',
        'slide-in-up': 'slide-in-up 200ms ease-out',
        'slide-in-down': 'slide-in-down 200ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'spin-slow': 'spin-slow 3s linear infinite',
      },

      /* ============================================
         TYPOGRAPHY PLUGIN - prose styles
         ============================================ */
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#23245D',
            '--tw-prose-headings': '#23245D',
            '--tw-prose-lead': '#23245D',
            '--tw-prose-links': '#ac74fd',
            '--tw-prose-bold': '#23245D',
            '--tw-prose-counters': '#ac74fd',
            '--tw-prose-bullets': '#ac74fd',
            '--tw-prose-hr': '#E6E3E5',
            '--tw-prose-quotes': '#23245D',
            '--tw-prose-quote-borders': '#ac74fd',
            '--tw-prose-code': '#ac74fd',
            '--tw-prose-th-borders': '#E6E3E5',
            '--tw-prose-td-borders': '#E6E3E5',
            maxWidth: 'none',
            // Explicit list styles (Tailwind preflight resets these, :where() in prose has 0 specificity)
            ul: { listStyleType: 'disc', paddingLeft: '1.25em' },
            ol: { listStyleType: 'decimal', paddingLeft: '1.25em' },
            'ul > li::marker': { color: 'var(--tw-prose-bullets)' },
            'ol > li::marker': { color: 'var(--tw-prose-counters)' },
          },
        },
      },
    },
  },

  plugins: [
    // Plugins se agregarán después de npm install
    // require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config
