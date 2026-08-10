// https://nuxt.com/docs/api/configuration/nuxt-config
import { APP_LANGUAGES, LOCALE_FILES } from './app/utils/app-languages'

const apiProxyTarget = process.env.ITAKAI_API_PROXY_TARGET || 'http://localhost:3001'

export default defineNuxtConfig({
  compatibilityDate: '2026-02-02',
  srcDir: 'app/',

  typescript: {
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: false,
        exactOptionalPropertyTypes: false,
      },
    },
  },

  // SPA mode — no SSR
  ssr: false,

  devtools: { enabled: true },

  devServer: {
    port: Number(process.env.ITAKAI_DEV_PORT || 4000),
    host: '0.0.0.0', // CRÍTICO: Escuchar en todas las interfaces para Docker
  },

  // Configuración de Vite para hot reload en Docker/WSL2
  vite: {
    server: {
      watch: {
        usePolling: true, // CRÍTICO: Usar polling en Docker/WSL2
        interval: 1000, // Revisar cambios cada segundo
      },
      hmr: {
        // HMR (Hot Module Replacement) para Docker
        protocol: 'ws',
        host: 'localhost',
        port: Number(process.env.ITAKAI_DEV_PORT || 4000),
        clientPort: Number(process.env.ITAKAI_DEV_PORT || 4000),
      },
    },
  },

  components: [
    {
      path: '~/components/atoms',
      pathPrefix: false,
    },
    {
      path: '~/components/molecules',
      pathPrefix: false,
    },
    {
      path: '~/components/organisms',
      pathPrefix: false,
    },
    {
      path: '~/components/templates',
      pathPrefix: false,
    },
  ],

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/i18n'],

  i18n: {
    // Los idiomas salen de app/utils/app-languages.ts para no repetir la lista.
    locales: APP_LANGUAGES.map(lang => ({
      code: lang.code,
      name: lang.endonym,
      files: LOCALE_FILES.map(file => `${lang.code}/${file}`),
    })),
    defaultLocale: 'es',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'itakai_lang',
      fallbackLocale: 'es',
      alwaysRedirect: false,
    },
    bundle: {
      compositionOnly: true,
      fullInstall: false,
    },
    compilation: {
      strictMessage: false,
      escapeHtml: false,
    },
  },

  tailwindcss: {
    configPath: 'tailwind.config.ts',
    cssPath: '@/assets/css/tailwind.css',
  },

  css: [],

  app: {
    head: {
      title: 'ITAKAI - Plataforma Educativa Gamificada',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [{ rel: 'icon', type: 'image/png', href: '/itakai_ico_color.png' }],
    },
  },

  runtimeConfig: {
    public: {
      // Backend API URL
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      // Google OAuth Client ID
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    },
  },

  // Proxy configuration for Nitro (works in dev mode)
  nitro: {
    devProxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        prependPath: true,
      },
    },
    routeRules: {
      '/api/**': {
        proxy: `${apiProxyTarget}/**`,
      },
      '/uploads/**': {
        proxy: `${apiProxyTarget}/uploads/**`,
      },
    },
  },
})
