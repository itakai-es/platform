import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { ClassAccessLevel, ClassTeacherProfile } from '../../generated/prisma/enums.js'
import {
  PROFILE_DEFAULT_ACCESS,
  activeTeacherWhere,
  assertClassAccess,
  assertClassAccessOrPlatformAdmin,
  getClassAccess,
  hasClassLevel,
  recordClassAction,
  type ClassUser,
} from '../../utils/class-access.js'
import { transferClassOwnership } from '../../utils/class-owner.js'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors.js'
import { normalizeEmail } from '../../utils/identity.js'
import { notify, type NotifyInput } from '../notifications/notifications.service.js'
import {
  CLASS_ACCESS_LABELS,
  CLASS_TEACHER_PROFILE_LABELS,
} from '../notifications/notifications.messages.js'
import { deleteEnrollmentData, deleteUploads } from './class-students.service.js'

/**
 * Profesorado de una clase: quién la imparte, con qué perfil y con qué nivel.
 * Lo ve todo el profesorado de la clase; lo cambia quien tiene administración,
 * salvo al propietario, que solo cambia traspasando la clase. Cada cambio queda
 * en el registro de la clase y le llega un aviso a quien afecta.
 */

/** Mensaje único para un correo que no se puede añadir: no dice si la cuenta existe. */
const NOT_ADDABLE =
  'No se puede añadir a esa persona. Comprueba que el correo es el de una cuenta de profesorado.'

export interface ClassTeacherRow {
  id: string
  name: string
  email: string | null
  profile: ClassTeacherProfile
  access: ClassAccessLevel
  isOwner: boolean
  addedAt: Date
  endsAt: Date | null
}

const TEACHER_ROW_SELECT = {
  userId: true,
  access: true,
  profile: true,
  isOwner: true,
  createdAt: true,
  endsAt: true,
  user: { select: { name: true, email: true } },
} satisfies Prisma.ClassTeacherSelect

type TeacherRowPayload = Prisma.ClassTeacherGetPayload<{ select: typeof TEACHER_ROW_SELECT }>

function toTeacherRow(row: TeacherRowPayload): ClassTeacherRow {
  return {
    id: row.userId,
    name: row.user.name,
    email: row.user.email,
    profile: row.profile,
    access: row.access,
    isOwner: row.isOwner,
    addedAt: row.createdAt,
    endsAt: row.endsAt,
  }
}

/** Profesorado vigente de la clase: el propietario primero y el resto por antigüedad. */
async function currentTeachers(classId: string) {
  const rows = await prisma.classTeacher.findMany({
    where: { classId, ...activeTeacherWhere('read') },
    select: TEACHER_ROW_SELECT,
    orderBy: [{ isOwner: 'desc' }, { createdAt: 'asc' }],
  })
  return rows.map(toTeacherRow)
}

/** Fila vigente de un profesor en la clase, o 404 si no la tiene. */
async function teacherRow(tx: Prisma.TransactionClient, classId: string, userId: string) {
  const row = await tx.classTeacher.findFirst({
    where: { classId, userId, ...activeTeacherWhere('read') },
    select: TEACHER_ROW_SELECT,
  })
  if (!row) throw new NotFoundError('Esa persona no es profesorado de esta clase')
  return row
}

async function className(classId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } })
  return cls?.name ?? ''
}

async function userName(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  return user?.name ?? ''
}

/** Avisa a un profesor de lo que ha cambiado en su acceso. Si el aviso falla, el cambio sigue valiendo. */
function notifyTeacher(input: NotifyInput) {
  notify(input).catch(error => {
    console.error('[class-teachers] no se pudo avisar al profesor:', error)
  })
}

const classUrl = (classId: string) => `/profesor/clases/${classId}`

/** Aviso a quien recibe la propiedad de una clase. */
export function notifyOwnershipReceived(userId: string, classId: string, name: string) {
  notifyTeacher({
    userId,
    type: 'class_ownership_received',
    copy: 'class_ownership_received',
    params: { class: name },
    actionUrl: classUrl(classId),
    metadata: { classId },
  })
}

/** Profesorado de la clase. Quien administra la instancia lo ve sin impartirla. */
export async function listClassTeachers(actor: ClassUser, classId: string) {
  const access = await assertClassAccessOrPlatformAdmin(classId, actor, 'teachers.view')
  return {
    teachers: await currentTeachers(classId),
    myAccess: access,
    canManage: actor.role === 'admin' || (access !== null && hasClassLevel(access, 'admin')),
  }
}

export interface AddClassTeacherInput {
  email: string
  profile: ClassTeacherProfile
  /** Sin él, el del perfil (`PROFILE_DEFAULT_ACCESS`). */
  access?: ClassAccessLevel
}

