import { APP_LANGUAGE_CODES } from '~/utils/app-languages'
import type { AppLanguage } from '~/utils/app-languages'

type SupportedLocale = AppLanguage

const SUPPORTED_LOCALES: SupportedLocale[] = APP_LANGUAGE_CODES
const STORAGE_KEY = 'itakai_language'
const COOKIE_KEY = 'itakai_lang'

export const useLocale = () => {
  const { locale, setLocale } = useI18n()
  const profileStore = useProfileStore()
  const authStore = useAuthStore()

  const changeLanguage = async (lang: SupportedLocale) => {
    await setLocale(lang)
    // Persist to localStorage + cookie explicitly (belt and suspenders)
    localStorage.setItem(STORAGE_KEY, lang)
    document.cookie = `${COOKIE_KEY}=${lang};path=/;max-age=31536000;SameSite=Lax`

    if (authStore.isAuthenticated) {
      await profileStore.updatePreferences({ language: lang })
    }
  }

  return { locale, changeLanguage, SUPPORTED_LOCALES }
}
