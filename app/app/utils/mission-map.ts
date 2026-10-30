/**
 * Lo que cuenta el mapa de misiones (E3, en pruebas), sin Vue: el estado de
 * cada nodo para quien lo mira, lo recorrido, dónde está el alumnado («Estás
 * aquí») y, para el profesorado, el anillo de cada medallón, cómo va la clase y
 * los avatares de quien ha completado cada misión. Lo usa MissionMap.vue; vive
 * aquí para poder probarlo sin navegador. La disposición está en
 * utils/mission-map-layout.ts y las posiciones, en utils/mission-map-geometry.ts.
 */
import type { MissionRarity } from '~/types/mission.types'
import { teacherMissionStatus } from './mission-teacher-status'

/** Estado de un nodo, con su icono y su texto (nunca solo el color). */
export type MapNodeState =
  | 'completed'
  | 'in_progress'
  | 'available'
  | 'urgent'
  | 'expired'
  | 'locked'

/** Una misión de la que se habla en el mapa («Para abrirla, completa antes…»). */
export interface MapMissionRef {
  id: string
  title: string
}

/** Profesorado: una persona de la clase que ha completado una misión, con su avatar. */
export interface MapPerson {
  id: string
  name: string
  avatar: string | null
  /** De dónde sale el color del avatar: `studentAvatarSeed(clase, estudiante)`. */
  seed: string
}

/** Lo que pintan el mapa y el detalle de cada misión, ya con sus textos. */
export interface MissionMapItem {
  id: string
  /** Posición en el recorrido (desde 1). */
  step: number
  title: string
  rarity: MissionRarity
  cover: string | null
  state: MapNodeState
  /** El estado en pocas palabras, como en la leyenda («En curso», «Activa»). */
  stateLabel: string
  /** El estado entero, para el lector de pantalla («En curso: 40 %»). */
  stateText: string
  /** Adónde lleva el botón principal; null si no se puede entrar. */
  href: string | null
  /** «Empezar», «Continuar», «Ver misión» o «Abrir misión». */
  actionLabel: string | null
  /** Alumnado, cerrada por su docente: por qué no se puede entrar. */
  lockedNote: string | null
  /** Lo que la abre: al alumnado, lo que le falta; al profesorado, todo lo que pide. */
  requires: MapMissionRef[]
  /** Lo que abre ella, si el mapa tiene requisitos. */
  unlocks: MapMissionRef[]
  rewards: { xp: number; coins: number; mana: number }
  enigmas: number
  /** Alumnado: su avance (null si está cerrada). */
  progress: { percent: number; done: number; total: number } | null
  /**
   * Profesorado: cuántas personas la han completado, de cuántas, y en texto;
   * quiénes (primero quien antes) y cuántas la llevan en curso.
   */
  completed: {
    done: number
    total: number
    text: string
    people: MapPerson[]
    inProgress: number
  } | null
  /** La fecha límite, ya escrita en el idioma de la app. */
  deadline: string | null
}

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

/** Lo recorrido: cuántas misiones están completadas, de cuántas, y en %. */
export function mapProgress(states: MapNodeState[]): {
  done: number
  total: number
  percent: number
} {
  const total = states.length
  const done = states.filter(state => state === 'completed').length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/**
 * «Estás aquí»: la misión en la que va el alumnado, en el orden del recorrido.
 * La primera en curso; si no hay, la primera urgente o disponible. null si no
 * queda ninguna abierta (todo completado, expirado o cerrado).
 */
export function currentNodeId(nodes: { id: string; state: MapNodeState }[]): string | null {
  const first = (states: MapNodeState[]) => nodes.find(node => states.includes(node.state))?.id
  return first(['in_progress']) ?? first(['urgent', 'available']) ?? null
}

/**
 * Profesorado: la parte del anillo de un medallón, de 0 a 1: cuántas personas
 * la han completado de cuántas. Sin alumnado, 0.
 */
export function ringFraction(done = 0, total = 0): number {
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, done / total))
}

/**
 * Profesorado: cómo va la clase en el mapa. `percent` es la media de lo
 * completado (cuántas misiones ha completado cada estudiante, de todas) y
 * `doneByAll`, cuántas ha completado todo el alumnado.
 */
export function classMapProgress(missions: { completedCount?: number; totalStudents?: number }[]): {
  students: number
  percent: number
  doneByAll: number
} {
  const students = Math.max(0, ...missions.map(m => m.totalStudents ?? 0))
  if (students === 0 || missions.length === 0) return { students, percent: 0, doneByAll: 0 }
  const completions = missions.reduce(
    (sum, m) => sum + Math.min(m.completedCount ?? 0, students),
    0
  )
  return {
    students,
    percent: Math.round((completions / (students * missions.length)) * 100),
    doneByAll: missions.filter(m => (m.completedCount ?? 0) >= students).length,
  }
}

/**
 * Profesorado: los avatares que caben de quienes han completado una misión y
 * cuántos quedan para «+N». Con `max` o menos, todos; si hay más, `max` − 1 y
 * el «+N» ocupa el último hueco.
 */
export function avatarStack<T>(people: T[], max = 8): { shown: T[]; more: number } {
  const shown = people.length <= max ? people : people.slice(0, Math.max(0, max - 1))
  return { shown, more: people.length - shown.length }
}
