import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Contrasena requerida'),
})

export const signupSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  acceptTerms: z.literal(true),
})

export const onboardingSchema = z.object({
  role: z.enum(['student', 'teacher']),
  username: z.string().min(3).max(20).optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
