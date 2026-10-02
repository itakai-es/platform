/**
 * Composable para manejar autenticación con Google OAuth
 * Usa Google Identity Services (One Tap)
 *
 * @see https://developers.google.com/identity/gsi/web/guides/overview
 */

import type { CredentialResponse } from '~/types/auth.types'

export const useGoogleAuth = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const googleClientId = computed(() => config.public.googleClientId as string)
  const isGoogleScriptLoaded = ref(false)
  const isInitialized = ref(false)

  /**
   * Carga el script de Google Identity Services
   */
  const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Si ya está cargado, resolvemos inmediatamente
      if (isGoogleScriptLoaded.value) {
        resolve()
        return
      }

      // Verificar si el script ya existe
      if (document.getElementById('google-identity-script')) {
        isGoogleScriptLoaded.value = true
        resolve()
        return
      }

      // Crear y cargar el script
      const script = document.createElement('script')
      script.id = 'google-identity-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true

      script.onload = () => {
        isGoogleScriptLoaded.value = true
        resolve()
      }

      script.onerror = () => {
        reject(new Error('Error al cargar el script de Google Identity'))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * Inicializa el cliente de Google Sign-In
   */
  const initializeGoogle = async (): Promise<void> => {
    if (isInitialized.value) return

    try {
      await loadGoogleScript()

      if (!window.google) {
        throw new Error('Google Identity Services no está disponible')
      }

      if (!googleClientId.value || googleClientId.value.includes('TU_GOOGLE')) {
        console.error('❌ GOOGLE_CLIENT_ID no está configurado correctamente')
        throw new Error('Google Client ID no configurado')
      }

      // Inicializar Google Identity Services
      window.google.accounts.id.initialize({
        client_id: googleClientId.value,
        callback: handleGoogleCallback,
        auto_select: false, // No auto-seleccionar cuenta
        cancel_on_tap_outside: true, // Cerrar popup al hacer clic fuera
      })

      isInitialized.value = true
    } catch (error) {
      console.error('Error al inicializar Google Sign-In:', error)
      throw error
    }
  }

  /**
   * Callback que recibe la respuesta de Google
   */
  const handleGoogleCallback = async (response: CredentialResponse) => {
    try {
      // El credential es un JWT firmado por Google
      const googleToken = response.credential

      // Enviar el token al backend para validación
      await authStore.loginWithGoogle(googleToken)
    } catch (error) {
      console.error('❌ Error en login con Google:', error)
      throw error
    }
  }

  /**
   * Abre el popup de Google OAuth y espera a que el usuario complete el login.
   * Usa Authorization Code flow (initCodeClient) que funciona en todos los navegadores
   * sin necesidad de sesión activa de Google ni cookies de terceros.
   */
  const signInWithPopup = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        await loadGoogleScript()

        if (!window.google) {
          reject(new Error('Google Identity Services no disponible'))
          return
        }

        if (!googleClientId.value || googleClientId.value.includes('TU_GOOGLE')) {
          reject(new Error('Google Client ID no configurado'))
          return
        }

        // Authorization Code flow con popup: funciona sin sesión activa de Google
        // El código de autorización se intercambia en el backend por tokens reales
        const client = window.google.accounts.oauth2.initCodeClient({
          client_id: googleClientId.value,
          scope: 'email profile openid',
          ux_mode: 'popup',
          callback: async (response: { code: string; error?: string }) => {
            if (response.error) {
              if (response.error === 'access_denied') {
                reject(new Error('Se canceló el acceso con Google'))
              } else {
                reject(new Error('Error de Google: ' + response.error))
              }
              return
            }
            try {
              await authStore.loginWithGoogleCode(response.code)
              resolve()
            } catch (error) {
              reject(error)
            }
          },
          // Fires when the popup is closed/blocked before completing — without this,
          // closing the popup would leave the caller hanging forever.
          error_callback: (err: { type?: string; message?: string }) => {
            const e = new Error(err?.type || err?.message || 'google_popup_error') as Error & {
              code?: string
            }
            e.code = err?.type === 'popup_closed' ? 'cancelled' : 'google_error'
            reject(e)
          },
        } as Parameters<typeof window.google.accounts.oauth2.initCodeClient>[0])

        client.requestCode()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Método alternativo: render button (si el popup no funciona)
   */
  const signInWithButton = (): void => {
    // Este método se puede usar para renderizar el botón oficial de Google
    // en un elemento específico del DOM
  }

  /**
   * Renderiza el botón de Google Sign-In en un elemento
   */
  const renderButton = (elementId: string, options = {}): void => {
    if (!isInitialized.value) {
      console.error('Google Identity Services no está inicializado')
      return
    }

    if (!window.google) {
      console.error('Google Identity Services no disponible')
      return
    }

    const defaultOptions: GoogleButtonConfig = {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 280,
      locale: 'es',
    }

    window.google.accounts.id.renderButton(document.getElementById(elementId), {
      ...defaultOptions,
      ...options,
    })
  }

  /**
   * Cierra sesión de Google (limpia cookies)
   */
  const googleSignOut = (): void => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect()
    }
  }

  return {
    initializeGoogle,
    signInWithPopup,
    renderButton,
    googleSignOut,
    isGoogleScriptLoaded,
    isInitialized,
  }
}
