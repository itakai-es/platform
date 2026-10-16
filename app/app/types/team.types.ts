import type { BatchResult } from '~/stores/behaviors'

/** Paleta de los equipos: claves de los tokens de color (ver `utils/team-style.ts`). */
export type TeamColor = 'purple' | 'yellow' | 'mint' | 'sky' | 'red' | 'peach'
export type TeamEmblem =
  | 'star'
  | 'bolt'
  | 'fire'
  | 'shield'
  | 'rocket'
  | 'heart'
  | 'sun'
  | 'moon'
  | 'sparkles'
  | 'globe'
  | 'puzzle'
  | 'trophy'

/** De base (fija, puntúa en la clasificación) o temporal (para una misión o una dinámica). */
export type TeamSetKind = 'base' | 'temporal'

export interface Team {
  id: string
  title: string
  color: TeamColor | null
  emblem: TeamEmblem | null
  /** Marcador: la suma de sus premios. */
  points: number
  studentIds: string[]
}

export interface TeamSet {
  id: string
  title: string
  kind: TeamSetKind
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  teams: Team[]
}

/** Un equipo tal como se manda al guardar un reparto: sin `id`, se crea. */
export interface TeamDraft {
  id?: string
  title: string
  color: TeamColor | null
  emblem: TeamEmblem | null
  studentIds: string[]
}

export interface ShuffleInput {
  teams?: number
  perTeam?: number
  balanceByLevel?: boolean
  date?: string
}

export interface ShuffleResult {
  teams: string[][]
  excludedStudentIds: string[]
  attendanceTaken: boolean
}

export interface TeamAwardInput {
  behaviorId?: string
  title?: string
  points: number
  distribute: boolean
  xp?: number
  coins?: number
  mana?: number
  lives?: number
}

export interface TeamAwardResult {
  award: { id: string; teamId: string; title: string; points: number; memberCount: number }
  teamPoints: number
  /** El reparto a cada integrante, si lo hubo. */
  batch: BatchResult | null
}

/** Equipo con su agrupación, para elegirlo en una lista (premiar, misiones…). */
export interface TeamOption extends Team {
  /** Su posición en la agrupación: da el color y el emblema si no tiene. */
  index: number
  setId: string
  setTitle: string
  setKind: TeamSetKind
}

/** Lo que ve el alumnado. */
export interface StudentTeams {
  rankings: boolean
  myTeams: {
    /** `archived`: la portada no la enseña; la página de una misión por equipos, sí. */
    set: { id: string; title: string; kind: TeamSetKind; archived: boolean }
    team: Omit<Team, 'studentIds' | 'points'> & { index: number; points: number | null }
    members: { id: string; name: string; avatar: string | null; isMe: boolean }[]
  }[]
  standings: {
    set: { id: string; title: string }
    teams: (Omit<Team, 'studentIds'> & { index: number; points: number })[]
  }[]
}
