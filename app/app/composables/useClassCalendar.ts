import type { Ref } from 'vue'
import type { ScheduleConfig, RecurrenceEnd, RecurrenceFreq } from '~/types/schedule.types'
import { scheduleSummarySlots } from '~/utils/schedule-summary'

export type DayStatus = 'class' | 'off' | 'none'

const pad = (n: number) => String(n).padStart(2, '0')

/** Clave local "YYYY-MM-DD" de una fecha (sin desfase de zona horaria). */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Día de la semana con 0=Lunes … 6=Domingo (JS usa 0=Domingo). */
export function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const s = new Set(a)
  return b.every(x => s.has(x))
}

export interface RecurrenceLike {
  freq: RecurrenceFreq
  interval: number
  weekdays: number[]
  ends: RecurrenceEnd
}

/**
 * useRecurrenceText - Etiquetas de recurrencia **localizadas**. Los nombres de
 * día se obtienen con `Intl` en el idioma activo (no hay que traducirlos a mano)
 * y las frases conectoras vienen de las claves i18n `teacher.schedule.*`.
 */
export function useRecurrenceText() {
  const { t, locale } = useI18n()

  // 2024-01-01 fue lunes → nombre localizado del día wd (0=Lun … 6=Dom).
  const dayName = (wd: number, style: 'long' | 'short' = 'long') =>
    new Date(2024, 0, 1 + wd).toLocaleDateString(locale.value, { weekday: style })

  // "YYYY-MM-DD" → fecha legible en el idioma activo ("31 de agosto de 2026").
  // Si la clave no es una fecha válida, se muestra tal cual.
  const formatDateKey = (key: string): string => {
    const d = parseDateKey(key)
    if (isNaN(d.getTime())) return key
    return d.toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const listDays = (weekdays: number[]) => {
    const names = [...weekdays].sort((a, b) => a - b).map(wd => dayName(wd))
    return new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(names)
  }

  function presetLabels(startDate: string) {
    const start = startDate ? parseDateKey(startDate) : null
    const wd = start ? weekdayMon0(start) : null
    return {
      weekly:
        wd !== null
          ? t('teacher.schedule.freq_weekly_on', { day: dayName(wd) })
          : t('teacher.schedule.weekly'),
      monthly: t('teacher.schedule.freq_monthly'),
      yearly: t('teacher.schedule.freq_yearly'),
      weekdayOfStart: wd,
    }
  }

  /**
   * Texto completo de un tramo: periodicidad, hora (si se pasa) y cómo termina,
   * en ese orden ("Cada semana: lunes y martes 10:00-11:00, hasta el 30 de junio de 2026").
   */
  function describe(rec: RecurrenceLike, startDate: string, time = ''): string {
    const n = Math.max(1, rec.interval || 1)
    let base: string
    switch (rec.freq) {
      case 'none':
        base = t('teacher.schedule.freq_none')
        break
      case 'daily':
        base = t('teacher.schedule.freq_daily')
        break
      case 'monthly':
        base = presetLabels(startDate).monthly
        break
      case 'yearly':
        base = presetLabels(startDate).yearly
        break
      case 'weekly':
      default:
        if (!rec.weekdays.length) base = t('teacher.schedule.choose_days')
        else if (n > 1)
          base = t('teacher.schedule.every_weeks_days', { n, days: listDays(rec.weekdays) })
        else if (sameSet(rec.weekdays, [0, 1, 2, 3, 4])) base = t('teacher.schedule.all_weekdays')
        else base = t('teacher.schedule.weekly_days', { days: listDays(rec.weekdays) })
    }
    if (time) base += ` ${time}`
    if (rec.ends?.type === 'on' && rec.ends.onDate)
      base += `, ${t('teacher.schedule.ends_on_suffix', { date: formatDateKey(rec.ends.onDate) })}`
    else if (rec.ends?.type === 'after' && rec.ends.afterCount)
      base += `, ${t('teacher.schedule.ends_after_suffix', { n: rec.ends.afterCount })}`
    return base
  }

  return { t, locale, describe, presetLabels, dayName, listDays, formatDateKey }
}

/**
 * useClassCalendar - Deriva el texto completo del horario (en el idioma activo)
 * que se guarda en el campo `schedule` y se enseña como vista previa al
 * configurarlo. Acepta un tramo único (clases antiguas) o la lista de tramos;
 * los tramos se unen con "; ". Para tarjetas y cabeceras está useScheduleSummary.
 */
export function useClassCalendar(config: Ref<ScheduleConfig | ScheduleConfig[]>) {
  const { describe } = useRecurrenceText()
  const slotText = (c: ScheduleConfig): string => {
    // Sin días elegidos en modo semanal = incompleto → sin texto.
    if (c.freq === 'weekly' && c.weekdays.length === 0) return ''
    const time = c.start && c.end ? `${c.start}-${c.end}` : ''
    return describe(c, c.startDate, time).trim()
  }
  const scheduleText = computed(() => {
    const v = config.value
    return (Array.isArray(v) ? v : [v]).map(slotText).filter(Boolean).join('; ')
  })
  return { scheduleText }
}

/**
 * useScheduleSummary - Resumen corto del horario para tarjetas y cabeceras: una
 * línea por tramo con los días y la hora ("Lunes y martes 10:00-11:00"). Omite
 * "Cada semana" y las fechas de inicio y fin, que ya se ven en la configuración,
 * y funde en una línea los tramos semanales que comparten hora. Qué tramos se
 * resumen lo decide scheduleSummarySlots; si no hay ninguno, el texto `schedule`
 * se enseña tal cual (horarios escritos a mano).
 */
export function useScheduleSummary() {
  const { t, locale, listDays, formatDateKey } = useRecurrenceText()

  const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase(locale.value) + s.slice(1)

  function slotLine(slot: ScheduleConfig): string {
    const time = slot.start && slot.end ? `${slot.start}-${slot.end}` : ''
    let when: string
    switch (slot.freq) {
      case 'none':
        // Una sola sesión: lo que importa es la fecha.
        when = slot.startDate ? formatDateKey(slot.startDate) : t('teacher.schedule.freq_none')
        break
      case 'daily':
        when = t('teacher.schedule.freq_daily')
        break
      case 'monthly':
        when = t('teacher.schedule.freq_monthly')
        break
      case 'yearly':
        when = t('teacher.schedule.freq_yearly')
        break
      default: {
        // Sin días elegidos el tramo está incompleto: no se resume.
        if (!slot.weekdays.length) return ''
        const n = Math.max(1, slot.interval || 1)
        if (n > 1)
          when = t('teacher.schedule.every_weeks_days', { n, days: listDays(slot.weekdays) })
        else if (sameSet(slot.weekdays, [0, 1, 2, 3, 4])) when = t('teacher.schedule.all_weekdays')
        else when = listDays(slot.weekdays)
      }
    }
    return capitalize(`${when} ${time}`.trim())
  }

  /** Líneas del resumen; si no hay tramos que resumir, el texto `schedule` tal cual. */
  function summarize(
    config?: ScheduleConfig | ScheduleConfig[] | null,
    text?: string | null
  ): string[] {
    const lines = scheduleSummarySlots(config, text).map(slotLine).filter(Boolean)
    if (lines.length) return lines
    const raw = text?.trim()
    return raw ? [raw] : []
  }

  return { summarize }
}
