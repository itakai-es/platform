import { describe, it, expect } from 'vitest'
import { buildClassMatrix, type MatrixData } from '../../src/modules/analytics/class-matrix.js'
import {
  HINTS_IN_MISSION,
  INACTIVE_DAYS,
  LOW_GRADE_PERCENT,
  classSignals,
  panelSignals,
  type MissionSignal,
  type StudentSignal,
} from '../../src/modules/analytics/signals.js'
import { ALL_TIME, type Period } from '../../src/modules/analytics/definitions.js'

/**
 * La matriz y las señales de dificultad (F1), sin base de datos: se construyen
 * con datos ya cargados (`buildClassMatrix`) y se prueba cada regla con su
 * umbral, en los dos lados. Lo mismo, de punta a punta con Postgres, está en
 * tests/modules/analytics.class-matrix.db.test.ts.
 */

const NOW = new Date('2026-10-30T10:00:00Z')
const day = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)

const enigma = (id: string, isOptional = false, orderIndex = 0) => ({
  id,
  title: `Enigma ${id}`,
  isOptional,
  orderIndex,
})

const mission = (id: string, over: Partial<MatrixData['missions'][number]> = {}) => ({
  id,
  title: `Misión ${id}`,
  status: 'activa',
  deadline: null,
  orderIndex: 0,
  enigmas: [enigma(`${id}1`), enigma(`${id}2`)],
  ...over,
})

const enrollment = (studentId: string, over: Partial<MatrixData['enrollments'][number]> = {}) => ({
  id: `en-${studentId}`,
  studentId,
  nickname: null,
  avatarUrl: null,
  enrolledAt: day(60),
  name: studentId,
  accountType: 'self' as const,
  participating: true,
  ...over,
})

function data(over: Partial<MatrixData> = {}): MatrixData {
  return {
    classId: 'clase',
    missionMap: false,
    missions: [mission('A')],
    edges: [],
    enrollments: [enrollment('ana')],
    approvals: [],
    submissions: [],
    progress: [],
    hints: [],
    // Activa ayer: así no sale como inactiva salvo que la prueba lo busque.
    activity: [{ studentId: 'ana', lastAt: day(1) }],
    attendance: [],
    sessions: 0,
    ...over,
  }
}

const approve = (studentId: string, enigmaId: string, percentage = 100, at = day(2)) => ({
  studentId,
  enigmaId,
  percentage,
  approvedAt: at,
})

const hints = (studentId: string, missionId: string, used: number, percent = 0, inPeriod = used, percentInPeriod = percent) => ({
  studentId,
  missionId,
  used,
  percent,
  usedInPeriod: inPeriod,
  percentInPeriod,
  lastAt: day(3),
})

function signalsOf(d: MatrixData, period: Period = ALL_TIME) {
  const matrix = buildClassMatrix(d, period, NOW)
  const result = classSignals(matrix)
  return { matrix, ...result, codes: result.students.map(s => s.code) }
}

const only = <C extends StudentSignal['code']>(list: StudentSignal[], code: C) =>
  list.filter((s): s is Extract<StudentSignal, { code: C }> => s.code === code)
const onlyMission = <C extends MissionSignal['code']>(list: MissionSignal[], code: C) =>
  list.filter((s): s is Extract<MissionSignal, { code: C }> => s.code === code)

