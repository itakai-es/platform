import { it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'

/**
 * Volumen de la analítica (F1): una clase grande de verdad —40 estudiantes, 50
 * misiones y 300 enigmas, con el mapa encendido y el camino en cadena—, con
 * unas 10 000 aprobaciones, 11 000 entregas, 12 000 entradas de muro y 6000
 * registros de asistencia.
 *
 * Dos cosas: que la matriz haga **las mismas consultas** en esa clase que en
 * una de un estudiante y una misión (sin N+1, es lo que no falla por ruido), y
 * que la matriz, las señales y la actividad por semanas salgan en un tiempo
 * razonable. Aislada, la matriz tarda unos 200 ms y las semanas unos 50 ms; los
 * topes dejan margen para cuando la batería entera corre a la vez en la misma
 * máquina (el plan pide revisar el cálculo en vivo si el panel pasa de 500 ms
 * en producción). Mide varias veces y se queda con la mediana; la primera
 * vuelta calienta. Lo que crea, lo borra al acabar. Necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts).
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { prisma } from '../../src/config/database.js'
import { PrismaClient } from '../../src/generated/prisma/client.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import {
  buildClassMatrix,
  classMatrix,
  loadMatrixData,
} from '../../src/modules/analytics/class-matrix.js'
import { classSignals } from '../../src/modules/analytics/signals.js'
import { classActivityByWeek } from '../../src/modules/analytics/weekly.js'
import { periodFromPreset } from '../../src/modules/analytics/definitions.js'

const STUDENTS = 40
const MISSIONS = 50
const ENIGMAS_PER_MISSION = 6 // 300 enigmas
/** Tope de la matriz (mediana): unos 200 ms aislada, con margen para la batería en paralelo. */
const MATRIX_MAX_MS = 1000
/** Tope de la actividad por semanas (mediana): unos 50 ms aislada. */
const WEEKLY_MAX_MS = 1000
/** Tope de las señales (mediana): en memoria, unos 10 ms. */
const SIGNALS_MAX_MS = 100

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
  return { median: samples[Math.floor(samples.length / 2)]!, max: samples[samples.length - 1]! }
}

