import type { RecurrenceEnd, RecurrenceFreq, ScheduleConfig } from '~/types/schedule.types'
import { scheduleSlotHasContent } from '~/types/schedule.types'
import { APP_LANGUAGES } from '~/utils/app-languages'

/**
 * Lee el texto de horario de una clase (`schedule`) y lo convierte en tramos
 * del calendario. Sirve para las clases que no tienen `scheduleConfig`
 * guardado: las del texto libre de antes y las que sufrieron el fallo que
 * descartaba la config al guardar.
 *
 * Entiende el texto que genera el propio calendario en cualquier idioma de la
 * app ("Cada semana: lunes y martes, hasta el 31 de agosto de 2026 20:51-21:51")
 * y las formas habituales escritas a mano ("Lunes de 10 a 11 y jueves de 12:00
 * a 13:00"). Es una lectura de mejor esfuerzo: lo que no entiende se ignora.
 */

// Idiomas de los nombres de días y meses: los de la interfaz y algunos más que
// aparecen en horarios escritos a mano.
const NAME_LOCALES = [...APP_LANGUAGES.map(l => l.lang), 'de', 'fr', 'it']

type Kind = 'none' | 'weekdays' | 'daily' | 'monthly' | 'yearly'

// Frases de periodicidad que genera el calendario (claves
// `teacher.schedule.freq_*` y `all_weekdays` de todos los idiomas), ya en
// minúsculas y sin tildes. Los días laborables van antes que "cada día"
// porque "Todos los días laborables" contiene las dos.
const KIND_PATTERNS: [Kind, RegExp][] = [
  [
    'none',
    /no se repite|no es repete?ix|nun se repite|non se repite|does not repeat|ez da errepikatzen|nao se repete|nu se repeta|δεν επαναλαμβανεται/,
  ],
  ['weekdays', /laborab|weekday|astegun|dias uteis|εργασιμ|lucratoare/],
  [
    'daily',
    /cada dia|todos (?:los|os) dias|tots els dies|tolos dies|daily|every day|egunero|in fiecare zi|καθε μερα/,
  ],
  ['monthly', /cada mes|monthly|hilero|todos os meses|in fiecare luna|καθε μηνα/],
  ['yearly', /anualment|analmente|annually|urtero|\banual\b|καθε χρονο/],
]

// "Cada 2 semanas: …" en todos los idiomas: la palabra "semana" va antes de ":".
const WEEK_WORD = /semana|setman|selman|week|εβδομαδ|aste|saptaman/
// ", 5 veces" (clave `ends_after_suffix`), que el calendario pone al final de la
// periodicidad (solo puede seguirle la hora). Así no se confunde con "2 veces
// por semana" escrito a mano.
const TIMES_RE =
  /,\s*(?:de\s+)?(\d{1,4})\s*(?:veces|vegades|vegaes|times|aldiz|vezes|ori|φορες)(?=\s*(?:\d|$))/u
// Separadores entre dos horas o dos días: "9-10", "de 9 a 10", "lunes a viernes".
const SEP = String.raw`(?:-|–|—|ata|ate|bis|al|to|a)`
const TIME = String.raw`(\d{1,2})(?:[:.h](\d{2})?)?\s*h?`
const RANGE_RE = new RegExp(String.raw`(^|[^\d:.])${TIME}\s*${SEP}\s*${TIME}(?!\d)`, 'g')
const DAY_RANGE_SEP = new RegExp(String.raw`^\s*${SEP}\s*$`)

/** Minúsculas y sin tildes, para comparar sin depender de cómo se escribió. */
function fold(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      // "segunda-feira" se trata como una sola palabra.
      .replace(/-feira/g, 'feira')
  )
}

const words = (s: string) => s.match(/\p{L}+/gu) ?? []

let dayNames: Map<string, number> | null = null
function dayDictionary(): Map<string, number> {
  if (dayNames) return dayNames
  const map = new Map<string, number>()
  for (const locale of NAME_LOCALES) {
    for (let wd = 0; wd < 7; wd++) {
      // 2024-01-01 fue lunes → 0=Lunes … 6=Domingo.
      const name = words(
        fold(new Date(2024, 0, 1 + wd).toLocaleDateString(locale, { weekday: 'long' }))
      ).join('')
      if (!name) continue
      map.set(name, wd)
      if (!name.endsWith('s')) map.set(`${name}s`, wd)
    }
  }
  // Abreviaturas habituales en castellano.
  ;['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'].forEach((abbr, wd) => map.set(abbr, wd))
  dayNames = map
  return map
}

