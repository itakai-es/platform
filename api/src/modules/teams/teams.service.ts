import { randomUUID } from 'node:crypto'
import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { assertClassAccess, recordClassAction } from '../../utils/class-access.js'
import { assertClassWritable } from '../../utils/class-writable.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { participatingEnrollmentWhere } from '../../utils/enrollment.js'
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors.js'
import { deal } from '../../utils/shuffle.js'
import { missingStudentIdsOn } from '../attendance/attendance.service.js'
import {
  BATCH_MAX,
  BATCH_TIMEOUT_MS,
  applyBehaviorToMany,
  applyDeltasToMany,
  batchResponse,
  behaviorDeltas,
  classroomContext,
  effectiveDeltas,
  findBehavior,
  type ClassroomEnrollment,
  type ResourceDeltas,
} from '../behaviors/behaviors.service.js'

/**
 * Equipos de una clase. Una agrupación (`TeamSet`) reparte la clase en equipos;
 * puede haber varias a la vez: las de base, fijas, que puntúan en la
 * clasificación, y temporales para una misión o una dinámica, que se archivan
 * al acabar. Nadie está en dos equipos de la misma agrupación.
 *
 * Premiar a un equipo apunta un `TeamAward` (sus puntos suman al marcador) y,
 * si se elige, reparte el comportamiento o la recompensa a cada integrante por
 * el mismo lote de los comportamientos, en la misma transacción.
 *
 * Los ve todo el profesorado de la clase; formarlos y cambiarlos (`team.manage`)
 * y premiarlos (`team.award`) es de quien edita. La vista previa del
 * profesorado nunca entra en un equipo; las cuentas sin correo que aún no han
 * entrado, sí (el primer día se forman los equipos), pero no salen en lo que ve
 * el resto del alumnado.
 */

/** Paleta de los equipos: claves de los tokens de color, que responden a los modos de daltonismo. */
export const TEAM_COLORS = ['purple', 'yellow', 'mint', 'sky', 'red', 'peach'] as const
/** Emblemas predefinidos: el color nunca es la única pista. */
export const TEAM_EMBLEMS = [
  'star',
  'bolt',
  'fire',
  'shield',
  'rocket',
  'heart',
  'sun',
  'moon',
  'sparkles',
  'globe',
  'puzzle',
  'trophy',
] as const
export const TEAM_SET_KINDS = ['base', 'temporal'] as const

/** Tope de equipos por agrupación. */
export const MAX_TEAMS = 30
/** Tope de puntos de un premio, en positivo o en negativo. */
export const MAX_POINTS = 1000

type Tx = Prisma.TransactionClient
type TeamColor = (typeof TEAM_COLORS)[number]
type TeamEmblem = (typeof TEAM_EMBLEMS)[number]

export interface TeamInput {
  /** Equipo que ya existe en la agrupación; sin él, se crea. */
  id?: string
  title: string
  color?: TeamColor | null
  emblem?: TeamEmblem | null
  studentIds: string[]
}

export interface TeamSetInput {
  title: string
  kind: (typeof TEAM_SET_KINDS)[number]
  teams: TeamInput[]
}

/** Lo que cambia de la agrupación misma: nombre, tipo y archivo. */
export interface TeamSetChanges {
  title?: string
  kind?: TeamSetInput['kind']
  archived?: boolean
}

/** Editar una agrupación entera (la ventana de editar): nombre, tipo y equipos a la vez. */
export interface ReplaceTeamsInput extends Omit<TeamSetChanges, 'archived'> {
  teams: TeamInput[]
  /**
   * `updatedAt` de la agrupación tal como la tenía quien edita. Si alguien la ha
   * cambiado después (otro equipo, otro reparto), no se guarda: rehacerla con
   * una copia vieja borraría lo nuevo, con sus puntos.
   */
  updatedAt: string
}

/** Mover personas de equipo dentro de una agrupación (arrastre o teclado). */
export interface MoveMembersInput {
  studentIds: string[]
  /** Equipo de destino; null las deja sin equipo. */
  teamId: string | null
}

export interface ShuffleInput {
  teams?: number
  perTeam?: number
  balanceByLevel?: boolean
  /** Día local de quien reparte: quien falta en la lista de ese día queda fuera. */
  date?: string
  /** Solo entre estos estudiantes (por defecto, toda la clase). */
  studentIds?: string[]
}

