/**
 * Quién hizo lo que cuenta una entrada del feed, cuando no es el propio alumno:
 * el profesor que aprobó su entrega o le aplicó un comportamiento. El profesorado
 * aún no tiene avatar propio, así que va vacío. Lo usan el feed del alumnado y
 * los del profesorado, para que los dos digan «Por …».
 */
export function activityActor(activity: { actorId: string | null; actorName: string | null }) {
  if (!activity.actorName) return null
  return { id: activity.actorId, name: activity.actorName, avatar: null }
}
