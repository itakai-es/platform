import type { ClassMatrix, MatrixMission, MatrixStudent } from './class-matrix.js'
import { daysSince, inPeriod, isOpen, percentOf } from './definitions.js'

/**
 * Señales de dificultad (F1, decisión 4 del plan): una lista de reglas fijas,
 * cada una con su código, su motivo en palabras y los datos para el texto. Solo
 * las ve el profesorado y no deciden nada: sin índice de 0 a 100, que esconde el
 * motivo, y sin IA. Los umbrales son constantes, iguales para todas las clases.
 *
 * Se calculan sobre la matriz de la clase (class-matrix.ts), sin ir a la base.
 * Lo que tiene fecha cuenta si cae en el periodo de la matriz (una aprobación,
 * una pista, la fecha límite de una misión); la inactividad se mide siempre
 * hasta ahora.
 *
 * Las entregas sin revisar **no** son una señal: miden al profesorado, no al
 * estudiante. Van aparte, como cifra (`pendingReviews` de la matriz). El uso del
 * asistente de IA tampoco entra.
 */

// ---- Umbrales ----

/** Un enigma aprobado por debajo de este % (estricto). */
export const LOW_GRADE_PERCENT = 50
/** La media de aprobación de un estudiante en el periodo, por debajo de este %. */
export const LOW_AVERAGE_PERCENT = 60
/**
 * …con al menos estas aprobaciones en el periodo: con una sola, la media es esa
 * nota, y si es baja ya sale como `low_grade`.
 */
export const LOW_AVERAGE_MIN_APPROVALS = 2
/** Pistas en una misión a partir de las cuales sale (cualquier pista de % también). */
export const HINTS_IN_MISSION = 2
/** Días sin actividad, con misiones abiertas, a partir de los cuales sale. */
export const INACTIVE_DAYS = 14
/** Asistencia del periodo por debajo de este % (solo si se ha pasado lista). */
export const LOW_ATTENDANCE_PERCENT = 80
/**
 * …con al menos estas sesiones con lista en el periodo: con una o dos, una sola
 * falta ya da una asistencia del 0 o del 50 %.
 */
export const LOW_ATTENDANCE_MIN_SESSIONS = 3
/** Tras la fecha, este % o más de quien empezó la misión sin completarla. */
export const MISSION_UNFINISHED_PERCENT = 30
/** El % medio de aprobación de una misión, por debajo de este %… */
export const MISSION_LOW_AVERAGE_PERCENT = 60
/** …con al menos estas aprobaciones (de distintos estudiantes o enigmas) en el periodo. */
export const MISSION_LOW_AVERAGE_MIN_APPROVALS = 3
/** Pistas por estudiante que la ha empezado, a partir de las cuales sale. */
export const MISSION_HINTS_PER_STUDENT = 2

// ---- Lo que devuelve ----

interface MissionRef {
  missionId: string
  missionTitle: string
}

/** Las señales de un estudiante, cada una con sus datos. */
export type StudentSignal = { studentId: string; reason: string } & (
  | {
      code: 'mission_expired'
      data: MissionRef & { deadline: Date; started: boolean }
    }
  | {
      code: 'low_grade'
      data: MissionRef & {
        enigmaId: string
        enigmaTitle: string
        percentage: number
        approvedAt: Date
        threshold: number
      }
    }
  | {
      code: 'low_average'
      data: { average: number; approvals: number; threshold: number }
    }
  | {
      code: 'hints'
      data: MissionRef & { hints: number; percentHints: number }
    }
  | {
      code: 'inactive'
      data: { lastActivityAt: Date | null; days: number; openMissions: number }
    }
  | {
      code: 'low_attendance'
      data: { rate: number; attended: number; total: number; threshold: number }
    }
)

export type StudentSignalCode = StudentSignal['code']

/** Las señales de una misión. */
export type MissionSignal = { missionId: string; missionTitle: string; reason: string } & (
  | {
      code: 'unfinished_after_deadline'
      data: { deadline: Date; started: number; unfinished: number; percent: number }
    }
  | {
      /** Solo en el panel de la clase: las `mission_expired` de una misión, juntas (`panelSignals`). */
      code: 'students_expired'
      data: { deadline: Date; count: number }
    }
  | {
      code: 'low_average'
      data: { average: number; approvals: number; threshold: number }
    }
  | {
      code: 'many_hints'
      data: { hints: number; students: number; perStudent: number }
    }
)

export type MissionSignalCode = MissionSignal['code']

/** Orden en que salen las de un mismo estudiante. */
export const STUDENT_SIGNAL_ORDER: StudentSignalCode[] = [
  'mission_expired',
  'low_grade',
  'low_average',
  'hints',
  'inactive',
  'low_attendance',
]

export interface ClassSignals {
  students: StudentSignal[]
  missions: MissionSignal[]
}

// ---- Por estudiante ----

const pct = (n: number) => `${n} %`
/** Con coma decimal, como se escribe en castellano. */
const decimal = (n: number) => String(n).replace('.', ',')

