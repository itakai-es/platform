/**
 * Pruebas de utils/analytics-view.ts (orden, filtros, comparación y fechas de los
 * paneles de analítica). Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/analytics-view.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  compareBand,
  daysEndingOn,
  filterMissionRows,
  formatDayLong,
  formatWeekShort,
  missionRowStatus,
  searchStudents,
  sortStudents,
  timelineGroup,
  timelineTypeParam,
  weekTotal,
} = await import('http://localhost:4000/_nuxt/utils/analytics-view.ts')

const student = (name, extra = {}) => ({
  id: name,
  name,
  nickname: `Alias ${name}`,
  avatar: null,
  participating: true,
  missionsCompleted: 0,
  missionsCounted: 8,
  percent: 0,
  lastActivityAt: null,
  pendingReviews: 0,
  hintsUsed: 0,
  attendance: null,
  signals: 0,
  ...extra,
})

const names = list => list.map(s => s.name)

test('«en la media» es a menos del 10 % de ella', () => {
  assert.equal(compareBand(50, 50), 'at')
  assert.equal(compareBand(54, 50), 'at')
  assert.equal(compareBand(46, 50), 'at')
  assert.equal(compareBand(56, 50), 'above')
  assert.equal(compareBand(44, 50), 'below')
})

test('con media 0, cualquier cosa por encima de 0 está por encima', () => {
  assert.equal(compareBand(0, 0), 'at')
  assert.equal(compareBand(1, 0), 'above')
})

test('busca por nombre real o por alias, sin distinguir mayúsculas', () => {
  const list = [
    student('Ana'),
    student('Bea', { nickname: 'Chispa' }),
    student('Carla', { nickname: null }),
  ]
  assert.deepEqual(names(searchStudents(list, 'ANA')), ['Ana'])
  assert.deepEqual(names(searchStudents(list, 'chis')), ['Bea'])
  assert.deepEqual(names(searchStudents(list, '  ')), ['Ana', 'Bea', 'Carla'])
})

test('ordena sin tocar la lista, y por nombre en los empates', () => {
  const list = [
    student('Carla', { missionsCompleted: 2 }),
    student('Ana', { missionsCompleted: 1 }),
    student('Bea', { missionsCompleted: 2 }),
  ]
  assert.deepEqual(names(sortStudents(list, 'missions-desc')), ['Bea', 'Carla', 'Ana'])
  assert.deepEqual(names(sortStudents(list, 'missions-asc')), ['Ana', 'Bea', 'Carla'])
  assert.deepEqual(names(sortStudents(list, 'name-desc')), ['Carla', 'Bea', 'Ana'])
  assert.deepEqual(names(list), ['Carla', 'Ana', 'Bea'])
})

test('quien no tiene el dato va al final en los dos sentidos', () => {
  const list = [
    student('Nunca'),
    student('Reciente', { lastActivityAt: '2026-11-04T10:00:00Z' }),
    student('Antigua', { lastActivityAt: '2026-10-01T10:00:00Z' }),
  ]
  assert.deepEqual(names(sortStudents(list, 'activity-desc')), ['Reciente', 'Antigua', 'Nunca'])
  assert.deepEqual(names(sortStudents(list, 'activity-asc')), ['Antigua', 'Reciente', 'Nunca'])

  const present = [
    student('Sin lista'),
    student('Alta', { attendance: { rate: 90, attended: 9, total: 10 } }),
    student('Baja', { attendance: { rate: 50, attended: 5, total: 10 } }),
  ]
  assert.deepEqual(names(sortStudents(present, 'attendance-asc')), ['Baja', 'Alta', 'Sin lista'])
  assert.deepEqual(names(sortStudents(present, 'attendance-desc')), ['Alta', 'Baja', 'Sin lista'])
})

test('las misiones: pendientes solo las que cuentan, y las que no cuentan solo en «todas»', () => {
  const rows = [
    { id: 'hecha', state: 'completed', counted: true },
    { id: 'hecha-bloqueada', state: 'completed', counted: false },
    { id: 'abierta', state: 'in_progress', counted: true },
    { id: 'caducada', state: 'expired', counted: true },
    { id: 'bloqueada', state: 'excluded', counted: false },
  ]
  const ids = filter => filterMissionRows(rows, filter).map(row => row.id)
  assert.equal(ids('all').length, 5)
  assert.deepEqual(ids('pending'), ['abierta', 'caducada'])
  assert.deepEqual(ids('done'), ['hecha', 'hecha-bloqueada'])
})

test('el estado de una fila: lo que espera revisión va como «por revisar», igual que en la barra', () => {
  assert.equal(missionRowStatus({ state: 'in_progress', pendingReviews: 1 }), 'pending_review')
  assert.equal(missionRowStatus({ state: 'expired', pendingReviews: 1 }), 'pending_review')
  assert.equal(missionRowStatus({ state: 'excluded', pendingReviews: 1 }), 'pending_review')
  assert.equal(missionRowStatus({ state: 'completed', pendingReviews: 1 }), 'completed')
  assert.equal(missionRowStatus({ state: 'path_locked', pendingReviews: 0 }), 'path_locked')
  assert.equal(missionRowStatus({ state: 'excluded', pendingReviews: 0 }), null)
})

test('el filtro del historial manda los tipos separados por comas; sin filtro, nada', () => {
  assert.equal(timelineTypeParam('all'), undefined)
  assert.equal(timelineTypeParam('attendance'), 'attendance')
  assert.equal(timelineTypeParam('shop'), 'shop_purchased,shop_item_used')
})

test('la columna de una semana suma entregas, aprobaciones y pistas', () => {
  assert.equal(weekTotal({ submissions: 3, approvals: 2, hintsUsed: 1, missionsCompleted: 9 }), 6)
})

test('un día es ese día en cualquier zona horaria', () => {
  assert.equal(formatDayLong('2026-10-14', 'es'), '14 de octubre de 2026')
  assert.match(formatWeekShort('2026-09-01', 'es'), /^1 sept/)
  assert.match(formatWeekShort('2026-09-01', 'en'), /Sep/)
})

test('daysEndingOn: fechas seguidas, también al cambiar de mes y con el cambio de hora', () => {
  assert.deepEqual(daysEndingOn('2026-11-02', 3), ['2026-10-31', '2026-11-01', '2026-11-02'])
  // El último domingo de octubre tiene 25 horas en Madrid: ni se salta ni se repite.
  assert.deepEqual(daysEndingOn('2026-10-26', 3), ['2026-10-24', '2026-10-25', '2026-10-26'])
  assert.deepEqual(daysEndingOn('2026-03-30', 3), ['2026-03-28', '2026-03-29', '2026-03-30'])
  assert.deepEqual(daysEndingOn('2026-11-02', 0), [])
})

test('cada tipo del historial va con el grupo de su filtro, que da su icono', () => {
  assert.equal(timelineGroup('enigma_submitted'), 'submissions')
  assert.equal(timelineGroup('enigma_completed'), 'approvals')
  assert.equal(timelineGroup('mission_started'), 'missions')
  assert.equal(timelineGroup('hint_used'), 'hints')
  assert.equal(timelineGroup('behavior_applied'), 'behaviors')
  assert.equal(timelineGroup('shop_item_used'), 'shop')
  assert.equal(timelineGroup('level_up'), 'progress')
  assert.equal(timelineGroup('attendance'), 'attendance')
  assert.equal(timelineGroup('class_joined'), 'other')
  assert.equal(timelineGroup(''), 'other')
})
