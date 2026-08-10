import { isAppLanguage } from '~/utils/app-languages'

const STORAGE_KEY = 'itakai_language'
const COOKIE_KEY = 'itakai_lang'

function setCookie(lang: string) {
  document.cookie = `${COOKIE_KEY}=${lang};path=/;max-age=31536000;SameSite=Lax`
}

export default defineNuxtPlugin(nuxtApp => {
  const profileStore = useProfileStore()
  const i18n = nuxtApp.$i18n as {
    locale: { value: string }
    setLocale: (locale: string) => Promise<void>
  }

  // 1. On startup: sync cookie from localStorage so detectBrowserLanguage
  //    picks up the right locale on NEXT reload (if cookie was lost/cleared)
  const savedLocale = localStorage.getItem(STORAGE_KEY)
  if (isAppLanguage(savedLocale)) {
    setCookie(savedLocale)
  }

  // 2. Watch for REAL profile data (not the computed fallback).
  //    profile.value is null until fetchProfile() completes.
  //    When it loads, sync locale from DB preference.
  watch(
    () => profileStore.profile?.preferences?.language,
    async dbLang => {
      if (!isAppLanguage(dbLang)) return
      if (i18n.locale.value === dbLang) return

      // DB preference differs from current locale → switch
      await i18n.setLocale(dbLang)
      localStorage.setItem(STORAGE_KEY, dbLang)
      setCookie(dbLang)
    }
  )
})
