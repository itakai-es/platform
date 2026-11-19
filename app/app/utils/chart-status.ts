/**
 * Los estados de una misión en los gráficos de analítica (barras apiladas,
 * leyendas, tablas). Sin Vue, para probarlo en Node
 * (`tests/chart-status.test.mjs`).
 *
 * El orden es el del avance y el de la API (`MISSION_BAR_STATES`): lo hecho, lo
 * que está en marcha, lo que aún no ha empezado y lo que ya no se puede hacer o
 * todavía no se abre. Es el mismo en la barra, en las cifras y en la leyenda.
 *
 * Cómo se ve cada uno (color de token, trama, icono) está en `ChartFill` y en
 * `ChartStatusIcon`; el texto, en `common.charts.status.*`. Nunca va solo el
 * color.
 */
export const CHART_STATUSES = [
  'completed',
  'pending_review',
  'in_progress',
  'not_started',
  'expired',
  'path_locked',
] as const

export type ChartStatus = (typeof CHART_STATUSES)[number]

export type ChartStatusCounts = Partial<Record<ChartStatus, number>>

/**
 * Lo que se apila en las columnas de actividad de cada semana, de abajo arriba:
 * entregas, aprobaciones y pistas (lo que suma `weekTotal`). Como los estados,
 * cada uno con su relleno (`ChartFill`), su icono (`ChartStatusIcon`) y su texto.
 */
export const ACTIVITY_SERIES = ['submissions', 'approvals', 'hints'] as const

export type ActivitySeries = (typeof ACTIVITY_SERIES)[number]

/**
 * Los estados que trae `counts`, en el orden de siempre. Un estado con 0 se
 * queda (su cifra se escribe: «0 por revisar» también informa); uno que no
 * viene, no (esa vista no lo usa).
 */
export function presentStatuses(counts: ChartStatusCounts): ChartStatus[] {
  return CHART_STATUSES.filter(status => typeof counts[status] === 'number')
}

/** Un segmento de la barra de una misión, como lo manda la API. */
export interface MissionBarSegmentLike {
  state: string
  count: number
}

/** El estado de la API (`MissionBarState`) en el gráfico. `excluded` no es un estado que se dibuje. */
const STATUS_OF_BAR_STATE: Record<string, ChartStatus> = {
  completed: 'completed',
  awaiting_review: 'pending_review',
  in_progress: 'in_progress',
  not_started: 'not_started',
  expired: 'expired',
  path_locked: 'path_locked',
}

/**
 * Las cifras de una barra a partir de los segmentos de la API, sin
 * `excluded`: una misión que no cuenta lleva su texto, no un color.
 */
export function countsFromSegments(segments: readonly MissionBarSegmentLike[]): ChartStatusCounts {
  const counts: ChartStatusCounts = {}
  for (const segment of segments) {
    const status = STATUS_OF_BAR_STATE[segment.state]
    if (status) counts[status] = (counts[status] ?? 0) + segment.count
  }
  return counts
}

/** Los estados con algo en alguna de las barras: los únicos que enseña la leyenda. */
export function statusesInUse(allCounts: readonly ChartStatusCounts[]): ChartStatus[] {
  return CHART_STATUSES.filter(status => allCounts.some(counts => (counts[status] ?? 0) > 0))
}

/** Las cifras de una barra solo con esos estados, para que todas las filas digan lo mismo. */
export function onlyStatuses(
  counts: ChartStatusCounts,
  statuses: readonly ChartStatus[]
): ChartStatusCounts {
  return Object.fromEntries(statuses.map(status => [status, counts[status] ?? 0]))
}