/** Las señales de un estudiante, con las misiones de la matriz. */
export function studentSignals(matrix: ClassMatrix, student: MatrixStudent): StudentSignal[] {
  const signals: StudentSignal[] = []
  const { period, now } = matrix
  const studentId = student.studentId

  matrix.missions.forEach((mission, index) => {
    const cell = student.missions[index]!
    const ref = { missionId: mission.id, missionTitle: mission.title }

    // Caducada sin completar: la fecha cae en el periodo, y ya estaba en la
    // clase entonces (a quien llega después no se le cuenta). Tampoco a quien
    // nunca pudo abrirla, porque el camino del mapa se la tenía cerrada, ni a quien
    // entregó y espera revisión: la que tiene que moverse es la otra parte.
    if (
      cell.state === 'expired' &&
      mission.deadline &&
      inPeriod(mission.deadline, period) &&
      student.enrolledAt <= mission.deadline &&
      !cell.closedUntilExpired &&
      cell.pendingReviews === 0
    ) {
      signals.push({
        studentId,
        code: 'mission_expired',
        reason: `«${mission.title}» caducó sin completar`,
        data: { ...ref, deadline: mission.deadline, started: cell.started },
      })
    }

    // Un enigma aprobado por debajo del 50 %.
    mission.enigmas.forEach((enigma, e) => {
      const enigmaCell = cell.enigmas[e]!
      if (
        enigmaCell.approved &&
        enigmaCell.percentage !== null &&
        enigmaCell.approvedAt &&
        enigmaCell.percentage < LOW_GRADE_PERCENT &&
        inPeriod(enigmaCell.approvedAt, period)
      ) {
        signals.push({
          studentId,
          code: 'low_grade',
          reason: `Aprobó «${enigma.title}» con un ${pct(enigmaCell.percentage)} (menos del ${pct(LOW_GRADE_PERCENT)})`,
          data: {
            ...ref,
            enigmaId: enigma.id,
            enigmaTitle: enigma.title,
            percentage: enigmaCell.percentage,
            approvedAt: enigmaCell.approvedAt,
            threshold: LOW_GRADE_PERCENT,
          },
        })
      }
    })

    // Dos o más pistas en una misión, o cualquier pista de %, en el periodo.
    const { usedInPeriod, percentInPeriod } = cell.hints
    if (usedInPeriod >= HINTS_IN_MISSION || percentInPeriod > 0) {
      signals.push({
        studentId,
        code: 'hints',
        reason:
          `Usó ${usedInPeriod} ${usedInPeriod === 1 ? 'pista' : 'pistas'} en «${mission.title}»` +
          (percentInPeriod > 0 ? ` (${percentInPeriod} de %)` : ''),
        data: { ...ref, hints: usedInPeriod, percentHints: percentInPeriod },
      })
    }
  })

  // Media de aprobación baja en el periodo.
  const { approvals, approvalAverage } = student.period
  if (
    approvalAverage !== null &&
    approvals >= LOW_AVERAGE_MIN_APPROVALS &&
    approvalAverage < LOW_AVERAGE_PERCENT
  ) {
    signals.push({
      studentId,
      code: 'low_average',
      reason: `Media de aprobación del ${pct(approvalAverage)} en ${approvals} enigmas (menos del ${pct(LOW_AVERAGE_PERCENT)})`,
      data: { average: approvalAverage, approvals, threshold: LOW_AVERAGE_PERCENT },
    })
  }

  // Sin actividad en 14 días, con misiones que puede hacer. Sin ninguna
  // actividad, se cuenta desde que entró en la clase.
  const openMissions = student.missions.filter(
    (cell, index) => matrix.missions[index]!.counted && isOpen(cell.state)
  ).length
  const since = student.lastActivityAt ?? student.enrolledAt
  const idle = daysSince(since, now)
  if (openMissions > 0 && idle >= INACTIVE_DAYS) {
    signals.push({
      studentId,
      code: 'inactive',
      reason: student.lastActivityAt
        ? `Sin actividad desde hace ${idle} días, con ${openMissions} ${openMissions === 1 ? 'misión abierta' : 'misiones abiertas'}`
        : `Sin actividad desde que entró en la clase (hace ${idle} días), con ${openMissions} ${openMissions === 1 ? 'misión abierta' : 'misiones abiertas'}`,
      data: { lastActivityAt: student.lastActivityAt, days: idle, openMissions },
    })
  }

  // Asistencia baja, solo si se le ha pasado lista en el periodo bastantes veces.
  const attendance = student.attendance
  if (
    attendance &&
    attendance.rate !== null &&
    attendance.total >= LOW_ATTENDANCE_MIN_SESSIONS &&
    attendance.rate < LOW_ATTENDANCE_PERCENT
  ) {
    signals.push({
      studentId,
      code: 'low_attendance',
      reason: `Asistencia del ${pct(attendance.rate)} (${attendance.attended} de ${attendance.total} sesiones)`,
      data: {
        rate: attendance.rate,
        attended: attendance.attended,
        total: attendance.total,
        threshold: LOW_ATTENDANCE_PERCENT,
      },
    })
  }

  const rank = (code: StudentSignalCode) => STUDENT_SIGNAL_ORDER.indexOf(code)
  // Estable: dentro de un mismo código, en el orden de las misiones.
  return signals
    .map((signal, position) => ({ signal, position }))
    .sort((a, b) => rank(a.signal.code) - rank(b.signal.code) || a.position - b.position)
    .map(({ signal }) => signal)
}

