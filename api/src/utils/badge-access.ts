import type { Prisma } from '../generated/prisma/client.js'
import { CLASS_ACTION_LEVEL, accessibleClassesWhere } from './class-access.js'

/**
 * Insignias que un profesor puede usar, cambiar y borrar. Las sueltas son
 * personales: solo las de quien las creó. Una vinculada a una misión es
 * contenido de su clase: la usa quien puede editar esa misión, también su
 * autor, que la pierde si deja de poder editarla. Las del sistema (sin autor)
 * no entran: se ven, pero no se tocan.
 */
export function manageableBadgesWhere(userId: string): Prisma.BadgeWhereInput {
  return {
    OR: [
      { teacherId: userId, missionId: null },
      {
        teacherId: { not: null },
        mission: { class: accessibleClassesWhere(userId, CLASS_ACTION_LEVEL['mission.edit']) },
      },
    ],
  }
}

/**
 * Insignias que se pueden vincular a una misión de la clase `classId`. Además de
 * poder usarlas, tienen que ser sueltas o ser ya de esa clase: vincularla a otra
 * misión la quita de la suya, y una insignia no se saca de su clase. Su autor sí
 * puede llevarse la suya a otra clase donde también edita.
 */
export function assignableBadgesWhere(userId: string, classId: string): Prisma.BadgeWhereInput {
  return {
    AND: [
      manageableBadgesWhere(userId),
      { OR: [{ missionId: null }, { mission: { classId } }, { teacherId: userId }] },
    ],
  }
}
