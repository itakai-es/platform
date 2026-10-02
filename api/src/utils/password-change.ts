import { prisma } from '../config/database.js'
import { hashPassword, verifyPassword } from './password.js'
import { sendPasswordChangedEmail } from './email.js'
import { NotFoundError, ValidationError } from './errors.js'

/**
 * Cambiar la contraseña de una cuenta. Pasa por aquí todo lo que la cambia —el
 * perfil del profesorado, el del alumnado, el enlace de recuperación y el
 * cambio obligatorio del primer acceso—, porque las cuatro tienen que dejar lo
 * mismo:
 *
 * - el hash nuevo y la fecha del cambio;
 * - la marca de cambio obligatorio limpia;
 * - las demás sesiones cerradas (la que hace el cambio puede seguir, si se dice
 *   cuál es);
 * - un aviso por correo, solo si la cuenta tiene correo: una cuenta que entra
 *   con usuario no tiene a dónde recibirlo.
 */

export interface PasswordChangeOptions {
  /**
   * Familia de la sesión que hace el cambio, que no se cierra. Sin ella se
   * cierran todas: es lo que se quiere cuando el cambio viene de un enlace de
   * recuperación o de un restablecimiento del profesorado.
   */
  keepSessionFamily?: string
  /** El aviso por correo se manda salvo que se diga lo contrario. */
  notifyByEmail?: boolean
}

/**
 * Escribe la contraseña nueva. No comprueba quién lo pide: eso es de quien
 * llama (la contraseña actual, el token del enlace o el permiso en la clase).
 */
export async function setUserPassword(
  userId: string,
  newPassword: string,
  options: PasswordChangeOptions = {}
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })
  if (!user) throw new NotFoundError('Cuenta no encontrada')

  const passwordHash = await hashPassword(newPassword)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        isRevoked: false,
        ...(options.keepSessionFamily ? { family: { not: options.keepSessionFamily } } : {}),
      },
      data: { isRevoked: true },
    }),
  ])

  // El aviso no debe bloquear la respuesta ni tumbar el cambio si el correo falla.
  if (user.email && options.notifyByEmail !== false) {
    sendPasswordChangedEmail(user.email).catch(err => {
      console.error('[password] No se pudo avisar del cambio de contraseña:', err)
    })
  }

  return { success: true as const, message: 'Contraseña actualizada correctamente' }
}

/**
 * Cambio hecho por el dueño de la cuenta: comprueba la contraseña actual antes.
 * Es también el camino del primer acceso, donde la actual es la temporal que le
 * dio su profesor.
 */
export async function changeOwnPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
  options: PasswordChangeOptions = {}
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  })
  if (!user) throw new NotFoundError('Cuenta no encontrada')

  if (!user.passwordHash) {
    throw new ValidationError(
      'Tu cuenta entra con Google y no tiene contraseña. Crea una desde «¿Olvidaste tu contraseña?».',
      'PASSWORD_NOT_SET'
    )
  }
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ValidationError('Contraseña actual incorrecta', 'INVALID_PASSWORD')
  }

  return setUserPassword(userId, input.newPassword, options)
}