describe('la matriz, sin base de datos', () => {
  it('reparte el estado, el progreso y lo pendiente de revisar (sin las atascadas)', () => {
    const { matrix } = signalsOf(
      data({
        missions: [
          mission('A', { enigmas: [enigma('A1'), enigma('A2'), enigma('A3', true)] }),
          mission('B'),
        ],
        approvals: [approve('ana', 'A1'), approve('ana', 'A2'), approve('ana', 'A3')],
        progress: [{ studentId: 'ana', missionId: 'A', completedAt: day(2), hasWork: true }],
        submissions: [
          // Atascada: pendiente de un enigma ya aprobado.
          { studentId: 'ana', enigmaId: 'A1', pending: 1, pendingSince: day(1), lastSubmittedAt: day(1) },
          { studentId: 'ana', enigmaId: 'B1', pending: 1, pendingSince: day(1), lastSubmittedAt: day(1) },
        ],
      })
    )
    const [ana] = matrix.students
    expect(ana!.missions.map(c => c.state)).toEqual(['completed', 'in_progress'])
    expect(ana!.progress).toMatchObject({
      missionsCompleted: 1,
      missionsCounted: 2,
      requiredApproved: 2,
      requiredTotal: 4,
      percent: 50,
      extraApproved: 1,
      extraTotal: 1,
    })
    expect(ana!.pendingReviews).toBe(1)
    expect(ana!.stuckSubmissions).toBe(1)
    expect(ana!.missions[0]!.enigmas[0]).toMatchObject({ approved: true, pendingReview: false, stuck: true })
    expect(ana!.missions[1]!.enigmas[0]).toMatchObject({ approved: false, pendingReview: true, stuck: false })
    expect(matrix.summary).toMatchObject({ pendingReviews: 1, stuckSubmissions: 1, missionsCounted: 2 })
    expect(matrix.missions[0]!.stats.states.completed).toBe(1)
    expect(matrix.missions[1]!.stats.states.in_progress).toBe(1)
  })

  it('las cifras del periodo solo cuentan lo que cae dentro', () => {
    const period = { from: day(7), to: NOW }
    const { matrix } = signalsOf(
      data({
        approvals: [approve('ana', 'A1', 80, day(30)), approve('ana', 'A2', 60, day(2))],
        progress: [{ studentId: 'ana', missionId: 'A', completedAt: day(2), hasWork: true }],
      }),
      period
    )
    expect(matrix.students[0]!.period).toMatchObject({ approvals: 1, approvalAverage: 60, missionsCompleted: 1 })
    expect(matrix.missions[0]!.stats).toMatchObject({ approvalsInPeriod: 1, approvalAverage: 60, completedInPeriod: 1 })
  })
})

