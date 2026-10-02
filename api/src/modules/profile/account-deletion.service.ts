import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  LIVE_CLASS_WHERE,
  activeTeacherWhere,
  recordClassAction,
} from '../../utils/class-access.js'
import { transferClassOwnership } from '../../utils/class-owner.js'
import { ConflictError } from '../../utils/errors.js'
import { notifyOwnershipReceived } from '../teachers/class-teachers.service.js'
import {
  PURGE_TRANSACTION_TIMEOUT_MS,
  finishClassPurge,
  purgeClassInTx,
  type PurgedClass,
} from '../teachers/class-purge.service.js'

/**
 * Borrar una cuenta que imparte clases. Una clase no se queda sin propietario:
 * si quien se va es propietario de alguna, la propiedad pasa a la persona con
 * administración más antigua en ella. Si en alguna no hay nadie más con
 * administración, la cuenta no se borra y se dice qué clases lo impiden.
 *
 * Las insignias del profesor tampoco pueden quedarse sin autor, porque sin
 * autor una insignia es del sistema y la verían todos: las vinculadas a una
 * misión pasan al propietario de la clase de esa misión (ya el nuevo, si la
 * clase acaba de cambiar de manos). Las sueltas que algún alumno ya ha ganado
 * pasan al propietario de una clase suya en la que esté ese alumno, para que no
 * la pierda; las demás, que eran solo suyas, se borran. La base lo respalda: no
 * deja borrar al autor de una insignia.
 *
 * Las clases que tiene en la papelera como propietario no se traspasan ni
 * impiden nada: se borran para siempre con la cuenta, con la misma purga que
 * las vencidas (`purgeClassInTx`), y el aviso previo las nombra.
 *
 * Lo demás que hizo como profesor se conserva sin su cuenta: el registro de la
 * clase guarda su nombre copiado, y las entregas que aprobó, las entradas del
 * feed y los comportamientos que aplicó se quedan sin autor.
 */

type Db = Prisma.TransactionClient

export interface OwnedClassSuccession {
  classId: string
  className: string
  /** Quién se queda con la clase, o null si no hay nadie con administración. */
  successor: { id: string; name: string } | null
}

/**
 * Qué pasaría con cada clase de la que es propietario si se borrase su cuenta.
 * Las de la papelera no cuentan: se borran con ella (`ownedTrashedClasses`).
 */
