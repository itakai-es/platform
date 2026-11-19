/**
 * Pruebas de utils/chart-view.ts («Ver como tabla», de cada gráfico). Dentro de
 * itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/chart-view.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { CHART_VIEW_PREFIX, chartViewStorageKey, parseChartView } = await import(
  'http://localhost:4000/_nuxt/utils/chart-view.ts'
)

test('cada gráfico tiene su propia clave: cambiar uno no toca los demás', () => {
  const missions = chartViewStorageKey('class-missions')
  const weeks = chartViewStorageKey('class-weeks')
  assert.equal(missions, 'itakai:view:chart:class-missions')
  assert.equal(weeks, 'itakai:view:chart:class-weeks')
  assert.notEqual(missions, weeks)
  assert.ok(missions.startsWith(CHART_VIEW_PREFIX))
  // Nunca la clave de antes, la que compartían todos.
  assert.notEqual(missions, 'itakai:view:chart')
})

test('sin un id que valga, no se recuerda nada', () => {
  assert.equal(chartViewStorageKey(undefined), null)
  assert.equal(chartViewStorageKey(null), null)
  assert.equal(chartViewStorageKey(''), null)
  assert.equal(chartViewStorageKey('con espacios'), null)
  assert.equal(chartViewStorageKey('-empieza-por-guion'), null)
  assert.equal(chartViewStorageKey('x'.repeat(65)), null)
  assert.equal(chartViewStorageKey('admin.series-2'), 'itakai:view:chart:admin.series-2')
})

test('solo vale lo que es una vista', () => {
  assert.equal(parseChartView('table'), 'table')
  assert.equal(parseChartView('chart'), 'chart')
  assert.equal(parseChartView(null), null)
  assert.equal(parseChartView(''), null)
  assert.equal(parseChartView('TABLE'), null)
  assert.equal(parseChartView('{"view":"table"}'), null)
})
