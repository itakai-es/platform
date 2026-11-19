/**
 * Pruebas de utils/chart-scale.ts (escalas de barras, columnas y barras
 * apiladas). Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/chart-scale.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { scaleMax, barPercent, columnHeights, segmentWidths, stackedColumns } = await import(
  'http://localhost:4000/_nuxt/utils/chart-scale.ts'
)

/** La suma en centésimas, para comparar sin el ruido de la coma flotante. */
const sumHundredths = widths => Math.round(widths.reduce((a, b) => a + b, 0) * 100)

test('el tope de la escala es el valor más alto, y como poco 1', () => {
  assert.equal(scaleMax([3, 8, 5]), 8)
  assert.equal(scaleMax([]), 1)
  assert.equal(scaleMax([0, 0]), 1)
  assert.equal(scaleMax([0, 0], 100), 100)
  assert.equal(scaleMax([-4, Number.NaN, 2]), 2)
})

test('una barra es su parte del tope, acotada a 100', () => {
  assert.equal(barPercent(3, 8), 37.5)
  assert.equal(barPercent(8, 8), 100)
  assert.equal(barPercent(12, 8), 100)
  assert.equal(barPercent(1, 3), 33.33)
})

test('un 0 no se dibuja; un valor pequeño no desaparece', () => {
  assert.equal(barPercent(0, 8, 3), 0)
  assert.equal(barPercent(-2, 8, 3), 0)
  assert.equal(barPercent(Number.NaN, 8, 3), 0)
  assert.equal(barPercent(1, 1000, 3), 3)
  assert.equal(barPercent(5, 0), 0)
})

test('las columnas se escalan al valor más alto, o al tope que se pida', () => {
  assert.deepEqual(columnHeights([0, 5, 10]), [0, 50, 100])
  assert.deepEqual(columnHeights([0, 5, 10], 20), [0, 25, 50])
  assert.deepEqual(columnHeights([1, 200]), [3, 100])
  assert.deepEqual(columnHeights([]), [])
  assert.deepEqual(columnHeights([0, 0]), [0, 0])
})

test('los segmentos suman exactamente 100', () => {
  for (const values of [
    [5, 1, 2],
    [1, 1, 1],
    [2, 3, 7, 11],
    [8, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [37, 1, 1, 961],
  ]) {
    assert.equal(sumHundredths(segmentWidths(values)), 10000, `con ${values}`)
  }
  assert.deepEqual(segmentWidths([5, 1, 2]), [62.5, 12.5, 25])
  assert.deepEqual(segmentWidths([1, 1, 1]), [33.34, 33.33, 33.33])
})

test('un segmento pequeño con valor no se pierde: ocupa al menos el mínimo', () => {
  const widths = segmentWidths([997, 1, 2])
  assert.equal(sumHundredths(widths), 10000)
  assert.ok(widths[1] >= 3 && widths[2] >= 3, `anchuras ${widths}`)
  // Lo que ganan los pequeños sale del grande, no de los otros pequeños.
  assert.deepEqual(widths, [94, 3, 3])
  assert.deepEqual(segmentWidths([997, 1, 2], { minPercent: 5 }), [90, 5, 5])
})

test('si el mínimo no cabe para todos, todos por igual', () => {
  const widths = segmentWidths([1, 1, 1, 1], { minPercent: 40 })
  assert.deepEqual(widths, [25, 25, 25, 25])
  const uneven = segmentWidths([100, 1, 1], { minPercent: 50 })
  assert.equal(sumHundredths(uneven), 10000)
  assert.ok(
    uneven.every(w => w >= 33.33),
    `anchuras ${uneven}`
  )
})

test('lo que vale 0 ocupa 0; todo a 0 deja la barra vacía', () => {
  assert.deepEqual(segmentWidths([0, 4, 0, 4]), [0, 50, 0, 50])
  assert.deepEqual(segmentWidths([0, 0, 0]), [0, 0, 0])
  assert.deepEqual(segmentWidths([]), [])
  assert.deepEqual(segmentWidths([Number.NaN, -3, 6]), [0, 0, 100])
})

test('el reparto es estable: mismos datos, mismas anchuras', () => {
  assert.deepEqual(segmentWidths([2, 3, 7, 11]), segmentWidths([2, 3, 7, 11]))
  assert.deepEqual(segmentWidths([1, 2], { decimals: 0 }), [33, 67])
  assert.equal(sumHundredths(segmentWidths([1, 1, 1], { decimals: 0 })), 10000)
})

test('las columnas apiladas: la altura por la suma y, dentro, la parte de cada tipo', () => {
  const columns = stackedColumns([
    [6, 5, 3],
    [0, 0, 0],
    [2, 0, 0],
    [10, 0, 1],
  ])
  // La más alta (14) llega arriba; las demás, en proporción; un 0 se queda en 0.
  assert.deepEqual(
    columns.map(c => c.height),
    [100, 0, 14.29, 78.57]
  )
  // Dentro de cada una, sus partes suman 100 y ninguna con valor se pierde.
  for (const column of columns.filter(c => c.height > 0)) {
    assert.equal(sumHundredths(column.parts), 10000)
  }
  assert.deepEqual(columns[1].parts, [0, 0, 0])
  assert.deepEqual(columns[2].parts, [100, 0, 0])
  assert.ok(columns[3].parts[2] >= 3)
})

test('las columnas apiladas con su propio tope, y sin semanas', () => {
  assert.deepEqual(
    stackedColumns([[1, 1]], 4).map(c => c.height),
    [50]
  )
  assert.deepEqual(stackedColumns([]), [])
  // Lo que no es un número cuenta como 0.
  assert.deepEqual(
    stackedColumns([[Number.NaN, 2]]).map(c => c.parts),
    [[0, 100]]
  )
})
