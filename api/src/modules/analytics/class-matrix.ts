import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { participatingEnrollmentWhere } from '../../utils/enrollment.js'
import { NotFoundError } from '../../utils/errors.js'
import { MISSION_ORDER } from '../../utils/mission-order.js'
import { classPathEdges, type PathEdge } from '../../utils/mission-path.js'
import {
  ATTENDED_STATUSES,
  STUDENT_ACTIVITY_TYPES,
  attendanceRate,
  completionDate,
  enigmaTally,
  groupAverages,
  hasStarted,
  inPeriod,
  latest,
  madridDay,
  missionCellState,
  missionExclusion,
  missionExpired,
  pathLocksFor,
  reviewablePending,
  roundedAverage,
  studentProgress,
  type EnigmaTally,
  type MissionCellState,
  type MissionExclusion,
  type Period,
  type RequirementMission,
  type StudentProgress,
} from './definitions.js'

/**
 * La matriz de una clase (F1): el estado de cada estudiante en cada misión, con
 * lo que necesitan los paneles (cada enigma con su % y su fecha, las pistas, lo
 * que falta por revisar y la última actividad). Es la base del panel de la
 * clase, de la página de cada estudiante y de las señales de dificultad
 * (signals.ts); las reglas están en definitions.ts.
 *
 * **Quién sale:** el alumnado con matrícula vigente en la clase, sin la vista
 * previa del profesorado. Así no se cuela el progreso de una misión que llegó
 * de otra clase (sigue colgado de la misión) ni el de quien ya no está. Salen
 * también las cuentas sin estrenar (sin correo y sin haber entrado nunca), como
 * «sin empezar»: es para el profesorado. `participating` dice quién cuenta en lo
 * que ve el alumnado (`participatingEnrollmentWhere`). Con `studentId` sale solo
 * esa persona, con las mismas consultas filtradas (ver `MatrixPopulation`).
 *
 * **Cómo:** en vivo, sin tablas de resumen (lo que se borra desaparece solo). Los
 * datos de cada estudiante llegan en seis consultas agrupadas en SQL (aprobaciones,
 * entregas, progreso, pistas, muro y asistencia), más las de la clase, sus
 * misiones con sus enigmas, el camino, la matrícula y las sesiones: 14 en total,
 * las mismas sea cual sea la clase, nunca una por estudiante ni por misión (lo
 * vigila tests/modules/analytics.volume.db.test.ts). El cierre del camino se
 * calcula en memoria con las reglas de utils/mission-path.ts.
 *
 * **Periodo:** el estado es el de ahora; el periodo (`from`, `to`) solo elige
 * qué aprobaciones, pistas y completadas entran en las cifras «del periodo» y
 * en qué rango se mira la asistencia. Los saldos no cambian con el periodo.
 *
 * Sin comprobar permisos: quien la llama ya ha pasado `analytics.view`.
 */

type Db = Prisma.TransactionClient

// ---- Lo que devuelve ----

export interface MatrixEnigma {
  id: string
  title: string
  isOptional: boolean
  orderIndex: number
}

/** Cifras de una misión, del alumnado de la clase. */
export interface MissionStats {
  /** Cuántos estudiantes hay en cada estado. */
  states: Record<MissionCellState, number>
  /** Quién la ha empezado de verdad (con quien la ha completado). */
  started: number
  completedInPeriod: number
  /** Aprobaciones de sus enigmas en el periodo y su % medio (redondeado). */
  approvalsInPeriod: number
  approvalAverage: number | null
  /** Pistas usadas en el periodo y su media por estudiante que la ha empezado (un decimal). */
  hintsInPeriod: number
  hintsPerStartedStudent: number | null
  /** Entregas pendientes de revisar, sin las atascadas. */
  pendingReviews: number
  /** Estudiantes sin completarla con alguna de esas entregas: esperan al profesorado. */
  awaitingReview: number
  /** Entregas pendientes de un enigma ya aprobado: no se pueden aprobar ni cerrar. */
  stuckSubmissions: number
}

