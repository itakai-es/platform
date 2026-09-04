import { prisma } from '../../config/database.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'

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

    if (!user) throw new Error('Usuario no encontrado')

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
   * Change user password
   */
  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('Usuario no encontrado')

    const isValid = await verifyPassword(data.currentPassword, user.passwordHash)
    if (!isValid) throw new Error('Contraseña actual incorrecta')

    const newHash = await hashPassword(data.newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    })

    return { success: true, message: 'Contraseña actualizada correctamente' }
  }

  /**
   * Change user email
   */
  async changeEmail(userId: string, data: { newEmail: string }) {
    // Check if email is already in use
    const existing = await prisma.user.findUnique({ where: { email: data.newEmail } })
    if (existing && existing.id !== userId) {
      throw new Error('Este email ya está en uso')
    }

    await prisma.user.update({
      where: { id: userId },
      data: { email: data.newEmail },
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
                invitationCode: true,
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

    if (!user) throw new Error('Usuario no encontrado')

    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
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
        classes: user.teacherClasses,
        createdBadges: user.createdBadges,
        sentInvitations: user.sentInvitations,
      },
      studentData: {
        enrollments: user.enrollments,
        earnedBadges: user.earnedBadges,
        missionProgress: user.missionProgress,
        enigmaProgress: user.enigmaProgress,
        submissions: user.submissions,
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
    if (!user) throw new Error('Usuario no encontrado')

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) throw new Error('Contraseña incorrecta')

    // Cascade delete handles related records
    await prisma.user.delete({ where: { id: userId } })

    return { success: true, message: 'Cuenta eliminada correctamente' }
  }
}

export const profileService = new ProfileService()
