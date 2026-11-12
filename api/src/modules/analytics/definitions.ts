import { enigmasComplete, requirementCloses, type PathEdge } from '../../utils/mission-path.js'

/**
 * Las definiciones de la analítica (F1): qué es completar una misión, cuántas
 * cuentan, qué es el progreso y en qué se reparte lo pendiente. Una sola vez y
 * sin base de datos, para que el panel de la clase, la página de cada
 * estudiante, lo que ve el alumnado y las cifras que ya existen digan lo mismo
 * (hasta F1 había seis «progresos» distintos).
 *
 * - **Completada** es tener `completedAt` o tener aprobados todos sus enigmas
 *   obligatorios (`isCompleted`): la regla del camino del mapa. `completedAt` se
 *   escribe al aprobar, y editar o quitar un enigma no lo recalcula: quien se queda
 *   con todo aprobado no puede salir a la vez con «100 %» y «sin completar». Es solo
 *   lectura: no mueve dinero ni paga el bonus, que sigue yendo con `completedAt`.
 * - **Cuentan** (las N de «X de N misiones») las misiones de la clase que
 *   tienen enigmas y que su docente no ha bloqueado a mano: una misión que no
 *   se puede hacer no se le cuenta a nadie como pendiente. Las cerradas por el
 *   camino sí cuentan: se abren al completar lo que piden.
 * - **Progreso %** son los enigmas obligatorios aprobados sobre los
 *   obligatorios de esas N. Los opcionales van aparte, como «extra», porque
 *   desde la 0.7.0 no cuentan para completar.
 * - **Pendiente** es no completada, y se reparte en caducada sin terminar,
 *   cerrada por el camino, en curso y sin empezar (en ese orden de prioridad).
 *   «En curso» es la regla del camino (`startedMissionIds`): trabajo de
 *   verdad, no una fila de progreso vacía.
 *
 * No se usan `StudentMissionProgress.progress` (se queda viejo al añadir
 * enigmas y lleva los opcionales en el denominador) ni `startedAt` (es la
 * primera aprobación, no el comienzo): todo sale de las aprobaciones, las
 * entregas y las pistas.
 *
 * Las fechas de la base son `timestamp` sin zona, en UTC. Las semanas van de
 * lunes a domingo en hora de Madrid, y los días de la asistencia ya son el día
 * local (ver `madridDay`).
 */

// ---- Tiempo ----

/** La zona de las semanas y los días de la analítica. */
export const ANALYTICS_TIME_ZONE = 'Europe/Madrid'

/** Un periodo de la analítica. Sin `from` (o sin `to`), no tiene límite por ese lado. */
export interface Period {
  from: Date | null
  to: Date | null
}

/** Sin límites: todo lo que hay. */
export const ALL_TIME: Period = { from: null, to: null }

/** ¿Cae `date` dentro del periodo (con los dos extremos incluidos)? Sin fecha, no. */
export function inPeriod(date: Date | null | undefined, period: Period): boolean {
  if (!date) return false
  if (period.from && date < period.from) return false
  if (period.to && date > period.to) return false
  return true
}

const madridParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: ANALYTICS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** La hora de pared de Madrid de un instante, por piezas. */
function wallClock(date: Date) {
  const parts = Object.fromEntries(
    madridParts.formatToParts(date).map(part => [part.type, part.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** El día de Madrid de un instante, como `AAAA-MM-DD` (el de la asistencia). */
export function madridDay(date: Date): string {
  const { year, month, day } = wallClock(date)
  return `${year}-${pad(month)}-${pad(day)}`
}

/** El lunes de la semana de Madrid de un instante, como `AAAA-MM-DD`. */
export function madridWeekStart(date: Date): string {
  const { year, month, day } = wallClock(date)
  const local = new Date(Date.UTC(year, month - 1, day))
  // getUTCDay: 0 es domingo. Se retrocede hasta el lunes.
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7))
  return local.toISOString().slice(0, 10)
}

/** El instante en que empieza en Madrid el día `AAAA-MM-DD` (las 00:00 de allí). */
export function madridMidnight(day: string): Date {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  const guess = Date.UTC(year, month - 1, date)
  // El desfase de Madrid en ese momento (una o dos horas), corregido una vez
  // más por si el cambio de hora cae justo entre medias.
  let instant = guess
  for (let i = 0; i < 2; i++) {
    const wall = wallClock(new Date(instant))
    const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
    instant = guess - (asUtc - instant)
  }
  return new Date(instant)
}

/** Los lunes (`AAAA-MM-DD`) de todas las semanas de Madrid entre `from` y `to`, ambas incluidas. */
export function weeksBetween(from: Date, to: Date): string[] {
  const weeks: string[] = []
  if (from > to) return weeks
  const last = madridWeekStart(to)
  const cursor = new Date(`${madridWeekStart(from)}T00:00:00Z`)
  for (;;) {
    const week = cursor.toISOString().slice(0, 10)
    weeks.push(week)
    if (week >= last) break
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return weeks
}

/** Periodos que ofrecen los paneles: el curso (desde el 1 de septiembre), 30 y 7 días. */
export type PeriodPreset = 'course' | 'last30' | 'last7'

/**
 * El periodo de un preset, hasta `now`. «Este curso» empieza el 1 de septiembre
 * en Madrid (el de este año si ya ha llegado, si no el del anterior), como la
 * asistencia. Los otros, `now` menos 30 o 7 días.
 */
export function periodFromPreset(preset: PeriodPreset, now: Date = new Date()): Period {
  if (preset === 'course') {
    const { year, month } = wallClock(now)
    const startYear = month >= 9 ? year : year - 1
    return { from: madridMidnight(`${startYear}-09-01`), to: now }
  }
  const days = preset === 'last30' ? 30 : 7
  return { from: new Date(now.getTime() - days * DAY_MS), to: now }
}

export const DAY_MS = 24 * 60 * 60 * 1000

/** Días enteros que han pasado desde `date` hasta `now` (0 si es posterior). */
export function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS))
}

// ---- Misiones ----

/** Lo que hace falta de un enigma. */
export interface EnigmaShape {
  id: string
  isOptional: boolean
}

/** Lo que hace falta de una misión. */
export interface MissionShape {
  id: string
  /** `activa` o `bloqueada` (la bloqueada a mano). */
  status: string
  deadline: Date | null
  enigmas: EnigmaShape[]
}

/** Por qué una misión no cuenta: bloqueada a mano o sin enigmas. */
export type MissionExclusion = 'teacher_locked' | 'no_enigmas'

/** Por qué no cuenta la misión en «X de N», o null si cuenta. */
export function missionExclusion(mission: MissionShape): MissionExclusion | null {
  if (mission.status === 'bloqueada') return 'teacher_locked'
  if (mission.enigmas.length === 0) return 'no_enigmas'
  return null
}

/** ¿Cuenta la misión en «X de N» y en el progreso? */
export function countsForProgress(mission: MissionShape): boolean {
  return missionExclusion(mission) === null
}

/** Caducada: la fecha ya pasó (la misma comparación que `getMissionStatus`). */
export function missionExpired(mission: { deadline: Date | null }, now: Date): boolean {
  return mission.deadline !== null && mission.deadline < now
}

// ---- Un estudiante en una misión ----

/**
 * ¿Ha completado la misión? Tiene `completedAt` o `enigmasComplete`, la misma regla
 * que el camino del mapa (`requirementCloses`).
 */
export function isCompleted(
  completedAt: Date | null | undefined,
  enigmas: readonly EnigmaShape[],
  approved: ReadonlySet<string>
): boolean {
  if (completedAt != null) return true
  return enigmasComplete(
    enigmas.map(e => ({ isOptional: e.isOptional, approved: approved.has(e.id) }))
  )
}

/**
 * Cuándo quedó completada, para lo que cuenta por periodos; null si no lo está.
 * `completedAt` o, si no hay, la fecha de la aprobación que la completó: con
 * obligatorios, la última de ellos; sin ninguno, la primera (basta con un opcional).
 */
