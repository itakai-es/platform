import { randomUUID } from 'node:crypto'
import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { assertClassAccess, recordClassAction } from '../../utils/class-access.js'
import { assertClassWritable, type WritableClass } from '../../utils/class-writable.js'
import { applyXpDelta } from '../../utils/enrollment-xp.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'

/**
 * Per-class behaviors. Teachers maintain a catalog of positive/negative actions
 * (template) and apply them to enrolled students; each application snapshots the
 * deltas and adjusts the enrollment's XP, coins and lives atomically.
 *
 * Deltas in the template are stored as absolute amounts; the sign on application
 * comes from the `kind` (positive = +, negative = −). All updated balances clamp
 * at 0 (no negatives) and lives have no upper cap, per product spec.
 *
 * Aplicar (a uno o a varios) y las recompensas libres pasan por el mismo
 * núcleo (`applyDeltasToMany`): incrementos atómicos, suelo 0, nivel e
 * insignias por `applyXpDelta`, y nunca en una clase archivada o en la papelera.
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
  mana?: number
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
  manaDelta: number
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
    mana: b.manaDelta || undefined,
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
    manaDelta: number
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
      mana: behavior.manaDelta,
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
          manaDelta: normalize(data.mana),
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
          ...(data.mana !== undefined ? { manaDelta: normalize(data.mana) } : {}),
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
   * Aplica un comportamiento a un estudiante. Es el lote de uno: misma
   * transacción, mismos saldos atómicos y mismas insignias que el de varios.
   */
  async applyBehavior(userId: string, classId: string, behaviorId: string, studentId: string) {
    await assertClassAccess(classId, userId, 'behavior.apply')
    return prisma.$transaction(async tx => {
      const ctx = await classroomContext(tx, classId, userId)
      const behavior = await findBehavior(tx, classId, behaviorId)
      const [enrollment] = await classroomEnrollments(tx, classId, [studentId])
      const [result] = await applyBehaviorToMany(tx, ctx, behavior, [enrollment])
      return {
        application: result.application,
        enrollment: { studentId, classId, ...result.balances },
      }
    })
  }

  /**
   * Aplica un comportamiento a varios estudiantes de una vez: todo o nada, en
   * una transacción. Cada uno queda en el historial con el mismo `batchId`,
   * que la pantalla agrupa en una sola línea.
   */
  async applyBehaviorMany(
    userId: string,
    classId: string,
    behaviorId: string,
    studentIds: string[]
  ) {
    await assertClassAccess(classId, userId, 'behavior.apply')
    return prisma.$transaction(
      async tx => {
        const ctx = await classroomContext(tx, classId, userId)
        const behavior = await findBehavior(tx, classId, behaviorId)
        const enrollments = await classroomEnrollments(tx, classId, studentIds)
        const batchId = randomUUID()
        const results = await applyBehaviorToMany(tx, ctx, behavior, enrollments, { batchId })
        return batchResponse(batchId, behavior.kind, results)
      },
      { timeout: BATCH_TIMEOUT_MS }
    )
  }

  /**
   * Recompensa libre: XP, monedas, maná o vidas a mano, con signo (dar o
   * quitar) y un motivo, a uno o a varios estudiantes. Se guarda como una
   * aplicación sin plantilla (`kind = 'reward'`, el motivo en `name`), así que
   * saldos, muro e historial siguen teniendo una sola fuente.
   */
  async grantRewards(userId: string, classId: string, input: RewardInput) {
    await assertClassAccess(classId, userId, 'reward.grant')
    return prisma.$transaction(
      async tx => {
        const ctx = await classroomContext(tx, classId, userId)
        const deltas = effectiveDeltas(ctx.settings, {
          xp: input.xp ?? 0,
          coins: input.coins ?? 0,
          mana: input.mana ?? 0,
          lives: input.lives ?? 0,
        })
        if (!deltas.xp && !deltas.coins && !deltas.mana && !deltas.lives) {
          throw new ValidationError('La recompensa no mueve ningún recurso activo en esta clase')
        }
        const enrollments = await classroomEnrollments(tx, classId, input.studentIds)
        const batchId = randomUUID()
        const results = await applyDeltasToMany(tx, ctx, enrollments, deltas, {
          kind: 'reward',
          title: input.reason.trim(),
          behaviorId: null,
          batchId,
        })
        return batchResponse(batchId, 'reward', results)
      },
      { timeout: BATCH_TIMEOUT_MS }
    )
  }
}

// ---- Núcleo de recursos ----

/** Tope de estudiantes por lote. Cabe una clase entera con margen. */
export const BATCH_MAX = 200
/** Un lote de 200 hace unas pocas consultas por estudiante: tiempo de sobra. */
export const BATCH_TIMEOUT_MS = 30_000

export interface ResourceDeltas {
  xp: number
  coins: number
  mana: number
  lives: number
}

interface RewardInput {
  studentIds: string[]
  xp?: number
  coins?: number
  mana?: number
  lives?: number
  reason: string
}

