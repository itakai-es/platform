import { describe, it, expect } from 'vitest'
import {
  BASE_XP,
  EXPONENT,
  LEVEL_CAP,
  ENIGMA_XP_PRESETS,
  MISSION_COMPLETION_BONUS,
  getXPForLevel,
  getTotalXPForLevel,
  getLevelFromXP,
  getLevelInfo,
  getTitleForLevel,
  wouldLevelUp,
  getMissionCompletionRewards,
  calculateMissionTotalXP,
  validateCustomEnigmaXp,
} from '../../src/utils/xp-calculator.js'

describe('XP Calculator - Constants', () => {
  it('should have correct base constants', () => {
    expect(BASE_XP).toBe(50)
    expect(EXPONENT).toBe(1.3)
    expect(LEVEL_CAP).toBe(50)
  })

  it('should have 5 enigma XP presets', () => {
    expect(ENIGMA_XP_PRESETS).toEqual([20, 40, 60, 80, 100])
  })

  it('should have mission completion bonuses for all rarities', () => {
    expect(MISSION_COMPLETION_BONUS.comun).toBe(50)
    expect(MISSION_COMPLETION_BONUS.rara).toBe(100)
    expect(MISSION_COMPLETION_BONUS.epica).toBe(200)
    expect(MISSION_COMPLETION_BONUS.legendaria).toBe(400)
  })
})

describe('getXPForLevel', () => {
  it('should calculate XP for level 1', () => {
    const xp = getXPForLevel(1)
    expect(xp).toBe(Math.floor(BASE_XP * Math.pow(1, EXPONENT)))
    expect(xp).toBe(50)
  })

  it('should increase XP requirements with level', () => {
    const xp1 = getXPForLevel(1)
    const xp5 = getXPForLevel(5)
    const xp10 = getXPForLevel(10)
    expect(xp5).toBeGreaterThan(xp1)
    expect(xp10).toBeGreaterThan(xp5)
  })

  it('should return integer values', () => {
    for (let level = 1; level <= 10; level++) {
      expect(Number.isInteger(getXPForLevel(level))).toBe(true)
    }
  })
})

describe('getTotalXPForLevel', () => {
  it('should return 0 for level 1', () => {
    expect(getTotalXPForLevel(1)).toBe(0)
  })

  it('should return 0 for level 0 or negative', () => {
    expect(getTotalXPForLevel(0)).toBe(0)
    expect(getTotalXPForLevel(-1)).toBe(0)
  })

  it('should accumulate XP from previous levels', () => {
    const totalForLevel3 = getTotalXPForLevel(3)
    expect(totalForLevel3).toBe(getXPForLevel(1) + getXPForLevel(2))
  })

  it('should be monotonically increasing', () => {
    let prev = 0
    for (let level = 1; level <= 20; level++) {
      const total = getTotalXPForLevel(level)
      expect(total).toBeGreaterThanOrEqual(prev)
      prev = total
    }
  })
})

describe('getLevelFromXP', () => {
  it('should return level 1 for 0 XP', () => {
    expect(getLevelFromXP(0)).toBe(1)
  })

  it('should return level 1 for XP below level 2 threshold', () => {
    expect(getLevelFromXP(49)).toBe(1)
  })

  it('should return level 2 when XP meets threshold', () => {
    const xpForLevel1 = getXPForLevel(1)
    expect(getLevelFromXP(xpForLevel1)).toBe(2)
  })

  it('should not exceed LEVEL_CAP', () => {
    expect(getLevelFromXP(999999999)).toBe(LEVEL_CAP)
  })

  it('should be consistent with getTotalXPForLevel', () => {
    for (let level = 1; level <= 10; level++) {
      const totalXP = getTotalXPForLevel(level)
      expect(getLevelFromXP(totalXP)).toBe(level)
    }
  })
})