export function completionDate(
  completedAt: Date | null | undefined,
  enigmas: readonly EnigmaShape[],
  approvedAt: ReadonlyMap<string, Date>
): Date | null {
  if (completedAt) return completedAt
  if (!isCompleted(null, enigmas, new Set(approvedAt.keys()))) return null
  const required = enigmas.filter(e => !e.isOptional)
  const times = (required.length > 0 ? required : enigmas)
    .flatMap(e => approvedAt.get(e.id)?.getTime() ?? [])
  return new Date(required.length > 0 ? Math.max(...times) : Math.min(...times))
}

/**
 * Lo que dice si alguien ha empezado una misión de verdad: es la regla de
 * `startedMissionIds` (utils/mission-path.ts), que no se cierra lo empezado. Una entrega, un enigma aprobado, una pista usada, o
 * progreso con algo dentro (enigmas completados o la misión completada).
 */
export interface StartedWork {
  submitted: boolean
  approved: boolean
  hinted: boolean
  /** Fila de progreso con `enigmasCompleted > 0` o con `completedAt`. */
  progressWithWork: boolean
}

/** ¿Ha empezado de verdad? (ver `StartedWork`). */
export function hasStarted(work: StartedWork): boolean {
  return work.submitted || work.approved || work.hinted || work.progressWithWork
}

/**
 * Estado de un estudiante en una misión:
 * - `completed`: la ha completado (`isCompleted`), aunque luego se haya bloqueado;
 * - `excluded`: no completada de una misión que no cuenta (bloqueada a mano o
 *   sin enigmas): no es pendiente de nadie;
 * - y lo pendiente, por prioridad: `expired` (caducada sin terminar),
 *   `path_locked` (cerrada por el camino), `in_progress` (empezada) y
 *   `not_started`.
 */
export type MissionCellState =
  | 'completed'
  | 'excluded'
  | 'expired'
  | 'path_locked'
  | 'in_progress'
  | 'not_started'

/** Los estados de lo pendiente, en el orden en que se enseñan. */
export const PENDING_STATES = ['in_progress', 'not_started', 'expired', 'path_locked'] as const
export type PendingState = (typeof PENDING_STATES)[number]

export function missionCellState(
  mission: MissionShape,
  facts: { completed: boolean; started: boolean; pathLocked: boolean },
  now: Date
): MissionCellState {
  if (facts.completed) return 'completed'
  if (!countsForProgress(mission)) return 'excluded'
  // Lo cerrado por el camino sigue cerrado aunque pase la fecha: nunca pudo
  // abrirla, y su mapa se la enseña cerrada. Lo empezado no se cierra (el camino
  // ya lo tiene en cuenta), así que no tapa a quien la dejó a medias.
  if (facts.pathLocked) return 'path_locked'
  if (missionExpired(mission, now)) return 'expired'
  return facts.started ? 'in_progress' : 'not_started'
}

/** ¿Es un estado pendiente? (no completada de una misión que cuenta). */
export function isPending(state: MissionCellState): state is PendingState {
  return (PENDING_STATES as readonly string[]).includes(state)
}

/** ¿Se puede hacer ahora? (en curso o sin empezar: ni caducada ni cerrada). */
export function isOpen(state: MissionCellState): boolean {
  return state === 'in_progress' || state === 'not_started'
}

/**
 * Dónde cae cada estudiante en la barra de una misión (panel de la clase). Es
 * un reparto: cada estudiante cae en un solo segmento y los segmentos suman el
 * alumnado de la clase. «Por revisar» (`awaiting_review`) es un estado más, no
 * un subconjunto: quien no la ha completado y tiene alguna entrega esperando
 * revisión (sin las atascadas) cae ahí y sale de los demás, también de
 * «caducada» (entregó a tiempo y espera al profesorado) y de la que no cuenta
 * (la entrega sigue ahí aunque se bloquee la misión). El resto, como
 * `MissionCellState`.
 */
export type MissionBarState =
  | 'completed'
  | 'awaiting_review'
  | 'in_progress'
  | 'not_started'
  | 'expired'
  | 'path_locked'
  | 'excluded'

