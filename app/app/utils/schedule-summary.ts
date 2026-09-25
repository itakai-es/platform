import type { ScheduleConfig } from '~/types/schedule.types'
import { scheduleSlotHasContent } from '~/types/schedule.types'
import { scheduleSlotsFromText } from '~/utils/schedule-text'

/** Tramo de cada semana con días: el único que se puede fundir con otro de la misma hora. */
const plainWeekly = (s: ScheduleConfig) =>
  s.freq === 'weekly' && (s.interval || 1) === 1 && s.weekdays.length > 0

/** Funde los tramos de cada semana que comparten hora: lunes 10-11 + jueves 10-11 → lunes y jueves 10-11. */
export function mergeSameTimeSlots(slots: ScheduleConfig[]): ScheduleConfig[] {
  const merged: ScheduleConfig[] = []
  for (const slot of slots) {
    const twin = plainWeekly(slot)
      ? merged.find(m => plainWeekly(m) && m.start === slot.start && m.end === slot.end)
      : undefined
    if (twin) twin.weekdays = [...new Set([...twin.weekdays, ...slot.weekdays])]
    else merged.push({ ...slot, weekdays: [...slot.weekdays] })
  }
  return merged
}

/**
 * Tramos con los que resumir el horario de una clase. Con `scheduleConfig`
 * guardada, esos. Sin ella, los que se leen del texto `schedule`, pero solo si
 * todos llevan hora: así el texto que generó el calendario en las clases que
 * perdieron su configuración se resume igual, y un horario escrito a mano que
 * el lector entiende a medias se enseña tal cual en vez de a trozos. Devuelve
 * `[]` cuando no hay nada que resumir.
 */
export function scheduleSummarySlots(
  config?: ScheduleConfig | ScheduleConfig[] | null,
  text?: string | null
): ScheduleConfig[] {
  const saved = (Array.isArray(config) ? config : config ? [config] : []).filter(
    scheduleSlotHasContent
  )
  if (saved.length) return mergeSameTimeSlots(saved)
  const parsed = scheduleSlotsFromText(text)
  const complete = parsed.length > 0 && parsed.every(s => s.start && s.end)
  return complete ? mergeSameTimeSlots(parsed) : []
}
