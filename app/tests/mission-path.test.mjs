/**
 * Pruebas de utils/mission-path.ts (el camino del mapa en el editor y al
 * ordenar). Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/mission-path.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  MISSION_PREREQUISITE_LIMIT,
  pathEdges,
  dependentsOf,
  prerequisiteChoices,
  orderBreaksPath,
  chainSummary,
} = await import('http://localhost:4000/_nuxt/utils/mission-path.ts')

const m = (id, prerequisiteIds = []) => ({ id, title: id.toUpperCase(), prerequisiteIds })

test('las aristas, solo entre las misiones que hay y sin pedirse a sí misma', () => {
  assert.deepEqual(pathEdges([m('a'), m('b', ['a', 'zz', 'b'])]), [
    { missionId: 'b', requiredMissionId: 'a' },
  ])
})

test('quién necesita a una misión, directa o indirectamente', () => {
  const edges = pathEdges([m('a'), m('b', ['a']), m('c', ['b']), m('d')])
  assert.deepEqual([...dependentsOf(edges, 'a')].sort(), ['b', 'c'])
  assert.deepEqual([...dependentsOf(edges, 'd')], [])
})

test('las casillas: sin ella misma, las que cerrarían un círculo deshabilitadas, con tope', () => {
  const missions = [m('a'), m('b', ['a']), m('c', ['b']), m('d'), m('e'), m('f')]
  const choices = prerequisiteChoices(missions, 'a', [])
  assert.deepEqual(
    choices.map(c => [c.id, c.disabledReason]),
    [
      ['b', 'cycle'],
      ['c', 'cycle'],
      ['d', null],
      ['e', null],
      ['f', null],
    ]
  )
  assert.equal(MISSION_PREREQUISITE_LIMIT, 3)
  const full = prerequisiteChoices(missions, 'f', ['a', 'd', 'e'])
  assert.deepEqual(
    full.map(c => [c.id, c.checked, c.disabledReason]),
    [
      ['a', true, null],
      ['b', false, 'limit'],
      ['c', false, 'limit'],
      ['d', true, null],
      ['e', true, null],
    ]
  )
  // Lo que pide ahora la misión no cuenta para los ciclos: se va a sustituir.
  const own = prerequisiteChoices([m('a', ['b']), m('b')], 'a', ['b'])
  assert.deepEqual(
    own.map(c => [c.id, c.checked, c.disabledReason]),
    [['b', true, null]]
  )
})

test('un orden que pone una misión delante de lo que pide se detecta', () => {
  const missions = [m('a'), m('b', ['a'])]
  assert.deepEqual(orderBreaksPath(['b', 'a'], missions), {
    missionId: 'b',
    requiredMissionId: 'a',
  })
  assert.equal(orderBreaksPath(['a', 'b'], missions), null)
})

test('encadenar en orden: cuántos requisitos deja, cuántos hay y si ya está así', () => {
  assert.deepEqual(chainSummary([m('a'), m('b'), m('c', ['a'])]), {
    links: 2,
    current: 1,
    skipped: 0,
    alreadyChained: false,
  })
  assert.deepEqual(chainSummary([m('a'), m('b', ['a']), m('c', ['b'])]), {
    links: 2,
    current: 2,
    skipped: 0,
    alreadyChained: true,
  })
  assert.deepEqual(chainSummary([m('a')]), {
    links: 0,
    current: 0,
    skipped: 0,
    alreadyChained: true,
  })
})

test('encadenar en orden deja fuera las bloqueadas: cada abierta pide la abierta anterior', () => {
  const locked = (id, prerequisiteIds = []) => ({ ...m(id, prerequisiteIds), status: 'bloqueada' })
  // a, (b bloqueada), c, d: c pide a y d pide c.
  assert.deepEqual(chainSummary([m('a'), locked('b'), m('c'), m('d')]), {
    links: 2,
    current: 0,
    skipped: 1,
    alreadyChained: false,
  })
  assert.deepEqual(chainSummary([m('a'), locked('b'), m('c', ['a']), m('d', ['c'])]), {
    links: 2,
    current: 2,
    skipped: 1,
    alreadyChained: true,
  })
  // Encadenadas con la bloqueada dentro: no es lo que deja «Encadenar».
  assert.deepEqual(chainSummary([m('a'), locked('b', ['a']), m('c', ['b'])]), {
    links: 1,
    current: 2,
    skipped: 1,
    alreadyChained: false,
  })
  // Una bloqueada que pide algo, con las abiertas ya encadenadas: tampoco.
  assert.deepEqual(chainSummary([m('a'), m('b', ['a']), locked('c', ['a'])]), {
    links: 1,
    current: 2,
    skipped: 1,
    alreadyChained: false,
  })
})
