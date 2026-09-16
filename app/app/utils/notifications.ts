import type { AppLanguage } from './app-languages'

/** El contador de avisos del menú: a partir de 100 se abrevia. */
export const formatUnreadBadge = (count: number): string => (count > 99 ? '99+' : String(count))

/**
 * Etiquetas que se prueban, por orden, para las fechas de cada idioma. El
 * navegador se queda con la primera que sepa formatear: el valenciano cae al
 * catalán y el asturiano, el gallego y el euskera, al castellano, que es lo
 * que tiene más a mano quien los usa. Sin esto `Intl` recibiría `val` o `ast`
 * y, si no los conoce, respondería en el idioma del navegador.
 */
const DATE_LOCALES: Record<AppLanguage, string[]> = {
  es: ['es-ES', 'es'],
  en: ['en-GB', 'en'],
  ca: ['ca-ES', 'ca'],
  val: ['ca-ES-valencia', 'ca-ES', 'ca'],
  eu: ['eu-ES', 'eu', 'es'],
  gl: ['gl-ES', 'gl', 'es'],
  ast: ['ast-ES', 'ast', 'es'],
  pt: ['pt-PT', 'pt'],
  el: ['el-GR', 'el'],
  ro: ['ro-RO', 'ro'],
}

const resolvedLocales = new Map<string, string>()

/** La primera etiqueta del idioma que el navegador soporta de verdad. */
const resolveDateLocale = (code: string): string => {
  const cached = resolvedLocales.get(code)
  if (cached) return cached
  const candidates = DATE_LOCALES[code as AppLanguage] ?? [code]
  const supported = Intl.RelativeTimeFormat.supportedLocalesOf(candidates)
  const resolved = supported[0] ?? 'es'
  resolvedLocales.set(code, resolved)
  return resolved
}

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>()

const getRelativeFormatter = (locale: string, numeric: 'auto' | 'always') => {
  const key = `${locale}|${numeric}`
  let formatter = relativeFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric })
    relativeFormatters.set(key, formatter)
  }
  return formatter
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/**
 * «ahora», «hace 5 minutos», «hace 2 semanas»… en el idioma de la interfaz.
 * `code` es el código de idioma de la app (`es`, `val`, `ast`…).
 *
 * Solo «ahora» sale en palabras: «ayer» o «la semana pasada» son fechas de
 * calendario y aquí se cuenta por horas redondeadas, así que a veces dirían
 * un día que no es. Por eso lo demás va siempre con número («hace 1 día»).
 */
export const formatNotificationTime = (date: string | Date, code: string, now = Date.now()) => {
  const locale = resolveDateLocale(code)
  const formatter = getRelativeFormatter(locale, 'always')

  // Un reloj algo adelantado en el servidor no debe dar «dentro de 1 minuto».
  const seconds = Math.min(0, Math.round((new Date(date).getTime() - now) / 1000))
  const elapsed = -seconds

  if (elapsed < 45) return getRelativeFormatter(locale, 'auto').format(0, 'second')
  if (elapsed < 45 * MINUTE)
    return formatter.format(-Math.max(1, Math.round(elapsed / MINUTE)), 'minute')
  if (elapsed < 22 * HOUR) return formatter.format(-Math.round(elapsed / HOUR), 'hour')
  if (elapsed < 6 * DAY) return formatter.format(-Math.round(elapsed / DAY), 'day')
  if (elapsed < 4 * WEEK) return formatter.format(-Math.round(elapsed / WEEK), 'week')
  if (elapsed < 11 * MONTH) return formatter.format(-Math.round(elapsed / MONTH), 'month')
  return formatter.format(-Math.max(1, Math.round(elapsed / YEAR)), 'year')
}

/** Fecha y hora completas, para el `title` de la hora relativa. */
export const formatNotificationDate = (date: string | Date, code: string) =>
  new Intl.DateTimeFormat(resolveDateLocale(code), {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(date))