describe('getLevelInfo', () => {
  it('should return complete info for level 1', () => {
    const info = getLevelInfo(0)
    expect(info.level).toBe(1)
    expect(info.totalXP).toBe(0)
    expect(info.title).toBe('Mortal')
    expect(info.progress).toBeGreaterThanOrEqual(0)
    expect(info.progress).toBeLessThanOrEqual(100)
  })

  it('should return correct title for high levels', () => {
    const xpForLevel50 = getTotalXPForLevel(50)
    const info = getLevelInfo(xpForLevel50)
    expect(info.level).toBe(50)
    expect(info.title).toBe('Dios del Olimpo')
  })

  it('should calculate progress percentage correctly', () => {
    const info = getLevelInfo(0)
    expect(info.currentXP).toBe(0)
    expect(info.requiredXP).toBeGreaterThan(0)
  })

  it('should return 100% progress at level cap', () => {
    const xpForCap = getTotalXPForLevel(LEVEL_CAP)
    const info = getLevelInfo(xpForCap)
    expect(info.progress).toBe(100)
  })
})

describe('getTitleForLevel', () => {
  it('should return Mortal for levels 1-4', () => {
    expect(getTitleForLevel(1)).toBe('Mortal')
    expect(getTitleForLevel(4)).toBe('Mortal')
  })

  it('should return Héroe Novato for levels 5-9', () => {
    expect(getTitleForLevel(5)).toBe('Héroe Novato')
    expect(getTitleForLevel(9)).toBe('Héroe Novato')
  })

  it('should return Semidiós for levels 25-29', () => {
    expect(getTitleForLevel(25)).toBe('Semidiós')
  })

  it('should return Dios del Olimpo for level 50', () => {
    expect(getTitleForLevel(50)).toBe('Dios del Olimpo')
  })

  it('clamps to the nearest tier for out-of-range levels', () => {
    expect(getTitleForLevel(0)).toBe('Mortal') // below the first tier → lowest
    expect(getTitleForLevel(100)).toBe('Dios del Olimpo') // above the last tier → highest
  })
})

describe('wouldLevelUp', () => {
  it('should return true when XP crosses level boundary', () => {
    const xpForLevel1 = getXPForLevel(1)
    expect(wouldLevelUp(0, xpForLevel1)).toBe(true)
  })

  it('should return false when XP stays in same level', () => {
    expect(wouldLevelUp(0, 10)).toBe(false)
  })

  it('should handle multiple level jumps', () => {
    expect(wouldLevelUp(0, 99999)).toBe(true)
  })
})

describe('getMissionCompletionRewards', () => {
  it('should return correct XP for each rarity', () => {
    expect(getMissionCompletionRewards('comun').xp).toBe(50)
    expect(getMissionCompletionRewards('rara').xp).toBe(100)
    expect(getMissionCompletionRewards('epica').xp).toBe(200)
    expect(getMissionCompletionRewards('legendaria').xp).toBe(400)
  })

  it('should fallback to comun for unknown rarity', () => {
    const rewards = getMissionCompletionRewards('unknown' as any)
    expect(rewards.xp).toBe(50)
  })
})

describe('calculateMissionTotalXP', () => {
  it('should include rarity bonus plus enigma XP', () => {
    const total = calculateMissionTotalXP('comun', [20, 40])
    expect(total).toBe(50 + 20 + 40) // 110
  })

  it('should return only bonus when no enigmas', () => {
    expect(calculateMissionTotalXP('rara', [])).toBe(100)
  })

  it('should handle legendaria with multiple enigmas', () => {
    const total = calculateMissionTotalXP('legendaria', [100, 80, 60])
    expect(total).toBe(400 + 100 + 80 + 60) // 640
  })

  it('should fallback to comun bonus for unknown rarity', () => {
    const total = calculateMissionTotalXP('mythic', [20])
    expect(total).toBe(50 + 20)
  })
})

