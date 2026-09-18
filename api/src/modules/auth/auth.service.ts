import { prisma } from '../../config/database.js'
import { hashPassword, verifyAgainstDecoy, verifyPassword } from '../../utils/password.js'
import {
  generateTokens,
  generateAccessToken,
  generatePasswordResetToken,
  TokenError,
  type AuthTokens,
  verifyPasswordResetToken,
} from '../../utils/tokens.js'
import type { LoginInput, SignupInput, OnboardingInput } from './auth.schema.js'
import type { UserAccountType, UserRole } from '../../generated/prisma/client.js'
import { sendPasswordResetEmail } from '../../utils/email.js'
import { getAppOrigin } from '../../utils/app-url.js'
import { OAuth2Client } from 'google-auth-library'
import { getGeneralSettings } from '../settings/settings.service.js'
import { identifierWhere, normalizeEmail } from '../../utils/identity.js'
import { setUserPassword } from '../../utils/password-change.js'

// ==================== TYPES ====================

interface RequestContext {
  userAgent?: string
  ipAddress?: string
}

interface LoginResult {
  user: ReturnType<AuthService['sanitizeUser']>
  tokens: AuthTokens
}

/** Lo que hace falta de la cuenta para abrirle una sesión. */
interface SessionUser {
  id: string
  role: UserRole | null
}

// ==================== SERVICE ====================

export class AuthService {
  /**
   * Entrar con el correo o con el usuario y la contraseña. El identificador con
   * arroba se busca por correo y el resto por usuario (ver utils/identity.ts).
   *
   * Probar identificadores no dice qué cuentas hay: todos los fallos responden
   * lo mismo, y cuando el identificador no existe se comprueba la contraseña
   * contra un hash señuelo para que la respuesta tarde lo mismo. El estado de la
   * cuenta se mira DESPUÉS de la contraseña, así que enterarse de que una cuenta
   * está suspendida exige acertar sus credenciales. Con el usuario como
   * identificador esto importa más que antes: un usuario es corto y se puede
   * adivinar a partir del nombre, así que lo único que separa de la cuenta es la
   * contraseña (la ruta, además, cuenta los intentos fallidos).
   */
  async login(input: LoginInput, context?: RequestContext): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: identifierWhere(input.identifier),
    })

    if (!user) {
      await verifyAgainstDecoy(input.password)
      throw new Error('Credenciales inválidas')
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash)
    if (!validPassword) {
      throw new Error('Credenciales inválidas')
    }

    if (user.status !== 'active') {
      throw new Error('Cuenta suspendida o inactiva')
    }

    return {
      user: this.sanitizeUser(user),
      tokens: await this.issueSession(user, context),
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

    const user = await this.findOrCreateGoogleUser(payload.email, payload.name)

    return {
      user: this.sanitizeUser(user),
      tokens: await this.issueSession(user, context),
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

    const user = await this.findOrCreateGoogleUser(payload.email, payload.name)

    return {
      user: this.sanitizeUser(user),
      tokens: await this.issueSession(user, context),
    }
  }

  /**
   * La cuenta que corresponde a un correo de Google, creándola si hace falta y
   * si la instancia admite registros. Una cuenta creada así no tiene contraseña:
   * entra siempre por Google hasta que se cree una con «¿Olvidaste tu contraseña?».
   */
  private async findOrCreateGoogleUser(googleEmail: string, googleName?: string) {
    const email = normalizeEmail(googleEmail)
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      if (existing.status !== 'active') {
        throw new Error('Cuenta suspendida o inactiva')
      }
      return existing
    }

    const { registrationOpen } = await getGeneralSettings()
    if (!registrationOpen) {
      throw new Error('El registro de nuevos usuarios está deshabilitado en esta instancia')
    }

    return prisma.user.create({
      data: {
        email,
        name: googleName || email.split('@')[0],
        passwordHash: '',
        isOnboarded: false, // Le queda elegir el rol
      },
    })
  }

  /**
   * Register a new user
   */
  async signup(input: SignupInput, context?: RequestContext): Promise<LoginResult> {
    const { registrationOpen } = await getGeneralSettings()
    if (!registrationOpen) {
      throw new Error('El registro de nuevos usuarios está deshabilitado en esta instancia')
    }

    const email = normalizeEmail(input.email)
    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) {
      throw new Error('El email ya está registrado')
    }

    const passwordHash = await hashPassword(input.password)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name,
        isOnboarded: false,
        passwordChangedAt: new Date(),
        settings: { create: {} },
      },
    })

    return {
      user: this.sanitizeUser(user),
      tokens: await this.issueSession(user, context),
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
    // El rol se elige una sola vez, al terminar el alta. La condición va en el
    // propio UPDATE para que dos peticiones a la vez no puedan colarse entre la
    // comprobación y la escritura.
    const { count } = await prisma.user.updateMany({
      where: { id: userId, isOnboarded: false },
      data: {
        role: input.role as UserRole,
        isOnboarded: true,
      },
    })
    if (count === 0) {
      throw new Error('El rol de esta cuenta ya está elegido')
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

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

  /** Cambia la contraseña con el enlace que llegó por correo y cierra todas las sesiones. */
  async resetPassword(token: string, password: string) {
    const payload = verifyPasswordResetToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user || !user.email || user.email !== payload.email) {
      throw new Error('No se pudo validar el reseteo de contraseña')
    }
    // Si la contraseña ha cambiado desde que se pidió el enlace, ya no vale.
    if ((user.passwordChangedAt?.getTime() ?? null) !== payload.passwordChangedAt) {
      throw new TokenError('TOKEN_INVALID', 'Este enlace ya no es válido. Pide uno nuevo.')
    }

    return setUserPassword(user.id, password)
  }

  /**
   * Pide el enlace de recuperación. Responde siempre lo mismo, exista o no la
   * cuenta y tenga o no correo: quien entra con usuario y no tiene correo pide a
   * su profesor que se la restablezca.
   */
  async requestPasswordReset(inputEmail: string) {
    const email = normalizeEmail(inputEmail)
    const sameAnswer = {
      success: true,
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña',
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user?.email) {
      return sameAnswer
    }

    const resetToken = generatePasswordResetToken({
      userId: user.id,
      email: user.email,
      passwordChangedAt: user.passwordChangedAt?.getTime() ?? null,
    })

    const appOrigin = await getAppOrigin()
    const resetUrl = `${appOrigin}/auth/reset-password?token=${encodeURIComponent(resetToken)}`

    // Send the reset email (non-blocking — don't let email failure block the response)
    sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      console.error('[auth] Failed to send password reset email:', err)
    })

    return {
      ...sameAnswer,
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
   * Abre una sesión: el par de tokens y la fila del refresh que lo respalda.
   * Lo hacen igual todas las formas de entrar (contraseña, Google y registro),
   * así que vive en un solo sitio.
   */
  private async issueSession(user: SessionUser, context?: RequestContext): Promise<AuthTokens> {
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

    return { accessToken, refreshToken: refreshToken.token }
  }

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
   * La cuenta tal y como la ve el cliente. Lleva el usuario y el tipo de cuenta
   * porque de ellos dependen las pantallas: con qué identificador se entró, si
   * se puede cambiar el correo y si toca cambiar la contraseña antes de nada.
   */
  private sanitizeUser(user: {
    id: string
    email: string | null
    username: string | null
    name: string
    role: UserRole | null
    accountType: UserAccountType
    isOnboarded: boolean
    mustChangePassword: boolean
    createdAt: Date
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      accountType: user.accountType,
      isOnboarded: user.isOnboarded,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    }
  }
}

export const authService = new AuthService()
