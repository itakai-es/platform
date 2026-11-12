/**
 * Pruebas de la geometría del rediseño de la analítica: el anillo de progreso
 * (utils/progress-ring.ts) y la pila de avatares (`avatarStack`, utils/avatar.ts).
 * Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/progress-ring.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { RING_BOX, ringRadius, ringFraction, percentFraction, ringDashOffset, ringStrokeFor } =
  await import('http://localhost:4000/_nuxt/utils/progress-ring.ts')
const { avatarStack } = await import('http://localhost:4000/_nuxt/utils/avatar.ts')

test('el trazo entero cabe en la caja del anillo', () => {
  assert.equal(RING_BOX, 100)
  assert.equal(ringRadius(8), 46)
  assert.equal(ringRadius(10), 45)
  // El radio más el medio trazo llega justo al borde.
  for (const stroke of [2, 6, 12.5]) assert.equal(ringRadius(stroke) + stroke / 2, 50)
  // Un trazo sin sentido no deja el radio fuera de la caja.
  assert.equal(ringRadius(0), 49.5)
  assert.equal(ringRadius(500), 30)
  assert.equal(ringRadius(Number.NaN), 49.5)
})

test('lo lleno sale de «X de N», acotado de 0 a 1', () => {
  assert.equal(ringFraction(3, 7), 3 / 7)
  assert.equal(ringFraction(0, 7), 0)
  assert.equal(ringFraction(7, 7), 1)
  assert.equal(ringFraction(9, 7), 1)
  assert.equal(ringFraction(2, 0), 0)
  assert.equal(ringFraction(), 0)
})

test('y de un porcentaje', () => {
  assert.equal(percentFraction(42), 0.42)
  assert.equal(percentFraction(0), 0)
  assert.equal(percentFraction(130), 1)
  assert.equal(percentFraction(-5), 0)
  assert.equal(percentFraction(null), 0)
  assert.equal(percentFraction(undefined), 0)
})

test('el arco deja sin pintar lo que falta, con pathLength 100', () => {
  assert.equal(ringDashOffset(0), 100)
  assert.equal(ringDashOffset(1), 0)
  assert.equal(ringDashOffset(0.42), 58)
  assert.equal(ringDashOffset(3 / 7), 57.14)
  assert.equal(ringDashOffset(2), 0)
  assert.equal(ringDashOffset(-1), 100)
  assert.equal(ringDashOffset(Number.NaN), 100)
})

test('un trazo en píxeles, en unidades del viewBox', () => {
  // El medallón del mapa: anillo de 102 px (72 + 30) con un trazo de 6 px.
  assert.equal(ringStrokeFor(6, 102), 5.882)
  assert.equal(ringStrokeFor(10, 100), 10)
  assert.equal(ringStrokeFor(6, 0), 0)
  // Con ese trazo, el radio en píxeles es el de siempre: medio medallón + 12.
  const size = 72 + 30
  const radiusPx = (ringRadius(ringStrokeFor(6, size)) * size) / 100
  assert.ok(Math.abs(radiusPx - (72 / 2 + 12)) < 0.01)
})

const people = n => Array.from({ length: n }, (_, i) => `p${i + 1}`)

test('la pila enseña a todas si caben y, si no, deja el último hueco al «+N»', () => {
  assert.deepEqual(avatarStack([]), { shown: [], more: 0 })
  assert.deepEqual(avatarStack(people(3)), { shown: people(3), more: 0 })
  assert.deepEqual(avatarStack(people(8)), { shown: people(8), more: 0 })
  assert.deepEqual(avatarStack(people(9)), { shown: people(7), more: 2 })
  assert.deepEqual(avatarStack(people(4), 4), { shown: people(4), more: 0 })
  assert.deepEqual(avatarStack(people(5), 4), { shown: people(3), more: 2 })
})

test('con el total de la API, que manda solo las primeras', () => {
  // 7 personas, llegan 5; caben 6 huecos: las 5 y «+2».
  assert.deepEqual(avatarStack(people(5), 6, 7), { shown: people(5), more: 2 })
  // 6 personas, llegan 5; caben 6: las 5 y «+1» (6 huecos, ninguno de más).
  assert.deepEqual(avatarStack(people(5), 6, 6), { shown: people(5), more: 1 })
  // 30 personas, llegan 5; caben 4: 3 y «+27».
  assert.deepEqual(avatarStack(people(5), 4, 30), { shown: people(3), more: 27 })
  // Nunca más huecos que `max`.
  for (const total of [0, 1, 5, 6, 7, 40]) {
    const { shown, more } = avatarStack(people(Math.min(total, 5)), 6, total)
    assert.ok(shown.length + (more > 0 ? 1 : 0) <= 6, `total ${total}`)
    assert.equal(shown.length + more, total)
  }
})
