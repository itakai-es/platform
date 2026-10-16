/**
 * Pruebas de utils/roulette.ts (la ruleta de la clase, sin pantalla).
 *
 * El front no tiene un ejecutor de pruebas: el módulo es puro y se importa ya
 * compilado del servidor de desarrollo. Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/roulette.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const r = await import('http://localhost:4000/_nuxt/utils/roulette.ts')

test('nombre visible: alias en la clase o nombre, nunca el usuario ni el correo', () => {
  assert.equal(r.rouletteLabel({ nickname: 'Rayo de Luz', name: 'Laura Pérez' }), 'Rayo de Luz')
  assert.equal(r.rouletteLabel({ nickname: '  ', name: 'Laura Pérez' }), 'Laura Pérez')
  assert.equal(r.rouletteLabel({ nickname: null, name: 'Iker', username: 'iker.g' }), 'Iker')
})

test('iniciales de los sectores de una rueda llena', () => {
  assert.equal(r.rouletteInitials('laura pérez gil'), 'LP')
  assert.equal(r.rouletteInitials('Íñigo'), 'ÍÑ')
  assert.equal(r.rouletteInitials(''), '?')
})

test('el giro siempre va hacia delante y deja la aguja en el sector elegido', () => {
  for (let i = 0; i < 2000; i++) {
    const count = 1 + r.randomIndex(40)
    const index = r.randomIndex(count)
    const from = Math.random() * 10000
    const to = r.rouletteTarget(from, index, count, r.randomUnit())
    assert.ok(to > from + 360 * (r.ROULETTE_TURNS - 1))
    // Girar R lleva el punto θ de la rueda a θ + R; la aguja está arriba, en 0.
    const theta = ((-to % 360) + 360) % 360
    assert.equal(Math.floor(theta / (360 / count)), index)
  }
})

test('el azar no tiene sesgo visible', () => {
  const counts = new Array(7).fill(0)
  for (let i = 0; i < 70000; i++) counts[r.randomIndex(7)]++
  for (const c of counts) assert.ok(Math.abs(c - 10000) < 600, `${counts}`)
})

test('tics: crecientes, dentro del giro y nunca pegados', () => {
  const to = r.rouletteTarget(10, 3, 30, 0.5)
  const ticks = r.rouletteTickTimes(10, to, 30, 4.2)
  assert.ok(ticks.length > 10)
  for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i] - ticks[i - 1] >= 0.045)
  assert.ok(ticks[0] >= 0 && ticks.at(-1) < 4.2)
  assert.deepEqual(r.rouletteTickTimes(10, 10, 30, 4.2), [])
})

test('tics: suenan justo cuando la aguja cruza cada borde (ease-out cubic)', () => {
  // Inversa de ease-out cubic: la fracción f del giro llega en (1 - ∛(1 - f)) · d.
  const at = (f, d) => (1 - Math.cbrt(1 - f)) * d
  const close = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`)

  // Cuatro sectores y una vuelta desde 0: bordes a 90°, 180° y 270° (el de 360° ya es el final).
  const ticks = r.rouletteTickTimes(0, 360, 4, 4, 0)
  assert.equal(ticks.length, 3)
  ;[0.25, 0.5, 0.75].forEach((f, i) => close(ticks[i], at(f, 4)))

  // Desde 30°, el primer borde llega tras 60° de giro, no tras un sector entero.
  const shifted = r.rouletteTickTimes(30, 30 + 360, 4, 4, 0)
  assert.equal(shifted.length, 4)
  ;[60, 150, 240, 330].forEach((angle, i) => close(shifted[i], at(angle / 360, 4)))
})

test('fecha local de la ronda', () => {
  assert.equal(r.localDay(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
})

test('la ronda se recuerda solo ese día; «sin repetir» viene activado', () => {
  const store = new Map()
  const fake = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true })
  try {
    // Sin nada guardado: ronda nueva y sin repetir.
    assert.deepEqual(r.readRouletteRound('c1', '2026-10-08'), {
      day: '2026-10-08',
      drawn: [],
      noRepeat: true,
    })
    // Lo de hoy vuelve tal cual.
    r.writeRouletteRound('c1', { day: '2026-10-08', drawn: ['a', 'b'], noRepeat: false })
    assert.deepEqual(r.readRouletteRound('c1', '2026-10-08').drawn, ['a', 'b'])
    // Lo de ayer no cuenta, pero el interruptor sí se conserva.
    assert.deepEqual(r.readRouletteRound('c1', '2026-10-09'), {
      day: '2026-10-09',
      drawn: [],
      noRepeat: false,
    })
    // Cada clase lleva su ronda.
    assert.deepEqual(r.readRouletteRound('c2', '2026-10-08').drawn, [])
    // Con la página abierta desde ayer: la ronda de hoy, vacía y con el mismo interruptor.
    const yesterday = { day: '2026-10-08', drawn: ['a'], noRepeat: false }
    assert.deepEqual(r.rouletteRoundForDay(yesterday, '2026-10-09'), {
      day: '2026-10-09',
      drawn: [],
      noRepeat: false,
    })
    assert.equal(r.rouletteRoundForDay(yesterday, '2026-10-08'), yesterday)
    // Un valor roto da una ronda nueva.
    store.set('itakai:roulette:c1', '{roto')
    assert.deepEqual(r.readRouletteRound('c1', '2026-10-08'), {
      day: '2026-10-08',
      drawn: [],
      noRepeat: true,
    })
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
})

test('quién entra en la rueda: sin quien falta hoy, por equipo o entre equipos', () => {
  const students = ['a', 'b', 'c', 'd'].map(id => ({ id, label: id.toUpperCase() }))
  const absent = new Set(['b'])
  const ids = list => list.map(entry => entry.id)
  // Todo el alumnado, menos quien falta.
  assert.deepEqual(ids(r.rouletteScope(students, absent, 'students')), ['a', 'c', 'd'])
  // Sin lista hoy no falta nadie.
  assert.deepEqual(ids(r.rouletteScope(students, new Set(), 'students')), ['a', 'b', 'c', 'd'])
  // Un equipo: sus integrantes que han venido; un id que ya no está en la clase no entra.
  const red = { id: 't1', title: 'Rojo', studentIds: ['a', 'b', 'zz'], fill: 'rgb(1 2 3)' }
  const blue = { id: 't2', title: 'Azul', studentIds: ['b'] }
  const green = { id: 't3', title: 'Verde', studentIds: ['c', 'd'] }
  assert.deepEqual(ids(r.rouletteScope(students, absent, 'team', [red])), ['a'])
  assert.deepEqual(r.rouletteScope(students, absent, 'team', []), [])
  // Entre equipos: los sectores son equipos; uno sin nadie que haya venido se queda fuera.
  const wheel = r.rouletteScope(students, absent, 'teams', [red, blue, green])
  assert.deepEqual(ids(wheel), ['t1', 't3'])
  assert.deepEqual(wheel[0], { id: 't1', label: 'Rojo', avatar: null, fill: 'rgb(1 2 3)' })
})
