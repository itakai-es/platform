/**
 * XP Calculator — mirror of /data/itakai/api/src/utils/xp-calculator.ts.
 * MUST stay byte-for-byte identical with the backend to avoid level drift.
 */

import { MISSION_COMPLETION_BONUS, type MissionRarity } from './gamification-config'
import {
  DEFAULT_LEVEL_CONFIG,
  xpForLevel,
  totalXpForLevel,
  levelFromXp,
  levelInfo as levelInfoWithCfg,
  type LevelConfig,
} from './level-config'

export interface LevelInfo {
  level: number
  currentXP: number
  requiredXP: number
  progress: number // 0-100
  title: string
  color: string
  totalXP: number
}

/** XP needed to complete the given level. Uses the class config if provided. */
export function getXPForLevel(level: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG): number {
  return xpForLevel(level, cfg)
}

/** Cumulative XP threshold required to have reached `level`. Level 1 starts at 0. */
export function getTotalXPForLevel(level: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG): number {
  return totalXpForLevel(level, cfg)
}

/** Derive the student level from a total XP value. Capped at the config's cap. */
export function getLevelFromXP(totalXP: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG): number {
  return levelFromXp(totalXP, cfg)
}

/** Full level info used by the UI (includes the tier color). */
export function getLevelInfo(totalXP: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG): LevelInfo {
  return levelInfoWithCfg(totalXP, cfg)
}

/** Number of levels gained between two XP snapshots (0 if none, can't be negative). */
export function checkLevelUp(
  oldXP: number,
  newXP: number,
  cfg: LevelConfig = DEFAULT_LEVEL_CONFIG
): number {
  return Math.max(0, levelFromXp(newXP, cfg) - levelFromXp(oldXP, cfg))
}

/** Rarity bonus lookup. */
export function getMissionCompletionBonus(rarity: MissionRarity): number {
  return MISSION_COMPLETION_BONUS[rarity] ?? MISSION_COMPLETION_BONUS.comun
}

/** Enigmas XP + rarity bonus. */
export function calculateMissionXP(
  enigmasXP: number[],
  rarity: MissionRarity
): { enigmasTotal: number; bonus: number; total: number } {
  const enigmasTotal = enigmasXP.reduce((sum, xp) => sum + xp, 0)
  const bonus = getMissionCompletionBonus(rarity)
  return { enigmasTotal, bonus, total: enigmasTotal + bonus }
}

/** Milestone levels used for confetti/badge triggers. */
export function isLevelMilestone(level: number): boolean {
  return [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].includes(level)
}
