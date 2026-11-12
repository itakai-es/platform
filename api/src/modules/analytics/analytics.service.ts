import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import { ActivityType, type AttendanceStatus } from '../../generated/prisma/enums.js'
import { ACTIVITY_ACTOR_INCLUDE, activityActor } from '../../utils/activity.js'
import {
  assertClassAccess,
  assertClassNotInTrash,
  type ClassUser,
  type StudentEnrollmentRef,
} from '../../utils/class-access.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { DEFAULT_AVATARS, participatingEnrollmentWhere } from '../../utils/enrollment.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'
import {
  resolveLevelConfig,
  tierForLevel,
  totalXpForLevel,
  xpForLevel,
  type LevelConfig,
} from '../../utils/level-config.js'
import { walksPath, type PathRequirement } from '../../utils/mission-path.js'
import { loadRankingContext } from '../../utils/ranking.js'
import {
  buildClassMatrix,
  classMatrix,
  loadMatrixData,
  type ClassMatrix,
  type MatrixStudent,
} from './class-matrix.js'
import {
  ALL_TIME,
  ANALYTICS_TIME_ZONE,
  MISSION_BAR_STATES,
  attendanceRate,
  missionBarState,
  percentOf,
  periodFromPreset,
  roundedAverage,
  type MissionBarState,
  type MissionCellState,
  type MissionExclusion,
  type Period,
  type PeriodPreset,
} from './definitions.js'
import {
  classSignals,
  panelSignals,
  studentSignals,
  type MissionSignal,
  type StudentSignal,
} from './signals.js'
import { classComparison, type AnonymousComparison } from './comparison.js'
import { missionCompletions } from './student-progress.js'
import { classActivityByWeek, type WeekActivity } from './weekly.js'

/**
 * La analítica que sale por la API (F1, entregas 3, 4 y 8): el panel de la
 * clase, la página de un estudiante dentro de la clase con su historial, y «Mi
 * progreso» del alumnado. Todo sale de la matriz (class-matrix.ts), las señales
 * (signals.ts) y las semanas (weekly.ts), con las definiciones de
 * definitions.ts: aquí solo se elige qué viaja y con qué forma.
 *
 * - **Profesorado:** acción `analytics.view` (lectura) en la clase, por la capa
 *   de acceso. Con la clase archivada se ve igual (solo lectura); con la clase
 *   en la papelera, nada: 404, como si no existiera (decisión 8 del plan). La
 *   capa de acceso no mira la papelera, así que lo mira `assertAnalyticsAccess`.
 *   Nombres reales.
 * - **Alumnado:** solo lo suyo, sin nombres ni ids de compañeros, sin señales y
 *   sin asistencia (decisión 11 del plan). De la clase, solo lo que deja pasar la
 *   comparación anónima (comparison.ts y utils/anonymous-stats.ts).
 *
 * Lo que viaja lleva las fechas en texto ISO (UTC): los tipos de abajo son el
 * contrato tal cual, para copiarlos en las pantallas.
 */

type Db = Prisma.TransactionClient

// ==================== Contrato ====================

export type { MissionBarState, MissionCellState, MissionExclusion, PeriodPreset, WeekActivity }

/** El periodo de la respuesta: el preset y sus extremos. */
export interface AnalyticsPeriod {
  preset: PeriodPreset
  from: string
  to: string
}

// ---- Señales ----

/** Quién es, en las señales de un estudiante: lo que hace falta para el texto y el enlace. */
export interface SignalStudentRef {
  studentId: string
  /** Nombre real: las señales son solo del profesorado. */
  studentName: string
  studentNickname: string | null
}

export interface SignalMissionRef {
  missionId: string
  missionTitle: string
}

/**
 * Una señal de un estudiante (signals.ts), con las fechas en texto y quién es
 * dentro de `data`. `code` se repite entre ámbitos (`low_average`): la clave
 * del texto es `scope` + `code`.
 */
export type AnalyticsStudentSignal = {
  scope: 'student'
  studentId: string
  /** Texto en castellano de respaldo: el front compone el suyo con `code` y `data`. */
  reason: string
} & (
  | {
      code: 'mission_expired'
      data: SignalStudentRef & SignalMissionRef & { deadline: string; started: boolean }
    }
  | {
      code: 'low_grade'
      data: SignalStudentRef &
        SignalMissionRef & {
          enigmaId: string
          enigmaTitle: string
          percentage: number
          approvedAt: string
          threshold: number
        }
    }
  | {
      code: 'low_average'
      data: SignalStudentRef & { average: number; approvals: number; threshold: number }
    }
  | {
      code: 'hints'
      data: SignalStudentRef & SignalMissionRef & { hints: number; percentHints: number }
    }
  | {
      code: 'inactive'
      data: SignalStudentRef & { lastActivityAt: string | null; days: number; openMissions: number }
    }
  | {
      code: 'low_attendance'
      data: SignalStudentRef & { rate: number; attended: number; total: number; threshold: number }
    }
)

/** Una señal de una misión (signals.ts), con las fechas en texto. */
export type AnalyticsMissionSignal = {
  scope: 'mission'
  missionId: string
  reason: string
} & (
  | {
      code: 'unfinished_after_deadline'
      data: SignalMissionRef & { deadline: string; started: number; unfinished: number; percent: number }
    }
  | {
      /** Solo en el panel: las `mission_expired` de una misión, juntas. `count`, cuántas personas. */
      code: 'students_expired'
      data: SignalMissionRef & { deadline: string; count: number }
    }
  | {
      code: 'low_average'
      data: SignalMissionRef & { average: number; approvals: number; threshold: number }
    }
  | {
      code: 'many_hints'
      data: SignalMissionRef & { hints: number; students: number; perStudent: number }
    }
)

export type AnalyticsSignal = AnalyticsStudentSignal | AnalyticsMissionSignal

/**
 * El orden de las señales en el panel y en la página del estudiante, de la más
 * a la menos importante. Primero lo que dice que alguien se está quedando
 * fuera (no hace nada, se le pasó una fecha, falta a clase), luego lo que dice
 * que un grupo tropieza con una fecha, luego el rendimiento (media baja de la
 * persona y de la misión, una nota baja suelta) y al final la ayuda pedida
 * (pistas), que también es usar bien la misión.
 *
 * `mission_expired` es de la página del estudiante; en el panel esas mismas van
 * juntas por misión (`students_expired`), en su mismo sitio.
 *
 * Dentro de un mismo código, primero lo más grave: más días sin actividad, la
 * fecha más reciente, menos asistencia, más gente sin terminar, la media o la
 * nota más baja y más pistas. Con empate, el orden de la matriz (estudiantes
 * por nombre, misiones en el orden de la clase).
 */