describe('señales por estudiante', () => {
  it('misión caducada sin completar, si ya estaba en la clase cuando venció', () => {
    const d = data({
      missions: [mission('A', { deadline: day(5) })],
      enrollments: [enrollment('ana'), enrollment('luis', { enrolledAt: day(2) })],
      activity: [{ studentId: 'ana', lastAt: day(1) }, { studentId: 'luis', lastAt: day(1) }],
    })
    const { students } = signalsOf(d)
    const expired = only(students, 'mission_expired')
    expect(expired.map(s => s.studentId)).toEqual(['ana'])
    expect(expired[0]!.data).toMatchObject({ missionId: 'A', started: false })
    expect(expired[0]!.reason).toContain('caducó sin completar')
    // Fuera del periodo (venció antes de que empezara), no sale.
    expect(only(signalsOf(d, { from: day(3), to: NOW }).students, 'mission_expired')).toEqual([])
  })

  describe('misión caducada con el camino del mapa por medio', () => {
    /** A pide R. A caducó hace 5 días; `required` cambia lo que se quiera de R. */
    const withPath = (over: Partial<MatrixData> = {}, required: Partial<MatrixData['missions'][number]> = {}) =>
      data({
        missionMap: true,
        missions: [mission('R', required), mission('A', { deadline: day(5) })],
        edges: [{ missionId: 'A', requiredMissionId: 'R' }],
        ...over,
      })
    const expired = (d: MatrixData) => only(signalsOf(d).students, 'mission_expired').map(s => s.data.missionId)
    const stateOfA = (d: MatrixData) => signalsOf(d).matrix.students[0]!.missions[1]!.state

    it('no sale a quien nunca pudo abrirla, y la celda dice cerrada, como su mapa', () => {
      const d = withPath()
      expect(expired(d)).toEqual([])
      expect(stateOfA(d)).toBe('path_locked')
    })

    it('sale si la empezó: lo empezado no se cierra', () => {
      const d = withPath({ approvals: [approve('ana', 'A1', 100, day(6))] })
      expect(expired(d)).toEqual(['A'])
    })

    it('no sale a quien entregó y espera revisión: la que tiene que moverse es la otra parte', () => {
      const waiting = withPath({
        missionMap: false,
        submissions: [
          { studentId: 'ana', enigmaId: 'A1', pending: 1, pendingSince: day(6), lastSubmittedAt: day(6) },
        ],
      })
      expect(expired(waiting)).toEqual([])
      expect(stateOfA(waiting)).toBe('expired')
      // Cuando se la revisan y le falta otro, sí.
      const reviewed = withPath({
        missionMap: false,
        approvals: [approve('ana', 'A1', 100, day(6))],
      })
      expect(expired(reviewed)).toEqual(['A'])
    })

    it('sale con el mapa apagado: sin mapa no hay camino', () => {
      expect(expired(withPath({ missionMap: false }))).toEqual(['A'])
    })

    it('sale si completó el requisito antes de la fecha: pudo abrirla', () => {
      const d = withPath({
        approvals: [approve('ana', 'R1', 100, day(8)), approve('ana', 'R2', 100, day(8))],
        progress: [{ studentId: 'ana', missionId: 'R', completedAt: day(8), hasWork: true }],
      })
      expect(expired(d)).toEqual(['A'])
    })

    it('no sale si completó el requisito después de la fecha: no le dio tiempo a abrirla', () => {
      const d = withPath({
        approvals: [approve('ana', 'R1', 100, day(2)), approve('ana', 'R2', 100, day(2))],
        progress: [{ studentId: 'ana', missionId: 'R', completedAt: day(2), hasWork: true }],
      })
      expect(expired(d)).toEqual([])
    })

    it('sale si el requisito caducó antes: ya no se la cerraba', () => {
      expect(expired(withPath({}, { deadline: day(9) }))).toEqual(['R', 'A'])
    })

    it('no sale si el requisito caducó después: hasta su fecha se la cerraba', () => {
      expect(expired(withPath({}, { deadline: day(2) }))).toEqual(['R'])
    })
  })

  it(`un enigma aprobado por debajo del ${LOW_GRADE_PERCENT} %, y el ${LOW_GRADE_PERCENT} justo no`, () => {
    const { students } = signalsOf(
      data({ approvals: [approve('ana', 'A1', 49), approve('ana', 'A2', 50)] })
    )
    const low = only(students, 'low_grade')
    expect(low).toHaveLength(1)
    expect(low[0]!.data).toMatchObject({ enigmaId: 'A1', percentage: 49, threshold: 50 })
  })

  it('media de aprobación por debajo del 60 % en el periodo, con al menos dos aprobaciones', () => {
    // 55 y 60: media 58, por debajo del 60.
    expect(only(signalsOf(data({ approvals: [approve('ana', 'A1', 55), approve('ana', 'A2', 60)] })).students, 'low_average')[0]?.data).toEqual({
      average: 58,
      approvals: 2,
      threshold: 60,
    })
    // 59 y 61: media 60, ya no.
    expect(only(signalsOf(data({ approvals: [approve('ana', 'A1', 59), approve('ana', 'A2', 61)] })).students, 'low_average')).toEqual([])
    // Una sola aprobación no hace media (si es baja, ya sale como low_grade).
    expect(only(signalsOf(data({ approvals: [approve('ana', 'A1', 55)] })).students, 'low_average')).toEqual([])
    // Una de las dos, fuera del periodo: tampoco.
    const period = { from: day(7), to: NOW }
    expect(
      only(signalsOf(data({ approvals: [approve('ana', 'A1', 55, day(30)), approve('ana', 'A2', 55)] }), period).students, 'low_average')
    ).toEqual([])
  })

  it(`${HINTS_IN_MISSION} o más pistas en una misión, o cualquier pista de %`, () => {
    expect(only(signalsOf(data({ hints: [hints('ana', 'A', 1)] })).students, 'hints')).toEqual([])
    expect(only(signalsOf(data({ hints: [hints('ana', 'A', 2)] })).students, 'hints')[0]?.data).toMatchObject({
      hints: 2,
      percentHints: 0,
    })
    expect(only(signalsOf(data({ hints: [hints('ana', 'A', 1, 1)] })).students, 'hints')[0]?.data).toMatchObject({
      hints: 1,
      percentHints: 1,
    })
    // Usadas antes del periodo: no cuentan.
    expect(only(signalsOf(data({ hints: [hints('ana', 'A', 3, 1, 0, 0)] })).students, 'hints')).toEqual([])
  })

  it(`sin actividad en ${INACTIVE_DAYS} días, solo con misiones abiertas`, () => {
    const idle = signalsOf(data({ activity: [{ studentId: 'ana', lastAt: day(14) }] }))
    expect(only(idle.students, 'inactive')[0]?.data).toMatchObject({ days: 14, openMissions: 1 })
    expect(only(signalsOf(data({ activity: [{ studentId: 'ana', lastAt: day(13) }] })).students, 'inactive')).toEqual([])
    // Sin nada abierto (la única, completada), no.
    expect(
      only(
        signalsOf(
          data({
            activity: [{ studentId: 'ana', lastAt: day(30) }],
            approvals: [approve('ana', 'A1', 100, day(30)), approve('ana', 'A2', 100, day(30))],
            progress: [{ studentId: 'ana', missionId: 'A', completedAt: day(30), hasWork: true }],
          })
        ).students,
        'inactive'
      )
    ).toEqual([])
    // Sin ninguna actividad, cuenta desde que entró en la clase.
    const never = signalsOf(data({ activity: [], enrollments: [enrollment('ana', { enrolledAt: day(20) })] }))
    expect(only(never.students, 'inactive')[0]?.data).toMatchObject({ lastActivityAt: null, days: 20 })
    const recent = signalsOf(data({ activity: [], enrollments: [enrollment('ana', { enrolledAt: day(3) })] }))
    expect(only(recent.students, 'inactive')).toEqual([])
  })

  it('asistencia por debajo del 80 %, solo si se ha pasado lista', () => {
    const att = (attended: number, total: number) =>
      signalsOf(data({ attendance: [{ enrollmentId: 'en-ana', attended, total }], sessions: total }))
    expect(only(att(3, 4).students, 'low_attendance')[0]?.data).toEqual({
      rate: 75,
      attended: 3,
      total: 4,
      threshold: 80,
    })
    expect(only(att(4, 5).students, 'low_attendance')).toEqual([])
    // Sin lista no hay dato, y no se lee como «presente» ni como «ausente».
    expect(only(signalsOf(data()).students, 'low_attendance')).toEqual([])
    expect(signalsOf(data()).matrix.students[0]!.attendance).toBeNull()
  })

  it('las entregas sin revisar no son una señal', () => {
    const { students, matrix } = signalsOf(
      data({
        submissions: [{ studentId: 'ana', enigmaId: 'A1', pending: 1, pendingSince: day(30), lastSubmittedAt: day(30) }],
        activity: [{ studentId: 'ana', lastAt: day(1) }],
      })
    )
    expect(students).toEqual([])
    expect(matrix.students[0]!.pendingReviews).toBe(1)
  })

  it('salen en un orden fijo: caducadas, notas, media, pistas, inactividad, asistencia', () => {
    const { codes } = signalsOf(
      data({
        missions: [mission('A', { deadline: day(5) }), mission('B')],
        approvals: [approve('ana', 'A1', 30), approve('ana', 'B1', 40)],
        // Las pistas también son actividad: de hace tanto como el muro.
        hints: [{ ...hints('ana', 'B', 2), lastAt: day(20) }],
        activity: [{ studentId: 'ana', lastAt: day(20) }],
        attendance: [{ enrollmentId: 'en-ana', attended: 0, total: 2 }],
      })
    )
    expect(codes).toEqual([
      'mission_expired',
      'low_grade',
      'low_grade',
      'low_average',
      'hints',
      'inactive',
      'low_attendance',
    ])
  })
})

