import { prisma } from '../../config/database.js'
import {
  accessibleClassesWhere,
  assertClassAccessOrPlatformAdmin,
  recordClassAction,
  type ClassUser,
} from '../../utils/class-access.js'
import { enrollStudent } from '../../utils/enrollment.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js'
import {
  buildUsernameProposal,
  generateTemporaryPassword,
  isUsernameConflict,
  isValidUsername,
  normalizeUsername,
  usernameVariants,
  withUsernameRetry,
} from '../../utils/identity.js'
import { findAvailableUsername } from '../../utils/identity-db.js'
import { hashPassword } from '../../utils/password.js'

/**
 * Cuentas de alumnado sin correo. Las crea y las mantiene el profesorado con
 * administración en la clase donde nacen (su clase de origen), y como respaldo
 * quien administra la instancia: son cuentas de quien no tiene correo con el que
 * registrarse ni con el que recuperar la contraseña.
 *
 * Lo que se guarda es lo mínimo: nombre visible, usuario y hash de la
 * contraseña. Nunca la contraseña en claro: la temporal se devuelve una sola
 * vez, en la respuesta de la llamada que la genera, y si se pierde se
 * restablece.
 */

/** Nivel que hace falta en la clase para llevar sus cuentas de alumnado. */
const MANAGE_ACTION = 'student.manage' as const

export interface CreateManagedStudentInput {
  classId: string
  /** Nombre visible, el que se ve en la clase. */
  name: string
  /** Usuario elegido por quien crea la cuenta. Sin él lo propone el sistema. */
  username?: string
}

export interface ManagedStudentCredentials {
  student: { id: string; name: string; username: string }
  /** Contraseña temporal, que el alumno cambia al entrar. Solo se ve aquí. */
  temporaryPassword: string
}

/** La clase donde se puede crear alumnado, comprobando el acceso de quien lo pide. */
async function classForManaging(classId: string, actor: ClassUser) {
  await assertClassAccessOrPlatformAdmin(classId, actor, MANAGE_ACTION)

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true, archived: true },
  })
  if (!cls) throw new NotFoundError('Clase no encontrada')
  if (cls.archived) {
    throw new ValidationError(
      'Esta clase está archivada y no admite nuevas cuentas',
      'CLASS_ARCHIVED'
    )
  }
  return cls
}

/**
 * El usuario con el que nacerá la cuenta: el que se ha escrito, ya validado, o
 * null si lo propone el sistema. No se comprueba aquí si está libre: la unicidad
 * la pone la base y el choque se resuelve con un sufijo (ver `usernameVariants`),
 * que es lo que evita que preguntar por un usuario diga si existe.
 */
function resolveChosenUsername(username?: string): string | null {
  if (!username) return null

  const chosen = normalizeUsername(username)
  if (!isValidUsername(chosen)) {
    throw new ValidationError(
      'El usuario solo admite letras sin tilde, números y los signos . _ -, y empieza y acaba por letra o número',
      'INVALID_USERNAME'
    )
  }
  return chosen
}

/**
 * Crea una cuenta de alumnado sin correo y la matricula en su clase de origen.
 * Nace con el alta terminada: no pasa por la elección de rol, y lo primero que
 * hace al entrar es cambiar la contraseña temporal.
 */
