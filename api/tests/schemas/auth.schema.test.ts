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
  it('acepta el identificador con un correo', () => {
    const result = loginSchema.safeParse({
      identifier: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.identifier).toBe('user@example.com')
  })

  it('acepta el identificador con un usuario', () => {
    const result = loginSchema.safeParse({ identifier: 'ana.g.k7', password: 'password123' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.identifier).toBe('ana.g.k7')
  })

  // Compatibilidad de despliegue: el frontend publicado manda `email`.
  it('acepta el campo antiguo y lo trata como identificador', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'password123' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.identifier).toBe('user@example.com')
  })

  it('el identificador manda sobre el campo antiguo si llegan los dos', () => {
    const result = loginSchema.safeParse({
      identifier: 'ana.g.k7',
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success && result.data.identifier).toBe('ana.g.k7')
  })

  it('rechaza la contraseña vacía', () => {
    const result = loginSchema.safeParse({ identifier: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('rechaza que falte el identificador o la contraseña', () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
    expect(loginSchema.safeParse({ identifier: 'user@example.com' }).success).toBe(false)
    expect(loginSchema.safeParse({ password: 'pass' }).success).toBe(false)
    expect(loginSchema.safeParse({ identifier: '   ', password: 'pass' }).success).toBe(false)
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

  it('rechaza una contraseña más corta que el mínimo', () => {
    const result = signupSchema.safeParse({
      email: 'new@user.com',
      password: '1234567',
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

  // Decisión: el usuario no se elige ni se cambia al terminar el alta. Aquí solo
  // se elige el rol, así que un usuario que llegue en el cuerpo se queda fuera.
  it('no deja poner el usuario al terminar el alta', () => {
    const result = onboardingSchema.safeParse({ role: 'student', username: 'myname' })
    expect(result.success).toBe(true)
    expect(result.success && result.data).toEqual({ role: 'student' })
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

  it('rechaza una contraseña más corta que el mínimo', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'valid-token',
      password: '1234567',
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
