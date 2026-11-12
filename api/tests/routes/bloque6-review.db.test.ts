import { it, expect, vi, beforeAll, afterAll, afterEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Lo que salió en la revisión del bloque 6 y no tiene ya una prueba propia: lo que
 * recibe el alumnado del ranking (progreso medio y XP con el tipo apagado), los
 * enigmas de una misión caducada y cerrada por el camino, el `offset` sin tope, «en
 * curso» en la pestaña de misiones, el coste de «los N primeros» y las estadísticas
 * de la administración. Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { buildApp, createClassFixture, prisma, type Actor, type ClassFixture } from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { studentsService } from '../../src/modules/students/students.service.js'
import { classComparison } from '../../src/modules/analytics/comparison.js'
import { loadRankingContext } from '../../src/utils/ranking.js'
import { Prisma, PrismaClient } from '../../src/generated/prisma/client.js'

const DAY = 24 * 60 * 60 * 1000

describeWithDatabase('la revisión del bloque 6', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const made: string[] = []

  const get = async (actor: Actor, url: string) => {
    const res = await app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${f.token(actor)}` },
    })
    expect(res.statusCode, `${url}: ${res.body}`).toBe(200)
    return res.json()
  }
  const person = async (label: string, xp = 0) => {
    const user = await prisma.user.create({
      data: {
        email: `${label}.${randomUUID().slice(0, 8)}@test.invalid`,
        passwordHash: 'x',
        name: `Real ${label} ${tag}`,
        role: 'student',
        isOnboarded: true,
      },
    })
    made.push(user.id)
    const enrollment = await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: user.id, xp, level: 3, nickname: `${label}-${tag}` },
    })
    return { id: user.id, enrollmentId: enrollment.id }
  }
  const setClass = (data: { settings?: object; rankingConfig?: object | null }) =>
    prisma.class.update({
      where: { id: f.classId },
      data: {
        ...(data.settings ? { settings: data.settings } : {}),
        rankingConfig: data.rankingConfig ?? Prisma.JsonNull,
      },
    })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
    f = await createClassFixture(app)
  })

  afterEach(async () => {
    await setClass({ settings: {} })
    await prisma.mission.deleteMany({ where: { classId: f.classId } })
    await prisma.classEnrollment.deleteMany({
      where: { classId: f.classId, studentId: { in: made } },
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: made } } })
    await f?.cleanup()
    await app?.close()
  })

  describe('lo que recibe el alumnado del ranking', () => {
    it('sin el progreso medio: en una clase de dos, restando se sacaba el de la otra persona', async () => {
      const other = await person('otra', 50)
      const m = await f.newMission()
      const enigmas = [await f.newEnigma(m), await f.newEnigma(m), await f.newEnigma(m), await f.newEnigma(m)]
      await prisma.studentEnigmaProgress.createMany({
        data: enigmas.slice(0, 3).map(enigmaId => ({ studentId: other.id, enigmaId, percentage: 40 })),
      })
      // Ni esa ni ninguna otra media de la clase: solo la comparación anónima.
      const body = await get('student', `/students/classes/${f.classId}/ranking`)
      expect(body).not.toHaveProperty('stats')
      expect(JSON.stringify(body)).not.toMatch(/"(avgProgress|totalXp|avgMissions|avgXp)"/)
      // El profesorado lo sigue viendo.
      const teacher = await get('owner', `/teacher/classes/${f.classId}/ranking`)
      expect(teacher.stats.avgProgress).toBe(38)
    })

    const XP_KEYS = ['xp', 'level', 'levelTitle', 'levelColor']
    const rowsOf = (body: { podium: object[]; leaderboard: object[]; me: object | null }) => [
      ...body.podium,
      ...body.leaderboard,
      ...(body.me ? [body.me] : []),
    ]

    for (const [mode, shows] of [['full', true], ['top', true], ['position', false]] as const) {
      it(`sin el tipo XP, ni XP ni nivel de nadie, en modo ${mode}; y la XP no desempata`, async () => {
        const rich = await person('rica', 900)
        const poor = await person('pobre', 10)
        const m = await f.newMission()
        await f.newEnigma(m)
        for (const { id } of [rich, poor]) {
          await prisma.studentMissionProgress.create({
            data: { studentId: id, missionId: m, completedAt: new Date(), enigmasCompleted: 1 },
          })
        }
        await setClass({ rankingConfig: { types: ['missions'], mode, topN: 5 } })
        const body = await get('student', `/students/classes/${f.classId}/ranking?type=xp`)
        expect(body.type).toBe('missions')
        expect(body.options.usesXp).toBe(false)
        const rows = rowsOf(body)
        expect(rows.length).toBeGreaterThan(0)
        for (const row of rows) for (const key of XP_KEYS) expect(row, key).not.toHaveProperty(key)
        expect(JSON.stringify(body)).not.toContain('900')
        expect(body).not.toHaveProperty('stats')
        if (shows) {
          // Empatan en misiones y comparten puesto, por alias: el orden no deja
          // adivinar quién tiene más XP.
          expect(body.podium.map((row: { username: string }) => row.username)).toEqual([
            `pobre-${tag}`,
            `rica-${tag}`,
          ])
          expect(body.podium.map((row: { rank: number }) => row.rank)).toEqual([1, 1])
        }
      })
    }

    it('con el tipo XP, todo sigue igual', async () => {
      await person('rica', 900)
      await setClass({ rankingConfig: { types: ['xp', 'missions'], mode: 'full' } })
      for (const query of ['?type=xp', '?type=missions']) {
        const body = await get('student', `/students/classes/${f.classId}/ranking${query}`)
        expect(body.options.usesXp).toBe(true)
        expect(body).not.toHaveProperty('stats')
        expect(body.me).toMatchObject({ xp: 0, level: 1 })
        expect(rowsOf(body).find((row: object) => (row as { xp?: number }).xp === 900)).toBeDefined()
      }
    })
  })

  it('«Mi progreso»: una caducada y cerrada por el camino va sin enigmas, como en su listado', async () => {
    await setClass({ settings: { missionMap: true } })
    const required = await f.newMission()
    await f.newEnigma(required)
    const closed = await f.newMission()
    const enigma = await f.newEnigma(closed)
    await prisma.missionEnigma.update({ where: { id: enigma }, data: { title: `SECRETO ${tag}` } })
    await prisma.missionPrerequisite.create({ data: { missionId: closed, requiredMissionId: required } })
    await prisma.mission.update({ where: { id: closed }, data: { deadline: new Date(Date.now() - DAY) } })

    const body = await get('student', `/students/classes/${f.classId}/progress`)
    const row = body.missions.find((m: { id: string }) => m.id === closed)
    expect(row.state).toBe('path_locked')
    expect(row.pathRequires.map((r: { id: string }) => r.id)).toEqual([required])
    expect(row.enigmas).toEqual([])
    expect(JSON.stringify(body)).not.toContain('SECRETO')
    const { missions } = await get('student', `/students/classes/${f.classId}/missions`)
    expect(missions.find((m: { id: string }) => m.id === closed).lockReason).toBe('path')

    // Si completa lo que pide, se abre: sigue caducada, ya con sus enigmas.
    await prisma.studentMissionProgress.create({
      data: { studentId: f.users.student.id, missionId: required, completedAt: new Date(), enigmasCompleted: 1 },
    })
    const open = await get('student', `/students/classes/${f.classId}/progress`)
    expect(open.missions.find((m: { id: string }) => m.id === closed).enigmas).toHaveLength(1)
    await prisma.studentMissionProgress.deleteMany({ where: { missionId: required } })
  })

  describe('el muro del alumnado', () => {
    it('un `offset` enorme no llega a la consulta: lista vacía, sin el texto de Prisma', async () => {
      for (const offset of ['1e30', '99999999999999999999', '1e15']) {
        const res = await app.inject({
          method: 'GET',
          url: `/students/classes/${f.classId}/activities?offset=${offset}`,
          headers: { authorization: `Bearer ${f.token('student')}` },
        })
        expect(res.statusCode, offset).toBe(200)
        expect(res.json().activities).toEqual([])
      }
    })

    it('un fallo inesperado es un 500 sin detalle, no su mensaje', async () => {
      const failing = vi
        .spyOn(studentsService, 'getClassActivities')
        .mockRejectedValueOnce(new Error('Invalid prisma.activity.findMany() in /app/src/secreto.ts:711:46'))
      const res = await app.inject({
        method: 'GET',
        url: `/students/classes/${f.classId}/activities`,
        headers: { authorization: `Bearer ${f.token('student')}` },
      })
      failing.mockRestore()
      expect(res.statusCode).toBe(500)
      expect(res.body).not.toContain('secreto')
      expect(res.body).not.toContain('prisma')
    })
  })

  describe('«en curso» en la pestaña de misiones', () => {
    it('sigue la definición única: una caducada no está en curso, también con el panel', async () => {
      const a = await person('a')
      const b = await person('b')
      const m = await f.newMission()
      const enigma = await f.newEnigma(m)
      await f.newEnigma(m)
      for (const { id } of [a, b]) {
        await prisma.studentEnigmaProgress.create({
          data: { studentId: id, enigmaId: enigma, percentage: 100, completedAt: new Date(Date.now() - 3 * DAY) },
        })
      }
      const count = async () =>
        (await get('owner', `/teacher/classes/${f.classId}/missions`)).missions.find(
          (x: { id: string }) => x.id === m
        ).inProgressCount
      const inPanel = async () =>
        (await get('owner', `/teacher/classes/${f.classId}/analytics?period=last30`)).missions
          .find((x: { id: string }) => x.id === m)
          .segments.find((s: { state: string }) => s.state === 'in_progress').count
      expect(await count()).toBe(2)
      expect(await inPanel()).toBe(2)

      await prisma.mission.update({ where: { id: m }, data: { deadline: new Date(Date.now() - DAY) } })
      expect(await count()).toBe(0)
      expect(await inPanel()).toBe(0)
    })

    it('trae también cuántas personas participan: el denominador de las medias', async () => {
      const m = await f.newMission()
      await f.newEnigma(m)
      await person('a')
      const managed = await prisma.user.create({
        data: { username: `sin-${randomUUID().slice(0, 8)}`, accountType: 'managed', passwordHash: 'x', name: 'Sin Estrenar', role: 'student' },
      })
      made.push(managed.id)
      await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: managed.id, nickname: `sin-${tag}` } })
      const { missions } = await get('owner', `/teacher/classes/${f.classId}/missions`)
      expect(missions[0]).toMatchObject({ totalStudents: 3, participatingStudents: 2 })
      const { summary } = await get('owner', `/teacher/classes/${f.classId}/analytics?period=last30`)
      expect(missions[0].participatingStudents).toBe(summary.participating)
    })
  })

  it('una cuenta sin estrenar no entra en la media del detalle de misión', async () => {
    // Las medias del profesorado son de quienes participan, en todas las pantallas.
    const active = await person('activa')
    const managed = await prisma.user.create({
      data: { username: `pend-${tag}`, accountType: 'managed', passwordHash: 'x', name: 'Pendiente', role: 'student' },
    })
    made.push(managed.id)
    await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: managed.id, nickname: `pend-${tag}` } })
    const m = await f.newMission()
    const enigma = await f.newEnigma(m)
    for (const id of [active.id, f.users.student.id]) {
      await prisma.studentEnigmaProgress.create({ data: { studentId: id, enigmaId: enigma, percentage: 100 } })
    }
    const url = `/teacher/classes/${f.classId}`
    const panel = await get('owner', `${url}/analytics?period=last30`)
    const ranking = await get('owner', `${url}/ranking`)
    expect(panel.summary.participating).toBe(2)
    expect(panel.summary.averagePercent).toBe(100)
    expect(ranking.stats.avgProgress).toBe(100)
  })

  describe('el coste de «los N primeros»', () => {
    it('una sola carga: las mismas consultas que el modo completo, aunque mire cuatro vistas', async () => {
      const group: { id: string }[] = []
      for (const [index, label] of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].entries()) {
        group.push(await person(label, 100 - index * 10))
      }
      const m = await f.newMission()
      await f.newEnigma(m)
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      const counted = new PrismaClient({
        adapter: new PrismaPg(pool),
        log: [{ emit: 'event', level: 'query' }],
      })
      let queries = 0
      counted.$on('query', () => {
        queries += 1
      })
      const enrollment = await prisma.classEnrollment.findFirstOrThrow({
        where: { classId: f.classId, studentId: f.users.student.id },
      })
      const measure = async () => {
        const context = await loadRankingContext(f.classId)
        queries = 0
        const comparison = await classComparison(enrollment.id, f.classId, context, { db: counted })
        expect(comparison).not.toBeNull()
        return { queries, comparison }
      }
      try {
        await setClass({ rankingConfig: { types: ['xp', 'missions'], mode: 'full', compare: true } })
        const full = await measure()
        await setClass({
          rankingConfig: {
            types: ['xp', 'missions', 'teams'],
            mode: 'top',
            topN: 3,
            compare: true,
            seasonStartedAt: new Date(Date.now() - DAY).toISOString(),
          },
        })
        const top = await measure()
        expect(top.queries).toBe(full.queries)
        expect(top.queries).toBeLessThanOrEqual(8)
        // Nueve personas y tres a la vista por XP: ocultos de sobra para dar la media.
        expect(top.comparison!.metrics.find(x => x.key === 'xp')!.reason).toBeNull()
        // Sigue mirando todas las vistas: otras tres por misiones dejan solo tres ocultas.
        await prisma.studentMissionProgress.createMany({
          data: group.slice(-3).map(({ id }) => ({
            studentId: id,
            missionId: m,
            completedAt: new Date(),
            enigmasCompleted: 1,
          })),
        })
        const hiding = await measure()
        expect(hiding.comparison!.metrics.find(x => x.key === 'xp')).toMatchObject({
          average: null,
          reason: 'band_only',
        })
      } finally {
        await counted.$disconnect()
        await pool.end()
      }
    })
  })

  describe('las estadísticas de la administración', () => {
    // La salud de los servicios sondea los endpoints de IA: en las pruebas, sin red.
    beforeAll(() => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))
    })
    afterAll(() => {
      vi.unstubAllGlobals()
    })

    for (const period of ['week', 'month', 'quarter']) {
      it(`${period}: las series suman lo mismo que las cifras del periodo, y los mensajes son del periodo`, async () => {
        const admin = await prisma.user.create({
          data: { email: `admin-${period}.${tag}@test.invalid`, passwordHash: 'x', name: 'Admin', role: 'admin', isOnboarded: true },
        })
        made.push(admin.id)
        const conversation = await prisma.chatConversation.create({
          data: { userId: admin.id, assistantId: 'polifemo', title: 'Charla' },
        })
        // Uno de ahora y uno de hace un año: ese no es de ningún periodo.
        await prisma.chatMessage.createMany({
          data: [
            { conversationId: conversation.id, role: 'user', content: 'Ahora' },
            {
              conversationId: conversation.id,
              role: 'user',
              content: 'Antes',
              createdAt: new Date(Date.now() - 365 * DAY),
            },
          ],
        })
        const res = await app.inject({
          method: 'GET',
          url: `/admin/analytics?period=${period}`,
          headers: { authorization: `Bearer ${app.jwt.sign({ id: admin.id, role: 'admin' })}` },
        })
        expect(res.statusCode, res.body).toBe(200)
        const { analytics } = res.json()
        const sum = (series: { value: number }[]) => series.reduce((total, p) => total + p.value, 0)
        expect(sum(analytics.activitySeries)).toBe(analytics.kpis.activity.current)
        expect(sum(analytics.newUsersSeries)).toBe(analytics.kpis.newUsers.current)
        expect(sum(analytics.aiUsage.messagesSeries)).toBe(analytics.aiUsage.totalMessages)
        // El de ahora, en el último tramo de la serie.
        const series = analytics.aiUsage.messagesSeries
        expect(series[series.length - 1].value).toBeGreaterThan(0)
        // Los mensajes por asistente, del mismo periodo: nunca más que el total.
        const byAssistant = analytics.aiUsage.messagesByAssistant
        expect(sum(byAssistant)).toBe(analytics.aiUsage.totalMessages)
      })
    }
  })
})