export async function ownedClassesSuccession(
  userId: string,
  tx: Db = prisma
): Promise<OwnedClassSuccession[]> {
  const owned = await tx.classTeacher.findMany({
    where: { userId, isOwner: true, class: LIVE_CLASS_WHERE },
    select: { classId: true, class: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  // Una tras otra: dentro de una transacción todas van por la misma conexión.
  const succession: OwnedClassSuccession[] = []
  for (const { classId, class: cls } of owned) {
    // Solo una cuenta de profesorado activa: una suspendida no podría entrar a su clase.
    const next = await tx.classTeacher.findFirst({
      where: {
        classId,
        userId: { not: userId },
        user: { role: 'teacher', status: 'active' },
        ...activeTeacherWhere('admin'),
      },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    })
    succession.push({
      classId,
      className: cls.name,
      successor: next ? { id: next.userId, name: next.user.name } : null,
    })
  }
  return succession
}

/** Las clases que tiene en la papelera como propietario: se borran para siempre con la cuenta. */
export async function ownedTrashedClasses(
  userId: string,
  tx: Db = prisma
): Promise<{ id: string; name: string }[]> {
  const rows = await tx.classTeacher.findMany({
    where: { userId, isOwner: true, class: { deletedAt: { not: null } } },
    select: { class: { select: { id: true, name: true } } },
    orderBy: { class: { deletedAt: 'desc' } },
  })
  return rows.map(r => r.class)
}

/** La cuenta no se puede borrar: es propietaria de clases en las que no queda nadie con administración. */
export class AccountDeletionBlockedError extends ConflictError {
  readonly classes: { id: string; name: string }[]
  constructor(classes: { id: string; name: string }[], message: string) {
    super(message, 'OWNS_CLASSES_WITHOUT_SUCCESSOR')
    this.name = 'AccountDeletionBlockedError'
    this.classes = classes
  }
}

const BLOCKED_MESSAGE = {
  self: 'No puedes borrar tu cuenta: tienes la propiedad de clases en las que no hay nadie más con administración. Da administración en ellas a otra persona del profesorado (la propiedad pasará a ella) o pásale la propiedad antes de borrarla.',
  admin:
    'No se puede borrar esta cuenta: es propietaria de clases en las que no hay nadie más con administración. Pasa antes la propiedad de esas clases a otra persona del profesorado.',
}

/** Lo que se le enseña a quien va a borrar la cuenta, antes de pedir la confirmación. */
export async function accountDeletionCheck(userId: string) {
  const succession = await ownedClassesSuccession(userId)
  const blocked = succession.filter(s => !s.successor)
  return {
    canDelete: blocked.length === 0,
    blockingClasses: blocked.map(s => ({ id: s.classId, name: s.className })),
    transfers: succession
      .filter(s => s.successor)
      .map(s => ({ classId: s.classId, className: s.className, toUser: s.successor! })),
    trashedClasses: await ownedTrashedClasses(userId),
  }
}

/**
 * Borra la cuenta y, en la misma transacción, antes de borrarla, purga las
 * clases que tiene en la papelera, traspasa las demás y reparte sus insignias.
 * Todo o nada: si una clase lo impide, tampoco se purga ninguna. Los ficheros
 * de las purgadas se borran después. `actorId` es quien la borra (ella misma o
 * quien administra la instancia): figura en el registro de cada clase
 * traspasada y en el del sistema por cada purgada.
 */
export async function deleteUserAccount(
  userId: string,
  { actorId, bySelf }: { actorId: string; bySelf: boolean }
): Promise<{ transferred: OwnedClassSuccession[]; purged: number }> {
  // Cada purga lleva su margen, como la de la tarea programada.
  const inTrash = (await ownedTrashedClasses(userId)).length
  const { succession: transferred, purged } = await prisma.$transaction(
    async tx => {
      const succession = await ownedClassesSuccession(userId, tx)
      const blocked = succession.filter(s => !s.successor)
      if (blocked.length > 0) {
        throw new AccountDeletionBlockedError(
          blocked.map(s => ({ id: s.classId, name: s.className })),
          BLOCKED_MESSAGE[bySelf ? 'self' : 'admin']
        )
      }

      // Antes que las insignias: las de sus misiones se van con ellas.
      const purged: PurgedClass[] = []
      for (const cls of await ownedTrashedClasses(userId, tx)) {
        const result = await purgeClassInTx(tx, cls.id, {
          reason: 'account_deleted',
          actorId,
          ownerId: userId,
        })
        if (result) purged.push(result)
      }

      for (const { classId, successor } of succession) {
        await transferClassOwnership(tx, classId, successor!.id)
        await recordClassAction(tx, {
          classId,
          actorId,
          action: 'class.ownership_transferred',
          entityType: 'user',
          entityId: successor!.id,
          targetUserId: successor!.id,
          metadata: { fromUserId: userId, reason: 'account_deleted' },
        })
      }

      await reassignBadges(tx, userId)
      await tx.user.delete({ where: { id: userId } })
      return { succession, purged }
    },
    { timeout: 5_000 + inTrash * PURGE_TRANSACTION_TIMEOUT_MS }
  )

  for (const { classId, className, successor } of transferred) {
    notifyOwnershipReceived(successor!.id, classId, className)
  }
  // Los ficheros de las purgadas, ya confirmado el borrado. No lanza: lo que no
  // se pueda borrar queda en el registro del sistema.
  for (const cls of purged) await finishClassPurge(cls)
  return { transferred, purged: purged.length }
}

/**
 * Insignias de quien se va: las de una misión, al propietario de su clase; las
 * sueltas ya ganadas, al propietario de una clase suya donde esté quien la ganó;
 * el resto se borra (y con ellas, en cascada, quien las tuviera ganadas).
 */
async function reassignBadges(tx: Db, userId: string) {
  const linked = await tx.badge.findMany({
    where: { teacherId: userId, missionId: { not: null } },
    select: {
      id: true,
      mission: {
        select: {
          class: { select: { teachers: { where: { isOwner: true }, select: { userId: true } } } },
        },
      },
    },
  })
  const byOwner = new Map<string, string[]>()
  for (const badge of linked) {
    const owner = badge.mission?.class.teachers[0]?.userId
    if (!owner || owner === userId) continue
    byOwner.set(owner, [...(byOwner.get(owner) ?? []), badge.id])
  }
  // Una suelta ganada vino de una misión suya: la clase en la que está quien la
  // ganó y en la que él daba clase es la que la conserva.
  const looseEarned = await tx.badge.findMany({
    where: { teacherId: userId, missionId: null, students: { some: {} } },
    select: { id: true, students: { select: { studentId: true } } },
  })
  for (const badge of looseEarned) {
    const enrollment = await tx.classEnrollment.findFirst({
      where: {
        studentId: { in: badge.students.map(s => s.studentId) },
        isPreview: false,
        class: { teachers: { some: { userId } } },
      },
      orderBy: { enrolledAt: 'asc' },
      select: {
        class: { select: { teachers: { where: { isOwner: true }, select: { userId: true } } } },
      },
    })
    const owner = enrollment?.class.teachers[0]?.userId
    if (!owner || owner === userId) continue
    byOwner.set(owner, [...(byOwner.get(owner) ?? []), badge.id])
  }
  for (const [owner, ids] of byOwner) {
    await tx.badge.updateMany({ where: { id: { in: ids } }, data: { teacherId: owner } })
  }
  // Lo que queda a su nombre: las sueltas sin ganar (o sin clase que las conserve)
  // y, si alguna clase no tuviera propietario, las de sus misiones.
  await tx.badge.deleteMany({ where: { teacherId: userId } })
}
