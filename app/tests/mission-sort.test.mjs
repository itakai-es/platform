/**
 * Pruebas de utils/mission-sort.ts (orden de los listados de misiones). Dentro
 * de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/mission-sort.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { sortMissions, DEFAULT_MISSION_SORT } = await import(
  'http://localhost:4000/_nuxt/utils/mission-sort.ts'
)

const titles = list => list.map(m => m.title)

test('por defecto, el orden de la clase', () => {
  assert.equal(DEFAULT_MISSION_SORT, 'order-asc')
  const list = [
    { title: 'Tercera', orderIndex: 2 },
    { title: 'Primera', orderIndex: 0 },
    { title: 'Segunda', orderIndex: 1 },
  ]
  assert.deepEqual(titles(sortMissions(list, 'order-asc')), ['Primera', 'Segunda', 'Tercera'])
  // No toca la lista de entrada.
  assert.deepEqual(titles(list), ['Tercera', 'Primera', 'Segunda'])
})

test('sin posición, el orden en que llegaron; a igualdad, también', () => {
  const list = [{ title: 'B' }, { title: 'A' }, { title: 'C' }]
  assert.deepEqual(titles(sortMissions(list, 'order-asc')), ['B', 'A', 'C'])
  const tied = [
    { title: 'Uno', orderIndex: 0 },
    { title: 'Dos', orderIndex: 0 },
  ]
  assert.deepEqual(titles(sortMissions(tied, 'order-asc')), ['Uno', 'Dos'])
})

test('con varias clases, por clase y dentro de cada una en su orden', () => {
  const list = [
    { title: 'Mates 2', className: 'Matemáticas', classId: 'm', orderIndex: 1 },
    { title: 'Historia 1', className: 'Historia', classId: 'h', orderIndex: 0 },
    { title: 'Mates 1', className: 'Matemáticas', classId: 'm', orderIndex: 0 },
    { title: 'Historia 2', className: 'Historia', classId: 'h', orderIndex: 1 },
  ]
  assert.deepEqual(titles(sortMissions(list, 'order-asc')), [
    'Historia 1',
    'Historia 2',
    'Mates 1',
    'Mates 2',
  ])
})

test('por fecha usa la fecha límite de verdad, y las que no tienen van al final', () => {
  const list = [
    { title: 'Sin fecha', deadline: null },
    { title: 'Viernes', deadline: '2026-10-30T10:00:00Z' },
    { title: 'Lunes', deadline: '2026-10-26T10:00:00Z' },
  ]
  assert.deepEqual(titles(sortMissions(list, 'deadline-asc')), ['Lunes', 'Viernes', 'Sin fecha'])
  assert.deepEqual(titles(sortMissions(list, 'deadline-desc')), ['Sin fecha', 'Viernes', 'Lunes'])
})

test('nombre, XP, rareza y finalización', () => {
  const list = [
    { title: 'Beta', xpReward: 50, rarity: 'legendaria', completedCount: 1, totalStudents: 4 },
    { title: 'Alfa', xpReward: 100, rarity: 'comun', completedCount: 3, totalStudents: 4 },
    { title: 'Gamma', xpReward: 10, rarity: 'rara', completedCount: 0, totalStudents: 0 },
  ]
  assert.deepEqual(titles(sortMissions(list, 'title-asc')), ['Alfa', 'Beta', 'Gamma'])
  assert.deepEqual(titles(sortMissions(list, 'xp-desc')), ['Alfa', 'Beta', 'Gamma'])
  assert.deepEqual(titles(sortMissions(list, 'rarity-desc')), ['Beta', 'Gamma', 'Alfa'])
  assert.deepEqual(titles(sortMissions(list, 'completion-asc')), ['Gamma', 'Beta', 'Alfa'])
})

test('un orden desconocido deja la lista como llegó', () => {
  const list = [{ title: 'B' }, { title: 'A' }]
  assert.deepEqual(titles(sortMissions(list, 'raro')), ['B', 'A'])
})

test('orderByIds pone el orden que devuelve la API y numera desde 0', async () => {
  const { orderByIds } = await import('http://localhost:4000/_nuxt/utils/mission-sort.ts')
  const list = [
    { id: 'a', title: 'A', orderIndex: 0 },
    { id: 'b', title: 'B', orderIndex: 1 },
    { id: 'c', title: 'C', orderIndex: 2 },
    { id: 'd', title: 'D', orderIndex: 3 },
  ]
  const ordered = orderByIds(list, ['c', 'a'])
  assert.deepEqual(
    ordered.map(m => [m.id, m.orderIndex]),
    [
      ['c', 0],
      ['a', 1],
      ['b', 2],
      ['d', 3],
    ]
  )
  assert.equal(list[0].orderIndex, 0)
})