export const SIGNAL_IMPORTANCE = [
  'student.inactive',
  'student.mission_expired',
  'mission.students_expired',
  'student.low_attendance',
  'mission.unfinished_after_deadline',
  'student.low_average',
  'mission.low_average',
  'student.low_grade',
  'mission.many_hints',
  'student.hints',
] as const satisfies readonly `${AnalyticsSignal['scope']}.${AnalyticsSignal['code']}`[]

// ---- Panel de la clase ----

export interface ClassAnalyticsSummary {
  /** Alumnado de la clase (sin la vista previa), con las cuentas sin estrenar. */
  students: number
  /**
   * De ellos, quienes participan (no son cuentas sin estrenar): las medias de
   * este resumen son solo suyas, como las de la página de cada estudiante.
   */
  participating: number
  /** N de «X de N»: misiones con enigmas que su docente no ha bloqueado. */
  missionsCounted: number
  /** X de «X de N de media»: misiones completadas de media (un decimal). */
  averageMissionsCompleted: number | null
  /** Progreso % medio (enigmas obligatorios aprobados). */
  averagePercent: number | null
  /** Entregas por revisar de toda la clase (no es una media), sin las atascadas. */
  pendingReviews: number
  /** Asistencia media del periodo; null si no se pasó lista en él. */
  attendance: { rate: number | null; sessions: number } | null
  /** XP media (saldo, redondeada); null si la clase no usa XP. */
  xp: { average: number | null } | null
}

/** Un segmento de la barra de una misión: cuántos estudiantes hay en ese estado. */
export interface MissionBarSegment {
  state: MissionBarState
  count: number
}

/** Quien ha completado una misión, en el panel del profesorado: para su avatar. */
export interface MissionCompleter {
  id: string
  name: string
  /** El avatar de la matrícula; null si no tiene (el front pone el de su semilla). */
  avatar: string | null
}

/** Cuántas personas tienen como mucho los avatares de «quién la ha completado». */
export const COMPLETED_BY_LIMIT = 5

export interface ClassAnalyticsMission {
  id: string
  title: string
  /** La rareza y la portada, para su miniatura (como en las tarjetas y el mapa). */
  rarity: string
  cover: string | null
  /** `activa` o `bloqueada` (a mano). */
  status: string
  deadline: string | null
  expired: boolean
  /** Cuenta en «X de N»; si no, por qué (`exclusion`). */
  counted: boolean
  exclusion: MissionExclusion | null
  /**
   * La barra: un segmento por estado, siempre todos y en el orden de
   * `MISSION_BAR_STATES` (completada, por revisar, en curso, sin empezar,
   * caducada, cerrada por el camino y fuera de la cuenta), con ceros. Suman
   * `summary.students`. «Por revisar» es un estado (ver `MissionBarState`).
   */
  segments: MissionBarSegment[]
  /** Entregas por revisar (no estudiantes), sin las atascadas. */
  pendingReviews: number
  /** Enigmas aprobados en el periodo y su % medio. */
  approvals: number
  approvalAverage: number | null
  /** Pistas usadas en el periodo y su media por estudiante que la ha empezado (un decimal). */
  hints: number
  hintsPerStudent: number | null
  /**
   * Quién la ha completado: `total` personas (las del segmento «completada») y,
   * de ellas, las primeras en completarla, como mucho `COMPLETED_BY_LIMIT`.
   */
  completedBy: { total: number; students: MissionCompleter[] }
}

export interface ClassAnalyticsStudent {
  id: string
  name: string
  nickname: string | null
  /** El avatar de la matrícula; null si no tiene (el front pone el de su semilla). */
  avatar: string | null
  participating: boolean
  missionsCompleted: number
  missionsCounted: number
  percent: number | null
  lastActivityAt: string | null
  pendingReviews: number
  /** Pistas usadas en el periodo. */
  hintsUsed: number
  /**
   * Asistencia del periodo. null si la clase no ha pasado lista en el periodo
   * (`summary.attendance` es null) o si a esta persona no se le pasó.
   */
  attendance: { rate: number | null; attended: number; total: number } | null
  /** Cuántas señales tiene en el periodo, sin agrupar: las que da su página. */
  signals: number
}

/**
 * Una señal del panel de la clase. En una clase grande, las de un estudiante se
 * repiten (un `low_grade` por enigma: 1573 señales y 817 KB en la prueba de
 * volumen), así que en el panel van agrupadas por estudiante y código: `count`
 * dice cuántas hay y `data` y `reason` son las de la más grave. El detalle, en la
 * página del estudiante. Las de una misión no se repiten: `count` es siempre 1
 * (cuántas personas junta `students_expired` lo dice su `data.count`).
 */
export type ClassPanelSignal = AnalyticsSignal & { count: number }

export interface ClassAnalytics {
  period: AnalyticsPeriod
  summary: ClassAnalyticsSummary
  /** En el orden de la clase. */
  missions: ClassAnalyticsMission[]
  /** Por nombre, como la lista de Alumnos. */
  students: ClassAnalyticsStudent[]
  /**
   * Las de los estudiantes, agrupadas (ver `ClassPanelSignal`), y las de las
   * misiones, por importancia (`SIGNAL_IMPORTANCE`). Sin `mission_expired`: aquí
   * van juntas por misión, como `students_expired` (`panelSignals`).
   */
  signals: ClassPanelSignal[]
  /** Semana a semana del periodo, de lunes a domingo en hora de Madrid. */
  weeks: WeekActivity[]
}

// ---- Un estudiante ----

export interface StudentEnigmaRow {
  id: string
  title: string
  isOptional: boolean
  approved: boolean
  /** El % que puso el profesorado al aprobarlo. */
  percentage: number | null
  approvedAt: string | null
  /** Tiene una entrega esperando revisión (sin las atascadas). */
  pendingReview: boolean
  /** Desde cuándo espera la entrega pendiente más antigua. */
  pendingSince: string | null
}