export interface TeamAwardInput {
  behaviorId?: string
  /** Motivo, si no es un comportamiento del catálogo. */
  title?: string
  points: number
  /** Repartir también a cada integrante (el comportamiento o los recursos de abajo). */
  distribute: boolean
  xp?: number
  coins?: number
  mana?: number
  lives?: number
}

const setSelect = {
  id: true,
  title: true,
  kind: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  teams: {
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      title: true,
      color: true,
      emblem: true,
      orderIndex: true,
      members: { select: { enrollment: { select: { studentId: true } } } },
    },
  },
} satisfies Prisma.TeamSetSelect

type SetRow = Prisma.TeamSetGetPayload<{ select: typeof setSelect }>

/** Puntos del marcador de cada equipo: la suma de sus premios. */
async function pointsByTeam(db: Tx, teamIds: string[]): Promise<Map<string, number>> {
  if (teamIds.length === 0) return new Map()
  const rows = await db.teamAward.groupBy({
    by: ['teamId'],
    where: { teamId: { in: teamIds } },
    _sum: { points: true },
  })
  return new Map(rows.map(r => [r.teamId, r._sum.points ?? 0]))
}

function formatSet(set: SetRow, points: Map<string, number>) {
  return {
    id: set.id,
    title: set.title,
    kind: set.kind as 'base' | 'temporal',
    archived: !!set.archivedAt,
    archivedAt: set.archivedAt?.toISOString() ?? null,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
    teams: set.teams.map(t => ({
      id: t.id,
      title: t.title,
      color: t.color,
      emblem: t.emblem,
      points: points.get(t.id) ?? 0,
      studentIds: t.members.map(m => m.enrollment.studentId),
    })),
  }
}

async function readSet(db: Tx, setId: string) {
  const set = await db.teamSet.findUniqueOrThrow({ where: { id: setId }, select: setSelect })
  return formatSet(set, await pointsByTeam(db, set.teams.map(t => t.id)))
}

async function findSet(db: Tx, classId: string, setId: string) {
  const set = await db.teamSet.findFirst({
    where: { id: setId, classId },
    select: { id: true, title: true, kind: true, archivedAt: true },
  })
  if (!set) throw new NotFoundError('Esa agrupación no existe')
  return set
}

/** Matrículas reales (sin la vista previa del profesorado) de la clase, por estudiante. */
async function enrollmentIdsByStudent(db: Tx, classId: string) {
  const rows = await db.classEnrollment.findMany({
    where: { classId, isPreview: false },
    select: { id: true, studentId: true },
  })
  return new Map(rows.map(r => [r.studentId, r.id]))
}

/** Comprueba un reparto completo: títulos, tope de equipos y nadie repetido ni de fuera. */
function checkTeams(teams: TeamInput[], enrollments: Map<string, string>) {
  if (teams.length === 0) throw new ValidationError('Una agrupación necesita al menos un equipo')
  if (teams.length > MAX_TEAMS) {
    throw new ValidationError(`Como mucho ${MAX_TEAMS} equipos por agrupación`)
  }
  const seen = new Set<string>()
  for (const team of teams) {
    for (const studentId of team.studentIds) {
      if (seen.has(studentId)) {
        throw new ValidationError('Hay un estudiante en dos equipos de la misma agrupación')
      }
      seen.add(studentId)
      if (!enrollments.has(studentId)) {
        throw new ValidationError('Alguna de esas cuentas no está en esta clase')
      }
    }
  }
  return seen.size
}

/**
 * Deja la agrupación con estos equipos y este reparto, entero: los equipos con
 * `id` se actualizan, los nuevos se crean y los que no vienen se borran (con
 * sus premios). La pertenencia se rehace de cero.
 */
async function writeTeams(
  tx: Tx,
  setId: string,
  teams: TeamInput[],
  enrollments: Map<string, string>
) {
  const existing = await tx.team.findMany({ where: { setId }, select: { id: true } })
  const existingIds = new Set(existing.map(t => t.id))
  for (const team of teams) {
    if (team.id && !existingIds.has(team.id)) {
      throw new ValidationError('Alguno de esos equipos no es de esta agrupación')
    }
  }
  const kept = new Set(teams.map(t => t.id).filter((id): id is string => !!id))
  await tx.team.deleteMany({ where: { setId, id: { notIn: [...kept] } } })
  await tx.teamMember.deleteMany({ where: { setId } })

  for (const [orderIndex, team] of teams.entries()) {
    const data = {
      title: team.title.trim(),
      color: team.color ?? null,
      emblem: team.emblem ?? null,
      orderIndex,
    }
    const saved = team.id
      ? await tx.team.update({ where: { id: team.id }, data, select: { id: true } })
      : await tx.team.create({ data: { setId, ...data }, select: { id: true } })
    if (team.studentIds.length) {
      await tx.teamMember.createMany({
        data: team.studentIds.map(studentId => ({
          teamId: saved.id,
          setId,
          enrollmentId: enrollments.get(studentId)!,
        })),
      })
    }
  }
}