export interface MatrixMission {
  id: string
  title: string
  /** La rareza (`comun`, `rara`, `epica`, `legendaria`), para su miniatura. */
  rarity: string
  /** La portada, tal cual la guarda la misión (`/uploads/…` o una URL); null si no tiene. */
  cover: string | null
  orderIndex: number
  /** `activa` o `bloqueada` (a mano). */
  status: string
  deadline: Date | null
  /** Cuenta en «X de N» y en el progreso. */
  counted: boolean
  /** Por qué no cuenta, si no cuenta. */
  exclusion: MissionExclusion | null
  expired: boolean
  enigmas: MatrixEnigma[]
  requiredCount: number
  optionalCount: number
  /** Lo que pide en el mapa (ids, en el orden de la clase), aunque el mapa esté apagado. */
  prerequisiteIds: string[]
  stats: MissionStats
}

export interface MatrixEnigmaCell {
  enigmaId: string
  approved: boolean
  /** El % que le puso el profesorado al aprobarlo. */
  percentage: number | null
  approvedAt: Date | null
  /** Tiene una entrega esperando revisión (no atascada). */
  pendingReview: boolean
  /** Tiene una entrega pendiente de este enigma ya aprobado. */
  stuck: boolean
  /** Desde cuándo espera la entrega pendiente más antigua. */
  pendingSince: Date | null
  lastSubmittedAt: Date | null
}

export interface MatrixHints {
  used: number
  /** De esas, las de % (descuentan de lo que paga la misión). */
  percent: number
  usedInPeriod: number
  percentInPeriod: number
  lastAt: Date | null
}

export interface MatrixCell {
  missionId: string
  state: MissionCellState
  /** Cuándo quedó completada (`completionDate`); null si no lo está. */
  completedAt: Date | null
  started: boolean
  tally: EnigmaTally
  /** Un elemento por enigma de la misión, en su orden. */
  enigmas: MatrixEnigmaCell[]
  hints: MatrixHints
  pendingReviews: number
  /** Con `path_locked`, los requisitos que le faltan (ids). */
  pathRequires: string[]
  /**
   * El camino se la tiene cerrada ahora. Es lo que dice si se enseñan sus enigmas.
   */
  pathClosed: boolean
  /**
   * Caducó sin que la empezara y, al llegar la fecha, el camino se la tenía cerrada,
   * aunque hoy ya no: nunca pudo abrirla a tiempo. Sale `expired`; solo lo mira la señal.
   */
  closedUntilExpired: boolean
  lastSubmittedAt: Date | null
}

export interface MatrixStudent {
  studentId: string
  enrollmentId: string
  /** Nombre real: la matriz es solo del profesorado. */
  name: string
  nickname: string | null
  avatarUrl: string | null
  accountType: 'self' | 'managed'
  /** Cuenta en lo que ve el alumnado (no es una cuenta sin estrenar). */
  participating: boolean
  enrolledAt: Date
  /** Lo último que hizo él en la clase (entregar, usar una pista, comprar…), o null. */
  lastActivityAt: Date | null
  /** Una celda por misión, en el orden de `ClassMatrix.missions`. */
  missions: MatrixCell[]
  progress: StudentProgress
  period: {
    /** Completadas (de las que cuentan) dentro del periodo. */
    missionsCompleted: number
    approvals: number
    approvalAverage: number | null
    hintsUsed: number
    percentHintsUsed: number
  }
  pendingReviews: number
  stuckSubmissions: number
  /** Asistencia del periodo; null si no se le ha pasado lista. */
  attendance: { total: number; attended: number; rate: number | null } | null
}

