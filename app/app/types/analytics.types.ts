/**
 * El contrato de la analítica, copiado de
 * `api/src/modules/analytics/analytics.service.ts`: lo que manda la API, con las
 * fechas en texto ISO (UTC).
 */

export type AnalyticsPeriodPreset = 'course' | 'last30' | 'last7'

export const ANALYTICS_PERIOD_PRESETS: readonly AnalyticsPeriodPreset[] = [
  'course',
  'last30',
  'last7',
]

export type MissionBarState =
  | 'completed'
  | 'awaiting_review'
  | 'in_progress'
  | 'not_started'
  | 'expired'
  | 'path_locked'
  | 'excluded'

export type MissionCellState =
  | 'completed'
  | 'excluded'
  | 'expired'
  | 'path_locked'
  | 'in_progress'
  | 'not_started'

export type MissionExclusion = 'teacher_locked' | 'no_enigmas'

export interface AnalyticsPeriod {
  preset: AnalyticsPeriodPreset
  from: string
  to: string
}

export interface WeekActivity {
  /** El lunes de la semana, `AAAA-MM-DD`. */
  week: string
  submissions: number
  approvals: number
  missionsCompleted: number
  hintsUsed: number
  behaviorsPositive: number
  behaviorsNegative: number
  rewards: number
  xpFromEnigmas: number
  xpFromBehaviors: number
}

// ---- Señales ----

interface SignalStudentRef {
  studentId: string
  studentName: string
  studentNickname: string | null
}

interface SignalMissionRef {
  missionId: string
  missionTitle: string
}

export type AnalyticsStudentSignal = {
  scope: 'student'
  studentId: string
  /** Texto en castellano de respaldo: solo si no hay texto para ese código. */
  reason: string
  /** En el panel de la clase, cuántas hay agrupadas; `data` es la más grave. */
  count?: number
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

export type AnalyticsMissionSignal = {
  scope: 'mission'
  missionId: string
  reason: string
  count?: number
} & (
  | {
      code: 'unfinished_after_deadline'
      data: SignalMissionRef & {
        deadline: string
        started: number
        unfinished: number
        percent: number
      }
    }
  | {
      /** En el panel de la clase: las `mission_expired` de una misión, juntas. */
      code: 'students_expired'
      data: SignalMissionRef & { count: number; deadline: string }
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

// ---- Panel de la clase ----

export interface ClassAnalyticsSummary {
  students: number
  participating: number
  missionsCounted: number
  averageMissionsCompleted: number | null
  averagePercent: number | null
  pendingReviews: number
  attendance: { rate: number | null; sessions: number } | null
  xp: { average: number | null } | null
}

/** Quien ha completado una misión (panel del profesorado), para su avatar. */
export interface MissionCompleter {
  id: string
  name: string
  avatar: string | null
}

export interface ClassAnalyticsMission {
  id: string
  title: string
  /** Para su miniatura: la rareza y la portada (`/uploads/…` o una URL). */
  rarity: string
  cover: string | null
  status: string
  deadline: string | null
  expired: boolean
  counted: boolean
  exclusion: MissionExclusion | null
  segments: { state: MissionBarState; count: number }[]
  pendingReviews: number
  approvals: number
  approvalAverage: number | null
  hints: number
  hintsPerStudent: number | null
  /** Cuántas personas la han completado y las primeras (como mucho 5). */
  completedBy: { total: number; students: MissionCompleter[] }
}

export interface ClassAnalyticsStudent {
  id: string
  name: string
  nickname: string | null
  avatar: string | null
  participating: boolean
  missionsCompleted: number
  missionsCounted: number
  percent: number | null
  lastActivityAt: string | null
  pendingReviews: number
  hintsUsed: number
  attendance: { rate: number | null; attended: number; total: number } | null
  signals: number
}

export interface ClassAnalytics {
  period: AnalyticsPeriod
  summary: ClassAnalyticsSummary
  missions: ClassAnalyticsMission[]
  students: ClassAnalyticsStudent[]
  signals: AnalyticsSignal[]
  weeks: WeekActivity[]
}

// ---- Un estudiante ----

export interface StudentEnigmaRow {
  id: string
  title: string
  isOptional: boolean
  approved: boolean
  percentage: number | null
  approvedAt: string | null
  pendingReview: boolean
  pendingSince: string | null
}

export interface StudentMissionRow {
  id: string
  title: string
  rarity: string
  cover: string | null
  status: string
  counted: boolean
  state: MissionCellState
  deadline: string | null
  completedAt: string | null
  started: boolean
  required: { approved: number; total: number }
  optional: { approved: number; total: number }
  percent: number | null
  approvalAverage: number | null
  pendingReviews: number
  hints: { used: number; usedInPeriod: number; percentHints: number }
  earned: { xp: number | null; coins: number | null; mana: number | null }
  pathRequires: { id: string; title: string; state: 'open' | 'teacher' }[]
  enigmas: StudentEnigmaRow[]
}

export interface ComparedFigure<T = number> {
  value: T
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
    /** `progress` (0-100): cuánto lleva del nivel, `currentXp` de `requiredXp` (0 en el último). */
    level: {
      level: number
      title: string
      color: string
      progress: number
      currentXp: number
      requiredXp: number
    } | null
    attendance: { rate: number | null; attended: number; total: number } | null
  }
  figures: {
    comparedWith: number
    missions: ComparedFigure & { counted: number }
    percent: ComparedFigure<number | null>
    xp: ComparedFigure | null
    pendingReviews: ComparedFigure
    hints: ComparedFigure
  }
  missions: StudentMissionRow[]
  signals: AnalyticsStudentSignal[]
  weeks: WeekActivity[]
}

// ---- Historial ----

export interface TimelineActor {
  id: string | null
  name: string
  avatar: string | null
}

export interface TimelineActivityEntry {
  kind: 'activity'
  id: string
  type: string
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
  metadata: Record<string, unknown> | null
  studentId: string
  classId: string | null
  actor: TimelineActor | null
}

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
  status: 'present' | 'absent' | 'late' | 'excused'
  note: string | null
  actor: TimelineActor | null
}

export type TimelineEntry = TimelineActivityEntry | TimelineAttendanceEntry

export interface StudentTimeline {
  entries: TimelineEntry[]
  nextCursor: string | null
}

// ---- «Mi progreso» del alumnado ----

export type ComparisonMetricKey = 'xp' | 'missions'

/**
 * Una cifra frente al resto de la clase, tal como la deja pasar la API: su valor
 * exacto y, según las reglas, la media redondeada y la banda, o por qué faltan.
 * Aquí no se calcula nada.
 */
export interface ComparisonMetric {
  key: ComparisonMetricKey
  /** Las misiones que cuentan, para escribir «4 de 7»; null en la XP. */
  outOf: number | null
  value: number
  average: number | null
  band: 'above' | 'at' | 'below' | null
  /** `small_class`: ni media ni banda. `band_only`: banda, pero no media. */
  reason: 'small_class' | 'band_only' | null
}

export interface AnonymousComparison {
  metrics: ComparisonMetric[]
}

export interface MyProgress {
  summary: {
    missionsCompleted: number
    missionsCounted: number
    percent: number | null
    extra: { approved: number; total: number }
    /** Saldos de su matrícula; null en un recurso que la clase no usa. */
    xp: number | null
    coins: number | null
    mana: number | null
    badges: { earned: number; total: number }
  }
  /** Sus misiones hechas y pendientes, en el orden de la clase. */
  missions: StudentMissionRow[]
  /** null si la clase la tiene apagada. */
  comparison: AnonymousComparison | null
}
