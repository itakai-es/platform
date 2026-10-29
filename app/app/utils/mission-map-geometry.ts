/**
 * Dónde va cada cosa en el mapa de misiones (E3), sin Vue ni DOM: a partir de
 * la disposición (utils/mission-map-layout.ts) y del ancho disponible, el
 * centro de cada medallón, el de la salida y el de la meta, el trazo de cada
 * tramo de la carretera y la decoración del fondo. MissionMap.vue solo mide el
 * ancho y lo pinta: con 30 o 40 misiones no hay que medir nodo a nodo, y vive
 * aquí para poder probarlo sin navegador.
 *
 * Dos formas:
 * - `board` (desde BOARD_MIN_WIDTH): un tablero. Si cada capa tiene una sola
 *   misión (sin requisitos, o una cadena), el camino serpentea en filas de 2 a
 *   4, de izquierda a derecha y de vuelta, como en un juego de mesa. Con ramas,
 *   cada capa es una fila y la misión que va sola en su fila se pone bajo lo
 *   que pide, un poco a un lado, para que el camino serpentee. La capa que no
 *   cabe se parte en filas al tresbolillo (una llena y otra con una menos,
 *   media columna a un lado). Una carretera por arista; la que salta filas
 *   pasa entre los medallones de cada fila que cruza, nunca por encima.
 * - `column` (móvil): una columna, con la carretera a la izquierda y los
 *   títulos a la derecha, de cada misión a la siguiente del recorrido; lo que
 *   abre cada una va en texto.
 *
 * La salida va antes de lo que no pide nada y la meta, detrás de la última
 * capa. En el tablero con ramas, todo lo que no abre nada (lo de la última
 * capa y las ramas que acaban antes) sigue hasta la meta: ningún camino se
 * queda en el aire. Un tramo va hecho si sale de una misión completada (o de
 * la salida).
 */
import type { MapNodeState } from './mission-map'
import type { MissionMapLayout } from './mission-map-layout'

export interface MapPoint {
  x: number
  y: number
}

export type MapShape = 'board' | 'column'

/** Un tramo de carretera, de `from` a `to` (ids de misión, `start` o `goal`). */
export interface MapRoad {
  key: string
  from: string
  to: string
  d: string
  done: boolean
}

/** Una mancha de color del fondo (una «isla»), con el nombre de su color. */
export interface MapIsland {
  x: number
  y: number
  rx: number
  ry: number
  tone: 'purple' | 'navy' | 'mint'
}

export interface MapGeometry {
  shape: MapShape
  width: number
  height: number
  /** Diámetro del medallón. */
  node: number
  /** `board`: ancho de la etiqueta, centrada bajo el medallón. `column`: dónde empieza (x). */
  label: number
  /** Centro del medallón de cada misión. */
  places: Map<string, MapPoint>
  start: MapPoint
  goal: MapPoint
  roads: MapRoad[]
}

/** Ids de la salida y de la meta en las claves de los tramos. */
export const MAP_START = 'start'
export const MAP_GOAL = 'goal'

/** Medidas del dibujo, en px. */
export const MAP_SIZES = {
  board: {
    node: 88,
    label: 172,
    /** Distancia entre los centros de dos filas. */
    row: 236,
    /** Ancho mínimo de cada columna (la etiqueta y un respiro). */
    column: 184,
    padX: 36,
    /** Centro de la primera fila (la salida queda a `startGap` por encima, con margen). */
    top: 190,
    /** De la salida a la primera fila: deja sitio a «Estás aquí» entre las dos. */
    startGap: 140,
    goalGap: 182,
    bottom: 84,
    /** Lo que baja la etiqueta desde el centro del medallón. */
    labelDepth: 64,
    /** En el tablero serpenteante, lo que sube y baja cada parada. */
    wave: 22,
    /** Con ramas, lo que se aparta de lo que pide la misión que va sola en su fila. */
    meander: 0.3,
    /**
     * La carretera que cruza una fila va recta por su hueco desde este tanto
     * antes del centro de los medallones hasta este tanto después.
     */
    through: 52,
    /**
     * Lo que baja, como poco, el primer tramo desde la salida (y el último
     * hasta la meta) por cada px que se aparta de lado.
     */
    slope: 0.6,
    /** Lo más que se aparta de lado (en columnas) un tramo de una fila a la siguiente. */
    slant: 2,
  },
  column: {
    node: 64,
    row: 112,
    /** La carretera, con sitio a la izquierda para el anillo del profesorado. */
    x: 50,
    wiggle: 16,
    top: 120,
    startGap: 88,
    bottom: 64,
  },
} as const