export interface ClassMatrix {
  classId: string
  /** El momento de la foto: «caducada» y «sin actividad» se miden contra él. */
  now: Date
  period: Period
  /** El mapa encendido: solo entonces hay cierres por el camino. */
  missionMap: boolean
  missions: MatrixMission[]
  students: MatrixStudent[]
  summary: {
    students: number
    participating: number
    missionsCounted: number
    /** Medias de la clase (profesorado), de quienes participan: misiones completadas y progreso %. */
    averages: { missionsCompleted: number | null; percent: number | null }
    pendingReviews: number
    stuckSubmissions: number
    approvalsInPeriod: number
    approvalAverage: number | null
    /** Sesiones del periodo y % de asistencia de todos sus registros (null si no se pasó lista). */
    attendance: { sessions: number; rate: number | null }
  }
}

// ---- Lo que se carga ----

/** Todo lo que hace falta para construir la matriz, tal como sale de la base. */
export interface MatrixData {
  classId: string
  missionMap: boolean
  missions: {
    id: string
    title: string
    status: string
    deadline: Date | null
    orderIndex: number
    /** Solo para pintarla (no cambian ninguna cifra): sin ellas, común y sin portada. */
    rarity?: string
    backgroundImage?: string | null
    enigmas: MatrixEnigma[]
  }[]
  edges: PathEdge[]
  enrollments: {
    id: string
    studentId: string
    nickname: string | null
    avatarUrl: string | null
    enrolledAt: Date
    name: string
    accountType: 'self' | 'managed'
    participating: boolean
  }[]
  approvals: { studentId: string; enigmaId: string; percentage: number; approvedAt: Date }[]
  submissions: {
    studentId: string
    enigmaId: string
    pending: number
    pendingSince: Date | null
    lastSubmittedAt: Date
  }[]
  progress: { studentId: string; missionId: string; completedAt: Date | null; hasWork: boolean }[]
  hints: {
    studentId: string
    missionId: string
    used: number
    percent: number
    usedInPeriod: number
    percentInPeriod: number
    lastAt: Date
  }[]
  activity: { studentId: string; lastAt: Date }[]
  attendance: { enrollmentId: string; total: number; attended: number }[]
  sessions: number
}

/**
 * A quién se carga. Sin nada, todo el alumnado de la clase sin la vista previa
 * (ver el comentario del principio). Con `studentId`, solo esa persona: es la
 * página de un estudiante y lo que ve el alumnado de sí mismo, que no necesitan
 * a los demás. `includePreview` deja entrar su matrícula aunque sea la de vista
 * previa del profesorado («Ver como alumno»); solo tiene sentido con `studentId`.
 */
export interface MatrixPopulation {
  studentId?: string
  includePreview?: boolean
}

/** El filtro de matrícula de cada consulta (`ce`), según la población. */
function populationSql(population: MatrixPopulation) {
  const preview = population.includePreview && population.studentId
    ? Prisma.empty
    : Prisma.sql`AND NOT ce.is_preview`
  const student = population.studentId
    ? Prisma.sql`AND ce.student_id = ${population.studentId}`
    : Prisma.empty
  return Prisma.sql`${preview} ${student}`
}

/** El alumnado de la clase (sin la vista previa, salvo que la población la pida). */
const inClass = (alias: string, classId: string, scope: Prisma.Sql) =>
  Prisma.sql`JOIN class_enrollments ce ON ce.student_id = ${Prisma.raw(alias)}.student_id AND ce.class_id = ${classId} ${scope}`

