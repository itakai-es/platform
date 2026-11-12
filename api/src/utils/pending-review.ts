import { prisma } from '../config/database.js'
import type { Prisma } from '../generated/prisma/client.js'

/**
 * Entregas que esperan revisión de verdad: las pendientes de un enigma que esa
 * persona aún no tiene aprobado.
 *
 * Una entrega pendiente de un enigma ya aprobado (se colaba por la API o con un
 * doble clic antes de que se rechazara al entregar) no se puede aprobar ni
 * cerrar: se queda «atascada». No cuenta como pendiente de revisar en ninguna
 * parte, pero no se borra: es del estudiante.
 */

type Db = Prisma.TransactionClient

interface PendingRef {
  studentId: string
  enigmaId: string
}

const pairKey = (studentId: string, enigmaId: string) => `${studentId}:${enigmaId}`

/** De `pending`, las que no son de un enigma que esa persona ya tiene aprobado. */
export async function awaitingReview<T extends PendingRef>(
  pending: readonly T[],
  db: Db = prisma
): Promise<T[]> {
  if (pending.length === 0) return []
  const approved = await db.studentEnigmaProgress.findMany({
    where: {
      studentId: { in: [...new Set(pending.map(p => p.studentId))] },
      enigmaId: { in: [...new Set(pending.map(p => p.enigmaId))] },
    },
    select: { studentId: true, enigmaId: true },
  })
  const done = new Set(approved.map(a => pairKey(a.studentId, a.enigmaId)))
  return pending.filter(p => !done.has(pairKey(p.studentId, p.enigmaId)))
}

/** Cuántas entregas de `where` esperan revisión (pendientes y de un enigma sin aprobar). */
export async function countAwaitingReview(
  where: Prisma.EnigmaSubmissionWhereInput = {},
  db: Db = prisma
): Promise<number> {
  const pending = await db.enigmaSubmission.findMany({
    where: { AND: [where, { status: 'pendiente' }] },
    select: { studentId: true, enigmaId: true },
  })
  return (await awaitingReview(pending, db)).length
}

/**
 * Cuántas entregas esperan revisión en las clases de `classes`: las de su
 * alumnado de ahora, sin la vista previa del profesorado ni quien entregó en
 * otra clase (la misión se movió, o ya no está en esta). Es la cifra de «por
 * revisar» de una clase; `countAwaitingReview` cuenta las de cualquiera.
 */
export async function countClassesAwaitingReview(
  classes: Prisma.ClassWhereInput,
  db: Db = prisma
): Promise<number> {
  const [pending, enrollments] = await Promise.all([
    db.enigmaSubmission.findMany({
      where: { status: 'pendiente', enigma: { mission: { class: classes } } },
      select: {
        studentId: true,
        enigmaId: true,
        enigma: { select: { mission: { select: { classId: true } } } },
      },
    }),
    db.classEnrollment.findMany({
      where: { isPreview: false, class: classes },
      select: { classId: true, studentId: true },
    }),
  ])
  const inClass = new Set(enrollments.map(e => `${e.classId}:${e.studentId}`))
  const own = pending.filter(p => inClass.has(`${p.enigma.mission.classId}:${p.studentId}`))
  return (await awaitingReview(own, db)).length
}
