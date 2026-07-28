/**
 * Configuración de horario/calendario de una clase, con un modelo de recurrencia
 * al estilo Google Calendar: frecuencia (no se repite / diaria / semanal /
 * mensual / anual) cada N, en unos días, terminando nunca / en fecha / tras N.
 */
export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type EndType = 'never' | 'on' | 'after'

export interface RecurrenceEnd {
  type: EndType
  /** Fecha de fin "YYYY-MM-DD" cuando type = 'on'. */
  onDate?: string
  /** Nº de repeticiones cuando type = 'after'. */
  afterCount?: number
}

export type DayOverride = 'on' | 'off'

export interface ScheduleConfig {
  /** Frecuencia de repetición. */
  freq: RecurrenceFreq
  /** Repetir cada N (semanas/días/meses/años según freq). */
  interval: number
  /** Días de la semana (solo freq = 'weekly'): 0=Lunes … 6=Domingo. */
  weekdays: number[]
  /** Hora de inicio "HH:MM". */
  start: string
  /** Hora de fin "HH:MM". */
  end: string
  /** Fecha de inicio "YYYY-MM-DD" (ancla de la recurrencia y del curso). */
  startDate: string
  /** Cómo termina la recurrencia. */
  ends: RecurrenceEnd
  /** Overrides por fecha "YYYY-MM-DD" → 'off' (cancelada) | 'on' (extra). */
  overrides: Record<string, DayOverride>
}

export function emptyScheduleConfig(): ScheduleConfig {
  return {
    freq: 'weekly',
    interval: 1,
    weekdays: [],
    start: '',
    end: '',
    startDate: '',
    ends: { type: 'never' },
    overrides: {},
  }
}
