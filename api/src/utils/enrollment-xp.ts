/**
 * Central helper for ClassEnrollment XP mutations.
 *
 * Every place that adds or removes XP from a student in a class MUST go through
 * here so that level stays in sync.
 */

import { prisma as defaultPrisma } from '../config/database.js'
import { Prisma } from '../generated/prisma/client.js'
import { getLevelFromXP } from './xp-calculator.js'
import { resolveLevelConfig, type LevelConfig } from './level-config.js'
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
  /** Explicit mana delta, independent of XP. */
  manaDelta?: number
  /**
   * Monedas y maná negativos: solo los comportamientos y las recompensas
   * libres los quitan, y lo dicen con esta opción. Sin ella, un delta
   * negativo de monedas o maná se ignora, como siempre (las entregas nunca
   * los recuperan).
   */
  allowNegativeBalances?: boolean
  /** Vidas firmadas. Suelo 0 y sin techo, como en los comportamientos. */
  livesDelta?: number
  /** Configuración de niveles ya leída: el lote la lee una vez por petición. */
  levelConfig?: LevelConfig
  /** Optional prisma client (use this when inside a $transaction). Defaults to the global client. */
  tx?: Client
}

interface ApplyXpDeltaResult {
  previousXP: number
  newXP: number
  previousLevel: number
  newLevel: number
  levelChanged: boolean
  /** Saldos de la matrícula tras el cambio, ya con el suelo 0 aplicado. */
  balances: { xp: number; coins: number; mana: number; lives: number; level: number }
}

/**
 * Atomically adjusts a student's class XP and recalculates level. Safe to call
 * with negative deltas — XP floors at 0 and level recomputes (can go down).
 *
 * Uses Prisma's atomic `increment` (a single SQL UPDATE) so that concurrent
 * calls never lose updates.
 */
export async function applyXpDelta(options: ApplyXpDeltaOptions): Promise<ApplyXpDeltaResult> {
  const { studentId, classId, delta, coinsDelta, manaDelta, livesDelta } = options
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
  if (livesDelta !== undefined && (!Number.isFinite(livesDelta) || !Number.isInteger(livesDelta))) {
    throw new Error('Lives delta must be an integer')
  }

  // Coins/mana are spendable balances credited independently of XP — only when
  // the caller passes an explicit delta (e.g. enigma rewards, which the teacher
  // configures per enigma). XP gains alone never grant coins/mana, and XP
  // revocations never claw them back (they only decrease on shop purchases).
  // Los comportamientos y las recompensas libres sí restan, y lo piden aparte.
  const allowNegative = options.allowNegativeBalances === true
  const coinsIncrement = coinsDelta ?? 0
  const manaIncrement = manaDelta ?? 0
  const livesIncrement = livesDelta ?? 0
  const applies = (value: number) => value > 0 || (allowNegative && value < 0)

  // Atomic increment — a single UPDATE at the DB level.
  let updated
  try {
    updated = await client.classEnrollment.update({
      where: { studentId_classId: { studentId, classId } },
      data: {
        xp: { increment: delta },
        ...(applies(coinsIncrement) ? { coins: { increment: coinsIncrement } } : {}),
        ...(applies(manaIncrement) ? { mana: { increment: manaIncrement } } : {}),
        ...(livesIncrement !== 0 ? { lives: { increment: livesIncrement } } : {}),
      },
    })
  } catch (err) {
    // Solo «no hay matrícula» (P2025) se traduce. Lo demás (un bloqueo mutuo,
    // la conexión caída) sube tal cual, para no disfrazarlo de otra cosa.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('No estás en esta clase')
    }
    throw err
  }

  // Floor at 0: if a negative delta pushed a balance below zero, correct in a
  // follow-up update (rare path; only taken when the increment went negative).
  // Dentro de una transacción la fila queda bloqueada desde el primer UPDATE,
  // así que nadie cuela un cambio entre los dos.
  const floored = {
    ...(updated.xp < 0 ? { xp: 0 } : {}),
    ...(updated.coins < 0 ? { coins: 0 } : {}),
    ...(updated.mana < 0 ? { mana: 0 } : {}),
    ...(updated.lives < 0 ? { lives: 0 } : {}),
  }
  if (Object.keys(floored).length > 0) {
    updated = await client.classEnrollment.update({
      where: { studentId_classId: { studentId, classId } },
      data: floored,
    })
  }
  const newXP = updated.xp

  // El nivel se recalcula según la configuración de niveles de ESTA clase.
  const levelCfg =
    options.levelConfig ??
    resolveLevelConfig(
      (await client.class.findUnique({ where: { id: classId }, select: { levelConfig: true } }))
        ?.levelConfig
    )

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
    balances: {
      xp: newXP,
      coins: updated.coins,
      mana: updated.mana,
      lives: updated.lives,
      level: newLevel,
    },
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

