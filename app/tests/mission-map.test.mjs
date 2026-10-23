/**
 * Pruebas de utils/mission-map.ts (lo que dibuja el mapa de misiones). Dentro
 * de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/mission-map.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { studentNodeState, teacherNodeState, mapLane, pathBetween, segmentDone } = await import(
  'http://localhost:4000/_nuxt/utils/mission-map.ts'
)

const now = Date.parse('2026-10-23T10:00:00Z')
const inDays = d => new Date(now + d * 86400000).toISOString()

test('el estado de cada nodo para el alumnado sale del de la API y de su progreso', () => {
  assert.equal(studentNodeState({ status: 'completada', progress: 100 }), 'completed')
  assert.equal(studentNodeState({ status: 'bloqueada', progress: 50 }), 'locked')
  assert.equal(studentNodeState({ status: 'expirada', progress: 0 }), 'expired')
  assert.equal(studentNodeState({ status: 'urgente', progress: 20 }), 'urgent')
  assert.equal(studentNodeState({ status: 'activa', progress: 50 }), 'in_progress')
  assert.equal(studentNodeState({ status: 'activa', progress: 0 }), 'available')
  assert.equal(studentNodeState({ status: 'activa' }), 'available')
})

test('el del profesorado sigue al filtro de estado: completada es de todo el alumnado', () => {
  const base = { deadline: null, completedCount: 1, totalStudents: 3 }
  assert.equal(teacherNodeState({ ...base, status: 'activa' }, now), 'available')
  assert.equal(teacherNodeState({ ...base, status: 'bloqueada' }, now), 'locked')
  assert.equal(teacherNodeState({ ...base, status: 'activa', completedCount: 3 }, now), 'completed')
  assert.equal(teacherNodeState({ ...base, status: 'activa', deadline: inDays(1) }, now), 'urgent')
  assert.equal(
    teacherNodeState({ ...base, status: 'activa', deadline: inDays(-1) }, now),
    'expired'
  )
})

test('los carriles alternan empezando por la izquierda', () => {
  assert.deepEqual([0, 1, 2, 3].map(mapLane), ['left', 'right', 'left', 'right'])
})

test('el trazo une los centros: recta en la misma columna, curva en S entre carriles', () => {
  assert.equal(pathBetween({ x: 40, y: 10 }, { x: 40, y: 110 }), 'M 40 10 L 40 110')
  assert.equal(
    pathBetween({ x: 100, y: 40 }, { x: 300, y: 160 }),
    'M 100 40 C 100 100 300 100 300 160'
  )
  // Los puntos de control no se salen de entre los dos nodos: no pisa los textos.
  const d = pathBetween({ x: 320.25, y: 50 }, { x: 180.5, y: 170 })
  const xs = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => Number(m[1]))
  for (const x of xs) assert.ok(x >= 180.5 && x <= 320.3, `${x} fuera`)
})

test('un tramo va hecho cuando sale de una misión completada', () => {
  assert.equal(segmentDone('completed'), true)
  for (const state of ['in_progress', 'available', 'urgent', 'expired', 'locked']) {
    assert.equal(segmentDone(state), false)
  }
})
