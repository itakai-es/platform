/**
 * Lo que dibuja el mapa de misiones (E3, en pruebas), sin Vue: el estado de
 * cada nodo para quien lo mira, el carril de cada uno en el zigzag y el trazo
 * del camino entre dos nodos. Lo usa MissionMap.vue; vive aquí para poder
 * probarlo sin navegador.
 *
 * El camino es lineal: los nodos van en el orden de la clase (el de la
 * progresión) y cada uno se une con el siguiente. Las posiciones no se guardan:
 * salen del orden.
 */
import { teacherMissionStatus } from './mission-teacher-status'

/** Estado de un nodo, con su icono y su texto (nunca solo el color). */
export type MapNodeState =
  | 'completed'
  | 'in_progress'
  | 'available'
  | 'urgent'
  | 'expired'
  | 'locked'

/**
 * El de una misión para el alumnado, a partir del estado que da la API
 * (getMissionStatus: completada > bloqueada > expirada > urgente > activa) y
 * de su progreso.
 */
export function studentNodeState(mission: { status: string; progress?: number }): MapNodeState {
  switch (mission.status) {
    case 'completada':
      return 'completed'
    case 'bloqueada':
      return 'locked'
    case 'expirada':
      return 'expired'
    case 'urgente':
      return 'urgent'
    default:
      return (mission.progress ?? 0) > 0 ? 'in_progress' : 'available'
  }
}

/**
 * El de una misión para el profesorado: el mismo que en el filtro de estado
 * (completada es que la ha completado todo el alumnado).
 */
export function teacherNodeState(
  mission: Parameters<typeof teacherMissionStatus>[0],
  now = Date.now()
): MapNodeState {
  switch (teacherMissionStatus(mission, now)) {
    case 'completada':
      return 'completed'
    case 'bloqueada':
      return 'locked'
    case 'expirada':
      return 'expired'
    case 'urgente':
      return 'urgent'
    default:
      return 'available'
  }
}

/** Carril de un nodo desde `sm`: alternan, empezando por la izquierda. */
export function mapLane(index: number): 'left' | 'right' {
  return index % 2 === 0 ? 'left' : 'right'
}

export interface MapPoint {
  x: number
  y: number
}

/**
 * Trazo SVG de un nodo al siguiente, de centro a centro: una curva en S que
 * sale y llega en vertical. Su x no se sale nunca de entre las de los dos
 * nodos, así que no pisa los textos, que van por fuera. Con los dos nodos en la
 * misma columna (móvil) es una recta.
 */
export function pathBetween(from: MapPoint, to: MapPoint): string {
  const r = (n: number) => Math.round(n * 10) / 10
  if (Math.abs(from.x - to.x) < 0.5) return `M ${r(from.x)} ${r(from.y)} L ${r(to.x)} ${r(to.y)}`
  const mid = (to.y - from.y) / 2
  return [
    `M ${r(from.x)} ${r(from.y)}`,
    `C ${r(from.x)} ${r(from.y + mid)} ${r(to.x)} ${r(to.y - mid)} ${r(to.x)} ${r(to.y)}`,
  ].join(' ')
}

/** El tramo que sale de un nodo va hecho si ese nodo está completado. */
export function segmentDone(from: MapNodeState): boolean {
  return from === 'completed'
}
