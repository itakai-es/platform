/**
 * La disposición del mapa de misiones (E3), sin Vue: de las misiones de una
 * clase (en su orden) saca las capas, los nodos con su estado y lo que los
 * abre, las líneas entre ellos y lo que está unido a cada uno. Lo pinta
 * MissionMap.vue (dónde va cada cosa, en utils/mission-map-geometry.ts); vive
 * aquí para poder probarlo sin navegador.
 *
 * - Con requisitos (el camino del mapa), la capa de cada misión es la longitud
 *   del camino más largo desde una que no pide nada; dentro de cada capa, el
 *   orden de la clase. Hay una línea por requisito, de lo que se pide a quien
 *   lo pide.
 * - Sin requisitos, el camino es el orden de la clase: cada misión en su capa y
 *   una línea de cada una a la siguiente.
 *
 * El recorrido de los nodos (`nodes`, `step`) es capa a capa y, dentro, en el
 * orden de la clase: es el de la lista, el del tabulador y la columna del
 * móvil. Como el orden de la clase nunca pone una misión delante de lo que
 * pide, ese recorrido también lo cumple.
 */
import { studentNodeState, teacherNodeState, type MapNodeState } from './mission-map'
import { pathEdges } from './mission-path'

/** Lo que el mapa necesita de cada misión (tal como llega de la API). */
export interface MapMissionInput {
  id: string
  title: string
  status: string
  deadline?: string | null
  /** Alumnado: su % en la misión. */
  progress?: number
  /** Profesorado: cuántas personas la han completado, de cuántas. */
  completedCount?: number
  totalStudents?: number
  /** Lo que pide para abrirse (ids de misiones de la clase). */
  prerequisiteIds?: string[]
  /** Alumnado: por qué está cerrada (su docente o el camino). */
  lockReason?: 'teacher' | 'path' | null
  /** Alumnado: lo que le falta completar, si está cerrada por el camino. */
  requires?: { id: string; title: string }[]
}

/** Un nodo del mapa, listo para pintar. */
export interface MapLayoutNode {
  id: string
  /** Posición en el recorrido del mapa (desde 1). */
  step: number
  state: MapNodeState
  /** Por qué está cerrada: su docente (`teacher`) o el camino (`path`); null si no. */
  lockReason: 'teacher' | 'path' | null
  /**
   * Lo que la abre, en el orden de la clase: al alumnado, lo que le falta (solo
   * si la tiene cerrada por el camino); al profesorado, todo lo que pide.
   */
  opensAfter: { id: string; title: string }[]
  /** Lo que pide (ids), dentro del mapa. */
  prerequisiteIds: string[]
}

/**
 * Una línea del mapa, de `from` a `to`: con requisitos, `to` pide `from`; sin
 * ellos, `to` es la siguiente en el orden de la clase. Si va hecha lo dice la
 * geometría (utils/mission-map-geometry.ts), que lo cuenta igual para la
 * salida y la meta.
 */
export interface MapLayoutEdge {
  key: string
  from: string
  to: string
}

export interface MissionMapLayout {
  /** Los nodos en el orden del recorrido. */
  nodes: MapLayoutNode[]
  /** Los ids de cada capa (la longitud del camino más largo desde una que no pide nada), en orden. */
  layers: string[][]
  edges: MapLayoutEdge[]
  /** Hay requisitos entre las misiones (si no, el camino es el orden de la clase). */
  branched: boolean
}

/**
 * La capa de cada misión: 0 si no pide nada; si no, una más que la más alta de
 * lo que pide. Con un ciclo (la API no los deja guardar), lo que queda va a la
 * capa siguiente a la última.
 */
