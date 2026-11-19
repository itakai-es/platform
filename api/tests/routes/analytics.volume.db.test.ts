import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

/**
 * Las rutas de la analítica (F1) con una clase grande: 40 estudiantes, 50
 * misiones y 300 enigmas, con el mapa encendido, unas 10 000 aprobaciones, 11 000
 * entregas, 11 000 entradas de muro y 6000 registros de asistencia.
 *
 * Dos cosas, como la prueba de la matriz (tests/modules/analytics.volume.db.test.ts):
 * que cada ruta haga **las mismas consultas** en esa clase que en una mínima (sin
 * N+1) y que salgan en un tiempo razonable, de punta a punta (con el JSON). De
 * paso, compara la página del estudiante, que no lanza la matriz de toda la
 * clase, con lanzarla. Mide varias veces y se queda con la mediana; la primera
 * vuelta calienta. Lo que crea, lo borra al acabar. Necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts).
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

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { buildApp, prisma } from '../helpers/class-fixture.js'
import { PrismaClient } from '../../src/generated/prisma/client.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { classMatrix } from '../../src/modules/analytics/class-matrix.js'
import { periodFromPreset } from '../../src/modules/analytics/definitions.js'
import {
  getClassAnalytics,
  getMyProgress,
  getStudentAnalytics,
  getStudentTimeline,
} from '../../src/modules/analytics/analytics.service.js'

const STUDENTS = 40
const MISSIONS = 50
const ENIGMAS_PER_MISSION = 6
/** Tope de cada ruta (mediana), con margen para la batería entera en la misma máquina. */
const ROUTE_MAX_MS = 1500
/**
 * Lo que pesa el panel de esta clase: las señales van agrupadas por estudiante y
 * código (sin agrupar eran 1573 señales y 817 KB).
 */
const PANEL_MAX_BYTES = 150_000

const NOW = new Date()
const ago = (days: number, hours = 0) =>
  new Date(NOW.getTime() - (days * 24 + hours) * 60 * 60 * 1000)

async function chunked<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>, size = 5000) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size))
}

async function median(times: number, run: () => Promise<unknown>) {
  await run() // calienta
  const samples: number[] = []
  for (let i = 0; i < times; i++) {
    const start = performance.now()
    await run()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)]!
}

