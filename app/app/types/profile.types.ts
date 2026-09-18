import type { AccountType } from '~/types/auth.types'

/**
 * Profile Module Type Definitions
 * Tipos para configuración de perfil de usuario
 */
import type { AppLanguage } from '~/utils/app-languages'
import type { AccessibilityPreferences } from '~/utils/accessibility'

/**
 * Sesión activa del usuario
 */
export interface UserSession {
  id: string
  device: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  location: string
  lastActive: string
  current: boolean
  ip?: string
}

/**
 * Configuración de seguridad del usuario
 */
export interface SecuritySettings {
  twoFactorEnabled: boolean
  sessions: UserSession[]
}

/**
 * Configuración de preferencias del usuario
 */
export interface UserPreferences extends AccessibilityPreferences {
  emailNotifications: boolean
  missionReminders: boolean
  language: AppLanguage
  theme: 'college' | 'university'
  menuDisplay: 'both' | 'icon' | 'text'
}

/**
 * Datos completos del perfil
 */
export interface UserProfile {
  id: string
  /** Nulo en una cuenta que entra con usuario: no tiene correo. */
  email: string | null
  /** Nulo en una cuenta que se registró con su correo. */
  username: string | null
  /** Quién lleva la cuenta: su dueño (`self`) o el profesorado (`managed`). */
  accountType: AccountType
  name: string
  role: 'student' | 'teacher' | 'admin'
  security: SecuritySettings
  preferences: UserPreferences
  createdAt: Date
}

/**
 * Request para cambiar contraseña
 */
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/**
 * Request para cambiar email
 */
export interface ChangeEmailRequest {
  newEmail: string
  password: string
}

/**
 * Response genérica de éxito
 */
export interface ProfileActionResponse {
  success: boolean
  message: string
  /** Código estable del error, cuando el servidor lo da. */
  code?: string
}

/**
 * Qué pasaría con las clases de una cuenta si se borrase: cada clase de la que
 * es propietaria pasa a otra persona con administración; si en alguna no hay
 * nadie, la cuenta no se puede borrar.
 */
export interface AccountDeletionCheck {
  canDelete: boolean
  blockingClasses: { id: string; name: string }[]
  transfers: { classId: string; className: string; toUser: { id: string; name: string } }[]
}
