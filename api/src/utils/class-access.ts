import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../config/database.js'
import type { Prisma } from '../generated/prisma/client.js'
import type { ClassAccessLevel, ClassTeacherProfile } from '../generated/prisma/enums.js'
import { ForbiddenError, NotFoundError } from './errors.js'

/**
 * Acceso del profesorado a una clase. Todo lo que pregunte «¿puede este
 * profesor hacer esto en esta clase?» pasa por aquí: el acceso se lee de
 * `ClassTeacher` en cada petición (no viaja en el token), así que quitar a
 * alguien de una clase surte efecto al momento.
 *
 * El 404 y el 403 los pone el manejador global de errores. Una ruta que envuelva
 * su servicio en un try/catch propio y responda 400 a cualquier `Error` se los
 * come: al usar estas funciones desde un servicio, ese catch tiene que relanzar
 * los `HttpError` (o la ruta usar `requireClassAccess`, que va antes del catch).
 *
 * Aquí manda la fila de `ClassTeacher`, también para el propietario: una clase
 * sin su fila de propietario es un dato roto que se repara (la migración que
 * crea la tabla trae la consulta), no un caso que se tolere.
 */

/** Nivel exigible. `owner` no es un nivel guardado: es `isOwner`, por encima de `admin`. */
export type ClassRequiredLevel = ClassAccessLevel | 'owner'

export interface ClassAccess {
  access: ClassAccessLevel
  profile: ClassTeacherProfile
  isOwner: boolean
}

/** Orden de los niveles: cada uno incluye a los anteriores. */
const LEVEL_RANK: Record<ClassRequiredLevel, number> = { read: 1, edit: 2, admin: 3, owner: 4 }

/**
 * Nivel mínimo de cada acción. Lectura ve; edición toca el contenido, la tienda,
 * los comportamientos y las entregas; administración lleva los ajustes, el
 * alumnado, el archivo y el profesorado. Publicar la plantilla y traspasar la
 * clase son solo del propietario.
 */
export const CLASS_ACTION_LEVEL = {
  'class.view': 'read',
  'class.duplicate': 'read',
  'class.editContent': 'edit',
  'class.editSettings': 'admin',
  'class.archive': 'admin',
  'class.inviteCode': 'admin',
  'class.publishTemplate': 'owner',
  'class.transfer': 'owner',
  'mission.view': 'read',
  'mission.edit': 'edit',
  'shop.view': 'read',
  'shop.edit': 'edit',
  'behavior.view': 'read',
  'behavior.edit': 'edit',
  'behavior.apply': 'edit',
  'submission.view': 'read',
  'submission.approve': 'edit',
  'student.view': 'read',
  'student.avatar': 'edit',
  'student.manage': 'admin',
  // El alias del alumno en la clase. Él también lo cambia, desde su lado.
  'student.nickname': 'admin',
  'teachers.view': 'read',
  'teachers.manage': 'admin',
} as const satisfies Record<string, ClassRequiredLevel>

export type ClassAction = keyof typeof CLASS_ACTION_LEVEL

type Db = Prisma.TransactionClient

/** ¿Llega este acceso al nivel pedido? */
export function hasClassLevel(access: ClassAccess, level: ClassRequiredLevel): boolean {
  if (level === 'owner') return access.isOwner
  // El propietario llega a todo, tenga el nivel guardado que tenga.
  return access.isOwner || LEVEL_RANK[access.access] >= LEVEL_RANK[level]
}

/** Niveles guardados que alcanzan `minLevel`. Para `owner` no hay ninguno: se filtra por `isOwner`. */
function levelsFrom(minLevel: ClassAccessLevel): ClassAccessLevel[] {
  return (['read', 'edit', 'admin'] as const).filter(l => LEVEL_RANK[l] >= LEVEL_RANK[minLevel])
}

