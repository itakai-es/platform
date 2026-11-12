import { describe, it, expect } from 'vitest'
import {
  attendanceRate,
  countsForProgress,
  daysSince,
  enigmaTally,
  groupAverages,
  hasStarted,
  inPeriod,
  isOpen,
  latest,
  madridDay,
  madridMidnight,
  madridWeekStart,
  missionCellState,
  missionExclusion,
  pathLocksFor,
  periodFromPreset,
  reviewablePending,
  roundedAverage,
  studentProgress,
  weeksBetween,
  type MissionCellState,
  type MissionShape,
  type RequirementMission,
  completionDate,
  isCompleted,
} from '../../src/modules/analytics/definitions.js'

/**
 * Las definiciones de la analítica (F1), sin base de datos: completada,
 * cuáles cuentan, progreso, lo pendiente, el camino en memoria y las semanas
 * de Madrid. Lo que pasa con datos de verdad lo prueba
 * tests/modules/analytics.class-matrix.db.test.ts.
 */

const NOW = new Date('2026-10-30T10:00:00Z')
const PAST = new Date('2026-10-20T10:00:00Z')
const FUTURE = new Date('2026-11-20T10:00:00Z')

const mission = (over: Partial<MissionShape> = {}): MissionShape => ({
  id: 'm',
  status: 'activa',
  deadline: null,
  enigmas: [
    { id: 'e1', isOptional: false },
    { id: 'e2', isOptional: false },
    { id: 'o1', isOptional: true },
  ],
  ...over,
})

