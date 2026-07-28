// XP and Level calculation utilities for ITAKAI gamification
//
// El cálculo de niveles vive en `level-config.ts` y es configurable por clase.
// Estas funciones son envoltorios: sin `cfg` usan DEFAULT_LEVEL_CONFIG (el sistema
// global de siempre); pasando la config de una clase, calculan según esa clase.

import {
  DEFAULT_LEVEL_CONFIG,
  xpForLevel,
  totalXpForLevel,
  levelFromXp,
  levelInfo,
  titleForLevel,
  type LevelConfig,
} from './level-config.js'

export const BASE_XP = 50
export const EXPONENT = 1.3
export const LEVEL_CAP = 50

export const ENIGMA_XP_PRESETS = [20, 40, 60, 80, 100] as const

export const MISSION_COMPLETION_BONUS = {
  comun: 50,
  rara: 100,
  epica: 200,
  legendaria: 400,
} as const

export const LEVEL_TITLES = [
  { minLevel: 1, maxLevel: 4, title: 'Mortal' },
  { minLevel: 5, maxLevel: 9, title: 'Héroe Novato' },
  { minLevel: 10, maxLevel: 14, title: 'Héroe de Bronce' },
  { minLevel: 15, maxLevel: 19, title: 'Héroe de Plata' },
  { minLevel: 20, maxLevel: 24, title: 'Héroe de Oro' },
  { minLevel: 25, maxLevel: 29, title: 'Semidiós' },
  { minLevel: 30, maxLevel: 34, title: 'Titán' },
  { minLevel: 35, maxLevel: 39, title: 'Olímpico Menor' },
  { minLevel: 40, maxLevel: 44, title: 'Olímpico Mayor' },
  { minLevel: 45, maxLevel: 49, title: 'Avatar Divino' },
  { minLevel: 50, maxLevel: 50, title: 'Dios del Olimpo' },
] as const

/**
 * Calculate XP required for a specific level
 */
export function getXPForLevel(level: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG): number {
  return xpForLevel(level, cfg)
}

/**
 * Calculate total XP required to REACH a level (cumulative threshold).
 */
export function getTotalXPForLevel(level: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG): number {
  return totalXpForLevel(level, cfg)
}

/**
 * Calculate level from total XP (capped at the class's cap).
 */
export function getLevelFromXP(totalXP: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG): number {
  return levelFromXp(totalXP, cfg)
}

/**
 * Get complete level information from total XP, según la config de la clase.
 * Incluye `color` del tramo además de nivel/título/progreso.
 */
export function getLevelInfo(totalXP: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG) {
  return levelInfo(totalXP, cfg)
}

/**
 * Get title for a specific level.
 */
export function getTitleForLevel(level: number, cfg: LevelConfig = DEFAULT_LEVEL_CONFIG): string {
  return titleForLevel(level, cfg)
}

/**
 * Check if completing an enigma/mission would cause a level up
 */
export function wouldLevelUp(
  currentXP: number,
  xpToAdd: number,
  cfg: LevelConfig = DEFAULT_LEVEL_CONFIG
): boolean {
  const currentLevel = getLevelFromXP(currentXP, cfg)
  const newLevel = getLevelFromXP(currentXP + xpToAdd, cfg)
  return newLevel > currentLevel
}

/**
 * Get XP reward for mission completion based on rarity
 */
export function getMissionCompletionRewards(rarity: keyof typeof MISSION_COMPLETION_BONUS) {
  return {
    xp: MISSION_COMPLETION_BONUS[rarity] || MISSION_COMPLETION_BONUS.comun,
  }
}

/**
 * Calculate total XP for a mission: rarity bonus + sum of enigma XP
 */
export function calculateMissionTotalXP(rarity: string, enigmaXPs: number[]): number {
  const bonus = MISSION_COMPLETION_BONUS[rarity as keyof typeof MISSION_COMPLETION_BONUS] || MISSION_COMPLETION_BONUS.comun
  return bonus + enigmaXPs.reduce((sum, xp) => sum + xp, 0)
}

/**
 * Validate a custom XP override for an enigma. Teachers can award any integer
 * between 0 and the enigma's base XP (partial credit), so percentage shortcuts
 * (25%, 50%, 75%, 100%) work for any preset value.
 */
export function validateCustomEnigmaXp(value: number | undefined | null, fallback: number): number {
  if (value === undefined || value === null) return fallback
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error('El XP personalizado debe ser un número entero')
  }
  if (value < 0) {
    throw new Error('El XP personalizado no puede ser negativo')
  }
  if (value > fallback) {
    throw new Error(`El XP personalizado no puede superar el XP base del enigma (${fallback})`)
  }
  return value
}