/** Filtro de filas de profesorado vigentes (sin fecha de fin o con ella en el futuro) que llegan a `minLevel`. */
function activeTeacherWhere(
  minLevel: ClassRequiredLevel,
  now = new Date()
): Prisma.ClassTeacherWhereInput {
  return {
    AND: [
      { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      minLevel === 'owner'
        ? { isOwner: true }
        : { OR: [{ isOwner: true }, { access: { in: levelsFrom(minLevel) } }] },
    ],
  }
}

/** Acceso de un usuario a una clase, o null si no tiene (o si su acceso ya venció). */
export async function getClassAccess(
  classId: string,
  userId: string,
  tx: Db = prisma
): Promise<ClassAccess | null> {
  const row = await tx.classTeacher.findUnique({
    where: { classId_userId: { classId, userId } },
    select: { access: true, profile: true, isOwner: true, endsAt: true },
  })
  if (!row) return null
  if (row.endsAt && row.endsAt.getTime() <= Date.now()) return null
  return { access: row.access, profile: row.profile, isOwner: row.isOwner }
}

/**
 * Exige que el usuario pueda hacer `action` en la clase. Sin acceso responde
 * como si la clase no existiera (404), para no revelar que existe; con acceso
 * pero sin nivel suficiente, 403.
 */
export async function assertClassAccess(
  classId: string,
  userId: string,
  action: ClassAction,
  tx: Db = prisma
): Promise<ClassAccess> {
  const { classId: _classId, ...access } = await assertResourceAccess(
    classId,
    'Clase no encontrada',
    userId,
    action,
    tx
  )
  return access
}

/**
 * Igual que `assertClassAccess`, salvo que quien administra la instancia pasa
 * siempre: es el respaldo cuando en una clase ya no queda nadie que pueda
 * hacerlo. Devuelve su acceso en la clase, o null si entra por ser
 * administración de la instancia y no imparte esa clase.
 */
export async function assertClassAccessOrPlatformAdmin(
  classId: string,
  user: ClassUser,
  action: ClassAction,
  tx: Db = prisma
): Promise<ClassAccess | null> {
  if (user.role === 'admin') {
    const exists = await tx.class.findUnique({ where: { id: classId }, select: { id: true } })
    if (!exists) throw new NotFoundError('Clase no encontrada')
    return getClassAccess(classId, user.id, tx)
  }
  return assertClassAccess(classId, user.id, action, tx)
}

// ---- Variantes por recurso ----
// Resuelven la clase a la que pertenece el recurso y aplican la misma regla. Un
// recurso que no existe y uno de una clase ajena responden igual: 404.

export interface ResourceAccess extends ClassAccess {
  classId: string
}

async function assertResourceAccess(
  classId: string | null | undefined,
  notFound: string,
  userId: string,
  action: ClassAction,
  tx: Db
): Promise<ResourceAccess> {
  if (!classId) throw new NotFoundError(notFound)
  const access = await getClassAccess(classId, userId, tx)
  if (!access) throw new NotFoundError(notFound)
  if (!hasClassLevel(access, CLASS_ACTION_LEVEL[action])) {
    throw new ForbiddenError('No tienes permiso para hacer esto en esta clase')
  }
  return { ...access, classId }
}

export async function assertMissionAccess(
  missionId: string,
  userId: string,
  action: ClassAction,
  tx: Db = prisma
) {
  const mission = await tx.mission.findUnique({
    where: { id: missionId },
    select: { classId: true },
  })
  return assertResourceAccess(mission?.classId, 'Misión no encontrada', userId, action, tx)
}

export async function assertEnigmaAccess(
  enigmaId: string,
  userId: string,
  action: ClassAction,
  tx: Db = prisma
) {
  const enigma = await tx.missionEnigma.findUnique({
    where: { id: enigmaId },
    select: { mission: { select: { classId: true } } },
  })
  return assertResourceAccess(enigma?.mission.classId, 'Enigma no encontrado', userId, action, tx)
}

export async function assertDocumentAccess(
  documentId: string,
  userId: string,
  action: ClassAction,
  tx: Db = prisma
) {
  const document = await tx.missionDocument.findUnique({
    where: { id: documentId },
    select: { mission: { select: { classId: true } } },
  })
  return assertResourceAccess(
    document?.mission.classId,
    'Documento no encontrado',
    userId,
    action,
    tx
  )
}

export async function assertSubmissionAccess(
  submissionId: string,
  userId: string,
  action: ClassAction,
  tx: Db = prisma
) {
  const submission = await tx.enigmaSubmission.findUnique({
    where: { id: submissionId },
    select: { enigma: { select: { mission: { select: { classId: true } } } } },
  })
  return assertResourceAccess(
    submission?.enigma.mission.classId,
    'Entrega no encontrada',
    userId,
    action,
    tx
  )
}

export async function assertEnrollmentAccess(
  enrollmentId: string,
  userId: string,
  action: ClassAction,
  tx: Db = prisma
) {
  const enrollment = await tx.classEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { classId: true },
  })
  return assertResourceAccess(enrollment?.classId, 'Matrícula no encontrada', userId, action, tx)
}

