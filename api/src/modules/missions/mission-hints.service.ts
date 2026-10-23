import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import {
  assertMissionAccess,
  assertMissionMember,
  recordClassAction,
  type ClassUser,
} from '../../utils/class-access.js'
import { assertClassWritable } from '../../utils/class-writable.js'
import { resolveClassSettings, type ClassSettings } from '../../utils/class-settings.js'
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors.js'
import {
  HINT_LIMITS,
  clipHintContent,
  effectiveHintCost,
  hintPenaltyFrom,
  normalizeHintCost,
  type HintCostType,
} from '../../utils/mission-hints.js'
import { getLevelFromXP } from '../../utils/xp-calculator.js'

/**
 * Pistas de las misiones (E1). El profesorado las escribe, las ordena y les pone
 * un coste; el alumnado las usa de una en una, en ese orden, y paga al usarlas.
 * Lo que se cobra y cuánto descuenta cada pista de % está en
 * `utils/mission-hints.ts`; aquí van los permisos, el orden, el cobro y lo que
 * ve cada cual.
 *
 * Lo que no se filtra: del lado del alumno, el texto de una pista solo sale si
 * ya la ha usado. El GET de la misión lo decide aquí, nunca el navegador. El
 * profesorado la ve entera, también desde la vista previa, y por eso desde la
 * vista previa no se usan pistas.
 */

type Db = Prisma.TransactionClient

/** Orden de las pistas: el que fija el profesorado; a igualdad, la más antigua primero. */
const HINT_ORDER: Prisma.MissionHintOrderByWithRelationInput[] = [
  { orderIndex: 'asc' },
  { createdAt: 'asc' },
  { id: 'asc' },
]

/** Una pista tal como la ve el profesorado. `position` empieza en 1. */
export interface TeacherHintView {
  id: string
  position: number
  content: string
  costType: HintCostType
  cost: number
  /** Quién la ha usado ya: una pista usada no se borra. */
  usedCount: number
}

/** Una pista tal como la ve el alumnado: el texto, solo si ya la ha usado. */
export interface StudentHintView {
  id: string
  position: number
  costType: HintCostType
  /** Lo que costó (si ya la usó) o lo que cuesta ahora en esta clase (0 si el recurso está apagado). */
  cost: number
  used: boolean
  content: string | null
  /** Es la siguiente que se puede usar: las pistas van en orden. */
  isNext: boolean
}

/** Lo que el alumnado necesita junto a las pistas para decidir si usa la siguiente. */
export interface StudentHintState {
  /** % que restan ya sus pistas de % en lo que la misión le queda por pagar (tope 100). */
  penalty: number
  /** Puede usar pistas: la misión sigue en curso. */
  canUse: boolean
  /** Por qué no, si no puede. */
  closedReason: 'completed' | 'expired' | null
  /** Saldo de monedas y XP en la clase, para el resumen junto al botón. */
  coins: number
  xp: number
}

function teacherView(
  hint: { id: string; content: string; costType: string; cost: number },
  position: number,
  usedCount: number
): TeacherHintView {
  const { costType, cost } = normalizeHintCost(hint.costType, hint.cost)
  return { id: hint.id, position, content: hint.content, costType, cost, usedCount }
}

/**
 * Los usos que cuentan en la clase de la misión: los de quien está matriculado en
 * ella. Si la misión se ha movido de clase, los de la clase de antes se quedan
 * guardados, como su progreso, pero ni se cuentan aquí ni impiden borrar la pista.
 */
const usesInClass = (classId: string): Prisma.MissionHintUseWhereInput => ({
  student: { enrollments: { some: { classId } } },
})

/** Las pistas de una misión para su profesorado, con cuántos estudiantes de la clase ha usado cada una. */
export async function teacherHints(
  missionId: string,
  classId: string,
  db: Db = prisma
): Promise<TeacherHintView[]> {
  const [hints, counts] = await Promise.all([
    db.missionHint.findMany({ where: { missionId }, orderBy: HINT_ORDER }),
    db.missionHintUse.groupBy({
      by: ['hintId'],
      where: { missionId, ...usesInClass(classId) },
      _count: { _all: true },
    }),
  ])
  const used = new Map(counts.map(row => [row.hintId, row._count._all]))
  return hints.map((hint, index) => teacherView(hint, index + 1, used.get(hint.id) ?? 0))
}

