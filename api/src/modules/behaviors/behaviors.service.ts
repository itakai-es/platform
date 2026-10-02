import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { getLevelFromXP } from '../../utils/xp-calculator.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { resolveLevelConfig } from '../../utils/level-config.js'
import { assertClassAccess, recordClassAction } from '../../utils/class-access.js'
import { NotFoundError } from '../../utils/errors.js'

/**
 * Per-class behaviors. Teachers maintain a catalog of positive/negative actions
 * (template) and apply them to enrolled students; each application snapshots the
 * deltas and adjusts the enrollment's XP, coins and lives atomically.
 *
 * Deltas in the template are stored as absolute amounts; the sign on application
 * comes from the `kind` (positive = +, negative = −). All updated balances clamp
 * at 0 (no negatives) and lives have no upper cap, per product spec.
 *
 * El catálogo lo ve todo el profesorado de la clase; lo cambia y lo aplica quien
 * tiene edición en ella.
 */

interface BehaviorTemplateInput {
  kind: 'positive' | 'negative'
  name: string
  description?: string
  xp?: number
  coins?: number
  lives?: number
}

function formatBehavior(b: {
  id: string
  classId: string
  kind: string
  name: string
  description: string
  xpDelta: number
  coinDelta: number
  lifeDelta: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: b.id,
    classId: b.classId,
    kind: b.kind as 'positive' | 'negative',
    name: b.name,
    description: b.description,
    xp: b.xpDelta || undefined,
    coins: b.coinDelta || undefined,
    lives: b.lifeDelta || undefined,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}

function normalize(value: number | undefined | null): number {
  if (value === undefined || value === null || Number.isNaN(value)) return 0
  return Math.max(0, Math.round(value))
}

/** Apunta en el registro de la clase un cambio en su catálogo de comportamientos. */
function recordBehaviorChange(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: 'behavior.created' | 'behavior.updated' | 'behavior.deleted',
  behavior: {
    id: string
    classId: string
    kind: string
    name: string
    xpDelta: number
    coinDelta: number
    lifeDelta: number
  }
) {
  return recordClassAction(tx, {
    classId: behavior.classId,
    actorId,
    action,
    entityType: 'behavior',
    entityId: behavior.id,
    metadata: {
      title: behavior.name,
      kind: behavior.kind,
      xp: behavior.xpDelta,
      coins: behavior.coinDelta,
      lives: behavior.lifeDelta,
    },
  })
}

class BehaviorsService {
  async getBehaviors(userId: string, classId: string) {
    await assertClassAccess(classId, userId, 'behavior.view')
    const behaviors = await prisma.behaviorTemplate.findMany({
      where: { classId },
      orderBy: { createdAt: 'asc' },
    })
    return behaviors.map(formatBehavior)
  }

  async createBehavior(userId: string, classId: string, data: BehaviorTemplateInput) {
    await assertClassAccess(classId, userId, 'behavior.edit')
    const behavior = await prisma.$transaction(async tx => {
      const created = await tx.behaviorTemplate.create({
        data: {
          classId,
          kind: data.kind,
          name: data.name.trim(),
          description: data.description?.trim() ?? '',
          xpDelta: normalize(data.xp),
          coinDelta: normalize(data.coins),
          lifeDelta: normalize(data.lives),
        },
      })
      await recordBehaviorChange(tx, userId, 'behavior.created', created)
      return created
    })
    return formatBehavior(behavior)
  }

  async updateBehavior(
    userId: string,
    classId: string,
    behaviorId: string,
    data: Partial<BehaviorTemplateInput>,
  ) {
    await assertClassAccess(classId, userId, 'behavior.edit')
    const existing = await prisma.behaviorTemplate.findFirst({
      where: { id: behaviorId, classId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError('El comportamiento no existe')

    const behavior = await prisma.$transaction(async tx => {
      const updated = await tx.behaviorTemplate.update({
        where: { id: behaviorId },
        data: {
          ...(data.kind !== undefined ? { kind: data.kind } : {}),
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description.trim() } : {}),
          ...(data.xp !== undefined ? { xpDelta: normalize(data.xp) } : {}),
          ...(data.coins !== undefined ? { coinDelta: normalize(data.coins) } : {}),
          ...(data.lives !== undefined ? { lifeDelta: normalize(data.lives) } : {}),
        },
      })
      await recordBehaviorChange(tx, userId, 'behavior.updated', updated)
      return updated
    })
    return formatBehavior(behavior)
  }

  async deleteBehavior(userId: string, classId: string, behaviorId: string) {
    await assertClassAccess(classId, userId, 'behavior.edit')
    const existing = await prisma.behaviorTemplate.findFirst({ where: { id: behaviorId, classId } })
    if (!existing) throw new NotFoundError('El comportamiento no existe')
    await prisma.$transaction(async tx => {
      await tx.behaviorTemplate.delete({ where: { id: behaviorId } })
      await recordBehaviorChange(tx, userId, 'behavior.deleted', existing)
    })
    return { success: true }
  }

  /**
   * Aplica un comportamiento a un alumno. Calcula los deltas firmados (positivos
   * suman, negativos restan), recalcula el nivel del enrollment a partir del XP
   * resultante y registra una BehaviorApplication, con quien lo aplica como
   * autor. Todo en una sola transacción.
   */
  async applyBehavior(userId: string, classId: string, behaviorId: string, studentId: string) {
    await assertClassAccess(classId, userId, 'behavior.apply')

    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

    return prisma.$transaction(async (tx) => {
      const behavior = await tx.behaviorTemplate.findFirst({
        where: { id: behaviorId, classId },
      })
      if (!behavior) throw new NotFoundError('El comportamiento no existe')

      const enrollment = await tx.classEnrollment.findUnique({
        where: { studentId_classId: { studentId, classId } },
      })
      if (!enrollment) throw new Error('Esa cuenta de estudiante no está en esta clase')

      // Respeta los ajustes de la clase: si los comportamientos están desactivados no se
      // pueden aplicar, y los deltas de recursos desactivados (XP/monedas/vidas) se ignoran
      // para no crear inconsistencias.
      const clsRow = await tx.class.findUnique({ where: { id: classId }, select: { settings: true, levelConfig: true } })
      const settings = resolveClassSettings(clsRow?.settings)
      const levelCfg = resolveLevelConfig(clsRow?.levelConfig)
      if (!settings.behaviors) throw new Error('Los comportamientos están desactivados en esta clase')

      const sign = behavior.kind === 'positive' ? 1 : -1
      const xpDelta = settings.xp ? behavior.xpDelta * sign : 0
      const coinDelta = settings.coins ? behavior.coinDelta * sign : 0
      const lifeDelta = settings.lives ? behavior.lifeDelta * sign : 0

      const newXp = Math.max(0, enrollment.xp + xpDelta)
      const newCoins = Math.max(0, enrollment.coins + coinDelta)
      const newLives = Math.max(0, enrollment.lives + lifeDelta)
      const newLevel = getLevelFromXP(newXp, levelCfg)

      const updated = await tx.classEnrollment.update({
        where: { studentId_classId: { studentId, classId } },
        data: { xp: newXp, coins: newCoins, lives: newLives, level: newLevel },
      })

      const application = await tx.behaviorApplication.create({
        data: {
          classId,
          behaviorId: behavior.id,
          teacherId: userId,
          studentId,
          kind: behavior.kind,
          name: behavior.name,
          xpDelta,
          coinDelta,
          lifeDelta,
        },
      })

      // Recent-activity entry visible in the student's class feed.
      await tx.activity.create({
        data: {
          userId: studentId,
          type: 'behavior_applied',
          description: `Recibió el comportamiento "${behavior.name}"`,
          classId,
          avatar: enrollment.avatarUrl,
          username: enrollment.nickname || 'Estudiante',
          source: behavior.name,
          xpAmount: xpDelta,
          actorId: userId,
          actorName: actor?.name,
          metadata: {
            kind: behavior.kind,
            xpDelta,
            coinDelta,
            lifeDelta,
          },
        },
      })

      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'behavior.applied',
        entityType: 'behavior',
        entityId: behavior.id,
        targetUserId: studentId,
        metadata: { title: behavior.name, kind: behavior.kind, xpDelta, coinDelta, lifeDelta },
      })

      return {
        application: {
          id: application.id,
          behaviorId: application.behaviorId,
          studentId: application.studentId,
          kind: application.kind as 'positive' | 'negative',
          name: application.name,
          xpDelta: application.xpDelta,
          coinDelta: application.coinDelta,
          lifeDelta: application.lifeDelta,
          createdAt: application.createdAt.toISOString(),
        },
        enrollment: {
          studentId,
          classId,
          xp: updated.xp,
          coins: updated.coins,
          lives: updated.lives,
          level: updated.level,
        },
      }
    })
  }
}

export const behaviorsService = new BehaviorsService()