// ---- Miembros de la clase: profesorado y alumnado ----
// Lo que ven los dos lados (una misión, sus documentos, la guía) se abre a quien
// es profesor de la clase o está matriculado en ella.

/** Quien hace la petición: el `id` y el `role` que viajan en el token. */
export interface ClassUser {
  id: string
  role?: string | null
}

export interface StudentEnrollmentRef {
  id: string
  isPreview: boolean
}

export interface ClassMembership {
  /** Acceso como profesor, si lo tiene. */
  teacher: ClassAccess | null
  /** Matrícula con la que actúa como alumno, si la tiene. */
  enrollment: StudentEnrollmentRef | null
}

/**
 * ¿Vale esta matrícula para actuar como alumno? La de un alumno, siempre. Quien
 * imparte la clase mira su clase como alumno con la matrícula que tenga en ella,
 * sea de vista previa o no. Fuera de esos dos casos no da acceso: una matrícula
 * corriente de quien no tiene rol alumno, o una de vista previa de quien ya no
 * es profesor de la clase, no abren nada.
 */
function enrollmentCounts(
  enrollment: StudentEnrollmentRef | null,
  user: ClassUser,
  teacher: ClassAccess | null
): enrollment is StudentEnrollmentRef {
  if (!enrollment) return false
  if (teacher !== null) return true
  return !enrollment.isPreview && user.role === 'student'
}

/** Relación de un usuario con una clase, o null si no tiene ninguna. */
export async function getClassMembership(
  classId: string,
  user: ClassUser,
  tx: Db = prisma
): Promise<ClassMembership | null> {
  const [teacher, row] = await Promise.all([
    getClassAccess(classId, user.id, tx),
    tx.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: user.id, classId } },
      select: { id: true, isPreview: true },
    }),
  ])
  const enrollment = enrollmentCounts(row, user, teacher) ? row : null
  if (!teacher && !enrollment) return null
  return { teacher, enrollment }
}

/** Matrícula con la que el usuario actúa como alumno en la clase, o null. */
export async function getStudentEnrollment(classId: string, user: ClassUser, tx: Db = prisma) {
  return (await getClassMembership(classId, user, tx))?.enrollment ?? null
}

/**
 * Filtro de `ClassEnrollment` con las matrículas con las que el usuario actúa
 * como alumno: mismo criterio que `getStudentEnrollment`, para los listados.
 */
export function studentEnrollmentsWhere(user: ClassUser): Prisma.ClassEnrollmentWhereInput {
  if (user.role === 'student') return { studentId: user.id, isPreview: false }
  return { studentId: user.id, class: accessibleClassesWhere(user.id) }
}

/** Exige ser profesor de la clase o estar matriculado en ella. Si no, 404. */
export async function assertClassMember(
  classId: string,
  user: ClassUser,
  tx: Db = prisma
): Promise<ClassMembership> {
  const membership = await getClassMembership(classId, user, tx)
  if (!membership) throw new NotFoundError('Clase no encontrada')
  return membership
}

/** Lo que hace falta de la misión para decidir si un alumno la ve. */
interface MissionForMember {
  classId: string
  status: string
  class: { archived: boolean }
}

/** Regla común de `assertMissionMember` y `assertDocumentMember`. */
async function missionMembership(
  mission: MissionForMember | null | undefined,
  notFound: string,
  user: ClassUser,
  tx: Db
): Promise<ClassMembership & { classId: string }> {
  const membership = mission && (await getClassMembership(mission.classId, user, tx))
  if (!mission || !membership) throw new NotFoundError(notFound)
  if (!membership.teacher && (mission.class.archived || mission.status === 'bloqueada')) {
    throw new NotFoundError(notFound)
  }
  return { ...membership, classId: mission.classId }
}

/**
 * Exige poder ver la misión: profesorado de su clase o alumno matriculado. Al
 * alumno se le cierra, además, si la clase está archivada o la misión bloqueada.
 */
export async function assertMissionMember(
  missionId: string,
  user: ClassUser,
  tx: Db = prisma
): Promise<ClassMembership & { classId: string }> {
  const mission = await tx.mission.findUnique({
    where: { id: missionId },
    select: { classId: true, status: true, class: { select: { archived: true } } },
  })
  return missionMembership(mission, 'Misión no encontrada', user, tx)
}