export interface StudentMissionRow {
  id: string
  title: string
  /** La rareza y la portada, para su miniatura. */
  rarity: string
  cover: string | null
  /** `activa` o `bloqueada` (a mano). */
  status: string
  /** Cuenta en «X de N». */
  counted: boolean
  state: MissionCellState
  deadline: string | null
  completedAt: string | null
  /** La ha empezado de verdad (entrega, aprobado, pista o progreso con algo). */
  started: boolean
  required: { approved: number; total: number }
  /** Los opcionales: el «extra», que no cuenta para completar. */
  optional: { approved: number; total: number }
  /** Obligatorios aprobados / obligatorios (0-100); null sin obligatorios. */
  percent: number | null
  /** Media de los % con que se le aprobaron los enigmas de la misión. */
  approvalAverage: number | null
  /** Entregas suyas esperando revisión («en revisión»), sin las atascadas. */
  pendingReviews: number
  /** Pistas usadas (todas y en el periodo) y, de ellas, las de % (las que descuentan). */
  hints: { used: number; usedInPeriod: number; percentHints: number }
  /**
   * Lo cobrado con los enigmas de la misión (como `earnedXp` de las tarjetas):
   * sin el bonus de completarla, que solo consta en el muro. null en un
   * recurso que la clase no usa.
   */
  earned: { xp: number | null; coins: number | null; mana: number | null }
  /** Con `path_locked`, lo que le falta completar, en el orden de la clase. */
  pathRequires: PathRequirement[]
  /** Un elemento por enigma, en su orden. */
  enigmas: StudentEnigmaRow[]
}

/** Una cifra suya frente a la media exacta de la clase. */
export interface ComparedFigure<T = number> {
  value: T
  /** Media de quienes participan en la clase, contándola a ella; null si no hay nadie. */
  classAverage: number | null
}

export interface StudentAnalytics {
  period: AnalyticsPeriod
  student: {
    id: string
    name: string
    nickname: string | null
    avatar: string | null
    participating: boolean
    enrolledAt: string
    lastActivityAt: string | null
    /**
     * Nivel de la matrícula con el título y el color de su tramo, y cuánto lleva del
     * nivel (`progress`, 0-100: `currentXp` de `requiredXp`; en el último, 100 y
     * `requiredXp` 0). null si la clase no usa XP.
     */
    level: {
      level: number
      title: string
      color: string
      progress: number
      currentXp: number
      requiredXp: number
    } | null
    /** Asistencia del periodo; null si no se le pasó lista en él. */
    attendance: { rate: number | null; attended: number; total: number } | null
  }
  /**
   * Sus cifras con la media exacta de la clase: la de quienes participan, contándola
   * a ella. Es una sola cifra, la misma para cualquier estudiante y la del panel
   * (`summary`). Medias con un decimal, salvo el % y la XP (enteros).
   */
  figures: {
    /** Cuántas personas participan (entran en las medias); con 0, todas las medias son null. */
    comparedWith: number
    /** «X de N»: `value` es X; `counted`, N. */
    missions: ComparedFigure & { counted: number }
    percent: ComparedFigure<number | null>
    /** El saldo de la matrícula (nunca «sobre un máximo»); null si la clase no usa XP. */
    xp: ComparedFigure | null
    pendingReviews: ComparedFigure
    /** Pistas usadas en el periodo. */
    hints: ComparedFigure
  }
  /** Todas las misiones de la clase, en su orden (también las que no cuentan, con `counted: false`). */
  missions: StudentMissionRow[]
  /** Sus señales del periodo, por importancia. */
  signals: AnalyticsStudentSignal[]
  weeks: WeekActivity[]
}

// ---- Historial de un estudiante ----

/** El autor de una entrada: un docente, con la clave de su avatar si la tiene. */
export interface TimelineActor {
  id: string | null
  name: string
  avatar: string | null
}

/**
 * Una entrada del muro de la clase, con la misma forma que el muro de hoy
 * (`GET /teacher/classes/:classId/activities`), para `useActivityFormatter`.
 */
export interface TimelineActivityEntry {
  kind: 'activity'
  id: string
  type: ActivityType
  timestamp: string
  avatar: string
  username: string
  enigmaTitle: string | null
  enigmaXp: number | null
  missionTitle: string | null
  missionXp: number | null
  newLevel: number | null
  newTitle: string | null
  className: string | null
  achievementName: string | null
  badgeName: string | null
  badgeImage: string | null
  badgeRarity: string | null
  xpAmount: number | null
  source: string | null
  teacherName: string | null
  metadata: Prisma.JsonValue
  studentId: string
  classId: string | null
  actor: TimelineActor | null
}

/**
 * Una sesión de asistencia de esa persona. `timestamp` es la hora de inicio
 * del tramo en Madrid (las 00:00 si la sesión no tiene horario): solo ordena.
 */
export interface TimelineAttendanceEntry {
  kind: 'attendance'
  id: string
  type: 'attendance'
  timestamp: string
  studentId: string
  classId: string
  /** El día de la sesión, `AAAA-MM-DD`. */
  date: string
  /** `HH:MM`, o "" si la sesión no tiene horario. */
  startTime: string
  endTime: string | null
  status: AttendanceStatus
  note: string | null
  /** Quien la marcó por última vez (o quien pasó lista). */
  actor: TimelineActor | null
}

export type TimelineEntry = TimelineActivityEntry | TimelineAttendanceEntry

/** Los tipos por los que se puede filtrar: los del muro y `attendance`. */
export const TIMELINE_TYPES = [...Object.values(ActivityType), 'attendance'] as const
export type TimelineType = (typeof TIMELINE_TYPES)[number]

export interface StudentTimeline {
  /** De la más reciente a la más antigua. */
  entries: TimelineEntry[]
  /** Para pedir la página siguiente (`?cursor=`); null si no hay más. */
  nextCursor: string | null
}

// ---- «Mi progreso» del alumnado ----

export interface MyProgress {
  summary: {
    /** «X de N misiones». */
    missionsCompleted: number
    missionsCounted: number
    /** Enigmas obligatorios aprobados de esas N, en %; null si no hay ninguno. */
    percent: number | null
    /** Los opcionales aprobados: el «extra». */
    extra: { approved: number; total: number }
    /** Saldos de su matrícula; null en un recurso que la clase no usa. */
    xp: number | null
    coins: number | null
    mana: number | null
    /** Insignias de las misiones de la clase. */
    badges: { earned: number; total: number }
  }
  /**
   * Sus misiones en el orden de la clase: las completadas y las pendientes (las
   * que cuentan). Las que no cuentan y no ha completado no salen. De una cerrada
   * (por el camino o a mano, también si además ha caducado) no viajan los enigmas,
   * como en su listado.
   */
  missions: StudentMissionRow[]
  /**
   * La comparación anónima con el resto de la clase, ya hecha: cada cifra con su
   * valor exacto y, según lo que dejen las reglas, la media redondeada y la banda,
   * o por qué faltan. null si la clase la tiene apagada.
   */
  comparison: AnonymousComparison | null
}

