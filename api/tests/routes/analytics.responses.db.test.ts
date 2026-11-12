import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

/**
 * Lo que responden las rutas de la analítica (F1), con la clase pequeña de
 * tests/helpers/analytics-class.ts, cuyas cifras se pueden sacar a mano: el
 * panel de la clase, la página del estudiante (con las medias sin esa persona y
 * cuadrando con la matriz entera), el historial con su cursor y «Mi progreso»,
 * que no lleva nada de nadie más. Necesita TEST_DATABASE_URL (ver
 * tests/helpers/test-db.ts).
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  saveUpload: vi.fn(async (path: string) => `/uploads/${path}`),
  deleteUpload: vi.fn(),
}))

import { buildApp, prisma } from '../helpers/class-fixture.js'
import { ago, seedAnalyticsClass, type AnalyticsClass, NOW } from '../helpers/analytics-class.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { classMatrix } from '../../src/modules/analytics/class-matrix.js'
import {
  MISSION_BAR_STATES,
  periodFromPreset,
  roundedAverage,
} from '../../src/modules/analytics/definitions.js'
import {
  SIGNAL_IMPORTANCE,
  type AnalyticsSignal,
  type ClassAnalytics,
  type MyProgress,
  type StudentAnalytics,
  type StudentTimeline,
} from '../../src/modules/analytics/analytics.service.js'

describeWithDatabase('analítica: lo que responden las rutas', () => {
  let app: FastifyInstance
  let c: AnalyticsClass
  let ids: Record<string, string>
  let owner: string

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    c = await seedAnalyticsClass()
    ids = c.ids
    owner = app.jwt.sign({ id: ids.profe, role: 'teacher' })
  })

  afterAll(async () => {
    await c?.cleanup()
    await app?.close()
  })

  async function getJson<T>(url: string, token = owner): Promise<T> {
    const response = await app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(response.statusCode, `${url}: ${response.body}`).toBe(200)
    return response.json() as T
  }
  const teacherUrl = (suffix: string) => `/teacher/classes/${c.classId}${suffix}`
  const panel = (period = 'last30') => getJson<ClassAnalytics>(teacherUrl(`/analytics?period=${period}`))
  const page = (name: string, period = 'last30') =>
    getJson<StudentAnalytics>(teacherUrl(`/students/${ids[name]}/analytics?period=${period}`))
  const timeline = (name: string, query = '') =>
    getJson<StudentTimeline>(teacherUrl(`/students/${ids[name]}/timeline${query}`))

  /** Las claves y los textos de todo el JSON. */
  function walk(value: unknown, keys: Set<string> = new Set(), texts: string[] = []) {
    if (typeof value === 'string') texts.push(value)
    else if (Array.isArray(value)) value.forEach(v => walk(v, keys, texts))
    else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) {
        keys.add(key)
        walk(inner, keys, texts)
      }
    }
    return { keys, texts }
  }

  // ---- El panel de la clase ----

  describe('el panel de la clase', () => {
    it('el resumen sale con las cuentas hechas a mano', async () => {
      const { summary, period } = await panel()
      expect(summary).toEqual({
        students: 4,
        participating: 3,
        // M1, M2, M5 y M6.
        missionsCounted: 4,
        // Las medias, solo de quienes participan: Carla está sin estrenar.
        // Ana completa M1 y M5; M3 no cuenta. (2 + 0 + 0) / 3.
        averageMissionsCompleted: 0.7,
        // Seis obligatorios: Ana 3 (50), Bea 2 (33), Dani 1 (17).
        averagePercent: 33,
        // La de Bea; la atascada de Dani no.
        pendingReviews: 1,
        // Ana 5, Bea 1 y Dani 5 de 15; la vista previa no cuenta.
        attendance: { rate: 73, sessions: 5 },
        // (300 + 100 + 200) / 3.
        xp: { average: 200 },
      })
      expect(period.preset).toBe('last30')
      expect(Date.parse(period.to) - Date.parse(period.from)).toBe(30 * 24 * 60 * 60 * 1000)
    })

    it('una sola cifra: las medias del panel son las de la página de cualquiera y las del ranking', async () => {
      const { summary, students } = await panel()
      expect(students.find(s => s.id === ids.carla)).toMatchObject({ participating: false })
      const ranking = await getJson<{
        stats: { avgXp: number; avgProgress: number; avgMissions: number; totalStudents: number }
      }>(teacherUrl('/ranking'))
      expect(ranking.stats).toMatchObject({
        avgXp: summary.xp!.average,
        avgProgress: summary.averagePercent,
        avgMissions: summary.averageMissionsCompleted,
        totalStudents: summary.participating,
      })
      // Quien participa y quien no: da igual a quién se mire.
      for (const name of ['ana', 'bea', 'carla', 'dani']) {
        const { figures } = await page(name)
        expect(figures.comparedWith, name).toBe(summary.participating)
        expect(figures.missions.classAverage, name).toBe(summary.averageMissionsCompleted)
        expect(figures.percent.classAverage, name).toBe(summary.averagePercent)
        expect(figures.xp!.classAverage, name).toBe(summary.xp!.average)
      }
    })

    it('la asistencia media no cuenta a quien está sin estrenar, aunque se le haya pasado lista', async () => {
      const carla = await prisma.classEnrollment.findFirstOrThrow({
        where: { classId: c.classId, studentId: ids.carla },
        select: { id: true },
      })
      const sessions = await prisma.attendanceSession.findMany({
        where: { classId: c.classId },
        select: { id: true },
      })
      await prisma.attendanceRecord.createMany({
        data: sessions.map(s => ({
          sessionId: s.id,
          enrollmentId: carla.id,
          status: 'absent' as const,
        })),
      })
      try {
        const { summary, students } = await panel()
        expect(summary.attendance).toEqual({ rate: 73, sessions: 5 })
        // Su fila sí lo dice.
        expect(students.find(s => s.id === ids.carla)!.attendance).toEqual({
          rate: 0,
          attended: 0,
          total: 5,
        })
      } finally {
        await prisma.attendanceRecord.deleteMany({ where: { enrollmentId: carla.id } })
      }
    })

    it('por defecto, este curso', async () => {
      const response = await getJson<ClassAnalytics>(teacherUrl('/analytics'))
      expect(response.period.preset).toBe('course')
      expect(response.period.from).toBe(periodFromPreset('course').from!.toISOString())
    })

    it('cada misión reparte a todo el alumnado en los segmentos de la barra', async () => {
      const { missions, summary } = await panel()
      const segments = (title: string) =>
        Object.fromEntries(
          missions
            .find(m => m.title === title)!
            .segments.filter(s => s.count > 0)
            .map(s => [s.state, s.count])
        )
      for (const mission of missions) {
        expect(mission.segments.map(s => s.state)).toEqual([...MISSION_BAR_STATES])
        expect(mission.segments.reduce((sum, s) => sum + s.count, 0)).toBe(summary.students)
      }
      expect(missions.map(m => m.title)).toEqual(['M1', 'M2', 'M3', 'M4', 'M5', 'M6'])
      expect(segments('M1')).toEqual({ completed: 1, in_progress: 1, not_started: 2 })
      // Bea y Dani la llevan empezada; la entrega atascada de Dani no es «por revisar».
      expect(segments('M2')).toEqual({ in_progress: 2, not_started: 2 })
      expect(segments('M3')).toEqual({ completed: 1, excluded: 3 })
      expect(segments('M4')).toEqual({ excluded: 4 })
      // Bea entregó antes de la fecha: espera al profesorado, no «caducada».
      expect(segments('M5')).toEqual({ completed: 1, awaiting_review: 1, expired: 2 })
      expect(segments('M6')).toEqual({ not_started: 1, path_locked: 3 })
    })

    it('cada misión trae su estado, sus entregas, su media y sus pistas', async () => {
      const { missions } = await panel()
      const mission = (title: string) => missions.find(m => m.title === title)!
      expect(mission('M1')).toMatchObject({
        status: 'activa',
        deadline: null,
        expired: false,
        counted: true,
        exclusion: null,
        pendingReviews: 0,
        // 100, 90, 80 (Ana) y 40 (Bea).
        approvals: 4,
        approvalAverage: 78,
        hints: 0,
        hintsPerStudent: 0,
      })
      expect(mission('M2')).toMatchObject({ hints: 2, hintsPerStudent: 1 })
      expect(mission('M3')).toMatchObject({
        status: 'bloqueada',
        counted: false,
        exclusion: 'teacher_locked',
      })
      expect(mission('M4')).toMatchObject({ counted: false, exclusion: 'no_enigmas', approvals: 0 })
      const m5 = mission('M5')
      expect(m5).toMatchObject({ expired: true, pendingReviews: 1 })
      expect(typeof m5.deadline).toBe('string')
    })

    it('cada misión trae su portada, su rareza y quién la ha completado, con su avatar', async () => {
      await prisma.mission.update({
        where: { id: ids.M1 },
        data: { rarity: 'epica', backgroundImage: '/uploads/portada-m1.webp' },
      })
      try {
        const { missions } = await panel()
        const mission = (title: string) => missions.find(m => m.title === title)!
        expect(mission('M1')).toMatchObject({ rarity: 'epica', cover: '/uploads/portada-m1.webp' })
        expect(mission('M2')).toMatchObject({ rarity: 'comun', cover: null })
        // Ana es la única que ha completado M1: su id, su nombre real y su avatar.
        expect(mission('M1').completedBy).toEqual({
          total: 1,
          students: [{ id: ids.ana, name: expect.stringContaining('Ana Real'), avatar: null }],
        })
        expect(mission('M2').completedBy).toEqual({ total: 0, students: [] })
        // El total es el segmento «completada» de la barra, también en las que no cuentan.
        for (const m of missions) {
          const completed = m.segments.find(s => s.state === 'completed')!.count
          expect(m.completedBy.total, m.title).toBe(completed)
          expect(m.completedBy.students.length).toBeLessThanOrEqual(5)
        }
      } finally {
        await prisma.mission.update({
          where: { id: ids.M1 },
          data: { rarity: 'comun', backgroundImage: null },
        })
      }
    })

    it('una fila por estudiante, por nombre, sin la vista previa', async () => {
      const { students } = await panel()
      expect(students.map(s => s.id)).toEqual([ids.ana, ids.bea, ids.carla, ids.dani])
      const row = (name: string) => students.find(s => s.id === ids[name])!
      expect(row('bea')).toMatchObject({
        participating: true,
        missionsCompleted: 0,
        missionsCounted: 4,
        percent: 33,
        pendingReviews: 1,
        hintsUsed: 2,
        attendance: { rate: 20, attended: 1, total: 5 },
      })
      expect(row('bea').name).toContain('Bea Real')
      expect(row('bea').nickname).toContain('Alias bea')
      expect(row('ana')).toMatchObject({ missionsCompleted: 2, percent: 50, signals: 0 })
      expect(row('ana').lastActivityAt).toBe(ago(2).toISOString())
      // Sin estrenar: sale, no participa, y no se le pasó lista.
      expect(row('carla')).toMatchObject({
        participating: false,
        percent: 0,
        attendance: null,
        lastActivityAt: null,
      })
      expect(row('dani').attendance).toEqual({ rate: 100, attended: 5, total: 5 })
    })

    it('las señales salen ordenadas por importancia y con lo que necesita el texto', async () => {
      const { signals, students } = await panel()
      const ranks = signals.map(s =>
        (SIGNAL_IMPORTANCE as readonly string[]).indexOf(`${s.scope}.${s.code}`)
      )
      expect(ranks.every(r => r >= 0)).toBe(true)
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b))

      const keyed = signals.map(s => `${s.scope}.${s.code}:${s.scope === 'student' ? s.data.studentNickname?.split(' ')[1] : s.data.missionTitle}`)
      // Dentro de un código, lo más grave primero: 30 días sin nada de Carla, 20 de Dani.
      expect(keyed.slice(0, 2)).toEqual(['student.inactive:carla', 'student.inactive:dani'])
      expect(keyed).toEqual(
        expect.arrayContaining([
          'mission.students_expired:M5',
          'student.low_attendance:bea',
          'student.low_average:bea',
          'student.low_grade:bea',
          'student.hints:bea',
        ])
      )

      // Las de la fila cuadran con la lista y con las que da su página, sin agrupar:
      // en la lista, las caducadas de cada cual van juntas por misión.
      for (const row of students) {
        const detail = await getJson<StudentAnalytics>(
          teacherUrl(`/students/${row.id}/analytics?period=last30`)
        )
        const count = signals
          .filter(s => s.scope === 'student' && s.studentId === row.id)
          .reduce((sum, s) => sum + s.count, 0)
        const expired = detail.signals.filter(s => s.code === 'mission_expired').length
        expect(row.signals, row.name).toBe(count + expired)
        expect(detail.signals, row.name).toHaveLength(row.signals)
      }

      for (const signal of signals) {
        expect(signal.reason.length).toBeGreaterThan(0)
        if (signal.scope === 'student') {
          expect(signal.data.studentId).toBe(signal.studentId)
          expect(signal.data.studentName).toContain('Real')
        } else {
          expect(signal.data.missionId).toBe(signal.missionId)
          expect(signal.data.missionTitle).toBe('M5')
        }
      }
      const find = <S extends AnalyticsSignal['code']>(scope: string, code: S) =>
        signals.find(s => s.scope === scope && s.code === code) as Extract<AnalyticsSignal, { code: S }>
      expect(find('student', 'low_grade').data).toMatchObject({
        missionId: ids.M1,
        missionTitle: 'M1',
        enigmaId: ids.m1e1,
        enigmaTitle: 'm1e1',
        percentage: 40,
        threshold: 50,
        approvedAt: ago(6).toISOString(),
      })
      expect(find('student', 'hints').data).toMatchObject({ hints: 2, percentHints: 1 })
      expect(find('student', 'low_attendance').data).toMatchObject({ rate: 20, attended: 1, total: 5 })
      // M5 caducó: Carla y Dani no la completaron; Bea entregó y espera revisión.
      expect(find('mission', 'students_expired')).toMatchObject({
        missionId: ids.M5,
        count: 1,
        data: {
          missionId: ids.M5,
          missionTitle: 'M5',
          count: 2,
          deadline: ago(3).toISOString(),
        },
      })
      // En el panel van juntas por misión, y esa cubre la de quien no la terminó.
      expect(signals.filter(s => s.scope === 'student' && s.code === 'mission_expired')).toEqual([])
      expect(signals.filter(s => s.scope === 'mission' && s.code === 'unfinished_after_deadline')).toEqual([])
    })

    it('la columna «Señales» y la página de cada estudiante siguen contando sin agrupar', async () => {
      const { students } = await panel()
      for (const name of ['carla', 'dani']) {
        const { signals } = await page(name)
        expect(signals.filter(s => s.code === 'mission_expired').map(s => s.data.missionId), name).toEqual([ids.M5])
        expect(students.find(s => s.id === ids[name])!.signals, name).toBe(signals.length)
      }
    })

    it('a quien entregó a tiempo y espera revisión no le sale «caducó sin completar»', async () => {
      const { signals } = await page('bea')
      expect(signals.map(s => s.code)).not.toContain('mission_expired')
      const m5 = (await panel()).signals.find(s => s.scope === 'mission' && s.code === 'students_expired')
      expect(m5?.scope === 'mission' && m5.code === 'students_expired' && m5.data.count).toBe(2)
    })

    it('las señales de un estudiante van agrupadas por código, con la más grave', async () => {
      const seen = new Set<string>()
      const { signals } = await panel()
      for (const signal of signals) {
        const key = signal.scope === 'student' ? `${signal.studentId}:${signal.code}` : signal.missionId + signal.code
        expect(seen.has(key), key).toBe(false)
        seen.add(key)
      }
      // Bea tiene dos aprobados flojos: 20 y 40 %.
      const low = await prisma.studentEnigmaProgress.create({
        data: {
          studentId: ids.bea!,
          enigmaId: ids.m1o!,
          percentage: 20,
          completedAt: ago(1),
        },
      })
      try {
        const grouped = (await panel()).signals.filter(
          s => s.scope === 'student' && s.code === 'low_grade' && s.studentId === ids.bea
        )
        expect(grouped).toHaveLength(1)
        expect(grouped[0]!.count).toBe(2)
        expect(grouped[0]!.data).toMatchObject({ enigmaId: ids.m1o, percentage: 20 })
        expect(grouped[0]!.reason).toContain('20 %')
        // Su página sigue dando el detalle, una por enigma.
        const detail = (await page('bea')).signals.filter(s => s.code === 'low_grade')
        expect(detail.map(s => (s.data as { percentage: number }).percentage)).toEqual([20, 40])
      } finally {
        await prisma.studentEnigmaProgress.delete({ where: { id: low.id } })
      }
    })

    it('el periodo recorta lo que tiene fecha, y los saldos no cambian', async () => {
      const month = await panel('last30')
      const week = await panel('last7')
      const m2 = (a: ClassAnalytics) => a.missions.find(m => m.title === 'M2')!
      // Bea (hace 6 días) y Dani (hace 20).
      expect(m2(month).approvals).toBe(2)
      expect(m2(week).approvals).toBe(1)
      // El aprobado de hace 20 días de Dani deja de ser «del periodo», y con él su media.
      expect(m2(month).approvalAverage).toBe(78)
      expect(m2(week).approvalAverage).toBe(55)
      // Lo que no tiene fecha es igual: saldos, misiones que cuentan y asistencia de esas sesiones.
      expect(week.summary.xp).toEqual(month.summary.xp)
      expect(week.summary.missionsCounted).toBe(month.summary.missionsCounted)
      expect(week.summary.attendance).toEqual({ rate: 73, sessions: 5 })
    })

    it('las semanas cubren el periodo, sumando lo que hay en él', async () => {
      const { weeks } = await panel('last30')
      expect(weeks.length).toBeGreaterThanOrEqual(5)
      expect(weeks.map(w => w.week)).toEqual([...weeks.map(w => w.week)].sort())
      const sum = (key: 'approvals' | 'hintsUsed' | 'submissions') =>
        weeks.reduce((total, w) => total + w[key], 0)
      // 5 de Ana, 2 de Bea y 1 de Dani.
      expect(sum('approvals')).toBe(8)
      expect(sum('hintsUsed')).toBe(2)
      // La de Bea, y las dos de Dani.
      expect(sum('submissions')).toBe(3)
    })
  })

  // ---- La página del estudiante ----

  describe('la página de un estudiante', () => {
    it('la cabecera lleva quién es, su nivel y su asistencia', async () => {
      const { student, period } = await page('ana')
      expect(student).toMatchObject({
        id: ids.ana,
        participating: true,
        lastActivityAt: ago(2).toISOString(),
        level: { level: 5, title: 'Héroe Novato', color: '#34D399' },
        attendance: { rate: 100, attended: 5, total: 5 },
      })
      expect(student.name).toContain('Ana Real')
      expect(student.nickname).toContain('Alias ana')
      expect(student.enrolledAt).toBe(ago(30).toISOString())
      expect(period.preset).toBe('last30')
    })

    it('su nivel dice cuánto lleva de él, para el anillo de su avatar', async () => {
      // Bea: nivel 2 (se alcanza con 50 XP y pide 123) con 100 XP.
      expect((await page('bea')).student.level).toEqual({
        level: 2,
        title: 'Mortal',
        color: '#9CA3AF',
        progress: 41,
        currentXp: 50,
        requiredXp: 123,
      })
      // Ana tiene guardado el nivel 5 con menos XP de la que pide: se queda en 0.
      expect((await page('ana')).student.level).toMatchObject({ level: 5, progress: 0, currentXp: 0 })
    })

    it('sus misiones traen su portada y su rareza', async () => {
      const { missions } = await page('ana')
      expect(missions.map(m => [m.title, m.rarity, m.cover])).toEqual(
        ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map(title => [title, 'comun', null])
      )
    })

    it('las cifras traen la media exacta de la clase: la de quienes participan, contándola a ella', async () => {
      // Ana, Bea y Dani: Carla no participa. La media es la misma para todas.
      const averages = {
        comparedWith: 3,
        missions: { classAverage: 0.7 },
        percent: { classAverage: 33 },
        xp: { classAverage: 200 },
        pendingReviews: { classAverage: 0.3 },
        hints: { classAverage: 0.7 },
      }
      expect((await page('bea')).figures).toEqual({
        comparedWith: 3,
        missions: { value: 0, counted: 4, ...averages.missions },
        percent: { value: 33, ...averages.percent },
        xp: { value: 100, ...averages.xp },
        pendingReviews: { value: 1, ...averages.pendingReviews },
        hints: { value: 2, ...averages.hints },
      })
      expect((await page('ana')).figures).toEqual({
        comparedWith: 3,
        missions: { value: 2, counted: 4, ...averages.missions },
        percent: { value: 50, ...averages.percent },
        xp: { value: 300, ...averages.xp },
        pendingReviews: { value: 0, ...averages.pendingReviews },
        hints: { value: 0, ...averages.hints },
      })
      // Quien no participa también tiene página, con la misma media.
      expect((await page('carla')).figures).toMatchObject({
        ...averages,
        missions: { value: 0, counted: 4, ...averages.missions },
        xp: { value: 0, ...averages.xp },
      })
    })

    it('la fila de esa persona y las medias cuadran con la matriz de toda la clase', async () => {
      const period = periodFromPreset('last30', NOW)
      const full = await classMatrix(c.classId, { ...period, now: NOW })
      const xp = await prisma.classEnrollment.findMany({
        where: { classId: c.classId, isPreview: false },
        select: { studentId: true, xp: true },
      })
      const mean = (values: number[]) =>
        values.length === 0
          ? null
          : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
      for (const row of full.students) {
        const others = full.students.filter(s => s.participating)

        // Filtrada a una persona, la matriz le da lo mismo que entera.
        const one = await classMatrix(c.classId, { ...period, now: NOW, studentId: row.studentId })
        expect(one.students).toEqual([row])

        const { figures, missions } = await getJson<StudentAnalytics>(
          teacherUrl(`/students/${row.studentId}/analytics?period=last30`)
        )
        expect(figures).toEqual({
          comparedWith: others.length,
          missions: {
            value: row.progress.missionsCompleted,
            counted: row.progress.missionsCounted,
            classAverage: mean(others.map(s => s.progress.missionsCompleted)),
          },
          percent: {
            value: row.progress.percent,
            classAverage: roundedAverage(others.map(s => s.progress.percent!)),
          },
          xp: {
            value: xp.find(e => e.studentId === row.studentId)!.xp,
            classAverage: roundedAverage(
              others.map(s => xp.find(e => e.studentId === s.studentId)!.xp)
            ),
          },
          pendingReviews: {
            value: row.pendingReviews,
            classAverage: mean(others.map(s => s.pendingReviews)),
          },
          hints: {
            value: row.period.hintsUsed,
            classAverage: mean(others.map(s => s.period.hintsUsed)),
          },
        })
        expect(missions.map(m => m.state)).toEqual(row.missions.map(cell => cell.state))
      }
    })

    it('sus misiones traen estado, fechas, enigmas, lo que falta por revisar y las pistas', async () => {
      const { missions } = await page('bea')
      expect(missions.map(m => [m.title, m.state, m.counted])).toEqual([
        ['M1', 'in_progress', true],
        ['M2', 'in_progress', true],
        ['M3', 'excluded', false],
        ['M4', 'excluded', false],
        ['M5', 'expired', true],
        ['M6', 'path_locked', true],
      ])
      const mission = (title: string) => missions.find(m => m.title === title)!
      expect(mission('M1')).toMatchObject({
        status: 'activa',
        started: true,
        completedAt: null,
        required: { approved: 1, total: 2 },
        optional: { approved: 0, total: 1 },
        percent: 50,
        approvalAverage: 40,
        pendingReviews: 0,
        hints: { used: 0, usedInPeriod: 0, percentHints: 0 },
        earned: { xp: 4, coins: 5, mana: 1 },
        pathRequires: [],
      })
      expect(mission('M1').enigmas).toEqual([
        {
          id: ids.m1e1,
          title: 'm1e1',
          isOptional: false,
          approved: true,
          percentage: 40,
          approvedAt: ago(6).toISOString(),
          pendingReview: false,
          pendingSince: null,
        },
        expect.objectContaining({ id: ids.m1e2, approved: false, percentage: null, approvedAt: null }),
        expect.objectContaining({ id: ids.m1o, isOptional: true, approved: false }),
      ])
      expect(mission('M2').hints).toEqual({ used: 2, usedInPeriod: 2, percentHints: 1 })
      expect(mission('M5')).toMatchObject({
        deadline: ago(3).toISOString(),
        pendingReviews: 1,
      })
      expect(mission('M5').enigmas[0]).toMatchObject({
        pendingReview: true,
        pendingSince: ago(4).toISOString(),
      })
      // Lo que le falta del camino, con su título y su estado.
      expect(mission('M6').pathRequires).toEqual([{ id: ids.M1, title: 'M1', state: 'open' }])
      // La entrega atascada no sale como por revisar.
      const dani = await page('dani')
      expect(dani.figures.pendingReviews.value).toBe(0)
      expect(dani.missions.find(m => m.title === 'M2')!.enigmas[0]).toMatchObject({
        approved: true,
        pendingReview: false,
        pendingSince: null,
      })
      // La completada, con su fecha.
      const ana = await page('ana')
      expect(ana.missions.find(m => m.title === 'M1')).toMatchObject({
        state: 'completed',
        completedAt: ago(5).toISOString(),
        percent: 100,
        approvalAverage: 90,
        // Con el opcional: 10 + 9 + 8 de XP.
        earned: { xp: 27, coins: 15, mana: 3 },
      })
    })

    it('sus señales, por importancia, y sus semanas, solo las suyas', async () => {
      const bea = await page('bea')
      expect(bea.signals.map(s => s.code)).toEqual([
        'low_attendance',
        'low_average',
        'low_grade',
        'hints',
      ])
      for (const signal of bea.signals) {
        expect(signal.scope).toBe('student')
        expect(signal.studentId).toBe(ids.bea)
        expect(signal.data.studentName).toContain('Bea Real')
      }
      expect((await page('ana')).signals).toEqual([])
      const sum = (key: 'approvals' | 'hintsUsed' | 'submissions') =>
        bea.weeks.reduce((total, w) => total + w[key], 0)
      expect(sum('approvals')).toBe(2)
      expect(sum('hintsUsed')).toBe(2)
      expect(sum('submissions')).toBe(1)
    })

    it('sin pasar lista, sin asistencia', async () => {
      const carla = await page('carla')
      expect(carla.student.attendance).toBeNull()
    })
  })

  // ---- El historial ----

  describe('el historial de un estudiante', () => {
    it('mezcla su muro de la clase y su asistencia, de lo más reciente a lo más antiguo', async () => {
      const { entries, nextCursor } = await timeline('bea')
      expect(nextCursor).toBeNull()
      // Cinco del muro de esta clase y cinco sesiones.
      expect(entries.filter(e => e.kind === 'activity')).toHaveLength(5)
      expect(entries.filter(e => e.kind === 'attendance')).toHaveLength(5)
      const times = entries.map(e => Date.parse(e.timestamp))
      expect(times).toEqual([...times].sort((a, b) => b - a))
      // Fuera lo que no es de esta clase, con `xp_gained` sin clase.
      const types = entries.map(e => e.type)
      expect(types).not.toContain('xp_gained')
      expect(types).not.toContain('badge_earned')
      expect(types).not.toContain('class_joined')
      for (const entry of entries) {
        expect(entry.classId).toBe(c.classId)
        expect(entry.studentId).toBe(ids.bea)
      }
    })

    it('cada entrada del muro va como la del muro de hoy, con su autor y su avatar', async () => {
      const { entries } = await timeline('bea', '?type=enigma_completed')
      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({
        kind: 'activity',
        type: 'enigma_completed',
        enigmaTitle: 'm1e1',
        enigmaXp: 4,
        avatar: '/app/avatars/atenea.svg',
        studentId: ids.bea,
        classId: c.classId,
        metadata: { enigmaId: ids.m1e1, missionId: ids.M1 },
        actor: { id: ids.profe, name: 'Profe Real', avatar: 'atenea' },
      })
      expect((entries[0] as { username: string }).username).toContain('Alias bea')
      expect((entries[0] as { className: string }).className).toContain('Analítica')
      expect(entries[0]!.timestamp).toBe(ago(6).toISOString())
    })

    it('cada sesión lleva su día, su tramo, su estado, su nota y quién la marcó', async () => {
      const { entries } = await timeline('bea', '?type=attendance')
      expect(entries).toHaveLength(5)
      const excused = entries.find(e => e.kind === 'attendance' && e.status === 'excused')!
      expect(excused).toMatchObject({
        kind: 'attendance',
        type: 'attendance',
        note: 'Médico',
        startTime: '',
        endTime: null,
        actor: { id: ids.profe, avatar: 'atenea' },
      })
      // La del horario: su hora de Madrid, en UTC. Sin horario, las 00:00 de allí.
      const first = entries[0] as Extract<StudentTimeline['entries'][number], { kind: 'attendance' }>
      expect(first).toMatchObject({ startTime: '08:30', endTime: '09:25' })
      const local = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
      expect(local.format(new Date(first.timestamp))).toBe('08:30')
      expect(local.format(new Date(excused.timestamp))).toBe('00:00')
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' })
      expect(day.format(new Date(first.timestamp))).toBe(first.date)
    })

    it('el filtro por tipo admite varios, y una persona sin nada da una lista vacía', async () => {
      const { entries } = await timeline('bea', '?type=hint_used,attendance')
      expect(new Set(entries.map(e => e.type))).toEqual(new Set(['hint_used', 'attendance']))
      expect(entries).toHaveLength(7)
      expect(await timeline('carla')).toEqual({ entries: [], nextCursor: null })
    })

    it('el cursor recorre todo sin repetir ni perder nada, también con fechas iguales', async () => {
      const whole = (await timeline('bea')).entries.map(e => e.id)
      for (const limit of [1, 2, 3]) {
        const seen: string[] = []
        let cursor: string | null = null
        for (let turn = 0; turn < 20; turn++) {
          const query: string = `?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`
          const response: StudentTimeline = await timeline('bea', query)
          expect(response.entries.length).toBeLessThanOrEqual(limit)
          seen.push(...response.entries.map(e => e.id))
          cursor = response.nextCursor
          if (!cursor) break
        }
        expect(seen, `limit ${limit}`).toEqual(whole)
      }
    })

    it('el cursor sigue valiendo con el filtro por tipo', async () => {
      const first = await timeline('bea', '?type=hint_used&limit=1')
      expect(first.entries).toHaveLength(1)
      expect(first.nextCursor).not.toBeNull()
      const second = await timeline('bea', `?type=hint_used&limit=1&cursor=${first.nextCursor}`)
      expect(second.entries).toHaveLength(1)
      expect(second.entries[0]!.id).not.toBe(first.entries[0]!.id)
      expect(second.nextCursor).toBeNull()
    })

    it('`limit` va de 1 a 50, y sin él (o sin sentido) son 25', async () => {
      await prisma.activity.createMany({
        data: Array.from({ length: 60 }, (_, i) => ({
          id: randomUUID(),
          userId: ids.dani!,
          classId: c.classId,
          type: 'behavior_applied' as const,
          description: 'x',
          source: `Comportamiento ${i}`,
          createdAt: ago(100 + i),
        })),
      })
      const count = async (query: string) => (await timeline('dani', query)).entries.length
      expect(await count('')).toBe(25)
      expect(await count('?limit=abc')).toBe(25)
      expect(await count('?limit=10')).toBe(10)
      expect(await count('?limit=50')).toBe(50)
      expect(await count('?limit=51')).toBe(50)
      expect(await count('?limit=100000')).toBe(50)
      expect(await count('?limit=0')).toBe(1)
      expect(await count('?limit=-3')).toBe(1)
    })
  })

  // ---- «Mi progreso» ----

  describe('«Mi progreso» del alumnado', () => {
    const progress = (name: string) =>
      getJson<MyProgress>(
        `/students/classes/${c.classId}/progress`,
        app.jwt.sign({ id: ids[name], role: name === 'profe' ? 'teacher' : 'student' })
      )

    it('sus cifras, sus saldos y sus insignias', async () => {
      const ana = await progress('ana')
      expect(ana.summary).toEqual({
        missionsCompleted: 2,
        missionsCounted: 4,
        percent: 50,
        extra: { approved: 1, total: 1 },
        xp: 300,
        coins: 40,
        mana: 7,
        // La de M1; la del sistema no es de la clase.
        badges: { earned: 1, total: 1 },
      })
      // Tres personas en la clase: demasiado pocas para comparar.
      for (const figure of ana.comparison!.metrics) {
        expect(figure).toMatchObject({ average: null, band: null, reason: 'small_class' })
      }
      expect((await progress('bea')).summary).toMatchObject({
        missionsCompleted: 0,
        percent: 33,
        extra: { approved: 0, total: 1 },
        xp: 100,
        badges: { earned: 0, total: 1 },
      })
    })

    it('sus misiones hechas y pendientes, con su estado y sin lo que no cuenta', async () => {
      const { missions } = await progress('bea')
      // M3 (bloqueada) y M4 (sin enigmas) no son pendientes de nadie.
      expect(missions.map(m => [m.title, m.state])).toEqual([
        ['M1', 'in_progress'],
        ['M2', 'in_progress'],
        ['M5', 'expired'],
        ['M6', 'path_locked'],
      ])
      const mission = (title: string) => missions.find(m => m.title === title)!
      expect(mission('M1')).toMatchObject({
        earned: { xp: 4, coins: 5, mana: 1 },
        hints: { used: 0 },
      })
      expect(mission('M1').enigmas[0]).toMatchObject({ approved: true, percentage: 40 })
      expect(mission('M2').hints).toMatchObject({ used: 2, percentHints: 1 })
      // «En revisión» y «vence el…».
      expect(mission('M5')).toMatchObject({ pendingReviews: 1, deadline: ago(3).toISOString() })
      expect(mission('M5').enigmas[0]).toMatchObject({ pendingReview: true })
      // «Bloqueada»: qué le falta, y sin sus enigmas, como en su listado.
      expect(mission('M6').pathRequires).toEqual([{ id: ids.M1, title: 'M1', state: 'open' }])
      expect(mission('M6').enigmas).toEqual([])
      // Su miniatura: la portada y la rareza de la misión, nada de quién la ha completado.
      expect(mission('M1')).toMatchObject({ rarity: 'comun', cover: null })
      expect(mission('M1')).not.toHaveProperty('completedBy')
    })

    it('la que completó antes de que se bloqueara sale como hecha, sin contar y sin enigmas', async () => {
      const { missions } = await progress('ana')
      expect(missions.map(m => [m.title, m.state, m.counted])).toEqual([
        ['M1', 'completed', true],
        ['M2', 'not_started', true],
        ['M3', 'completed', false],
        ['M5', 'completed', true],
        ['M6', 'not_started', true],
      ])
      const m3 = missions.find(m => m.title === 'M3')!
      expect(m3.enigmas).toEqual([])
      expect(m3.earned).toEqual({ xp: 10, coins: 5, mana: 1 })
    })

    it('la vista previa del profesorado funciona, sin cierres del camino', async () => {
      const preview = await progress('profe')
      expect(preview.summary).toMatchObject({ missionsCompleted: 0, percent: 0, xp: 0 })
      const m6 = preview.missions.find(m => m.title === 'M6')!
      expect(m6).toMatchObject({ state: 'not_started', pathRequires: [] })
      expect(m6.enigmas).toHaveLength(1)
    })

    it('no lleva ningún id, nombre ni alias de nadie más, ni medias, señales o asistencia', async () => {
      for (const name of ['ana', 'bea', 'carla', 'dani', 'profe']) {
        const body = await progress(name)
        const { keys, texts } = walk(body)
        const foreign = c.foreignValues(name)
        expect(foreign.length).toBeGreaterThan(10)
        for (const value of foreign) {
          const leaked = texts.filter(text => text.includes(value))
          expect(leaked, `${name} ve «${value}»`).toEqual([])
          expect([...keys].filter(key => key.includes(value))).toEqual([])
        }
        for (const key of [
          'attendance',
          'signals',
          'classAverage',
          'averages',
          'comparedWith',
          'students',
          'student',
          'studentId',
          'name',
          'nickname',
          'avatar',
          'actor',
          'completedBy',
        ]) {
          expect(keys.has(key), `${name} lleva «${key}»`).toBe(false)
        }
        // De la clase, solo lo que deja pasar la comparación, y aquí es pequeña.
        for (const figure of body.comparison?.metrics ?? []) expect(figure.average).toBeNull()
        // Tampoco lo suyo de nombre: lo que viaja son misiones y enigmas.
        expect(Object.keys(body).sort()).toEqual(['comparison', 'missions', 'summary'])
      }
    })
  })

  // ---- Recursos apagados ----

  describe('una clase sin recursos', () => {
    let bare: AnalyticsClass

    beforeAll(async () => {
      bare = await seedAnalyticsClass({
        xp: false,
        coins: false,
        shop: false,
        mana: false,
        rankings: false,
        missionMap: false,
      })
    })

    afterAll(async () => {
      await bare?.cleanup()
    })

    it('no enseña XP, nivel, monedas ni maná, y sin mapa no hay cierres', async () => {
      const profe = app.jwt.sign({ id: bare.ids.profe, role: 'teacher' })
      const classUrl = `/teacher/classes/${bare.classId}`
      const panelBody = await getJson<ClassAnalytics>(`${classUrl}/analytics`, profe)
      expect(panelBody.summary.xp).toBeNull()
      const m6 = panelBody.missions.find(m => m.title === 'M6')!
      expect(m6.segments.find(s => s.state === 'path_locked')!.count).toBe(0)

      const pageBody = await getJson<StudentAnalytics>(
        `${classUrl}/students/${bare.ids.ana}/analytics`,
        profe
      )
      expect(pageBody.student.level).toBeNull()
      expect(pageBody.figures.xp).toBeNull()
      expect(pageBody.missions[0]!.earned).toEqual({ xp: null, coins: null, mana: null })

      const mine = await getJson<MyProgress>(
        `/students/classes/${bare.classId}/progress`,
        app.jwt.sign({ id: bare.ids.bea, role: 'student' })
      )
      expect(mine.summary).toMatchObject({ xp: null, coins: null, mana: null })
      expect(mine.missions[0]!.earned).toEqual({ xp: null, coins: null, mana: null })
      expect(mine.missions.find(m => m.title === 'M6')).toMatchObject({
        state: 'not_started',
        pathRequires: [],
      })
    })
  })
})