/** El orden de los segmentos: el de la barra apilada del panel. */
export const MISSION_BAR_STATES: readonly MissionBarState[] = [
  'completed',
  'awaiting_review',
  'in_progress',
  'not_started',
  'expired',
  'path_locked',
  'excluded',
]

/** El segmento de un estudiante en la barra de una misión (ver `MissionBarState`). */
export function missionBarState(state: MissionCellState, pendingReviews: number): MissionBarState {
  if (state === 'completed') return 'completed'
  if (pendingReviews > 0) return 'awaiting_review'
  return state
}

/** Obligatorios y opcionales de una misión, con cuántos tiene aprobados el estudiante. */
export interface EnigmaTally {
  required: { total: number; approved: number }
  optional: { total: number; approved: number }
  /** Obligatorios aprobados / obligatorios, de 0 a 100, redondeado; null si no tiene obligatorios. */
  percent: number | null
}

export function enigmaTally(enigmas: EnigmaShape[], approved: ReadonlySet<string>): EnigmaTally {
  const tally: EnigmaTally = {
    required: { total: 0, approved: 0 },
    optional: { total: 0, approved: 0 },
    percent: null,
  }
  for (const enigma of enigmas) {
    const bucket = enigma.isOptional ? tally.optional : tally.required
    bucket.total += 1
    if (approved.has(enigma.id)) bucket.approved += 1
  }
  tally.percent = percentOf(tally.required.approved, tally.required.total)
  return tally
}

/** `part / total` en %, redondeado; null sin total. */
export function percentOf(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null
}

