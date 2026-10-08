import { prisma } from '../../config/database.js'
import { activeTeacherWhere } from '../../utils/class-access.js'
import { registerJob, type JobContext } from '../../utils/scheduler.js'
import { localizedDate } from '../notifications/notifications.messages.js'
import { notifyMany } from '../notifications/notifications.service.js'
import { CLASS_TRASH_DAYS, trashPurgeAt } from './class-trash.service.js'
import { purgeTrashedClass } from './class-purge.service.js'

/**
 * Tarea de la papelera de clases: borra para siempre las que llevan en ella más
 * de `CLASS_TRASH_DAYS` días, una a una y cada una en su transacción (ver
 * `purgeTrashedClass`). Idempotente: lo que ya no está no se vuelve a buscar, y
 * lo que se restaura entre la búsqueda y la purga se salta, porque la purga lo
 * comprueba otra vez con la clase bloqueada.
 */

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Clases por pasada, como mucho: si hay más, la siguiente pasada sigue. */
const PURGE_BATCH = 20

/**
 * Cuántos días antes de la purga se avisa a quien tiene la propiedad. Tres: los
 * mismos a partir de los cuales la papelera destaca la cuenta atrás, y dan para
 * un fin de semana de por medio sin que el aviso llegue tarde.
 */
export const CLASS_TRASH_WARNING_DAYS = 3

/** Avisos por pasada, como mucho: si hay más, la siguiente pasada sigue. */
const WARNING_BATCH = 50

/**
 * Aviso de cortesía: a quien tiene la propiedad de cada clase que lleva en la
 * papelera lo bastante para que se borre en los próximos
 * `CLASS_TRASH_WARNING_DAYS` días, una notificación (y su correo, si los
 * recibe) que lleva a la papelera. Las que ya tocaba purgar no se avisan: se
 * van en la pasada de la purga.
 *
 * Una sola vez por envío a la papelera: la clase se marca con
 * `trashWarnedAt` antes de avisar, y solo si sigue en la papelera desde la
 * misma fecha, así que dos pasadas a la vez, o un restaurar en medio, no avisan
 * dos veces. Borrar la notificación no la hace volver. Restaurar la clase o
 * volver a enviarla deja la marca otra vez en null: el siguiente envío se
 * vuelve a avisar.
 *
 * Solo se avisa a quien tiene la propiedad con la cuenta activa: es quien puede
 * restaurarla. Una clase sin nadie así (la cuenta propietaria está suspendida o
 * desactivada) no se marca ni se avisa, y la administración la ve en su
 * papelera como «sin acceso»; si la cuenta vuelve a estar activa a tiempo, se
 * avisa entonces. Así `trashWarnedAt` quiere decir siempre que hubo aviso.
 *
 * Si la clase sale de la papelera mientras se avisa (restaurar entre la marca
 * y el aviso), el aviso recién creado se quita después: ver `withdrawIfRestored`.
 */
/** Cuentas que pueden actuar: las mismas que la papelera de administración cuenta como «con acceso». */
const ACTIVE_ACCOUNT = { status: 'active' } as const