// ---- Por misión ----

/** Las señales de una misión, con el alumnado de la matriz. */
export function missionSignals(matrix: ClassMatrix, mission: MatrixMission): MissionSignal[] {
  const signals: MissionSignal[] = []
  const ref = { missionId: mission.id, missionTitle: mission.title }
  const { stats } = mission

  // Tras la fecha, el 30 % o más de quien la empezó no la ha completado. Solo
  // las que cuentan: una bloqueada a mano no se puede terminar. Quien espera
  // revisión no entra en la cuenta, ni arriba ni abajo: entregó y no depende de él.
  if (mission.counted && mission.expired && mission.deadline && inPeriod(mission.deadline, matrix.period)) {
    const started = stats.started - stats.awaitingReview
    const unfinished = started - stats.states.completed
    const percent = percentOf(unfinished, started)
    if (percent !== null && unfinished > 0 && percent >= MISSION_UNFINISHED_PERCENT) {
      signals.push({
        ...ref,
        code: 'unfinished_after_deadline',
        reason: `${unfinished} de ${started} que la empezaron no la completaron antes de la fecha (${pct(percent)})`,
        data: { deadline: mission.deadline, started, unfinished, percent },
      })
    }
  }

  // % medio de aprobación bajo en el periodo.
  if (
    stats.approvalAverage !== null &&
    stats.approvalsInPeriod >= MISSION_LOW_AVERAGE_MIN_APPROVALS &&
    stats.approvalAverage < MISSION_LOW_AVERAGE_PERCENT
  ) {
    signals.push({
      ...ref,
      code: 'low_average',
      reason: `Media de aprobación del ${pct(stats.approvalAverage)} en ${stats.approvalsInPeriod} enigmas aprobados (menos del ${pct(MISSION_LOW_AVERAGE_PERCENT)})`,
      data: {
        average: stats.approvalAverage,
        approvals: stats.approvalsInPeriod,
        threshold: MISSION_LOW_AVERAGE_PERCENT,
      },
    })
  }

  // Muchas pistas por estudiante que la ha empezado, en el periodo.
  if (
    stats.hintsPerStartedStudent !== null &&
    stats.hintsPerStartedStudent >= MISSION_HINTS_PER_STUDENT
  ) {
    signals.push({
      ...ref,
      code: 'many_hints',
      reason: `${decimal(stats.hintsPerStartedStudent)} pistas de media por estudiante que la empezó`,
      data: {
        hints: stats.hintsInPeriod,
        students: stats.started,
        perStudent: stats.hintsPerStartedStudent,
      },
    })
  }

  return signals
}

/** Todas las señales de la clase: por estudiante (en el orden de la matriz) y por misión. */
export function classSignals(matrix: ClassMatrix): ClassSignals {
  return {
    students: matrix.students.flatMap(student => studentSignals(matrix, student)),
    missions: matrix.missions.flatMap(mission => missionSignals(matrix, mission)),
  }
}

/**
 * Las señales tal como van en el panel de la clase: la misma misión caducada
 * ocuparía una fila por estudiante y llenaría la lista, así que las `mission_expired`
 * se juntan en una sola señal de misión (`students_expired`). Esa cubre a la
 * `unfinished_after_deadline` de la misma misión, que se quita.
 *
 * Solo la lista cambia: la página del estudiante sigue con su `mission_expired`, y
 * lo que se cuenta por persona sale de `classSignals`, sin agrupar.
 */
export function panelSignals({ students, missions }: ClassSignals): ClassSignals {
  const expired = new Map<string, { title: string; deadline: Date; count: number }>()
  for (const signal of students) {
    if (signal.code !== 'mission_expired') continue
    const { missionId, missionTitle, deadline } = signal.data
    const group = expired.get(missionId)
    if (group) group.count += 1
    else expired.set(missionId, { title: missionTitle, deadline, count: 1 })
  }
  const grouped = [...expired].map(
    ([missionId, { title, deadline, count }]): MissionSignal => ({
      missionId,
      missionTitle: title,
      code: 'students_expired',
      reason: `«${title}» caducó y ${count} ${count === 1 ? 'estudiante no la completó' : 'estudiantes no la completaron'}`,
      data: { deadline, count },
    })
  )
  return {
    students: students.filter(signal => signal.code !== 'mission_expired'),
    missions: [
      ...grouped,
      ...missions.filter(
        signal => signal.code !== 'unfinished_after_deadline' || !expired.has(signal.missionId)
      ),
    ],
  }
}
