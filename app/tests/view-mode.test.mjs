/**
 * Pruebas de utils/view-mode.ts (qué vista sale en un listado: cuadrícula,
 * lista o mapa). Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/view-mode.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { resolveViewMode } = await import('http://localhost:4000/_nuxt/utils/view-mode.ts')

const withMap = ['grid', 'list', 'map']
const withoutMap = ['grid', 'list']

test('sin elegir nada, sale la de entrada: el mapa para el alumnado si la clase lo tiene', () => {
  assert.equal(resolveViewMode(null, 'map', withMap), 'map')
  assert.equal(resolveViewMode(null, 'grid', withMap), 'grid')
})

test('lo elegido se respeta mientras se ofrezca', () => {
  assert.equal(resolveViewMode('list', 'map', withMap), 'list')
  assert.equal(resolveViewMode('map', 'grid', withMap), 'map')
})

test('con el mapa elegido y apagado en la clase, sale la de entrada', () => {
  assert.equal(resolveViewMode('map', 'list', withoutMap), 'list')
  assert.equal(resolveViewMode('map', 'grid', withoutMap), 'grid')
})

test('si tampoco se ofrece la de entrada, la primera que haya', () => {
  assert.equal(resolveViewMode(null, 'map', withoutMap), 'grid')
  assert.equal(resolveViewMode('map', 'map', withoutMap), 'grid')
})