/** Quien tiene la propiedad de la clase con la cuenta activa: a quién se avisa. */
async function activeOwners(classId: string, now: Date) {
  const rows = await prisma.classTeacher.findMany({
    where: { classId, ...activeTeacherWhere('owner', now), user: ACTIVE_ACCOUNT },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(row => row.userId)
}

/** Quita la marca de esta pasada, para que la siguiente lo vuelva a mirar. */
function unmark(classId: string, now: Date) {
  return prisma.class.updateMany({
    where: { id: classId, trashWarnedAt: now },
    data: { trashWarnedAt: null },
  })
}

/**
 * Si la clase ha salido de la papelera (o ha vuelto a entrar, con otra fecha)
 * mientras se avisaba, quita el aviso que acaba de crearse: ya no es verdad, y
 * su clave impediría avisar del siguiente envío. Restaurar también los quita,
 * pero si lo hizo antes de que existieran no los vio. Con la fila bloqueada,
 * un restaurar a medias termina antes de mirarla. El correo, si ya salió, no
 * tiene vuelta; la ventana es de milisegundos. Devuelve si lo ha quitado.
 */
async function withdrawIfRestored(classId: string, deletedAt: Date, now: Date) {
  return prisma.$transaction(async tx => {
    const [row] = await tx.$queryRaw<{ deleted_at: Date | null; trash_warned_at: Date | null }[]>`
      SELECT deleted_at, trash_warned_at FROM classes WHERE id = ${classId} FOR UPDATE
    `
    const stillWarned =
      row?.deleted_at?.getTime() === deletedAt.getTime() &&
      row?.trash_warned_at?.getTime() === now.getTime()
    if (stillWarned) return false
    await tx.notification.deleteMany({
      where: { type: 'class_purge_soon', metadata: { path: ['classId'], equals: classId } },
    })
    return true
  })
}

export async function runClassTrashWarnings({ now }: JobContext) {
  const warnFrom = new Date(now.getTime() - (CLASS_TRASH_DAYS - CLASS_TRASH_WARNING_DAYS) * DAY)
  const purgeCutoff = new Date(now.getTime() - CLASS_TRASH_DAYS * DAY)
  const due = await prisma.class.findMany({
    where: {
      deletedAt: { lte: warnFrom, gte: purgeCutoff },
      trashWarnedAt: null,
      teachers: { some: { ...activeTeacherWhere('owner', now), user: ACTIVE_ACCOUNT } },
    },
    select: { id: true, name: true, deletedAt: true },
    orderBy: { deletedAt: 'asc' },
    take: WARNING_BATCH,
  })

  let warned = 0
  let created = 0
  let failed = 0
  for (const cls of due) {
    const deletedAt = cls.deletedAt!
    const { count } = await prisma.class.updateMany({
      where: { id: cls.id, deletedAt, trashWarnedAt: null },
      data: { trashWarnedAt: now },
    })
    if (count === 0) continue
    try {
      const purgeAt = trashPurgeAt(deletedAt)
      const owners = await activeOwners(cls.id, now)
      if (owners.length === 0) {
        // Su cuenta dejó de estar activa entre la búsqueda y aquí: sin aviso, sin marca.
        await unmark(cls.id, now)
        continue
      }
      created += await notifyMany(
        owners.map(userId => ({
          userId,
          type: 'class_purge_soon' as const,
          copy: 'class_purge_soon' as const,
          params: { class: cls.name, date: localizedDate(purgeAt) },
          priority: 'high' as const,
          actionUrl: '/profesor/clases/papelera',
          metadata: { classId: cls.id },
          dedupeKey: `class-trash:${cls.id}`,
          alsoByEmail: true,
          emailAction: 'open_trash' as const,
          // Después ya no hay nada que hacer (y la purga se lo lleva igual).
          expiresAt: purgeAt,
        }))
      )
      if (await withdrawIfRestored(cls.id, deletedAt, now)) continue
      warned++
    } catch (error) {
      // Sin la marca, la siguiente pasada lo vuelve a intentar.
      failed++
      await unmark(cls.id, now).catch(() => {})
      console.error(
        `[class-trash] no se pudo avisar de la purga de la clase ${cls.id}:`,
        error instanceof Error ? error.message : error
      )
    }
  }
  return { warned, created, failed }
}

export async function runClassTrashPurge({ now }: JobContext) {
  const cutoff = new Date(now.getTime() - CLASS_TRASH_DAYS * DAY)
  const due = await prisma.class.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
    orderBy: { deletedAt: 'asc' },
    take: PURGE_BATCH,
  })

  let purged = 0
  let filesFailed = 0
  let failed = 0
  for (const { id } of due) {
    try {
      const outcome = await purgeTrashedClass(id, {
        reason: 'expired',
        olderThan: cutoff,
      })
      if (!outcome) continue
      purged++
      filesFailed += outcome.filesFailed
    } catch (error) {
      // Una clase que falla no frena a las demás; se reintenta en la siguiente pasada.
      failed++
      console.error(
        `[class-trash] no se pudo purgar la clase ${id}:`,
        error instanceof Error ? error.message : error
      )
    }
  }
  return { purged, filesFailed, failed }
}

export function registerClassTrashJobs() {
  registerJob({
    name: 'class-trash-purge',
    everyMs: HOUR,
    // Sin prisa al arrancar: una clase que vence se puede borrar un rato después.
    firstRunDelayMs: 10 * MINUTE,
    run: runClassTrashPurge,
  })

  registerJob({
    name: 'class-trash-warning',
    everyMs: HOUR,
    firstRunDelayMs: 5 * MINUTE,
    run: runClassTrashWarnings,
  })
}
