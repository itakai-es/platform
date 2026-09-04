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
  email: string
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
}
