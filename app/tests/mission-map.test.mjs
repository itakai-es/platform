/**
 * Pruebas de utils/mission-map.ts (lo que cuenta el mapa de misiones). Dentro
 * de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/mission-map.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  studentNodeState,
  teacherNodeState,
  mapProgress,
  currentNodeId,
  ringFraction,
  classMapProgress,
  avatarStack,
} = await import('http://localhost:4000/_nuxt/utils/mission-map.ts')

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

test('lo recorrido: cuántas están completadas, de cuántas, y en %', () => {
  assert.deepEqual(mapProgress(['completed', 'completed', 'available', 'locked']), {
    done: 2,
    total: 4,
    percent: 50,
  })
  assert.deepEqual(mapProgress(['completed', 'in_progress', 'locked']), {
    done: 1,
    total: 3,
    percent: 33,
  })
  assert.deepEqual(mapProgress([]), { done: 0, total: 0, percent: 0 })
})

test('«Estás aquí»: la primera en curso; si no, la primera urgente o disponible', () => {
  const n = (id, state) => ({ id, state })
  // Una en curso gana a una disponible anterior.
  assert.equal(
    currentNodeId([n('a', 'completed'), n('b', 'available'), n('c', 'in_progress')]),
    'c'
  )
  // Sin ninguna en curso, la primera abierta del recorrido (urgente o disponible).
  assert.equal(
    currentNodeId([n('a', 'completed'), n('b', 'expired'), n('c', 'urgent'), n('d', 'available')]),
    'c'
  )
  assert.equal(currentNodeId([n('a', 'locked'), n('b', 'available')]), 'b')
  // Todo hecho, caducado o cerrado: no está en ninguna.
  assert.equal(currentNodeId([n('a', 'completed'), n('b', 'expired'), n('c', 'locked')]), null)
  assert.equal(currentNodeId([]), null)
})

test('el anillo del profesorado: la parte del alumnado que la ha completado, de 0 a 1', () => {
  assert.equal(ringFraction(7, 8), 0.875)
  assert.equal(ringFraction(0, 8), 0)
  assert.equal(ringFraction(8, 8), 1)
  // Sin alumnado no hay anillo; nunca se sale de 0..1.
  assert.equal(ringFraction(3, 0), 0)
  assert.equal(ringFraction(), 0)
  assert.equal(ringFraction(9, 8), 1)
})

test('cómo va la clase: la media de lo completado y cuántas ha completado todo el alumnado', () => {
  const missions = [
    { completedCount: 8, totalStudents: 8 },
    { completedCount: 4, totalStudents: 8 },
    { completedCount: 0, totalStudents: 8 },
    { completedCount: 0, totalStudents: 8 },
  ]
  // 12 de 32 posibles.
  assert.deepEqual(classMapProgress(missions), { students: 8, percent: 38, doneByAll: 1 })
  assert.deepEqual(classMapProgress([{ completedCount: 0, totalStudents: 0 }]), {
    students: 0,
    percent: 0,
    doneByAll: 0,
  })
  assert.deepEqual(classMapProgress([]), { students: 0, percent: 0, doneByAll: 0 })
})

test('quién la ha completado: hasta ocho avatares; con más, siete y «+N» con el resto', () => {
  const people = n => Array.from({ length: n }, (_, i) => `p${i}`)
  assert.deepEqual(avatarStack([]), { shown: [], more: 0 })
  assert.deepEqual(avatarStack(people(3)), { shown: people(3), more: 0 })
  assert.deepEqual(avatarStack(people(8)), { shown: people(8), more: 0 })
  assert.deepEqual(avatarStack(people(9)), { shown: people(7), more: 2 })
  assert.deepEqual(avatarStack(people(30)), { shown: people(7), more: 23 })
  // En el orden en que llegan (primero quien antes la completó).
  assert.deepEqual(avatarStack(['b', 'a', 'c'], 2), { shown: ['b'], more: 2 })
})
