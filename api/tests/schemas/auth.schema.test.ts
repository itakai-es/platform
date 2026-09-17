import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  signupSchema,
  onboardingSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../src/modules/auth/auth.schema.js'

describe('loginSchema', () => {
  it('should validate correct login input', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'user@example.com' }).success).toBe(false)
    expect(loginSchema.safeParse({ password: 'pass' }).success).toBe(false)
  })
})

describe('signupSchema', () => {
  it('should validate correct signup input', () => {
    const result = signupSchema.safeParse({
      email: 'new@user.com',
      password: 'password123',
      name: 'New User',
      acceptTerms: true,
    })
    expect(result.success).toBe(true)
  })

  it('should reject password shorter than 6 chars', () => {
    const result = signupSchema.safeParse({
      email: 'new@user.com',
      password: '12345',
      name: 'New User',
      acceptTerms: true,
    })
    expect(result.success).toBe(false)
  })

  it('should reject name shorter than 2 chars', () => {
    const result = signupSchema.safeParse({
      email: 'new@user.com',
      password: 'password123',
      name: 'A',
      acceptTerms: true,
    })
    expect(result.success).toBe(false)
  })

  it('should reject when terms not accepted', () => {
    const result = signupSchema.safeParse({
      email: 'new@user.com',
      password: 'password123',
      name: 'New User',
      acceptTerms: false,
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid email format', () => {
    const result = signupSchema.safeParse({
      email: 'invalid',
      password: 'password123',
      name: 'User',
      acceptTerms: true,
    })
    expect(result.success).toBe(false)
  })
})

describe('onboardingSchema', () => {
  it('should validate student role', () => {
    const result = onboardingSchema.safeParse({ role: 'student' })
    expect(result.success).toBe(true)
  })

  it('should validate teacher role', () => {
    const result = onboardingSchema.safeParse({ role: 'teacher' })
    expect(result.success).toBe(true)
  })

  it('should reject invalid role', () => {
    const result = onboardingSchema.safeParse({ role: 'admin' })
    expect(result.success).toBe(false)
  })

  it('should accept optional username', () => {
    const result = onboardingSchema.safeParse({ role: 'student', username: 'myname' })
    expect(result.success).toBe(true)
  })

  it('should reject username shorter than 3 chars', () => {
    const result = onboardingSchema.safeParse({ role: 'student', username: 'ab' })
    expect(result.success).toBe(false)
  })

  it('should reject username longer than 20 chars', () => {
    const result = onboardingSchema.safeParse({ role: 'student', username: 'a'.repeat(21) })
    expect(result.success).toBe(false)
  })
})

describe('refreshTokenSchema', () => {
  it('should validate valid refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'some-token-value' })
    expect(result.success).toBe(true)
  })

  it('should reject empty refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: '' })
    expect(result.success).toBe(false)
  })
})

describe('forgotPasswordSchema', () => {
  it('should validate correct email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-email' })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('should validate correct reset input', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'valid-token',
      password: 'newpass123',
    })
    expect(result.success).toBe(true)
  })

  it('should reject short password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'valid-token',
      password: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty token', () => {
    const result = resetPasswordSchema.safeParse({
      token: '',
      password: 'newpass123',
    })
    expect(result.success).toBe(false)
  })
})