// ==================== Piezas comunes ====================

const iso = (date: Date) => date.toISOString()
const isoOrNull = (date: Date | null | undefined) => (date ? date.toISOString() : null)

/** Con un decimal: «2,4 misiones de media». */
const oneDecimal = (n: number) => Math.round(n * 10) / 10

/** Media con un decimal; null sin valores. */
function averageOneDecimal(values: number[]): number | null {
  if (values.length === 0) return null
  return oneDecimal(values.reduce((sum, v) => sum + v, 0) / values.length)
}

/** Las fechas de un objeto plano, en texto (lo que hace JSON, con su tipo). */
type Wire<T> = T extends Date ? string : T extends object ? { [K in keyof T]: Wire<T[K]> } : T

function wireData<T extends object>(data: T): Wire<T> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value instanceof Date ? iso(value) : value])
  ) as Wire<T>
}

// Si signals.ts cambia la forma de una señal, esto deja de compilar: lo que
// viaja es su `data` con las fechas en texto, más la referencia de la persona.
type CodeAndData<S, Ref> = S extends { code: infer C; data: infer D } ? { code: C; data: Omit<D, keyof Ref> } : never
type SameShape<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const signalShapesMatch: [
  SameShape<CodeAndData<Wire<StudentSignal>, object>, CodeAndData<AnalyticsStudentSignal, SignalStudentRef>>,
  SameShape<CodeAndData<Wire<MissionSignal>, object>, CodeAndData<AnalyticsMissionSignal, SignalMissionRef>>,
] = [true, true]
void signalShapesMatch

function studentSignalOut(
  signal: StudentSignal,
  student: { name: string; nickname: string | null }
): AnalyticsStudentSignal {
  return {
    scope: 'student',
    code: signal.code,
    studentId: signal.studentId,
    reason: signal.reason,
    data: {
      ...wireData(signal.data),
      studentId: signal.studentId,
      studentName: student.name,
      studentNickname: student.nickname,
    },
  } as AnalyticsStudentSignal
}

function missionSignalOut(signal: MissionSignal): AnalyticsMissionSignal {
  return {
    scope: 'mission',
    code: signal.code,
    missionId: signal.missionId,
    reason: signal.reason,
    data: { ...wireData(signal.data), missionId: signal.missionId, missionTitle: signal.missionTitle },
  } as AnalyticsMissionSignal
}

/** Lo grave de una señal dentro de su código: mayor, antes (ver `SIGNAL_IMPORTANCE`). */
function severity(signal: AnalyticsSignal): number {
  if (signal.scope === 'student') {
    switch (signal.code) {
      case 'inactive':
        return signal.data.days
      case 'mission_expired':
        return Date.parse(signal.data.deadline)
      case 'low_attendance':
        return -signal.data.rate
      case 'low_average':
        return -signal.data.average
      case 'low_grade':
        return -signal.data.percentage
      case 'hints':
        return signal.data.hints
    }
  }
  switch (signal.code) {
    case 'unfinished_after_deadline':
      return signal.data.percent
    case 'students_expired':
      return Date.parse(signal.data.deadline)
    case 'low_average':
      return -signal.data.average
    case 'many_hints':
      return signal.data.perStudent
  }
}

/** Las señales por importancia (ver `SIGNAL_IMPORTANCE`); estable con empate. */
export function sortSignals<S extends AnalyticsSignal>(signals: S[]): S[] {
  const rank = (s: AnalyticsSignal) =>
    (SIGNAL_IMPORTANCE as readonly string[]).indexOf(`${s.scope}.${s.code}`)
  return signals
    .map((signal, position) => ({ signal, position }))
    .sort(
      (a, b) =>
        rank(a.signal) - rank(b.signal) ||
        severity(b.signal) - severity(a.signal) ||
        a.position - b.position
    )
    .map(({ signal }) => signal)
}

/**
 * Las señales del panel: una por estudiante y código (ver `ClassPanelSignal`).
 * Se parte de la lista ya ordenada, así que la primera de cada grupo es la más
 * grave y el orden del panel sigue siendo el de `sortSignals`.
 */
export function groupStudentSignals(sorted: AnalyticsSignal[]): ClassPanelSignal[] {
  const groups = new Map<string, ClassPanelSignal>()
  sorted.forEach((signal, position) => {
    const key =
      signal.scope === 'student' ? `student:${signal.studentId}:${signal.code}` : `mission:${position}`
    const group = groups.get(key)
    if (group) group.count += 1
    else groups.set(key, { ...signal, count: 1 })
  })
  return [...groups.values()]
}

function periodOut(preset: PeriodPreset, period: Period): AnalyticsPeriod {
  return { preset, from: iso(period.from!), to: iso(period.to!) }
}

/** El permiso de la analítica y la papelera (ver `assertClassNotInTrash`). */
async function assertAnalyticsAccess(classId: string, userId: string, db: Db) {
  await assertClassAccess(classId, userId, 'analytics.view', db)
  await assertClassNotInTrash(classId, db)
}

/** La matrícula vigente (sin la vista previa) de `studentId` en la clase, o 404 sin decir si la cuenta existe. */
async function enrolledStudent(classId: string, studentId: string, db: Db = prisma) {
  const enrollment = await db.classEnrollment.findFirst({
    where: { classId, studentId, isPreview: false },
    select: {
      id: true,
      xp: true,
      level: true,
      student: { select: { name: true } },
      class: { select: { name: true, settings: true, levelConfig: true } },
    },
  })
  if (!enrollment) throw new NotFoundError('Estudiante no encontrado en esta clase')
  return enrollment
}

type Earned = { xp: number; coins: number; mana: number }

/** Lo cobrado por `studentId` con los enigmas de cada misión de la clase. Una consulta agrupada. */
async function earnedByMission(classId: string, studentId: string, db: Db = prisma) {
  const rows = await db.$queryRaw<({ missionId: string } & Earned)[]>`
    SELECT e.mission_id AS "missionId", sum(p.xp_earned)::int AS xp,
           sum(p.coins_earned)::int AS coins, sum(p.mana_earned)::int AS mana
      FROM missions m
      JOIN mission_enigmas e ON e.mission_id = m.id
      JOIN student_enigma_progress p ON p.enigma_id = e.id
     WHERE m.class_id = ${classId} AND p.student_id = ${studentId}
     GROUP BY e.mission_id`
  return new Map(rows.map(r => [r.missionId, r]))
}

