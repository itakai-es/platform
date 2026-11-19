import { it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'

/**
 * La matriz de la clase, las señales y la actividad por semanas (F1), contra
 * Postgres, con una clase sembrada con todos los casos: opcionales, una misión
 * bloqueada a mano, una sin enigmas, una caducada, una cerrada por el camino
 * (con el mapa encendido), una solo de opcionales, una que llegó de otra clase
 * con progreso de su alumnado de antes, la vista previa del profesorado, una
 * cuenta sin estrenar, una entrega atascada y una pista de %.
 *
 * Comprueba además que el cierre del camino da lo mismo que la función del camino
 * (`locksFromEdges`), que es la que usa el alumnado.
 *
 * Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

import { prisma } from '../../src/config/database.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { classPathEdges, locksFromEdges } from '../../src/utils/mission-path.js'
import { classMatrix, type ClassMatrix } from '../../src/modules/analytics/class-matrix.js'
import { classSignals } from '../../src/modules/analytics/signals.js'
import { classActivityByWeek } from '../../src/modules/analytics/weekly.js'
import { madridMidnight } from '../../src/modules/analytics/definitions.js'

const NOW = new Date()
const ago = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)

describeWithDatabase('analítica: la matriz de una clase con todos los casos', () => {
  const tag = randomUUID().slice(0, 8)
  const userIds: string[] = []
  const classIds: string[] = []
  const ids = {} as Record<string, string>
  let matrix: ClassMatrix

  const newUser = async (label: string, role: 'teacher' | 'student', managed = false) => {
    const user = await prisma.user.create({
      data: managed
        ? { username: `${label}-${tag}`, accountType: 'managed', passwordHash: 'x', name: label, role }
        : { email: `${label}.${tag}@test.invalid`, passwordHash: 'x', name: label, role, isOnboarded: true },
    })
    userIds.push(user.id)
    ids[label] = user.id
    return user.id
  }

  const newClass = async (name: string, ownerId: string, settings: object = {}) => {
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `${name} ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase(), settings },
        ownerId
      )
    )
    classIds.push(cls.id)
    return cls.id
  }

  let order = 0
  const newMission = async (
    classId: string,
    label: string,
    enigmas: { label: string; optional?: boolean }[],
    data: { status?: 'activa' | 'bloqueada'; deadline?: Date } = {}
  ) => {
    const mission = await prisma.mission.create({
      data: { classId, title: label, orderIndex: order++, ...data },
    })
    ids[label] = mission.id
    for (const [index, e] of enigmas.entries()) {
      const enigma = await prisma.missionEnigma.create({
        data: { missionId: mission.id, title: e.label, isOptional: e.optional ?? false, orderIndex: index, xpReward: 10 },
      })
      ids[e.label] = enigma.id
    }
    return mission.id
  }

  const approve = (student: string, enigma: string, percentage: number, at: Date = ago(5)) =>
    prisma.studentEnigmaProgress.create({
      data: {
        studentId: ids[student]!,
        enigmaId: ids[enigma]!,
        percentage,
        completedAt: at,
        xpEarned: Math.round((10 * percentage) / 100),
      },
    })
  const submit = (student: string, enigma: string, at: Date, status: 'pendiente' | 'aprobada' = 'pendiente') =>
    prisma.enigmaSubmission.create({
      data: { studentId: ids[student]!, enigmaId: ids[enigma]!, submittedAt: at, status },
    })
  const complete = (student: string, mission: string, at: Date, enigmasCompleted = 1) =>
    prisma.studentMissionProgress.create({
      data: { studentId: ids[student]!, missionId: ids[mission]!, completedAt: at, enigmasCompleted, progress: 100 },
    })

  beforeAll(async () => {
    const teacher = await newUser('profe', 'teacher')
    const otherTeacher = await newUser('profe-b', 'teacher')
    const classId = await newClass('Analítica', teacher, { missionMap: true })
    const otherClassId = await newClass('La de antes', otherTeacher)
    ids.class = classId

    // Alumnado: tres con cuenta propia, una gestionada que no ha entrado nunca,
    // uno solo de la otra clase y la vista previa del profesorado.
    for (const name of ['ana', 'bea', 'dani']) await newUser(name, 'student')
    await newUser('carla', 'student', true)
    await newUser('fuera', 'student')
    for (const name of ['ana', 'bea', 'carla', 'dani']) {
      await prisma.classEnrollment.create({
        data: { classId, studentId: ids[name]!, enrolledAt: ago(30) },
      })
    }
    await prisma.classEnrollment.create({ data: { classId: otherClassId, studentId: ids.fuera! } })
    await prisma.classEnrollment.create({ data: { classId, studentId: teacher, isPreview: true } })

    // Misiones, en el orden de la clase.
    await newMission(classId, 'M1 normal', [{ label: 'm1e1' }, { label: 'm1e2' }, { label: 'm1o', optional: true }])
    await newMission(classId, 'M2 pistas', [{ label: 'm2e1' }, { label: 'm2e2' }])
    await newMission(classId, 'M3 bloqueada', [{ label: 'm3e1' }], { status: 'bloqueada' })
    await newMission(classId, 'M4 sin enigmas', [])
    await newMission(classId, 'M5 caducada', [{ label: 'm5e1' }], { deadline: ago(3) })
    await newMission(classId, 'M6 camino', [{ label: 'm6e1' }])
    await newMission(classId, 'M7 movida', [{ label: 'm7e1' }])
    await newMission(classId, 'M8 opcionales', [{ label: 'm8o', optional: true }])
    // M6 pide M1 (el mapa está encendido).
    await prisma.missionPrerequisite.create({
      data: { missionId: ids['M6 camino']!, requiredMissionId: ids['M1 normal']! },
    })
    const coinHint = await prisma.missionHint.create({
      data: { missionId: ids['M2 pistas']!, content: 'Mira', costType: 'coins', cost: 5, orderIndex: 0 },
    })
    const percentHint = await prisma.missionHint.create({
      data: { missionId: ids['M2 pistas']!, content: 'Más', costType: 'percent', cost: 20, orderIndex: 1 },
    })

    // Ana: completa M1 (con el opcional), M5 antes de la fecha, M8 y la que luego se bloqueó.
    await approve('ana', 'm1e1', 100, new Date('2026-09-06T22:30:00Z'))
    await approve('ana', 'm1e2', 90)
    await approve('ana', 'm1o', 80)
    await complete('ana', 'M1 normal', ago(5), 3)
    await approve('ana', 'm5e1', 100, ago(4))
    await complete('ana', 'M5 caducada', ago(4))
    await approve('ana', 'm8o', 100)
    await complete('ana', 'M8 opcionales', ago(5))
    await approve('ana', 'm3e1', 100, ago(20))
    await complete('ana', 'M3 bloqueada', ago(20))
    await prisma.activity.create({
      data: { userId: ids.ana!, classId, type: 'enigma_submitted', description: 'x', createdAt: ago(2) },
    })

    // Bea: un enigma de M1 al 40 %, uno de M2 al 55 %, dos pistas en M2 (una
    // de %), una entrega de M5 sin revisar (antes de que caducara) y poca asistencia.
    await approve('bea', 'm1e1', 40, ago(6))
    await approve('bea', 'm2e1', 55, ago(6))
    for (const hint of [coinHint, percentHint]) {
      await prisma.missionHintUse.create({
        data: {
          hintId: hint.id,
          missionId: ids['M2 pistas']!,
          studentId: ids.bea!,
          costType: hint.costType,
          cost: hint.cost,
          createdAt: ago(5),
        },
      })
    }
    await submit('bea', 'm5e1', ago(4))

    // Dani: aprobado en M2 hace 20 días y otra entrega del mismo enigma
    // (atascada); nada más desde entonces. Un comportamiento a su favor.
    await approve('dani', 'm2e1', 100, ago(20))
    await submit('dani', 'm2e1', ago(21), 'aprobada')
    await submit('dani', 'm2e1', ago(20))
    await prisma.activity.create({
      data: { userId: ids.dani!, classId, type: 'enigma_submitted', description: 'x', createdAt: ago(20) },
    })
    // Lo que hace el profesorado no es actividad del estudiante.
    await prisma.activity.create({
      data: { userId: ids.dani!, classId, type: 'behavior_applied', description: 'x', createdAt: ago(1) },
    })
    await prisma.behaviorApplication.create({
      data: {
        classId,
        studentId: ids.dani!,
        teacherId: teacher,
        kind: 'positive',
        name: 'Participa',
        xpDelta: 5,
        coinDelta: 0,
        lifeDelta: 0,
        createdAt: new Date('2026-09-08T10:00:00Z'),
      },
    })

    // Quien solo está en la otra clase: su trabajo en M7 (que vino de allí) no cuenta.
    await approve('fuera', 'm7e1', 30, new Date('2026-09-06T22:30:00Z'))
    await complete('fuera', 'M7 movida', ago(5))
    await submit('fuera', 'm7e1', ago(5))
    // La vista previa del profesorado tampoco.
    await approve('profe', 'm1e1', 10, new Date('2026-09-06T22:30:00Z'))
    await approve('profe', 'm1e2', 10)
    await complete('profe', 'M1 normal', ago(5), 2)
    await submit('profe', 'm2e1', ago(1))

    // Asistencia: tres sesiones. Ana viene a todas; Bea, a la primera.
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, studentId: { in: [ids.ana!, ids.bea!, teacher] } },
      select: { id: true, studentId: true },
    })
    const enrollmentOf = (id: string) => enrollments.find(e => e.studentId === id)!.id
    for (const [index, date] of ['2026-10-01', '2026-10-02', '2026-10-05'].entries()) {
      const session = await prisma.attendanceSession.create({
        data: { classId, date: new Date(`${date}T00:00:00Z`) },
      })
      await prisma.attendanceRecord.createMany({
        data: [
          { sessionId: session.id, enrollmentId: enrollmentOf(ids.ana!), status: 'present' },
          { sessionId: session.id, enrollmentId: enrollmentOf(ids.bea!), status: index === 0 ? 'present' : 'absent' },
          // La vista previa no cuenta, ni aunque tenga registros.
          { sessionId: session.id, enrollmentId: enrollmentOf(teacher), status: 'absent' },
        ],
      })
    }

    matrix = await classMatrix(classId, { now: NOW })
  })

  afterAll(async () => {
    await prisma.activity.deleteMany({ where: { classId: { in: classIds } } })
    await prisma.class.deleteMany({ where: { id: { in: classIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  })

  const student = (name: string) => matrix.students.find(s => s.studentId === ids[name])!
  const mission = (label: string) => matrix.missions.find(m => m.id === ids[label])!
  const cell = (name: string, label: string) =>
    student(name).missions.find(c => c.missionId === ids[label])!
  const states = (name: string) =>
    Object.fromEntries(matrix.missions.map((m, i) => [m.title, student(name).missions[i]!.state]))

  it('solo el alumnado de la clase: sin la vista previa ni quien está en otra clase', () => {
    expect(matrix.students.map(s => s.name)).toEqual(['ana', 'bea', 'carla', 'dani'])
    expect(matrix.summary).toMatchObject({ students: 4, participating: 3 })
    // La cuenta sin estrenar sale para el profesorado, pero no participa.
    expect(student('carla')).toMatchObject({ accountType: 'managed', participating: false })
  })

  it('cuentan las misiones con enigmas y sin bloquear a mano', () => {
    expect(matrix.missions.map(m => [m.title, m.counted, m.exclusion])).toEqual([
      ['M1 normal', true, null],
      ['M2 pistas', true, null],
      ['M3 bloqueada', false, 'teacher_locked'],
      ['M4 sin enigmas', false, 'no_enigmas'],
      ['M5 caducada', true, null],
      ['M6 camino', true, null],
      ['M7 movida', true, null],
      ['M8 opcionales', true, null],
    ])
    expect(matrix.summary.missionsCounted).toBe(6)
    expect(mission('M6 camino').prerequisiteIds).toEqual([ids['M1 normal']])
  })

  it('el estado de cada estudiante en cada misión', () => {
    expect(states('ana')).toEqual({
      'M1 normal': 'completed',
      'M2 pistas': 'not_started',
      // Completada antes de que se bloqueara: es suya, aunque no cuente.
      'M3 bloqueada': 'completed',
      'M4 sin enigmas': 'excluded',
      'M5 caducada': 'completed',
      // Ya tiene M1: el camino está abierto.
      'M6 camino': 'not_started',
      'M7 movida': 'not_started',
      'M8 opcionales': 'completed',
    })
    expect(states('bea')).toEqual({
      'M1 normal': 'in_progress',
      'M2 pistas': 'in_progress',
      'M3 bloqueada': 'excluded',
      'M4 sin enigmas': 'excluded',
      'M5 caducada': 'expired',
      'M6 camino': 'path_locked',
      'M7 movida': 'not_started',
      'M8 opcionales': 'not_started',
    })
    expect(cell('bea', 'M6 camino').pathRequires).toEqual([ids['M1 normal']])
    expect(states('carla')).toMatchObject({
      'M1 normal': 'not_started',
      'M5 caducada': 'expired',
      'M6 camino': 'path_locked',
      // El trabajo de quien está en la otra clase no se le cuela a nadie.
      'M7 movida': 'not_started',
    })
    expect(states('dani')).toMatchObject({ 'M2 pistas': 'in_progress', 'M5 caducada': 'expired' })
  })

  it('«X de N» y el progreso: solo obligatorios de las que cuentan; los opcionales, como extra', () => {
    // Obligatorios de las seis que cuentan: M1 2, M2 2, M5 1, M6 1, M7 1, M8 0.
    expect(student('ana').progress).toEqual({
      missionsCompleted: 3,
      missionsCounted: 6,
      requiredApproved: 3,
      requiredTotal: 7,
      percent: 43,
      extraApproved: 2,
      extraTotal: 2,
      pending: { in_progress: 0, not_started: 3, expired: 0, path_locked: 0 },
    })
    expect(student('bea').progress).toMatchObject({
      missionsCompleted: 0,
      requiredApproved: 2,
      percent: 29,
      pending: { in_progress: 2, not_started: 2, expired: 1, path_locked: 1 },
    })
    expect(student('carla').progress).toMatchObject({ missionsCompleted: 0, requiredApproved: 0, percent: 0 })
    // Medias de quienes participan, sin Carla: (3 + 0 + 0) / 3 y (43 + 29 + 14) / 3.
    expect(matrix.summary.averages).toEqual({ missionsCompleted: 1, percent: 29 })
  })

  it('cada enigma, con su %, su fecha y sus entregas; la atascada no se revisa', () => {
    expect(cell('bea', 'M1 normal').enigmas.map(e => [e.approved, e.percentage])).toEqual([
      [true, 40],
      [false, null],
      [false, null],
    ])
    expect(cell('bea', 'M5 caducada').enigmas[0]).toMatchObject({ approved: false, pendingReview: true, stuck: false })
    expect(cell('dani', 'M2 pistas').enigmas[0]).toMatchObject({ approved: true, pendingReview: false, stuck: true })
    expect(student('bea').pendingReviews).toBe(1)
    expect(student('dani')).toMatchObject({ pendingReviews: 0, stuckSubmissions: 1 })
    // Ni la vista previa (M2) ni quien está fuera (M7) dejan entregas por revisar.
    expect(matrix.summary).toMatchObject({ pendingReviews: 1, stuckSubmissions: 1 })
    expect(mission('M2 pistas').stats).toMatchObject({ pendingReviews: 0, stuckSubmissions: 1 })
    expect(mission('M7 movida').stats).toMatchObject({ pendingReviews: 0, started: 0, approvalsInPeriod: 0 })
  })

  it('las pistas, la asistencia y la última actividad', () => {
    expect(cell('bea', 'M2 pistas').hints).toMatchObject({ used: 2, percent: 1, usedInPeriod: 2, percentInPeriod: 1 })
    expect(student('bea').attendance).toEqual({ total: 3, attended: 1, rate: 33 })
    expect(student('ana').attendance).toEqual({ total: 3, attended: 3, rate: 100 })
    expect(student('carla').attendance).toBeNull()
    expect(matrix.summary.attendance).toEqual({ sessions: 3, rate: 67 })
    // Lo de su docente (el comportamiento de ayer) no es actividad de Dani.
    expect(student('dani').lastActivityAt).toEqual(ago(20))
    expect(student('bea').lastActivityAt).toEqual(ago(4))
    expect(student('carla').lastActivityAt).toBeNull()
  })

  it('las cifras de cada misión', () => {
    expect(mission('M1 normal').stats).toMatchObject({
      states: { completed: 1, in_progress: 1, not_started: 2, expired: 0, path_locked: 0, excluded: 0 },
      started: 2,
      approvalsInPeriod: 4,
      approvalAverage: 78,
    })
    expect(mission('M5 caducada').stats).toMatchObject({
      states: { completed: 1, expired: 3 },
      started: 2,
      pendingReviews: 1,
    })
    expect(mission('M2 pistas').stats).toMatchObject({ hintsInPeriod: 2, started: 2, hintsPerStartedStudent: 1 })
  })

  it('el cierre del camino da lo mismo que la función del camino', async () => {
    const edges = await classPathEdges(prisma, ids.class!)
    for (const s of matrix.students) {
      const locks = await locksFromEdges(prisma, edges, s.studentId, NOW)
      const fromMatrix = Object.fromEntries(
        s.missions.filter(c => c.state === 'path_locked').map(c => [c.missionId, c.pathRequires])
      )
      const fromPath = Object.fromEntries([...locks].map(([id, reqs]) => [id, reqs.map(r => r.id)]))
      expect(fromMatrix, s.name).toEqual(fromPath)
    }
  })

  it('con el mapa apagado no hay nada cerrado por el camino', async () => {
    await prisma.class.update({ where: { id: ids.class! }, data: { settings: {} } })
    try {
      const off = await classMatrix(ids.class!, { now: NOW })
      expect(off.missionMap).toBe(false)
      const index = off.missions.findIndex(m => m.id === ids['M6 camino'])
      expect(off.students.map(s => s.missions[index]!.state)).toEqual([
        'not_started',
        'not_started',
        'not_started',
        'not_started',
      ])
    } finally {
      await prisma.class.update({ where: { id: ids.class! }, data: { settings: { missionMap: true } } })
    }
  })

  it('las señales de cada estudiante y de cada misión', () => {
    const signals = classSignals(matrix)
    const of = (name: string) =>
      signals.students.filter(s => s.studentId === ids[name]).map(s => s.code)
    expect(of('ana')).toEqual([])
    // Bea entregó M5 antes de la fecha y espera revisión: no se le cuenta como caducada.
    expect(of('bea')).toEqual(['low_grade', 'low_average', 'hints', 'low_attendance'])
    // La cuenta sin estrenar: caducada y sin actividad desde que la matricularon.
    expect(of('carla')).toEqual(['mission_expired', 'inactive'])
    expect(of('dani')).toEqual(['mission_expired', 'inactive'])
    const hints = signals.students.find(s => s.studentId === ids.bea && s.code === 'hints')!
    expect(hints.data).toMatchObject({ missionId: ids['M2 pistas'], hints: 2, percentHints: 1 })
    // M5: la empezaron Ana (la completó) y Bea (espera revisión): no queda nadie que
    // la empezara y no la terminara.
    expect(mission('M5 caducada').stats).toMatchObject({ started: 2, awaitingReview: 1 })
    expect(signals.missions).toEqual([])
  })

  it('el periodo elige lo que cuenta: aprobaciones, pistas y asistencia', async () => {
    const from = madridMidnight('2026-10-02')
    const scoped = await classMatrix(ids.class!, { from, to: NOW, now: NOW })
    // Bea, desde el 2 de octubre: las dos sesiones en que faltó.
    expect(scoped.students.find(s => s.studentId === ids.bea)!.attendance).toEqual({
      total: 2,
      attended: 0,
      rate: 0,
    })
    expect(scoped.summary.attendance.sessions).toBe(2)
    // Los últimos 7 días: ni el aprobado de Dani ni su entrega cuentan, pero el estado sí.
    const week = await classMatrix(ids.class!, { from: ago(7), to: NOW, now: NOW })
    const dani = week.students.find(s => s.studentId === ids.dani)!
    expect(dani.period).toMatchObject({ approvals: 0, approvalAverage: null })
    expect(dani.progress.requiredApproved).toBe(1)
  })

  it('la actividad por semanas de Madrid, solo del alumnado de la clase', async () => {
    // Fechas fijas de septiembre: lo relativo a hoy (hace 30 días como mucho) no cae aquí.
    const from = new Date('2026-08-31T00:00:00Z')
    const to = new Date('2026-09-13T12:00:00Z')
    const weeks = await classActivityByWeek(ids.class!, { from, to })
    expect(weeks.map(w => w.week)).toEqual(['2026-08-31', '2026-09-07'])
    // El domingo 6 a las 22:30 UTC ya es lunes 7 en Madrid. Ni la vista previa
    // ni quien está en otra clase, aprobados a la misma hora, cuentan.
    expect(weeks[0]).toMatchObject({ approvals: 0, behaviorsPositive: 0 })
    expect(weeks[1]).toMatchObject({ approvals: 1, xpFromEnigmas: 10, behaviorsPositive: 1, xpFromBehaviors: 5 })
    // Solo lo de un estudiante.
    const onlyDani = await classActivityByWeek(ids.class!, { from, to, studentId: ids.dani })
    expect(onlyDani[1]).toMatchObject({ approvals: 0, behaviorsPositive: 1 })
    // Sin periodo: de la primera semana con algo a la última, sin huecos.
    const all = await classActivityByWeek(ids.class!)
    expect(all[0]!.week).toBe('2026-09-07')
    const total = all.reduce((sum, w) => sum + w.approvals, 0)
    expect(total).toBe(9)
    for (let i = 1; i < all.length; i++) {
      const gap = new Date(`${all[i]!.week}T00:00:00Z`).getTime() - new Date(`${all[i - 1]!.week}T00:00:00Z`).getTime()
      expect(gap).toBe(7 * 24 * 60 * 60 * 1000)
    }
  })
})
