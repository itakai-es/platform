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
  cleanDisplayName,
  generateTemporaryPassword,
  isUsernameConflict,
  isValidUsername,
  normalizeUsername,
  usernameVariants,
  withUsernameRetry,
} from '../../utils/identity.js'
import { findAvailableUsername, isUsernameAvailable } from '../../utils/identity-db.js'
import { hashPassword } from '../../utils/password.js'
import type { Prisma } from '../../generated/prisma/client.js'

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

  const name = cleanDisplayName(input.name)
  if (name.length < NAME_MIN) {
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
      'Esta cuenta tiene correo: su dueño la recupera desde «¿Olvidaste tu contraseña?»',
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

// ---- Varias cuentas de una vez: formulario de filas e importación de una lista ----

/** Máximo de cuentas por petición: una lista de clase holgada. */
export const MANAGED_BATCH_MAX = 50

export interface ManagedStudentRowInput {
  name: string
  username?: string
}

/**
 * Estado de cada fila tras revisarla:
 * - `ok`: se puede crear con el usuario que lleva (el escrito o el propuesto);
 * - `username_taken`: el usuario escrito no está libre y se propone otro;
 * - `duplicate`: repite el nombre o el usuario de una fila anterior;
 * - `empty_name`: sin nombre;
 * - `invalid_name`: el nombre es demasiado corto o demasiado largo;
 * - `invalid_username`: el usuario escrito no tiene la forma de un usuario.
 * Las cuatro últimas impiden crear la lista: hay que corregirlas o quitarlas.
 */
export type ManagedRowStatus =
  | 'ok'
  | 'username_taken'
  | 'duplicate'
  | 'empty_name'
  | 'invalid_name'
  | 'invalid_username'

export interface ManagedRowReview {
  /** Posición de la fila en la lista recibida, desde 0. */
  index: number
  name: string
  /** Usuario con el que nacerá la cuenta; vacío si la fila no se puede crear. */
  username: string
  /** El usuario escrito, cuando no es el que se va a usar. */
  requestedUsername?: string
  status: ManagedRowStatus
}

const ROW_ERRORS: ReadonlySet<ManagedRowStatus> = new Set([
  'duplicate',
  'empty_name',
  'invalid_name',
  'invalid_username',
])

export function isRowError(status: ManagedRowStatus): boolean {
  return ROW_ERRORS.has(status)
}

/** La lista tiene filas que no se pueden crear. Lleva la revisión para enseñarla. */
export class ManagedRowsError extends ValidationError {
  readonly rows: ManagedRowReview[]
  constructor(rows: ManagedRowReview[]) {
    super('Hay filas que no se pueden crear; corrígelas o quítalas', 'ROWS_WITH_ERRORS')
    this.rows = rows
  }
}

const NAME_MIN = 2
const NAME_MAX = 120

/** Nombre para comparar filas: sin espacios de más ni mayúsculas. */
function nameKey(name: string): string {
  return cleanDisplayName(name).toLowerCase()
}

/** El primer usuario libre de la secuencia, sin repetir los ya reservados en esta lista. */
async function firstFreeUsername(
  next: () => string,
  reserved: Set<string>,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
  attempts = 8
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const candidate = next()
    if (!reserved.has(candidate) && (await isUsernameAvailable(candidate, tx))) return candidate
  }
  throw new ValidationError(
    'No se ha podido crear la cuenta; inténtalo de nuevo',
    'USERNAME_UNAVAILABLE'
  )
}

/**
 * Revisa una lista sin crear nada: dice de cada fila si se puede crear y con qué
 * usuario. Los usuarios que se proponen están libres en este momento y no se
 * repiten dentro de la lista.
 */