/**
 * Lo que cambia de una agrupación (para `teamSet.update`) y lo que se apunta en
 * el registro. Vacío si no cambia nada.
 */
function setChanges(
  set: { title: string; kind: string; archivedAt: Date | null },
  input: TeamSetChanges
) {
  const data: Prisma.TeamSetUpdateInput = {}
  const changes: Record<string, string | boolean> = {}
  if (input.title !== undefined && input.title.trim() !== set.title) {
    data.title = input.title.trim()
    changes.renamed = true
  }
  if (input.kind !== undefined && input.kind !== set.kind) {
    data.kind = input.kind
    changes.kind = input.kind
  }
  if (input.archived !== undefined && input.archived !== !!set.archivedAt) {
    data.archivedAt = input.archived ? new Date() : null
    changes.archived = input.archived
  }
  return { data, changes, changed: Object.keys(data).length > 0 }
}

async function recordSetUpdated(
  tx: Tx,
  ids: { classId: string; userId: string; setId: string },
  title: string,
  changes: Record<string, string | boolean>
) {
  await recordClassAction(tx, {
    classId: ids.classId,
    actorId: ids.userId,
    action: 'team.set_updated',
    entityType: 'team_set',
    entityId: ids.setId,
    metadata: { title, ...changes },
  })
}

/**
 * Concurrencia optimista: la agrupación pasa a una versión nueva solo si sigue
 * en la que leyó quien edita. Va en un solo UPDATE condicionado, así que dos
 * guardados a la vez no pueden ganar los dos.
 */
async function claimVersion(
  tx: Tx,
  setId: string,
  updatedAt: string,
  data: Prisma.TeamSetUpdateInput
) {
  const seen = new Date(updatedAt)
  if (Number.isNaN(seen.getTime())) throw new ValidationError('Versión no válida')
  const { count } = await tx.teamSet.updateMany({
    where: { id: setId, updatedAt: seen },
    data: { ...(data as Prisma.TeamSetUpdateManyMutationInput), updatedAt: new Date() },
  })
  if (count === 0) {
    throw new ConflictError(
      'Alguien ha cambiado esta agrupación mientras la editabas. Vuelve a abrirla para ver cómo está.',
      'TEAM_SET_STALE'
    )
  }
}

const ZERO: ResourceDeltas = { xp: 0, coins: 0, mana: 0, lives: 0 }

class TeamsService {
  /** Agrupaciones de la clase, con sus equipos, integrantes y puntos. */
  async listSets(userId: string, classId: string) {
    await assertClassAccess(classId, userId, 'student.view')
    const sets = await prisma.teamSet.findMany({
      where: { classId },
      orderBy: [{ archivedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
      select: setSelect,
    })
    const points = await pointsByTeam(
      prisma,
      sets.flatMap(s => s.teams.map(t => t.id))
    )
    return { sets: sets.map(s => formatSet(s, points)) }
  }

  async createSet(userId: string, classId: string, input: TeamSetInput) {
    await assertClassAccess(classId, userId, 'team.manage')
    return prisma.$transaction(
      async tx => {
        await assertClassWritable(classId, tx)
        const enrollments = await enrollmentIdsByStudent(tx, classId)
        const members = checkTeams(input.teams, enrollments)
        if (input.teams.some(t => t.id)) throw new ValidationError('Los equipos nuevos no llevan id')
        const set = await tx.teamSet.create({
          data: { classId, title: input.title.trim(), kind: input.kind },
          select: { id: true },
        })
        await writeTeams(tx, set.id, input.teams, enrollments)
        await recordClassAction(tx, {
          classId,
          actorId: userId,
          action: 'team.set_created',
          entityType: 'team_set',
          entityId: set.id,
          metadata: { title: input.title.trim(), kind: input.kind, teams: input.teams.length, members },
        })
        return readSet(tx, set.id)
      },
      { timeout: BATCH_TIMEOUT_MS }
    )
  }

  /** Renombrar, cambiar de tipo, archivar o sacar del archivo. */
  async updateSet(userId: string, classId: string, setId: string, input: TeamSetChanges) {
    await assertClassAccess(classId, userId, 'team.manage')
    return prisma.$transaction(async tx => {
      await assertClassWritable(classId, tx)
      const set = await findSet(tx, classId, setId)
      const { data, changes, changed } = setChanges(set, input)
      if (changed) {
        await tx.teamSet.update({ where: { id: setId }, data })
        const title = (data.title as string | undefined) ?? set.title
        await recordSetUpdated(tx, { classId, userId, setId }, title, changes)
      }
      return readSet(tx, setId)
    })
  }

  async deleteSet(userId: string, classId: string, setId: string) {
    await assertClassAccess(classId, userId, 'team.manage')
    await prisma.$transaction(async tx => {
      await assertClassWritable(classId, tx)
      const set = await findSet(tx, classId, setId)
      await tx.teamSet.delete({ where: { id: setId } })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'team.set_deleted',
        entityType: 'team_set',
        entityId: setId,
        metadata: { title: set.title, kind: set.kind },
      })
    })
    return { success: true }
  }

