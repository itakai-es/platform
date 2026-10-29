/**
 * El camino del mapa de misiones (E3) en el navegador, sin Vue: lo que pide cada
 * misión para abrirse, qué casillas se pueden marcar en «Para abrirla,
 * completar antes» y si un orden nuevo pone una misión delante de lo que pide.
 * La API comprueba lo mismo al guardar (api/src/utils/mission-path.ts); aquí es
 * para decirlo antes, junto a la casilla o al soltar la fila.
 */

/** Como mucho, cuántas misiones puede pedir una (lo mismo que en la API). */
export const MISSION_PREREQUISITE_LIMIT = 3

/** Una misión con lo que pide (ids). */
export interface PathMission {
  id: string
  title: string
  prerequisiteIds?: string[]
}

/** Una arista del camino: `missionId` pide `requiredMissionId`. */
export interface PathEdge {
  missionId: string
  requiredMissionId: string
}

/** Las aristas de unas misiones, solo entre ellas (un id que no está no cuenta). */
export function pathEdges(missions: PathMission[]): PathEdge[] {
  const known = new Set(missions.map(m => m.id))
  return missions.flatMap(m =>
    (m.prerequisiteIds ?? [])
      .filter(id => known.has(id) && id !== m.id)
      .map(requiredMissionId => ({ missionId: m.id, requiredMissionId }))
  )
}

/** Las misiones que necesitan `missionId`, directa o indirectamente. */
export function dependentsOf(edges: PathEdge[], missionId: string): Set<string> {
  const requiredBy = new Map<string, string[]>()
  for (const edge of edges) {
    const list = requiredBy.get(edge.requiredMissionId) ?? []
    list.push(edge.missionId)
    requiredBy.set(edge.requiredMissionId, list)
  }
  const found = new Set<string>()
  const pending = [missionId]
  while (pending.length > 0) {
    for (const next of requiredBy.get(pending.pop()!) ?? []) {
      if (found.has(next)) continue
      found.add(next)
      pending.push(next)
    }
  }
  return found
}

/** Una casilla de «Para abrirla, completar antes». */
export interface PrerequisiteChoice {
  id: string
  title: string
  checked: boolean
  /** No se puede marcar: cerraría un círculo (`cycle`) o ya hay tres (`limit`). */
  disabledReason: 'cycle' | 'limit' | null
}

/**
 * Las casillas del editor de una misión: las demás de su clase, en el orden de
 * `missions`. Una que ya necesita a esta (directa o indirectamente) no se puede
 * marcar, porque cerraría un círculo; con tres marcadas, las demás tampoco.
 */
export function prerequisiteChoices(
  missions: PathMission[],
  missionId: string,
  selected: string[],
  limit = MISSION_PREREQUISITE_LIMIT
): PrerequisiteChoice[] {
  // Lo que pide ahora esta misión se va a sustituir: no cuenta para los ciclos.
  const edges = pathEdges(missions).filter(edge => edge.missionId !== missionId)
  const dependents = dependentsOf(edges, missionId)
  const full = selected.length >= limit
  return missions
    .filter(m => m.id !== missionId)
    .map(m => {
      const checked = selected.includes(m.id)
      return {
        id: m.id,
        title: m.title,
        checked,
        disabledReason:
          dependents.has(m.id) && !checked ? 'cycle' : full && !checked ? 'limit' : null,
      }
    })
}

/** La primera misión de `order` que va delante de algo que pide, con lo que pide, o null. */
export function orderBreaksPath(
  order: string[],
  missions: PathMission[]
): { missionId: string; requiredMissionId: string } | null {
  const position = new Map(order.map((id, index) => [id, index]))
  for (const edge of pathEdges(missions)) {
    const mission = position.get(edge.missionId)
    const required = position.get(edge.requiredMissionId)
    if (mission === undefined || required === undefined) continue
    if (required > mission) return edge
  }
  return null
}

/**
 * Lo que hace «Encadenar en orden» con estas misiones (ya en su orden): cuántos
 * requisitos deja (cada una pide la anterior), cuántos hay ahora y si ya están
 * así (entonces no hay nada que hacer).
 */
export function chainSummary(missions: PathMission[]): {
  links: number
  current: number
  alreadyChained: boolean
} {
  const edges = pathEdges(missions)
  const links = Math.max(0, missions.length - 1)
  const alreadyChained =
    edges.length === links &&
    missions.every(
      (m, index) =>
        index === 0 ||
        ((m.prerequisiteIds ?? []).length === 1 &&
          m.prerequisiteIds![0] === missions[index - 1]!.id)
    )
  return { links, current: edges.length, alreadyChained }
}