/** Si la misión sigue en curso para esta persona: ni completada ni caducada. */
function closedReasonFor(
  mission: { deadline: Date | null },
  completedAt: Date | null | undefined,
  now = new Date()
): StudentHintState['closedReason'] {
  if (completedAt) return 'completed'
  if (mission.deadline && mission.deadline < now) return 'expired'
  return null
}

/**
 * Las pistas de una misión para un estudiante y su estado. Con `db` dentro de
 * una transacción, lo que acaba de cambiar ya cuenta.
 */
export async function studentHints(
  input: {
    missionId: string
    deadline: Date | null
    studentId: string
    enrollmentId: string
    settings: Pick<ClassSettings, 'coins' | 'xp'>
  },
  db: Db = prisma
): Promise<{ hints: StudentHintView[]; hintState: StudentHintState }> {
  const { missionId, studentId } = input
  const hints = await db.missionHint.findMany({ where: { missionId }, orderBy: HINT_ORDER })
  const uses = await db.missionHintUse.findMany({
    where: { missionId, studentId },
    select: { hintId: true, costType: true, cost: true },
  })
  const progress = await db.studentMissionProgress.findUnique({
    where: { studentId_missionId: { studentId, missionId } },
    select: { completedAt: true },
  })
  const wallet = await db.classEnrollment.findUnique({
    where: { id: input.enrollmentId },
    select: { coins: true, xp: true },
  })

  const usedById = new Map(uses.map(use => [use.hintId, use]))
  const next = hints.find(hint => !usedById.has(hint.id))
  const closedReason = closedReasonFor(input, progress?.completedAt)

  return {
    hints: hints.map((hint, index) => {
      const use = usedById.get(hint.id)
      const current = normalizeHintCost(hint.costType, hint.cost)
      return {
        id: hint.id,
        position: index + 1,
        // Una usada enseña lo que costó entonces; las demás, lo que cuestan hoy.
        costType: use ? normalizeHintCost(use.costType, use.cost).costType : current.costType,
        cost: use ? use.cost : effectiveHintCost(hint, input.settings),
        used: !!use,
        content: use ? hint.content : null,
        isNext: next?.id === hint.id,
      }
    }),
    hintState: {
      penalty: hintPenaltyFrom(uses),
      canUse: closedReason === null && !!next,
      closedReason,
      coins: wallet?.coins ?? 0,
      xp: wallet?.xp ?? 0,
    },
  }
}

/** Bloquea la misión hasta confirmar: dos pistas nuevas a la vez no pasan las dos del tope. */
async function lockMission(tx: Db, missionId: string) {
  await tx.$queryRaw`SELECT id FROM missions WHERE id = ${missionId} FOR NO KEY UPDATE`
}

/**
 * Una persona, una operación a la vez: con la matrícula bloqueada, usar una
 * pista, comprar en la tienda, aprobarle una entrega o sacarla de la clase no se
 * solapan (todas bloquean la misma fila). Si la han sacado de la clase mientras
 * tanto, la matrícula ya no está y la misión ya no es suya: 404.
 */
