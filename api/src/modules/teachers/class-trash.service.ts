import { prisma } from '../../config/database.js'
import {
  accessibleClassesWhere,
  activeTeacherWhere,
  assertClassAccessOrPlatformAdmin,
  recordClassAction,
  type ClassUser,
} from '../../utils/class-access.js'
import { ConflictError, NotFoundError } from '../../utils/errors.js'
import { UNUSED_ACCOUNT_SELECT, unusedAccountHomeClass } from './class-students.service.js'

/**
 * Papelera de clases. Enviar una clase a la papelera no borra nada: la marca
 * con la fecha y quién la envió, la archiva (no se entrega nada, no salen
 * recordatorios y el código de invitación responde como el de una archivada)
 * y la retira del marketplace. El alumnado deja de verla y de abrirla, ranking,
 * guía y tienda incluidos (ver `getClassMembership`). Desde ese momento
 * solo sale en el listado de la papelera; a los 30 días la purga la borra de
 * verdad (o antes, si quien es propietario la borra ya: ver
 * `class-purge.service.ts`). Restaurarla la saca de la papelera y la deja archivada: quien la
 * restaura decide si la desarchiva, y la plantilla no se vuelve a publicar
 * sola.
 *
 * Enviar y restaurar son del propietario, con quien administra la instancia de
 * respaldo para una clase en la que ya no queda nadie que pueda hacerlo.
 */

/** Días que pasa una clase en la papelera antes de que la purga la borre. */
export const CLASS_TRASH_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/** Cuándo purga la clase enviada a la papelera en `deletedAt`. */
export function trashPurgeAt(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + CLASS_TRASH_DAYS * DAY_MS)
}

/** Días que le quedan en la papelera, redondeando hacia arriba; 0 si ya le toca la purga. */
export function trashDaysLeft(deletedAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((trashPurgeAt(deletedAt).getTime() - now.getTime()) / DAY_MS))
}

/** Lo que se cuenta de una clase en la papelera. */
function trashEntry(cls: { id: string; name: string; deletedAt: Date }) {
  return {
    id: cls.id,
    name: cls.name,
    deletedAt: cls.deletedAt,
    purgeAt: trashPurgeAt(cls.deletedAt),
    daysLeft: trashDaysLeft(cls.deletedAt),
  }
}

/**
 * Envía la clase a la papelera. Una que ya está en ella da 409: el segundo
 * envío no cambia la fecha, que es la que cuenta para la purga.
 */
export async function trashClass(actor: ClassUser, classId: string) {
  const access = await assertClassAccessOrPlatformAdmin(classId, actor, 'class.delete')

  const trashed = await prisma.$transaction(async tx => {
    const cls = await tx.class.findUnique({
      where: { id: classId },
      select: { name: true, archived: true, isTemplate: true, deletedAt: true },
    })
    if (!cls) throw new NotFoundError('Clase no encontrada')
    const deletedAt = new Date()
    // Condicionado a que no esté ya en la papelera: dos envíos a la vez dejan uno.
    const { count } = await tx.class.updateMany({
      where: { id: classId, deletedAt: null },
      data: { deletedAt, deletedById: actor.id, archived: true, isTemplate: false },
    })
    if (count === 0) {
      throw new ConflictError('La clase ya está en la papelera', 'CLASS_IN_TRASH')
    }
    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      action: 'class.trashed',
      entityType: 'class',
      entityId: classId,
      // Cómo estaba: al restaurarla vuelve archivada y sin publicar.
      metadata: {
        wasArchived: cls.archived,
        wasTemplate: cls.isTemplate,
        ...(access?.isOwner ? {} : { byPlatformAdmin: true }),
      },
    })
    return { id: classId, name: cls.name, deletedAt }
  })

  return { class: trashEntry(trashed), message: 'Clase enviada a la papelera' }
}

/**
 * Saca la clase de la papelera. Vuelve archivada y sin publicar como
 * plantilla, como se envió. Una que no está en la papelera da 409.
 */