describe('validateCustomEnigmaXp', () => {
  it('returns the fallback when value is undefined', () => {
    expect(validateCustomEnigmaXp(undefined, 40)).toBe(40)
  })

  it('returns the fallback when value is null', () => {
    expect(validateCustomEnigmaXp(null, 20)).toBe(20)
  })

  it('accepts any integer between 0 and the base XP (partial credit)', () => {
    expect(validateCustomEnigmaXp(0, 60)).toBe(0)
    expect(validateCustomEnigmaXp(15, 60)).toBe(15)
    expect(validateCustomEnigmaXp(45, 60)).toBe(45) // 75% of 60
    expect(validateCustomEnigmaXp(60, 60)).toBe(60)
  })

  it('rejects values that exceed the base XP', () => {
    expect(() => validateCustomEnigmaXp(61, 60)).toThrow(/no puede superar/)
    expect(() => validateCustomEnigmaXp(1000, 60)).toThrow(/no puede superar/)
  })

  it('rejects negative values', () => {
    expect(() => validateCustomEnigmaXp(-1, 60)).toThrow(/no puede ser negativo/)
    expect(() => validateCustomEnigmaXp(-25, 60)).toThrow(/no puede ser negativo/)
  })

  it('rejects decimals', () => {
    expect(() => validateCustomEnigmaXp(40.5, 60)).toThrow(/número entero/)
  })

  it('rejects NaN and infinity', () => {
    expect(() => validateCustomEnigmaXp(NaN, 60)).toThrow(/número entero/)
    expect(() => validateCustomEnigmaXp(Infinity, 60)).toThrow(/número entero/)
  })
})

describe('getLevelInfo — edge cases', () => {
  it('clamps negative XP to 0', () => {
    const info = getLevelInfo(-500)
    expect(info.level).toBe(1)
    expect(info.totalXP).toBe(0)
    expect(info.currentXP).toBe(0)
  })

  it('returns progress: 100 / currentXP: 0 / requiredXP: 0 at LEVEL_CAP', () => {
    const xpAtCap = getTotalXPForLevel(LEVEL_CAP)
    const info = getLevelInfo(xpAtCap)
    expect(info.level).toBe(LEVEL_CAP)
    expect(info.progress).toBe(100)
    expect(info.currentXP).toBe(0)
    expect(info.requiredXP).toBe(0)
    expect(info.title).toBe('Dios del Olimpo')
  })

  it('stays at LEVEL_CAP with extra XP past the cap', () => {
    const far = getTotalXPForLevel(LEVEL_CAP) + 999999
    const info = getLevelInfo(far)
    expect(info.level).toBe(LEVEL_CAP)
    expect(info.progress).toBe(100)
    expect(info.requiredXP).toBe(0)
  })

  it('progress is 0 at the exact start of a level', () => {
    const startOfLevel3 = getTotalXPForLevel(3)
    const info = getLevelInfo(startOfLevel3)
    expect(info.level).toBe(3)
    expect(info.currentXP).toBe(0)
    expect(info.progress).toBe(0)
  })

  it('progress is ~100 just before the next level threshold', () => {
    const almostLevel4 = getTotalXPForLevel(4) - 1
    const info = getLevelInfo(almostLevel4)
    expect(info.level).toBe(3)
    expect(info.progress).toBeGreaterThanOrEqual(99)
  })

  it('currentXP + requiredXP is consistent with level boundary', () => {
    for (let level = 1; level < LEVEL_CAP; level++) {
      const xp = getTotalXPForLevel(level) + 5
      const info = getLevelInfo(xp)
      if (info.level === level) {
        expect(info.currentXP).toBe(5)
        expect(info.requiredXP).toBe(getXPForLevel(level))
      }
    }
  })
})

describe('Level curve — golden values (front/back contract)', () => {
  // These values pin down the exact level a student reaches for a given XP.
  // Both the backend and /data/itakai/app/app/utils/xp-calculator.ts MUST
  // produce identical results for these inputs. If these numbers drift, the
  // frontend and backend level displays will diverge and students will see
  // different levels in the sidebar vs. what the server thinks they have.
  const GOLDEN: Array<{ xp: number; level: number }> = [
    { xp: 0, level: 1 },
    { xp: 49, level: 1 },
    { xp: 50, level: 2 },
    { xp: 172, level: 2 },
    { xp: 173, level: 3 },
    { xp: 500, level: 4 },
    { xp: 1000, level: 5 },
    { xp: 5000, level: 11 },
    { xp: 10000, level: 14 },
    { xp: 50000, level: 29 },
  ]

  for (const { xp, level } of GOLDEN) {
    it(`${xp} XP → level ${level}`, () => {
      expect(getLevelFromXP(xp)).toBe(level)
    })
  }

  it('total XP thresholds are monotonic up to LEVEL_CAP', () => {
    let prev = -1
    for (let level = 1; level <= LEVEL_CAP; level++) {
      const t = getTotalXPForLevel(level)
      expect(t).toBeGreaterThan(prev)
      prev = t
    }
  })
})
