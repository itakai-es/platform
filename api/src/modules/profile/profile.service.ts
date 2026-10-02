import { prisma } from '../../config/database.js'
import { verifyPassword } from '../../utils/password.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js'
import { normalizeEmail } from '../../utils/identity.js'
import { changeOwnPassword } from '../../utils/password-change.js'
import { privateUploadResolver } from '../storage/storage.service.js'
import { deleteUserAccount } from './account-deletion.service.js'

function parseUserAgent(userAgent: string): { browser: string; os: string; device: 'desktop' | 'mobile' | 'tablet' } {
  const ua = userAgent.toLowerCase()

  // Detect browser
  let browser = 'Desconocido'
  if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome') && !ua.includes('edg/')) browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera'

  // Detect OS
  let os = 'Desconocido'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac os')) os = 'macOS'
  else if (ua.includes('linux') && !ua.includes('android')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

  // Detect device type
  let device: 'desktop' | 'mobile' | 'tablet' = 'desktop'
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) device = 'mobile'
  if (ua.includes('tablet') || ua.includes('ipad')) device = 'tablet'

  return { browser, os, device }
}

export class ProfileService {
  /**
   * Get user profile with security settings and preferences
   */
  async getProfile(userId: string, currentTokenFamily?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        refreshTokens: {
          where: { isRevoked: false, expiresAt: { gt: new Date() } },
          orderBy: { lastUsedAt: 'desc' },
        },
      },
    })

    if (!user) throw new Error('Cuenta no encontrada')

    // Map refresh tokens to sessions
    const sessions = user.refreshTokens.map((token) => {
      const { browser, os, device } = parseUserAgent(token.userAgent || '')

      return {
        id: token.id,
        device,
        browser,
        os,
        location: '',
        lastActive: token.lastUsedAt?.toISOString() || token.createdAt.toISOString(),
        current: token.family === currentTokenFamily,
      }
    })

    // Get or create settings
    const settings = user.settings || {
      twoFactorEnabled: false,
      emailNotifications: true,
      missionReminders: true,
      language: 'es',
      theme: 'college',
      menuDisplay: 'both',
      fontScale: 'normal',
      contrastMode: 'normal',
      colorVision: 'default',
      reduceMotion: false,
    }

    return {
      profile: {
        id: user.id,
        email: user.email,
        username: user.username,
        accountType: user.accountType,
        name: user.name,
        role: user.role,
        security: {
          twoFactorEnabled: settings.twoFactorEnabled,
          sessions,
        },
        preferences: {
          emailNotifications: settings.emailNotifications,
          missionReminders: settings.missionReminders,
          language: settings.language,
          theme: settings.theme,
          menuDisplay: settings.menuDisplay,
          fontScale: settings.fontScale,
          contrastMode: settings.contrastMode,
          colorVision: settings.colorVision,
          reduceMotion: settings.reduceMotion,
        },
        createdAt: user.createdAt,
      },
    }
  }

  /**
   * Cambio de contraseña del dueño de la cuenta. El camino es el mismo para
   * todos (utils/password-change.ts): la sesión que lo pide sigue abierta y las
   * demás se cierran.
   */
  async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string },
    currentTokenFamily?: string
  ) {
    return changeOwnPassword(userId, data, { keepSessionFamily: currentTokenFamily })
  }

  /**
   * Change user email. Exige la contraseña actual: el correo es con lo que se
   * entra y se recupera la cuenta, así que cambiarlo pide lo mismo que cambiar
   * la contraseña. Una cuenta que solo entra con Google no tiene contraseña y su
   * correo es el de Google: antes tiene que crearse una con «He olvidado mi
   * contraseña».
   */
  async changeEmail(userId: string, data: { newEmail: string; password?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('Cuenta no encontrada')

    // Una cuenta gestionada no tiene correo y no puede ponerse uno: el correo es
    // con lo que se recupera la cuenta y, en estas, eso lo lleva el profesorado.
    if (user.accountType === 'managed') {
      throw new ForbiddenError(
        'Tu cuenta la gestiona tu profesorado y no puede tener correo. Pídeselo a quien te la creó.',
        'MANAGED_ACCOUNT'
      )
    }

    if (!user.passwordHash) {
      throw new ValidationError(
        'Tu cuenta entra con Google y no tiene contraseña. Crea una desde «¿Olvidaste tu contraseña?» para poder cambiar el correo.',
        'PASSWORD_NOT_SET'
      )
    }
    if (!data.password) {
      throw new ValidationError('Escribe tu contraseña actual para cambiar el correo', 'PASSWORD_REQUIRED')
    }
    if (!(await verifyPassword(data.password, user.passwordHash))) {
      throw new ValidationError('Contraseña actual incorrecta', 'INVALID_PASSWORD')
    }

    // El correo se guarda en minúsculas, así que la comprobación va sobre lo mismo.
    const newEmail = normalizeEmail(data.newEmail)
    const existing = await prisma.user.findUnique({ where: { email: newEmail } })
    if (existing && existing.id !== userId) {
      throw new ValidationError('Este email ya está en uso', 'EMAIL_IN_USE')
    }

    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    })

    return { success: true, message: 'Email actualizado correctamente' }
  }

  /**
   * Toggle two-factor authentication
   */
  async toggleTwoFactor(userId: string, enabled: boolean) {
    await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, twoFactorEnabled: enabled },
      update: { twoFactorEnabled: enabled },
    })

    return {
      success: true,
      message: enabled ? '2FA activado correctamente' : '2FA desactivado correctamente',
    }
  }

  /**
   * Close a specific session (revoke refresh token)
   */
  async closeSession(userId: string, sessionId: string) {
    const token = await prisma.refreshToken.findFirst({
      where: { id: sessionId, userId, isRevoked: false },
    })

    if (!token) throw new Error('Sesión no encontrada')

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    })

    return { success: true, message: 'Sesión cerrada correctamente' }
  }

  /**
   * Close all sessions except the current one
   */
  async closeAllSessions(userId: string, currentTokenFamily?: string) {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
        ...(currentTokenFamily ? { family: { not: currentTokenFamily } } : {}),
      },
      data: { isRevoked: true },
    })

    return { success: true, message: 'Todas las sesiones cerradas correctamente' }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, data: {
    emailNotifications?: boolean
    missionReminders?: boolean
    language?: string
    theme?: string
    menuDisplay?: string
    fontScale?: string
    contrastMode?: string
    colorVision?: string
    reduceMotion?: boolean
  }) {
    await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    })

    return { success: true, message: 'Preferencias actualizadas correctamente' }
  }

  /**
   * Export all user data for ARCO access requests
   */
  async exportUserData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        refreshTokens: {
          select: {
            id: true,
            family: true,
            isRevoked: true,
            expiresAt: true,
            createdAt: true,
            lastUsedAt: true,
            userAgent: true,
            ipAddress: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        teacherClasses: {
          include: {
            enrollments: {
              where: { isPreview: false },
              select: {
                id: true,
                studentId: true,
                xp: true,
                level: true,
                nickname: true,
                avatarUrl: true,
                enrolledAt: true,
              },
            },
            missions: {
              include: {
                enigmas: true,
                documents: true,
                badges: true,
              },
            },
            guide: true,
            joinRequests: true,
            invitations: true,
          },
        },
        enrollments: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                narrative: true,
                schedule: true,
                archived: true,
                // Sin el código de invitación: es de quien administra la clase, y
                // aquí entran también las matrículas de vista previa.
                teacherId: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        createdBadges: true,
        earnedBadges: {
          include: {
            badge: true,
          },
        },
        missionProgress: true,
        enigmaProgress: true,
        notifications: true,
        activities: true,
        joinRequests: true,
        sentInvitations: true,
        receivedInvitations: true,
        submissions: true,
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) throw new Error('Cuenta no encontrada')

    // Los ficheros de las entregas y de los documentos de misión no se sirven
    // por su dirección: en la exportación va la de la descarga que comprueba el
    // acceso, para que el enlace lleve a algún sitio.
    const privateUploadOf = await privateUploadResolver()
    const withFileRoute = <T extends { id: string; fileUrl: string | null }>(
      row: T,
      route: string
    ) => (privateUploadOf(row.fileUrl) ? { ...row, fileUrl: `${route}/${row.id}` } : row)

    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        username: user.username,
        accountType: user.accountType,
        name: user.name,
        role: user.role,
        isOnboarded: user.isOnboarded,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      settings: user.settings,
      sessions: user.refreshTokens,
      teacherData: {
        classes: user.teacherClasses.map(cls => ({
          ...cls,
          missions: cls.missions.map(mission => ({
            ...mission,
            documents: mission.documents.map(d => withFileRoute(d, '/files/documents')),
          })),
        })),
        createdBadges: user.createdBadges,
        sentInvitations: user.sentInvitations,
      },
      studentData: {
        enrollments: user.enrollments,
        earnedBadges: user.earnedBadges,
        missionProgress: user.missionProgress,
        enigmaProgress: user.enigmaProgress,
        submissions: user.submissions.map(s => withFileRoute(s, '/files/submissions')),
        joinRequests: user.joinRequests,
        receivedInvitations: user.receivedInvitations,
      },
      engagement: {
        notifications: user.notifications,
        activities: user.activities,
        conversations: user.conversations,
      },
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('Cuenta no encontrada')

    // Una cuenta gestionada no se borra a sí misma: quien ejerce ese derecho es
    // su profesorado o quien administra la instancia.
    if (user.accountType === 'managed') {
      throw new ForbiddenError(
        'Tu cuenta la gestiona tu profesorado y no puedes borrarla. Pídeselo a quien te la creó.',
        'MANAGED_ACCOUNT'
      )
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) throw new Error('Contraseña incorrecta')

    // Lo suyo se borra en cascada; antes, sus clases pasan a otra persona y sus
    // insignias a quien corresponda, o no se borra nada (ver account-deletion.service).
    await deleteUserAccount(userId, { actorId: userId, bySelf: true })

    return { success: true, message: 'Cuenta eliminada correctamente' }
  }
}

export const profileService = new ProfileService()
