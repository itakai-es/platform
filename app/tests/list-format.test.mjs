/**
 * Pruebas de utils/list-format.ts (la lista de títulos del camino del mapa).
 * Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/list-format.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { formatConjunction } = await import('http://localhost:4000/_nuxt/utils/list-format.ts')

test('uno solo, tal cual; ninguno, vacío', () => {
  assert.equal(formatConjunction(['«A»'], 'es', 'y'), '«A»')
  assert.equal(formatConjunction([], 'es', 'y'), '')
})

test('con un idioma que conoce Intl, como en ese idioma', () => {
  assert.equal(formatConjunction(['«A»', '«B»', '«C»'], 'es', 'y'), '«A», «B» y «C»')
  assert.equal(formatConjunction(['«A»', '«B»'], 'ca', 'i'), '«A» i «B»')
})

test('con uno que no conoce, con la conjunción del propio idioma', () => {
  // `zxx` («sin contenido lingüístico») no lo conoce ningún navegador.
  assert.equal(formatConjunction(['«A»', '«B»', '«C»'], 'zxx', 'eta'), '«A», «B» eta «C»')
  assert.equal(formatConjunction(['«A»', '«B»'], 'zxx', 'e'), '«A» e «B»')
})
