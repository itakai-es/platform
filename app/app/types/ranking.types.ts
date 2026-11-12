import type { AnonymousComparison } from '~/types/analytics.types'
import type { TeamColor, TeamEmblem } from '~/types/team.types'
import type {
  RankingMode,
  RankingPeriod,
  RankingTopSize,
  RankingType,
} from '~/utils/ranking-config'

/**
 * El ranking de una clase, tal como lo mandan la API del alumnado y la del
 * profesorado (las dos con el mismo orden, los mismos puestos y las mismas
 * medias; ver api/src/utils/ranking.ts). Lo que el modo esconde al alumnado no
 * llega: se recorta en la API.
 */

/** Una persona en la clasificación. */
export interface RankingStudent {
  /** El de la matrícula en la del alumnado; el de la cuenta en la del profesorado. */
  id: string
  /**
   * Puesto de competición (1, 2, 2, 4). Null con 0: aún no tiene puesto y va
   * aparte, en su bloque «Aún sin…».
   */
  rank: number | null
  /** Su alias en la clase (o «Estudiante»); el profesorado recibe además el nombre real. */
  username: string
  avatar?: string
  /** Color de fondo del avatar, ya calculado por la API. */
  avatarColor?: TeamColor
  /** Nivel y XP, solo si la clase usa XP. */
  level?: number
  levelTitle?: string // Título del tramo de nivel (config de la clase)
  levelColor?: string // Color del tramo de nivel (para el marco/acento)
  xp?: number
  /** «X de N»: N son las misiones que cuentan (con enigmas y sin bloquear a mano). */
  missionsCompleted: number
  missionsTotal: number
  /** Lo que la ordena: su XP, o sus misiones completadas en el periodo. */
  score: number
  /** Solo en la del alumnado: la fila de quien mira. */
  isCurrentUser?: boolean
}

/** Las medias de la clase que acompañan a la clasificación completa. */
export interface ClassRankingStats {
  /** Null o ausente si la clase no usa XP o el tipo XP está apagado. */
  avgXp?: number | null
  /**
   * Solo en la del profesorado: media del % de enigmas obligatorios; null si no hay
   * ninguno que cuente.
   */
  avgProgress?: number | null
  /** Misiones completadas de media, con un decimal, de las `missionsTotal` que cuentan. */
  avgMissions: number | null
  missionsTotal: number
  /**
   * Solo en la del profesorado (null si la clase no usa XP): al alumnado no le llega,
   * porque la suma menos lo propio es lo de los demás.
   */
  totalXp?: number | null
  totalStudents: number
}

/** Qué ve el alumnado de la clase: se lo dice la API solo al profesorado. */
export interface RankingAudience {
  rankings: boolean
  types: RankingType[]
  mode: RankingMode
  topN: RankingTopSize
}

/** Lo que hay que ofrecer alrededor de la clasificación. */
export interface RankingOptions {
  /** Las pestañas. */
  types: RankingType[]
  /** Los periodos del tipo que se está viendo. */
  periods: RankingPeriod[]
  seasonStartedAt: string | null
  usesXp: boolean
  /** Solo en la del alumnado: lo que le deja ver su clase. */
  mode?: RankingMode
  topN?: RankingTopSize
  /** Solo en la del profesorado. */
  audience?: RankingAudience
}

interface RankingBase {
  period: RankingPeriod
  options: RankingOptions
}

/** La clasificación individual (XP o misiones) de una clase. */
export interface ClassRanking extends RankingBase {
  type: 'xp' | 'missions'
  /** Las tres primeras personas con puesto: nadie con 0. */
  podium: RankingStudent[]
  /** El resto que se puede ver y, al final, quien aún no ha sumado nada (`rank` null). */
  leaderboard: RankingStudent[]
  /**
   * Solo en la del profesorado, en la clasificación completa y de «Siempre». Al
   * alumnado no le llega: tiene «Tú y tu clase» (`comparison`).
   */
  stats?: ClassRankingStats | null
  /** Cuántas personas cuentan en la clase. */
  total: number
  /** Solo en la del alumnado: su propia fila, salga o no en la lista. */
  me?: RankingStudent | null
  /**
   * Solo en la del alumnado, en cualquier modo: «Tú y tu clase» (lo mismo que en su
   * Resumen); null si la clase tiene la comparación apagada.
   */
  comparison?: AnonymousComparison | null
}

/** Un equipo en la clasificación de su agrupación. */
export interface RankedTeam {
  id: string
  title: string
  color: TeamColor | null
  emblem: TeamEmblem | null
  points: number
  index?: number
  /** Puesto de competición (1, 2, 2, 4). Null sin puntos: va en «Aún sin puntos». */
  rank: number | null
}

/** La clasificación de una agrupación de base. */
export interface TeamStanding {
  set: { id: string; title: string }
  teams: RankedTeam[]
}

export interface TeamsRanking extends RankingBase {
  type: 'teams'
  standings: TeamStanding[]
}

export type RankingResponse = ClassRanking | TeamsRanking
