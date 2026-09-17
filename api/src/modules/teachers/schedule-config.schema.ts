import { z } from 'zod'

// Configuración de horario de una clase (lista de tramos con recurrencia al
// estilo Google Calendar). Espejo de `ScheduleConfig` en
// app/app/types/schedule.types.ts. Como el resto de configuración, se normaliza
// en vez de rechazar: un valor raro en un campo no debe tumbar el guardado.

const MAX_SLOTS = 50
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const weekdaysSchema = z
  .array(z.unknown())
  .catch([])
  .transform(list => {
    // 0=Lunes … 6=Domingo; sin duplicados y en orden.
    const days = list.filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
    return [...new Set(days)].sort((a, b) => a - b)
  })

const scheduleSlotSchema = z.object({
  freq: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).catch('weekly'),
  interval: z.coerce
    .number()
    .catch(1)
    .transform(n => (Number.isFinite(n) ? Math.max(1, Math.round(n)) : 1)),
  weekdays: weekdaysSchema,
  // Vacío = sin rellenar.
  start: z.string().regex(TIME_RE).catch(''),
  end: z.string().regex(TIME_RE).catch(''),
  startDate: z.string().regex(DATE_RE).catch(''),
  ends: z
    .object({
      type: z.enum(['never', 'on', 'after']).catch('never'),
      onDate: z.string().regex(DATE_RE).optional().catch(undefined),
      // El input numérico deja '' al vaciarlo: se descarta en vez de fallar.
      afterCount: z.coerce.number().int().positive().optional().catch(undefined),
    })
    .catch({ type: 'never' }),
  overrides: z.record(z.string().regex(DATE_RE), z.enum(['on', 'off'])).catch({}),
})

// Acepta la lista de tramos, el objeto único de las clases antiguas (se guarda
// ya como lista) o null para borrar el horario.
export const scheduleConfigSchema = z
  .union([z.array(scheduleSlotSchema), scheduleSlotSchema])
  .transform(v => (Array.isArray(v) ? v : [v]).slice(0, MAX_SLOTS))
  .nullable()
