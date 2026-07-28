/**
 * Central helper for ClassEnrollment XP mutations.
 *
 * Every place that adds or removes XP from a student in a class MUST go through
 * here so that level stays in sync.
 */

import { prisma as defaultPrisma } from '../config/database.js'
import { getLevelFromXP } from './xp-calculator.js'
import { resolveLevelConfig } from './level-config.js'
import { awardSystemBadges } from './system-badges.js'

// The helper must work both with the global prisma client and with the
// transactional client passed into `$transaction((tx) => ...)`. We can't
// import PrismaClient directly because this codebase uses a custom generated
// output path, so we infer a structural type from the default export.
type Client = typeof defaultPrisma | Parameters<Parameters<typeof defaultPrisma.$transaction>[0]>[0]

interface ApplyXpDeltaOptions {
  studentId: string
  classId: string
  /** Signed delta: positive to add XP, negative to revoke it. */
  delta: number
  /**
   * Explicit coin credit, independent of XP. When provided, coins are
   * incremented by exactly this amount (the XP→coins 1:1 fallback is skipped).
   * When omitted, legacy behaviour applies: coins follow XP 1:1 on positive deltas.
   */
  coinsDelta?: number
  /** Explicit mana credit, independent of XP. Only applied when > 0. */
  manaDelta?: number
  /** Optional prisma client (use this when inside a $transaction). Defaults to the global client. */
  tx?: Client
}

interface ApplyXpDeltaResult {
  previousXP: number
  newXP: number
  previousLevel: number
  newLevel: number
  levelChanged: boolean
}

/**
 * Atomically adjusts a student's class XP and recalculates level. Safe to call
 * with negative deltas — XP floors at 0 and level recomputes (can go down).
 *
 * Uses Prisma's atomic `increment` (a single SQL UPDATE) so that concurrent
 * calls never lose updates.
 */
export async function applyXpDelta(options: ApplyXpDeltaOptions): Promise<ApplyXpDeltaResult> {
  const { studentId, classId, delta, coinsDelta, manaDelta } = options
  const client: Client = (options.tx ?? defaultPrisma) as Client

  if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
    throw new Error('XP delta must be an integer')
  }
  if (coinsDelta !== undefined && (!Number.isFinite(coinsDelta) || !Number.isInteger(coinsDelta))) {
    throw new Error('Coins delta must be an integer')
  }
  if (manaDelta !== undefined && (!Number.isFinite(manaDelta) || !Number.isInteger(manaDelta))) {
    throw new Error('Mana delta must be an integer')
  }

  // Coins/mana are spendable balances credited independently of XP — only when
  // the caller passes an explicit delta (e.g. enigma rewards, which the teacher
  // configures per enigma). XP gains alone never grant coins/mana, and XP
  // revocations never claw them back (they only decrease on shop purchases).
  const coinsIncrement = coinsDelta ?? 0
  const manaIncrement = manaDelta ?? 0

  // Atomic increment — a single UPDATE at the DB level.
  let updated
  try {
    updated = await client.classEnrollment.update({
      where: { studentId_classId: { studentId, classId } },
      data: {
        xp: { increment: delta },
        ...(coinsIncrement > 0 ? { coins: { increment: coinsIncrement } } : {}),
        ...(manaIncrement > 0 ? { mana: { increment: manaIncrement } } : {}),
      },
    })
  } catch {
    throw new Error('No estás inscrito en esta clase')
  }

  // Floor at 0: if a negative delta pushed XP below zero, correct in a
  // follow-up update (rare path; only taken when the increment went negative).
  let newXP = updated.xp
  if (newXP < 0) {
    const corrected = await client.classEnrollment.update({
      where: { studentId_classId: { studentId, classId } },
      data: { xp: 0 },
    })
    newXP = corrected.xp
  }

  // El nivel se recalcula según la configuración de niveles de ESTA clase.
  const cls = await client.class.findUnique({ where: { id: classId }, select: { levelConfig: true } })
  const levelCfg = resolveLevelConfig(cls?.levelConfig)

  const previousXP = Math.max(0, newXP - delta)
  const previousLevel = updated.level
  const newLevel = getLevelFromXP(newXP, levelCfg)

  if (newLevel !== previousLevel) {
    await client.classEnrollment.update({
      where: { studentId_classId: { studentId, classId } },
      data: { level: newLevel },
    })
  }

  // XP or level may have crossed a system-badge threshold. Runs inside the
  // same tx when called from a $transaction — errors bubble up on purpose.
  await awardSystemBadges(studentId, client)

  return {
    previousXP,
    newXP,
    previousLevel,
    newLevel,
    levelChanged: previousLevel !== newLevel,
  }
}

/**
 * Recompute and persist the level for an enrollment from its current XP,
 * without changing XP. Used by reconciliation paths.
 */
export async function syncEnrollmentLevel(studentId: string, classId: string, tx?: Client): Promise<void> {
  const client: Client = (tx ?? defaultPrisma) as Client
  const enrollment = await client.classEnrollment.findUnique({
    where: { studentId_classId: { studentId, classId } },
  })
  if (!enrollment) return
  const cls = await client.class.findUnique({ where: { id: classId }, select: { levelConfig: true } })
  const level = getLevelFromXP(enrollment.xp, resolveLevelConfig(cls?.levelConfig))
  if (level !== enrollment.level) {
    await client.classEnrollment.update({
      where: { studentId_classId: { studentId, classId } },
      data: { level },
    })
  }
}

