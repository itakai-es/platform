import type {
  ClassAnalyticsStudent,
  StudentMissionRow,
  WeekActivity,
} from '../types/analytics.types'
import type { ChartStatus } from './chart-status'
import { resolveDateLocale } from './notifications'

/**
 * Lo que los paneles de analítica calculan para enseñar (ordenar, filtrar,
 * comparar, escribir fechas), sin Vue, para probarlo en Node
 * (`tests/analytics-view.test.mjs`). Las cifras las da la API, con sus
 * definiciones: aquí no se recalcula ninguna.
 */

// ---- Comparar con la media ----

export type CompareBand = 'above' | 'at' | 'below'

/**
 * Dónde queda una cifra frente a la media: «en la media» es a menos del 10 % de
 * ella, la misma banda que verá el alumnado. Con media 0, cualquier cosa por
 * encima de 0 está por encima.
 */
export function compareBand(value: number, average: number): CompareBand {
  const margin = Math.abs(average) * 0.1
  if (value > average + margin) return 'above'
  if (value < average - margin) return 'below'
  return 'at'
}

// ---- Tabla de estudiantes ----

const STUDENT_SEARCH_FIELDS = ['name', 'nickname'] as const

/** Busca por nombre real o alias, sin distinguir mayúsculas. */
export function searchStudents(
  students: readonly ClassAnalyticsStudent[],
  query: string
): ClassAnalyticsStudent[] {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return [...students]
  return students.filter(student =>
    STUDENT_SEARCH_FIELDS.some(field => student[field]?.toLocaleLowerCase().includes(q))
  )
}

/** Por qué columna se puede ordenar. */
export type StudentSortField =
  | 'name'
  | 'missions'
  | 'activity'
  | 'pending'
  | 'hints'
  | 'attendance'
  | 'signals'

export type StudentSort = `${StudentSortField}-${'asc' | 'desc'}`

/** El valor por el que se ordena; null es «sin dato» y va siempre al final. */
function sortValue(student: ClassAnalyticsStudent, field: StudentSortField): number | null {
  switch (field) {
    case 'missions':
      return student.missionsCompleted
    case 'activity':
      return student.lastActivityAt ? Date.parse(student.lastActivityAt) : null
    case 'pending':
      return student.pendingReviews
    case 'hints':
      return student.hintsUsed
    case 'attendance':
      return student.attendance?.rate ?? null
    case 'signals':
      return student.signals
    case 'name':
      return null
  }
}

/**
 * Ordena sin tocar la lista. Quien no tiene el dato (nunca ha hecho nada, no se
 * le ha pasado lista) va al final en los dos sentidos: no es ni lo más ni lo
 * menos. Los empates, por nombre.
 */
export function sortStudents(
  students: readonly ClassAnalyticsStudent[],
  sort: StudentSort,
  locale?: string
): ClassAnalyticsStudent[] {
  const [field, direction] = sort.split('-') as [StudentSortField, 'asc' | 'desc']
  const dir = direction === 'desc' ? -1 : 1
  const byName = (a: ClassAnalyticsStudent, b: ClassAnalyticsStudent) =>
    a.name.localeCompare(b.name, locale)
  return [...students].sort((a, b) => {
    if (field === 'name') return byName(a, b) * dir
    const va = sortValue(a, field)
    const vb = sortValue(b, field)
    if (va === null && vb === null) return byName(a, b)
    if (va === null) return 1
    if (vb === null) return -1
    return (va - vb) * dir || byName(a, b)
  })
}

// ---- Misiones de un estudiante ----

export type MissionRowFilter = 'all' | 'pending' | 'done'

/** Pendientes: las que cuentan y no ha completado. Hechas: las completadas. Todas: también las que no cuentan. */
export function filterMissionRows<T extends Pick<StudentMissionRow, 'state' | 'counted'>>(
  rows: readonly T[],
  filter: MissionRowFilter
): T[] {
  if (filter === 'all') return [...rows]
  if (filter === 'done') return rows.filter(row => row.state === 'completed')
  return rows.filter(row => row.counted && row.state !== 'completed')
}

