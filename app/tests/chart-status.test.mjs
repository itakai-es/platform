/**
 * Pruebas de utils/chart-status.ts (los estados de los gráficos de analítica y
 * su orden). Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/chart-status.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { CHART_STATUSES, presentStatuses, countsFromSegments, statusesInUse, onlyStatuses } =
  await import('http://localhost:4000/_nuxt/utils/chart-status.ts')

test('el orden es el del avance, el mismo de la API', () => {
  assert.deepEqual(CHART_STATUSES, [
    'completed',
    'pending_review',
    'in_progress',
    'not_started',
    'expired',
    'path_locked',
  ])
})

test('solo los estados que vienen, y en el orden de siempre', () => {
  assert.deepEqual(presentStatuses({ not_started: 2, completed: 5, in_progress: 1 }), [
    'completed',
    'in_progress',
    'not_started',
  ])
  assert.deepEqual(presentStatuses({}), [])
})

test('un estado a 0 se queda: su cifra también informa', () => {
  assert.deepEqual(presentStatuses({ completed: 8, pending_review: 0 }), [
    'completed',
    'pending_review',
  ])
})

test('los segmentos de la API: «por revisar» con su nombre y `excluded` no se dibuja', () => {
  assert.deepEqual(
    countsFromSegments([
      { state: 'completed', count: 2 },
      { state: 'awaiting_review', count: 1 },
      { state: 'in_progress', count: 0 },
      { state: 'not_started', count: 3 },
      { state: 'expired', count: 1 },
      { state: 'path_locked', count: 4 },
      { state: 'excluded', count: 5 },
    ]),
    {
      completed: 2,
      pending_review: 1,
      in_progress: 0,
      not_started: 3,
      expired: 1,
      path_locked: 4,
    }
  )
})

test('la leyenda enseña solo los estados con algo, en el orden de siempre', () => {
  assert.deepEqual(
    statusesInUse([
      { completed: 0, path_locked: 2 },
      { completed: 1, expired: 0, in_progress: 3 },
    ]),
    ['completed', 'in_progress', 'path_locked']
  )
  assert.deepEqual(statusesInUse([]), [])
  assert.deepEqual(statusesInUse([{ completed: 0 }]), [])
})

test('todas las filas con los mismos estados: el que falta, a 0', () => {
  assert.deepEqual(onlyStatuses({ completed: 2, expired: 1 }, ['completed', 'in_progress']), {
    completed: 2,
    in_progress: 0,
  })
})