/** Carga los datos de la matriz: ver el comentario del principio y `MatrixPopulation`. */
export async function loadMatrixData(
  db: Db,
  classId: string,
  period: Period,
  population: MatrixPopulation = {}
): Promise<MatrixData> {
  const cls = await db.class.findUnique({
    where: { id: classId },
    select: { id: true, settings: true },
  })
  if (!cls) throw new NotFoundError('Clase no encontrada')
  const missionMap = resolveClassSettings(cls.settings).missionMap
  const from = period.from
  const to = period.to
  // La asistencia guarda el día local: el periodo, en días de Madrid.
  const fromDay = from ? madridDay(from) : null
  const toDay = to ? madridDay(to) : null
  const inRange = (column: Prisma.Sql) =>
    Prisma.sql`(${from}::timestamp IS NULL OR ${column} >= ${from}::timestamp) AND (${to}::timestamp IS NULL OR ${column} <= ${to}::timestamp)`
  const scope = populationSql(population)
  const enrollmentWhere = {
    classId,
    ...(population.includePreview && population.studentId ? {} : { isPreview: false }),
    ...(population.studentId ? { studentId: population.studentId } : {}),
  }

  const [
    missions,
    edges,
    enrollments,
    participating,
    approvals,
    submissions,
    progress,
    hints,
    activity,
    attendance,
    sessions,
  ] = await Promise.all([
    db.mission.findMany({
      where: { classId },
      orderBy: MISSION_ORDER,
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        orderIndex: true,
        rarity: true,
        backgroundImage: true,
        enigmas: {
          select: { id: true, title: true, isOptional: true, orderIndex: true },
          orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
        },
      },
    }),
    classPathEdges(db, classId),
    db.classEnrollment.findMany({
      where: enrollmentWhere,
      select: {
        id: true,
        studentId: true,
        nickname: true,
        avatarUrl: true,
        enrolledAt: true,
        student: { select: { name: true, accountType: true } },
      },
    }),
    db.classEnrollment.findMany({
      where: { ...enrollmentWhere, ...participatingEnrollmentWhere },
      select: { id: true },
    }),
    // Cada enigma aprobado (uno por estudiante y enigma).
    db.$queryRaw<MatrixData['approvals']>`
      SELECT p.student_id AS "studentId", p.enigma_id AS "enigmaId", p.percentage,
             p.completed_at AS "approvedAt"
        FROM missions m
        JOIN mission_enigmas e ON e.mission_id = m.id
        JOIN student_enigma_progress p ON p.enigma_id = e.id
        ${inClass('p', classId, scope)}
       WHERE m.class_id = ${classId}`,
    // Las entregas, agrupadas por estudiante y enigma.
    db.$queryRaw<MatrixData['submissions']>`
      SELECT s.student_id AS "studentId", s.enigma_id AS "enigmaId",
             count(*) FILTER (WHERE s.status = 'pendiente')::int AS pending,
             min(s.submitted_at) FILTER (WHERE s.status = 'pendiente') AS "pendingSince",
             max(s.submitted_at) AS "lastSubmittedAt"
        FROM missions m
        JOIN mission_enigmas e ON e.mission_id = m.id
        JOIN enigma_submissions s ON s.enigma_id = e.id
        ${inClass('s', classId, scope)}
       WHERE m.class_id = ${classId}
       GROUP BY s.student_id, s.enigma_id`,
    // El progreso de misión con algo dentro: `completedAt` y si cuenta como
    // empezada. Ni `progress` ni `startedAt`.
    db.$queryRaw<MatrixData['progress']>`
      SELECT smp.student_id AS "studentId", smp.mission_id AS "missionId",
             smp.completed_at AS "completedAt", smp.enigmas_completed > 0 AS "hasWork"
        FROM missions m
        JOIN student_mission_progress smp ON smp.mission_id = m.id
        ${inClass('smp', classId, scope)}
       WHERE m.class_id = ${classId}
         AND (smp.completed_at IS NOT NULL OR smp.enigmas_completed > 0)`,
    // Las pistas, agrupadas por estudiante y misión, en total y en el periodo.
    db.$queryRaw<MatrixData['hints']>`
      SELECT h.student_id AS "studentId", h.mission_id AS "missionId",
             count(*)::int AS used,
             count(*) FILTER (WHERE h.cost_type = 'percent')::int AS percent,
             count(*) FILTER (WHERE ${inRange(Prisma.sql`h.created_at`)})::int AS "usedInPeriod",
             count(*) FILTER (WHERE h.cost_type = 'percent' AND ${inRange(Prisma.sql`h.created_at`)})::int AS "percentInPeriod",
             max(h.created_at) AS "lastAt"
        FROM missions m
        JOIN mission_hint_uses h ON h.mission_id = m.id
        ${inClass('h', classId, scope)}
       WHERE m.class_id = ${classId}
       GROUP BY h.student_id, h.mission_id`,
    // Lo último que hizo cada estudiante en la clase, según su muro: la entrada
    // más reciente de cada uno, por el índice (user_id, created_at) hacia atrás
    // (agrupar todo el muro de la clase para quedarse con una fila es más caro).
    db.$queryRaw<MatrixData['activity']>`
      SELECT ce.student_id AS "studentId", last.at AS "lastAt"
        FROM class_enrollments ce
        CROSS JOIN LATERAL (
          SELECT a.created_at AS at
            FROM activities a
           WHERE a.user_id = ce.student_id AND a.class_id = ce.class_id
             AND a.type::text = ANY(${[...STUDENT_ACTIVITY_TYPES]}::text[])
           ORDER BY a.created_at DESC
           LIMIT 1
        ) last
       WHERE ce.class_id = ${classId} ${scope}`,
    // La asistencia del periodo, por matrícula.
    db.$queryRaw<MatrixData['attendance']>`
      SELECT r.enrollment_id AS "enrollmentId", count(*)::int AS total,
             count(*) FILTER (WHERE r.status::text = ANY(${[...ATTENDED_STATUSES]}::text[]))::int AS attended
        FROM attendance_sessions s
        JOIN attendance_records r ON r.session_id = s.id
        JOIN class_enrollments ce ON ce.id = r.enrollment_id
       WHERE s.class_id = ${classId} ${scope}
         AND (${fromDay}::date IS NULL OR s.date >= ${fromDay}::date)
         AND (${toDay}::date IS NULL OR s.date <= ${toDay}::date)
       GROUP BY r.enrollment_id`,
    db.$queryRaw<{ sessions: number }[]>`
      SELECT count(*)::int AS sessions
        FROM attendance_sessions s
       WHERE s.class_id = ${classId}
         AND (${fromDay}::date IS NULL OR s.date >= ${fromDay}::date)
         AND (${toDay}::date IS NULL OR s.date <= ${toDay}::date)`,
  ])

  const participatingIds = new Set(participating.map(e => e.id))
  return {
    classId,
    missionMap,
    missions,
    edges,
    enrollments: enrollments.map(e => ({
      id: e.id,
      studentId: e.studentId,
      nickname: e.nickname,
      avatarUrl: e.avatarUrl,
      enrolledAt: e.enrolledAt,
      name: e.student.name,
      accountType: e.student.accountType,
      participating: participatingIds.has(e.id),
    })),
    approvals,
    submissions,
    progress,
    hints,
    activity,
    attendance,
    sessions: sessions[0]?.sessions ?? 0,
  }
}

