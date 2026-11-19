import { it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * «Completada» es una sola cosa: `completedAt` o todos los obligatorios aprobados. El
 * caso es el que lo destapó: alguien tiene aprobado todo menos un obligatorio y su
 * docente lo pasa a opcional (o lo borra). Nadie recalcula `completedAt`, y salía
 * «100 %», 0 completadas y la siguiente misión abierta. Aquí se recorren todas las
 * vías que lo cuentan, con la persona en ese estado, y se comprueba que nadie paga
 * nada por leerlo. Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

const provider = vi.hoisted(() => ({ prompts: [] as string[] }))

vi.mock('../../src/modules/ai/providers/index.js', () => ({
  getAIProvider: () => ({
    generateText: async (prompt: string) => {
      provider.prompts.push(prompt)
      return 'Respuesta simulada'
    },
    generateTextStream: async function* (prompt: string) {
      provider.prompts.push(prompt)
      yield 'Respuesta simulada'
    },
  }),
  getLastUsedProvider: () => 'spark',
}))

import { buildApp, createClassFixture, prisma, type Actor, type ClassFixture } from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { chatRoutes } from '../../src/modules/chat/chat.routes.js'
import { rankingPeriodStart } from '../../src/utils/ranking.js'
import { Prisma } from '../../src/generated/prisma/client.js'

const DAY = 24 * 60 * 60 * 1000

describeWithDatabase('«completada» por todas las vías', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const extra: string[] = []
  /** Quién no lo tiene: para que las medias se vean moverse. */
  let other: string

  /** La misión en la que se queda con todo aprobado, y la que la pide. */
  let m: string
  let approved: string
  let pendingRequired: string
  let next: string
  /** La fecha de su última aprobación: hace 3 días. */
  const approvedAt = new Date(Date.now() - 3 * DAY)

  const student = () => f.users.student.id
  const get = async (actor: Actor, url: string) => {
    const res = await app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${f.token(actor)}` },
    })
    expect(res.statusCode, `${url}: ${res.body}`).toBe(200)
    return res.json()
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(chatRoutes, { prefix: '/chat' })
    })
    f = await createClassFixture(app)
    await prisma.class.update({
      where: { id: f.classId },
      data: { settings: { missionMap: true } },
    })
    const user = await prisma.user.create({
      data: {
        email: `otra.${tag}@test.invalid`,
        passwordHash: 'x',
        name: 'Otra',
        role: 'student',
        isOnboarded: true,
      },
    })
    other = user.id
    extra.push(user.id)
    await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: other, nickname: `Otra ${tag}` } })

    m = await f.newMission()
    approved = await f.newEnigma(m)
    pendingRequired = await f.newEnigma(m)
    next = await f.newMission()
    await f.newEnigma(next)
    await prisma.missionPrerequisite.create({ data: { missionId: next, requiredMissionId: m } })

    await prisma.studentEnigmaProgress.create({
      data: { studentId: student(), enigmaId: approved, percentage: 100, completedAt: approvedAt },
    })
    await prisma.studentMissionProgress.create({
      data: { studentId: student(), missionId: m, enigmasCompleted: 1, progress: 50 },
    })

    // Lo pasa a opcional su docente, por la ruta de verdad.
    const edited = await app.inject({
      method: 'PUT',
      url: `/missions/${m}/enigmas/${pendingRequired}`,
      headers: { authorization: `Bearer ${f.token('owner')}` },
      payload: { title: 'Ahora opcional', isOptional: true },
    })
    expect(edited.statusCode, edited.body).toBe(200)
  })

  afterEach(async () => {
    await prisma.class.update({
      where: { id: f.classId },
      data: { settings: { missionMap: true }, rankingConfig: Prisma.JsonNull },
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: extra } } })
    await f?.cleanup()
    await app?.close()
  })

  it('no se mueve dinero: `completedAt` sigue vacío y no hay bonus', async () => {
    const row = await prisma.studentMissionProgress.findFirstOrThrow({
      where: { studentId: student(), missionId: m },
    })
    expect(row.completedAt).toBeNull()
    await get('student', `/students/classes/${f.classId}/progress`)
    await get('owner', `/teacher/classes/${f.classId}/analytics`)
    const after = await prisma.studentMissionProgress.findFirstOrThrow({
      where: { studentId: student(), missionId: m },
    })
    expect(after.completedAt).toBeNull()
    const enrollment = await prisma.classEnrollment.findFirstOrThrow({
      where: { classId: f.classId, studentId: student() },
    })
    expect(enrollment.xp).toBe(0)
    expect(
      await prisma.activity.count({ where: { userId: student(), type: 'mission_completed' } })
    ).toBe(0)
  })

  it('«Mi progreso»: completada, con la fecha de su última aprobación, y la siguiente abierta', async () => {
    const { missions, summary } = await get('student', `/students/classes/${f.classId}/progress`)
    const row = missions.find((x: { id: string }) => x.id === m)
    expect(row).toMatchObject({ state: 'completed', percent: 100, completedAt: approvedAt.toISOString() })
    expect(summary).toMatchObject({ missionsCompleted: 1, missionsCounted: 2, percent: 50 })
    expect(missions.find((x: { id: string }) => x.id === next).state).toBe('not_started')
  })

  it('sus listados: «completada», 100 %, y la tarjeta y el inicio lo cuentan', async () => {
    const { missions } = await get('student', `/students/classes/${f.classId}/missions`)
    expect(missions.find((x: { id: string }) => x.id === m)).toMatchObject({
      status: 'completada',
      progress: 100,
    })
    expect(missions.find((x: { id: string }) => x.id === next).lockReason).toBeNull()

    const all = await get('student', '/missions')
    expect(all.missions.find((x: { id: string }) => x.id === m)).toMatchObject({ status: 'completada' })

    const detail = await get('student', `/missions/${m}`)
    expect(detail.mission.status).toBe('completada')

    const { classes } = await get('student', '/students/classes')
    expect(classes.find((c: { id: string }) => c.id === f.classId).progress).toEqual({
      missionsCompleted: 1,
      missionsCounted: 2,
    })
    const profile = await get('student', '/students/profile/me')
    expect((profile.profile ?? profile).stats.missionsCompleted).toBe(1)
  })

  it('el panel de la clase, su barra, su tabla, sus semanas y la página del estudiante', async () => {
    const url = `/teacher/classes/${f.classId}`
    const panel = await get('owner', `${url}/analytics?period=last30`)
    const bar = panel.missions.find((x: { id: string }) => x.id === m).segments
    expect(bar.find((s: { state: string }) => s.state === 'completed').count).toBe(1)
    const row = panel.students.find((s: { id: string }) => s.id === student())
    expect(row).toMatchObject({ missionsCompleted: 1, missionsCounted: 2 })
    expect(panel.summary.averageMissionsCompleted).toBe(0.5)
    const inWeeks = panel.weeks.reduce(
      (sum: number, w: { missionsCompleted: number }) => sum + w.missionsCompleted,
      0
    )
    expect(inWeeks).toBe(1)

    const page = await get('owner', `${url}/students/${student()}/analytics?period=last30`)
    expect(page.figures.missions).toEqual({ value: 1, counted: 2, classAverage: 0.5 })
    expect(page.missions.find((x: { id: string }) => x.id === m)).toMatchObject({
      state: 'completed',
      completedAt: approvedAt.toISOString(),
    })
    const otherPage = await get('owner', `${url}/students/${other}/analytics?period=last30`)
    expect(otherPage.figures.missions).toEqual({ value: 0, counted: 2, classAverage: 0.5 })
  })

  it('las listas del profesorado: pestaña, sus misiones, la ficha, el alumnado y el detalle', async () => {
    const tab = await get('owner', `/teacher/classes/${f.classId}/missions`)
    expect(tab.missions.find((x: { id: string }) => x.id === m)).toMatchObject({
      completedCount: 1,
      completedStudentIds: [student()],
      inProgressCount: 0,
    })
    const all = await get('owner', `/teacher/missions?classIdFilter=${f.classId}`)
    expect(all.missions.find((x: { id: string }) => x.id === m).completedCount).toBe(1)

    const ficha = await get('owner', `/teacher/students/${student()}`)
    expect(ficha.student.classes.find((c: { id: string }) => c.id === f.classId).missionsCompleted).toBe(1)
    const list = await get('owner', `/teacher/students?classId=${f.classId}`)
    expect(list.students.find((s: { id: string }) => s.id === student()).totalMissionsCompleted).toBe(1)

    const detail = await get('owner', `/missions/${m}`)
    expect(detail.mission.teacherStats).toMatchObject({ completed: 1, inProgress: 0 })
  })

  it('el ranking: por misiones, en «Siempre» y en la semana, por la fecha que toca', async () => {
    await prisma.class.update({
      where: { id: f.classId },
      data: { rankingConfig: { types: ['xp', 'missions'], mode: 'full' } },
    })
    const url = `/students/classes/${f.classId}/ranking?type=missions`
    const all = await get('student', url)
    expect(all.me).toMatchObject({ missionsCompleted: 1, score: 1, rank: 1 })
    expect((await get('owner', `/teacher/classes/${f.classId}/ranking?type=missions`)).stats.avgMissions).toBe(0.5)
    // «Esta semana»: desde el lunes, por la fecha de su última aprobación.
    const week = await get('student', `${url}&period=week`)
    const monday = rankingPeriodStart('week')!
    expect(week.me.score).toBe(approvedAt >= monday ? 1 : 0)
  })

  it('la comparación cuenta lo mismo', async () => {
    await prisma.class.update({
      where: { id: f.classId },
      data: { rankingConfig: { types: ['xp', 'missions'], mode: 'full', compare: true } },
    })
    const { comparison } = await get('student', `/students/classes/${f.classId}/progress`)
    expect(comparison.metrics.map((x: { key: string }) => x.key)).toEqual(['xp', 'missions'])
    expect(comparison.metrics.find((x: { key: string }) => x.key === 'missions').value).toBe(1)
  })

  it('al caducar, a quien la tiene hecha no le sale «caducó sin completar»', async () => {
    await prisma.classEnrollment.updateMany({
      where: { classId: f.classId, studentId: student() },
      data: { enrolledAt: new Date(Date.now() - 10 * DAY) },
    })
    await prisma.mission.update({ where: { id: m }, data: { deadline: new Date(Date.now() - DAY) } })
    try {
      const page = await get('owner', `/teacher/classes/${f.classId}/students/${student()}/analytics?period=last30`)
      expect(page.signals.map((s: { code: string }) => s.code)).not.toContain('mission_expired')
      const panel = await get('owner', `/teacher/classes/${f.classId}/analytics?period=last30`)
      const bar = panel.missions.find((x: { id: string }) => x.id === m).segments
      expect(bar.find((s: { state: string }) => s.state === 'completed').count).toBe(1)
    } finally {
      await prisma.mission.update({ where: { id: m }, data: { deadline: null } })
    }
  })

  it('el asistente, a cada cual: el alumnado ve su fecha; el profesorado, cuántos la tienen', async () => {
    provider.prompts.length = 0
    const ask = async (actor: Actor) => {
      const conversation = await prisma.chatConversation.create({
        data: { userId: f.users[actor].id, assistantId: 'atenea', missionId: m },
      })
      const reply = await app.inject({
        method: 'POST',
        url: `/chat/conversations/${conversation.id}/messages`,
        headers: { authorization: `Bearer ${f.token(actor)}` },
        payload: { content: '¿Cómo voy?' },
      })
      expect(reply.statusCode, reply.body).toBe(200)
      return provider.prompts.join('\n')
    }
    expect(await ask('student')).toContain(
      `Mission completed on: ${approvedAt.toISOString().split('T')[0]}`
    )
    provider.prompts.length = 0
    expect(await ask('owner')).toContain('Completed mission: 1')
  })

  it('borrar el obligatorio que faltaba hace lo mismo que pasarlo a opcional', async () => {
    const mission = await f.newMission()
    const done = await f.newEnigma(mission)
    const missing = await f.newEnigma(mission)
    await prisma.studentEnigmaProgress.create({
      data: { studentId: student(), enigmaId: done, percentage: 100 },
    })
    await prisma.studentMissionProgress.create({
      data: { studentId: student(), missionId: mission, enigmasCompleted: 1, progress: 50 },
    })
    const state = async () =>
      (await get('student', `/students/classes/${f.classId}/progress`)).missions.find(
        (x: { id: string }) => x.id === mission
      ).state
    expect(await state()).toBe('in_progress')
    const removed = await app.inject({
      method: 'DELETE',
      url: `/missions/${mission}/enigmas/${missing}`,
      headers: { authorization: `Bearer ${f.token('owner')}` },
    })
    expect(removed.statusCode, removed.body).toBeLessThan(300)
    expect(await state()).toBe('completed')
    await prisma.mission.delete({ where: { id: mission } })
  })
})