/** Lo que se lee una vez por petición: quién actúa y cómo está la clase. */
export interface ClassroomContext extends WritableClass {
  classId: string
  actorId: string
  actorName: string | null
}

type Tx = Prisma.TransactionClient

/** Matrícula sobre la que se reparte: la justa para el muro del estudiante. */
export interface ClassroomEnrollment {
  id: string
  studentId: string
  nickname: string | null
  avatarUrl: string | null
}

export interface DeltaRecord {
  /** `positive`/`negative` de una plantilla, o `reward` en la recompensa libre. */
  kind: string
  /** Nombre de la plantilla o motivo de la recompensa: va en `title`, nunca en `name`. */
  title: string
  behaviorId: string | null
  batchId?: string
  /** El premio de equipo del que sale el reparto, si viene de uno. */
  teamAwardId?: string
  /**
   * La línea que encabeza el lote en el historial es otra (la del premio de
   * equipo): las de cada estudiante van todas dentro de ella.
   */
  batchHeadElsewhere?: boolean
}

/**
 * Contexto de la petición: la clase tiene que estar viva (ni archivada ni en la
 * papelera) y sus ajustes y niveles se leen aquí, una vez.
 */
export async function classroomContext(
  tx: Tx,
  classId: string,
  actorId: string
): Promise<ClassroomContext> {
  const cls = await assertClassWritable(classId, tx)
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { name: true } })
  return { ...cls, classId, actorId, actorName: actor?.name ?? null }
}

/**
 * Matrículas de esos estudiantes en la clase, sin la vista previa del
 * profesorado y en el orden pedido. Si alguno no está, no se hace nada: el lote
 * es todo o nada.
 */
export async function classroomEnrollments(
  tx: Tx,
  classId: string,
  studentIds: string[]
): Promise<ClassroomEnrollment[]> {
  const ids = [...new Set(studentIds)]
  if (ids.length === 0) throw new ValidationError('Elige al menos a un estudiante')
  if (ids.length > BATCH_MAX) throw new ValidationError(`Como mucho ${BATCH_MAX} estudiantes a la vez`)
  const rows = await tx.classEnrollment.findMany({
    where: { classId, isPreview: false, studentId: { in: ids } },
    select: { id: true, studentId: true, nickname: true, avatarUrl: true },
  })
  if (rows.length !== ids.length) {
    throw new ValidationError('Alguna de esas cuentas no está en esta clase')
  }
  const byStudent = new Map(rows.map(r => [r.studentId, r]))
  return ids.map(id => byStudent.get(id)!)
}

export async function findBehavior(tx: Tx, classId: string, behaviorId: string) {
  const behavior = await tx.behaviorTemplate.findFirst({ where: { id: behaviorId, classId } })
  if (!behavior) throw new NotFoundError('El comportamiento no existe')
  return behavior
}

/** Los deltas que de verdad se aplican: los recursos desactivados en la clase no se tocan. */
export function effectiveDeltas(
  settings: ClassroomContext['settings'],
  raw: ResourceDeltas
): ResourceDeltas {
  return {
    xp: settings.xp ? raw.xp : 0,
    coins: settings.coins ? raw.coins : 0,
    mana: settings.mana ? raw.mana : 0,
    lives: settings.lives ? raw.lives : 0,
  }
}

/** Deltas con signo de una plantilla, sin los recursos apagados en la clase. */
export function behaviorDeltas(
  ctx: ClassroomContext,
  behavior: { kind: string; xpDelta: number; coinDelta: number; manaDelta: number; lifeDelta: number }
): ResourceDeltas {
  const sign = behavior.kind === 'positive' ? 1 : -1
  return effectiveDeltas(ctx.settings, {
    xp: behavior.xpDelta * sign,
    coins: behavior.coinDelta * sign,
    mana: behavior.manaDelta * sign,
    lives: behavior.lifeDelta * sign,
  })
}

/**
 * Aplica una plantilla a varios estudiantes dentro de la transacción de quien
 * llama. Lo usan el lote, la aplicación suelta y el reparto de un premio de
 * equipo. Sin comprobación de acceso: la hace quien llama.
 */
export async function applyBehaviorToMany(
  tx: Tx,
  ctx: ClassroomContext,
  behavior: {
    id: string
    kind: string
    name: string
    xpDelta: number
    coinDelta: number
    manaDelta: number
    lifeDelta: number
  },
  enrollments: ClassroomEnrollment[],
  opts: Pick<DeltaRecord, 'batchId' | 'teamAwardId' | 'batchHeadElsewhere'> = {}
) {
  if (!ctx.settings.behaviors) {
    throw new ValidationError('Los comportamientos están desactivados en esta clase')
  }
  return applyDeltasToMany(tx, ctx, enrollments, behaviorDeltas(ctx, behavior), {
    kind: behavior.kind,
    title: behavior.name,
    behaviorId: behavior.id,
    ...opts,
  })
}

/**
 * Reparte unos deltas ya firmados: saldos con incrementos atómicos y suelo 0
 * (por `applyXpDelta`, que además recalcula el nivel y da las insignias del
 * sistema), una aplicación por estudiante, su entrada en el muro y su línea en
 * el registro de la clase. En un lote, la primera línea lleva el tamaño y las
 * demás se marcan como parte de él, para que el historial las agrupe.
 */