describe('señales por misión', () => {
  const four = ['ana', 'bea', 'carla', 'dani']
  const people = four.map(id => enrollment(id))
  const active = four.map(id => ({ studentId: id, lastAt: day(1) }))

  it('tras la fecha, el 30 % o más de quien la empezó sin completarla', () => {
    const base = {
      missions: [mission('A', { deadline: day(2) })],
      enrollments: people,
      activity: active,
    }
    // Tres la empezaron (una entrega cada uno), una de ellas la completó: 2 de 3.
    const started = (ids: string[]) =>
      ids.map(id => ({ studentId: id, enigmaId: 'A1', pending: 0, pendingSince: null, lastSubmittedAt: day(4) }))
    const unfinished = signalsOf(
      data({
        ...base,
        submissions: started(['ana', 'bea', 'carla']),
        progress: [{ studentId: 'ana', missionId: 'A', completedAt: day(3), hasWork: true }],
      })
    )
    expect(onlyMission(unfinished.missions, 'unfinished_after_deadline')[0]?.data).toMatchObject({
      started: 3,
      unfinished: 2,
      percent: 67,
    })
    // Quien entregó y espera revisión no entra en la cuenta, ni arriba ni abajo: de
    // tres que la empezaron, una la completó y otra espera. Queda una de dos.
    const waiting = signalsOf(
      data({
        ...base,
        submissions: [
          ...started(['ana', 'carla']),
          { studentId: 'bea', enigmaId: 'A1', pending: 1, pendingSince: day(4), lastSubmittedAt: day(4) },
        ],
        progress: [{ studentId: 'ana', missionId: 'A', completedAt: day(3), hasWork: true }],
      })
    )
    expect(onlyMission(waiting.missions, 'unfinished_after_deadline')[0]?.data).toMatchObject({
      started: 2,
      unfinished: 1,
      percent: 50,
    })
    // Tres de cuatro que la completaron: 25 %, no sale.
    const mostly = signalsOf(
      data({
        ...base,
        submissions: started(four),
        progress: ['ana', 'bea', 'carla'].map(id => ({ studentId: id, missionId: 'A', completedAt: day(3), hasWork: true })),
      })
    )
    expect(onlyMission(mostly.missions, 'unfinished_after_deadline')).toEqual([])
    // Antes de la fecha no se mira.
    const open = signalsOf(data({ ...base, missions: [mission('A', { deadline: day(-2) })], submissions: started(['ana']) }))
    expect(onlyMission(open.missions, 'unfinished_after_deadline')).toEqual([])
  })

  it('% medio de aprobación bajo, con al menos tres aprobaciones', () => {
    const low = signalsOf(
      data({
        enrollments: people,
        activity: active,
        approvals: [approve('ana', 'A1', 50), approve('bea', 'A1', 50), approve('carla', 'A1', 70)],
      })
    )
    expect(onlyMission(low.missions, 'low_average')[0]?.data).toEqual({ average: 57, approvals: 3, threshold: 60 })
    const few = signalsOf(
      data({ enrollments: people, activity: active, approvals: [approve('ana', 'A1', 20), approve('bea', 'A1', 20)] })
    )
    expect(onlyMission(few.missions, 'low_average')).toEqual([])
  })

  it('muchas pistas por estudiante que la empezó', () => {
    const many = signalsOf(
      data({ enrollments: people, activity: active, hints: [hints('ana', 'A', 3), hints('bea', 'A', 1)] })
    )
    expect(onlyMission(many.missions, 'many_hints')[0]?.data).toEqual({ hints: 4, students: 2, perStudent: 2 })
    const few = signalsOf(
      data({ enrollments: people, activity: active, hints: [hints('ana', 'A', 2), hints('bea', 'A', 1)] })
    )
    expect(onlyMission(few.missions, 'many_hints')).toEqual([])
  })
})

