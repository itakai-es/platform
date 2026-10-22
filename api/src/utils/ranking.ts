import { prisma } from '../config/database.js'

/**
 * Misiones completadas por estudiante en una clase, para los dos rankings (el
 * del alumnado y el del profesorado), que antes las contaban distinto. Cuenta la
 * misión cerrada de verdad: la que tiene `completedAt`, que es cuando se da el
 * bonus de la misión.
 */
export async function completedMissionsByStudent(classId: string) {
  const [total, rows] = await Promise.all([
    prisma.mission.count({ where: { classId } }),
    prisma.studentMissionProgress.groupBy({
      by: ['studentId'],
      where: { mission: { classId }, completedAt: { not: null } },
      _count: { _all: true },
    }),
  ])
  return { total, byStudent: new Map(rows.map(r => [r.studentId, r._count._all])) }
}
