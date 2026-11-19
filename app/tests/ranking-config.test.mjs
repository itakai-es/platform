/**
 * Pruebas de utils/ranking-config.ts (espejo de la API) y de lo que depende de ella
 * en class-settings. Ver api/tests/utils/ranking-config.test.ts.
 *
 * El front no tiene un ejecutor de pruebas: los módulos son puros y se importan ya
 * compilados del servidor de desarrollo. Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/ranking-config.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const r = await import('http://localhost:4000/_nuxt/utils/ranking-config.ts')
const s = await import('http://localhost:4000/_nuxt/utils/class-settings.ts')
const a = await import('http://localhost:4000/_nuxt/utils/avatar.ts')

test('nula es como hoy; los valores raros caen en los de por defecto', () => {
  const today = { types: ['xp', 'teams'], mode: 'full', topN: 5, compare: null }
  for (const raw of [null, undefined, 'x', 7, [], {}, { types: [] }, { types: ['vidas'] }]) {
    assert.deepEqual(r.resolveRankingConfig(raw), today)
  }
  assert.deepEqual(r.resolveRankingConfig({ mode: 'anónimo', topN: 4 }), today)
})

test('se queda con lo que vale, con los tipos sin repetir y en su orden', () => {
  assert.deepEqual(
    r.resolveRankingConfig({
      types: ['teams', 'vidas', 'missions', 'teams'],
      mode: 'position',
      topN: 10,
    }),
    { types: ['missions', 'teams'], mode: 'position', topN: 10, compare: null }
  )
})

test('lo guardado que ya no es de la configuración, como una temporada, se ignora', () => {
  const saved = {
    types: ['missions'],
    mode: 'top',
    topN: 3,
    seasonStartedAt: '2026-11-02T07:00:00.000Z',
  }
  assert.deepEqual(r.resolveRankingConfig(saved), {
    types: ['missions'],
    mode: 'top',
    topN: 3,
    compare: null,
  })
  assert.deepEqual(r.resolveRankingConfig({ seasonStartedAt: 'ayer' }), r.DEFAULT_RANKING_CONFIG)
})

test('los periodos: «Siempre» y «Esta semana», sin temporada', () => {
  assert.deepEqual([...r.RANKING_PERIODS], ['all', 'week'])
})

test('la comparación con la media: sin guardar, sigue al ranking; guardada, manda ella', () => {
  assert.equal(r.resolveRankingConfig({ compare: true }).compare, true)
  assert.equal(r.resolveRankingConfig({ compare: false }).compare, false)
  assert.equal(r.resolveRankingConfig({ compare: 'sí' }).compare, null)
  assert.equal(r.compareEnabled({ rankings: true }, { compare: null }), true)
  assert.equal(r.compareEnabled({ rankings: false }, { compare: null }), false)
  assert.equal(r.compareEnabled({ rankings: false }, { compare: true }), true)
  assert.equal(r.compareEnabled({ rankings: true }, { compare: false }), false)
})

test('el ranking ya no pide XP: encenderlo no enciende la XP ni apagarla lo apaga', () => {
  const base = s.resolveClassSettings(null)
  const noXp = s.coerceClassSettings(base, 'xp', false)
  assert.equal(noXp.xp, false)
  assert.equal(noXp.rankings, true)
  const off = s.coerceClassSettings(noXp, 'rankings', false)
  const on = s.coerceClassSettings(off, 'rankings', true)
  assert.equal(on.rankings, true)
  assert.equal(on.xp, false)
})

test('cada tipo pide lo suyo: la XP, XP; misiones y equipos, nada', () => {
  const config = { types: ['xp', 'missions', 'teams'] }
  assert.deepEqual(r.effectiveRankingTypes(config, { xp: true }), ['xp', 'missions', 'teams'])
  assert.deepEqual(r.effectiveRankingTypes(config, { xp: false }), ['missions', 'teams'])
})

test('sin ningún tipo disponible, el interruptor queda apagado', () => {
  const onlyXp = { types: ['xp'] }
  assert.equal(r.normalizeRankingSwitch({ xp: false, rankings: true }, onlyXp).rankings, false)
  assert.equal(r.normalizeRankingSwitch({ xp: true, rankings: true }, onlyXp).rankings, true)
})

test('al encender el ranking sin ningún tipo que se pueda usar, arranca con misiones', () => {
  assert.deepEqual(r.rankingTypesToTurnOn({ types: ['xp'] }, { xp: false }), ['missions'])
  const usable = { types: ['xp', 'teams'] }
  // La misma lista: quien la llama sabe así que no hay nada que guardar.
  assert.equal(r.rankingTypesToTurnOn(usable, { xp: false }), usable.types)
})

test('el color del avatar es el que calcula la API (api/tests/utils/ranking-config.test.ts)', () => {
  const color = (classId, studentId) => a.avatarColorOf(a.studentAvatarSeed(classId, studentId))
  assert.equal(color('clase-1', 'alumno-1'), 'purple')
  assert.equal(color('clase-1', 'alumno-2'), 'peach')
  assert.equal(
    color('9f4ccae9-575b-4185-b9ae-dce19f8e92a5', 'ccaa721f-80e3-4cef-acc7-88326da53af2'),
    'yellow'
  )
})