/** Las filas de las misiones de un estudiante de la matriz, con lo cobrado en cada una. */
function missionRows(
  matrix: ClassMatrix,
  student: MatrixStudent,
  earned: Map<string, Earned>,
  resources: { xp: boolean; coins: boolean; mana: boolean }
): StudentMissionRow[] {
  const byId = new Map(matrix.missions.map(m => [m.id, m]))
  return matrix.missions.map((mission, index) => {
    const cell = student.missions[index]!
    const got = earned.get(mission.id)
    const percentages = cell.enigmas.filter(e => e.approved && e.percentage !== null).map(e => e.percentage!)
    return {
      id: mission.id,
      title: mission.title,
      rarity: mission.rarity,
      cover: mission.cover,
      status: mission.status,
      counted: mission.counted,
      state: cell.state,
      deadline: isoOrNull(mission.deadline),
      completedAt: isoOrNull(cell.completedAt),
      started: cell.started,
      required: { ...cell.tally.required },
      optional: { ...cell.tally.optional },
      percent: cell.tally.percent,
      approvalAverage: roundedAverage(percentages),
      pendingReviews: cell.pendingReviews,
      hints: {
        used: cell.hints.used,
        usedInPeriod: cell.hints.usedInPeriod,
        percentHints: cell.hints.percent,
      },
      earned: {
        xp: resources.xp ? (got?.xp ?? 0) : null,
        coins: resources.coins ? (got?.coins ?? 0) : null,
        mana: resources.mana ? (got?.mana ?? 0) : null,
      },
      pathRequires: cell.pathRequires.map(id => {
        const required = byId.get(id)
        return {
          id,
          title: required?.title ?? '',
          state: required?.status === 'bloqueada' ? ('teacher' as const) : ('open' as const),
        }
      }),
      enigmas: mission.enigmas.map((enigma, e) => {
        const enigmaCell = cell.enigmas[e]!
        return {
          id: enigma.id,
          title: enigma.title,
          isOptional: enigma.isOptional,
          approved: enigmaCell.approved,
          percentage: enigmaCell.percentage,
          approvedAt: isoOrNull(enigmaCell.approvedAt),
          pendingReview: enigmaCell.pendingReview,
          pendingSince: enigmaCell.pendingReview ? isoOrNull(enigmaCell.pendingSince) : null,
        }
      }),
    }
  })
}

function attendanceOut(attendance: MatrixStudent['attendance']) {
  return attendance
    ? { rate: attendance.rate, attended: attendance.attended, total: attendance.total }
    : null
}

/**
 * Quién ha completado la misión `index` de la matriz: cuántas personas y las
 * primeras en hacerlo (a igualdad, por nombre), como mucho `COMPLETED_BY_LIMIT`.
 * Sale de la matriz ya cargada: sin consultas.
 */
export function missionCompletedBy(
  matrix: ClassMatrix,
  index: number
): ClassAnalyticsMission['completedBy'] {
  const done = matrix.students
    .filter(student => student.missions[index]!.state === 'completed')
    .map(student => ({ student, at: student.missions[index]!.completedAt?.getTime() ?? Infinity }))
    .sort((a, b) => a.at - b.at || a.student.name.localeCompare(b.student.name, 'es'))
  return {
    total: done.length,
    students: done.slice(0, COMPLETED_BY_LIMIT).map(({ student }) => ({
      id: student.studentId,
      name: student.name,
      avatar: student.avatarUrl,
    })),
  }
}

/**
 * Cuánto lleva del nivel `level` con `xp`: como la barra de nivel del alumnado
 * (`levelInfo`), pero del nivel que tiene guardado la matrícula, que es el que se
 * enseña. En el último nivel, lleno.
 */
export function levelProgress(level: number, xp: number, cfg: LevelConfig) {
  if (level >= cfg.cap) return { progress: 100, currentXp: 0, requiredXp: 0 }
  const requiredXp = xpForLevel(level, cfg)
  const currentXp = Math.min(requiredXp, Math.max(0, xp - totalXpForLevel(level, cfg)))
  return {
    progress: requiredXp > 0 ? Math.round((currentXp / requiredXp) * 100) : 0,
    currentXp,
    requiredXp,
  }
}

// ==================== Panel de la clase ====================

/**
 * El panel de la clase (`GET /teacher/classes/:classId/analytics`): la matriz
 * entera, sus señales, la XP media y las semanas del periodo.
 */