  /**
   * Edita la agrupación entera en una transacción: nombre y tipo, y sus equipos
   * y el reparto completo. Solo si nadie la ha cambiado desde que se leyó
   * (`updatedAt`); si no, 409 y no cambia nada.
   */
  async replaceTeams(userId: string, classId: string, setId: string, input: ReplaceTeamsInput) {
    await assertClassAccess(classId, userId, 'team.manage')
    return prisma.$transaction(
      async tx => {
        await assertClassWritable(classId, tx)
        const set = await findSet(tx, classId, setId)
        if (set.archivedAt) {
          throw new ValidationError('La agrupación está archivada: sácala del archivo para cambiarla')
        }
        const { data, changes, changed } = setChanges(set, input)
        await claimVersion(tx, setId, input.updatedAt, data)
        const enrollments = await enrollmentIdsByStudent(tx, classId)
        const members = checkTeams(input.teams, enrollments)
        await writeTeams(tx, setId, input.teams, enrollments)
        const title = (data.title as string | undefined) ?? set.title
        if (changed) await recordSetUpdated(tx, { classId, userId, setId }, title, changes)
        await recordClassAction(tx, {
          classId,
          actorId: userId,
          action: 'team.members_changed',
          entityType: 'team_set',
          entityId: setId,
          metadata: { title, teams: input.teams.length, members },
        })
        return readSet(tx, setId)
      },
      { timeout: BATCH_TIMEOUT_MS }
    )
  }

