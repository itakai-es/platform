/**
 * Pruebas de utils/number-format.ts (números en el idioma de la app).
 * Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/number-format.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { formatNumber, formatCompactNumber, formatSignedNumber } = await import(
  'http://localhost:4000/_nuxt/utils/number-format.ts'
)

test('con los separadores de cada idioma, no con los del castellano siempre', () => {
  assert.equal(formatNumber(12345, 'es'), '12.345')
  assert.equal(formatNumber(12345, 'en'), '12,345')
  assert.equal(formatNumber(12345, 'pt'), '12 345')
})

test('el valenciano sale como el catalán', () => {
  assert.equal(formatNumber(12345, 'val'), formatNumber(12345, 'ca'))
})

test('las cifras pequeñas, tal cual', () => {
  assert.equal(formatNumber(7, 'es'), '7')
  assert.equal(formatNumber(0, 'el'), '0')
})

test('abreviado en el idioma', () => {
  assert.equal(formatCompactNumber(45200, 'en'), '45.2k')
  assert.equal(formatCompactNumber(999, 'es'), '999')
})

test('con su signo, salvo el 0', () => {
  assert.equal(formatSignedNumber(1278, 'es'), '+1278')
  assert.equal(formatSignedNumber(12345, 'en'), '+12,345')
  assert.ok(formatSignedNumber(-3.5, 'es').endsWith('3,5'))
  assert.equal(formatSignedNumber(0, 'es'), '0')
})
