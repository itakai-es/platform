import type { Ref } from 'vue'
import type { ScheduleConfig, RecurrenceEnd, RecurrenceFreq } from '~/types/schedule.types'

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

  function describe(rec: RecurrenceLike, startDate: string): string {
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
    if (rec.ends?.type === 'on' && rec.ends.onDate)
      base += `, ${t('teacher.schedule.ends_on_suffix', { date: rec.ends.onDate })}`
    else if (rec.ends?.type === 'after' && rec.ends.afterCount)
      base += `, ${t('teacher.schedule.ends_after_suffix', { n: rec.ends.afterCount })}`
    return base
  }

  return { t, describe, presetLabels, dayName, listDays }
}

/**
 * useClassCalendar - Deriva el texto legible del horario (en el idioma activo)
 * para el campo `schedule` que muestran las tarjetas. Acepta un tramo único
 * (clases antiguas) o la lista de tramos; los tramos se unen con "; ".
 */
export function useClassCalendar(config: Ref<ScheduleConfig | ScheduleConfig[]>) {
  const { describe } = useRecurrenceText()
  const slotText = (c: ScheduleConfig): string => {
    // Sin días elegidos en modo semanal = incompleto → sin texto.
    if (c.freq === 'weekly' && c.weekdays.length === 0) return ''
    const time = c.start && c.end ? ` ${c.start}-${c.end}` : ''
    return `${describe(c, c.startDate)}${time}`.trim()
  }
  const scheduleText = computed(() => {
    const v = config.value
    return (Array.isArray(v) ? v : [v]).map(slotText).filter(Boolean).join('; ')
  })
  return { scheduleText }
}