  /**
   * Cambia de equipo a unas personas, sin tocar los equipos: con una pestaña
   * desactualizada, mover a alguien nunca borra un equipo ni sus puntos.
   */
  async moveMembers(userId: string, classId: string, setId: string, input: MoveMembersInput) {
    await assertClassAccess(classId, userId, 'team.manage')
    return prisma.$transaction(async tx => {
      await assertClassWritable(classId, tx)
      const set = await findSet(tx, classId, setId)
      if (set.archivedAt) {
        throw new ValidationError('La agrupación está archivada: sácala del archivo para cambiarla')
      }
      const team = input.teamId
        ? await tx.team.findFirst({ where: { id: input.teamId, setId }, select: { id: true, title: true } })
        : null
      if (input.teamId && !team) throw new NotFoundError('Ese equipo ya no existe')
      const enrollments = await enrollmentIdsByStudent(tx, classId)
      const studentIds = [...new Set(input.studentIds)]
      if (studentIds.some(id => !enrollments.has(id))) {
        throw new ValidationError('Alguna de esas cuentas no está en esta clase')
      }
      const enrollmentIds = studentIds.map(id => enrollments.get(id)!)
      await tx.teamMember.deleteMany({ where: { setId, enrollmentId: { in: enrollmentIds } } })
      if (team) {
        await tx.teamMember.createMany({
          data: enrollmentIds.map(enrollmentId => ({ teamId: team.id, setId, enrollmentId })),
        })
      }
      // Cambia la versión: una edición abierta con la copia de antes ya no se guarda encima.
      await tx.teamSet.update({ where: { id: setId }, data: { updatedAt: new Date() } })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'team.members_changed',
        entityType: 'team_set',
        entityId: setId,
        metadata: { title: set.title, moved: studentIds.length, to: team?.title ?? null },
      })
      return readSet(tx, setId)
    })
  }

  /**
   * Propone un reparto al azar, sin guardar nada: «cuántos equipos» o «cuántas
   * personas por equipo», y si se pide, equilibrado por nivel. Con la fecha de
   * hoy, quien falta en la lista de hoy queda fuera; sin lista, entran todos.
   */
  async shuffle(userId: string, classId: string, input: ShuffleInput) {
    await assertClassAccess(classId, userId, 'team.manage')
    const wanted = input.studentIds ? new Set(input.studentIds) : null
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isPreview: false },
      select: { studentId: true, level: true },
    })
    const pool = wanted ? enrollments.filter(e => wanted.has(e.studentId)) : enrollments
    if (wanted && pool.length !== wanted.size) {
      throw new ValidationError('Alguna de esas cuentas no está en esta clase')
    }
    const attendance = input.date
      ? await missingStudentIdsOn(prisma, classId, input.date)
      : { taken: false, missing: new Set<string>() }
    const eligible = pool.filter(e => !attendance.missing.has(e.studentId))

    const requested = input.teams ?? Math.ceil(eligible.length / Math.max(1, input.perTeam ?? 1))
    const count = Math.min(MAX_TEAMS, Math.max(1, requested))
    const groups = deal(eligible, count, input.balanceByLevel ? { level: e => e.level } : {})
    return {
      teams: groups.map(g => g.map(e => e.studentId)),
      excludedStudentIds: pool.filter(e => attendance.missing.has(e.studentId)).map(e => e.studentId),
      attendanceTaken: attendance.taken,
    }
  }

  /**
   * Premia a un equipo: suma `points` a su marcador y, si se reparte, aplica a
   * cada integrante el comportamiento o los recursos, todo en una transacción.
   * El historial lo cuenta en una línea, con el reparto dentro.
   */
  async awardTeam(userId: string, classId: string, teamId: string, input: TeamAwardInput) {
    await assertClassAccess(classId, userId, 'team.award')
    return prisma.$transaction(
      async tx => {
        const ctx = await classroomContext(tx, classId, userId)
        const team = await tx.team.findFirst({
          where: { id: teamId, set: { classId } },
          select: {
            id: true,
            title: true,
            set: { select: { id: true, title: true, archivedAt: true } },
            members: {
              select: {
                enrollment: {
                  select: { id: true, studentId: true, nickname: true, avatarUrl: true },
                },
              },
            },
          },
        })
        if (!team) throw new NotFoundError('Ese equipo no existe')
        if (team.set.archivedAt) throw new ValidationError('La agrupación de ese equipo está archivada')

        const behavior = input.behaviorId ? await findBehavior(tx, classId, input.behaviorId) : null
        if (behavior && !ctx.settings.behaviors) {
          throw new ValidationError('Los comportamientos están desactivados en esta clase')
        }
        const title = behavior?.name ?? input.title?.trim() ?? ''
        if (!title) throw new ValidationError('Falta el motivo del premio')

        const enrollments: ClassroomEnrollment[] = team.members.map(m => m.enrollment)
        if (enrollments.length > BATCH_MAX) {
          throw new ValidationError(`Como mucho ${BATCH_MAX} estudiantes a la vez`)
        }
        const deltas = !input.distribute
          ? ZERO
          : behavior
            ? behaviorDeltas(ctx, behavior)
            : effectiveDeltas(ctx.settings, {
                xp: input.xp ?? 0,
                coins: input.coins ?? 0,
                mana: input.mana ?? 0,
                lives: input.lives ?? 0,
              })
        const moves = deltas.xp !== 0 || deltas.coins !== 0 || deltas.mana !== 0 || deltas.lives !== 0
        if (input.distribute) {
          if (enrollments.length === 0) throw new ValidationError('El equipo no tiene integrantes')
          if (!behavior && !moves) {
            throw new ValidationError('La recompensa no mueve ningún recurso activo en esta clase')
          }
        } else if (input.points === 0) {
          throw new ValidationError('El premio no suma puntos ni reparte nada')
        }

        const award = await tx.teamAward.create({
          data: {
            teamId,
            teacherId: userId,
            behaviorId: behavior?.id ?? null,
            title,
            points: input.points,
            xpDelta: deltas.xp,
            coinDelta: deltas.coins,
            manaDelta: deltas.mana,
            lifeDelta: deltas.lives,
            memberCount: input.distribute ? enrollments.length : 0,
          },
        })

        const batchId = randomUUID()
        const kind = behavior ? behavior.kind : 'reward'
        const opts = { batchId, teamAwardId: award.id, batchHeadElsewhere: true }
        const results = !input.distribute
          ? []
          : behavior
            ? await applyBehaviorToMany(tx, ctx, behavior, enrollments, opts)
            : await applyDeltasToMany(tx, ctx, enrollments, deltas, {
                kind: 'reward',
                title,
                behaviorId: null,
                ...opts,
              })

        await recordClassAction(tx, {
          classId,
          actorId: userId,
          action: 'team.awarded',
          entityType: 'team',
          entityId: teamId,
          metadata: {
            title: team.title,
            label: title,
            setTitle: team.set.title,
            kind,
            points: input.points,
            memberCount: award.memberCount,
            xpDelta: deltas.xp,
            coinDelta: deltas.coins,
            manaDelta: deltas.mana,
            lifeDelta: deltas.lives,
            ...(input.distribute ? { batchId, batchSize: enrollments.length } : {}),
          },
        })

        const total = await tx.teamAward.aggregate({ where: { teamId }, _sum: { points: true } })
        return {
          award: {
            id: award.id,
            teamId,
            title,
            points: award.points,
            memberCount: award.memberCount,
            createdAt: award.createdAt.toISOString(),
          },
          teamPoints: total._sum.points ?? 0,
          batch: input.distribute ? batchResponse(batchId, kind, results) : null,
        }
      },
      { timeout: BATCH_TIMEOUT_MS }
    )
  }

  /**
   * Lo que ve el alumnado: sus equipos, con quién está (también de las
   * agrupaciones archivadas, que van marcadas: la portada no las enseña, pero
   * una misión por equipos sí); y, solo si la clase tiene la clasificación
   * activada, los puntos de los equipos de base sin archivar (de los demás,
   * solo el nombre y los puntos). Los
   * nombres son el alias en la clase o, si no tiene, el nombre; nunca nada del
   * correo. Quien aún no ha entrado no sale en lo que ve el resto.
   */
  async getStudentTeams(enrollment: { id: string; isPreview: boolean }, classId: string) {
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { settings: true } })
    const rankings = resolveClassSettings(cls?.settings).rankings

    const mine = enrollment.isPreview
      ? []
      : await prisma.teamMember.findMany({
          // También las archivadas: una misión por equipos sigue diciendo con quién se hizo.
          where: { enrollmentId: enrollment.id, team: { set: { classId } } },
          select: {
            team: {
              select: {
                id: true,
                title: true,
                color: true,
                emblem: true,
                orderIndex: true,
                set: {
                  select: { id: true, title: true, kind: true, createdAt: true, archivedAt: true },
                },
                members: {
                  where: {
                    OR: [
                      { enrollmentId: enrollment.id },
                      { enrollment: { isPreview: false, AND: [participatingEnrollmentWhere] } },
                    ],
                  },
                  select: {
                    enrollment: {
                      select: {
                        id: true,
                        studentId: true,
                        nickname: true,
                        avatarUrl: true,
                        student: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        })

    const baseSets = rankings
      ? await prisma.teamSet.findMany({
          where: { classId, kind: 'base', archivedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            teams: {
              orderBy: { orderIndex: 'asc' },
              select: { id: true, title: true, color: true, emblem: true, orderIndex: true },
            },
          },
        })
      : []
    const points = await pointsByTeam(prisma, [
      ...mine.map(m => m.team.id),
      ...baseSets.flatMap(s => s.teams.map(t => t.id)),
    ])
    const showPoints = (set: { kind: string; archivedAt: Date | null }) =>
      rankings && set.kind === 'base' && !set.archivedAt

    return {
      rankings,
      myTeams: mine
        .sort((a, b) => a.team.set.createdAt.getTime() - b.team.set.createdAt.getTime())
        .map(({ team }) => ({
          set: {
            id: team.set.id,
            title: team.set.title,
            kind: team.set.kind,
            archived: !!team.set.archivedAt,
          },
          team: {
            id: team.id,
            title: team.title,
            color: team.color,
            emblem: team.emblem,
            index: team.orderIndex,
            points: showPoints(team.set) ? (points.get(team.id) ?? 0) : null,
          },
          members: team.members
            .map(({ enrollment: e }) => ({
              id: e.studentId,
              name: e.nickname?.trim() || e.student.name,
              avatar: e.avatarUrl,
              isMe: e.id === enrollment.id,
            }))
            .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name)),
        })),
      standings: baseSets.map(set => ({
        set: { id: set.id, title: set.title },
        teams: set.teams
          .map(({ orderIndex, ...t }) => ({ ...t, index: orderIndex, points: points.get(t.id) ?? 0 }))
          .sort((a, b) => b.points - a.points),
      })),
    }
  }
}

export const teamsService = new TeamsService()