export async function applyDeltasToMany(
  tx: Tx,
  ctx: ClassroomContext,
  enrollments: ClassroomEnrollment[],
  deltas: ResourceDeltas,
  record: DeltaRecord
) {
  // Las filas se bloquean (el UPDATE de `applyXpDelta`) siempre en el mismo
  // orden, por id de estudiante: dos lotes a la vez con la misma gente en otro
  // orden esperan uno al otro en vez de bloquearse mutuamente. La respuesta
  // conserva el orden pedido.
  const order = [...enrollments.keys()].sort((a, b) =>
    enrollments[a].studentId < enrollments[b].studentId ? -1 : 1
  )
  const results: DeltaResult[] = new Array(enrollments.length)
  // Una recompensa libre que no suma nada solo quita: el muro no la llama recompensa.
  const takesOnly = !(deltas.xp > 0 || deltas.coins > 0 || deltas.mana > 0 || deltas.lives > 0)
  for (const index of order) {
    const enrollment = enrollments[index]
    const { balances } = await applyXpDelta({
      tx,
      studentId: enrollment.studentId,
      classId: ctx.classId,
      delta: deltas.xp,
      coinsDelta: deltas.coins,
      manaDelta: deltas.mana,
      livesDelta: deltas.lives,
      allowNegativeBalances: true,
      levelConfig: ctx.levelConfig,
    })

    const application = await tx.behaviorApplication.create({
      data: {
        classId: ctx.classId,
        behaviorId: record.behaviorId,
        teacherId: ctx.actorId,
        studentId: enrollment.studentId,
        kind: record.kind,
        name: record.title,
        xpDelta: deltas.xp,
        coinDelta: deltas.coins,
        manaDelta: deltas.mana,
        lifeDelta: deltas.lives,
        teamAwardId: record.teamAwardId ?? null,
      },
    })

    const signed = {
      xpDelta: deltas.xp,
      coinDelta: deltas.coins,
      manaDelta: deltas.mana,
      lifeDelta: deltas.lives,
    }

    // Entrada en el muro de la clase del estudiante.
    await tx.activity.create({
      data: {
        userId: enrollment.studentId,
        type: 'behavior_applied',
        description:
          record.kind !== 'reward'
            ? `Recibió el comportamiento "${record.title}"`
            : takesOnly
              ? `Se le quitaron recursos: "${record.title}"`
              : `Recibió una recompensa: "${record.title}"`,
        classId: ctx.classId,
        avatar: enrollment.avatarUrl,
        username: enrollment.nickname || 'Estudiante',
        source: record.title,
        xpAmount: deltas.xp,
        actorId: ctx.actorId,
        actorName: ctx.actorName,
        metadata: { kind: record.kind, ...signed },
      },
    })

    const batch = record.batchId
      ? index === 0 && !record.batchHeadElsewhere
        ? { batchId: record.batchId, batchSize: enrollments.length }
        : { batchId: record.batchId, batchMember: true }
      : {}
    await recordClassAction(tx, {
      classId: ctx.classId,
      actorId: ctx.actorId,
      action: record.kind === 'reward' ? 'reward.granted' : 'behavior.applied',
      entityType: record.kind === 'reward' ? 'reward' : 'behavior',
      entityId: record.behaviorId ?? application.id,
      targetUserId: enrollment.studentId,
      metadata: {
        title: record.title,
        kind: record.kind,
        ...signed,
        ...batch,
        ...(record.teamAwardId ? { teamAwardId: record.teamAwardId } : {}),
      },
    })

    results[index] = {
      studentId: enrollment.studentId,
      balances,
      application: {
        id: application.id,
        behaviorId: application.behaviorId,
        studentId: application.studentId,
        kind: application.kind as 'positive' | 'negative' | 'reward',
        name: application.name,
        ...signed,
        createdAt: application.createdAt.toISOString(),
      },
    }
  }
  return results
}

export interface DeltaResult {
  studentId: string
  balances: Awaited<ReturnType<typeof applyXpDelta>>['balances']
  application: {
    id: string
    behaviorId: string | null
    studentId: string
    kind: 'positive' | 'negative' | 'reward'
    name: string
    xpDelta: number
    coinDelta: number
    manaDelta: number
    lifeDelta: number
    createdAt: string
  }
}

/** Respuesta de un lote: los deltas aplicados (iguales para todos) y los saldos nuevos de cada cual. */
export function batchResponse(batchId: string, kind: string, results: DeltaResult[]) {
  const first = results[0]?.application
  return {
    batchId,
    kind,
    count: results.length,
    deltas: {
      xp: first?.xpDelta ?? 0,
      coins: first?.coinDelta ?? 0,
      mana: first?.manaDelta ?? 0,
      lives: first?.lifeDelta ?? 0,
    },
    students: results.map(r => ({ studentId: r.studentId, ...r.balances })),
  }
}

export const behaviorsService = new BehaviorsService()