export async function getClassAnalytics(
  userId: string,
  classId: string,
  preset: PeriodPreset,
  now: Date = new Date(),
  db: Db = prisma
): Promise<ClassAnalytics> {
  await assertAnalyticsAccess(classId, userId, db)
  const period = periodFromPreset(preset, now)

  const [matrix, weeks, cls, xp] = await Promise.all([
    classMatrix(classId, { ...period, now }, db),
    classActivityByWeek(classId, period, db),
    db.class.findUnique({ where: { id: classId }, select: { settings: true } }),
    db.classEnrollment.aggregate({
      where: { classId, isPreview: false, ...participatingEnrollmentWhere },
      _avg: { xp: true },
    }),
  ])
  const settings = resolveClassSettings(cls?.settings)
  const signals = classSignals(matrix)
  const shownSignals = panelSignals(signals)
  const studentById = new Map(matrix.students.map(s => [s.studentId, s]))
  const signalCount = new Map<string, number>()
  for (const signal of signals.students) {
    signalCount.set(signal.studentId, (signalCount.get(signal.studentId) ?? 0) + 1)
  }

  const tookAttendance = matrix.summary.attendance.sessions > 0
  const { summary } = matrix
  const { averages } = summary
  // Las medias, solo de quienes participan, como en la página de cada estudiante
  // (`classAverages`): las cifras cuadran entre pantallas. Las cuentas sin
  // estrenar salen en la tabla, pero no entran aquí.
  const participants = matrix.students.filter(student => student.participating)
  const attendanceAverage = attendanceRate({
    attended: participants.reduce((sum, s) => sum + (s.attendance?.attended ?? 0), 0),
    total: participants.reduce((sum, s) => sum + (s.attendance?.total ?? 0), 0),
  })

  const missions: ClassAnalyticsMission[] = matrix.missions.map((mission, index) => {
    const counts = new Map<MissionBarState, number>(MISSION_BAR_STATES.map(state => [state, 0]))
    for (const student of matrix.students) {
      const cell = student.missions[index]!
      const state = missionBarState(cell.state, cell.pendingReviews)
      counts.set(state, counts.get(state)! + 1)
    }
    return {
      id: mission.id,
      title: mission.title,
      rarity: mission.rarity,
      cover: mission.cover,
      status: mission.status,
      deadline: isoOrNull(mission.deadline),
      expired: mission.expired,
      counted: mission.counted,
      exclusion: mission.exclusion,
      segments: MISSION_BAR_STATES.map(state => ({ state, count: counts.get(state)! })),
      pendingReviews: mission.stats.pendingReviews,
      approvals: mission.stats.approvalsInPeriod,
      approvalAverage: mission.stats.approvalAverage,
      hints: mission.stats.hintsInPeriod,
      hintsPerStudent: mission.stats.hintsPerStartedStudent,
      completedBy: missionCompletedBy(matrix, index),
    }
  })

  const students: ClassAnalyticsStudent[] = matrix.students.map(student => ({
    id: student.studentId,
    name: student.name,
    nickname: student.nickname,
    avatar: student.avatarUrl,
    participating: student.participating,
    missionsCompleted: student.progress.missionsCompleted,
    missionsCounted: student.progress.missionsCounted,
    percent: student.progress.percent,
    lastActivityAt: isoOrNull(student.lastActivityAt),
    pendingReviews: student.pendingReviews,
    hintsUsed: student.period.hintsUsed,
    attendance: tookAttendance ? attendanceOut(student.attendance) : null,
    signals: signalCount.get(student.studentId) ?? 0,
  }))

  const xpAverage = xp._avg.xp
  return {
    period: periodOut(preset, period),
    summary: {
      students: summary.students,
      participating: summary.participating,
      missionsCounted: summary.missionsCounted,
      averageMissionsCompleted: averages.missionsCompleted,
      averagePercent: averages.percent,
      pendingReviews: summary.pendingReviews,
      attendance: tookAttendance
        ? { rate: attendanceAverage, sessions: summary.attendance.sessions }
        : null,
      xp: settings.xp ? { average: xpAverage === null ? null : Math.round(xpAverage) } : null,
    },
    missions,
    students,
    signals: groupStudentSignals(
      sortSignals<AnalyticsSignal>([
        ...shownSignals.students.map(s => studentSignalOut(s, studentById.get(s.studentId)!)),
        ...shownSignals.missions.map(missionSignalOut),
      ])
    ),
    weeks,
  }
}

// ==================== Un estudiante ====================

/** Una fila de `classAverages`: lo de una persona que entra en las medias. */
interface AverageRow {
  studentId: string
  pendingReviews: number
  hints: number
}

/**
 * Las medias de la clase para el profesorado: de quienes participan
 * (`participatingEnrollmentWhere`), sin la vista previa. Es una sola cifra, la
 * misma que en el panel y el ranking, sea quien sea a quien se mire. Más barato que
 * la matriz entera: las matrículas, quién ha completado qué (`missionCompletions`) y
 * una consulta con un recuento por persona, con los conjuntos de `matrix`, la de la
 * persona que se mira (qué misiones cuentan y qué enigmas son obligatorios), así que
 * las reglas son las mismas que las de la matriz (lo vigila la prueba de la ruta).
 */
async function classAverages(classId: string, matrix: ClassMatrix, period: Period, db: Db = prisma) {
  const participants = await db.classEnrollment.findMany({
    where: { classId, isPreview: false, ...participatingEnrollmentWhere },
    select: { studentId: true, xp: true },
  })
  const counted = matrix.missions.filter(m => m.counted)
  const requiredTotal = counted.reduce((sum, m) => sum + m.requiredCount, 0)
  const enigmaIds = matrix.missions.flatMap(m => m.enigmas.map(e => e.id))
  const missionIds = matrix.missions.map(m => m.id)
  const ids = participants.map(p => p.studentId)
  const inRange = (column: Prisma.Sql) =>
    Prisma.sql`(${period.from}::timestamp IS NULL OR ${column} >= ${period.from}::timestamp) AND (${period.to}::timestamp IS NULL OR ${column} <= ${period.to}::timestamp)`

  const [completions, rows] = await Promise.all([
    missionCompletions(counted, { db }),
    ids.length === 0
      ? []
      : db.$queryRaw<AverageRow[]>`
          SELECT ids.student_id AS "studentId",
                 (SELECT count(*) FROM enigma_submissions s
                   WHERE s.student_id = ids.student_id
                     AND s.enigma_id = ANY(${enigmaIds}::text[])
                     AND s.status = 'pendiente'
                     AND NOT EXISTS (
                       SELECT 1 FROM student_enigma_progress a
                        WHERE a.student_id = s.student_id AND a.enigma_id = s.enigma_id
                     ))::int AS "pendingReviews",
                 (SELECT count(*) FROM mission_hint_uses h
                   WHERE h.student_id = ids.student_id
                     AND h.mission_id = ANY(${missionIds}::text[])
                     AND ${inRange(Prisma.sql`h.created_at`)})::int AS hints
            FROM unnest(${ids}::text[]) AS ids(student_id)`,
  ])

  const percents = ids
    .map(id => percentOf(completions.requiredApprovedBy.get(id) ?? 0, requiredTotal))
    .filter((p): p is number => p !== null)
  return {
    comparedWith: participants.length,
    missions: averageOneDecimal(ids.map(id => completions.datesBy.get(id)?.size ?? 0)),
    percent: roundedAverage(percents),
    xp: roundedAverage(participants.map(p => p.xp)),
    pendingReviews: averageOneDecimal(rows.map(r => r.pendingReviews)),
    hints: averageOneDecimal(rows.map(r => r.hints)),
  }
}

/**
 * La página de un estudiante dentro de la clase
 * (`GET /teacher/classes/:classId/students/:studentId/analytics`). Sin la
 * matriz de toda la clase: la fila de esa persona (la matriz filtrada) y las
 * medias de la clase con `classAverages`. 404 si no está matriculada.
 */