async function lockEnrollment(tx: Db, enrollmentId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM class_enrollments WHERE id = ${enrollmentId} FOR UPDATE`
  if (rows.length === 0) throw new NotFoundError('Misión no encontrada')
}

async function findHint(missionId: string, hintId: string, db: Db = prisma) {
  const hint = await db.missionHint.findFirst({ where: { id: hintId, missionId } })
  if (!hint) throw new NotFoundError('Pista no encontrada')
  return hint
}

/** La posición (desde 1) de una pista en el orden de su misión. */
async function positionOf(db: Db, missionId: string, hintId: string): Promise<number> {
  const ids = await db.missionHint.findMany({
    where: { missionId },
    orderBy: HINT_ORDER,
    select: { id: true },
  })
  return ids.findIndex(row => row.id === hintId) + 1
}

/** Lo que llega del coste de una pista: tal cual, se acota con `normalizeHintCost`. */
export interface HintCostInput {
  costType?: string | null
  cost?: number | string | null
}

/** Datos de una pista que llegan del editor. */
export interface HintInput extends HintCostInput {
  content?: string
}

function readContent(content: string | undefined): string {
  const clean = clipHintContent(content ?? '')
  if (!clean) throw new ValidationError('Escribe el texto de la pista', 'HINT_CONTENT_REQUIRED')
  return clean
}

export async function createHint(userId: string, missionId: string, data: HintInput) {
  const { classId } = await assertMissionAccess(missionId, userId, 'mission.edit')
  const content = readContent(data.content)
  const { costType, cost } = normalizeHintCost(data.costType, data.cost)

  const created = await prisma.$transaction(async tx => {
    await lockMission(tx, missionId)
    const mission = await tx.mission.findUnique({ where: { id: missionId }, select: { title: true } })
    if (!mission) throw new NotFoundError('Misión no encontrada')
    const existing = await tx.missionHint.findMany({
      where: { missionId },
      select: { orderIndex: true },
    })
    if (existing.length >= HINT_LIMITS.perMission) {
      throw new ConflictError(
        `Una misión puede tener hasta ${HINT_LIMITS.perMission} pistas`,
        'HINT_LIMIT'
      )
    }
    const orderIndex = existing.reduce((max, row) => Math.max(max, row.orderIndex + 1), 0)
    const hint = await tx.missionHint.create({
      data: { missionId, content, costType, cost, orderIndex },
    })
    const position = existing.length + 1
    await recordClassAction(tx, {
      classId,
      actorId: userId,
      action: 'hint.created',
      entityType: 'hint',
      entityId: hint.id,
      metadata: { title: mission.title, missionId, position, costType, cost },
    })
    return teacherView(hint, position, 0)
  })

  return { hint: created, message: 'Pista añadida' }
}

export async function updateHint(
  userId: string,
  missionId: string,
  hintId: string,
  data: HintInput
) {
  const { classId } = await assertMissionAccess(missionId, userId, 'mission.edit')
  const hint = await findHint(missionId, hintId)
  // Lo que no llega se queda como está. El coste nuevo vale para quien la use a
  // partir de ahora: cada uso guarda lo que costó.
  const content = data.content !== undefined ? readContent(data.content) : hint.content
  const { costType, cost } = normalizeHintCost(
    data.costType ?? hint.costType,
    data.cost ?? hint.cost
  )
  const fields = [
    ...(content !== hint.content ? ['content'] : []),
    ...(costType !== hint.costType || cost !== hint.cost ? ['cost'] : []),
  ]

  const saved = await prisma.$transaction(async tx => {
    const updated = await tx.missionHint.update({
      where: { id: hintId },
      data: { content, costType, cost },
    })
    const [mission, position, usedCount] = await Promise.all([
      tx.mission.findUnique({ where: { id: missionId }, select: { title: true } }),
      positionOf(tx, missionId, hintId),
      tx.missionHintUse.count({ where: { hintId, ...usesInClass(classId) } }),
    ])
    if (fields.length > 0) {
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'hint.updated',
        entityType: 'hint',
        entityId: hintId,
        metadata: { title: mission?.title ?? '', missionId, position, fields, costType, cost },
      })
    }
    return teacherView(updated, position, usedCount)
  })

  return { hint: saved, message: 'Pista actualizada' }
}

export async function deleteHint(userId: string, missionId: string, hintId: string) {
  const { classId } = await assertMissionAccess(missionId, userId, 'mission.edit')
  await findHint(missionId, hintId)
  const used = new ConflictError(
    'No se puede borrar una pista que alguien ya ha usado: lo ha pagado. Puedes cambiar su texto.',
    'HINT_USED'
  )

  try {
    await prisma.$transaction(async tx => {
      if ((await tx.missionHintUse.count({ where: { hintId, ...usesInClass(classId) } })) > 0) {
        throw used
      }
      // Los usos de quien no está en la clase (la misión venía de otra) se van
      // con la pista. Uno de alguien de la clase que llegue ahora no: la base
      // no deja borrarla y se responde lo de arriba.
      await tx.missionHintUse.deleteMany({ where: { hintId, NOT: usesInClass(classId) } })
      const [mission, position] = await Promise.all([
        tx.mission.findUnique({ where: { id: missionId }, select: { title: true } }),
        positionOf(tx, missionId, hintId),
      ])
      await tx.missionHint.delete({ where: { id: hintId } })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'hint.deleted',
        entityType: 'hint',
        entityId: hintId,
        metadata: { title: mission?.title ?? '', missionId, position },
      })
    })
  } catch (error) {
    // Un uso que llega a la vez que el borrado: la base no deja borrarla (la
    // clave del uso no tiene cascada) y se responde lo mismo que si ya se viera.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw used
    throw error
  }

  return { message: 'Pista eliminada' }
}

export async function reorderHints(userId: string, missionId: string, hintIds: string[]) {
  const { classId } = await assertMissionAccess(missionId, userId, 'mission.edit')

  await prisma.$transaction(async tx => {
    // Solo se reordena lo que es de esta misión: un id de otra no cambia nada.
    let moved = 0
    for (const [index, id] of hintIds.entries()) {
      const result = await tx.missionHint.updateMany({
        where: { id, missionId },
        data: { orderIndex: index },
      })
      moved += result.count
    }
    if (moved === 0) return
    const mission = await tx.mission.findUnique({ where: { id: missionId }, select: { title: true } })
    await recordClassAction(tx, {
      classId,
      actorId: userId,
      action: 'hint.reordered',
      entityType: 'mission',
      entityId: missionId,
      metadata: { title: mission?.title ?? '', missionId },
    })
  })

  return {
    hints: await teacherHints(missionId, classId),
    message: 'Orden actualizado correctamente',
  }
}

/**
 * Un estudiante usa una pista de una misión: la siguiente que le queda, con la
 * misión en curso, pagando su coste. Todo en una transacción y con su matrícula
 * bloqueada: el uso, el cobro (condicional: sin saldo no se cobra ni se usa) y
 * la entrada en su muro. Sin ventana de confirmar: el coste y su saldo se ven
 * junto al botón, y al pulsarlo se aplica. Por eso llega lo que se veía
 * (`seen`): si el profesorado ha cambiado el coste mientras tanto, no se cobra
 * otra cosa, sino que se responde 409 y se enseña el nuevo.
 */
export async function useHint(
  user: ClassUser,
  missionId: string,
  hintId: string,
  seen: HintCostInput = {}
) {
  // Al alumno, una misión bloqueada o de una clase archivada no le existe (404).
  const membership = await assertMissionMember(missionId, user)
  await findHint(missionId, hintId)
  if (membership.teacher) {
    throw new ConflictError(
      'Desde la vista previa se ven todas las pistas abiertas; para usarlas hace falta una cuenta de estudiante',
      'HINT_PREVIEW'
    )
  }
  const enrollment = membership.enrollment
  if (!enrollment) throw new NotFoundError('Misión no encontrada')
  const studentId = user.id
  const { classId } = membership

  try {
    return await prisma.$transaction(async tx => {
      const cls = await assertClassWritable(classId, tx)
      await lockEnrollment(tx, enrollment.id)

      const mission = await tx.mission.findUnique({
        where: { id: missionId },
        select: { title: true, status: true, deadline: true, class: { select: { name: true } } },
      })
      if (!mission || mission.status === 'bloqueada') throw new NotFoundError('Misión no encontrada')
      // Dentro de la transacción: una aprobación que completa la misión a la
      // vez bloquea la misma matrícula, así que aquí ya se ve completada.
      const progress = await tx.studentMissionProgress.findUnique({
        where: { studentId_missionId: { studentId, missionId } },
        select: { completedAt: true },
      })
      const closed = closedReasonFor(mission, progress?.completedAt)
      if (closed === 'completed') {
        throw new ConflictError(
          'Ya has completado la misión: sus pistas ya no hacen falta',
          'HINT_MISSION_COMPLETED'
        )
      }
      if (closed === 'expired') {
        throw new ConflictError(
          'La misión ha caducado: ya no se pueden usar sus pistas',
          'HINT_MISSION_EXPIRED'
        )
      }

      const hints = await tx.missionHint.findMany({ where: { missionId }, orderBy: HINT_ORDER })
      const used = new Set(
        (
          await tx.missionHintUse.findMany({
            where: { missionId, studentId },
            select: { hintId: true },
          })
        ).map(use => use.hintId)
      )
      const index = hints.findIndex(hint => hint.id === hintId)
      const hint = hints[index]
      if (!hint) throw new NotFoundError('Pista no encontrada')
      if (used.has(hintId)) throw new ConflictError('Ya tienes esta pista', 'HINT_ALREADY_USED')
      // En orden: solo la primera que aún no ha usado, en el orden de ahora.
      const next = hints.find(h => !used.has(h.id))
      if (next?.id !== hintId) {
        throw new ConflictError('Usa antes la pista anterior', 'HINT_NOT_NEXT')
      }

      const { costType } = normalizeHintCost(hint.costType, hint.cost)
      const cost = effectiveHintCost(hint, cls.settings)

      // Lo que se veía junto al botón tiene que ser lo que se cobra: si el
      // profesorado ha cambiado el coste o el tipo (o la clase, sus recursos),
      // no se cobra nada y se vuelve a enseñar.
      if (seen.costType != null || seen.cost != null) {
        const shown = normalizeHintCost(seen.costType ?? costType, seen.cost ?? cost)
        if (shown.costType !== costType || shown.cost !== cost) {
          throw new ConflictError(
            'El coste de esta pista acaba de cambiar: mira el nuevo antes de usarla',
            'HINT_COST_CHANGED'
          )
        }
      }

      // Cobro condicional: si no llega el saldo, no cambia nada y se deshace todo.
      if (cost > 0 && costType === 'coins') {
        const charged = await tx.classEnrollment.updateMany({
          where: { id: enrollment.id, coins: { gte: cost } },
          data: { coins: { decrement: cost } },
        })
        if (charged.count === 0) {
          throw new ConflictError('No tienes monedas suficientes', 'HINT_NOT_ENOUGH_COINS')
        }
      } else if (cost > 0 && costType === 'xp') {
        const charged = await tx.classEnrollment.updateMany({
          where: { id: enrollment.id, xp: { gte: cost } },
          data: { xp: { decrement: cost } },
        })
        if (charged.count === 0) {
          throw new ConflictError('No tienes XP suficiente', 'HINT_NOT_ENOUGH_XP')
        }
        // Pagar con XP puede bajar de nivel, como un comportamiento negativo. Las
        // insignias ya ganadas no se quitan.
        const wallet = await tx.classEnrollment.findUniqueOrThrow({
          where: { id: enrollment.id },
          select: { xp: true, level: true },
        })
        const level = getLevelFromXP(wallet.xp, cls.levelConfig)
        if (level !== wallet.level) {
          await tx.classEnrollment.update({ where: { id: enrollment.id }, data: { level } })
        }
      }

      await tx.missionHintUse.create({ data: { hintId, missionId, studentId, costType, cost } })

      const profile = await tx.classEnrollment.findUniqueOrThrow({
        where: { id: enrollment.id },
        select: { avatarUrl: true, nickname: true },
      })
      const position = index + 1
      await tx.activity.create({
        data: {
          userId: studentId,
          type: 'hint_used',
          description: `Has usado la pista ${position} de "${mission.title}"`,
          avatar: profile.avatarUrl,
          username: profile.nickname || 'Estudiante',
          classId,
          className: mission.class.name,
          missionTitle: mission.title,
          metadata: { missionId, hintId, position, costType, cost },
        },
      })

      return studentHints(
        {
          missionId,
          deadline: mission.deadline,
          studentId,
          enrollmentId: enrollment.id,
          settings: cls.settings,
        },
        tx
      )
    })
  } catch (error) {
    // Dos usos de la misma pista: el segundo espera al primero y ya la ve usada;
    // el único (pista, estudiante) es la última red.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Ya tienes esta pista', 'HINT_ALREADY_USED')
    }
    throw error
  }
}

/** Las pistas que van en el GET de una misión, según quién la mira. */
export async function missionHintsFor(input: {
  isTeacher: boolean
  missionId: string
  classId: string
  deadline: Date | null
  studentId: string
  enrollmentId: string | null
  settings: unknown
}): Promise<{
  hints: TeacherHintView[] | StudentHintView[]
  hintState: StudentHintState | null
}> {
  if (input.isTeacher || !input.enrollmentId) {
    return {
      hints: input.isTeacher ? await teacherHints(input.missionId, input.classId) : [],
      hintState: null,
    }
  }
  return studentHints({
    missionId: input.missionId,
    deadline: input.deadline,
    studentId: input.studentId,
    enrollmentId: input.enrollmentId,
    settings: resolveClassSettings(input.settings),
  })
}
