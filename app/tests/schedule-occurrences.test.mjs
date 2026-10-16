/**
 * Pruebas de utils/schedule-occurrences.ts (qué días hay clase según el horario).
 *
 * El front no tiene un ejecutor de pruebas: el módulo es puro y se importa ya
 * compilado del servidor de desarrollo. Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/schedule-occurrences.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { isClassDay, scheduleOccurrences } = await import(
  'http://localhost:4000/_nuxt/utils/schedule-occurrences.ts'
)

const slot = over => ({
  freq: 'weekly',
  interval: 1,
  weekdays: [],
  start: '09:00',
  end: '10:00',
  startDate: '',
  ends: { type: 'never' },
  overrides: {},
  ...over,
})
const dates = (cfg, from, to) => scheduleOccurrences(cfg, from, to).map(o => o.date)

test('semanal: lunes y miércoles, sin ancla', () => {
  // 5-11 oct 2026: el 5 es lunes.
  assert.deepEqual(dates(slot({ weekdays: [0, 2] }), '2026-10-05', '2026-10-11'), [
    '2026-10-05',
    '2026-10-07',
  ])
})

test('semanal cada 2 semanas desde el ancla', () => {
  const cfg = slot({ weekdays: [0], interval: 2, startDate: '2026-10-07' })
  // El ancla es miércoles: su semana empieza el lunes 5, que queda antes del ancla.
  assert.deepEqual(dates(cfg, '2026-10-01', '2026-11-03'), ['2026-10-19', '2026-11-02'])
})

test('semanal sin días: el día del ancla', () => {
  assert.deepEqual(dates(slot({ startDate: '2026-10-08' }), '2026-10-01', '2026-10-20'), [
    '2026-10-08',
    '2026-10-15',
  ])
})

test('diaria cada 3 días y «no se repite»', () => {
  assert.deepEqual(
    dates(
      slot({ freq: 'daily', interval: 3, startDate: '2026-10-01' }),
      '2026-10-01',
      '2026-10-08'
    ),
    ['2026-10-01', '2026-10-04', '2026-10-07']
  )
  assert.deepEqual(
    dates(slot({ freq: 'none', startDate: '2026-10-02' }), '2026-10-01', '2026-10-08'),
    ['2026-10-02']
  )
  assert.deepEqual(dates(slot({ freq: 'none' }), '2026-10-01', '2026-10-08'), [])
})

test('fin en fecha (incluida) y tras N repeticiones', () => {
  const on = slot({
    weekdays: [0],
    startDate: '2026-10-05',
    ends: { type: 'on', onDate: '2026-10-12' },
  })
  assert.deepEqual(dates(on, '2026-10-01', '2026-10-31'), ['2026-10-05', '2026-10-12'])
  const after = slot({
    weekdays: [0, 3],
    startDate: '2026-10-05',
    ends: { type: 'after', afterCount: 3 },
  })
  assert.deepEqual(dates(after, '2026-10-01', '2026-10-31'), [
    '2026-10-05',
    '2026-10-08',
    '2026-10-12',
  ])
})

test('overrides: off quita, on añade', () => {
  const cfg = slot({ weekdays: [0], overrides: { '2026-10-12': 'off', '2026-10-14': 'on' } })
  assert.deepEqual(dates(cfg, '2026-10-05', '2026-10-18'), ['2026-10-05', '2026-10-14'])
  assert.equal(isClassDay(cfg, '2026-10-12'), false)
})

test('mensual y anual, y varios tramos ordenados por hora', () => {
  assert.deepEqual(
    dates(slot({ freq: 'monthly', startDate: '2026-01-31' }), '2026-01-01', '2026-05-31'),
    ['2026-01-31', '2026-03-31', '2026-05-31']
  )
  assert.deepEqual(
    dates(slot({ freq: 'yearly', startDate: '2025-10-08' }), '2026-10-01', '2026-10-31'),
    ['2026-10-08']
  )
  const two = [slot({ weekdays: [0], start: '12:00' }), slot({ weekdays: [0], start: '08:30' })]
  assert.deepEqual(
    scheduleOccurrences(two, '2026-10-05', '2026-10-05').map(o => o.start),
    ['08:30', '12:00']
  )
})

test('fechas no válidas o sin horario: nada', () => {
  assert.deepEqual(scheduleOccurrences(null, '2026-10-01', '2026-10-31'), [])
  assert.equal(isClassDay(slot({ weekdays: [0] }), '2026-13-01'), false)
})
