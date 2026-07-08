import { prisma } from '../../config/database.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import {
  generateTokens,
  generateAccessToken,
  generatePasswordResetToken,
  TokenError,
  type AuthTokens,
  verifyPasswordResetToken,
} from '../../utils/tokens.js'
import type { LoginInput, LoginAliasInput, SignupInput, OnboardingInput } from './auth.schema.js'
import type { UserRole } from '../../generated/prisma/client.js'
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../../utils/email.js'
import { OAuth2Client } from 'google-auth-library'
import { getDomainSettings, getGeneralSettings } from '../settings/settings.service.js'

// ==================== TYPES ====================

interface RequestContext {
  userAgent?: string
  ipAddress?: string
}

interface LoginResult {
  user: ReturnType<AuthService['sanitizeUser']>
  tokens: AuthTokens
}

// ==================== SERVICE ====================

export class AuthService {
  /**
   * Login with email and password
   * Creates a new token family for this session
   */
  async login(input: LoginInput, context?: RequestContext): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (!user) {
      throw new Error('Credenciales inválidas')
    }

    if (user.status !== 'active') {
      throw new Error('Cuenta suspendida o inactiva')
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash)
    if (!validPassword) {
      throw new Error('Credenciales inválidas')
    }

    // Generate new token pair with new family
    const { accessToken, refreshToken } = generateTokens({ id: user.id, role: user.role })

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken.token,
        userId: user.id,
        family: refreshToken.family,
        expiresAt: refreshToken.expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      },
    })

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
    }
  }

  /**
   * Login with alias (nickname) + code for younger students
   * Searches for user by nickname in any of their class enrollments
   */
  async loginWithAlias(input: LoginAliasInput, context?: RequestContext): Promise<LoginResult> {
    // Find enrollment with matching nickname
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { nickname: input.alias },
      include: { student: true, class: { select: { invitationCode: true } } },
    })

    if (!enrollment?.student) {
      throw new Error('Credenciales inválidas')
    }

    const user = enrollment.student

    if (user.status !== 'active') {
      throw new Error('Cuenta suspendida o inactiva')
    }

    // El código de acceso del alumno es el código de invitación de su clase
    // (el que le da el profesor), no un número cualquiera.
    if (input.code.trim() !== enrollment.class.invitationCode) {
      throw new Error('Código inválido')
    }

    const { accessToken, refreshToken } = generateTokens({ id: user.id, role: user.role })

    await prisma.refreshToken.create({
      data: {
        token: refreshToken.token,
        userId: user.id,
        family: refreshToken.family,
        expiresAt: refreshToken.expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      },
    })

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
    }
  }

  /**
   * Login with Google OAuth using Authorization Code flow
   * Exchanges the code for tokens server-side (works without active Google session in browser)
   */
  async loginWithGoogleCode(code: string, context?: RequestContext): Promise<LoginResult> {
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth no está configurado')
    }

    // Exchange authorization code for tokens using 'postmessage' redirect (popup mode)
    const client = new OAuth2Client(googleClientId, googleClientSecret, 'postmessage')

    let payload
    try {
      const { tokens } = await client.getToken(code)

      if (!tokens.id_token) {
        throw new Error('No se recibió ID token de Google')
      }

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: googleClientId,
      })
      payload = ticket.getPayload()
    } catch (error) {
      console.error('Error intercambiando código de Google:', error)
      throw new Error('Código de Google inválido')
    }

    if (!payload || !payload.email) {
      throw new Error('Token de Google no contiene información de email')
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    })

    if (user) {
      if (user.status !== 'active') {
        throw new Error('Cuenta suspendida o inactiva')
      }
    } else {
      const { registrationOpen } = await getGeneralSettings()
      if (!registrationOpen) {
        throw new Error('El registro de nuevos usuarios está deshabilitado en esta instancia')
      }
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          passwordHash: '',
          isOnboarded: false,
        },
      })
    }

    const { accessToken, refreshToken } = generateTokens({ id: user.id, role: user.role })

    await prisma.refreshToken.create({
      data: {
        token: refreshToken.token,
        userId: user.id,
        family: refreshToken.family,
        expiresAt: refreshToken.expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      },
    })

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
    }
  }

  /**
   * Login with Google OAuth
   * Verifies the Google credential and creates/logs in the user
   */
  async loginWithGoogle(credential: string, context?: RequestContext): Promise<LoginResult> {
    const googleClientId = process.env.GOOGLE_CLIENT_ID

    if (!googleClientId) {
      throw new Error('Google OAuth no está configurado')
    }

    // Verify the Google token
    const client = new OAuth2Client(googleClientId)

    let payload
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      })
      payload = ticket.getPayload()
    } catch (error) {
      console.error('Error verificando token de Google:', error)
      throw new Error('Token de Google inválido')
    }

    if (!payload || !payload.email) {
      throw new Error('Token de Google no contiene información de email')
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    })

    if (user) {
      // User exists - check if account is active
      if (user.status !== 'active') {
        throw new Error('Cuenta suspendida o inactiva')
      }
    } else {
      const { registrationOpen } = await getGeneralSettings()
      if (!registrationOpen) {
        throw new Error('El registro de nuevos usuarios está deshabilitado en esta instancia')
      }
      // Create new user from Google account
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          passwordHash: '', // No password for OAuth users
          isOnboarded: false, // Needs to select role
          // avatar: payload.picture, // Uncomment if User model has avatar field
        },
      })
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({ id: user.id, role: user.role })

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken.token,
        userId: user.id,
        family: refreshToken.family,
        expiresAt: refreshToken.expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      },
    })

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
    }
  }

  /**
   * Register a new user
   */
  async signup(input: SignupInput, context?: RequestContext): Promise<LoginResult> {
    const { registrationOpen } = await getGeneralSettings()
    if (!registrationOpen) {
      throw new Error('El registro de nuevos usuarios está deshabilitado en esta instancia')
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existingUser) {
      throw new Error('El email ya está registrado')
    }

    const passwordHash = await hashPassword(input.password)

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        isOnboarded: false,
        settings: { create: {} },
      },
    })

    const { accessToken, refreshToken } = generateTokens({ id: user.id, role: user.role })

    await prisma.refreshToken.create({
      data: {
        token: refreshToken.token,
        userId: user.id,
        family: refreshToken.family,
        expiresAt: refreshToken.expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      },
    })

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
    }
  }

  /**
   * Refresh tokens using a valid refresh token
   *
   * Security features:
   * 1. Token rotation: Old token is invalidated, new one is issued
   * 2. Family tracking: Same family is maintained for the session
   * 3. Reuse detection: If a revoked token is used, entire family is invalidated
   */
  async refreshToken(refreshTokenValue: string, context?: RequestContext): Promise<{ tokens: AuthTokens }> {
    // Find the refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: true },
    })

    // Token not found
    if (!storedToken) {
      throw new TokenError('REFRESH_TOKEN_NOT_FOUND', 'Token no encontrado')
    }

    // Check if token was already used (possible token theft!)
    if (storedToken.isRevoked) {
      // Security breach detected: Revoke ALL tokens in this family
      await this.revokeTokenFamily(storedToken.family, storedToken.userId)

      throw new TokenError(
        'TOKEN_REUSE_DETECTED',
        'Sesión comprometida. Por seguridad, se han cerrado todas las sesiones.'
      )
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Mark as revoked and throw
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      })
      throw new TokenError('REFRESH_TOKEN_EXPIRED', 'Token expirado')
    }

    // Check if user is still active
    if (storedToken.user.status !== 'active') {
      throw new Error('Cuenta suspendida o inactiva')
    }

    // Token rotation: Mark current token as revoked
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        isRevoked: true,
        lastUsedAt: new Date(),
      },
    })

    // Generate new tokens with the SAME family
    const { accessToken, refreshToken } = generateTokens(
      { id: storedToken.user.id, role: storedToken.user.role },
      storedToken.family // Keep the same family
    )

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken.token,
        userId: storedToken.user.id,
        family: refreshToken.family,
        expiresAt: refreshToken.expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      },
    })

    return {
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
    }
  }

  /**
   * Logout - revoke the refresh token
   */
  async logout(refreshTokenValue?: string): Promise<{ success: true; message: string }> {
    if (refreshTokenValue) {
      const token = await prisma.refreshToken.findUnique({
        where: { token: refreshTokenValue },
      })

      if (token) {
        // Revoke the token
        await prisma.refreshToken.update({
          where: { id: token.id },
          data: { isRevoked: true },
        })
      }
    }

    return { success: true, message: 'Sesión cerrada correctamente' }
  }

  /**
   * Logout from all devices - revoke all tokens for user
   */
  async logoutAll(userId: string): Promise<{ success: true; message: string }> {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    })

    return { success: true, message: 'Todas las sesiones han sido cerradas' }
  }

  /**
   * Complete onboarding - set user role
   */
  async completeOnboarding(userId: string, input: OnboardingInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role: input.role as UserRole,
        isOnboarded: true,
      },
    })

    return this.sanitizeUser(user)
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('Usuario no encontrado')
    }

    return this.sanitizeUser(user)
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' }
    }

    // TODO: Implement actual email sending
    return { success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' }
  }

  async resetPassword(token: string, password: string) {
    const payload = verifyPasswordResetToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user || user.email !== payload.email) {
      throw new Error('No se pudo validar el reseteo de contraseña')
    }

    const passwordHash = await hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      }),
    ])

    // Notify user of the password change (non-blocking)
    sendPasswordChangedEmail(user.email).catch((err) => {
      console.error('[auth] Failed to send password changed email:', err)
    })

    return { success: true, message: 'Contraseña actualizada correctamente' }
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return { success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' }
    }

    const resetToken = generatePasswordResetToken({
      userId: user.id,
      email: user.email,
    })

    const { appUrl } = await getDomainSettings()
    const appOrigin = appUrl || process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:4000'
    const resetUrl = `${appOrigin}/auth/reset-password?token=${encodeURIComponent(resetToken)}`

    // Send the reset email (non-blocking — don't let email failure block the response)
    sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      console.error('[auth] Failed to send password reset email:', err)
    })

    return {
      success: true,
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña',
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
      resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
    }
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string) {
    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        family: true,
        createdAt: true,
        lastUsedAt: true,
        userAgent: true,
        ipAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      sessions: tokens.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        userAgent: t.userAgent,
        ipAddress: t.ipAddress,
      })),
      total: tokens.length,
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string) {
    const token = await prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    })

    if (!token) {
      throw new Error('Sesión no encontrada')
    }

    await prisma.refreshToken.update({
      where: { id: token.id },
      data: { isRevoked: true },
    })

    return { success: true, message: 'Sesión cerrada' }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Revoke all tokens in a family (security breach response)
   */
  private async revokeTokenFamily(family: string, userId: string) {
    await prisma.refreshToken.updateMany({
      where: { family, userId },
      data: { isRevoked: true },
    })

    // Log security event
    await prisma.activity.create({
      data: {
        userId,
        type: 'xp_gained', // Using existing enum, ideally would be 'security_breach'
        description: 'Sesión comprometida detectada - todas las sesiones de esta familia revocadas',
        metadata: { family, reason: 'token_reuse_detected' },
      },
    })
  }

  /**
   * Clean user object for API response
   */
  private sanitizeUser(user: {
    id: string
    email: string
    name: string
    role: UserRole | null
    isOnboarded: boolean
    createdAt: Date
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isOnboarded: user.isOnboarded,
      createdAt: user.createdAt,
    }
  }
}

export const authService = new AuthService()
