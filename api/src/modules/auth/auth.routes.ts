import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authService } from './auth.service.js'
import {
  loginSchema,
  loginAliasSchema,
  signupSchema,
  onboardingSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js'
import { ZodError } from 'zod'
import { generateAccessToken, TokenError } from '../../utils/tokens.js'
import { env } from '../../config/env.js'

// ==================== COOKIE CONFIG ====================

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token'

/**
 * Extract domain from URL (ignoring port and protocol)
 * e.g., "https://app.example.com:3000" -> "app.example.com"
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return ''
  }
}

/**
 * Auto-detect if frontend and backend are on different domains
 * Compares CORS_ORIGIN domains - if any origin has a different domain, it's cross-domain
 */
function isCrossDomainSetup(): boolean {
  const origins = env.CORS_ORIGIN.split(',').map((o) => o.trim())
  const backendDomain = 'localhost' // Backend always runs on its own host

  return origins.some((origin) => {
    const frontendDomain = extractDomain(origin)
    // Different domain = cross-domain (ignore localhost in dev)
    return frontendDomain !== 'localhost' && frontendDomain !== backendDomain
  })
}

/**
 * Cookie configuration for refresh tokens (auto-configured)
 *
 * Development: sameSite=lax, secure=false (works with different ports)
 * Production same-domain: sameSite=lax, secure=true
 * Production cross-domain: sameSite=none, secure=true (auto-detected)
 *
 * Note: path='/' because frontend may use proxy (e.g., /api/auth/...)
 * and browser needs to send cookie regardless of proxy path
 */
function getRefreshTokenCookieOptions() {
  const isProduction = env.NODE_ENV === 'production'
  const isCrossDomain = isProduction && isCrossDomainSetup()

  // Overrides opcionales para auto-hospedaje (SPA + API en el mismo origen tras
  // nginx, que la autodetección no reconoce). Sin definirlos → comportamiento
  // actual. Sobre HTTP sin TLS hay que poner COOKIE_SECURE=false (y normalmente
  // COOKIE_SAMESITE=lax) para que la cookie de sesión se guarde.
  const sameSite =
    (process.env.COOKIE_SAMESITE as 'none' | 'lax' | 'strict' | undefined) ||
    (isCrossDomain ? 'none' : 'lax')
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : isProduction || isCrossDomain

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/', // Root path - works with any proxy configuration
    maxAge: 7 * 24 * 60 * 60, // 7 days
  }
}

// ==================== HELPERS ====================

/**
 * Extract request context (IP, User-Agent) for security tracking
 */
function getRequestContext(request: FastifyRequest) {
  return {
    userAgent: request.headers['user-agent'] || undefined,
    ipAddress: request.ip || request.headers['x-forwarded-for']?.toString() || undefined,
  }
}

/**
 * Set refresh token as HttpOnly cookie
 */
function setRefreshTokenCookie(reply: FastifyReply, refreshToken: string) {
  reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions())
}

/**
 * Clear refresh token cookie
 */
function clearRefreshTokenCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/' })
}

/**
 * Handle errors uniformly
 */
function handleError(error: unknown, reply: FastifyReply, defaultStatus = 500) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: error.errors[0]?.message || 'Datos inválidos',
      errors: error.errors,
    })
  }

  if (error instanceof TokenError) {
    const statusMap: Record<string, number> = {
      TOKEN_EXPIRED: 401,
      TOKEN_INVALID: 401,
      TOKEN_REVOKED: 401,
      TOKEN_REUSE_DETECTED: 401,
      REFRESH_TOKEN_NOT_FOUND: 401,
      REFRESH_TOKEN_EXPIRED: 401,
    }
    return reply.status(statusMap[error.code] || 401).send({
      message: error.message,
      code: error.code,
    })
  }

  if (error instanceof Error) {
    // Only forward messages from errors we explicitly threw (business logic).
    // Prisma/DB/infra errors have names like PrismaClientInitializationError,
    // PrismaClientKnownRequestError, etc. — never leak those to the client.
    const isTrustedError = error.constructor === Error
    if (isTrustedError) {
      return reply.status(defaultStatus).send({ message: error.message })
    }
  }

  return reply.status(500).send({ message: 'Error interno' })
}

// ==================== AUTH ROUTES ====================

