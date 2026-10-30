/**
 * Pruebas de utils/mission-map-layout.ts (capas, nodos, líneas y lo que está
 * unido a cada nodo en el mapa de misiones). Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/mission-map-layout.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { layoutMissionMap, mapNeighbors } = await import(
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
    layout.edges.map(e => [e.key, e.from, e.to]),
    [
      ['a>b', 'a', 'b'],
      ['b>c', 'b', 'c'],
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
  // El recorrido, capa a capa y, dentro, en el orden de la clase.
  assert.deepEqual(
    layout.nodes.map(n => [n.id, n.step]),
    [
      ['m1', 1],
      ['m6', 2],
      ['m2', 3],
      ['m3', 4],
      ['m4', 5],
      ['m5', 6],
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

test('al alumnado: cerrada por el camino con lo que le falta, o por su docente', () => {
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
    layout.edges.map(e => e.key),
    ['a>b', 'b>c']
  )
})

test('lo unido a una misión: lo que pide y lo que abre (para resaltarlo)', () => {
  // 1 → 2 → (3 y 4); 5 pide 3 y 4.
  const layout = layoutMissionMap(
    [m('m1'), m('m2', ['m1']), m('m3', ['m2']), m('m4', ['m2']), m('m5', ['m3', 'm4'])],
    'teacher'
  )
  assert.deepEqual(mapNeighbors(layout, 'm2'), { requires: ['m1'], unlocks: ['m3', 'm4'] })
  assert.deepEqual(mapNeighbors(layout, 'm5'), { requires: ['m3', 'm4'], unlocks: [] })
  assert.deepEqual(mapNeighbors(layout, 'm1'), { requires: [], unlocks: ['m2'] })

  // Sin requisitos, la anterior y la siguiente del camino.
  const linear = layoutMissionMap([m('a'), m('b'), m('c')], 'student')
  assert.deepEqual(mapNeighbors(linear, 'b'), { requires: ['a'], unlocks: ['c'] })
})