async function reviewRows(rows: ManagedStudentRowInput[]): Promise<ManagedRowReview[]> {
  const seenNames = new Set<string>()
  const reserved = new Set<string>()
  const reviews: ManagedRowReview[] = []

  for (const [index, row] of rows.entries()) {
    const name = cleanDisplayName(row.name)
    const requested = row.username?.trim() ? normalizeUsername(row.username) : null
    const base = { index, name, username: '' }

    if (!name) {
      // Solo espacios es un nombre vacío; algo escrito sin ninguna letra ni
      // número (signos, caracteres invisibles) es un nombre que no sirve.
      reviews.push({ ...base, status: row.name.trim() ? 'invalid_name' : 'empty_name' })
      continue
    }
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      reviews.push({ ...base, status: 'invalid_name' })
      continue
    }
    if (requested && !isValidUsername(requested)) {
      reviews.push({ ...base, requestedUsername: requested, status: 'invalid_username' })
      continue
    }
    const key = nameKey(name)
    if (seenNames.has(key) || (requested && reserved.has(requested))) {
      reviews.push({
        ...base,
        ...(requested ? { requestedUsername: requested } : {}),
        status: 'duplicate',
      })
      continue
    }
    seenNames.add(key)

    if (!requested) {
      const username = await firstFreeUsername(() => buildUsernameProposal(name), reserved)
      reserved.add(username)
      reviews.push({ ...base, username, status: 'ok' })
      continue
    }

    const username = await firstFreeUsername(usernameVariants(requested), reserved)
    reserved.add(username)
    reviews.push(
      username === requested
        ? { ...base, username, status: 'ok' }
        : { ...base, username, requestedUsername: requested, status: 'username_taken' }
    )
  }

  return reviews
}

export type ManagedBatchResult =
  | { dryRun: true; rows: ManagedRowReview[]; canCreate: boolean }
  | { dryRun: false; created: ManagedStudentCredentials[] }

/**
 * Da de alta varias cuentas en una clase: las filas del formulario o una lista
 * importada. Con `dryRun` solo revisa la lista y responde el estado de cada fila.
 *
 * Sin `dryRun`, o se crean todas o ninguna: van en una sola transacción. Una
 * lista con filas que no se pueden crear se rechaza entera con su revisión. Si
 * otra alta se queda con un usuario entre la comprobación y la escritura, la
 * base lo rechaza y la transacción se repite con otro sufijo para esa fila.
 */
export async function createManagedStudents(
  actor: ClassUser,
  classId: string,
  rows: ManagedStudentRowInput[],
  options: { dryRun?: boolean } = {}
): Promise<ManagedBatchResult> {
  const cls = await classForManaging(classId, actor)
  if (rows.length === 0 || rows.length > MANAGED_BATCH_MAX) {
    throw new ValidationError(
      `La lista tiene que tener entre 1 y ${MANAGED_BATCH_MAX} alumnos`,
      'INVALID_ROW_COUNT'
    )
  }

  const reviews = await reviewRows(rows)
  const canCreate = !reviews.some(r => isRowError(r.status))
  if (options.dryRun) return { dryRun: true, rows: reviews, canCreate }
  if (!canCreate) throw new ManagedRowsError(reviews)

  // El hash es lo lento: se calcula antes, para no tener la transacción abierta
  // mientras tanto.
  const accounts = await Promise.all(
    reviews.map(async review => {
      const temporaryPassword = generateTemporaryPassword()
      return { review, temporaryPassword, passwordHash: await hashPassword(temporaryPassword) }
    })
  )

  const createAll = () =>
    prisma.$transaction(
      async tx => {
        const reserved = new Set<string>()
        const created: ManagedStudentCredentials[] = []
        for (const { review, temporaryPassword, passwordHash } of accounts) {
          // El revisado primero; si ya no está libre, el mismo con otro sufijo.
          const username = await firstFreeUsername(usernameVariants(review.username), reserved, tx)
          reserved.add(username)

          const student = await tx.user.create({
            data: {
              email: null,
              username,
              name: review.name,
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
          await enrollStudent(tx, { studentId: student.id, classId: cls.id, className: cls.name })
          await recordClassAction(tx, {
            classId: cls.id,
            actorId: actor.id,
            action: 'student.account_created',
            entityType: 'user',
            entityId: student.id,
            targetUserId: student.id,
          })
          created.push({
            student: { id: student.id, name: student.name, username: student.username! },
            temporaryPassword,
          })
        }
        return created
      },
      // Cincuenta altas con su matrícula y su registro caben de sobra, pero no
      // en los cinco segundos que da Prisma por defecto en una base cargada.
      { timeout: 30_000 }
    )

  for (let attempt = 1; ; attempt++) {
    try {
      return { dryRun: false, created: await createAll() }
    } catch (error) {
      if (!isUsernameConflict(error)) throw error
      if (attempt === 3) {
        throw new ValidationError(
          'No se han podido crear las cuentas; inténtalo de nuevo',
          'USERNAME_UNAVAILABLE'
        )
      }
    }
  }
}
