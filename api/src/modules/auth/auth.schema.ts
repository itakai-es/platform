import { z } from 'zod'
import { PASSWORD_MIN_LENGTH } from '../../utils/password.js'

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)

/**
 * Se entra con el correo o con el usuario, en un solo campo. El campo antiguo
 * `email` se sigue aceptando porque la API se publica antes que el frontend y el
 * que está publicado manda ese nombre; se puede retirar en cuanto no quede
 * ningún frontend anterior a esta entrega, es decir, tras la siguiente.
 */
export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1).optional(),
    email: z.string().trim().min(1).optional(),
    password: z.string().min(1, 'Contrasena requerida'),
  })
  .transform(({ identifier, email, password }) => ({
    identifier: identifier ?? email ?? '',
    password,
  }))
  .refine(input => input.identifier.length > 0, {
    message: 'Escribe tu correo o tu usuario',
    path: ['identifier'],
  })

export const signupSchema = z.object({
  email: z.string().email('Email invalido'),
  password: newPassword,
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  acceptTerms: z.literal(true),
})

/**
 * Terminar el alta es elegir el rol, y nada más. El usuario no se toca por aquí:
 * quien se registra con correo no tiene, y el de una cuenta gestionada lo pone
 * quien la crea y su dueño no lo cambia.
 */
export const onboardingSchema = z.object({
  role: z.enum(['student', 'teacher']),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: newPassword,
})

/** Cambio de contraseña del dueño de la cuenta, también el del primer acceso. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contrasena actual'),
  newPassword,
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
