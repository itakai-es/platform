import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseDuration,
  generateAccessToken,
  verifyAccessToken,
  decodeToken,
  generateRefreshToken,
  generateTokens,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  isTokenExpiringSoon,
  getTokenTTL,
  TokenError,
} from '../../src/utils/tokens.js'

describe('parseDuration', () => {
  it('should parse seconds', () => {
    expect(parseDuration('30s')).toBe(30_000)
  })

  it('should parse minutes', () => {
    expect(parseDuration('15m')).toBe(15 * 60 * 1000)
  })

  it('should parse hours', () => {
    expect(parseDuration('2h')).toBe(2 * 60 * 60 * 1000)
  })

  it('should parse days', () => {
    expect(parseDuration('7d')).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('should return default 15 minutes for invalid format', () => {
    expect(parseDuration('invalid')).toBe(15 * 60 * 1000)
    expect(parseDuration('')).toBe(15 * 60 * 1000)
    expect(parseDuration('15x')).toBe(15 * 60 * 1000)
  })
})

describe('generateAccessToken', () => {
  it('should generate a JWT string', () => {
    const token = generateAccessToken({ id: 'user-1', role: 'student' })
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT format: header.payload.signature
  })

  it('should include user payload in token', () => {
    const token = generateAccessToken({ id: 'user-1', role: 'teacher' })
    const decoded = decodeToken(token)
    expect(decoded?.id).toBe('user-1')
    expect(decoded?.role).toBe('teacher')
  })

  it('should include a unique JTI', () => {
    const token1 = generateAccessToken({ id: 'user-1', role: 'student' })
    const token2 = generateAccessToken({ id: 'user-1', role: 'student' })
    const decoded1 = decodeToken(token1)
    const decoded2 = decodeToken(token2)
    expect(decoded1?.jti).toBeDefined()
    expect(decoded2?.jti).toBeDefined()
    expect(decoded1?.jti).not.toBe(decoded2?.jti)
  })

  it('should handle null role', () => {
    const token = generateAccessToken({ id: 'user-1', role: null })
    const decoded = decodeToken(token)
    expect(decoded?.role).toBeNull()
  })
})

describe('verifyAccessToken', () => {
  it('should verify a valid token', () => {
    const token = generateAccessToken({ id: 'user-1', role: 'student' })
    const decoded = verifyAccessToken(token)
    expect(decoded.id).toBe('user-1')
    expect(decoded.role).toBe('student')
  })

  it('should throw TOKEN_INVALID for tampered token', () => {
    const token = generateAccessToken({ id: 'user-1', role: 'student' })
    const tampered = token + 'x'
    expect(() => verifyAccessToken(tampered)).toThrow(TokenError)
    try {
      verifyAccessToken(tampered)
    } catch (e) {
      expect((e as TokenError).code).toBe('TOKEN_INVALID')
    }
  })

  it('should throw TOKEN_INVALID for garbage input', () => {
    expect(() => verifyAccessToken('not-a-token')).toThrow(TokenError)
  })
})

describe('decodeToken', () => {
  it('should decode a valid token without verification', () => {
    const token = generateAccessToken({ id: 'user-1', role: 'admin' })
    const decoded = decodeToken(token)
    expect(decoded?.id).toBe('user-1')
    expect(decoded?.role).toBe('admin')
    expect(decoded?.iat).toBeDefined()
    expect(decoded?.exp).toBeDefined()
  })

  it('should return null for invalid input', () => {
    expect(decodeToken('garbage')).toBeNull()
  })
})

describe('generateRefreshToken', () => {
  it('should generate a token with 64-char length', () => {
    const data = generateRefreshToken()
    expect(data.token.length).toBe(64)
  })

  it('should generate a new family when none provided', () => {
    const data = generateRefreshToken()
    expect(data.family.length).toBe(32)
  })

  it('should reuse existing family when provided', () => {
    const family = 'existing-family-id'
    const data = generateRefreshToken(family)
    expect(data.family).toBe(family)
  })

  it('should set future expiry date', () => {
    const data = generateRefreshToken()
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('should generate unique tokens', () => {
    const t1 = generateRefreshToken()
    const t2 = generateRefreshToken()
    expect(t1.token).not.toBe(t2.token)
  })
})

describe('generateTokens', () => {
  it('should generate both access and refresh tokens', () => {
    const result = generateTokens({ id: 'user-1', role: 'student' })
    expect(typeof result.accessToken).toBe('string')
    expect(result.refreshToken.token.length).toBe(64)
    expect(result.refreshToken.family.length).toBe(32)
  })

  it('should pass existing family to refresh token', () => {
    const family = 'my-family'
    const result = generateTokens({ id: 'user-1', role: 'student' }, family)
    expect(result.refreshToken.family).toBe(family)
  })
})

describe('Password Reset Tokens', () => {
  it('should generate a valid password reset token', () => {
    const token = generatePasswordResetToken({
      userId: 'user-1',
      email: 'test@test.com',
      passwordChangedAt: null,
    })
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('should verify a valid password reset token', () => {
    const token = generatePasswordResetToken({
      userId: 'user-1',
      email: 'test@test.com',
      passwordChangedAt: null,
    })
    const decoded = verifyPasswordResetToken(token)
    expect(decoded.userId).toBe('user-1')
    expect(decoded.email).toBe('test@test.com')
    expect(decoded.type).toBe('password_reset')
  })

  it('no se verifica como token de acceso, ni un token de acceso como enlace', () => {
    const reset = generatePasswordResetToken({
      userId: 'user-1',
      email: 'test@test.com',
      passwordChangedAt: null,
    })
    expect(() => verifyAccessToken(reset)).toThrow()
    const access = generateAccessToken({ id: 'user-1', role: 'student' })
    expect(() => verifyPasswordResetToken(access)).toThrow()
  })

  it('should reject a tampered reset token', () => {
    const token = generatePasswordResetToken({
      userId: 'user-1',
      email: 'test@test.com',
      passwordChangedAt: null,
    })
    expect(() => verifyPasswordResetToken(token + 'x')).toThrow()
  })
})

describe('isTokenExpiringSoon', () => {
  it('should return false for a fresh token', () => {
    const token = generateAccessToken({ id: 'user-1', role: 'student' })
    expect(isTokenExpiringSoon(token)).toBe(false)
  })

  it('should return true for invalid token', () => {
    expect(isTokenExpiringSoon('invalid')).toBe(true)
  })
})

describe('getTokenTTL', () => {
  it('should return positive TTL for fresh token', () => {
    const token = generateAccessToken({ id: 'user-1', role: 'student' })
    const ttl = getTokenTTL(token)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(15 * 60) // 15 minutes max
  })

  it('should return 0 for invalid token', () => {
    expect(getTokenTTL('invalid')).toBe(0)
  })
})

describe('TokenError', () => {
  it('should have correct name and code', () => {
    const error = new TokenError('TOKEN_EXPIRED', 'Token expired')
    expect(error.name).toBe('TokenError')
    expect(error.code).toBe('TOKEN_EXPIRED')
    expect(error.message).toBe('Token expired')
    expect(error instanceof Error).toBe(true)
  })
})
