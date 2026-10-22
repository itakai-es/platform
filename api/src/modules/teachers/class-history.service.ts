import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
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
  'reward',
  'attendance',
  'team',
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
    // De un lote solo sale su primera línea; el resto viene dentro de ella.
    ...NOT_BATCH_MEMBER,
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

  // Lotes de la página: a quién más se aplicó cada uno.
  const batches = await batchTargets(classId, rows)

  // Alumnos sobre los que recae alguna entrada y que siguen en la clase.
  const studentIds = [
    ...new Set(
      [...rows.map(r => r.targetUser), ...[...batches.values()].flat()]
        .filter(u => u?.role === 'student')
        .map(u => u!.id)
    ),
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
      batch: batchOf(row, batches, enrolled),
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
 * Fuera las líneas de un lote (aplicar a varios estudiantes a la vez) que no
 * son la primera. Se filtran con la clave en el JSON; las filas sin ella (casi
 * todas) tienen que seguir saliendo, y en SQL `NOT (nulo = true)` es nulo: de
 * ahí el `OR` con la clave o la columna vacías.
 */
const NOT_BATCH_MEMBER: Prisma.ClassActionLogWhereInput = {
  OR: [
    { metadata: { equals: Prisma.AnyNull } },
    { metadata: { path: ['batchMember'], equals: Prisma.AnyNull } },
    { NOT: { metadata: { path: ['batchMember'], equals: true } } },
  ],
}

type HistoryRow = {
  id: string
  action: string
  metadata: Prisma.JsonValue
  targetUser: TargetUser | null
}

/**
 * El lote de una entrada: de dos personas o más. El reparto de un premio de
 * equipo cuenta aunque sea a una sola, porque sus líneas nunca salen sueltas
 * (van todas dentro de la del premio).
 */
function batchIdOf(row: { action: string; metadata: Prisma.JsonValue }): string | null {
  const meta = row.metadata as { batchId?: unknown; batchSize?: unknown } | null
  const min = row.action === 'team.awarded' ? 1 : 2
  return meta && typeof meta.batchId === 'string' && Number(meta.batchSize) >= min
    ? meta.batchId
    : null
}

/** Para cada lote de la página, las personas a las que se aplicó, en orden. */
async function batchTargets(classId: string, rows: HistoryRow[]) {
  const ids = [...new Set(rows.map(batchIdOf).filter((id): id is string => id !== null))]
  const targets = new Map<string, TargetUser[]>()
  if (ids.length === 0) return targets
  const members = await prisma.classActionLog.findMany({
    where: {
      classId,
      OR: ids.map(id => ({ metadata: { path: ['batchId'], equals: id } })),
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { metadata: true, targetUser: { select: { id: true, name: true, role: true } } },
  })
  for (const m of members) {
    const id = (m.metadata as { batchId?: string } | null)?.batchId
    if (!id || !m.targetUser) continue
    targets.set(id, [...(targets.get(id) ?? []), m.targetUser])
  }
  return targets
}

/** El lote de una entrada, si lo es: cuántas personas y quiénes (sin nombre quien ya no está). */
function batchOf(row: HistoryRow, batches: Map<string, TargetUser[]>, enrolled: Set<string>) {
  const id = batchIdOf(row)
  if (!id) return null
  const people = batches.get(id) ?? []
  return {
    size: Number((row.metadata as { batchSize?: unknown }).batchSize),
    targets: people.map(p => resolveTarget(p, enrolled)),
  }
}

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
