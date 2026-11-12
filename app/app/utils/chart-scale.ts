/**
 * Escalas de los gráficos propios (barras, barras apiladas, columnas). Sin Vue,
 * para probarlas en Node (`tests/chart-scale.test.mjs`).
 *
 * Todo devuelve porcentajes de 0 a 100, que el componente pone como `width` o
 * `height` en CSS: así el dibujo se adapta solo al hueco (375 px, zoom al
 * 200 %, letra grande) sin medir nada en JavaScript.
 */

/** Un número que se puede dibujar: lo que no es finito o no es positivo cuenta como 0. */
function drawable(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

/** Redondeo a `decimals` decimales, sin arrastrar el ruido de la coma flotante. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * El tope de la escala de una serie: su valor más alto y, como poco, `floor`.
 * Con una serie vacía o de ceros sale `floor`, así nunca se divide entre cero
 * y las barras quedan vacías en vez de llenas.
 */
export function scaleMax(values: readonly number[], floor = 1): number {
  return values.reduce((max, value) => Math.max(max, drawable(value)), floor)
}

/**
 * Qué parte de la barra (0-100) ocupa `value` en una escala que acaba en
 * `max`. Se acota a 100. Un valor mayor que 0 nunca queda invisible: ocupa al
 * menos `minVisible`. Un 0 es un 0 (la cifra escrita al lado dice cuánto es).
 */
export function barPercent(value: number, max: number, minVisible = 0): number {
  const v = drawable(value)
  if (v === 0 || !(max > 0)) return 0
  const percent = Math.min(100, (v / max) * 100)
  return round(Math.max(percent, Math.min(minVisible, 100)), 2)
}

/** Altura (0-100) de cada columna de una serie; sin `max`, el valor más alto llega arriba. */
export function columnHeights(values: readonly number[], max?: number, minVisible = 3): number[] {
  const top = max ?? scaleMax(values)
  return values.map(value => barPercent(value, top, minVisible))
}

export interface SegmentOptions {
  /** Lo mínimo que ocupa un segmento con valor > 0, en puntos de porcentaje. */
  minPercent?: number
  /** Decimales de cada anchura. */
  decimals?: number
}

/**
 * Anchura (0-100) de cada segmento de una barra apilada, en el mismo orden.
 *
 * - Suman exactamente 100 (con `decimals` decimales): se reparte por el método
 *   del resto mayor, así el redondeo no deja un hueco ni se pasa.
 * - Ningún segmento con valor > 0 se pierde: ocupa al menos `minPercent`, y lo
 *   que le falta se quita a los grandes en proporción. Si hay tantos que no
 *   caben con ese mínimo, todos se quedan con la misma parte.
 * - Lo que vale 0 (o no es un número) ocupa 0. Si todo vale 0, todo es 0: la
 *   barra se queda vacía, sin inventar un reparto.
 */
export function segmentWidths(values: readonly number[], options: SegmentOptions = {}): number[] {
  const { minPercent = 3, decimals = 2 } = options
  const clean = values.map(drawable)
  const positive = clean.flatMap((value, index) => (value > 0 ? [index] : []))
  if (!positive.length) return clean.map(() => 0)

  // Se cuenta en unidades enteras (centésimas de punto con 2 decimales) para
  // que la suma salga exacta.
  const unit = 10 ** decimals
  const total = 100 * unit
  const minUnits = Math.floor(Math.min(minPercent, 100 / positive.length) * unit)

  // Los pequeños se fijan en el mínimo y el resto se reparte entre los demás;
  // al repartir, alguno más puede quedar por debajo: se repite hasta que no.
  const pinned = new Set<number>()
  let free = positive
  for (;;) {
    const budget = total - pinned.size * minUnits
    const sum = free.reduce((acc, index) => acc + clean[index]!, 0)
    const small = free.filter(index => (clean[index]! / sum) * budget < minUnits)
    if (!small.length || small.length === free.length) break
    small.forEach(index => pinned.add(index))
    free = free.filter(index => !pinned.has(index))
  }

  const budget = total - pinned.size * minUnits
  const sum = free.reduce((acc, index) => acc + clean[index]!, 0)
  const exact = new Map<number, number>()
  positive.forEach(index =>
    exact.set(index, pinned.has(index) ? minUnits : (clean[index]! / sum) * budget)
  )

  const units = clean.map((_, index) => Math.floor(exact.get(index) ?? 0))
  let leftover = total - units.reduce((acc, value) => acc + value, 0)
  // Las unidades que faltan, a quien más decimales perdió (a igualdad, al
  // mayor y, si no, al primero): siempre el mismo reparto para los mismos datos.
  const byRemainder = [...positive].sort(
    (a, b) =>
      exact.get(b)! - Math.floor(exact.get(b)!) - (exact.get(a)! - Math.floor(exact.get(a)!)) ||
      clean[b]! - clean[a]! ||
      a - b
  )
  for (let i = 0; leftover > 0; i = (i + 1) % byRemainder.length, leftover--) {
    units[byRemainder[i]!]! += 1
  }

  return units.map(value => value / unit)
}

/**
 * Columnas apiladas (la actividad de cada semana, por tipo): la altura de cada
 * columna (0-100) según su suma, como `columnHeights`, y dentro de ella la parte
 * de cada tipo (0-100 de la columna, en el mismo orden), como `segmentWidths`:
 * ninguna parte con valor se pierde.
 */
export function stackedColumns(
  series: readonly (readonly number[])[],
  max?: number,
  minVisible = 3
): { height: number; parts: number[] }[] {
  const totals = series.map(parts => parts.reduce((sum, value) => sum + drawable(value), 0))
  const heights = columnHeights(totals, max, minVisible)
  return series.map((parts, index) => ({
    height: heights[index] ?? 0,
    parts: segmentWidths(parts),
  }))
}