export async function getStudentAnalytics(
  userId: string,
  classId: string,
  studentId: string,
  preset: PeriodPreset,
  now: Date = new Date(),
  db: Db = prisma
): Promise<StudentAnalytics> {
  await assertAnalyticsAccess(classId, userId, db)
  const enrollment = await enrolledStudent(classId, studentId, db)
  const settings = resolveClassSettings(enrollment.class.settings)
  const period = periodFromPreset(preset, now)

  const [matrix, weeks, earned] = await Promise.all([
    classMatrix(classId, { ...period, now, studentId }, db),
    classActivityByWeek(classId, { ...period, studentId }, db),
    earnedByMission(classId, studentId, db),
  ])
  const student = matrix.students[0]
  if (!student) throw new NotFoundError('Estudiante no encontrado en esta clase')
  const averages = await classAverages(classId, matrix, period, db)
  const levelConfig = resolveLevelConfig(enrollment.class.levelConfig)
  const tier = tierForLevel(enrollment.level, levelConfig)

  return {
    period: periodOut(preset, period),
    student: {
      id: student.studentId,
      name: student.name,
      nickname: student.nickname,
      avatar: student.avatarUrl,
      participating: student.participating,
      enrolledAt: iso(student.enrolledAt),
      lastActivityAt: isoOrNull(student.lastActivityAt),
      level: settings.xp
        ? {
            level: enrollment.level,
            title: tier.title,
            color: tier.color,
            ...levelProgress(enrollment.level, enrollment.xp, levelConfig),
          }
        : null,
      attendance: attendanceOut(student.attendance),
    },
    figures: {
      comparedWith: averages.comparedWith,
      missions: {
        value: student.progress.missionsCompleted,
        counted: student.progress.missionsCounted,
        classAverage: averages.missions,
      },
      percent: { value: student.progress.percent, classAverage: averages.percent },
      xp: settings.xp ? { value: enrollment.xp, classAverage: averages.xp } : null,
      pendingReviews: { value: student.pendingReviews, classAverage: averages.pendingReviews },
      hints: { value: student.period.hintsUsed, classAverage: averages.hints },
    },
    missions: missionRows(matrix, student, earned, settings),
    signals: sortSignals(studentSignals(matrix, student).map(s => studentSignalOut(s, student))),
    weeks,
  }
}

// ==================== Historial de un estudiante ====================

/** El cursor opaco: la fecha y el id de la última entrada servida. */
function encodeCursor(at: Date, id: string): string {
  return Buffer.from(JSON.stringify([at.toISOString(), id])).toString('base64url')
}

function decodeCursor(cursor: string): { at: Date; id: string } {
  try {
    const [at, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown[]
    const date = typeof at === 'string' ? new Date(at) : null
    if (date && !Number.isNaN(date.getTime()) && typeof id === 'string' && id.length <= 64) {
      return { at: date, id }
    }
  } catch {
    // Cae al error de abajo.
  }
  throw new ValidationError('Cursor no válido')
}

export interface TimelineQuery {
  cursor?: string
  /** De 1 a 50 (ver `wallLimit`). */
  limit: number
  /** Sin filtro, todo; si no, solo esos tipos. */
  types?: TimelineType[]
}

/** Una fila de actividad leída para el historial, con lo que necesita `activityActor`. */
type ActivityRow = Prisma.ActivityGetPayload<{ include: typeof ACTIVITY_ACTOR_INCLUDE }>

/**
 * Una entrada del muro con la forma del muro de la clase de hoy
 * (`teachersService.getClassActivities`): los campos del muro, con el respaldo
 * de `metadata`, y el autor con su avatar.
 */
function wallEntry(
  a: ActivityRow,
  fallback: { username: string; className: string }
): TimelineActivityEntry {
  const metadata = (
    a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata) ? a.metadata : {}
  ) as Record<string, unknown>
  const pick = <T>(value: T | null, key: string): T | null =>
    value ?? ((metadata[key] as T | undefined) ?? null)
  return {
    kind: 'activity',
    id: a.id,
    type: a.type,
    timestamp: iso(a.createdAt),
    avatar: a.avatar || DEFAULT_AVATARS[0]!,
    username: a.username || fallback.username,
    enigmaTitle: a.enigmaTitle || pick<string>(null, 'enigmaTitle'),
    enigmaXp: a.enigmaXp || pick<number>(null, 'enigmaXp'),
    missionTitle: pick(a.missionTitle, 'missionTitle'),
    missionXp: pick(a.missionXp, 'missionXp'),
    newLevel: pick(a.newLevel, 'newLevel'),
    newTitle: pick(a.newTitle, 'newTitle'),
    className: a.className || pick<string>(null, 'className') || fallback.className,
    achievementName: pick(a.achievementName, 'achievementName'),
    badgeName: pick(a.badgeName, 'badgeName'),
    badgeImage: pick(a.badgeImage, 'badgeImage'),
    badgeRarity: pick(a.badgeRarity, 'badgeRarity'),
    xpAmount: pick(a.xpAmount, 'xpAmount'),
    source: pick(a.source, 'source'),
    teacherName: pick(a.teacherName, 'teacherName'),
    metadata: a.metadata,
    studentId: a.userId,
    classId: a.classId,
    actor: activityActor(a),
  }
}

/**
 * El historial de un estudiante en la clase
 * (`GET /teacher/classes/:classId/students/:studentId/timeline`): su muro en
 * esa clase y su asistencia, mezclados por fecha, de lo más reciente a lo más
 * antiguo, por páginas con un cursor `(fecha, id)`.
 *
 * Solo las entradas de esta clase: fuera quedan las insignias del sistema y las
 * `xp_gained` sin clase (el aviso de seguridad viejo), que no tienen clase. Una
 * consulta elige la página (las dos fuentes, ordenadas y cortadas en SQL) y otras
 * dos la completan por id.
 */