/**
 * Añade a la clase a quien tiene una cuenta de profesorado con ese correo exacto.
 * Entra al momento, sin aceptar nada, y recibe un aviso. Si el correo no es el de
 * una cuenta de profesorado activa, el error es el mismo exista o no la cuenta;
 * la ruta limita los intentos.
 */
export async function addClassTeacher(
  actor: ClassUser,
  classId: string,
  input: AddClassTeacherInput
): Promise<{ teacher: ClassTeacherRow }> {
  await assertClassAccess(classId, actor.id, 'teachers.manage')

  const email = normalizeEmail(input.email)
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, status: true },
      })
    : null
  if (!user || user.role !== 'teacher' || user.status !== 'active') {
    throw new ValidationError(NOT_ADDABLE, 'TEACHER_NOT_ADDABLE')
  }

  const access = input.access ?? PROFILE_DEFAULT_ACCESS[input.profile]

  const row = await prisma.$transaction(async tx => {
    const existing = await tx.classTeacher.findUnique({
      where: { classId_userId: { classId, userId: user.id } },
      select: { endsAt: true },
    })
    // Una fila vencida se reaprovecha: vuelve a entrar como si fuera nueva.
    if (existing && (!existing.endsAt || existing.endsAt.getTime() > Date.now())) {
      throw new ConflictError(
        'Esa persona ya es profesorado de esta clase',
        'ALREADY_CLASS_TEACHER'
      )
    }
    const data = { access, profile: input.profile, addedById: actor.id, endsAt: null }
    const saved = existing
      ? await tx.classTeacher.update({
          where: { classId_userId: { classId, userId: user.id } },
          data,
          select: TEACHER_ROW_SELECT,
        })
      : await tx.classTeacher.create({
          data: { classId, userId: user.id, ...data },
          select: TEACHER_ROW_SELECT,
        })

    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      action: 'teacher.added',
      entityType: 'user',
      entityId: user.id,
      targetUserId: user.id,
      metadata: { profile: input.profile, access },
    })
    return saved
  })

  notifyTeacher({
    userId: user.id,
    type: 'class_teacher_added',
    copy: 'class_teacher_added',
    params: {
      actor: await userName(actor.id),
      class: await className(classId),
      profile: CLASS_TEACHER_PROFILE_LABELS[row.profile],
      access: CLASS_ACCESS_LABELS[row.access],
    },
    actionUrl: classUrl(classId),
    metadata: { classId },
  })

  return { teacher: toTeacherRow(row) }
}

export interface UpdateClassTeacherInput {
  profile?: ClassTeacherProfile
  /** Sin él y con perfil nuevo, el nivel pasa al de ese perfil. */
  access?: ClassAccessLevel
}

/** Cambia el perfil o el nivel de un profesor de la clase. Al propietario, no. */
export async function updateClassTeacher(
  actor: ClassUser,
  classId: string,
  userId: string,
  input: UpdateClassTeacherInput
): Promise<{ teacher: ClassTeacherRow }> {
  await assertClassAccess(classId, actor.id, 'teachers.manage')

  const result = await prisma.$transaction(async tx => {
    const current = await teacherRow(tx, classId, userId)
    if (current.isOwner) {
      throw new ForbiddenError(
        'Al propietario de la clase no se le cambia el perfil ni el nivel',
        'CLASS_OWNER_LOCKED'
      )
    }

    const profile = input.profile ?? current.profile
    const access =
      input.access ?? (input.profile ? PROFILE_DEFAULT_ACCESS[input.profile] : current.access)
    if (profile === current.profile && access === current.access) {
      return { row: current, changed: false }
    }

    const row = await tx.classTeacher.update({
      where: { classId_userId: { classId, userId } },
      data: { profile, access },
      select: TEACHER_ROW_SELECT,
    })
    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      action: 'teacher.changed',
      entityType: 'user',
      entityId: userId,
      targetUserId: userId,
      metadata: {
        before: { profile: current.profile, access: current.access },
        after: { profile, access },
      },
    })
    return { row, changed: true }
  })

  if (result.changed && userId !== actor.id) {
    notifyTeacher({
      userId,
      type: 'class_teacher_changed',
      copy: 'class_teacher_changed',
      params: {
        actor: await userName(actor.id),
        class: await className(classId),
        profile: CLASS_TEACHER_PROFILE_LABELS[result.row.profile],
        access: CLASS_ACCESS_LABELS[result.row.access],
      },
      actionUrl: classUrl(classId),
      metadata: { classId },
    })
  }

  return { teacher: toTeacherRow(result.row) }
}