/**
 * El estado de una fila, con el nombre de los gráficos: lo que no ha completado y
 * tiene una entrega esperando va como «por revisar», igual que en la barra del
 * panel. Una misión que no cuenta y no completó no tiene estado: lleva su texto.
 */
export function missionRowStatus(
  row: Pick<StudentMissionRow, 'state' | 'pendingReviews'>
): ChartStatus | null {
  if (row.state === 'completed') return 'completed'
  if (row.pendingReviews > 0) return 'pending_review'
  return row.state === 'excluded' ? null : row.state
}

// ---- Historial ----

/**
 * Los grupos del filtro por tipo del historial, con los tipos de la API que
 * entran en cada uno (`?type=` admite varios, separados por comas).
 */
export const TIMELINE_FILTERS = {
  submissions: ['enigma_submitted'],
  approvals: ['enigma_completed'],
  missions: ['mission_completed', 'mission_started'],
  hints: ['hint_used'],
  behaviors: ['behavior_applied'],
  shop: ['shop_purchased', 'shop_item_used'],
  progress: ['level_up', 'badge_earned', 'achievement_unlocked', 'progress_milestone', 'xp_gained'],
  attendance: ['attendance'],
} as const

export type TimelineFilter = keyof typeof TIMELINE_FILTERS | 'all'

export type TimelineGroup = keyof typeof TIMELINE_FILTERS | 'other'

/**
 * El grupo del filtro del historial al que pertenece un tipo de entrada (el que da
 * su icono en la línea de tiempo); `other` si no está en ninguno.
 */
export function timelineGroup(type: string): TimelineGroup {
  for (const [group, types] of Object.entries(TIMELINE_FILTERS)) {
    if ((types as readonly string[]).includes(type)) return group as TimelineGroup
  }
  return 'other'
}

/** El valor de `?type=` de un grupo; sin filtro, nada. */
export function timelineTypeParam(filter: TimelineFilter): string | undefined {
  return filter === 'all' ? undefined : TIMELINE_FILTERS[filter].join(',')
}

// ---- Semanas ----

/** Lo que se dibuja de una semana: las entregas, las aprobaciones y las pistas. */
export function weekTotal(
  week: Pick<WeekActivity, 'submissions' | 'approvals' | 'hintsUsed'>
): number {
  return week.submissions + week.approvals + week.hintsUsed
}

// ---- Fechas ----

const dateFormatters = new Map<string, Intl.DateTimeFormat>()

function dateFormatter(code: string, options: Intl.DateTimeFormatOptions, utc = false) {
  const locale = resolveDateLocale(code)
  const key = `${locale}|${utc}|${JSON.stringify(options)}`
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, ...(utc ? { timeZone: 'UTC' } : {}) })
    dateFormatters.set(key, formatter)
  }
  return formatter
}

/** Un día `AAAA-MM-DD` como instante: el mismo día en cualquier zona, leído en UTC. */
const dayToDate = (day: string) => new Date(`${day}T00:00:00Z`)

/**
 * Las `count` fechas seguidas que acaban en `last` (`AAAA-MM-DD`), la más antigua
 * primero. De fecha en fecha, no de 24 en 24 horas: el día del cambio de hora tiene 23.
 */
export function daysEndingOn(last: string, count: number): string[] {
  const days: string[] = []
  const cursor = new Date(`${last}T12:00:00Z`)
  for (let i = 0; i < count; i++) {
    days.unshift(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return days
}

/** «14 oct», para el pie de una columna. */
export function formatWeekShort(week: string, code: string): string {
  return dateFormatter(code, { day: 'numeric', month: 'short' }, true).format(dayToDate(week))
}

/** «14 de octubre de 2026», para la tabla y el lector de pantalla. */
export function formatDayLong(day: string, code: string): string {
  return dateFormatter(code, { dateStyle: 'long' }, true).format(dayToDate(day))
}

/** «14 oct 2026»: una fecha (un instante), corta, en la hora de quien mira. */
export function formatDateShort(iso: string, code: string): string {
  return dateFormatter(code, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso)
  )
}