let monthNames: Map<string, number> | null = null
function monthDictionary(): Map<string, number> {
  if (monthNames) return monthNames
  const map = new Map<string, number>()
  for (const locale of NAME_LOCALES) {
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    for (let m = 0; m < 12; m++) {
      // Mismo formato que usa el calendario al escribir "hasta el …".
      const parts = fmt.formatToParts(new Date(2026, m, 17))
      const i = parts.findIndex(p => p.type === 'month')
      if (i < 0) continue
      // "de desembre", "d’avientu": la palabra del mes es la última.
      const word = words(fold(parts[i].value)).pop()
      if (!word) continue
      map.set(word, m)
      // En euskera el sufijo va pegado al mes: "abendua" + "ren" → "abenduaren".
      const next = parts[i + 1]?.type === 'literal' ? fold(parts[i + 1].value) : ''
      const glued = `${word}${next}`.match(/^\p{L}+/u)?.[0]
      if (glued) map.set(glued, m)
    }
  }
  monthNames = map
  return map
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Sustituye un tramo del texto por espacios (mantiene las posiciones). */
function blank(s: string, start: number, end: number): string {
  return s.slice(0, start) + ' '.repeat(end - start) + s.slice(end)
}

function dateKey(y: number, m: number, d: number): string | null {
  const date = new Date(y, m, d)
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/** Fecha de fin ("hasta el …") y el texto con esa fecha borrada. */
function extractEndDate(s: string): { onDate: string | null; rest: string } {
  const iso = /(^|\D)(\d{4})-(\d{2})-(\d{2})(?!\d)/.exec(s)
  if (iso) {
    const start = iso.index + iso[1].length
    const onDate = dateKey(Number(iso[2]), Number(iso[3]) - 1, Number(iso[4]))
    return { onDate, rest: blank(s, start, iso.index + iso[0].length) }
  }

  const months = monthDictionary()
  const near = (re: RegExp, from: number, to: number) => {
    const found: { index: number; end: number; value: number }[] = []
    for (const m of s.matchAll(re)) {
      const index = (m.index ?? 0) + m[1].length
      const end = index + m[2].length
      if (end >= from - 16 && index <= to + 16) found.push({ index, end, value: Number(m[2]) })
    }
    const dist = (f: { index: number }) =>
      Math.min(Math.abs(f.index - from), Math.abs(f.index - to))
    return found.sort((a, b) => dist(a) - dist(b))[0]
  }

  for (const w of s.matchAll(/\p{L}+/gu)) {
    const month = months.get(w[0])
    if (month === undefined) continue
    const from = w.index ?? 0
    const to = from + w[0].length
    const year = near(/(^|\D)(\d{4})(?!\d)/g, from, to)
    const day = near(/(^|[^\d:.])(\d{1,2})(?![\d:.])/g, from, to)
    if (!year || !day) continue
    const onDate = dateKey(year.value, month, day.value)
    if (!onDate) continue
    let rest = blank(s, from, to)
    rest = blank(rest, year.index, year.end)
    rest = blank(rest, day.index, day.end)
    return { onDate, rest }
  }
  return { onDate: null, rest: s }
}

function toTime(h: string, m?: string): string | null {
  const hours = Number(h)
  const minutes = m ? Number(m) : 0
  if (hours > 23 || minutes > 59) return null
  return `${pad(hours)}:${pad(minutes)}`
}

interface Group {
  days: number[]
  start: string
  end: string
}

type TextEvent =
  | { type: 'days'; index: number; days: number[]; single: boolean }
  | { type: 'time'; index: number; start: string; end: string }

function parseChunk(chunk: string): ScheduleConfig[] {
  // Las fechas sueltas ("23/05/2026") no son parte de la periodicidad.
  let s = fold(chunk).replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, m => ' '.repeat(m.length))
  const kind = KIND_PATTERNS.find(([, re]) => re.test(s))?.[0] ?? null

  const end = extractEndDate(s)
  s = end.rest
  let ends: RecurrenceEnd = end.onDate ? { type: 'on', onDate: end.onDate } : { type: 'never' }
  const times = TIMES_RE.exec(s)
  if (times && !end.onDate && Number(times[1]) > 0) {
    ends = { type: 'after', afterCount: Number(times[1]) }
    s = blank(s, times.index, times.index + times[0].length)
  }

  const dict = dayDictionary()
  const dayTokens = [...s.matchAll(/\p{L}+/gu)]
    .map(w => ({ index: w.index ?? 0, end: (w.index ?? 0) + w[0].length, day: dict.get(w[0]) }))
    .filter((t): t is { index: number; end: number; day: number } => t.day !== undefined)

  // "Cada 2 semanas: …" → cada N semanas.
  let interval = 1
  const colon = s.indexOf(': ')
  const head = colon > 0 ? s.slice(0, colon) : ''
  if (head && WEEK_WORD.test(head) && !dayTokens.some(t => t.index < colon)) {
    const n = /(^|\D)(\d{1,2})(?!\d)/.exec(head)
    if (n && Number(n[2]) >= 2 && Number(n[2]) <= 52) {
      interval = Number(n[2])
      s = blank(s, n.index, n.index + n[0].length)
    }
  }

  const events: TextEvent[] = []
  for (let i = 0; i < dayTokens.length; i++) {
    const a = dayTokens[i]
    const b = dayTokens[i + 1]
    // "de lunes a viernes" → rango de días.
    if (b && a.day < b.day && DAY_RANGE_SEP.test(s.slice(a.end, b.index))) {
      const days = Array.from({ length: b.day - a.day + 1 }, (_, k) => a.day + k)
      events.push({ type: 'days', index: a.index, days, single: false })
      i++
    } else {
      events.push({ type: 'days', index: a.index, days: [a.day], single: true })
    }
  }
  for (const m of s.matchAll(RANGE_RE)) {
    const start = toTime(m[2], m[3])
    const finish = toTime(m[4], m[5])
    if (!start || !finish || start >= finish) continue
    events.push({ type: 'time', index: (m.index ?? 0) + m[1].length, start, end: finish })
  }
  events.sort((a, b) => a.index - b.index)

  // Cada franja horaria se aplica a los días nombrados antes que ella.
  const groups: Group[] = []
  let pending: number[] = []
  for (const ev of events) {
    if (ev.type === 'days') {
      const [first] = ev.days
      // Un día repetido abre lista nueva: "lunes a viernes - lunes: 9 a 10".
      if (ev.single && pending.includes(first)) pending = [first]
      else for (const d of ev.days) if (!pending.includes(d)) pending.push(d)
    } else {
      // Sin días delante, repite los de la franja anterior: "viernes de 9 a 10 y de 12 a 13".
      const days = pending.length ? pending : (groups[groups.length - 1]?.days ?? [])
      groups.push({ days: [...days], start: ev.start, end: ev.end })
      pending = []
    }
  }
  if (pending.length) {
    // La hora iba antes que los días: "09:00-10:00 lunes y martes".
    if (groups.length === 1 && !groups[0].days.length) groups[0].days = pending
    else groups.push({ days: pending, start: '', end: '' })
  }
  if (!groups.length && (kind || ends.type !== 'never' || interval > 1))
    groups.push({ days: [], start: '', end: '' })

  // Mismo horario en varios días → un solo tramo.
  const merged: Group[] = []
  for (const g of groups) {
    const same = g.days.length
      ? merged.find(o => o.days.length && o.start === g.start && o.end === g.end)
      : undefined
    if (same) same.days = [...new Set([...same.days, ...g.days])]
    else merged.push(g)
  }

  return merged.map(g => {
    let weekdays = [...g.days].sort((a, b) => a - b)
    let freq: RecurrenceFreq = kind && kind !== 'weekdays' ? kind : 'weekly'
    // Los días nombrados mandan sobre "cada día" y similares.
    if (weekdays.length && freq !== 'none') freq = 'weekly'
    if (freq === 'weekly' && !weekdays.length && kind === 'weekdays') weekdays = [0, 1, 2, 3, 4]
    if (freq !== 'weekly') weekdays = []
    return {
      freq,
      interval: freq === 'weekly' ? interval : 1,
      weekdays,
      start: g.start,
      end: g.end,
      startDate: '',
      ends: { ...ends },
      overrides: {},
    }
  })
}

/** Tramos de calendario leídos del texto de horario; `[]` si no se entiende nada. */
export function scheduleSlotsFromText(text?: string | null): ScheduleConfig[] {
  if (!text?.trim()) return []
  // El calendario separa los tramos con "; ". A mano también se usan "/" y "|"
  // (las barras de una fecha "23/05/2026" no cuentan).
  return text
    .split(/;|\||\n|\/(?!\d)/)
    .filter(chunk => chunk.trim())
    .flatMap(parseChunk)
    .filter(scheduleSlotHasContent)
}
