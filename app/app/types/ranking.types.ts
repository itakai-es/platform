/**
 * Ranking Module Type Definitions
 * Tipos para rankings y leaderboards
 */

/**
 * Estudiante en el ranking
 */
export interface RankingStudent {
  id: string
  rank: number
  username: string
  avatar?: string
  level: number
  levelTitle?: string // Título del tramo de nivel (config de la clase)
  levelColor?: string // Color del tramo de nivel (para el marco/acento)
  xp: number
  missionsCompleted: number
  missionsTotal: number
  completionPercent: number
  isCurrentUser?: boolean
}

/**
 * Estadísticas del ranking de clase
 */
export interface ClassRankingStats {
  avgXp: number
  avgProgress: number
  avgMissions: string
  totalXp: number
  totalStudents: number
}

/**
 * Ranking completo de una clase
 */
export interface ClassRanking {
  podium: RankingStudent[] // Top 3
  leaderboard: RankingStudent[] // Resto
  stats: ClassRankingStats
  currentUserRank?: number
}

/**
 * Tipos de filtro para el ranking
 */
export type RankingFilterType = 'general' | 'esta_semana' | 'misiones' | 'xp_ganado'

/**
 * Filtro de ranking
 */
export interface RankingFilter {
  id: RankingFilterType
  label: string
}
