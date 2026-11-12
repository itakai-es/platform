/**
 * Lo que cuenta el mapa de misiones (E3, en pruebas), sin Vue: el estado de
 * cada nodo para quien lo mira, lo recorrido, dónde está el alumnado («Estás
 * aquí») y, para el profesorado, cómo va la clase. El anillo de cada medallón
 * (`ringFraction`) está en utils/progress-ring.ts y la pila de avatares de quien
 * ha completado cada misión (`avatarStack`), en utils/avatar.ts. Lo usa MissionMap.vue; vive
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
  /** Alumnado: su avance en los obligatorios y, aparte, los opcionales (null si está cerrada). */
  progress: {
    percent: number
    done: number
    total: number
    extraDone: number
    extraTotal: number
  } | null
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
 * de si la ha empezado.
 *
 * «En curso» es lo que dice la API con `started` (lo mismo que su Resumen: una
 * entrega por revisar o una pista ya cuentan, aunque no lleve nada aprobado). Si
 * no llega, se deduce de su progreso.
 */
export function studentNodeState(mission: {
  status: string
  started?: boolean
  progress?: number
  progressDetail?: { extraDone?: number }
}): MapNodeState {
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
      return missionStarted(mission) ? 'in_progress' : 'available'
  }
}

/**
 * Si el alumnado ha empezado una misión: `started` de la API y, si no llega, su
 * progreso (el % es de los obligatorios: quien lleva un opcional también ha
 * empezado). Decide «En curso» y que el botón diga «Continuar» y no «Empezar».
 */
export function missionStarted(mission: {
  started?: boolean
  progress?: number
  progressDetail?: { extraDone?: number }
}): boolean {
  if (typeof mission.started === 'boolean') return mission.started
  return (mission.progress ?? 0) > 0 || (mission.progressDetail?.extraDone ?? 0) > 0
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
 * Profesorado: cómo va la clase en el mapa, con las misiones que cuentan (las
 * que no traen `counted`, también): `total` son esas; `average`, las que ha
 * completado cada estudiante de media, con un decimal, como la media de la clase
 * de la API; `percent`, cuánto de la barra llena; y `doneByAll`, cuántas ha
 * completado todo el alumnado.
 *
 * La media es la de quienes participan (`participatingStudents`): las cuentas sin
 * estrenar no bajan la media. Si la API no lo manda, se divide entre `totalStudents`.
 */
export function classMapProgress(
  missions: {
    completedCount?: number
    totalStudents?: number
    participatingStudents?: number
    counted?: boolean
  }[]
): {
  students: number
  total: number
  average: number
  percent: number
  doneByAll: number
} {
  const students = Math.max(
    0,
    ...missions.map(m => m.participatingStudents ?? m.totalStudents ?? 0)
  )
  const counted = missions.filter(m => m.counted !== false)
  const total = counted.length
  if (students === 0 || total === 0) {
    return { students, total, average: 0, percent: 0, doneByAll: 0 }
  }
  const completions = counted.reduce((sum, m) => sum + Math.min(m.completedCount ?? 0, students), 0)
  return {
    students,
    total,
    average: Math.round((completions / students) * 10) / 10,
    percent: Math.round((completions / (students * total)) * 100),
    doneByAll: counted.filter(m => (m.completedCount ?? 0) >= students).length,
  }
}
