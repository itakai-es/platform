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
