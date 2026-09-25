/**
 * Plugin to intercept all $fetch calls with:
 * - Authorization header injection
 * - credentials: 'include' for HttpOnly cookies
 * - Proactive token refresh before expired requests
 * - Auto-refresh on 401 errors with request queuing
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // Single refresh promise shared across all concurrent requests
  let refreshPromise: Promise<void> | null = null

  // Attempt to refresh the token (deduplicates concurrent calls)
  const attemptRefresh = (): Promise<void> => {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        const authStore = useAuthStore()
        // Call refresh endpoint directly with originalFetch to avoid interceptor loop
        const response = await originalFetch<{
          tokens?: { accessToken: string }
          accessToken?: string
        }>(`${config.public.apiBase}/auth/refresh-token`, {
          method: 'POST',
          credentials: 'include',
        })

        const accessToken = response.tokens?.accessToken || response.accessToken
        if (!accessToken) throw new Error('No access token in refresh response')

        authStore.tokens = { accessToken }
        if (import.meta.client) {
          localStorage.setItem('auth_access_token', accessToken)
        }
      } catch (error) {
        // Refresh failed - clear auth and redirect
        const authStore = useAuthStore()
        authStore.clearAuthState()

        if (!window.location.pathname.includes('/auth/')) {
          const router = useRouter()
          router.push('/auth/login')
          // La sesión ya no vale y la app se va a la pantalla de acceso: lo que
          // estuviera pidiendo esta pantalla ya no tiene a dónde volver. Su
          // petición se queda sin resolver a propósito, en vez de reventar en
          // cada sitio que no espera un error (y llenar la consola de fallos
          // que nadie puede atender).
          return new Promise<void>(() => {})
        }

        throw error
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  // Store original $fetch before overriding
  const originalFetch = globalThis.$fetch

  // Inner fetch with onRequest interceptor (auth header injection)
  const innerFetch = originalFetch.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string' ? request : request.toString()
      const isApiCall = url.includes('/api') || url.startsWith(config.public.apiBase)

      if (!isApiCall) return

      // Always include credentials for HttpOnly cookie support
      options.credentials = options.credentials || 'include'

      try {
        const authStore = useAuthStore()
        const accessToken = authStore.tokens?.accessToken

        if (accessToken) {
          const headers = (options.headers || {}) as HeadersInit

          if (headers instanceof Headers) {
            headers.set('Authorization', `Bearer ${accessToken}`)
          } else if (Array.isArray(headers)) {
            ;(headers as string[][]).push(['Authorization', `Bearer ${accessToken}`])
          } else {
            ;(headers as Record<string, string>).Authorization = `Bearer ${accessToken}`
          }

          options.headers = headers as Headers
        }
      } catch {
        // Auth store might not be ready yet during hydration
      }
    },
  })

  // Wrap fetch to handle 401 with refresh + retry, returning the retried response
  // (ofetch's onResponseError can't substitute the response — it only observes errors)
  const wrappedFetch = (async (request: any, options: any = {}) => {
    try {
      return await innerFetch(request, options)
    } catch (err: any) {
      const status = err?.response?.status
      const url = typeof request === 'string' ? request : request?.toString?.() || ''
      const isAuthEndpoint =
        url.includes('/auth/refresh-token') ||
        url.includes('/auth/login') ||
        url.includes('/auth/registro')
      if (status !== 401 || isAuthEndpoint) throw err

      await attemptRefresh()
      // onRequest will re-inject the new token on retry
      return await innerFetch(request, options)
    }
  }) as typeof $fetch

  // Preserve ofetch surface (raw, create, etc.)
  wrappedFetch.raw = innerFetch.raw
  wrappedFetch.create = innerFetch.create

  globalThis.$fetch = wrappedFetch
})
