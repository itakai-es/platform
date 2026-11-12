import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import type { PathEdge } from '../../utils/mission-path.js'
import { classMatrix } from './class-matrix.js'
import {
  completionDate,
  countsForProgress,
  enigmaTally,
  hasStarted,
  isCompleted,
  missionCellState,
  pathLocksFor,
  percentOf,
  roundedAverage,
  studentProgress,
  type EnigmaShape,
  type MissionShape,
  type StudentProgress,
} from './definitions.js'

/**
 * Las cifras de progreso de las pantallas que ya existían (ficha, listados,
 * resumen del alumnado, detalle de misión), con las definiciones de
 * definitions.ts. Cada una es una forma de cargar menos que la matriz de la
 * clase (class-matrix.ts) y dar lo mismo que ella: lo vigila
 * tests/modules/analytics.student-progress.db.test.ts.
 */

type Db = Prisma.TransactionClient

/**
 * `countsForProgress` para una consulta: con enigmas y sin bloquear a mano. Lo
 * usan los recuentos que se hacen en la base, sin cargar las misiones.
 */
export const COUNTED_MISSION_WHERE = {
  status: { not: 'bloqueada' },
  enigmas: { some: {} },
} satisfies Prisma.MissionWhereInput

// ---- Con lo que ya está cargado ----

/** «X de N» y el % de un estudiante, sin el reparto de lo pendiente. */
export type ProgressCounts = Omit<StudentProgress, 'pending'>

/**
 * «X de N» y el % de un estudiante en un grupo de misiones, con lo que ya se
 * tiene en memoria. Es lo que necesita un listado que carga a mucha gente: no
 * mira ni el camino ni lo empezado, que solo sirven para repartir lo pendiente.
 */
export function progressCounts(
  missions: MissionShape[],
  student: {
    completedAt: (missionId: string) => Date | null
    approved: ReadonlySet<string>
  },
  now: Date = new Date()
): ProgressCounts {
  const { pending: _pending, ...counts } = studentProgress(
    missions.map(mission => {
      const completedAt = student.completedAt(mission.id)
      return {
        state: missionCellState(
          mission,
          {
            completed: isCompleted(completedAt, mission.enigmas, student.approved),
            started: false,
            pathLocked: false,
          },
          now
        ),
        counted: countsForProgress(mission),
        tally: enigmaTally(mission.enigmas, student.approved),
        completedAt,
      }
    })
  )
  return counts
}

/** La suma de varias clases: «X de N» de todas y el % de todos sus obligatorios. */
export function sumProgress(classes: ProgressCounts[]): ProgressCounts {
  const total = (pick: (counts: ProgressCounts) => number) =>
    classes.reduce((sum, counts) => sum + pick(counts), 0)
  const requiredApproved = total(c => c.requiredApproved)
  const requiredTotal = total(c => c.requiredTotal)
  return {
    missionsCompleted: total(c => c.missionsCompleted),
    missionsCounted: total(c => c.missionsCounted),
    requiredApproved,
    requiredTotal,
    percent: percentOf(requiredApproved, requiredTotal),
    extraApproved: total(c => c.extraApproved),
    extraTotal: total(c => c.extraTotal),
  }
}

// ---- Un estudiante, en todas sus clases ----

/**
 * El progreso de un estudiante en cada una de sus clases, de una vez: seis
 * consultas sean cuantas sean las clases (la matriz son 14 por clase). Mismas
 * reglas que la matriz, también para lo pendiente. No mira si está matriculado
 * ni cómo (entra también la vista previa, que se ve a sí misma): lo decide quien
 * llama al elegir `classIds`. No comprueba permisos.
 */