/** Desde este ancho (px), tablero; por debajo, columna. */
export const BOARD_MIN_WIDTH = 520

export function mapShape(width: number): MapShape {
  return width >= BOARD_MIN_WIDTH ? 'board' : 'column'
}

/** Cuántas misiones caben por fila en el tablero: entre 2 y 4. */
export function boardColumns(width: number): number {
  const { column, padX } = MAP_SIZES.board
  return Math.min(4, Math.max(2, Math.floor((width - 2 * padX) / column)))
}

const round = (n: number) => Math.round(n * 10) / 10
const at = (p: MapPoint) => `${round(p.x)} ${round(p.y)}`

/**
 * De arriba abajo: una S que sale y llega en vertical, con la x siempre entre
 * las de los dos puntos. Recta si están en la misma columna.
 */
export function roadDown(from: MapPoint, to: MapPoint): string {
  return roadVia([from, to])
}

/**
 * De arriba abajo pasando por unos puntos: una S vertical de cada uno al
 * siguiente. Como cada S sale y llega en vertical, en los puntos de paso la
 * carretera sigue recta, sin codos.
 */
export function roadVia(points: MapPoint[]): string {
  const parts = [`M ${at(points[0]!)}`]
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!
    const to = points[index]!
    if (Math.abs(from.x - to.x) < 0.5) {
      parts.push(`L ${at(to)}`)
      continue
    }
    const mid = (to.y - from.y) / 2
    parts.push(
      `C ${at({ x: from.x, y: from.y + mid })} ${at({ x: to.x, y: to.y - mid })} ${at(to)}`
    )
  }
  return parts.join(' ')
}

/** De lado: una S que sale y llega en horizontal (dos paradas de la misma fila). */
export function roadAcross(from: MapPoint, to: MapPoint): string {
  const mid = (to.x - from.x) / 2
  return `M ${at(from)} C ${at({ x: from.x + mid, y: from.y })} ${at({ x: to.x - mid, y: to.y })} ${at(to)}`
}

/**
 * Media vuelta al final de una fila: sale en horizontal hacia fuera (`bulge`,
 * con su signo: a la derecha si es positivo), baja y vuelve en horizontal a la
 * parada de debajo. Se abre lo bastante para no pisar la etiqueta del medallón
 * del que sale.
 */
export function roadTurn(from: MapPoint, to: MapPoint, bulge: number): string {
  return `M ${at(from)} C ${at({ x: from.x + bulge, y: from.y })} ${at({ x: to.x + bulge, y: to.y })} ${at(to)}`
}

/** Dónde va cada cosa del mapa para un ancho dado (px). */
export function mapGeometry(layout: MissionMapLayout, width: number): MapGeometry {
  return mapShape(width) === 'board' ? boardGeometry(layout, width) : columnGeometry(layout, width)
}

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

/** Un tramo va hecho si sale de la salida o de una misión completada. */
function roadDone(states: Map<string, MapNodeState>, from: string) {
  return from === MAP_START || states.get(from) === 'completed'
}