describe('semanas y días de Madrid', () => {
  it('el día local, también cuando en UTC aún es el anterior', () => {
    // Verano (UTC+2): las 22:30 UTC son las 00:30 del día siguiente.
    expect(madridDay(new Date('2026-06-30T22:30:00Z'))).toBe('2026-07-01')
    // Invierno (UTC+1): las 22:30 UTC son las 23:30 del mismo día.
    expect(madridDay(new Date('2026-12-01T22:30:00Z'))).toBe('2026-12-01')
  })

  it('las semanas van de lunes a domingo, en hora de Madrid', () => {
    // Domingo 25 de octubre (el día del cambio de hora), a las 23:30 de allí.
    expect(madridWeekStart(new Date('2026-10-25T22:30:00Z'))).toBe('2026-10-19')
    // Media hora después ya es lunes 26 en Madrid, aunque en UTC sea domingo.
    expect(madridWeekStart(new Date('2026-10-25T23:30:00Z'))).toBe('2026-10-26')
    expect(madridWeekStart(new Date('2026-10-30T10:00:00Z'))).toBe('2026-10-26')
  })

  it('la medianoche de Madrid, con el desfase de cada época del año', () => {
    expect(madridMidnight('2026-07-01').toISOString()).toBe('2026-06-30T22:00:00.000Z')
    expect(madridMidnight('2026-12-01').toISOString()).toBe('2026-11-30T23:00:00.000Z')
    // Los días del cambio de hora: a medianoche aún rige el horario de antes.
    expect(madridMidnight('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z')
    expect(madridMidnight('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z')
  })

  it('todas las semanas de un rango, con las dos puntas', () => {
    expect(weeksBetween(new Date('2026-10-14T10:00:00Z'), NOW)).toEqual([
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ])
    expect(weeksBetween(NOW, NOW)).toEqual(['2026-10-26'])
    expect(weeksBetween(NOW, PAST)).toEqual([])
  })

  it('«este curso» empieza el 1 de septiembre en Madrid; 30 y 7 días, contando hacia atrás', () => {
    expect(periodFromPreset('course', NOW)).toEqual({
      from: new Date('2026-08-31T22:00:00Z'),
      to: NOW,
    })
    // En febrero, el curso es el que empezó el septiembre anterior.
    const feb = new Date('2027-02-10T10:00:00Z')
    expect(periodFromPreset('course', feb).from).toEqual(new Date('2026-08-31T22:00:00Z'))
    expect(periodFromPreset('last7', NOW).from).toEqual(new Date('2026-10-23T10:00:00Z'))
    expect(periodFromPreset('last30', NOW).from).toEqual(new Date('2026-09-30T10:00:00Z'))
  })

  it('un periodo incluye sus dos extremos, y sin límites lo incluye todo', () => {
    const period = { from: PAST, to: NOW }
    expect(inPeriod(PAST, period)).toBe(true)
    expect(inPeriod(NOW, period)).toBe(true)
    expect(inPeriod(FUTURE, period)).toBe(false)
    expect(inPeriod(null, period)).toBe(false)
    expect(inPeriod(new Date(0), { from: null, to: null })).toBe(true)
  })

  it('días enteros desde una fecha, nunca negativos', () => {
    expect(daysSince(new Date('2026-10-16T10:00:00Z'), NOW)).toBe(14)
    expect(daysSince(new Date('2026-10-16T10:00:01Z'), NOW)).toBe(13)
    expect(daysSince(FUTURE, NOW)).toBe(0)
  })
})

describe('qué misiones cuentan', () => {
  it('cuentan las que tienen enigmas y no están bloqueadas a mano', () => {
    expect(missionExclusion(mission())).toBeNull()
    expect(countsForProgress(mission())).toBe(true)
    expect(missionExclusion(mission({ status: 'bloqueada' }))).toBe('teacher_locked')
    expect(missionExclusion(mission({ enigmas: [] }))).toBe('no_enigmas')
    // La caducada sigue contando: es pendiente («caducada sin terminar»).
    expect(countsForProgress(mission({ deadline: PAST }))).toBe(true)
  })
})

describe('el estado de un estudiante en una misión', () => {
  const facts = (over: Partial<{ completed: boolean; started: boolean; pathLocked: boolean }> = {}) => ({
    completed: false,
    started: false,
    pathLocked: false,
    ...over,
  })

  it('completada va por encima de todo lo demás', () => {
    expect(missionCellState(mission({ deadline: PAST }), facts({ completed: true }), NOW)).toBe(
      'completed'
    )
    expect(
      missionCellState(mission({ status: 'bloqueada' }), facts({ completed: true }), NOW)
    ).toBe('completed')
  })

  it('lo no completado de una misión que no cuenta no es pendiente', () => {
    expect(missionCellState(mission({ status: 'bloqueada' }), facts({ started: true }), NOW)).toBe(
      'excluded'
    )
    expect(missionCellState(mission({ enigmas: [] }), facts(), NOW)).toBe('excluded')
  })

  it('lo pendiente, por prioridad: cerrada por el camino, caducada, en curso, sin empezar', () => {
    expect(missionCellState(mission({ deadline: PAST }), facts({ started: true }), NOW)).toBe('expired')
    expect(missionCellState(mission({ deadline: PAST }), facts({ pathLocked: true }), NOW)).toBe(
      'path_locked'
    )
    expect(missionCellState(mission({ deadline: FUTURE }), facts({ pathLocked: true }), NOW)).toBe(
      'path_locked'
    )
    expect(missionCellState(mission(), facts({ started: true }), NOW)).toBe('in_progress')
    expect(missionCellState(mission(), facts(), NOW)).toBe('not_started')
    expect(isOpen('in_progress')).toBe(true)
    expect(isOpen('not_started')).toBe(true)
    expect(isOpen('expired')).toBe(false)
    expect(isOpen('path_locked')).toBe(false)
  })

  it('empezar es trabajo de verdad (la regla del camino)', () => {
    const none = { submitted: false, approved: false, hinted: false, progressWithWork: false }
    expect(hasStarted(none)).toBe(false)
    expect(hasStarted({ ...none, submitted: true })).toBe(true)
    expect(hasStarted({ ...none, approved: true })).toBe(true)
    expect(hasStarted({ ...none, hinted: true })).toBe(true)
    expect(hasStarted({ ...none, progressWithWork: true })).toBe(true)
  })

  it('obligatorios y opcionales van por separado; el % es solo de obligatorios', () => {
    expect(enigmaTally(mission().enigmas, new Set(['e1', 'o1']))).toEqual({
      required: { total: 2, approved: 1 },
      optional: { total: 1, approved: 1 },
      percent: 50,
    })
    // Solo opcionales: sin % (no hay obligatorios que medir).
    expect(enigmaTally([{ id: 'o', isOptional: true }], new Set(['o'])).percent).toBeNull()
  })

  it('una entrega pendiente de un enigma ya aprobado está atascada: no se revisa', () => {
    expect(reviewablePending(1, false)).toBe(1)
    expect(reviewablePending(1, true)).toBe(0)
  })
})

describe('el progreso de un estudiante en la clase', () => {
  const cell = (
    state: MissionCellState,
    counted: boolean,
    approved: string[],
    m: MissionShape = mission()
  ) => ({ state, counted, completedAt: null, tally: enigmaTally(m.enigmas, new Set(approved)) })

  it('«X de N» y el % solo con las misiones que cuentan; los opcionales, como extra', () => {
    const progress = studentProgress([
      cell('completed', true, ['e1', 'e2']),
      cell('in_progress', true, ['e1', 'o1']),
      cell('expired', true, []),
      cell('path_locked', true, []),
      cell('not_started', true, []),
      // Bloqueada a mano: aunque la completara antes, no entra en X ni en N.
      cell('completed', false, ['e1', 'e2', 'o1']),
    ])
    expect(progress).toEqual({
      missionsCompleted: 1,
      missionsCounted: 5,
      requiredApproved: 3,
      requiredTotal: 10,
      percent: 30,
      extraApproved: 1,
      extraTotal: 5,
      pending: { in_progress: 1, not_started: 1, expired: 1, path_locked: 1 },
    })
  })

  it('sin misiones que cuenten: 0 de 0 y sin %', () => {
    const progress = studentProgress([cell('excluded', false, [])])
    expect(progress.missionsCounted).toBe(0)
    expect(progress.percent).toBeNull()
  })

  it('las medias del grupo: misiones con un decimal y % redondeado; sin nadie, null', () => {
    const a = studentProgress([cell('completed', true, ['e1', 'e2']), cell('not_started', true, [])])
    const b = studentProgress([cell('in_progress', true, ['e1']), cell('not_started', true, [])])
    const c = studentProgress([cell('completed', true, ['e1', 'e2']), cell('completed', true, ['e1', 'e2'])])
    expect(groupAverages([a, b, c])).toEqual({ missionsCompleted: 1, percent: 58 })
    expect(groupAverages([a, b])).toEqual({ missionsCompleted: 0.5, percent: 38 })
    expect(groupAverages([])).toEqual({ missionsCompleted: null, percent: null })
  })
})

describe('el camino, en memoria', () => {
  const req = (id: string, over: Partial<RequirementMission> = {}): RequirementMission => ({
    id,
    deadline: null,
    enigmas: [{ id: `${id}-1`, isOptional: false }],
    ...over,
  })
  const edges = [
    { missionId: 'B', requiredMissionId: 'A' },
    { missionId: 'C', requiredMissionId: 'A' },
    { missionId: 'C', requiredMissionId: 'B' },
  ]
  const student = (over: { completed?: string[]; approved?: string[]; started?: string[] } = {}) => ({
    completed: (id: string) => (over.completed ?? []).includes(id),
    approved: new Set(over.approved ?? []),
    started: (id: string) => (over.started ?? []).includes(id),
  })

  it('cierra lo que pide un requisito sin completar, con lo que falta', () => {
    const requirements = new Map([['A', req('A')], ['B', req('B')]])
    const locks = pathLocksFor(edges, requirements, student(), NOW)
    expect(Object.fromEntries(locks)).toEqual({ B: ['A'], C: ['A', 'B'] })
  })

  it('no cierra si el requisito está completado, o tiene sus obligatorios aprobados', () => {
    const requirements = new Map([['A', req('A')], ['B', req('B')]])
    expect(Object.fromEntries(pathLocksFor(edges, requirements, student({ completed: ['A'] }), NOW))).toEqual({
      C: ['B'],
    })
    expect(
      Object.fromEntries(pathLocksFor(edges, requirements, student({ approved: ['A-1', 'B-1'] }), NOW))
    ).toEqual({})
  })

  it('un requisito imposible (caducado o sin enigmas) no cierra', () => {
    const requirements = new Map([
      ['A', req('A', { deadline: PAST })],
      ['B', req('B', { enigmas: [] })],
    ])
    expect(pathLocksFor(edges, requirements, student(), NOW).size).toBe(0)
  })

  it('lo empezado no se cierra', () => {
    const requirements = new Map([['A', req('A')], ['B', req('B')]])
    expect(Object.fromEntries(pathLocksFor(edges, requirements, student({ started: ['B'] }), NOW))).toEqual({
      C: ['A', 'B'],
    })
  })
})

describe('asistencia y utilidades', () => {
  it('asistencia: presente o con retraso sobre las sesiones; sin sesiones, null', () => {
    expect(attendanceRate({ attended: 2, total: 3 })).toBe(67)
    expect(attendanceRate({ attended: 0, total: 0 })).toBeNull()
  })

  it('media redondeada y la fecha más reciente', () => {
    expect(roundedAverage([40, 55])).toBe(48)
    expect(roundedAverage([])).toBeNull()
    expect(latest(null, PAST, undefined, NOW)).toEqual(NOW)
    expect(latest(null, undefined)).toBeNull()
  })
})

describe('completada: `completedAt` o todos los obligatorios aprobados', () => {
  const shapes = [
    { id: 'a', isOptional: false },
    { id: 'b', isOptional: false },
    { id: 'o', isOptional: true },
  ]
  const onlyOptional = [
    { id: 'x', isOptional: true },
    { id: 'y', isOptional: true },
  ]
  const at = (day: number) => new Date(Date.UTC(2026, 9, day))

  it('con `completedAt` lo está, apruebe lo que apruebe', () => {
    expect(isCompleted(at(1), shapes, new Set())).toBe(true)
    expect(isCompleted(at(1), [], new Set())).toBe(true)
  })

  it('sin él, con todos los obligatorios aprobados; los opcionales no cuentan', () => {
    expect(isCompleted(null, shapes, new Set(['a']))).toBe(false)
    expect(isCompleted(null, shapes, new Set(['a', 'o']))).toBe(false)
    expect(isCompleted(null, shapes, new Set(['a', 'b']))).toBe(true)
    expect(isCompleted(undefined, shapes, new Set(['a', 'b', 'o']))).toBe(true)
  })

  it('solo de opcionales, con uno; sin enigmas, nunca', () => {
    expect(isCompleted(null, onlyOptional, new Set())).toBe(false)
    expect(isCompleted(null, onlyOptional, new Set(['y']))).toBe(true)
    expect(isCompleted(null, [], new Set())).toBe(false)
  })

  it('la fecha es `completedAt`, aunque haya aprobaciones de otro día', () => {
    expect(completionDate(at(5), shapes, new Map([['a', at(9)], ['b', at(9)]]))).toEqual(at(5))
  })

  it('sin él, la aprobación que la completó: la última de los obligatorios', () => {
    const approved = new Map([['a', at(3)], ['b', at(7)], ['o', at(20)]])
    expect(completionDate(null, shapes, approved)).toEqual(at(7))
  })

  it('solo de opcionales, la primera: con una bastaba', () => {
    expect(completionDate(null, onlyOptional, new Map([['x', at(8)], ['y', at(4)]]))).toEqual(at(4))
  })

  it('sin completar, null', () => {
    expect(completionDate(null, shapes, new Map([['a', at(3)]]))).toBeNull()
    expect(completionDate(null, [], new Map())).toBeNull()
  })
})