export async function authRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Login with email/password
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = loginSchema.parse(request.body)
      const context = getRequestContext(request)
      const result = await authService.login(input, context)

      // Set refresh token in HttpOnly cookie (secure!)
      setRefreshTokenCookie(reply, result.tokens.refreshToken)

      // Return only accessToken in body (refreshToken is in cookie)
      return {
        user: result.user,
        tokens: { accessToken: result.tokens.accessToken },
      }
    } catch (error) {
      return handleError(error, reply, 401)
    }
  })

  // Login with alias + code (for younger students)
  fastify.post('/login-alias', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = loginAliasSchema.parse(request.body)
      const context = getRequestContext(request)
      const result = await authService.loginWithAlias(input, context)

      // Set refresh token in HttpOnly cookie
      setRefreshTokenCookie(reply, result.tokens.refreshToken)

      return {
        user: result.user,
        tokens: { accessToken: result.tokens.accessToken },
      }
    } catch (error) {
      return handleError(error, reply, 401)
    }
  })

  // Login with Google OAuth using Authorization Code (popup flow, works in all browsers)
  fastify.post('/login-google-code', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { code: string }
      if (!body.code) {
        return reply.status(400).send({ message: 'Código de Google requerido' })
      }

      const context = getRequestContext(request)
      const result = await authService.loginWithGoogleCode(body.code, context)

      setRefreshTokenCookie(reply, result.tokens.refreshToken)

      return {
        user: result.user,
        tokens: { accessToken: result.tokens.accessToken },
      }
    } catch (error) {
      return handleError(error, reply, 401)
    }
  })

  // Login with Google OAuth
  fastify.post('/login-google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { credential: string }
      if (!body.credential) {
        return reply.status(400).send({ message: 'Credencial de Google requerida' })
      }

      const context = {
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      }

      const result = await authService.loginWithGoogle(body.credential, context)

      // Set refresh token in HttpOnly cookie
      setRefreshTokenCookie(reply, result.tokens.refreshToken)

      return {
        user: result.user,
        tokens: { accessToken: result.tokens.accessToken },
      }
    } catch (error) {
      return handleError(error, reply, 401)
    }
  })

  // Signup
  fastify.post('/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = signupSchema.parse(request.body)
      const context = getRequestContext(request)
      const result = await authService.signup(input, context)

      // Set refresh token in HttpOnly cookie
      setRefreshTokenCookie(reply, result.tokens.refreshToken)

      return reply.status(201).send({
        user: result.user,
        tokens: { accessToken: result.tokens.accessToken },
      })
    } catch (error) {
      return handleError(error, reply, 409)
    }
  })

  // Refresh token - reads from HttpOnly cookie automatically
  fastify.post('/refresh-token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Try to get refresh token from cookie first, then from body (backwards compatibility)
      const cookieToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME]
      const bodyToken = (request.body as { refreshToken?: string })?.refreshToken

      const refreshToken = cookieToken || bodyToken

      if (!refreshToken) {
        return reply.status(401).send({ message: 'Refresh token no proporcionado', code: 'REFRESH_TOKEN_NOT_FOUND' })
      }

      const context = getRequestContext(request)
      const result = await authService.refreshToken(refreshToken, context)

      // Set new refresh token in cookie (token rotation)
      setRefreshTokenCookie(reply, result.tokens.refreshToken)

      // Return only new accessToken in body
      return { tokens: { accessToken: result.tokens.accessToken } }
    } catch (error) {
      // On any auth error, clear the cookie
      clearRefreshTokenCookie(reply)
      return handleError(error, reply, 401)
    }
  })

  // Get current user (protected)
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.user as { id: string }
        const user = await authService.getProfile(id)
        return { user }
      } catch (error) {
        return handleError(error, reply, 404)
      }
    }
  )

  // Logout - revokes token and clears cookie
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get refresh token from cookie or body
      const cookieToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME]
      const bodyToken = (request.body as { refreshToken?: string })?.refreshToken
      const refreshToken = cookieToken || bodyToken

      const result = await authService.logout(refreshToken)

      // Always clear the cookie
      clearRefreshTokenCookie(reply)

      return result
    } catch (error) {
      // Clear cookie even on error
      clearRefreshTokenCookie(reply)
      return handleError(error, reply)
    }
  })

  // Logout from all devices (protected)
  fastify.post(
    '/logout-all',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.user as { id: string }
        const result = await authService.logoutAll(id)
        return result
      } catch (error) {
        return handleError(error, reply)
      }
    }
  )

  // Get active sessions (protected)
  fastify.get(
    '/sessions',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.user as { id: string }
        const result = await authService.getActiveSessions(id)
        return result
      } catch (error) {
        return handleError(error, reply)
      }
    }
  )

  // Revoke a session (protected)
  fastify.delete<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.user as { id: string }
        const { sessionId } = request.params
        const result = await authService.revokeSession(id, sessionId)
        return result
      } catch (error) {
        return handleError(error, reply, 404)
      }
    }
  )

  // Forgot password
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = forgotPasswordSchema.parse(request.body)
      const result = await authService.requestPasswordReset(input.email)
      return result
    } catch (error) {
      return handleError(error, reply)
    }
  })

  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = resetPasswordSchema.parse(request.body)
      const result = await authService.resetPassword(input.token, input.password)
      return result
    } catch (error) {
      return handleError(error, reply)
    }
  })
}

// ==================== ONBOARDING ROUTES ====================

export async function onboardingRoutes(fastify: FastifyInstance) {
  // Complete onboarding (protected)
  fastify.post(
    '/complete-role',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.user as { id: string }
        const input = onboardingSchema.parse(request.body)
        const user = await authService.completeOnboarding(id, input)

        // Generate new token with updated role
        const accessToken = generateAccessToken({ id: user.id, role: user.role })

        return { user, accessToken }
      } catch (error) {
        return handleError(error, reply, 400)
      }
    }
  )
}
