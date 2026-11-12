import { madridDay } from '../analytics/definitions.js'

/**
 * Las series de las estadísticas de la administración: cuántas filas hubo en cada
 * tramo del periodo. Los tramos cubren el periodo entero, de `since` a `now`, así que
 * suman lo mismo que la cifra del periodo que llevan al lado. Días y meses, en hora
 * de Madrid, como el resto de la analítica.
 */

export interface SeriesPoint {
  label: string
  value: number
}

type SeriesRow = { created_at: Date }

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_WEEKS = 4

/** Cuenta cada fila en la clave que le toque, con todas las claves, aunque estén a cero. */
function countByKey(rows: SeriesRow[], keys: string[], keyOf: (date: Date) => string) {
  const buckets = new Map(keys.map(key => [key, 0]))
  for (const row of rows) {
    const key = keyOf(row.created_at)
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1)
  }
  return buckets
}

/**
 * Una semana, por días: del día de `since` a hoy, los dos incluidos. Son siete días
 * contados desde ahora, así que tocan ocho fechas: el primero y hoy van a medias.
 */
function byDay(rows: SeriesRow[], since: Date, now: Date): SeriesPoint[] {
  const last = madridDay(now)
  const days: string[] = []
  // De fecha en fecha, no de 24 en 24 horas: el día del cambio de hora tiene 23.
  const cursor = new Date(`${madridDay(since)}T12:00:00Z`)
  for (;;) {
    const day = cursor.toISOString().slice(0, 10)
    days.push(day)
    if (day >= last) break
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return [...countByKey(rows, days, madridDay)].map(([day, value]) => ({
    label: DAY_NAMES[new Date(`${day}T12:00:00Z`).getUTCDay()] ?? '',
    value,
  }))
}

/**
 * Un trimestre, por meses: del mes de `since` al de ahora, los dos incluidos. Noventa
 * días pueden tocar cinco meses (del 31 de enero al 1 de mayo).
 */
function byMonth(rows: SeriesRow[], since: Date, now: Date): SeriesPoint[] {
  const monthOf = (date: Date) => madridDay(date).slice(0, 7)
  const [fromYear, fromMonth] = monthOf(since).split('-').map(Number) as [number, number]
  const last = monthOf(now)
  const months: string[] = []
  for (let index = 0; ; index++) {
    const date = new Date(Date.UTC(fromYear, fromMonth - 1 + index, 1))
    const month = date.toISOString().slice(0, 7)
    months.push(month)
    if (month >= last) break
  }
  return [...countByKey(rows, months, monthOf)].map(([month, value]) => ({
    label: MONTH_NAMES[Number(month.slice(5)) - 1] ?? '',
    value,
  }))
}

/** Un mes, en cuatro tramos iguales que llegan hasta ahora: treinta días no caben en 4 × 7. */
function byWeek(rows: SeriesRow[], since: Date, now: Date): SeriesPoint[] {
  const span = (now.getTime() - since.getTime()) / MONTH_WEEKS
  const counts = new Array<number>(MONTH_WEEKS).fill(0)
  for (const row of rows) {
    const offset = row.created_at.getTime() - since.getTime()
    if (offset < 0) continue
    // Lo que entra mientras se carga la página, al último tramo.
    counts[Math.min(MONTH_WEEKS - 1, Math.floor(offset / span))]! += 1
  }
  return counts.map((value, week) => ({ label: `Sem ${week + 1}`, value }))
}

/** La serie de un periodo de las estadísticas: `week`, `quarter` o, si no, un mes. */
export function buildTimeSeries(
  rows: SeriesRow[],
  since: Date,
  now: Date,
  period: string
): SeriesPoint[] {
  if (period === 'week') return byDay(rows, since, now)
  if (period === 'quarter') return byMonth(rows, since, now)
  return byWeek(rows, since, now)
}