describe('las señales en el panel de la clase', () => {
  const expiredClass = (over: Partial<MatrixData> = {}) =>
    data({
      missions: [mission('A', { deadline: day(5) }), mission('B', { deadline: day(2) })],
      enrollments: [enrollment('ana'), enrollment('bea'), enrollment('carla')],
      activity: ['ana', 'bea', 'carla'].map(studentId => ({ studentId, lastAt: day(1) })),
      ...over,
    })
  const panelOf = (d: MatrixData) => {
    const { matrix } = signalsOf(d)
    return { signals: classSignals(matrix), panel: panelSignals(classSignals(matrix)) }
  }

  it('la misma misión caducada es una señal de misión, con cuántas personas', () => {
    const { signals, panel } = panelOf(expiredClass())
    expect(signals.students.filter(s => s.code === 'mission_expired')).toHaveLength(6)
    expect(panel.students.filter(s => s.code === 'mission_expired')).toEqual([])
    expect(panel.missions.map(s => [s.missionId, s.code, s.data])).toEqual([
      ['A', 'students_expired', { deadline: day(5), count: 3 }],
      ['B', 'students_expired', { deadline: day(2), count: 3 }],
    ])
    expect(panel.missions[0]!.reason).toContain('3 estudiantes')
    expect(panel.missions[0]!.missionTitle).toBe('Misión A')
  })

  it('con una sola persona, también junta, y en singular', () => {
    const { panel } = panelOf(
      expiredClass({
        missions: [mission('A', { deadline: day(5) })],
        progress: ['ana', 'bea'].map(id => ({ studentId: id, missionId: 'A', completedAt: day(6), hasWork: true })),
      })
    )
    expect(panel.missions.map(s => [s.code, s.data])).toEqual([
      ['students_expired', { deadline: day(5), count: 1 }],
    ])
    expect(panel.missions[0]!.reason).toContain('1 estudiante no')
  })

  it('cubre a `unfinished_after_deadline` de esa misión; la de otra misión se queda', () => {
    const started = (id: string, enigmaId: string) => ({
      studentId: id,
      enigmaId,
      pending: 0,
      pendingSince: null,
      lastSubmittedAt: day(6),
    })
    // A: Ana y Bea la empezaron y no la completaron. B: Carla llegó después de la
    // fecha, así que no hay señal de persona, pero la empezó.
    const { signals, panel } = panelOf(
      expiredClass({
        missions: [mission('A', { deadline: day(5) }), mission('B', { deadline: day(40) })],
        enrollments: [
          enrollment('ana', { enrolledAt: day(50) }),
          enrollment('bea', { enrolledAt: day(50) }),
          enrollment('carla', { enrolledAt: day(10) }),
        ],
        submissions: [started('ana', 'A1'), started('bea', 'A1'), started('carla', 'B1')],
        progress: [
          { studentId: 'ana', missionId: 'B', completedAt: day(45), hasWork: true },
          { studentId: 'bea', missionId: 'B', completedAt: day(45), hasWork: true },
        ],
      }),
    )
    expect(signals.missions.map(s => [s.missionId, s.code])).toEqual([
      ['A', 'unfinished_after_deadline'],
      ['B', 'unfinished_after_deadline'],
    ])
    expect(panel.missions.map(s => [s.missionId, s.code])).toEqual([
      ['A', 'students_expired'],
      ['B', 'unfinished_after_deadline'],
    ])
  })

  it('sin caducadas, no cambia nada', () => {
    const d = data()
    const { signals, panel } = panelOf(d)
    expect(panel).toEqual(signals)
  })
})