/** Media redondeada; null sin valores. */
export function roundedAverage(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

/**
 * Una entrega pendiente de un enigma que ya tiene aprobado es una entrega
 * «atascada»: no se puede aprobar ni cerrar. No cuenta como pendiente de revisar.
 */
export function reviewablePending(pending: number, approved: boolean): number {
  return approved ? 0 : pending
}

// ---- El camino, en memoria ----

/** Lo que se sabe de una misión requisito (ver `requirementCloses`), sin el estudiante. */
export interface RequirementMission {
  id: string
  deadline: Date | null
  enigmas: EnigmaShape[]
}

/**
 * Las misiones cerradas por el camino para un estudiante, cada una con los
 * requisitos que le faltan (ids): la misma cuenta que `locksFromEdges`, pero con
 * los datos ya cargados, para toda la clase sin ir a la base por estudiante.
 * Un requisito cierra si `requirementCloses` (ni completado ni con sus
 * obligatorios aprobados, ni caducado ni sin enigmas); lo empezado no se cierra.
 * Solo con el mapa encendido: quien llama lo mira antes.
 */
export function pathLocksFor(
  edges: PathEdge[],
  requirements: ReadonlyMap<string, RequirementMission>,
  student: {
    completed: (missionId: string) => boolean
    approved: ReadonlySet<string>
    started: (missionId: string) => boolean
  },
  now: Date
): Map<string, string[]> {
  const closes = new Map<string, boolean>()
  const closing = (id: string) => {
    let value = closes.get(id)
    if (value === undefined) {
      const mission = requirements.get(id)
      value =
        mission !== undefined &&
        requirementCloses(
          {
            deadline: mission.deadline,
            completed: student.completed(id),
            enigmas: mission.enigmas.map(e => ({
              isOptional: e.isOptional,
              approved: student.approved.has(e.id),
            })),
          },
          now
        )
      closes.set(id, value)
    }
    return value
  }
  const locks = new Map<string, string[]>()
  for (const edge of edges) {
    if (!closing(edge.requiredMissionId) || student.started(edge.missionId)) continue
    const list = locks.get(edge.missionId) ?? []
    list.push(edge.requiredMissionId)
    locks.set(edge.missionId, list)
  }
  return locks
}

// ---- Un estudiante en la clase ----

/** Lo que hace falta de cada misión de un estudiante para su progreso en la clase. */
export interface CellForProgress {
  state: MissionCellState
  counted: boolean
  tally: EnigmaTally
  completedAt: Date | null
}

/** «X de N misiones», el progreso % y lo pendiente, de un estudiante en la clase. */
export interface StudentProgress {
  /** X: completadas de las que cuentan. */
  missionsCompleted: number
  /** N: las que cuentan (con enigmas y sin bloquear a mano). */
  missionsCounted: number
  requiredApproved: number
  requiredTotal: number
  /** Obligatorios aprobados / obligatorios de las N, de 0 a 100; null sin obligatorios. */
  percent: number | null
  /** Opcionales aprobados y opcionales de las N: el «extra». */
  extraApproved: number
  extraTotal: number
  /** Las N que no tiene completadas, por estado. */
  pending: Record<PendingState, number>
}

export function studentProgress(cells: CellForProgress[]): StudentProgress {
  const progress: StudentProgress = {
    missionsCompleted: 0,
    missionsCounted: 0,
    requiredApproved: 0,
    requiredTotal: 0,
    percent: null,
    extraApproved: 0,
    extraTotal: 0,
    pending: { in_progress: 0, not_started: 0, expired: 0, path_locked: 0 },
  }
  for (const cell of cells) {
    if (!cell.counted) continue
    progress.missionsCounted += 1
    if (cell.state === 'completed') progress.missionsCompleted += 1
    else if (isPending(cell.state)) progress.pending[cell.state] += 1
    progress.requiredApproved += cell.tally.required.approved
    progress.requiredTotal += cell.tally.required.total
    progress.extraApproved += cell.tally.optional.approved
    progress.extraTotal += cell.tally.optional.total
  }
  progress.percent = percentOf(progress.requiredApproved, progress.requiredTotal)
  return progress
}

/**
 * Medias de un grupo de estudiantes: misiones completadas y progreso %. Para el
 * profesorado, de quienes participan (`participatingEnrollmentWhere`), contando a
 * la persona que esté mirando: es una sola cifra en todas sus pantallas. Lo que ve
 * el alumnado no sale de aquí: es el resto de su clase, sin quien mira y con el
 * umbral de la comparación anónima. Sin nadie, null.
 */
export function groupAverages(students: Pick<StudentProgress, 'missionsCompleted' | 'percent'>[]): {
  missionsCompleted: number | null
  percent: number | null
} {
  if (students.length === 0) return { missionsCompleted: null, percent: null }
  const completed = students.reduce((sum, s) => sum + s.missionsCompleted, 0) / students.length
  const withPercent = students.map(s => s.percent).filter((p): p is number => p !== null)
  return {
    // Con un decimal: «2,4 misiones de media».
    missionsCompleted: Math.round(completed * 10) / 10,
    percent: roundedAverage(withPercent),
  }
}

// ---- Asistencia ----

/**
 * % de asistencia: presente o con retraso, sobre las sesiones en que se pasó
 * lista a esa persona (la justificada cuenta como no asistida). Es la cuenta de
 * `buildSummary` (attendance.service.ts). Sin sesiones, null: no se ha pasado
 * lista, y no hay que leerlo como «presente».
 */
export function attendanceRate(counts: { attended: number; total: number }): number | null {
  return percentOf(counts.attended, counts.total)
}

/** Estados de asistencia que cuentan como asistida. */
export const ATTENDED_STATUSES = ['present', 'late'] as const

// ---- Actividad ----

/**
 * Entradas del muro que son algo que hizo el propio estudiante (no su docente):
 * con ellas se calcula su última actividad en la clase. Fuera quedan las
 * aprobaciones y los comportamientos (los hace el profesorado) y `xp_gained`.
 */
export const STUDENT_ACTIVITY_TYPES = [
  'class_joined',
  'mission_started',
  'enigma_submitted',
  'hint_used',
  'shop_purchased',
  'shop_item_used',
] as const

/** La más reciente de varias fechas, o null. */
export function latest(...dates: (Date | null | undefined)[]): Date | null {
  let found: Date | null = null
  for (const date of dates) if (date && (!found || date > found)) found = date
  return found
}
