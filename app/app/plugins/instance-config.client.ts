import type { InstanceConfig } from '~/composables/useInstanceConfig'

/**
 * Al arrancar, carga la configuración pública de la instancia y la aplica:
 *  - el título de la pestaña pasa a ser el nombre de la plataforma configurado,
 *  - se fija el idioma por defecto de la instancia (salvo que el usuario ya haya
 *    elegido uno explícitamente).
 * Deja el config en un `useState` para que otras vistas (p. ej. el registro) lo lean.
 */
export default defineNuxtPlugin(async nuxtApp => {
  const config = useRuntimeConfig()
  const state = useState<InstanceConfig | null>('instanceConfig', () => null)

  try {
    const cfg = await $fetch<InstanceConfig>(`${config.public.apiBase}/public/config`)
    state.value = cfg

    if (cfg.platformName) {
      document.title = cfg.platformName
    }

    // Idioma por defecto de la instancia: se aplica salvo que el usuario haya
    // elegido uno explícitamente (localStorage 'itakai_language').
    const userPicked = localStorage.getItem('itakai_language')
    const i18n = nuxtApp.$i18n as
      | { locale: { value: string }; setLocale: (l: string) => Promise<void> }
      | undefined
    if (!userPicked && cfg.defaultLanguage && i18n && i18n.locale.value !== cfg.defaultLanguage) {
      await i18n.setLocale(cfg.defaultLanguage)
      document.cookie = `itakai_lang=${cfg.defaultLanguage};path=/;max-age=31536000;SameSite=Lax`
    }
  } catch {
    /* API no disponible al arrancar: se usan los defaults compilados. */
  }
})