function boardGeometry(layout: MissionMapLayout, width: number): MapGeometry {
  const S = MAP_SIZES.board
  const columns = boardColumns(width)
  const colWidth = (width - 2 * S.padX) / columns
  const states = new Map(layout.nodes.map(n => [n.id, n.state]))
  const places = new Map<string, MapPoint>()
  const roads: MapRoad[] = []
  const road = (from: string, to: string, d: string) =>
    roads.push({ key: `${from}>${to}`, from, to, d, done: roadDone(states, from) })
  const ids = layout.nodes.map(n => n.id)

  // Sin ramas: un camino que serpentea por filas, como un tablero de juego.
  if (layout.layers.every(layer => layer.length === 1)) {
    const stop = (index: number) => {
      const row = Math.floor(index / columns)
      const position = index % columns
      const slot = row % 2 === 0 ? position : columns - 1 - position
      return {
        row,
        slot,
        x: S.padX + colWidth * (slot + 0.5),
        y: S.top + row * S.row + (position % 2 === 1 ? S.wave : 0),
      }
    }
    const order = new Map(ids.map((id, index) => [id, index]))
    ids.forEach((id, index) => {
      const { x, y } = stop(index)
      places.set(id, { x, y })
    })
    // La media vuelta sale hacia fuera todo lo que deja el margen.
    const bulge = (colWidth / 2 + S.padX - 20) / 0.75
    const link = (a: number, b: number) => {
      const from = stop(a)
      const to = stop(b)
      if (from.row === to.row) return roadAcross(from, to)
      if (b === a + 1) return roadTurn(from, to, from.slot === 0 ? -bulge : bulge)
      return roadDown(from, to)
    }
    const start = { x: stop(0).x, y: S.top - S.startGap }
    const goalStop = stop(ids.length)
    const goal = { x: goalStop.x, y: goalStop.y }
    if (ids.length > 0) road(MAP_START, ids[0]!, roadDown(start, stop(0)))
    for (const edge of layout.edges) {
      road(edge.from, edge.to, link(order.get(edge.from)!, order.get(edge.to)!))
    }
    if (ids.length > 0) road(ids.at(-1)!, MAP_GOAL, link(ids.length - 1, ids.length))
    // Abajo, sitio para la meta y para las etiquetas de la última fila.
    const lastRowY = S.top + Math.floor(Math.max(ids.length - 1, 0) / columns) * S.row
    const height = Math.max(goal.y, lastRowY + S.wave + S.labelDepth) + S.bottom
    return {
      shape: 'board',
      width,
      height,
      node: S.node,
      label: S.label,
      places,
      start,
      goal,
      roads,
    }
  }

  // Con ramas: cada capa en su fila.
  const needs = new Map(layout.nodes.map(n => [n.id, n.prerequisiteIds]))
  const rows: string[][] = []
  /** La fila de cada cosa: la salida va antes de la primera y la meta, detrás de la última. */
  const rowOf = new Map<string, number>([[MAP_START, -1]])
  const minX = S.padX + colWidth / 2
  const maxX = width - S.padX - colWidth / 2
  /** El centro de una columna (`slot` + 0,5 es el hueco entre esa y la siguiente). */
  const slotX = (slot: number) => S.padX + colWidth * (slot + 0.5)
  /** Una fila más, con la x de cada una; la y se pone al final, con el sitio de la salida. */
  const addRow = (row: string[], xOf: (id: string, slot: number) => number) => {
    row.forEach((id, slot) => {
      places.set(id, { x: xOf(id, slot), y: 0 })
      rowOf.set(id, rows.length)
    })
    rows.push(row)
  }
  for (const layer of layout.layers) {
    if (layer.length === 1) {
      // A solas, bajo lo que pide, y un poco a un lado (alternando) para que el
      // camino no sea una recta.
      addRow(layer, id => {
        const parents = (needs.get(id) ?? []).flatMap(p => places.get(p) ?? [])
        const base = parents.length > 0 ? average(parents.map(p => p.x)) : width / 2
        const side = rows.length % 2 === 0 ? -1 : 1
        return Math.min(maxX, Math.max(minX, base + side * colWidth * S.meander))
      })
      continue
    }
    if (layer.length <= columns) {
      // Las que no llenan la fila se reparten el ancho (sin pasarse de separadas).
      const spacing = Math.min((width - 2 * S.padX) / layer.length, colWidth * 1.5)
      addRow(layer, (_id, slot) => width / 2 + (slot - (layer.length - 1) / 2) * spacing)
      continue
    }
    // No cabe: filas al tresbolillo, una llena y otra con una menos en los
    // huecos de la de arriba, para que lo que baja pase entre medallones.
    for (let from = 0, part = 0; from < layer.length; part += 1) {
      const staggered = part % 2 === 1
      const size = staggered ? columns - 1 : columns
      const row = layer.slice(from, from + size)
      from += size
      const offset = (staggered ? 0.5 : 0) + Math.floor((size - row.length) / 2)
      addRow(row, (_id, slot) => slotX(offset + slot))
    }
  }

  // La salida, sobre el centro de la primera fila, y la meta, bajo el de la última.
  const first = layout.layers[0] ?? []
  const startX = average(rows[0]!.map(id => places.get(id)!.x))
  const goalX = average(rows.at(-1)!.map(id => places.get(id)!.x))
  rowOf.set(MAP_GOAL, rows.length)

  // Los carriles de cada fila, por donde pasan las carreteras que la cruzan:
  // las columnas y los huecos entre ellas (y entre cada dos medallones) que
  // quedan al menos a media columna de todos sus medallones.
  const grid = Array.from({ length: 2 * columns + 1 }, (_, k) => S.padX + (colWidth * k) / 2)
  const rowLanes = rows.map(row => {
    const xs = row.map(id => places.get(id)!.x).sort((a, b) => a - b)
    const between = xs.slice(1).map((x, i) => (xs[i]! + x) / 2)
    const clear = (x: number) => xs.every(n => Math.abs(n - x) >= colWidth / 2 - 0.5)
    return [...new Set([...grid, ...between].map(round))].filter(clear).sort((a, b) => a - b)
  })
  const xOf = (id: string) =>
    id === MAP_START ? startX : id === MAP_GOAL ? goalX : places.get(id)!.x
  /**
   * Lo que se tuerce un tramo: lo que se aparta de lado por cada px que baja.
   * Uno que se aparta más de `slant` columnas pasaría rozando los medallones
   * de al lado de donde sale o adonde llega: solo si no queda otra.
   */
  const bend = (dx: number, dy: number) =>
    (dx / dy) ** 2 + (Math.abs(dx) > S.slant * colWidth ? 100 : 0)

  /**
   * Por qué carriles va cada carretera: en cada fila que cruza, el que hace
   * que se tuerza lo menos posible en todo el camino (un tramo corto, como el
   * de la salida, se tuerce más con lo mismo). Cruza la fila en recto, de
   * `through` antes a `through` después del centro de los medallones.
   */
  const pickLanes = (from: string, to: string): number[] => {
    const rowA = rowOf.get(from)!
    const crossed = rowLanes.slice(rowA + 1, rowOf.get(to)!)
    if (crossed.length === 0) return []
    const free = S.row - 2 * S.through
    // Lo menos torcido hasta cada carril de cada fila, y por dónde se llega.
    let best = crossed[0]!.map(x => ({
      cost: bend(x - xOf(from), rowA === -1 ? S.startGap - S.through : S.row - S.through),
      path: [x],
    }))
    for (const row of crossed.slice(1)) {
      best = row.map(x =>
        best
          .map(prev => ({
            cost: prev.cost + bend(x - prev.path.at(-1)!, free),
            path: [...prev.path, x],
          }))
          .reduce((low, option) => (option.cost < low.cost ? option : low))
      )
    }
    const tail = (to === MAP_GOAL ? S.goalGap : S.row) - S.through
    const end = (option: (typeof best)[number]) =>
      option.cost + bend(xOf(to) - option.path.at(-1)!, tail)
    return best.reduce((low, option) => (end(option) < end(low) ? option : low)).path
  }

  const opens = new Set(layout.edges.map(edge => edge.from))
  const links: [string, string][] = [
    ...first.map(id => [MAP_START, id] as [string, string]),
    ...layout.edges.map(edge => [edge.from, edge.to] as [string, string]),
    // Lo que no abre nada sigue hasta la meta.
    ...ids.filter(id => !opens.has(id)).map(id => [id, MAP_GOAL] as [string, string]),
  ]
  const routes = links.map(([from, to]) => ({ from, to, xs: pickLanes(from, to) }))

  // La salida y la meta, con sitio para que su primer o último tramo no se
  // tuerza tanto que pase rozando un medallón de la primera o la última fila.
  const room = (dx: number, lead: number) => lead + S.slope * Math.abs(dx)
  let startGap: number = S.startGap
  let goalGap: number = S.goalGap
  for (const { from, to, xs } of routes) {
    if (from === MAP_START) {
      const next = xs[0] ?? xOf(to)
      startGap = Math.max(startGap, room(next - startX, xs.length > 0 ? S.through : 0))
    }
    if (to === MAP_GOAL) {
      const prev = xs.at(-1) ?? xOf(from)
      goalGap = Math.max(goalGap, room(goalX - prev, xs.length > 0 ? S.through : 0))
    }
  }
  const top = S.top + startGap - S.startGap
  const rowY = (row: number) => top + row * S.row
  for (const [id, place] of places) places.set(id, { x: place.x, y: rowY(rowOf.get(id)!) })
  const start = { x: startX, y: top - startGap }
  const goal = { x: goalX, y: rowY(rows.length - 1) + goalGap }
  const point = (id: string) =>
    id === MAP_START ? start : id === MAP_GOAL ? goal : places.get(id)!

  for (const { from, to, xs } of routes) {
    const rowA = rowOf.get(from)!
    const via = xs.flatMap((x, index) => [
      { x, y: rowY(rowA + 1 + index) - S.through },
      { x, y: rowY(rowA + 1 + index) + S.through },
    ])
    road(from, to, roadVia([point(from), ...via, point(to)]))
  }
  return {
    shape: 'board',
    width,
    height: goal.y + S.bottom,
    node: S.node,
    label: S.label,
    places,
    start,
    goal,
    roads,
  }
}

