import { prisma } from '../../config/database.js'
import { registerJob, type JobContext } from '../../utils/scheduler.js'
import { CLASS_TRASH_DAYS } from './class-trash.service.js'
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
}