describeWithDatabase('analítica: volumen de una clase grande', () => {
  const tag = randomUUID().slice(0, 8)
  let teacherId: string
  let classId: string
  let tinyClassId: string
  const studentIds: string[] = []

  beforeAll(async () => {
    const teacher = await prisma.user.create({
      data: { email: `vol-profe.${tag}@test.invalid`, passwordHash: 'x', name: 'Profe', role: 'teacher' },
    })
    teacherId = teacher.id
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `Volumen ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase(), settings: { missionMap: true } },
        teacherId
      )
    )
    classId = cls.id

    // Alumnado y matrículas.
    const students = Array.from({ length: STUDENTS }, (_, i) => ({
      id: randomUUID(),
      email: `vol-${i}.${tag}@test.invalid`,
      passwordHash: 'x',
      name: `Estudiante ${String(i).padStart(2, '0')}`,
      role: 'student' as const,
    }))
    await prisma.user.createMany({ data: students })
    studentIds.push(...students.map(s => s.id))
    const enrollments = students.map(s => ({
      id: randomUUID(),
      classId,
      studentId: s.id,
      enrolledAt: ago(60),
    }))
    await prisma.classEnrollment.createMany({ data: enrollments })

    // Misiones en cadena (cada una pide la anterior), diez ya caducadas.
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

    // Trabajo: cada estudiante llega hasta una misión distinta (de la 30 a la
    // 49) y la que tiene a medias, a medias. Aprobado con un % que varía.
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
          })
          submissions.push({ id: randomUUID(), studentId: s.id, enigmaId: e.id, status: 'aprobada', submittedAt: ago(51 - mi * 0.9, ei) })
          activities.push({ id: randomUUID(), userId: s.id, classId, type: 'enigma_submitted', description: 'x', createdAt: at })
        })
        if (mi === reach) {
          // La que lleva a medias: una entrega pendiente y alguna pista.
          const next = mine[2]!
          submissions.push({ id: randomUUID(), studentId: s.id, enigmaId: next.id, status: 'pendiente', submittedAt: ago(1) })
          for (const h of hints.filter(h => h.missionId === m.id).slice(0, 1 + (si % 2))) {
            hintUses.push({ id: randomUUID(), hintId: h.id, missionId: m.id, studentId: s.id, costType: h.costType, cost: h.cost, createdAt: ago(2) })
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

    // Asistencia: 150 sesiones con toda la clase; comportamientos repartidos.
    const sessions = Array.from({ length: 150 }, (_, i) => ({
      id: randomUUID(),
      classId,
      date: new Date(Date.UTC(2026, 0, 1) + i * 24 * 60 * 60 * 1000),
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
    await prisma.behaviorApplication.createMany({
      data: students.flatMap((s, si) =>
        Array.from({ length: 20 }, (_, i) => ({
          classId,
          studentId: s.id,
          teacherId,
          kind: (si + i) % 4 === 0 ? 'negative' : 'positive',
          name: 'x',
          xpDelta: (si + i) % 4 === 0 ? -5 : 5,
          coinDelta: 0,
          lifeDelta: 0,
          createdAt: ago(i * 3),
        }))
      ),
    })

    // Y una clase mínima: un estudiante (el primero) y una misión de un enigma.
    const tiny = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `Mínima ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase(), settings: { missionMap: true } },
        teacherId
      )
    )
    tinyClassId = tiny.id
    await prisma.classEnrollment.create({ data: { classId: tinyClassId, studentId: students[0]!.id } })
    const tinyMission = await prisma.mission.create({ data: { classId: tinyClassId, title: 'Sola' } })
    await prisma.missionEnigma.create({ data: { missionId: tinyMission.id, title: 'Uno' } })
  }, 120_000)

  afterAll(async () => {
    if (classId) {
      await prisma.activity.deleteMany({ where: { classId } })
      await prisma.class.deleteMany({ where: { id: { in: [classId, tinyClassId].filter(Boolean) } } })
    }
    await prisma.user.deleteMany({ where: { id: { in: [...studentIds, teacherId].filter(Boolean) } } })
  }, 120_000)

  it('la matriz hace las mismas consultas en la clase grande que en una mínima (sin N+1)', async () => {
    // Un cliente propio que avisa de cada consulta.
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const counted = new PrismaClient({
      adapter: new PrismaPg(pool),
      log: [{ emit: 'event', level: 'query' }],
    })
    let queries = 0
    counted.$on('query', () => {
      queries += 1
    })
    try {
      const count = async (id: string) => {
        queries = 0
        await classMatrix(id, { now: NOW }, counted)
        return queries
      }
      const big = await count(classId)
      const small = await count(tinyClassId)
      console.info(`[analítica · volumen] consultas de la matriz: ${big} (clase grande) y ${small} (mínima)`)
      expect(big).toBe(small)
      // Clase, misiones con sus enigmas, camino, matrícula, quién participa y
      // las siete agrupadas: unas quince, nunca una por estudiante ni por misión.
      expect(big).toBeLessThanOrEqual(16)
    } finally {
      await counted.$disconnect()
      await pool.end()
    }
  }, 60_000)

  it(`la matriz de 40 × 50 × 300 sale en menos de ${MATRIX_MAX_MS} ms`, async () => {
    const period = periodFromPreset('course', NOW)
    let matrix = await classMatrix(classId, { ...period, now: NOW })
    // Que la clase sea lo que se quería medir.
    expect(matrix.students).toHaveLength(STUDENTS)
    expect(matrix.missions).toHaveLength(MISSIONS)
    expect(matrix.missions.reduce((sum, m) => sum + m.enigmas.length, 0)).toBe(300)
    const states = matrix.missions.reduce(
      (acc, m) => {
        for (const [state, n] of Object.entries(m.stats.states)) acc[state] = (acc[state] ?? 0) + n
        return acc
      },
      {} as Record<string, number>
    )
    // Hay de todo: completadas, en curso, caducadas y cerradas por el camino.
    expect(states.completed).toBeGreaterThan(1000)
    expect(states.in_progress).toBeGreaterThan(0)
    expect(states.path_locked).toBeGreaterThan(0)

    const matrixTime = await median(5, async () => {
      matrix = await classMatrix(classId, { ...period, now: NOW })
    })
    // Dónde se va: la carga (SQL y lectura de filas) y la construcción en memoria.
    const data = await loadMatrixData(prisma, classId, period)
    const loadTime = await median(5, () => loadMatrixData(prisma, classId, period))
    const buildTime = await median(5, async () => buildClassMatrix(data, period, NOW))
    const signalsTime = await median(5, async () => classSignals(matrix))
    const weeklyTime = await median(5, () => classActivityByWeek(classId, period))
    console.info(
      `[analítica · volumen] matriz: mediana ${matrixTime.median.toFixed(1)} ms (máx. ${matrixTime.max.toFixed(1)}; ` +
        `carga ${loadTime.median.toFixed(1)}, construcción ${buildTime.median.toFixed(1)}); ` +
        `señales: ${signalsTime.median.toFixed(1)} ms; semanas: ${weeklyTime.median.toFixed(1)} ms (máx. ${weeklyTime.max.toFixed(1)})`
    )
    expect(matrixTime.median).toBeLessThan(MATRIX_MAX_MS)
    expect(signalsTime.median).toBeLessThan(SIGNALS_MAX_MS)
    expect(weeklyTime.median).toBeLessThan(WEEKLY_MAX_MS)
  }, 120_000)
})
