/**
 * Pruebas de utils/chart-format.ts (porcentajes y redondeos de los gráficos,
 * en el idioma de la app; los números sueltos los prueba number-format).
 * Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/chart-format.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { formatPercent, formatSignedPercent, periodDelta, roundTo, percentOf } = await import(
  'http://localhost:4000/_nuxt/utils/chart-format.ts'
)

const NBSP = ' '

test('un porcentaje que no es un número se escribe como 0', () => {
  assert.equal(formatPercent(Number.POSITIVE_INFINITY, 'es'), `0${NBSP}%`)
  assert.equal(formatPercent(Number.NaN, 'en'), '0%')
})

test('los porcentajes, en puntos y con el signo donde lo pone cada idioma', () => {
  assert.equal(formatPercent(35, 'es'), `35${NBSP}%`)
  assert.equal(formatPercent(35, 'en'), '35%')
  assert.equal(formatPercent(35, 'eu'), `%${NBSP}35`)
  assert.equal(formatPercent(100, 'gl'), `100${NBSP}%`)
  assert.equal(formatPercent(33.333, 'es'), `33${NBSP}%`)
  assert.equal(formatPercent(33.333, 'es', 1), `33,3${NBSP}%`)
})

test('el valenciano sale como el catalán; uno desconocido, como el castellano', () => {
  assert.equal(formatPercent(35, 'val'), formatPercent(35, 'ca'))
  assert.equal(formatPercent(35, 'zxx'), `35${NBSP}%`)
})

test('redondeo al múltiplo más cercano', () => {
  assert.equal(roundTo(487, 10), 490)
  assert.equal(roundTo(484, 10), 480)
  assert.equal(roundTo(37, 5), 35)
  assert.equal(roundTo(38, 5), 40)
  assert.equal(roundTo(0.1 * 3, 0.1), 0.3)
  assert.equal(roundTo(3.25, 0.5), 3.5)
  assert.equal(roundTo(7, 0), 7)
  assert.ok(Object.is(roundTo(-0.2, 1), 0))
})

test('qué parte del total es, en puntos', () => {
  assert.equal(percentOf(3, 8), 38)
  assert.equal(percentOf(3, 8, 5), 40)
  assert.equal(percentOf(0, 8), 0)
  assert.equal(percentOf(4, 0), 0)
  assert.equal(percentOf(8, 8), 100)
})

test('lo que ha cambiado lleva su signo, en el formato del idioma y sin decimales', () => {
  assert.equal(formatSignedPercent(102, 'es'), `+102${NBSP}%`)
  assert.equal(formatSignedPercent(102.4, 'en'), '+102%')
  assert.ok(formatSignedPercent(-12, 'es').includes('12'))
  assert.equal(formatSignedPercent(0, 'es'), `0${NBSP}%`)
})

test('frente al periodo anterior: el % solo si la cifra anterior da para tanto', () => {
  // La anterior tiene peso: el %, sin decimales.
  assert.deepEqual(periodDelta(498, 247), { kind: 'percent', value: 102 })
  assert.deepEqual(periodDelta(211, 174), { kind: 'percent', value: 21 })
  assert.deepEqual(periodDelta(10, 40), { kind: 'percent', value: -75 })
  // Casi sin datos, la diferencia: de 5 a 1283 no es un «25 560 %».
  assert.deepEqual(periodDelta(1283, 5), { kind: 'absolute', value: 1278 })
  assert.deepEqual(periodDelta(925, 5), { kind: 'absolute', value: 920 })
  assert.deepEqual(periodDelta(61, 0), { kind: 'absolute', value: 61 })
  assert.deepEqual(periodDelta(0, 7), { kind: 'absolute', value: -7 })
  // Sin cambios, nada.
  assert.equal(periodDelta(0, 0), null)
  assert.equal(periodDelta(80, 80), null)
  // Un cambio que no llega a 1 % no se escribe como «0 %».
  assert.deepEqual(periodDelta(1001, 1000), { kind: 'absolute', value: 1 })
})

test('frente al periodo anterior: una cifra que ya es un %, en puntos', () => {
  assert.deepEqual(periodDelta(1.1, 100, true), { kind: 'points', value: -98.9 })
  assert.deepEqual(periodDelta(0.3, 0, true), { kind: 'points', value: 0.3 })
  assert.equal(periodDelta(0, 0, true), null)
})