export async function studentProgressByClass(
  studentId: string,
  classIds: string[],
  { now = new Date(), db = prisma as Db }: { now?: Date; db?: Db } = {}
): Promise<Map<string, StudentProgress>> {
  const result = new Map<string, StudentProgress>()
  if (classIds.length === 0) return result

  const [classes, missions] = await Promise.all([
    db.class.findMany({ where: { id: { in: classIds } }, select: { id: true, settings: true } }),
    db.mission.findMany({
      where: { classId: { in: classIds } },
      select: {
        id: true,
        classId: true,
        status: true,
        deadline: true,
        enigmas: { select: { id: true, isOptional: true } },
      },
    }),
  ])
  const missionIds = missions.map(m => m.id)
  const enigmaIds = missions.flatMap(m => m.enigmas.map(e => e.id))
  const mapOn = classes.filter(c => resolveClassSettings(c.settings).missionMap).map(c => c.id)

  const [edges, approvals, submissions, progress, hints] = await Promise.all([
    db.missionPrerequisite.findMany({
      where: { mission: { classId: { in: mapOn } }, requiredMission: { classId: { in: mapOn } } },
      select: { missionId: true, requiredMissionId: true },
    }),
    db.studentEnigmaProgress.findMany({
      where: { studentId, enigmaId: { in: enigmaIds } },
      select: { enigmaId: true },
    }),
    db.enigmaSubmission.findMany({
      where: { studentId, enigmaId: { in: enigmaIds } },
      select: { enigmaId: true },
      distinct: ['enigmaId'],
    }),
    // Con algo dentro: una fila vacía ni completa ni cuenta como empezada.
    db.studentMissionProgress.findMany({
      where: {
        studentId,
        missionId: { in: missionIds },
        OR: [{ completedAt: { not: null } }, { enigmasCompleted: { gt: 0 } }],
      },
      select: { missionId: true, completedAt: true },
    }),
    db.missionHintUse.findMany({
      where: { studentId, missionId: { in: missionIds } },
      select: { missionId: true },
      distinct: ['missionId'],
    }),
  ])

  const approved = new Set(approvals.map(a => a.enigmaId))
  const submitted = new Set(submissions.map(s => s.enigmaId))
  const hinted = new Set(hints.map(h => h.missionId))
  const worked = new Map(progress.map(p => [p.missionId, p.completedAt]))
  const classOf = new Map(missions.map(m => [m.id, m.classId]))

  const started = new Map(
    missions.map(m => [
      m.id,
      hasStarted({
        submitted: m.enigmas.some(e => submitted.has(e.id)),
        approved: m.enigmas.some(e => approved.has(e.id)),
        hinted: hinted.has(m.id),
        progressWithWork: worked.has(m.id),
      }),
    ])
  )
  const completedAt = (missionId: string) => worked.get(missionId) ?? null
  const edgesOf = new Map<string, PathEdge[]>()
  for (const edge of edges) {
    const classId = classOf.get(edge.missionId)
    // Un requisito de otra clase no cierra nada (ver `classPathEdges`).
    if (!classId || classOf.get(edge.requiredMissionId) !== classId) continue
    edgesOf.set(classId, [...(edgesOf.get(classId) ?? []), edge])
  }

  for (const classId of classIds) {
    const own = missions.filter(m => m.classId === classId)
    const locks = pathLocksFor(
      edgesOf.get(classId) ?? [],
      new Map(own.map(m => [m.id, m])),
      {
        completed: id => completedAt(id) !== null,
        approved,
        started: id => started.get(id) ?? false,
      },
      now
    )
    result.set(
      classId,
      studentProgress(
        own.map(mission => ({
          state: missionCellState(
            mission,
            {
              completed: isCompleted(completedAt(mission.id), mission.enigmas, approved),
              started: started.get(mission.id) ?? false,
              pathLocked: locks.has(mission.id),
            },
            now
          ),
          counted: countsForProgress(mission),
          tally: enigmaTally(mission.enigmas, approved),
          completedAt: completedAt(mission.id),
        }))
      )
    )
  }
  return result
}

// ---- Las misiones que cuentan de varias clases ----

/**
 * Cuántas misiones cuentan en cada clase (N de «X de N»), en una consulta sea
 * cuantas sean las clases: el listado de un docente con muchas no puede lanzar
 * una matriz por clase. Una clase sin ninguna no sale.
 */
export async function countedMissionsByClass(
  classIds: string[],
  db: Db = prisma
): Promise<Map<string, number>> {
  if (classIds.length === 0) return new Map()
  const rows = await db.mission.groupBy({
    by: ['classId'],
    where: { classId: { in: classIds }, ...COUNTED_MISSION_WHERE },
    _count: { _all: true },
  })
  return new Map(rows.map(row => [row.classId, row._count._all]))
}

// ---- Quién ha completado qué ----

/** Lo que hace falta de una misión para saber quién la ha completado. */
export interface CompletionMission {
  id: string
  enigmas: EnigmaShape[]
}

/** Quién ha completado cada misión de un grupo, según `missionCompletions`. */
export interface MissionCompletions {
  /** Por estudiante: las que ha completado, con la fecha (`completionDate`). */
  datesBy: Map<string, Map<string, Date>>
  /** Por estudiante: cuántos enigmas obligatorios de esas misiones tiene aprobados. */
  requiredApprovedBy: Map<string, number>
}

