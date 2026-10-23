/**
 * ITAKAI Gamification Types
 * Types for guides, badges, achievements and gamification configuration
 */

// Re-export types from gamification-config
export type {
  BadgeRarity,
  BadgeCategory,
  SystemBadge,
  Achievement,
  AchievementType,
  AchievementCategory,
  MissionRarity,
  EnigmaXPPreset,
  LevelTitle,
} from '~/utils/gamification-config'

// ============================================
// BADGE TRIGGERS
// ============================================

export type BadgeTriggerType = 'missions_completed' | 'xp_total' | 'level_reached'

export interface BadgeTrigger {
  type: BadgeTriggerType
  value: number
}

// ============================================
// STUDENT PROGRESS FOR BADGES
// ============================================

export interface StudentBadgeProgress {
  missionsCompleted: number
  xpTotal: number
  level: number
  perfectMissions: number
  classesJoined: number
}

// ============================================
// ACHIEVEMENT PROGRESS
// ============================================

export interface StudentAchievementProgress {
  achievementId: string
  currentValue: number
  targetValue: number
  progress: number // 0-100
  unlocked: boolean
  unlockedAt?: Date
}

// ============================================
// LEVEL INFO
// ============================================

export interface LevelUpEvent {
  oldLevel: number
  newLevel: number
  xpGained: number
  newTitle: string
  badgesEarned: string[]
}

// ============================================
// XP GAIN EVENT
// ============================================

export interface XPGainEvent {
  source: 'enigma' | 'mission_bonus' | 'achievement'
  amount: number
  description: string
  missionId?: string
  enigmaId?: string
  achievementId?: string
}