function columnGeometry(layout: MissionMapLayout, width: number): MapGeometry {
  const S = MAP_SIZES.column
  const states = new Map(layout.nodes.map(n => [n.id, n.state]))
  const ids = layout.nodes.map(n => n.id)
  const stop = (index: number) => ({
    x: S.x + (index % 2 === 1 ? S.wiggle : 0),
    y: S.top + index * S.row,
  })
  const places = new Map(ids.map((id, index) => [id, stop(index)]))
  const start = { x: S.x, y: S.top - S.startGap }
  const goal = stop(ids.length)
  // Una carretera por la columna, en el orden del recorrido.
  const chain = [MAP_START, ...ids, MAP_GOAL]
  const point = (id: string) =>
    id === MAP_START ? start : id === MAP_GOAL ? goal : places.get(id)!
  const roads = chain.slice(1).map((to, index) => {
    const from = chain[index]!
    return {
      key: `${from}>${to}`,
      from,
      to,
      d: roadDown(point(from), point(to)),
      done: roadDone(states, from),
    }
  })
  return {
    shape: 'column',
    width,
    height: goal.y + S.bottom,
    node: S.node,
    label: S.x + S.wiggle + S.node / 2 + 16,
    places,
    start,
    goal,
    roads,
  }
}

/**
 * Las manchas de color del fondo: una cada tanto, alternando lado y tono, del
 * alto del mapa. Siempre las mismas para el mismo tamaño.
 */
export function mapIslands(width: number, height: number): MapIsland[] {
  const tones: MapIsland['tone'][] = ['purple', 'navy', 'mint']
  const step = 300
  const islands: MapIsland[] = []
  for (let index = 0, y = 90; y < height + step / 2; index += 1, y += step) {
    const left = index % 2 === 0
    islands.push({
      x: round(left ? width * 0.16 : width * 0.84),
      y,
      rx: round(Math.max(110, width * 0.24)),
      ry: 120,
      tone: tones[index % tones.length]!,
    })
  }
  return islands
}

/**
 * Las estrellitas del fondo: unas pocas por cada 100 px de alto, en sitios que
 * parecen al azar pero salen siempre igual (un generador con semilla fija).
 */
export function mapSparkles(width: number, height: number): (MapPoint & { size: number })[] {
  let seed = 7
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const count = Math.round((height / 100) * 2.5)
  return Array.from({ length: count }, () => ({
    x: round(12 + next() * (width - 24)),
    y: round(12 + next() * (height - 24)),
    size: round(4 + next() * 6),
  }))
}