/** Igual que `assertMissionMember`, partiendo de un documento de la misión. */
export async function assertDocumentMember(
  documentId: string,
  user: ClassUser,
  tx: Db = prisma
): Promise<ClassMembership & { classId: string; missionId: string }> {
  const document = await tx.missionDocument.findUnique({
    where: { id: documentId },
    select: {
      missionId: true,
      mission: { select: { classId: true, status: true, class: { select: { archived: true } } } },
    },
  })
  if (!document) throw new NotFoundError('Documento no encontrado')
  const membership = await missionMembership(document.mission, 'Documento no encontrado', user, tx)
  return { ...membership, missionId: document.missionId }
}

/**
 * Versión sin excepción de las comprobaciones `assert…`: false si la comprobación
 * responde 404 o 403. Para cuando sin acceso no se rechaza la petición, solo se
 * deja fuera lo que dependía de él.
 */
export async function passesAccessCheck(check: Promise<unknown>): Promise<boolean> {
  try {
    await check
    return true
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) return false
    throw error
  }
}

// ---- Listados y avisos ----

/** Lo que se cuenta de cada profesor de una clase. */
export interface ClassTeacherSummary {
  id: string
  name: string
  profile: ClassTeacherProfile
  access: ClassAccessLevel
  isOwner: boolean
}

/** `include` de `Class.teachers` con lo justo para `summarizeClassTeachers`: solo filas vigentes, el propietario primero. */
export function classTeachersInclude(now = new Date()) {
  return {
    where: { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    select: {
      userId: true,
      access: true,
      profile: true,
      isOwner: true,
      user: { select: { name: true } },
    },
    orderBy: [{ isOwner: 'desc' }, { createdAt: 'asc' }],
  } satisfies Prisma.Class$teachersArgs
}

type ClassTeacherRow = Prisma.ClassTeacherGetPayload<{
  select: ReturnType<typeof classTeachersInclude>['select']
}>

/**
 * Profesorado de una clase y acceso de quien la pide, a partir de las filas de
 * `classTeachersInclude`. Mismo criterio que `getClassAccess`: sin fila no hay acceso.
 */
export function summarizeClassTeachers(
  rows: ClassTeacherRow[],
  userId: string
): { myAccess: ClassAccess | null; teachers: ClassTeacherSummary[] } {
  const teachers = rows.map(r => ({
    id: r.userId,
    name: r.user.name,
    profile: r.profile,
    access: r.access,
    isOwner: r.isOwner,
  }))
  const mine = rows.find(r => r.userId === userId)
  const myAccess: ClassAccess | null = mine
    ? { access: mine.access, profile: mine.profile, isOwner: mine.isOwner }
    : null
  return { myAccess, teachers }
}

/** Filtro de `Class` con las clases en las que el usuario llega a `minLevel`. Se combina con el resto del `where`. */
export function accessibleClassesWhere(
  userId: string,
  minLevel: ClassRequiredLevel = 'read'
): Prisma.ClassWhereInput {
  return { teachers: { some: { userId, ...activeTeacherWhere(minLevel) } } }
}

/** Ids de los profesores de la clase que llegan a `minLevel`: a quién avisar de algo que pasa en ella. */
export async function classTeacherRecipients(
  classId: string,
  minLevel: ClassRequiredLevel = 'edit',
  tx: Db = prisma
): Promise<string[]> {
  const rows = await tx.classTeacher.findMany({
    where: { classId, ...activeTeacherWhere(minLevel) },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(r => r.userId)
}

// ---- Registro de acciones ----

export interface ClassActionInput {
  classId: string
  actorId: string
  /** Avatar de quien actúa, si tiene. Se guarda copiado, como el nombre. */
  actorAvatar?: string | null
  /** Clave `dominio.verbo`: `submission.approved`, `teacher.added`… */
  action: string
  entityType?: string
  entityId?: string
  /** Alumno o profesor sobre el que recae la acción. Es la única referencia a la persona. */
  targetUserId?: string
  /** Datos de la acción. Sin nombres de alumnos: para eso está `targetUserId`. */
  metadata?: Prisma.InputJsonObject
}

const ACTION_KEY = /^[a-z][a-zA-Z]*\.[a-z][a-z_]*$/

/**
 * Claves que delatan el nombre de una persona dentro de `metadata`. Es una red
 * de mínimos, no una garantía: no mira los valores ni conoce todas las claves
 * posibles. `name` también cae, aunque sea de un artículo o de una misión: para
 * eso se usa `title` o `label`, y así `name` nunca es ambiguo.
 */
const NAME_KEYS =
  /^(name|nombre|apellidos?|full_?name|first_?name|last_?name|surname|real_?name|display_?name|user_?name|student|student_?name|alumn[oa]|nick|nickname|alias|email|correo)$/i

/** Copia de `value` sin las claves de `NAME_KEYS`; apunta en `removed` las que quita. */
function stripNames(value: unknown, path: string, removed: string[]): unknown {
  if (Array.isArray(value))
    return value.map((item, i) => stripNames(item, `${path}[${i}]`, removed))
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value)) {
      if (NAME_KEYS.test(key)) removed.push(`${path}.${key}`)
      else clean[key] = stripNames(inner, `${path}.${key}`, removed)
    }
    return clean
  }
  return value
}

