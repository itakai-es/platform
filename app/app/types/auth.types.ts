/** Quién lleva la cuenta: su dueño (`self`) o el profesorado (`managed`). */
export type AccountType = 'self' | 'managed'

export interface User {
  id: string
  /** Nulo en una cuenta que entra con usuario: no tiene correo. */
  email: string | null
  name: string
  /** Nulo en una cuenta que se registró con su correo. */
  username: string | null
  role: 'teacher' | 'student' | 'admin' | null
  accountType?: AccountType
  avatar?: string
  isOnboarded: boolean
  /** Contraseña temporal pendiente de cambiar: hasta que se cambie, no se puede hacer nada más. */
  mustChangePassword?: boolean
  createdAt: Date
}

export interface LoginCredentials {
  /** El correo o el usuario: la API decide por la arroba. */
  identifier: string
  password: string
}

/**
 * Credenciales de una cuenta que lleva el profesorado, tal y como llegan del
 * servidor al crearla o al restablecerla. La contraseña temporal solo viaja en
 * esa respuesta: no se guarda en ningún sitio y, si se pierde, se restablece.
 */
export interface ManagedCredentials {
  student: { id: string; name: string; username: string }
  temporaryPassword: string
}

export interface SignupData {
  email: string
  password: string
  name: string
  acceptTerms?: boolean
  // role se selecciona en onboarding, no en signup
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string // Optional: refreshToken is stored in HttpOnly cookie, not returned to client
}

export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
}

export interface OnboardingData {
  username?: string
  avatar?: string
  preferences?: Record<string, any>
}

/**
 * Google Identity Services Types
 * @see https://developers.google.com/identity/gsi/web/reference/js-reference
 */

export interface CredentialResponse {
  credential: string
  select_by: string
  clientId?: string
}

export interface GoogleIdentityConfig {
  client_id: string
  callback: (response: CredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  prompt_parent_id?: string
  nonce?: string
  context?: 'signin' | 'signup' | 'use'
  state_cookie_domain?: string
  ux_mode?: 'popup' | 'redirect'
  allowed_parent_origin?: string | string[]
  intermediate_iframe_close_callback?: () => void
}
