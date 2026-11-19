import type { Prisma } from '../generated/prisma/client.js'

/**
 * Quién hizo lo que cuenta una entrada del feed, cuando no es el propio alumno:
 * el docente que aprobó su entrega o le aplicó un comportamiento, con la clave
 * de su avatar actual (para eso las consultas incluyen `ACTIVITY_ACTOR_INCLUDE`).
 * Lo usan el feed del alumnado y los del profesorado, para que los dos digan
 * «Por …» con su avatar.
 */
export function activityActor(activity: {
  actorId: string | null
  actorName: string | null
  // Obligatorio: una consulta que olvide `ACTIVITY_ACTOR_INCLUDE` no compila, en
  // vez de dar el avatar en blanco sin avisar.
  actor: { avatar: string | null } | null
}) {
  if (!activity.actorName) return null
  return { id: activity.actorId, name: activity.actorName, avatar: activity.actor?.avatar ?? null }
}

/** Lo que una consulta de actividad necesita de la cuenta del docente para `activityActor`. */
export const ACTIVITY_ACTOR_INCLUDE = { actor: { select: { avatar: true } } } as const

// ---- Muros ----

/** Lo más que da un muro de una vez. */
export const WALL_MAX_LIMIT = 50

/**
 * `limit` de un muro, tal como llega en la query: un entero entre 1 y
 * `WALL_MAX_LIMIT`. Lo que no es un número (o no llega) es `fallback`.
 */
export function wallLimit(raw: string | undefined, fallback: number): number {
  const n = raw === undefined || raw.trim() === '' ? NaN : Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(WALL_MAX_LIMIT, Math.max(1, Math.trunc(n)))
}

/** Lo más lejos que se puede ir en un muro: mucho más de lo que tiene nadie. */
export const WALL_MAX_OFFSET = 100_000

/**
 * `offset` de un muro: un entero entre 0 y `WALL_MAX_OFFSET` (sin tope, un valor
 * enorme no cabe en la consulta y hace fallar a la base); lo que no es un número, 0.
 */
export function wallOffset(raw: string | undefined): number {
  const n = raw === undefined || raw.trim() === '' ? NaN : Number(raw)
  return Number.isFinite(n) ? Math.min(WALL_MAX_OFFSET, Math.max(0, Math.trunc(n))) : 0
}

/**
 * Lo que no sale en ningún muro ni en la ficha: las entradas `xp_gained` sin
 * clase. Eran el aviso de seguridad de una sesión comprometida, que se apuntaba
 * aquí; ahora va al registro del sistema (categoría `security`) y las filas
 * viejas se quedan fuera. Se combina con el resto del filtro con AND.
 */
export const WALL_ACTIVITY_WHERE = {
  NOT: { type: 'xp_gained', classId: null },
} satisfies Prisma.ActivityWhereInput