export async function createManagedStudent(
  actor: ClassUser,
  input: CreateManagedStudentInput
): Promise<ManagedStudentCredentials> {
  const cls = await classForManaging(input.classId, actor)

  const name = input.name.trim()
  if (name.length < 2) {
    throw new ValidationError('El nombre debe tener al menos 2 caracteres', 'INVALID_NAME')
  }

  const chosen = resolveChosenUsername(input.username)
  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  const create = (username: string) =>
    prisma.$transaction(async tx => {
      const student = await tx.user.create({
        data: {
          // Sin correo: la cuenta se identifica por su usuario.
          email: null,
          username,
          name,
          passwordHash,
          role: 'student',
          accountType: 'managed',
          isOnboarded: true,
          mustChangePassword: true,
          createdById: actor.id,
          homeClassId: cls.id,
          settings: { create: {} },
        },
        select: { id: true, name: true, username: true },
      })

      await enrollStudent(tx, {
        studentId: student.id,
        classId: cls.id,
        className: cls.name,
      })

      await recordClassAction(tx, {
        classId: cls.id,
        actorId: actor.id,
        action: 'student.account_created',
        entityType: 'user',
        entityId: student.id,
        targetUserId: student.id,
      })

      return student
    })

  try {
    // El usuario siempre se resuelve reintentando: con el escrito se prueba tal
    // cual y, si está cogido, con un sufijo detrás; sin él lo propone el sistema.
    // La respuesta dice con qué usuario ha nacido la cuenta.
    const student = await withUsernameRetry(
      create,
      chosen ? usernameVariants(chosen) : () => buildUsernameProposal(name)
    )

    return {
      student: { id: student.id, name: student.name, username: student.username! },
      temporaryPassword,
    }
  } catch (error) {
    // Agotados los reintentos, se responde lo mismo que ante cualquier otro
    // choque: sin decir qué usuario estaba cogido.
    if (isUsernameConflict(error)) {
      throw new ValidationError(
        'No se ha podido crear la cuenta; inténtalo de nuevo',
        'USERNAME_UNAVAILABLE'
      )
    }
    throw error
  }
}

/**
 * Restablece la contraseña de una cuenta gestionada: genera una temporal, obliga
 * a cambiarla al entrar, cierra sus sesiones y queda registrado en la clase.
 * Solo vale para cuentas gestionadas: quien tiene correo usa «He olvidado mi
 * contraseña».
 */
export async function resetManagedStudentPassword(
  actor: ClassUser,
  studentId: string
): Promise<ManagedStudentCredentials> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, username: true, accountType: true, homeClassId: true },
  })
  if (!student) throw new NotFoundError('Alumno no encontrado')

  // Antes de contar nada de la cuenta: quien pregunta tiene que administrar
  // alguna clase suya. Si no, responde como si el alumno no existiera, así que
  // probar identificadores no dice ni si la cuenta existe ni de qué tipo es.
  if (actor.role !== 'admin') {
    const reachable = await prisma.classEnrollment.findFirst({
      where: { studentId: student.id, class: accessibleClassesWhere(actor.id, 'admin') },
      select: { id: true },
    })
    if (!reachable) throw new NotFoundError('Alumno no encontrado')
  }

  if (student.accountType !== 'managed') {
    throw new ValidationError(
      'Esta cuenta tiene correo: su dueño la recupera desde «He olvidado mi contraseña»',
      'NOT_A_MANAGED_ACCOUNT'
    )
  }

  // Sin clase de origen no hay profesorado que la gestione: queda la administración
  // de la instancia, que es el respaldo.
  if (!student.homeClassId) {
    if (actor.role !== 'admin') {
      throw new ForbiddenError(
        'Esta cuenta no tiene clase de origen; la lleva quien administra la plataforma',
        'NO_HOME_CLASS'
      )
    }
  } else {
    await assertClassAccessOrPlatformAdmin(student.homeClassId, actor, MANAGE_ACTION)
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)
  const homeClassId = student.homeClassId

  await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: student.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: true,
      },
    })
    // La contraseña de antes ya no vale, y tampoco las sesiones que había abiertas.
    await tx.refreshToken.updateMany({
      where: { userId: student.id, isRevoked: false },
      data: { isRevoked: true },
    })
    if (homeClassId) {
      await recordClassAction(tx, {
        classId: homeClassId,
        actorId: actor.id,
        action: 'student.password_reset',
        entityType: 'user',
        entityId: student.id,
        targetUserId: student.id,
      })
    }
  })

  return {
    student: { id: student.id, name: student.name, username: student.username! },
    temporaryPassword,
  }
}

/**
 * Un usuario libre para este nombre. No dice si el que se preguntaba existe:
 * responde siempre con una propuesta que se puede usar, así que preguntar en
 * bucle no sirve para averiguar qué cuentas hay.
 */
export async function proposeUsername(
  actor: ClassUser,
  classId: string,
  name: string
): Promise<{ username: string }> {
  await classForManaging(classId, actor)
  return { username: await findAvailableUsername(name) }
}
