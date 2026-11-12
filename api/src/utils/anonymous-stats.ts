/**
 * La comparación anónima con la media (F1, entrega 7): la única puerta por la que
 * un agregado de la clase llega al alumnado. Son menores, así que la anonimidad se
 * garantiza aquí, en la API: el navegador recibe la cifra ya redondeada y su
 * banda, nunca listas, totales ni recuentos exactos de los que sacar lo de nadie.
 *
 * Funciones puras, sin base de datos (lo que carga los datos está en
 * `modules/analytics/comparison.ts`). Las reglas, de `BLOQUE-6-PLAN.md`, decisión 17:
 *
 * - **Contra quién:** el resto de la clase, sin quien mira. Nunca otras clases ni
 *   subgrupos.
 * - **Umbral:** al menos `MIN_OTHERS` personas además de quien mira. Por debajo no
 *   hay ni media ni banda: con tres o cuatro, cualquiera saca la de un compañero.
 * - **Redondeo:** por tipo de cifra (`ROUND_STEP`). Impide que dos estudiantes, al
 *   restar sus dos «medias del resto», saquen la diferencia exacta de sus valores:
 *   esa resta vale (b − a) / (personas − 1), y con misiones de números pequeños un
 *   decimal bastaría para deshacerla. Por eso las misiones van a la unidad.
 * - **«Los N primeros»:** con la media, los N valores visibles, el propio y el
 *   número de estudiantes se sacaría la suma de los ocultos. Si los ocultos son
 *   menos de `MIN_OTHERS`, va solo la banda.
 * - **Banda:** a ±`BAND_MARGIN` de la media *ya redondeada*. Con la exacta, la banda
 *   al cambiar de saldo diría más de la media que la propia cifra redondeada, y en
 *   pantalla «100 frente a 90» podría salir como «en la media».
 */

/** Cuántas personas tiene que haber en el grupo, además de quien mira. */
export const MIN_OTHERS = 5

/** «En la media» es a menos de esta fracción de ella. */
export const BAND_MARGIN = 0.1

/** A qué se redondea cada tipo de cifra: la XP a la decena, las misiones a la unidad, el % de 5 en 5. */
export const ROUND_STEP = { xp: 10, missions: 1, percent: 5 } as const

export type AnonymousKind = keyof typeof ROUND_STEP

export type CompareBand = 'above' | 'at' | 'below'

/**
 * Por qué falta algo:
 * - `small_class`: el grupo es demasiado pequeño; no hay ni media ni banda;
 * - `band_only`: en «los N primeros», con pocos ocultos; hay banda, pero no media.
 */
export type AnonymousGap = 'small_class' | 'band_only'

/** Una cifra frente al resto de la clase, tal como puede salir hacia el alumnado. */
export interface AnonymousFigure {
  /** Lo suyo, exacto: es suyo. */
  value: number
  /** La media del resto, ya redondeada; null si no se puede dar (ver `reason`). */
  average: number | null
  band: CompareBand | null
  reason: AnonymousGap | null
}

/** Una media, redondeada para que la vea el alumnado. */
export function roundForStudents(value: number, kind: AnonymousKind): number {
  const step = ROUND_STEP[kind]
  return Math.round(value / step) * step
}

/**
 * Dónde queda una cifra frente a la media, a ±10 %. Con media 0, el margen es 0:
 * con algo ya se va por encima, y con 0 se está en la media (ni se puede ir por
 * debajo). Es la misma regla que `compareBand` del front, para el profesorado.
 */
export function averageBand(value: number, average: number): CompareBand {
  const margin = Math.abs(average) * BAND_MARGIN
  if (value > average + margin) return 'above'
  if (value < average - margin) return 'below'
  return 'at'
}

/**
 * Una cifra de quien mira frente a las del resto de la clase. `others` son los
 * valores exactos del grupo, sin los suyos: no salen de aquí. `hiddenOthers`, en el
 * modo «los N primeros», cuántas personas del grupo no se ven en ninguna
 * clasificación; en los demás modos, null.
 */
export function compareWithOthers(input: {
  value: number
  others: readonly number[]
  kind: AnonymousKind
  hiddenOthers?: number | null
}): AnonymousFigure {
  const { value, others, kind, hiddenOthers = null } = input
  if (others.length < MIN_OTHERS) {
    return { value, average: null, band: null, reason: 'small_class' }
  }
  const mean = others.reduce((sum, other) => sum + other, 0) / others.length
  const average = roundForStudents(mean, kind)
  const band = averageBand(value, average)
  if (hiddenOthers !== null && hiddenOthers < MIN_OTHERS) {
    return { value, average: null, band, reason: 'band_only' }
  }
  return { value, average, band, reason: null }
}

/**
 * Las medias de la clasificación completa, tal como las recibe el alumnado. Sin la
 * XP total, porque la suma menos lo propio es lo de los demás, y sin el progreso
 * medio, que además no se puede sacar de las filas: en una clase de dos personas,
 * la media menos lo propio es el % de la otra, sin umbral ni redondeo. El profesorado
 * sigue viendo las dos, porque ya ve a cada persona.
 */
export function studentRankingStats<T extends { totalXp: unknown; avgProgress: unknown }>(
  stats: T
): Omit<T, 'totalXp' | 'avgProgress'> {
  const { totalXp: _totalXp, avgProgress: _avgProgress, ...shown } = stats
  return shown
}
