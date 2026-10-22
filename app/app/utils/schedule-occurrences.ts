/**
 * ¿Qué días hay clase? Expande el horario de una clase (tramos con recurrencia
 * al estilo Google Calendar, ver types/schedule.types.ts) a fechas concretas.
 * Hasta ahora el horario solo se convertía en texto; esta es la primera vez que
 * se interpreta, y lo usa pasar lista para proponer la sesión de hoy.
 *
 * Todo en claves locales "YYYY-MM-DD" (el día de quien mira, sin zonas) y sin
 * dependencias: es un módulo puro, que se prueba en Node
 * (app/tests/schedule-occurrences.test.mjs).
 *
 * Reglas, por tramo:
 *  - `overrides` manda: 'off' quita ese día y 'on' lo añade, siga o no la regla.
 *  - Sin `startDate` no hay ancla: «No se repite» no cae en ningún día, la
 *    diaria cae en todos y la semanal en sus días de la semana; el «cada N» y el
 *    fin por repeticiones necesitan el ancla y se ignoran.
 *  - Semanal sin días elegidos: el día de la semana de `startDate`.
 *  - Mensual y anual: el mismo día del mes (y el mismo mes) que `startDate`.
 *  - Fin «en fecha» incluye ese día; fin «tras N» cuenta las veces que cae la
 *    regla desde `startDate`, sin contar los cambios de `overrides`.
 */
import type { ScheduleConfig } from '~/types/schedule.types'

/** Una vez que se da la clase: su fecha y su tramo horario ("" si no tiene). */
export interface ClassOccurrence {
  date: string
  start: string
  end: string
}

const DAY_MS = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')

/** Clave local "YYYY-MM-DD". */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Fecha a mediodía UTC: así restar días nunca tropieza con un cambio de hora. */
function parseKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12))
  return Number.isNaN(d.getTime()) ? null : d
}

function keyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** 0 = lunes … 6 = domingo, como `weekdays` del horario. */
const weekday = (d: Date) => (d.getUTCDay() + 6) % 7
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS)

/** ¿Cae la regla (sin `overrides` ni fin) en ese día? */
function matchesRule(cfg: ScheduleConfig, day: Date, anchor: Date | null): boolean {
  const interval = Math.max(1, Math.floor(cfg.interval || 1))
  if (anchor && day < anchor) return false
  switch (cfg.freq) {
    case 'none':
      return !!anchor && daysBetween(anchor, day) === 0
    case 'daily':
      return !anchor || daysBetween(anchor, day) % interval === 0
    case 'weekly': {
      const days = cfg.weekdays?.length ? cfg.weekdays : anchor ? [weekday(anchor)] : []
      if (!days.includes(weekday(day))) return false
      if (!anchor || interval === 1) return true
      // Semanas completas entre el lunes del ancla y el lunes de ese día.
      const weeks = (daysBetween(anchor, day) + weekday(anchor) - weekday(day)) / 7
      return weeks % interval === 0
    }
    case 'monthly': {
      if (!anchor || day.getUTCDate() !== anchor.getUTCDate()) return false
      const months =
        (day.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
        day.getUTCMonth() -
        anchor.getUTCMonth()
      return months % interval === 0
    }
    case 'yearly':
      return (
        !!anchor &&
        day.getUTCDate() === anchor.getUTCDate() &&
        day.getUTCMonth() === anchor.getUTCMonth() &&
        (day.getUTCFullYear() - anchor.getUTCFullYear()) % interval === 0
      )
    default:
      return false
  }
}

/** ¿Hay clase ese día según este tramo? */
export function isClassDay(cfg: ScheduleConfig, key: string): boolean {
  const day = parseKey(key)
  if (!day) return false
  const override = cfg.overrides?.[key]
  if (override === 'off') return false
  if (override === 'on') return true
  const anchor = cfg.startDate ? parseKey(cfg.startDate) : null
  if (!matchesRule(cfg, day, anchor)) return false

  const ends = cfg.ends ?? { type: 'never' }
  if (ends.type === 'on' && ends.onDate && key > ends.onDate) return false
  if (ends.type === 'after' && anchor && (ends.afterCount ?? 0) > 0) {
    // Cuántas veces ha caído la regla hasta ese día, incluido.
    let count = 0
    for (let d = new Date(anchor); d <= day; d = new Date(d.getTime() + DAY_MS)) {
      if (matchesRule(cfg, d, anchor)) count += 1
      if (count > (ends.afterCount ?? 0)) return false
    }
  }
  return true
}

/**
 * Las veces que se da la clase entre dos fechas (incluidas), en orden de fecha
 * y hora. Acepta la lista de tramos o un tramo suelto (clases antiguas).
 */
export function scheduleOccurrences(
  config: ScheduleConfig | ScheduleConfig[] | null | undefined,
  from: string,
  to: string
): ClassOccurrence[] {
  const slots = (Array.isArray(config) ? config : config ? [config] : []).filter(Boolean)
  const start = parseKey(from)
  const end = parseKey(to)
  if (!start || !end || slots.length === 0) return []
  const out: ClassOccurrence[] = []
  for (let d = start; d <= end; d = new Date(d.getTime() + DAY_MS)) {
    const key = keyOf(d)
    for (const slot of slots) {
      if (isClassDay(slot, key))
        out.push({ date: key, start: slot.start || '', end: slot.end || '' })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
}