function layersOf(ids: string[], needs: Map<string, string[]>): Map<string, number> {
  const layer = new Map<string, number>()
  let pending = [...ids]
  while (pending.length > 0) {
    const next = pending.filter(id => (needs.get(id) ?? []).every(r => layer.has(r)))
    if (next.length === 0) {
      const last = Math.max(-1, ...layer.values())
      for (const id of pending) layer.set(id, last + 1)
      break
    }
    for (const id of next) {
      const required = needs.get(id) ?? []
      layer.set(id, required.length === 0 ? 0 : Math.max(...required.map(r => layer.get(r)!)) + 1)
    }
    pending = pending.filter(id => !layer.has(id))
  }
  return layer
}

/**
 * El mapa de unas misiones (en el orden de la clase) para quien lo mira. `now`
 * cuenta para el estado del profesorado (urgente, expirada).
 */
export function layoutMissionMap(
  missions: MapMissionInput[],
  mode: 'student' | 'teacher',
  now = Date.now()
): MissionMapLayout {
  const byId = new Map(missions.map(m => [m.id, m]))
  const edges = pathEdges(missions)
  const needs = new Map<string, string[]>()
  for (const edge of edges) {
    const list = needs.get(edge.missionId) ?? []
    list.push(edge.requiredMissionId)
    needs.set(edge.missionId, list)
  }
  const branched = edges.length > 0
  const ids = missions.map(m => m.id)
  const classIndex = new Map(ids.map((id, index) => [id, index]))

  // Sin requisitos, cada misión es su propia capa, en el orden de la clase.
  const layerOf = branched ? layersOf(ids, needs) : new Map(ids.map((id, index) => [id, index]))
  const layers: string[][] = []
  for (const id of ids) {
    const index = layerOf.get(id)!
    ;(layers[index] ??= []).push(id)
  }
  const compact = layers.filter(layer => layer && layer.length > 0)

  const stateOf = (m: MapMissionInput) =>
    mode === 'teacher'
      ? teacherNodeState(
          {
            status: m.status,
            deadline: m.deadline ?? null,
            completedCount: m.completedCount ?? 0,
            totalStudents: m.totalStudents ?? 0,
          },
          now
        )
      : studentNodeState(m)

  const byClassOrder = (a: string, b: string) => classIndex.get(a)! - classIndex.get(b)!
  const nodes: MapLayoutNode[] = []
  for (const layerIds of compact) {
    for (const id of layerIds) {
      const m = byId.get(id)!
      const prerequisiteIds = [...(needs.get(id) ?? [])].sort(byClassOrder)
      const lockReason =
        mode === 'teacher' ? null : (m.lockReason ?? (m.status === 'bloqueada' ? 'teacher' : null))
      const opensAfter =
        mode === 'teacher'
          ? prerequisiteIds.map(r => ({ id: r, title: byId.get(r)!.title }))
          : lockReason === 'path'
            ? [...(m.requires ?? [])]
            : []
      nodes.push({
        id,
        step: nodes.length + 1,
        state: stateOf(m),
        lockReason,
        opensAfter,
        prerequisiteIds,
      })
    }
  }

  const line = (from: string, to: string): MapLayoutEdge => ({ key: `${from}>${to}`, from, to })
  const lines = branched
    ? edges
        .map(edge => line(edge.requiredMissionId, edge.missionId))
        .sort((a, b) => byClassOrder(a.to, b.to) || byClassOrder(a.from, b.from))
    : ids.slice(1).map((to, index) => line(ids[index]!, to))

  return { nodes, layers: compact, edges: lines, branched }
}

/**
 * Lo que está unido a una misión en el mapa: lo que pide (`requires`) y lo que
 * abre ella (`unlocks`), en el orden de las líneas. Sin requisitos, la
 * anterior y la siguiente del camino. Para resaltarlo al pasar por encima.
 */
export function mapNeighbors(
  layout: MissionMapLayout,
  id: string
): { requires: string[]; unlocks: string[] } {
  return {
    requires: layout.edges.filter(e => e.to === id).map(e => e.from),
    unlocks: layout.edges.filter(e => e.from === id).map(e => e.to),
  }
}