// ---- Construcción, sin base de datos ----

/** Las filas de cada estudiante, por el id que toque (enigma o misión). */
function byStudent<T extends { studentId: string }>(rows: T[], id: (row: T) => string) {
  const map = new Map<string, Map<string, T>>()
  for (const row of rows) {
    let mine = map.get(row.studentId)
    if (!mine) map.set(row.studentId, (mine = new Map()))
    mine.set(id(row), row)
  }
  return map
}

const NONE = new Map<string, never>()

const emptyStates = (): Record<MissionCellState, number> => ({
  completed: 0,
  excluded: 0,
  expired: 0,
  path_locked: 0,
  in_progress: 0,
  not_started: 0,
})

/** Construye la matriz con los datos ya cargados (ver `loadMatrixData`). */
export function buildClassMatrix(data: MatrixData, period: Period, now: Date): ClassMatrix {
  const approvals = byStudent(data.approvals, a => a.enigmaId)
  const submissions = byStudent(data.submissions, s => s.enigmaId)
  const progress = byStudent(data.progress, p => p.missionId)
  const hints = byStudent(data.hints, h => h.missionId)
  const lastActivity = new Map(data.activity.map(a => [a.studentId, a.lastAt]))
  const attendance = new Map(data.attendance.map(a => [a.enrollmentId, a]))

  const missionOfEnigma = new Map<string, string>()
  for (const mission of data.missions) {
    for (const enigma of mission.enigmas) missionOfEnigma.set(enigma.id, mission.id)
  }
  const requirements = new Map<string, RequirementMission>(data.missions.map(m => [m.id, m]))
  const prerequisites = new Map<string, string[]>()
  for (const edge of data.edges) {
    const list = prerequisites.get(edge.missionId) ?? []
    list.push(edge.requiredMissionId)
    prerequisites.set(edge.missionId, list)
  }

  const counted = new Set(data.missions.filter(m => missionExclusion(m) === null).map(m => m.id))

  const missionStats = new Map(
    data.missions.map(m => [
      m.id,
      {
        stats: {
          states: emptyStates(),
          started: 0,
          completedInPeriod: 0,
          approvalsInPeriod: 0,
          approvalAverage: null,
          hintsInPeriod: 0,
          hintsPerStartedStudent: null,
          pendingReviews: 0,
          awaitingReview: 0,
          stuckSubmissions: 0,
        } as MissionStats,
        percentages: [] as number[],
      },
    ])
  )

  const students: MatrixStudent[] = data.enrollments.map(enrollment => {
    const studentId = enrollment.studentId
    const myApprovals = approvals.get(studentId) ?? NONE
    const mySubmissions = submissions.get(studentId) ?? NONE
    const myProgress = progress.get(studentId) ?? NONE
    const myHints = hints.get(studentId) ?? NONE
    const approved = new Set(myApprovals.keys())
    const submitted = new Set<string>()
    for (const enigmaId of mySubmissions.keys()) {
      const missionId = missionOfEnigma.get(enigmaId)
      if (missionId) submitted.add(missionId)
    }
    const savedCompletedAt = (missionId: string) => myProgress.get(missionId)?.completedAt ?? null
    const approvedAt = new Map([...myApprovals.values()].map(a => [a.enigmaId, a.approvedAt]))
    // Empezada, una vez por misión: la usan el camino y el estado.
    const startedIn = new Map(
      data.missions.map(m => [
        m.id,
        hasStarted({
          submitted: submitted.has(m.id),
          approved: m.enigmas.some(e => approved.has(e.id)),
          hinted: myHints.has(m.id),
          progressWithWork: myProgress.has(m.id),
        }),
      ])
    )
    const started = (missionId: string) => startedIn.get(missionId) ?? false
    const locks = data.missionMap
      ? pathLocksFor(
          data.edges,
          requirements,
          { completed: id => savedCompletedAt(id) !== null, approved, started },
          now
        )
      : new Map<string, string[]>()

    /**
     * ¿Se la cerraba el camino al llegar su fecha? Se mira en ese momento, no ahora:
     * ni completar luego el requisito ni que este caduque después le habrían dejado
     * abrirla a tiempo. Solo se llama si no la ha empezado: lo empezado no se cierra.
     */
    const closedAtDeadline = (mission: MatrixData['missions'][number]) => {
      if (!data.missionMap || !mission.deadline) return false
      const at = mission.deadline
      const locks = pathLocksFor(
        data.edges.filter(edge => edge.missionId === mission.id),
        requirements,
        {
          completed: id => {
            const doneAt = savedCompletedAt(id)
            return doneAt !== null && doneAt <= at
          },
          approved: new Set(
            [...myApprovals.values()].filter(a => a.approvedAt <= at).map(a => a.enigmaId)
          ),
          started: () => false,
        },
        at
      )
      return locks.has(mission.id)
    }

    let lastSubmittedAt: Date | null = null
    let lastHintAt: Date | null = null
    let pendingReviews = 0
    let stuckSubmissions = 0
    let hintsUsed = 0
    let percentHintsUsed = 0
    let completedInPeriod = 0
    const periodPercentages: number[] = []

    const cells: MatrixCell[] = data.missions.map(mission => {
      const doneAt = completionDate(savedCompletedAt(mission.id), mission.enigmas, approvedAt)
      const isStarted = started(mission.id)
      const pathRequires = locks.get(mission.id) ?? []
      const state = missionCellState(
        mission,
        { completed: doneAt !== null, started: isStarted, pathLocked: pathRequires.length > 0 },
        now
      )
      const entry = missionStats.get(mission.id)!

      let cellPending = 0
      let cellLastSubmitted: Date | null = null
      const enigmas = mission.enigmas.map(enigma => {
        const approval = myApprovals.get(enigma.id)
        const submission = mySubmissions.get(enigma.id)
        const pending = submission?.pending ?? 0
        const reviewable = reviewablePending(pending, approval !== undefined)
        const stuck = pending - reviewable
        cellPending += reviewable
        stuckSubmissions += stuck
        entry.stats.pendingReviews += reviewable
        entry.stats.stuckSubmissions += stuck
        cellLastSubmitted = latest(cellLastSubmitted, submission?.lastSubmittedAt)
        if (approval && inPeriod(approval.approvedAt, period)) {
          periodPercentages.push(approval.percentage)
          entry.percentages.push(approval.percentage)
        }
        return {
          enigmaId: enigma.id,
          approved: approval !== undefined,
          percentage: approval?.percentage ?? null,
          approvedAt: approval?.approvedAt ?? null,
          pendingReview: reviewable > 0,
          stuck: stuck > 0,
          pendingSince: submission?.pendingSince ?? null,
          lastSubmittedAt: submission?.lastSubmittedAt ?? null,
        }
      })

      const hint = myHints.get(mission.id)
      const cellHints: MatrixHints = {
        used: hint?.used ?? 0,
        percent: hint?.percent ?? 0,
        usedInPeriod: hint?.usedInPeriod ?? 0,
        percentInPeriod: hint?.percentInPeriod ?? 0,
        lastAt: hint?.lastAt ?? null,
      }
      hintsUsed += cellHints.usedInPeriod
      percentHintsUsed += cellHints.percentInPeriod
      lastHintAt = latest(lastHintAt, cellHints.lastAt)
      lastSubmittedAt = latest(lastSubmittedAt, cellLastSubmitted)
      pendingReviews += cellPending

      entry.stats.states[state] += 1
      if (state !== 'completed' && cellPending > 0) entry.stats.awaitingReview += 1
      if (isStarted || state === 'completed') entry.stats.started += 1
      entry.stats.hintsInPeriod += cellHints.usedInPeriod
      if (state === 'completed' && inPeriod(doneAt, period)) {
        entry.stats.completedInPeriod += 1
        if (counted.has(mission.id)) completedInPeriod += 1
      }

      return {
        missionId: mission.id,
        state,
        completedAt: doneAt,
        started: isStarted,
        tally: enigmaTally(mission.enigmas, approved),
        enigmas,
        hints: cellHints,
        pendingReviews: cellPending,
        pathRequires: state === 'path_locked' ? pathRequires : [],
        pathClosed: pathRequires.length > 0,
        closedUntilExpired: state === 'expired' && !isStarted && closedAtDeadline(mission),
        lastSubmittedAt: cellLastSubmitted,
      }
    })

    const progressSummary = studentProgress(
      cells.map(cell => ({ ...cell, counted: counted.has(cell.missionId) }))
    )
    const record = attendance.get(enrollment.id)
    return {
      studentId,
      enrollmentId: enrollment.id,
      name: enrollment.name,
      nickname: enrollment.nickname,
      avatarUrl: enrollment.avatarUrl,
      accountType: enrollment.accountType,
      participating: enrollment.participating,
      enrolledAt: enrollment.enrolledAt,
      lastActivityAt: latest(lastActivity.get(studentId), lastSubmittedAt, lastHintAt),
      missions: cells,
      progress: progressSummary,
      period: {
        missionsCompleted: completedInPeriod,
        approvals: periodPercentages.length,
        approvalAverage: roundedAverage(periodPercentages),
        hintsUsed,
        percentHintsUsed,
      },
      pendingReviews,
      stuckSubmissions,
      attendance:
        record && record.total > 0
          ? { total: record.total, attended: record.attended, rate: attendanceRate(record) }
          : null,
    }
  })

  // Orden de la lista: por nombre, como la lista de Alumnos.
  students.sort((a, b) => a.name.localeCompare(b.name, 'es') || a.studentId.localeCompare(b.studentId))

  const missions: MatrixMission[] = data.missions.map(mission => {
    const { stats, percentages } = missionStats.get(mission.id)!
    stats.approvalsInPeriod = percentages.length
    stats.approvalAverage = roundedAverage(percentages)
    stats.hintsPerStartedStudent =
      stats.started > 0 ? Math.round((stats.hintsInPeriod / stats.started) * 10) / 10 : null
    const exclusion = missionExclusion(mission)
    return {
      id: mission.id,
      title: mission.title,
      rarity: mission.rarity ?? 'comun',
      cover: mission.backgroundImage ?? null,
      orderIndex: mission.orderIndex,
      status: mission.status,
      deadline: mission.deadline,
      counted: exclusion === null,
      exclusion,
      expired: missionExpired(mission, now),
      enigmas: mission.enigmas,
      requiredCount: mission.enigmas.filter(e => !e.isOptional).length,
      optionalCount: mission.enigmas.filter(e => e.isOptional).length,
      prerequisiteIds: prerequisites.get(mission.id) ?? [],
      stats,
    }
  })

  const allPercentages = missions.flatMap(m => missionStats.get(m.id)!.percentages)
  // Solo los registros del alumnado de la clase (la vista previa no sale).
  const enrolled = new Set(data.enrollments.map(e => e.id))
  const records = data.attendance.filter(a => enrolled.has(a.enrollmentId))
  return {
    classId: data.classId,
    now,
    period,
    missionMap: data.missionMap,
    missions,
    students,
    summary: {
      students: students.length,
      participating: students.filter(s => s.participating).length,
      missionsCounted: missions.filter(m => m.counted).length,
      averages: groupAverages(students.filter(s => s.participating).map(s => s.progress)),
      pendingReviews: students.reduce((sum, s) => sum + s.pendingReviews, 0),
      stuckSubmissions: students.reduce((sum, s) => sum + s.stuckSubmissions, 0),
      approvalsInPeriod: allPercentages.length,
      approvalAverage: roundedAverage(allPercentages),
      attendance: {
        sessions: data.sessions,
        rate: attendanceRate({
          attended: records.reduce((sum, r) => sum + r.attended, 0),
          total: records.reduce((sum, r) => sum + r.total, 0),
        }),
      },
    },
  }
}

/**
 * Opciones de `classMatrix`: el periodo, a quién se carga (ver
 * `MatrixPopulation`) y, para las pruebas, el «ahora».
 */
export interface ClassMatrixOptions extends MatrixPopulation {
  from?: Date | null
  to?: Date | null
  now?: Date
}

/**
 * La matriz de la clase `classId` (ver el comentario del principio). Sin
 * periodo, todo lo que hay. Con `studentId`, solo la fila de esa persona: las
 * cifras de las misiones y el resumen salen entonces solo de ella. No comprueba
 * permisos.
 */
export async function classMatrix(
  classId: string,
  options: ClassMatrixOptions = {},
  db: Db = prisma
): Promise<ClassMatrix> {
  const now = options.now ?? new Date()
  const period: Period = { from: options.from ?? null, to: options.to ?? null }
  const data = await loadMatrixData(db, classId, period, {
    studentId: options.studentId,
    includePreview: options.includePreview,
  })
  return buildClassMatrix(data, period, now)
}
