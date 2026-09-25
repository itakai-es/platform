import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { assertClassAccess, type ClassUser } from '../../utils/class-access.js'

/**
 * Historial de una clase: lo que ha hecho su profesorado, del registro de
 * acciones. Lo ve todo el profesorado de la clase.
 *
 * Cada entrada sale con su clave (`submission.approved`…) y sus datos sueltos,
 * para que la pantalla la componga con sus textos traducidos: aquí no se
 * escribe ninguna frase ni se devuelve HTML. La persona sobre la que recae se
 * resuelve al leer, desde su cuenta; el registro no guarda su nombre. De un
 * alumno solo se da mientras siga en la clase: de quien ya no está, el
 * profesorado de ahora no tiene por qué saber el nombre.
 */

/** Tipos por los que se filtra: la primera parte de la clave de la acción. */
export const CLASS_HISTORY_TYPES = [
  'class',
  'teacher',
  'student',
  'mission',
  'enigma',
  'document',
  'submission',
  'behavior',
  'shop',
] as const

export type ClassHistoryType = (typeof CLASS_HISTORY_TYPES)[number]

export interface ClassHistoryQuery {
  page?: number
  limit?: number
  /** Solo lo que hizo este profesor. */
  actorId?: string
  type?: ClassHistoryType
}

export const CLASS_HISTORY_MAX_LIMIT = 50

export async function getClassHistory(actor: ClassUser, classId: string, query: ClassHistoryQuery) {
  await assertClassAccess(classId, actor.id, 'class.history')

  const limit = Math.min(Math.max(query.limit ?? 20, 1), CLASS_HISTORY_MAX_LIMIT)
  const page = Math.max(query.page ?? 1, 1)
  const where: Prisma.ClassActionLogWhereInput = {
    classId,
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.type ? { action: { startsWith: `${query.type}.` } } : {}),
  }

  const [rows, total, actors] = await Promise.all([
    prisma.classActionLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actorId: true,
        actorName: true,
        actorAvatar: true,
        targetUser: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.classActionLog.count({ where }),
    // Para el filtro: quien ha hecho algo en la clase, aunque ya no esté en ella.
    // Agrupado en la base: una fila por profesor y nombre usado, no una por acción.
    prisma.classActionLog.groupBy({
      by: ['actorId', 'actorName'],
      where: { classId, actorId: { not: null } },
      _max: { createdAt: true },
    }),
  ])

  // Alumnos sobre los que recae alguna entrada y que siguen en la clase.
  const studentIds = [
    ...new Set(rows.filter(r => r.targetUser?.role === 'student').map(r => r.targetUser!.id)),
  ]
  const enrolled = new Set(
    studentIds.length === 0
      ? []
      : (
          await prisma.classEnrollment.findMany({
            where: { classId, isPreview: false, studentId: { in: studentIds } },
            select: { studentId: true },
          })
        ).map(e => e.studentId)
  )

  return {
    entries: rows.map(row => ({
      id: row.id,
      action: row.action,
      type: row.action.split('.')[0],
      createdAt: row.createdAt,
      actor: { id: row.actorId, name: row.actorName, avatar: row.actorAvatar },
      target: resolveTarget(row.targetUser, enrolled),
      entity: row.entityType ? { type: row.entityType, id: row.entityId } : null,
      params: row.metadata ?? {},
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    filters: {
      actors: latestActorNames(actors).sort((a, b) => a.name.localeCompare(b.name)),
      types: CLASS_HISTORY_TYPES,
    },
  }
}

type TargetUser = { id: string; name: string; role: string | null }

/**
 * La persona sobre la que recae la entrada. Un alumno que ya no está en la clase
 * sale sin id ni nombre, solo con su papel: la pantalla lo nombra en genérico.
 */
function resolveTarget(
  user: TargetUser | null,
  enrolled: Set<string>
): { id: string | null; name: string | null; role: string | null } | null {
  if (!user) return null
  if (user.role === 'student' && !enrolled.has(user.id)) {
    return { id: null, name: null, role: 'student' }
  }
  return { id: user.id, name: user.name, role: user.role }
}

/** Un profesor por fila, con el último nombre con el que figura en el registro. */
function latestActorNames(
  groups: { actorId: string | null; actorName: string; _max: { createdAt: Date | null } }[]
) {
  const latest = new Map<string, { name: string; at: number }>()
  for (const group of groups) {
    if (!group.actorId) continue
    const at = group._max.createdAt?.getTime() ?? 0
    const current = latest.get(group.actorId)
    if (!current || at > current.at) latest.set(group.actorId, { name: group.actorName, at })
  }
  return [...latest].map(([id, { name }]) => ({ id, name }))
}