export async function getStudentTimeline(
  userId: string,
  classId: string,
  studentId: string,
  query: TimelineQuery,
  db: Db = prisma
): Promise<StudentTimeline> {
  await assertAnalyticsAccess(classId, userId, db)
  const enrollment = await enrolledStudent(classId, studentId, db)
  const after = query.cursor ? decodeCursor(query.cursor) : null
  const types = query.types && query.types.length > 0 ? new Set(query.types) : null
  const activityTypes = types ? [...types].filter(t => t !== 'attendance') : null
  const wantsActivities = !types || activityTypes!.length > 0
  const wantsAttendance = !types || types.has('attendance')

  const parts: Prisma.Sql[] = []
  if (wantsActivities) {
    parts.push(Prisma.sql`
      SELECT a.id, a.created_at AS at, 'activity' AS kind
        FROM activities a
       WHERE a.user_id = ${studentId} AND a.class_id = ${classId}
         AND (${activityTypes}::text[] IS NULL OR a.type::text = ANY(${activityTypes}::text[]))`)
  }
  if (wantsAttendance) {
    // La hora de pared de Madrid del inicio del tramo, pasada a UTC como el resto.
    parts.push(Prisma.sql`
      SELECT r.id,
             ((s.date + CASE WHEN s.start_time ~ '^[0-9]{2}:[0-9]{2}$' THEN s.start_time::time ELSE time '00:00' END)
               AT TIME ZONE ${ANALYTICS_TIME_ZONE}::text) AT TIME ZONE 'UTC' AS at,
             'attendance' AS kind
        FROM attendance_records r
        JOIN attendance_sessions s ON s.id = r.session_id
       WHERE r.enrollment_id = ${enrollment.id} AND s.class_id = ${classId}`)
  }

  const page = await db.$queryRaw<{ id: string; at: Date; kind: 'activity' | 'attendance' }[]>`
    SELECT id, at, kind FROM (${Prisma.join(parts, ' UNION ALL ')}) entries
     WHERE ${after ? Prisma.sql`(at < ${after.at}::timestamp OR (at = ${after.at}::timestamp AND id COLLATE "C" < ${after.id}::text COLLATE "C"))` : Prisma.sql`TRUE`}
     ORDER BY at DESC, id COLLATE "C" DESC
     LIMIT ${query.limit + 1}`

  const rows = page.slice(0, query.limit)
  const activityIds = rows.filter(r => r.kind === 'activity').map(r => r.id)
  const attendanceIds = rows.filter(r => r.kind === 'attendance').map(r => r.id)
  const actorSelect = { select: { id: true, name: true, avatar: true } } as const
  const [activities, records] = await Promise.all([
    activityIds.length
      ? db.activity.findMany({ where: { id: { in: activityIds } }, include: ACTIVITY_ACTOR_INCLUDE })
      : [],
    attendanceIds.length
      ? db.attendanceRecord.findMany({
          where: { id: { in: attendanceIds } },
          select: {
            id: true,
            status: true,
            note: true,
            updatedBy: actorSelect,
            session: {
              select: { date: true, startTime: true, endTime: true, takenBy: actorSelect },
            },
          },
        })
      : [],
  ])
  const activityById = new Map(activities.map(a => [a.id, a]))
  const recordById = new Map(records.map(r => [r.id, r]))
  const fallback = { username: enrollment.student.name, className: enrollment.class.name }

  const entries: TimelineEntry[] = []
  for (const row of rows) {
    if (row.kind === 'activity') {
      const activity = activityById.get(row.id)
      if (activity) entries.push(wallEntry(activity, fallback))
      continue
    }
    const record = recordById.get(row.id)
    if (!record) continue
    const actor = record.updatedBy ?? record.session.takenBy
    entries.push({
      kind: 'attendance',
      id: record.id,
      type: 'attendance',
      timestamp: iso(row.at),
      studentId,
      classId,
      date: record.session.date.toISOString().slice(0, 10),
      startTime: record.session.startTime,
      endTime: record.session.endTime,
      status: record.status,
      note: record.note,
      actor: actor ? { id: actor.id, name: actor.name, avatar: actor.avatar } : null,
    })
  }

  const last = rows[rows.length - 1]
  return {
    entries,
    nextCursor: page.length > query.limit && last ? encodeCursor(last.at, last.id) : null,
  }
}

// ==================== «Mi progreso» del alumnado ====================

/**
 * «Mi progreso» (`GET /students/classes/:classId/progress`): lo suyo y nada de
 * nadie más. La matrícula la deja `requireStudentEnrollment` (la del alumno o
 * la de vista previa de su profesorado). Con la clase archivada se cierra, como
 * su portada.
 *
 * Es la matriz de esa sola persona, sin periodo. Con la vista previa (o quien no
 * es alumno) no hay cierres del camino, como en su lista de misiones
 * (`walksPath`).
 */
export async function getMyProgress(
  user: ClassUser,
  enrollment: StudentEnrollmentRef,
  classId: string,
  now: Date = new Date(),
  db: Db = prisma
): Promise<MyProgress> {
  const mine = await db.classEnrollment.findUnique({
    where: { id: enrollment.id },
    select: {
      studentId: true,
      xp: true,
      coins: true,
      mana: true,
      class: { select: { archived: true, settings: true } },
    },
  })
  if (!mine) throw new NotFoundError('No estás en esta clase')
  if (mine.class.archived) {
    throw new NotFoundError('Esta clase está archivada y ya no está disponible')
  }
  const settings = resolveClassSettings(mine.class.settings)
  const studentId = mine.studentId

  const [data, earned, badgesTotal, badgesEarned, rankingContext] = await Promise.all([
    loadMatrixData(db, classId, ALL_TIME, { studentId, includePreview: true }),
    earnedByMission(classId, studentId, db),
    db.badge.count({ where: { mission: { classId } } }),
    db.studentBadge.count({ where: { studentId, badge: { mission: { classId } } } }),
    loadRankingContext(classId),
  ])
  // Sin camino para quien no lo recorre (la vista previa del profesorado).
  const matrix = buildClassMatrix(
    { ...data, missionMap: data.missionMap && walksPath(user) },
    ALL_TIME,
    now
  )
  const student = matrix.students[0]
  if (!student) throw new NotFoundError('No estás en esta clase')

  const missions = missionRows(matrix, student, earned, settings)
    // Cerrada por el camino o por su docente: sin enigmas, como en su listado. Se
    // mira el cierre, no el estado: la cerrada que caduca sale `expired` y sigue cerrada.
    .map((row, index) =>
      student.missions[index]!.pathClosed || row.status === 'bloqueada' ? { ...row, enigmas: [] } : row
    )
    .filter(row => row.state !== 'excluded')

  const { progress } = student
  return {
    summary: {
      missionsCompleted: progress.missionsCompleted,
      missionsCounted: progress.missionsCounted,
      percent: progress.percent,
      extra: { approved: progress.extraApproved, total: progress.extraTotal },
      xp: settings.xp ? mine.xp : null,
      coins: settings.coins ? mine.coins : null,
      mana: settings.mana ? mine.mana : null,
      badges: { earned: badgesEarned, total: badgesTotal },
    },
    missions,
    comparison: await classComparison(enrollment.id, classId, rankingContext, { now, db }),
  }
}