/**
 * `metadata` sin nombres de personas. En desarrollo y en los tests una clave
 * prohibida es un error, para que se vea al escribir el código; en producción se
 * descarta la clave y se avisa, porque esto corre dentro de la transacción de la
 * acción real y no debe tumbarla.
 */
function metadataWithoutNames(
  metadata: Prisma.InputJsonObject | undefined
): Prisma.InputJsonObject | undefined {
  if (!metadata) return metadata
  const removed: string[] = []
  const clean = stripNames(metadata, 'metadata', removed) as Prisma.InputJsonObject
  if (removed.length === 0) return metadata
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      `recordClassAction: ${removed.map(k => `«${k}»`).join(', ')} no puede ir en metadata; usa targetUserId (o title/label si no es una persona)`
    )
  }
  console.warn(`[class-action-log] claves descartadas de metadata: ${removed.join(', ')}`)
  return clean
}

/**
 * Apunta una acción en el registro de la clase. Va siempre dentro de la
 * transacción de la acción que registra: o quedan las dos o ninguna. Copia el
 * nombre de quien actúa para que la entrada se siga leyendo sin su cuenta.
 */
export async function recordClassAction(tx: Db, input: ClassActionInput) {
  if (!ACTION_KEY.test(input.action)) {
    throw new Error(`recordClassAction: «${input.action}» no tiene la forma dominio.verbo`)
  }
  const metadata = metadataWithoutNames(input.metadata)

  const actor = await tx.user.findUnique({ where: { id: input.actorId }, select: { name: true } })
  return tx.classActionLog.create({
    data: {
      classId: input.classId,
      actorId: input.actorId,
      actorName: actor?.name ?? '',
      actorAvatar: input.actorAvatar ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      targetUserId: input.targetUserId,
      metadata,
    },
  })
}

// ---- Rutas ----

declare module 'fastify' {
  interface FastifyRequest {
    /** Acceso a la clase de `:classId`. Lo deja `requireClassAccess`. */
    classAccess?: ClassAccess
    /** Matrícula en la clase de `:classId`. La deja `requireStudentEnrollment`. */
    studentEnrollment?: StudentEnrollmentRef
  }
}

/**
 * preHandler para rutas con `:classId`, detrás de `authenticate`. Deja el
 * acceso en `request.classAccess`; si no lo hay o no llega, el error sube al
 * manejador global (404 o 403).
 */
export function requireClassAccess(action: ClassAction) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const { classId } = request.params as { classId?: string }
    const user = request.user as { id: string } | undefined
    if (!classId || !user?.id) throw new NotFoundError('Clase no encontrada')
    request.classAccess = await assertClassAccess(classId, user.id, action)
  }
}

/**
 * preHandler para las rutas de alumno con `:classId`, detrás de `authenticate`:
 * exige la matrícula con la que el usuario actúa como alumno en esa clase y la
 * deja en `request.studentEnrollment`. Sin ella responde 404.
 */
export function requireStudentEnrollment() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const { classId } = request.params as { classId?: string }
    const user = request.user as ClassUser | undefined
    const enrollment = classId && user?.id ? await getStudentEnrollment(classId, user) : null
    if (!enrollment) throw new NotFoundError('No estás inscrito en esta clase')
    request.studentEnrollment = enrollment
  }
}