describeWithDatabase('analítica: las rutas con una clase grande', () => {
  const tag = randomUUID().slice(0, 8)
  let app: FastifyInstance
  let teacherId: string
  let classId: string
  let tinyClassId: string
  const studentIds: string[] = []

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })

    const teacher = await prisma.user.create({
      data: {
        email: `vol-rutas.${tag}@test.invalid`,
        passwordHash: 'x',
        name: 'Profe',
        role: 'teacher',
        isOnboarded: true,
      },
    })
    teacherId = teacher.id
    const newClass = async (name: string) =>
      (
        await prisma.$transaction(tx =>
          createClassWithOwner(
            tx,
            {
              name: `${name} ${tag}`,
              invitationCode: randomUUID().slice(0, 6).toUpperCase(),
              settings: { missionMap: true },
            },
            teacherId
          )
        )
      ).id
    classId = await newClass('Rutas')

    const students = Array.from({ length: STUDENTS }, (_, i) => ({
      id: randomUUID(),
      email: `vol-rutas-${i}.${tag}@test.invalid`,
      passwordHash: 'x',
      name: `Estudiante ${String(i).padStart(2, '0')}`,
      role: 'student' as const,
      isOnboarded: true,
    }))
    await prisma.user.createMany({ data: students })
    studentIds.push(...students.map(s => s.id))
    const enrollments = students.map((s, i) => ({
      id: randomUUID(),
      classId,
      studentId: s.id,
      enrolledAt: ago(60),
      nickname: `Alias ${i}`,
      xp: 100 + i * 10,
    }))
    await prisma.classEnrollment.createMany({ data: enrollments })

    const missions = Array.from({ length: MISSIONS }, (_, m) => ({
      id: randomUUID(),
      classId,
      title: `Misión ${m}`,
      orderIndex: m,
      deadline: m < 10 ? ago(40 - m) : m < 40 ? null : ago(-10),
    }))
    await prisma.mission.createMany({ data: missions })
    await prisma.missionPrerequisite.createMany({
      data: missions.slice(1).map((m, i) => ({ missionId: m.id, requiredMissionId: missions[i]!.id })),
    })
    const enigmas = missions.flatMap(m =>
      Array.from({ length: ENIGMAS_PER_MISSION }, (_, e) => ({
        id: randomUUID(),
        missionId: m.id,
        title: `${m.title}.${e}`,
        orderIndex: e,
        isOptional: e === ENIGMAS_PER_MISSION - 1,
        xpReward: 10,
      }))
    )
    await prisma.missionEnigma.createMany({ data: enigmas })
    const hints = missions.flatMap(m => [
      { id: randomUUID(), missionId: m.id, content: 'a', costType: 'coins', cost: 5, orderIndex: 0 },
      { id: randomUUID(), missionId: m.id, content: 'b', costType: 'percent', cost: 20, orderIndex: 1 },
    ])
    await prisma.missionHint.createMany({ data: hints })

    const approvals: object[] = []
    const submissions: object[] = []
    const progress: object[] = []
    const hintUses: object[] = []
    const activities: object[] = []
    students.forEach((s, si) => {
      const reach = 30 + (si % 20)
      missions.forEach((m, mi) => {
        if (mi > reach) return
        const mine = enigmas.filter(e => e.missionId === m.id)
        const done = mi < reach ? mine : mine.slice(0, 2)
        done.forEach((e, ei) => {
          const at = ago(50 - mi * 0.9, ei)
          approvals.push({
            id: randomUUID(),
            studentId: s.id,
            enigmaId: e.id,
            percentage: 40 + ((si * 7 + ei * 13 + mi) % 61),
            completedAt: at,
            xpEarned: 10,
            coinsEarned: 2,
          })
          submissions.push({
            id: randomUUID(),
            studentId: s.id,
            enigmaId: e.id,
            status: 'aprobada',
            submittedAt: ago(51 - mi * 0.9, ei),
          })
          activities.push({
            id: randomUUID(),
            userId: s.id,
            classId,
            type: 'enigma_submitted',
            description: 'x',
            enigmaTitle: e.title,
            createdAt: at,
          })
        })
        if (mi === reach) {
          const next = mine[2]!
          submissions.push({
            id: randomUUID(),
            studentId: s.id,
            enigmaId: next.id,
            status: 'pendiente',
            submittedAt: ago(1),
          })
          for (const h of hints.filter(h => h.missionId === m.id).slice(0, 1 + (si % 2))) {
            hintUses.push({
              id: randomUUID(),
              hintId: h.id,
              missionId: m.id,
              studentId: s.id,
              costType: h.costType,
              cost: h.cost,
              createdAt: ago(2),
            })
          }
        }
        progress.push({
          id: randomUUID(),
          studentId: s.id,
          missionId: m.id,
          enigmasCompleted: done.length,
          progress: 100,
          completedAt: mi < reach ? ago(50 - mi * 0.9) : null,
        })
      })
    })
    await chunked(approvals, batch => prisma.studentEnigmaProgress.createMany({ data: batch as never }))
    await chunked(submissions, batch => prisma.enigmaSubmission.createMany({ data: batch as never }))
    await chunked(progress, batch => prisma.studentMissionProgress.createMany({ data: batch as never }))
    await chunked(hintUses, batch => prisma.missionHintUse.createMany({ data: batch as never }))
    await chunked(activities, batch => prisma.activity.createMany({ data: batch as never }))

    const sessions = Array.from({ length: 150 }, (_, i) => ({
      id: randomUUID(),
      classId,
      date: new Date(NOW.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
      startTime: i % 2 ? '08:30' : '',
    }))
    await prisma.attendanceSession.createMany({ data: sessions })
    await chunked(
      sessions.flatMap((session, i) =>
        enrollments.map((e, ei) => ({
          id: randomUUID(),
          sessionId: session.id,
          enrollmentId: e.id,
          status: (i + ei) % 7 === 0 ? ('absent' as const) : ('present' as const),
        }))
      ),
      batch => prisma.attendanceRecord.createMany({ data: batch })
    )

    // La mínima: dos estudiantes, para que haya con quién comparar, y un enigma.
    tinyClassId = await newClass('Mínima')
    await prisma.classEnrollment.createMany({
      data: students.slice(0, 2).map(s => ({ classId: tinyClassId, studentId: s.id })),
    })
    const tinyMission = await prisma.mission.create({ data: { classId: tinyClassId, title: 'Sola' } })
    await prisma.missionEnigma.create({ data: { missionId: tinyMission.id, title: 'Uno' } })
  }, 120_000)

  afterAll(async () => {
    if (classId) {
      await prisma.activity.deleteMany({ where: { classId } })
      await prisma.class.deleteMany({ where: { id: { in: [classId, tinyClassId].filter(Boolean) } } })
    }
    await prisma.user.deleteMany({ where: { id: { in: [...studentIds, teacherId].filter(Boolean) } } })
    await app?.close()
  }, 120_000)

  it('cada ruta hace las mismas consultas en la clase grande que en una mínima (sin N+1)', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const counted = new PrismaClient({
      adapter: new PrismaPg(pool),
      log: [{ emit: 'event', level: 'query' }],
    })
    let queries = 0
    counted.$on('query', () => {
      queries += 1
    })
    const count = async (run: () => Promise<unknown>) => {
      queries = 0
      await run()
      return queries
    }
    const student = studentIds[0]!
    const myEnrollment = (id: string) =>
      prisma.classEnrollment.findFirstOrThrow({
        where: { classId: id, studentId: student },
        select: { id: true, isPreview: true },
      })
    const user = { id: student, role: 'student' }
    try {
      const routes: [string, (id: string) => Promise<unknown>][] = [
        ['panel', id => getClassAnalytics(teacherId, id, 'course', NOW, counted)],
        ['estudiante', id => getStudentAnalytics(teacherId, id, student, 'course', NOW, counted)],
        [
          'mi progreso',
          async id => getMyProgress(user, await myEnrollment(id), id, NOW, counted),
        ],
      ]
      for (const [name, run] of routes) {
        const big = await count(() => run(classId))
        const small = await count(() => run(tinyClassId))
        console.info(`[analítica · rutas] consultas de ${name}: ${big} (grande) y ${small} (mínima)`)
        expect(big, name).toBe(small)
        expect(big, name).toBeLessThanOrEqual(30)
      }
      // El historial: elegir la página y completarla, más el acceso y la matrícula.
      const timeline = await count(() =>
        getStudentTimeline(teacherId, classId, student, { limit: 50 }, counted)
      )
      console.info(`[analítica · rutas] consultas del historial: ${timeline}`)
      expect(timeline).toBeLessThanOrEqual(15)
    } finally {
      await counted.$disconnect()
      await pool.end()
    }
  }, 60_000)

  it(`cada ruta sale en menos de ${ROUTE_MAX_MS} ms, y la del estudiante no paga la matriz entera`, async () => {
    const owner = app.jwt.sign({ id: teacherId, role: 'teacher' })
    const student = studentIds[39]!
    const mine = app.jwt.sign({ id: student, role: 'student' })
    const base = `/teacher/classes/${classId}`
    const sizes: Record<string, number> = {}
    let signalCount = 0
    let signalBytes = 0
    const hit = (name: string, url: string, token: string) => async () => {
      const response = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(response.statusCode, `${url}: ${response.body.slice(0, 200)}`).toBe(200)
      sizes[name] = response.body.length
      if (name === 'panel') {
        const { signals } = response.json() as { signals: { count: number }[] }
        expect(signals.reduce((sum, s) => sum + s.count, 0)).toBeGreaterThan(signals.length)
        signalCount = signals.length
        signalBytes = JSON.stringify(signals).length
      }
    }
    const panel = await median(5, hit('panel', `${base}/analytics`, owner))
    const page = await median(5, hit('estudiante', `${base}/students/${student}/analytics`, owner))
    const timeline = await median(5, hit('historial', `${base}/students/${student}/timeline?limit=50`, owner))
    const progress = await median(5, hit('mi progreso', `/students/classes/${classId}/progress`, mine))
    const period = periodFromPreset('course', NOW)
    const fullMatrix = await median(5, () => classMatrix(classId, { ...period, now: NOW }))
    console.info(
      `[analítica · rutas] mediana: panel ${panel.toFixed(1)} ms (${sizes.panel} B, ${signalBytes} B en ${signalCount} señales); ` +
        `estudiante ${page.toFixed(1)} ms (${sizes.estudiante} B); ` +
        `historial ${timeline.toFixed(1)} ms (${sizes.historial} B); ` +
        `mi progreso ${progress.toFixed(1)} ms (${sizes['mi progreso']} B); ` +
        `la matriz entera sola: ${fullMatrix.toFixed(1)} ms`
    )
    expect(sizes.panel).toBeLessThan(PANEL_MAX_BYTES)
    // Como mucho, una por estudiante y código, y las de cada misión.
    expect(signalCount).toBeLessThanOrEqual(STUDENTS * 6 + MISSIONS * 3)
    expect(panel).toBeLessThan(ROUTE_MAX_MS)
    expect(page).toBeLessThan(ROUTE_MAX_MS)
    expect(timeline).toBeLessThan(ROUTE_MAX_MS)
    expect(progress).toBeLessThan(ROUTE_MAX_MS)
  }, 120_000)
})
