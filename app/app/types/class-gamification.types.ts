/**
 * ITAKAI Class Gamification Types
 * Types for class-specific XP/Level system
 *
 * Each student has independent XP and level per class,
 * enabling competition within each class context.
 */
import type { LevelConfig } from './class.types'

/**
 * Gamification data for a specific class
 * Returned by GET /students/classes/:classId/gamification
 */
export interface ClassGamificationData {
  classId: string
  xp: number
  level: number
  title: string
  color?: string // Color del tramo de nivel (configurable por clase)
  levelConfig?: LevelConfig // Curva + tramos de la clase (para cálculos optimistas)
  nextTitle?: string // Title for next level (only if different from current)
  name?: string // Student's real name
  username?: string // Student's class-specific nickname
  avatar?: string // Student's class-specific avatar
  guideId?: string // Student's selected guide for this class
  progress: number // 0-100 progress within current level
  currentXP: number // XP accumulated within current level
  requiredXP: number // XP needed to reach next level
  rank: number // Position in class ranking
  totalStudents: number // Total students in class
}

/**
 * Data for level-up event within a class
 */
export interface ClassLevelUpData {
  classId: string
  className: string
  oldLevel: number
  newLevel: number
  xpGained: number
  newTitle: string
  newColor?: string // Color del tramo del nuevo nivel (config de la clase)
}

/**
 * API response for class gamification endpoint
 */
export interface ClassGamificationResponse {
  gamification: ClassGamificationData
}
