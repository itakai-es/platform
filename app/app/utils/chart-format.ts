import { resolveDateLocale } from './notifications'

/**
 * Porcentajes y redondeos de los gráficos y de las tarjetas de estadística, en
 * el idioma de la app (no en el del navegador ni con `es-ES` fijo). Sin Vue,
 * para probarlos en Node (`tests/chart-format.test.mjs`).
 *
 * Los números sueltos van con `formatNumber` de `number-format.ts` (en los
 * componentes, `useNumberFormat()`); aquí solo lo que es propio de los
 * gráficos. El idioma se resuelve con la misma tabla que las fechas
 * (`resolveDateLocale`): el valenciano sale como catalán de Valencia y, si el
 * navegador no sabe euskera, gallego o asturiano, como castellano.
 */

const percentFormatters = new Map<string, Intl.NumberFormat>()

/** Un número no finito cuenta como 0: un gráfico nunca enseña «NaN». */
function finite(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function percentFormatter(code: string, maximumFractionDigits: number, signed: boolean) {
  const locale = resolveDateLocale(code)
  const key = `${locale}|${maximumFractionDigits}|${signed}`
  let formatter = percentFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits,
      signDisplay: signed ? 'exceptZero' : 'auto',
    })
    percentFormatters.set(key, formatter)
  }
  return formatter
}

/**
 * Un porcentaje dado en puntos (35 → «35 %», «35%» o «% 35», según el
 * idioma). Por defecto, sin decimales.
 */
export function formatPercent(value: number, code: string, maximumFractionDigits = 0): string {
  return percentFormatter(code, maximumFractionDigits, false).format(finite(value) / 100)
}

/** Lo mismo, con su signo salvo en el 0, sin decimales: lo que ha cambiado («+102 %»). */
export function formatSignedPercent(value: number, code: string): string {
  return percentFormatter(code, 0, true).format(finite(value) / 100)
}

/**
 * El múltiplo de `step` más cercano (la XP a la decena, un porcentaje de 5 en
 * 5…). Con `step` 0 o negativo, el valor tal cual. Nunca devuelve «-0».
 */
export function roundTo(value: number, step: number): number {
  const v = finite(value)
  if (!(step > 0)) return v
  // Los decimales del paso, para que 0,1 × 3 no salga 0,30000000000000004.
  const decimals = (String(step).split('.')[1] ?? '').length
  const rounded = Number((Math.round(v / step) * step).toFixed(decimals))
  return rounded === 0 ? 0 : rounded
}

/** Qué parte de `total` es `part`, en puntos de porcentaje y redondeada a `step`. Sin total, 0. */
export function percentOf(part: number, total: number, step = 1): number {
  const t = finite(total)
  if (t <= 0) return 0
  return roundTo((finite(part) / t) * 100, step)
}

/** Por debajo de esta cifra, un % sobre el periodo anterior dice más ruido que otra cosa. */
export const MIN_BASE_FOR_PERCENT = 20

/**
 * Cómo escribir una cifra frente a la del periodo anterior:
 * - `percent`: lo que ha cambiado, en puntos de porcentaje sobre la anterior;
 * - `absolute`: la diferencia, cuando la anterior es 0 o muy pequeña (de 5 a
 *   1283 serían «25 560 %», que no le dice nada a nadie);
 * - `points`: la diferencia, cuando la cifra ya es un % (`isRate`): un % de un %
 *   confunde más que aclara;
 * - null: no ha cambiado, no hay nada que decir.
 */
export type PeriodDelta = { kind: 'percent' | 'absolute' | 'points'; value: number } | null

export function periodDelta(current: number, previous: number, isRate = false): PeriodDelta {
  const now = finite(current)
  const before = finite(previous)
  // Con un decimal: 0,1 + 0,2 no debe salir 0,30000000000000004.
  const difference = roundTo(now - before, 0.1)
  if (difference === 0) return null
  if (isRate) return { kind: 'points', value: difference }
  if (before < MIN_BASE_FOR_PERCENT) return { kind: 'absolute', value: difference }
  const value = Math.round((difference / before) * 100)
  return value === 0 ? { kind: 'absolute', value: difference } : { kind: 'percent', value }
}
