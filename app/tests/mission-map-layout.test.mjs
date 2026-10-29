/**
 * Pruebas de utils/mission-map-layout.ts (capas, nodos, líneas y rejilla del
 * mapa de misiones). Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/mission-map-layout.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { layoutMissionMap, mapGrid, mapColumns } = await import(
  'http://localhost:4000/_nuxt/utils/mission-map-layout.ts'
)

const m = (id, prerequisiteIds = [], extra = {}) => ({
  id,
  title: id.toUpperCase(),
  status: 'activa',
  prerequisiteIds,
  ...extra,
})

test('sin requisitos, el camino es el orden de la clase: una capa por misión y líneas seguidas', () => {
  const layout = layoutMissionMap([m('a'), m('b'), m('c')], 'student')
  assert.equal(layout.branched, false)
  assert.deepEqual(layout.layers, [['a'], ['b'], ['c']])
  assert.deepEqual(
    layout.edges.map(e => [e.from, e.to, e.kind]),
    [
      ['a', 'b', 'order'],
      ['b', 'c', 'order'],
    ]
  )
})

test('con requisitos: capa = camino más largo; dentro, el orden de la clase; una línea por requisito', () => {
  // 1 → 2 → (3 y 4) → 5 pide 3 y 4; 6 no pide nada.
  const missions = [
    m('m1'),
    m('m2', ['m1']),
    m('m3', ['m2']),
    m('m4', ['m2']),
    m('m5', ['m4', 'm3']),
    m('m6'),
  ]
  const layout = layoutMissionMap(missions, 'teacher')
  assert.equal(layout.branched, true)
  assert.deepEqual(layout.layers, [['m1', 'm6'], ['m2'], ['m3', 'm4'], ['m5']])
  assert.deepEqual(
    layout.nodes.map(n => [n.id, n.layer, n.slot, n.step]),
    [
      ['m1', 0, 0, 1],
      ['m6', 0, 1, 2],
      ['m2', 1, 0, 3],
      ['m3', 2, 0, 4],
      ['m4', 2, 1, 5],
      ['m5', 3, 0, 6],
    ]
  )
  assert.deepEqual(
    layout.edges.map(e => e.key),
    ['m1>m2', 'm2>m3', 'm2>m4', 'm3>m5', 'm4>m5']
  )
  // Al profesorado, lo que abre cada una es todo lo que pide, en el orden de la clase.
  const m5 = layout.nodes.find(n => n.id === 'm5')
  assert.deepEqual(m5.opensAfter, [
    { id: 'm3', title: 'M3' },
    { id: 'm4', title: 'M4' },
  ])
  assert.equal(m5.lockReason, null)
})

test('al alumnado: cerrada por el camino con lo que le falta, o por su docente; las líneas hechas', () => {
  const missions = [
    m('a', [], { status: 'completada', progress: 100 }),
    m('b', ['a'], { progress: 0 }),
    m('c', ['b'], {
      status: 'bloqueada',
      lockReason: 'path',
      requires: [{ id: 'b', title: 'B' }],
    }),
    m('d', [], { status: 'bloqueada', lockReason: 'teacher' }),
  ]
  const layout = layoutMissionMap(missions, 'student')
  const byId = Object.fromEntries(layout.nodes.map(n => [n.id, n]))
  assert.equal(byId.a.state, 'completed')
  assert.equal(byId.b.state, 'available')
  assert.equal(byId.b.lockReason, null)
  assert.deepEqual(byId.b.opensAfter, [])
  assert.equal(byId.c.state, 'locked')
  assert.equal(byId.c.lockReason, 'path')
  assert.deepEqual(byId.c.opensAfter, [{ id: 'b', title: 'B' }])
  assert.equal(byId.d.lockReason, 'teacher')
  assert.deepEqual(byId.d.opensAfter, [])
  assert.deepEqual(
    layout.edges.map(e => [e.key, e.done]),
    [
      ['a>b', true],
      ['b>c', false],
    ]
  )
})

test('la rejilla: cada capa en su fila y centrada; si no cabe, en varias; en zigzag si va de una en una', () => {
  const layout = layoutMissionMap(
    [m('a'), m('b', ['a']), m('c', ['a']), m('d', ['a']), m('e', ['a']), m('f', ['a'])],
    'student'
  )
  const cells = mapGrid(layout, 3)
  // a sola, centrada en una rejilla de 6 columnas; b, c, d en la segunda fila; e y f, en la tercera.
  assert.deepEqual(cells.get('a'), { row: 1, column: 3 })
  assert.deepEqual(
    ['b', 'c', 'd'].map(id => cells.get(id)),
    [
      { row: 2, column: 1 },
      { row: 2, column: 3 },
      { row: 2, column: 5 },
    ]
  )
  assert.deepEqual(
    ['e', 'f'].map(id => cells.get(id)),
    [
      { row: 3, column: 2 },
      { row: 3, column: 4 },
    ]
  )

  const chain = layoutMissionMap([m('a'), m('b', ['a']), m('c', ['b'])], 'student')
  const zig = mapGrid(chain, 2)
  assert.deepEqual(
    ['a', 'b', 'c'].map(id => zig.get(id)),
    [
      { row: 1, column: 1 },
      { row: 2, column: 3 },
      { row: 3, column: 1 },
    ]
  )
})

test('las columnas según el ancho: entre 2 y 4', () => {
  assert.equal(mapColumns(300), 2)
  assert.equal(mapColumns(600), 3)
  assert.equal(mapColumns(2000), 4)
})
