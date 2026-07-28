import { defineStore } from 'pinia'
import type { User, LoginCredentials, SignupData, AuthTokens } from '~/types/auth.types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const tokens = ref<AuthTokens | null>(null)

  // Helper to save auth data to localStorage
  // Note: refreshToken is NOT stored - it's in HttpOnly cookie
  const saveAuthToStorage = (authTokens: AuthTokens, authUser: User) => {
    if (import.meta.client) {
      localStorage.setItem('auth_access_token', authTokens.accessToken)
      localStorage.setItem('auth_user', JSON.stringify(authUser))
    }
  }

  // Getters
  const isAuthenticated = computed(() => !!user.value && !!tokens.value?.accessToken)

  const isTokenExpired = computed(() => {
    if (!tokens.value?.accessToken) return true
    try {
      if (
        tokens.value.accessToken.startsWith('mock_access_token_') ||
        tokens.value.accessToken.startsWith('demo_access_token_')
      ) {
        return false
      }

      // Decode JWT to check expiration
      const encodedPayload = tokens.value.accessToken.split('.')[1]
      if (!encodedPayload) return true

      const payload = JSON.parse(atob(encodedPayload))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  })

  const userRole = computed(() => user.value?.role)

  const extractAccessToken = (response: { tokens?: AuthTokens; accessToken?: string }) => {
    const accessToken = response.tokens?.accessToken || response.accessToken

    if (!accessToken) {
      throw new Error('La API de autenticación no devolvió accessToken')
    }

    return accessToken
  }

  // Actions
  const login = async (credentials: LoginCredentials) => {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ user: User; tokens?: AuthTokens; accessToken?: string }>(
        `${config.public.apiBase}/auth/login`,
        {
          method: 'POST',
          body: credentials,
          credentials: 'include', // Important: Send/receive HttpOnly cookies
        }
      )

      const accessToken = extractAccessToken(response)
      user.value = response.user
      tokens.value = { accessToken }
      saveAuthToStorage(tokens.value, response.user)

      return response
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const loginWithGoogle = async (credential: string) => {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ user: User; tokens?: AuthTokens; accessToken?: string }>(
        `${config.public.apiBase}/auth/login-google`,
        {
          method: 'POST',
          body: { credential },
          credentials: 'include',
        }
      )

      const accessToken = extractAccessToken(response)
      user.value = response.user
      tokens.value = { accessToken }
      saveAuthToStorage(tokens.value, response.user)

      return response
    } catch (error) {
      console.error('Login with Google error:', error)
      throw error
    }
  }

  const loginWithGoogleCode = async (code: string) => {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ user: User; tokens?: AuthTokens; accessToken?: string }>(
        `${config.public.apiBase}/auth/login-google-code`,
        {
          method: 'POST',
          body: { code },
          credentials: 'include',
        }
      )

      const accessToken = extractAccessToken(response)
      user.value = response.user
      tokens.value = { accessToken }
      saveAuthToStorage(tokens.value, response.user)

      return response
    } catch (error) {
      console.error('Login with Google code error:', error)
      throw error
    }
  }

  const signup = async (data: SignupData) => {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ user: User; tokens?: AuthTokens; accessToken?: string }>(
        `${config.public.apiBase}/auth/signup`,
        {
          method: 'POST',
          body: data,
          credentials: 'include',
        }
      )

      const accessToken = extractAccessToken(response)
      user.value = response.user
      tokens.value = { accessToken }
      saveAuthToStorage(tokens.value, response.user)

      return response
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const loginAsRole = (role: 'student' | 'teacher' | 'admin') => {
    const roleNames = {
      student: 'Estudiante Demo',
      teacher: 'Profesor Demo',
      admin: 'Admin Demo',
    }

    const demoUser: User = {
      id: `demo_${role}`,
      email: `${role}@demo.com`,
      name: roleNames[role],
      role,
      isOnboarded: true,
      createdAt: new Date(),
    }

    const demoTokens: AuthTokens = {
      accessToken: `demo_access_token_${role}`,
    }

    user.value = demoUser
    tokens.value = demoTokens
    saveAuthToStorage(demoTokens, demoUser)
  }

  const logout = async () => {
    try {
      const config = useRuntimeConfig()
      // Call backend to clear HttpOnly cookie
      await $fetch(`${config.public.apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Send the cookie to be cleared
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with local cleanup even if server call fails
    }

    // Clear auth state
    user.value = null
    tokens.value = null

    if (import.meta.client) {
      localStorage.removeItem('auth_access_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('itakai_theme')
      document.documentElement.removeAttribute('data-theme')

      // Reset all other stores to avoid data leakage between users
      try {
        const classesStore = useClassesStore()
        const missionStore = useMissionStore()
        const studentStore = useStudentStore()
        const gamificationStore = useGamificationStore()
        const teacherStore = useTeacherStore()

        classesStore.$reset()
        missionStore.$reset?.()
        studentStore.$reset()
        gamificationStore.$reset?.()
        teacherStore.$reset?.()
      } catch (err) {
        console.error('Error resetting stores:', err)
      }
    }
  }

  // Clear auth state locally without making API call
  // Used by middleware when token is expired to avoid multiple requests
  const clearAuthState = () => {
    user.value = null
    tokens.value = null

    if (import.meta.client) {
      localStorage.removeItem('auth_access_token')
      localStorage.removeItem('auth_user')
    }
  }

  const refreshToken = async () => {
    try {
      const config = useRuntimeConfig()
      // No body needed - refreshToken is in HttpOnly cookie
      const response = await $fetch<{ tokens?: AuthTokens; accessToken?: string }>(
        `${config.public.apiBase}/auth/refresh-token`,
        {
          method: 'POST',
          credentials: 'include', // Cookie will be sent automatically
        }
      )

      const accessToken = extractAccessToken(response)
      tokens.value = { accessToken }

      if (import.meta.client) {
        localStorage.setItem('auth_access_token', accessToken)
      }

      return tokens.value
    } catch (error) {
      console.error('Refresh token error:', error)
      // Clear state on refresh failure (token might be revoked)
      user.value = null
      tokens.value = null
      if (import.meta.client) {
        localStorage.removeItem('auth_access_token')
        localStorage.removeItem('auth_user')
      }
      throw error
    }
  }

  const resetPassword = async (token: string, password: string) => {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ message: string }>(
        `${config.public.apiBase}/auth/reset-password`,
        {
          method: 'POST',
          body: { token, password },
        }
      )

      return response
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  const requestPasswordReset = async (email: string) => {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ resetUrl?: string; message?: string }>(
        `${config.public.apiBase}/auth/forgot-password`,
        {
          method: 'POST',
          body: { email: email.trim() },
        }
      )

      return response
    } catch (error) {
      console.error('Request password reset error:', error)
      throw error
    }
  }

  const completeOnboarding = async (role: 'student' | 'teacher') => {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ user: User; accessToken?: string }>(
        `${config.public.apiBase}/onboarding/complete-role`,
        {
          method: 'POST',
          body: { role },
          headers: {
            Authorization: `Bearer ${tokens.value?.accessToken}`,
          },
          credentials: 'include',
        }
      )

      user.value = response.user

      // Update token if a new one was provided (role might have changed)
      if (response.accessToken) {
        tokens.value = { accessToken: response.accessToken }
        if (import.meta.client) {
          localStorage.setItem('auth_access_token', response.accessToken)
        }
      }

      if (import.meta.client) {
        localStorage.setItem('auth_user', JSON.stringify(response.user))
      }

      return response.user
    } catch (error) {
      console.error('Complete onboarding error:', error)
      throw error
    }
  }

  const loadUserFromStorage = () => {
    if (!import.meta.client) return

    const storedToken = localStorage.getItem('auth_access_token')
    const storedUser = localStorage.getItem('auth_user')

    if (storedToken && storedUser) {
      try {
        tokens.value = { accessToken: storedToken }
        user.value = JSON.parse(storedUser)
      } catch (error) {
        console.error('Error loading user from storage:', error)
        localStorage.removeItem('auth_access_token')
        localStorage.removeItem('auth_user')
      }
    }
  }

  // --- Modo demo "Ver como alumno": el profesor ve la plataforma como un alumno.
  // El rol se cambia SOLO en memoria (localStorage conserva el rol real); una
  // marca en sessionStorage lo mantiene tras recargar la pestaña. Volver restaura.
  const isStudentPreview = ref(false)
  const PREVIEW_KEY = 'itakai_student_preview'

  const enterStudentPreview = async () => {
    if (user.value?.role !== 'teacher') return
    // Asegura las matrículas "fantasma" del profe en sus clases (idempotente),
    // para que la vista de alumno muestre sus clases reales.
    try {
      const config = useRuntimeConfig()
      await $fetch(`${config.public.apiBase}/students/preview/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.value?.accessToken}` },
      })
    } catch {
      /* si falla, entramos igual: se verá vacío pero no bloquea */
    }
    user.value = { ...user.value, role: 'student' }
    isStudentPreview.value = true
    if (import.meta.client) sessionStorage.setItem(PREVIEW_KEY, '1')
    navigateTo('/alumno/inicio')
  }

  const exitStudentPreview = () => {
    if (user.value) user.value = { ...user.value, role: 'teacher' }
    isStudentPreview.value = false
    if (import.meta.client) sessionStorage.removeItem(PREVIEW_KEY)
    navigateTo('/profesor/inicio')
  }

  // Initialize on store creation
  if (import.meta.client) {
    loadUserFromStorage()
    // Reaplica el modo "ver como alumno" tras recargar (marca en sessionStorage).
    if (sessionStorage.getItem(PREVIEW_KEY) === '1' && user.value?.role === 'teacher') {
      user.value = { ...user.value, role: 'student' }
      isStudentPreview.value = true
    }
  }

  return {
    user,
    tokens,
    isAuthenticated,
    isTokenExpired,
    userRole,
    login,
    loginWithGoogle,
    loginWithGoogleCode,
    signup,
    loginAsRole,
    isStudentPreview,
    enterStudentPreview,
    exitStudentPreview,
    logout,
    clearAuthState,
    refreshToken,
    loadUserFromStorage,
    completeOnboarding,
    resetPassword,
    requestPasswordReset,
  }
})
