import { defineStore } from 'pinia'
import type {
  UserProfile,
  SecuritySettings,
  UserPreferences,
  UserSession,
  ChangePasswordRequest,
  ChangeEmailRequest,
  ProfileActionResponse,
} from '~/types/profile.types'

export const useProfileStore = defineStore('profile', () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  // State
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  // Bandera explícita: evita refetch en cada visita a una vista que dependa
  // del perfil. Un `profile=null` tras un fetch fallido sigue siendo un estado
  // válido y no debería disparar reintentos automáticos.
  const hasLoadedProfile = ref(false)

  // Getters
  const security = computed(
    () =>
      profile.value?.security || {
        twoFactorEnabled: false,
        sessions: [],
      }
  )

  const preferences = computed(
    () =>
      profile.value?.preferences || {
        emailNotifications: true,
        missionReminders: true,
        language: 'es' as const,
        theme: 'college' as const,
        menuDisplay: 'both' as const,
      }
  )

  const currentEmail = computed(() => profile.value?.email || authStore.user?.email || '')

  // Actions
  /**
   * Carga el perfil del usuario si no se ha cargado todavía (o si `force=true`).
   * Es idempotente: llamadas repetidas no disparan más de un fetch en vuelo,
   * y si el perfil ya está cargado simplemente sale sin llamar a la API.
   */
  const ensureProfile = async (force = false) => {
    if (hasLoadedProfile.value && !force) return
    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ profile: UserProfile }>(`${config.public.apiBase}/profile`, {
        headers: {
          Authorization: `Bearer ${authStore.tokens?.accessToken}`,
        },
      })
      profile.value = response.profile
      // localStorage es la fuente de verdad para el tema
      if (import.meta.client && profile.value?.preferences) {
        const storedTheme = localStorage.getItem('itakai_theme') as 'college' | 'university' | null
        if (storedTheme) {
          profile.value.preferences.theme = storedTheme
        } else if (profile.value.preferences.theme) {
          localStorage.setItem('itakai_theme', profile.value.preferences.theme)
        }
      }
      hasLoadedProfile.value = true
    } catch (err) {
      console.error('Error fetching profile:', err)
      error.value = 'Error al cargar el perfil'
    } finally {
      loading.value = false
    }
  }

  /**
   * Wrapper retrocompatible: el código existente sigue llamando a `fetchProfile()`
   * y obteniendo el comportamiento de "siempre refresca". Internamente delega en
   * `ensureProfile(true)` para no duplicar lógica.
   */
  const fetchProfile = async () => {
    await ensureProfile(true)
  }

  const changePassword = async (data: ChangePasswordRequest): Promise<ProfileActionResponse> => {
    try {
      const response = await $fetch<ProfileActionResponse>(
        `${config.public.apiBase}/profile/change-password`,
        {
          method: 'POST',
          body: data,
          headers: {
            Authorization: `Bearer ${authStore.tokens?.accessToken}`,
          },
        }
      )
      return response
    } catch (err: any) {
      console.error('Error changing password:', err)
      return {
        success: false,
        message: err.data?.message || 'Error al cambiar la contraseña',
      }
    }
  }

  const changeEmail = async (data: ChangeEmailRequest): Promise<ProfileActionResponse> => {
    try {
      const response = await $fetch<ProfileActionResponse>(
        `${config.public.apiBase}/profile/change-email`,
        {
          method: 'POST',
          body: data,
          headers: {
            Authorization: `Bearer ${authStore.tokens?.accessToken}`,
          },
        }
      )

      if (response.success) {
        // Update profile store
        if (profile.value) {
          profile.value.email = data.newEmail
        }
        // Sync with auth store so sidebar/header reflect the change
        if (authStore.user) {
          authStore.user.email = data.newEmail
          if (import.meta.client) {
            localStorage.setItem('auth_user', JSON.stringify(authStore.user))
          }
        }
      }

      return response
    } catch (err: any) {
      console.error('Error changing email:', err)
      return {
        success: false,
        message: err.data?.message || 'Error al cambiar el email',
      }
    }
  }

  const toggleTwoFactor = async (enabled: boolean): Promise<ProfileActionResponse> => {
    try {
      const response = await $fetch<ProfileActionResponse>(
        `${config.public.apiBase}/profile/two-factor`,
        {
          method: 'POST',
          body: { enabled },
          headers: {
            Authorization: `Bearer ${authStore.tokens?.accessToken}`,
          },
        }
      )

      if (response.success && profile.value) {
        profile.value.security.twoFactorEnabled = enabled
      }

      return response
    } catch (err: any) {
      console.error('Error toggling 2FA:', err)
      return {
        success: false,
        message: err.data?.message || 'Error al cambiar 2FA',
      }
    }
  }

  const closeSession = async (sessionId: string): Promise<ProfileActionResponse> => {
    try {
      const response = await $fetch<ProfileActionResponse>(
        `${config.public.apiBase}/profile/sessions/${sessionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.tokens?.accessToken}`,
          },
        }
      )

      if (response.success && profile.value) {
        profile.value.security.sessions = profile.value.security.sessions.filter(
          s => s.id !== sessionId
        )
      }

      return response
    } catch (err: any) {
      console.error('Error closing session:', err)
      return {
        success: false,
        message: err.data?.message || 'Error al cerrar la sesión',
      }
    }
  }

  const closeAllSessions = async (): Promise<ProfileActionResponse> => {
    try {
      const response = await $fetch<ProfileActionResponse>(
        `${config.public.apiBase}/profile/sessions`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.tokens?.accessToken}`,
          },
        }
      )

      if (response.success && profile.value) {
        // Keep only the current session
        profile.value.security.sessions = profile.value.security.sessions.filter(s => s.current)
      }

      return response
    } catch (err: any) {
      console.error('Error closing all sessions:', err)
      return {
        success: false,
        message: err.data?.message || 'Error al cerrar las sesiones',
      }
    }
  }

  const updatePreferences = async (
    newPreferences: Partial<UserPreferences>
  ): Promise<ProfileActionResponse> => {
    try {
      const response = await $fetch<ProfileActionResponse>(
        `${config.public.apiBase}/profile/preferences`,
        {
          method: 'PATCH',
          body: newPreferences,
          headers: {
            Authorization: `Bearer ${authStore.tokens?.accessToken}`,
          },
        }
      )

      if (response.success && profile.value) {
        profile.value.preferences = {
          ...profile.value.preferences,
          ...newPreferences,
        }
        if (newPreferences.theme && import.meta.client) {
          localStorage.setItem('itakai_theme', newPreferences.theme)
        }
      }

      return response
    } catch (err: any) {
      console.error('Error updating preferences:', err)
      return {
        success: false,
        message: err.data?.message || 'Error al actualizar preferencias',
      }
    }
  }

  const exportMyData = async (): Promise<ProfileActionResponse & { filename?: string }> => {
    try {
      const response = await fetch(`${config.public.apiBase}/profile/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authStore.tokens?.accessToken}`,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        let message = 'Error al exportar tus datos'
        try {
          const errorData = await response.json()
          message = errorData?.message || message
        } catch {}

        return { success: false, message }
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || 'itakai-profile-export.json'

      if (import.meta.client) {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }

      return {
        success: true,
        message: 'Datos exportados correctamente',
        filename,
      }
    } catch (err: any) {
      console.error('Error exporting profile data:', err)
      return {
        success: false,
        message: err?.data?.message || 'Error al exportar tus datos',
      }
    }
  }

  const deleteAccount = async (password: string): Promise<ProfileActionResponse> => {
    try {
      const response = await $fetch<ProfileActionResponse>(
        `${config.public.apiBase}/profile/delete-account`,
        {
          method: 'DELETE',
          body: { password },
          headers: {
            Authorization: `Bearer ${authStore.tokens?.accessToken}`,
          },
        }
      )

      if (response.success) {
        // Logout the user after account deletion
        authStore.logout()
      }

      return response
    } catch (err: any) {
      console.error('Error deleting account:', err)
      return {
        success: false,
        message: err.data?.message || 'Error al eliminar la cuenta',
      }
    }
  }

  const $reset = () => {
    profile.value = null
    loading.value = false
    error.value = null
    hasLoadedProfile.value = false
  }

  return {
    // State
    profile,
    loading,
    error,
    hasLoadedProfile,
    // Getters
    security,
    preferences,
    currentEmail,
    // Actions
    ensureProfile,
    fetchProfile,
    changePassword,
    changeEmail,
    toggleTwoFactor,
    closeSession,
    closeAllSessions,
    updatePreferences,
    exportMyData,
    deleteAccount,
    $reset,
  }
})