/**
 * Saca a un profesor de la clase: su fila, su matrícula de vista previa (con lo
 * que hubiera hecho con ella) y sus avisos sobre la clase. Lo que hizo como
 * profesor se queda: el registro, las entregas que aprobó, los comportamientos.
 */
async function detachTeacher(tx: Prisma.TransactionClient, classId: string, userId: string) {
  await tx.classTeacher.delete({ where: { classId_userId: { classId, userId } } })

  const preview = await tx.classEnrollment.findFirst({
    where: { classId, studentId: userId, isPreview: true },
    select: { id: true },
  })
  // Con la matrícula se van también sus avisos de la clase.
  if (preview) return deleteEnrollmentData(tx, classId, userId, preview.id)

  await tx.notification.deleteMany({
    where: { userId, metadata: { path: ['classId'], equals: classId } },
  })
  return []
}

/** Quita a un profesor de la clase. Al propietario, no: antes hay que traspasarla. */
export async function removeClassTeacher(
  actor: ClassUser,
  classId: string,
  userId: string
): Promise<{ removed: true }> {
  await assertClassAccess(classId, actor.id, 'teachers.manage')

  const files = await prisma.$transaction(async tx => {
    const current = await teacherRow(tx, classId, userId)
    if (current.isOwner) {
      throw new ForbiddenError(
        'Al propietario no se le puede quitar de la clase',
        'CLASS_OWNER_LOCKED'
      )
    }
    const files = await detachTeacher(tx, classId, userId)
    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      // Quitarse a uno mismo es salir de la clase.
      action: userId === actor.id ? 'teacher.left' : 'teacher.removed',
      entityType: 'user',
      entityId: userId,
      targetUserId: userId,
      metadata: { profile: current.profile, access: current.access },
    })
    return files
  })
  await deleteUploads(files)

  if (userId !== actor.id) {
    notifyTeacher({
      userId,
      type: 'class_teacher_removed',
      copy: 'class_teacher_removed',
      params: { actor: await userName(actor.id), class: await className(classId) },
      metadata: { classId },
    })
  }

  return { removed: true }
}

/** Salir de la clase. Vale para todo el profesorado menos para el propietario. */
export async function leaveClass(actor: ClassUser, classId: string): Promise<{ left: true }> {
  const access = await assertClassAccess(classId, actor.id, 'teachers.leave')
  if (access.isOwner) {
    throw new ForbiddenError(
      'Eres el propietario de la clase: para salir de ella, pasa antes la propiedad a otra persona con administración',
      'CLASS_OWNER_CANNOT_LEAVE'
    )
  }

  const files = await prisma.$transaction(async tx => {
    const current = await teacherRow(tx, classId, actor.id)
    const files = await detachTeacher(tx, classId, actor.id)
    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      action: 'teacher.left',
      entityType: 'user',
      entityId: actor.id,
      targetUserId: actor.id,
      metadata: { profile: current.profile, access: current.access },
    })
    return files
  })
  await deleteUploads(files)
  return { left: true }
}

/**
 * Pasa la propiedad de la clase. La pasa su propietario, a alguien del
 * profesorado con administración; o quien administra la instancia, a cualquiera
 * del profesorado vigente, que sube a administración (es el respaldo cuando en
 * la clase no queda nadie que pueda hacerlo). El anterior propietario se queda
 * en la clase con administración.
 */
export async function transferClass(
  actor: ClassUser,
  classId: string,
  toUserId: string
): Promise<{ teachers: ClassTeacherRow[] }> {
  const access = await assertClassAccessOrPlatformAdmin(classId, actor, 'class.transfer')
  const byOwner = access?.isOwner === true

  await prisma.$transaction(async tx => {
    const target = await getClassAccess(classId, toUserId, tx)
    if (!target) throw new NotFoundError('Esa persona no es profesorado de esta clase')
    if (target.isOwner) {
      throw new ValidationError(
        'Esa persona ya es la propietaria de la clase',
        'ALREADY_CLASS_OWNER'
      )
    }
    if (byOwner && target.access !== 'admin') {
      throw new ValidationError(
        'La propiedad solo se puede pasar a alguien con administración en la clase',
        'TRANSFER_TARGET_NOT_ADMIN'
      )
    }

    const { fromUserId } = await transferClassOwnership(tx, classId, toUserId)
    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      action: 'class.ownership_transferred',
      entityType: 'user',
      entityId: toUserId,
      targetUserId: toUserId,
      metadata: { fromUserId, byPlatformAdmin: !byOwner },
    })
  })

  notifyOwnershipReceived(toUserId, classId, await className(classId))
  return { teachers: await currentTeachers(classId) }
}
