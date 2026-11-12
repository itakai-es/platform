/**
 * Cómo se ve cada gráfico de los paneles (`ChartFigure`): como gráfico o como
 * tabla. Sin Vue, para probarlo en Node (`tests/chart-view.test.mjs`); el estado
 * vive en `useChartView`.
 *
 * La elección es **de cada gráfico**: pulsar «Ver como tabla» en una sección no
 * cambia las demás. Se recuerda por gráfico, con una clave propia en
 * `localStorage` hecha con su id estable (`class-missions`, `class-weeks`…); un
 * gráfico sin id no recuerda nada.
 */
export type ChartView = 'chart' | 'table'

/** El prefijo de las claves de `localStorage`, una por gráfico. */
export const CHART_VIEW_PREFIX = 'itakai:view:chart:'

/** Un id que sirve de clave: letras, números, guiones y puntos, hasta 64. */
const VALID_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/i

/** La clave de `localStorage` de un gráfico; null sin id (o con uno que no vale). */
export function chartViewStorageKey(chartId: string | null | undefined): string | null {
  if (!chartId || !VALID_ID.test(chartId)) return null
  return `${CHART_VIEW_PREFIX}${chartId}`
}

/** Lo guardado, si es una vista; si no (vacío, corrupto, de otra versión), null. */
export function parseChartView(saved: unknown): ChartView | null {
  return saved === 'chart' || saved === 'table' ? saved : null
}