/**
 * Quién ha completado cada una de `missions`, con la definición única: dos
 * consultas sean cuantas sean las misiones, y la regla (`completionDate`) en memoria,
 * sin copiarla en SQL. Cuenta a cualquiera con trabajo en ellas: quien la llama se
 * queda con el alumnado que le interese. `studentId`, para ir solo a por esa persona.
 */
export async function missionCompletions(
  missions: readonly CompletionMission[],
  { studentId, db = prisma as Db }: { studentId?: string; db?: Db } = {}
): Promise<MissionCompletions> {
  const datesBy = new Map<string, Map<string, Date>>()
  const requiredApprovedBy = new Map<string, number>()
  if (missions.length === 0) return { datesBy, requiredApprovedBy }

  const who = studentId ? { studentId } : {}
  const [saved, approvals] = await Promise.all([
    db.studentMissionProgress.findMany({
      where: { ...who, missionId: { in: missions.map(m => m.id) }, completedAt: { not: null } },
      select: { studentId: true, missionId: true, completedAt: true },
    }),
    db.studentEnigmaProgress.findMany({
      where: { ...who, enigmaId: { in: missions.flatMap(m => m.enigmas.map(e => e.id)) } },
      select: { studentId: true, enigmaId: true, completedAt: true },
    }),
  ])

  const required = new Set(missions.flatMap(m => m.enigmas.filter(e => !e.isOptional).map(e => e.id)))
  const approvedBy = new Map<string, Map<string, Date>>()
  for (const approval of approvals) {
    let mine = approvedBy.get(approval.studentId)
    if (!mine) approvedBy.set(approval.studentId, (mine = new Map()))
    mine.set(approval.enigmaId, approval.completedAt)
    if (required.has(approval.enigmaId)) {
      requiredApprovedBy.set(approval.studentId, (requiredApprovedBy.get(approval.studentId) ?? 0) + 1)
    }
  }
  const savedBy = new Map<string, Map<string, Date | null>>()
  for (const row of saved) {
    let mine = savedBy.get(row.studentId)
    if (!mine) savedBy.set(row.studentId, (mine = new Map()))
    mine.set(row.missionId, row.completedAt)
  }

  const none = new Map<string, Date>()
  for (const student of new Set([...approvedBy.keys(), ...savedBy.keys()])) {
    const dates = new Map<string, Date>()
    for (const mission of missions) {
      const at = completionDate(
        savedBy.get(student)?.get(mission.id),
        mission.enigmas,
        approvedBy.get(student) ?? none
      )
      if (at) dates.set(mission.id, at)
    }
    if (dates.size > 0) datesBy.set(student, dates)
  }
  return { datesBy, requiredApprovedBy }
}

// ---- Una misión, en su clase ----

/** Cómo va una misión en su clase, para su profesorado. */
export interface MissionClassStats {
  totalStudents: number
  completed: number
  inProgress: number
  notStarted: number
  expired: number
  pathLocked: number
  /** No completada de una misión que no cuenta (bloqueada a mano o sin enigmas). */
  excluded: number
  /**
   * Media del % de enigmas obligatorios aprobados, de quienes participan: la misma
   * población que el resto de medias. Null si no tiene obligatorios o no hay nadie.
   */
  avgProgress: number | null
}

/**
 * Cómo va una misión en su clase, de la matriz: cada estudiante cae en un solo
 * estado, así que los recuentos suman el alumnado de la clase y ninguno es
 * negativo. Sin la vista previa ni quien la hizo en otra clase. `students`, para
 * filtrar lo que cuente quien llama.
 */
export async function missionClassStats(
  classId: string,
  missionId: string,
  db: Db = prisma
): Promise<{ stats: MissionClassStats; students: Set<string> }> {
  const matrix = await classMatrix(classId, {}, db)
  const states = matrix.missions.find(m => m.id === missionId)?.stats.states
  const percents = matrix.students
    .filter(s => s.participating)
    .map(s => s.missions.find(cell => cell.missionId === missionId)?.tally.percent ?? null)
    .filter((percent): percent is number => percent !== null)
  return {
    stats: {
      totalStudents: matrix.students.length,
      completed: states?.completed ?? 0,
      inProgress: states?.in_progress ?? 0,
      notStarted: states?.not_started ?? 0,
      expired: states?.expired ?? 0,
      pathLocked: states?.path_locked ?? 0,
      excluded: states?.excluded ?? 0,
      avgProgress: roundedAverage(percents),
    },
    students: new Set(matrix.students.map(s => s.studentId)),
  }
}