export async function restoreClass(actor: ClassUser, classId: string) {
  const access = await assertClassAccessOrPlatformAdmin(classId, actor, 'class.restore')

  const restored = await prisma.$transaction(async tx => {
    const { count } = await tx.class.updateMany({
      where: { id: classId, deletedAt: { not: null } },
      // También sin publicar: si una publicación se coló a la vez que el envío, no
      // vuelve al marketplace al desarchivarla.
      data: { deletedAt: null, deletedById: null, archived: true, isTemplate: false },
    })
    if (count === 0) {
      throw new ConflictError('La clase no está en la papelera', 'CLASS_NOT_IN_TRASH')
    }
    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      action: 'class.restored',
      entityType: 'class',
      entityId: classId,
      ...(access?.isOwner ? {} : { metadata: { byPlatformAdmin: true } }),
    })
    return tx.class.findUniqueOrThrow({
      where: { id: classId },
      select: { id: true, name: true, archived: true, isTemplate: true },
    })
  })

  return { class: restored, message: 'Clase restaurada; sigue archivada' }
}

/**
 * La papelera de quien pregunta: las clases que tiene en ella como
 * propietario, la última enviada primero. De quién la envió solo se dice si
 * fue él y, si no, el nombre (lo ve igual en el profesorado de la clase).
 */
export async function listClassTrash(userId: string) {
  const rows = await prisma.class.findMany({
    where: { ...accessibleClassesWhere(userId, 'owner'), deletedAt: { not: null } },
    select: {
      id: true,
      name: true,
      backgroundImage: true,
      deletedAt: true,
      deletedById: true,
      deletedBy: { select: { name: true } },
    },
    orderBy: [{ deletedAt: 'desc' }, { id: 'asc' }],
  })

  const classes = rows.map(row => ({
    ...trashEntry({ id: row.id, name: row.name, deletedAt: row.deletedAt! }),
    backgroundImage: row.backgroundImage,
    // Sin autor si su cuenta se ha borrado.
    deletedBy: row.deletedById
      ? { isMe: row.deletedById === userId, name: row.deletedBy?.name ?? null }
      : null,
  }))
  return { classes, total: classes.length, purgeDays: CLASS_TRASH_DAYS }
}

/**
 * Lo que se perdería al purgar la clase, para el aviso antes de enviarla a la
 * papelera (o de vaciarla). Solo cuenta: no borra nada. Las cuentas
 * gestionadas nacidas en la clase siguen la regla de quitar a un alumno
 * (`unusedAccountHomeClass`): la que nunca se ha usado y solo está en esta
 * clase se borraría entera; las demás se quedarían sin clase de origen, para
 * quien administra la instancia.
 */
export async function classDeletionImpact(actor: ClassUser, classId: string) {
  await assertClassAccessOrPlatformAdmin(classId, actor, 'class.delete')

  const [cls, students, submissionsWithFile, missions, shopPurchases, otherTeachers, born] =
    await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, name: true, isTemplate: true, deletedAt: true },
      }),
      prisma.classEnrollment.count({ where: { classId, isPreview: false } }),
      prisma.enigmaSubmission.count({
        where: { enigma: { mission: { classId } }, fileUrl: { not: null } },
      }),
      prisma.mission.count({ where: { classId } }),
      prisma.shopPurchase.count({ where: { classId } }),
      // Quien imparte la clase con el propietario, que deja de tenerla.
      prisma.classTeacher.count({
        where: { classId, isOwner: false, ...activeTeacherWhere('read') },
      }),
      prisma.user.findMany({
        where: { homeClassId: classId, accountType: 'managed' },
        select: {
          ...UNUSED_ACCOUNT_SELECT,
          enrollments: { where: { classId }, select: { id: true } },
        },
      }),
    ])
  if (!cls) throw new NotFoundError('Clase no encontrada')

  // Se borraría solo si su única matrícula es la de esta clase.
  const deleted = born.filter(
    account => account.enrollments.length > 0 && unusedAccountHomeClass(account) === classId
  ).length

  return {
    classId: cls.id,
    name: cls.name,
    inTrash: cls.deletedAt !== null,
    isTemplate: cls.isTemplate,
    students,
    submissionsWithFile,
    missions,
    shopPurchases,
    otherTeachers,
    managedAccounts: { deleted, unmanaged: born.length - deleted },
    purgeDays: CLASS_TRASH_DAYS,
  }
}
