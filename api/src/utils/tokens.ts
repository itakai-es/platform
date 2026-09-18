import jwt from 'jsonwebtoken'
import { createHmac } from 'node:crypto'
import { env } from '../config/env.js'
import { nanoid } from 'nanoid'

// ==================== TYPES ====================

export interface TokenPayload {
  id: string
  role: string | null
  jti?: string // JWT ID for unique identification
}

export interface DecodedToken extends TokenPayload {
  iat: number
  exp: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface RefreshTokenData {
  token: string
  family: string
  expiresAt: Date
}

export interface PasswordResetTokenPayload {
  userId: string
  email: string
  /**
   * Fecha del último cambio de contraseña (ms) cuando se pidió el enlace. Si ya
   * no coincide, la contraseña ha cambiado desde entonces (con este enlace o de
   * otra forma) y el enlace deja de valer: así sirve una sola vez.
   */
  passwordChangedAt: number | null
  type: 'password_reset'
}

// ==================== CONSTANTS ====================

const ACCESS_TOKEN_ALGORITHM = 'HS256' as const
const PASSWORD_RESET_EXPIRES_IN = '1h'

/**
 * El enlace de recuperación se firma con una clave derivada, no con la del token
 * de acceso: así nunca puede pasar por un token de sesión, ni al revés.
 */
const passwordResetSecret = () =>
  createHmac('sha256', env.JWT_ACCESS_SECRET).update('password-reset').digest('hex')

// ==================== DURATION PARSING ====================

/**
 * Parse duration string (e.g., "15m", "7d") to milliseconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) return 15 * 60 * 1000 // default 15 minutes

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return 15 * 60 * 1000
  }
}

// ==================== ACCESS TOKENS ====================

/**
 * Generate a short-lived access token (JWT)
 * Contains user ID, role, and unique JTI
 */
export function generateAccessToken(payload: TokenPayload): string {
  const jti = nanoid(16) // Unique token identifier

  return jwt.sign(
    { ...payload, jti },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: ACCESS_TOKEN_ALGORITHM,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as string,
    } as jwt.SignOptions
  )
}

/**
 * Verify and decode an access token
 * Throws if invalid, expired, or malformed
 */
export function verifyAccessToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: [ACCESS_TOKEN_ALGORITHM],
    }) as DecodedToken

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError('TOKEN_EXPIRED', 'El token ha expirado')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError('TOKEN_INVALID', 'Token inválido')
    }
    throw new TokenError('TOKEN_VERIFICATION_FAILED', 'Error al verificar token')
  }
}

/**
 * Decode token without verification (for debugging/logging)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken
  } catch {
    return null
  }
}

// ==================== REFRESH TOKENS ====================

/**
 * Generate a secure refresh token with family tracking
 * Family is used to detect token reuse attacks
 */
export function generateRefreshToken(existingFamily?: string): RefreshTokenData {
  return {
    token: nanoid(64), // Cryptographically secure random string
    family: existingFamily || nanoid(32), // Keep same family on rotation
    expiresAt: getRefreshTokenExpiry(),
  }
}

/**
 * Get refresh token expiry date
 */
export function getRefreshTokenExpiry(): Date {
  const ms = parseDuration(env.JWT_REFRESH_EXPIRES_IN)
  return new Date(Date.now() + ms)
}

// ==================== TOKEN PAIR GENERATION ====================

/**
 * Generate both access and refresh tokens
 * Used for login, signup, and token refresh
 */
export function generateTokens(payload: TokenPayload, existingFamily?: string): {
  accessToken: string
  refreshToken: RefreshTokenData
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(existingFamily),
  }
}

export function generatePasswordResetToken(payload: Omit<PasswordResetTokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'password_reset' },
    passwordResetSecret(),
    {
      algorithm: ACCESS_TOKEN_ALGORITHM,
      expiresIn: PASSWORD_RESET_EXPIRES_IN,
    } as jwt.SignOptions
  )
}

export function verifyPasswordResetToken(token: string): PasswordResetTokenPayload {
  try {
    const decoded = jwt.verify(token, passwordResetSecret(), {
      algorithms: [ACCESS_TOKEN_ALGORITHM],
    }) as PasswordResetTokenPayload

    if (decoded.type !== 'password_reset') {
      throw new TokenError('TOKEN_INVALID', 'Token de reseteo invalido')
    }

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError('TOKEN_EXPIRED', 'El enlace de reseteo ha expirado')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError('TOKEN_INVALID', 'Token de reseteo invalido')
    }
    throw error
  }
}

// ==================== ERROR HANDLING ====================

export type TokenErrorCode =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_REVOKED'
  | 'TOKEN_REUSE_DETECTED'
  | 'TOKEN_VERIFICATION_FAILED'
  | 'REFRESH_TOKEN_NOT_FOUND'
  | 'REFRESH_TOKEN_EXPIRED'

export class TokenError extends Error {
  constructor(
    public code: TokenErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'TokenError'
  }
}

// ==================== UTILITIES ====================

/**
 * Check if a token is close to expiring (within 5 minutes)
 */
export function isTokenExpiringSoon(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded?.exp) return true

  const expiresAt = decoded.exp * 1000
  const fiveMinutes = 5 * 60 * 1000

  return Date.now() > expiresAt - fiveMinutes
}

/**
 * Get remaining time until token expires (in seconds)
 */
export function getTokenTTL(token: string): number {
  const decoded = decodeToken(token)
  if (!decoded?.exp) return 0

  const remaining = (decoded.exp * 1000 - Date.now()) / 1000
  return Math.max(0, Math.floor(remaining))
}
