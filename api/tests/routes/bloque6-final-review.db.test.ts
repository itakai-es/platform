import { it, expect, vi, beforeAll, afterAll, afterEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Lo que salió en la revisión final del bloque 6 (datos y pantallas) y se arregló
 * en la API: el desempate por XP sin el tipo XP, las cifras que contaban clases
 * archivadas, misiones que no cuentan o la vista previa, los alias que se hacían
 * pasar por otra persona, la clase cerrada, «en curso» en los listados del
 * alumnado, las medias del ranking ante el alumnado, las insignias del listado del
 * profesorado y las estadísticas de la administración (claves en vez de textos, el
 * estado de los servicios aparte). Necesita TEST_DATABASE_URL (ver
 * tests/helpers/test-db.ts).
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

// Los endpoints de IA de la instancia, para la salud de los servicios.
const ai = vi.hoisted(() => ({
  settings: null as null | {
    text: { baseUrl: string; apiKey: string; model: string }
    image: { baseUrl: string; apiKey: string; model: string }
  },
}))
vi.mock('../../src/modules/settings/settings.service.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/modules/settings/settings.service.js')>()
  return {
    ...actual,
    getAiSettings: async () => (ai.settings ?? (await actual.getAiSettings())) as never,
  }
})

import { buildApp, createClassFixture, prisma, type Actor, type ClassFixture } from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { Prisma } from '../../src/generated/prisma/client.js'

const DAY = 24 * 60 * 60 * 1000

/** Todas las claves de una respuesta. */
function keysOf(value: unknown, keys: Set<string> = new Set()) {
  if (Array.isArray(value)) value.forEach(item => keysOf(item, keys))
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      keys.add(key)
      keysOf(inner, keys)
    }
  }
  return keys
}

describeWithDatabase('la revisión final del bloque 6', () => {
  let app: FastifyInstance
  let f: ClassFixture
  let adminId: string
  const tag = randomUUID().slice(0, 8)
  const made: string[] = []
  const madeClasses: string[] = []

  type Method = 'GET' | 'PUT' | 'PATCH' | 'POST'
  const send = async (method: Method, url: string, token: string, payload?: object) => {
    const res = await app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${token}` },
      ...(payload ? { payload } : {}),
    })
    let body: any = res.body
    try {
      body = res.json()
    } catch {
      /* sin cuerpo JSON */
    }
    return { status: res.statusCode, body }
  }
  const get = async (actor: Actor | string, url: string) => {
    const token = ['owner', 'other', 'student', 'outsider'].includes(actor) ? f.token(actor as Actor) : actor
    const res = await send('GET', url, token)
    expect(res.status, `${url}: ${JSON.stringify(res.body)}`).toBe(200)
    return res.body
  }
  const adminToken = () => app.jwt.sign({ id: adminId, role: 'admin' })
  const tokenOf = (id: string) => app.jwt.sign({ id, role: 'student' })

  const person = async (label: string, xp = 0, classId = f.classId) => {
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
      data: { classId, studentId: user.id, xp, nickname: `${label}-${tag}` },
    })
    return { id: user.id, enrollmentId: enrollment.id, name: user.name }
  }
  const setClass = (data: { settings?: object; rankingConfig?: object | null; archived?: boolean; deletedAt?: Date | null }) =>
    prisma.class.update({
      where: { id: f.classId },
      data: {
        ...(data.settings ? { settings: data.settings } : {}),
        ...(data.rankingConfig !== undefined
          ? { rankingConfig: data.rankingConfig === null ? Prisma.JsonNull : data.rankingConfig }
          : {}),
        ...(data.archived !== undefined ? { archived: data.archived } : {}),
        ...(data.deletedAt !== undefined ? { deletedAt: data.deletedAt } : {}),
      },
    })
  const newClass = async (data: { archived?: boolean; deletedAt?: Date } = {}) => {
    const cls = await prisma.class.create({
      data: {
        name: `Extra ${tag}`,
        teacherId: f.users.owner.id,
        invitationCode: randomUUID().slice(0, 6).toUpperCase(),
        ...data,
      },
    })
    madeClasses.push(cls.id)
    return cls.id
  }
  const completeMission = (studentId: string, missionId: string, at = new Date()) =>
    prisma.studentMissionProgress.create({ data: { studentId, missionId, completedAt: at, enigmasCompleted: 1 } })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
    f = await createClassFixture(app)
    const admin = await prisma.user.create({
      data: { email: `admin.${tag}@test.invalid`, passwordHash: 'x', name: 'Admin', role: 'admin', isOnboarded: true },
    })
    adminId = admin.id
    made.push(admin.id)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    ai.settings = null
    await setClass({ settings: {}, rankingConfig: null, archived: false, deletedAt: null })
    await prisma.studentBadge.deleteMany({ where: { studentId: { in: [f.users.student.id, ...made] } } })
    await prisma.badge.deleteMany({ where: { teacherId: null, name: `ITAKAI ${tag}` } })
    await prisma.badge.deleteMany({ where: { teacherId: f.users.owner.id } })
    await prisma.class.deleteMany({ where: { id: { in: madeClasses } } })
    madeClasses.length = 0
    await prisma.mission.deleteMany({ where: { classId: f.classId } })
    await prisma.classEnrollment.deleteMany({
      where: { classId: f.classId, studentId: { in: [...made, f.users.owner.id] } },
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: made } } })
    await f?.cleanup()
    await app?.close()
  })

  describe('1. el desempate por XP de las misiones', () => {
    /** Las filas con puesto, como [alias, puesto]: la del alumnado y la del profesorado. */
    const studentRows = async () => {
      const body = await get('student', `/students/classes/${f.classId}/ranking?type=missions`)
      expect(body.type).toBe('missions')
      return [...body.podium, ...body.leaderboard]
        .filter((r: { rank: number | null }) => r.rank !== null)
        .map((r: { username: string; rank: number }) => [r.username, r.rank])
    }
    const teacherRows = async () => {
      const body = await get('owner', `/teacher/classes/${f.classId}/ranking?type=missions`)
      expect(body.type).toBe('missions')
      return body.ranking
        .filter((r: { rank: number | null }) => r.rank !== null)
        .map((r: { username: string; rank: number }) => [r.username, r.rank])
    }
    const setup = async () => {
      const poor = await person('a-poca', 10)
      const rich = await person('b-mucha', 900)
      const m = await f.newMission()
      await f.newEnigma(m)
      for (const { id } of [poor, rich]) await completeMission(id, m)
    }
    const tied = [
      [`a-poca-${tag}`, 1],
      [`b-mucha-${tag}`, 1],
    ]

    it('sin el tipo XP, quien empata comparte puesto y va por alias, para el alumnado y para el profesorado', async () => {
      await setup()
      await setClass({ rankingConfig: { types: ['missions'] } })
      expect(await studentRows()).toEqual(tied)
      expect(await teacherRows()).toEqual(tied)
    })

    it('con el tipo XP a la vista del alumnado, la XP desempata', async () => {
      await setup()
      await setClass({ rankingConfig: { types: ['xp', 'missions'] } })
      const ordered = [
        [`b-mucha-${tag}`, 1],
        [`a-poca-${tag}`, 2],
      ]
      expect(await studentRows()).toEqual(ordered)
      expect(await teacherRows()).toEqual(ordered)
    })

    it('con la XP de la clase apagada o el ranking apagado, tampoco desempata', async () => {
      await setup()
      await setClass({ settings: { xp: false }, rankingConfig: { types: ['xp', 'missions'] } })
      expect(await studentRows()).toEqual(tied)
      expect(await teacherRows()).toEqual(tied)
      // Con el ranking apagado el alumnado no ve el de XP: el profesorado, el mismo orden.
      await setClass({ settings: { rankings: false }, rankingConfig: { types: ['xp', 'missions'] } })
      expect(await teacherRows()).toEqual(tied)
    })
  })

  it('2. el inicio del alumnado no cuenta las misiones de una clase archivada', async () => {
    const archived = await newClass()
    await prisma.classEnrollment.create({ data: { classId: archived, studentId: f.users.student.id } })
    const there = await f.newMission(archived)
    await f.newEnigma(there)
    await completeMission(f.users.student.id, there)
    const here = await f.newMission()
    await f.newEnigma(here)
    await completeMission(f.users.student.id, here)

    const before = (await get('student', '/students/profile/me')).profile.stats
    expect(before).toMatchObject({ classesEnrolled: 2, missionsCompleted: 2 })
    await prisma.class.update({ where: { id: archived }, data: { archived: true } })
    const after = (await get('student', '/students/profile/me')).profile.stats
    expect(after).toMatchObject({ classesEnrolled: 1, missionsCompleted: 1 })
  })

  it('3. la actividad por semanas no cuenta las completadas de una misión que no cuenta', async () => {
    const someone = await person('semanas', 5)
    const m = await f.newMission()
    await f.newEnigma(m)
    await completeMission(someone.id, m)
    const weeksOf = async (url: string) =>
      (await get('owner', url)).weeks.reduce((sum: number, w: { missionsCompleted: number }) => sum + w.missionsCompleted, 0)
    const classUrl = `/teacher/classes/${f.classId}/analytics?period=last7`
    const studentUrl = `/teacher/classes/${f.classId}/students/${someone.id}/analytics?period=last7`
    expect(await weeksOf(classUrl)).toBe(1)
    expect(await weeksOf(studentUrl)).toBe(1)

    await prisma.mission.update({ where: { id: m }, data: { status: 'bloqueada' } })
    expect(await weeksOf(classUrl)).toBe(0)
    expect(await weeksOf(studentUrl)).toBe(0)
    // Lo mismo que la fila de esa persona.
    const panel = await get('owner', classUrl)
    expect(panel.students.find((s: { id: string }) => s.id === someone.id).missionsCompleted).toBe(0)
  })

  describe('5. los alias', () => {
    // «Estudiante» y el nombre real de otra persona tienen su propio código: no es
    // que lo tenga alguien de alias, es que no se puede usar.
    const reserved = { status: 409, code: 'NICKNAME_RESERVED' }
    const taken = { status: 409, code: 'NICKNAME_TAKEN' }
    // Nombres cortos («Real cp …»): caben en un alias, como el de cualquiera.

    it('el alumnado no puede ponerse «Estudiante» ni el nombre real de otra persona de la clase', async () => {
      const other = await person('cp')
      const me = await person('yo')
      const put = async (nickname: string) => {
        const res = await send('PUT', `/students/classes/${f.classId}/profile`, tokenOf(me.id), { nickname })
        return { status: res.status, code: res.body?.code }
      }
      for (const nickname of ['Estudiante', 'ESTUDIANTE', '  estudiante  ']) {
        expect(await put(nickname), nickname).toEqual(reserved)
      }
      expect(await put(other.name)).toEqual(reserved)
      expect(await put(other.name.toUpperCase())).toEqual(reserved)
      // El alias de otra persona sigue siendo «ya lo tiene otra persona».
      expect(await put(`cp-${tag}`)).toEqual(taken)
      // El suyo, sí; y uno cualquiera, también.
      expect((await put(me.name)).status).toBe(200)
      expect((await put(`libre-${tag}`)).status).toBe(200)
      const stored = await prisma.classEnrollment.findUniqueOrThrow({ where: { id: me.enrollmentId } })
      expect(stored.nickname).toBe(`libre-${tag}`)
    })

    it('el profesorado tampoco se lo puede poner a nadie', async () => {
      const other = await person('co')
      const target = await person('ob')
      const patch = async (nickname: string) => {
        const res = await send('PATCH', `/teacher/classes/${f.classId}/students/${target.id}`, f.token('owner'), { nickname })
        return { status: res.status, code: res.body?.code }
      }
      expect(await patch('estudiante')).toEqual(reserved)
      expect(await patch(other.name)).toEqual(reserved)
      expect(await patch(`co-${tag}`)).toEqual(taken)
      expect((await patch(target.name)).status).toBe(200)
    })
  })

  describe('6. la clase cerrada', () => {
    const putClass = (payload: object) => send('PUT', `/teacher/classes/${f.classId}`, f.token('owner'), payload)

    it('archivada: las funcionalidades no se tocan (409), el contenido sí, y desarchivar sigue funcionando', async () => {
      await setClass({ settings: { rankings: true }, archived: true })
      const settings = await putClass({ settings: { rankings: false } })
      expect([settings.status, settings.body.code]).toEqual([409, 'CLASS_ARCHIVED'])
      const both = await putClass({ settings: { rankings: false }, rankingConfig: { mode: 'top' } })
      expect([both.status, both.body.code]).toEqual([409, 'CLASS_ARCHIVED'])
      const stored = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
      expect((stored.settings as { rankings?: boolean }).rankings).toBe(true)
      // El nombre es contenido: se edita archivada.
      const original = stored.name
      expect((await putClass({ name: `Renombrada ${tag}` })).status).toBe(200)
      await prisma.class.update({ where: { id: f.classId }, data: { name: original } })

      const unarchive = await send('PATCH', `/teacher/classes/${f.classId}/archive`, f.token('owner'), { archived: false })
      expect(unarchive.status).toBe(200)
      expect((await putClass({ settings: { rankings: false } })).status).toBe(200)
    })

    it('en la papelera: tampoco (409)', async () => {
      await setClass({ deletedAt: new Date() })
      const res = await putClass({ settings: { rankings: false } })
      expect([res.status, res.body.code]).toEqual([409, 'CLASS_IN_TRASH'])
    })

    it('al alumnado, las misiones y las insignias de una clase archivada se le cierran (404)', async () => {
      const urls = ['missions', 'badges'].map(path => `/students/classes/${f.classId}/${path}`)
      for (const url of urls) expect((await send('GET', url, f.token('student'))).status, url).toBe(200)
      await setClass({ archived: true })
      for (const url of urls) expect((await send('GET', url, f.token('student'))).status, url).toBe(404)
    })

    it('las misiones del profesorado: archivada se ven; en la papelera, 404', async () => {
      const url = `/teacher/classes/${f.classId}/missions`
      await setClass({ archived: true })
      expect((await send('GET', url, f.token('owner'))).status).toBe(200)
      await setClass({ archived: false, deletedAt: new Date() })
      expect((await send('GET', url, f.token('owner'))).status).toBe(404)
    })
  })

  it('8. los listados de misiones del alumnado dicen si la ha empezado, con la regla de «Mis resultados»', async () => {
    const student = f.users.student.id
    const mission = async () => {
      const id = await f.newMission()
      return { id, enigma: await f.newEnigma(id) }
    }
    // Una pista usada, sin nada aprobado: empezada (el mapa decía «Disponible»).
    const hinted = await mission()
    const hint = await f.newHint(hinted.id)
    await prisma.missionHintUse.create({
      data: { hintId: hint, missionId: hinted.id, studentId: student, costType: 'coins', cost: 5 },
    })
    // Una entrega sin revisar: empezada.
    const submitted = await mission()
    await f.newSubmission(submitted.enigma)
    // Un enigma aprobado de dos: empezada.
    const approved = await mission()
    await f.newEnigma(approved.id)
    await prisma.studentEnigmaProgress.create({ data: { studentId: student, enigmaId: approved.enigma } })
    // Nada, o una fila de progreso vacía: sin empezar.
    const untouched = await mission()
    const emptyRow = await mission()
    await prisma.studentMissionProgress.create({ data: { studentId: student, missionId: emptyRow.id } })

    const expected: Record<string, boolean> = {
      [hinted.id]: true,
      [submitted.id]: true,
      [approved.id]: true,
      [untouched.id]: false,
      [emptyRow.id]: false,
    }
    for (const url of [`/students/classes/${f.classId}/missions`, '/students/missions', '/missions']) {
      const { missions } = await get('student', url)
      const started = Object.fromEntries(
        missions
          .filter((m: { id: string }) => m.id in expected)
          .map((m: { id: string; started: boolean }) => [m.id, m.started])
      )
      expect(started, url).toEqual(expected)
    }
    // Lo mismo que «Mis resultados»: empezada es «En curso».
    const { missions } = await get('student', `/students/classes/${f.classId}/progress`)
    for (const row of missions.filter((m: { id: string }) => m.id in expected)) {
      expect(row.state === 'in_progress', row.id).toBe(expected[row.id])
    }
  })

  it('10. el listado del profesorado cuenta las insignias conseguidas, con las de ITAKAI, sin «de N»', async () => {
    const m = await f.newMission()
    const own = await prisma.badge.create({ data: { name: 'De la misión', teacherId: f.users.owner.id, missionId: m } })
    await prisma.badge.create({ data: { name: 'Sin conseguir', teacherId: f.users.owner.id, missionId: m } })
    const itakai = await prisma.badge.create({ data: { name: `ITAKAI ${tag}` } })
    await prisma.studentBadge.createMany({
      data: [own.id, itakai.id].map(badgeId => ({ studentId: f.users.student.id, badgeId })),
    })
    for (const url of [`/teacher/students?classId=${f.classId}`, '/teacher/students?limit=100']) {
      const { students } = await get('owner', url)
      const row = students.find((s: { id: string }) => s.id === f.users.student.id)
      expect(row.totalBadgesEarned, url).toBe(2)
      expect(row, url).not.toHaveProperty('totalBadgesAvailable')
      expect(row, url).not.toHaveProperty('badgesEarned')
    }
  })

  describe('4, 11 y 12. las estadísticas de la administración', () => {
    const analytics = async (period = 'month') =>
      (await get(adminToken(), `/admin/analytics?period=${period}`)).analytics

    /**
     * Cuánto cambia `read` al hacer `change`. Las cifras son de toda la instancia y
     * otras pruebas escriben a la vez: si se mueven por otra cosa, se repite.
     */
    const delta = async (read: () => Promise<number>, change: () => Promise<unknown>, undo: () => Promise<unknown>) => {
      let last = Number.NaN
      for (let attempt = 0; attempt < 3; attempt++) {
        const before = await read()
        await change()
        const after = await read()
        last = after - before
        const back = (await undo(), await read())
        if (back === before) return last
      }
      return last
    }

    it('responden sin sondear la IA, con claves en vez de textos y colores, y sin «Conv. por cuenta»', async () => {
      const fetchSpy = vi.fn().mockRejectedValue(new Error('sin red'))
      vi.stubGlobal('fetch', fetchSpy)
      for (const period of ['week', 'month', 'quarter']) {
        const body = await analytics(period)
        expect(fetchSpy).not.toHaveBeenCalled()
        expect(body).not.toHaveProperty('serviceHealth')
        expect(body.aiUsage).not.toHaveProperty('avgConversationsPerUser')
        const keys = keysOf(body)
        expect(keys.has('label'), period).toBe(false)
        expect(keys.has('color'), period).toBe(false)
        expect(JSON.stringify(body)).not.toMatch(/#[0-9A-Fa-f]{6}/)
        for (const list of [body.usersByRole, body.missionsByStatus, body.missionsByRarity, body.aiUsage.messagesByAssistant]) {
          for (const item of list) {
            expect(Object.keys(item).sort()).toEqual(['key', 'percentage', 'value'])
            expect(item.key).toMatch(/^[a-z_]+$/)
          }
        }
        expect(body.usersByRole.map((r: { key: string }) => r.key)).toContain('admin')
        for (const series of [body.newUsersSeries, body.activitySeries, body.aiUsage.messagesSeries]) {
          for (const point of series) {
            expect(Object.keys(point).sort()).toEqual(['start', 'value'])
            expect(point.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          }
        }
      }
    })

    it('las misiones completadas: la definición única, sin bloqueadas, vista previa ni papelera', async () => {
      // En el trimestre anterior (de hace 180 a hace 90 días), donde no escribe nadie más.
      const at = new Date(Date.now() - 150 * DAY)
      const someone = await person('kpi', 5)
      // Cuenta: todos sus obligatorios aprobados, aunque no tenga la fila completada.
      const counted = await f.newMission()
      const enigma = await f.newEnigma(counted)
      // No cuentan: una bloqueada, una sin enigmas, la vista previa y la papelera.
      const blocked = await f.newMission()
      await f.newEnigma(blocked)
      await prisma.mission.update({ where: { id: blocked }, data: { status: 'bloqueada' } })
      const empty = await f.newMission()
      await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: f.users.owner.id, isPreview: true } })
      const trashed = await newClass({ deletedAt: new Date() })
      const inTrash = await f.newMission(trashed)
      await f.newEnigma(inTrash)
      await prisma.classEnrollment.create({ data: { classId: trashed, studentId: someone.id } })

      const previous = async () => (await analytics('quarter')).kpis.missionsCompleted.previous
      const change = async () => {
        await prisma.studentEnigmaProgress.create({ data: { studentId: someone.id, enigmaId: enigma, completedAt: at } })
        await prisma.studentEnigmaProgress.create({ data: { studentId: f.users.owner.id, enigmaId: enigma, completedAt: at } })
        await prisma.studentMissionProgress.createMany({
          data: [
            { studentId: someone.id, missionId: blocked, completedAt: at },
            { studentId: someone.id, missionId: empty, completedAt: at },
            { studentId: f.users.owner.id, missionId: counted, completedAt: at },
            { studentId: someone.id, missionId: inTrash, completedAt: at },
          ],
        })
      }
      const undo = async () => {
        await prisma.studentEnigmaProgress.deleteMany({ where: { enigmaId: enigma } })
        await prisma.studentMissionProgress.deleteMany({ where: { missionId: { in: [blocked, empty, counted, inTrash] } } })
      }
      expect(await delta(previous, change, undo)).toBe(1)
    })

    it('por revisar: sin la vista previa, sin quien ya no está y sin la papelera, también en el resumen', async () => {
      const someone = await person('revisar', 5)
      const gone = await person('se-fue', 5)
      const m = await f.newMission()
      const enigma = await f.newEnigma(m)
      const done = await f.newEnigma(m)
      await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: f.users.owner.id, isPreview: true } })
      await prisma.classEnrollment.delete({ where: { id: gone.enrollmentId } })
      const trashed = await newClass({ deletedAt: new Date() })
      const inTrash = await f.newEnigma(await f.newMission(trashed))
      await prisma.classEnrollment.create({ data: { classId: trashed, studentId: someone.id } })
      await prisma.studentEnigmaProgress.create({ data: { studentId: someone.id, enigmaId: done } })

      const change = () =>
        prisma.enigmaSubmission.createMany({
          data: [
            // La única que espera revisión.
            { studentId: someone.id, enigmaId: enigma },
            // Atascada (ya aprobado), vista previa, quien ya no está y papelera.
            { studentId: someone.id, enigmaId: done },
            { studentId: f.users.owner.id, enigmaId: enigma },
            { studentId: gone.id, enigmaId: enigma },
            { studentId: someone.id, enigmaId: inTrash },
          ],
        })
      const undo = () => prisma.enigmaSubmission.deleteMany({ where: { enigmaId: { in: [enigma, done, inTrash] } } })
      const inAnalytics = async () => (await analytics('week')).overview.pendingSubmissions
      const inDashboard = async () => (await get(adminToken(), '/admin/stats')).stats.pendingSubmissions
      expect(await delta(inAnalytics, change, undo)).toBe(1)
      expect(await delta(inDashboard, change, undo)).toBe(1)
    })

    describe('el estado de los servicios, en su propia ruta', () => {
      const services = async () => {
        const body = await get(adminToken(), '/admin/analytics/services')
        return Object.fromEntries(
          body.services.map((s: { key: string; status: string; latencyMs: number | null }) => [s.key, s])
        )
      }
      const endpoint = (baseUrl: string) => ({ baseUrl, apiKey: 'clave', model: 'modelo' })

      it('solo para la administración', async () => {
        expect((await send('GET', '/admin/analytics/services', f.token('owner'))).status).toBe(403)
      })

      it('cada servicio con su propia medida: con el endpoint compartido, la de imágenes no se mide', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ services: [{ status: 'ok' }] }))))
        ai.settings = { text: endpoint('http://ia.invalid'), image: endpoint('http://ia.invalid') }
        const shared = await services()
        expect(Object.keys(shared)).toEqual(['database', 'ai_text', 'ai_image'])
        expect(shared.database.latencyMs).toBeTypeOf('number')
        expect(shared.ai_text).toMatchObject({ status: 'operational', latencyMs: expect.any(Number) })
        expect(shared.ai_image).toEqual({ key: 'ai_image', status: 'operational', latencyMs: null })

        ai.settings = { text: endpoint('http://ia.invalid'), image: endpoint('http://imagenes.invalid') }
        const apart = await services()
        expect(apart.ai_image).toMatchObject({ status: 'operational', latencyMs: expect.any(Number) })
      })

      it('lo que no responde, caído y sin latencia', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))
        ai.settings = { text: endpoint('http://ia.invalid'), image: endpoint('http://imagenes.invalid') }
        const down = await services()
        expect(down.ai_text).toEqual({ key: 'ai_text', status: 'down', latencyMs: null })
        expect(down.ai_image).toEqual({ key: 'ai_image', status: 'down', latencyMs: null })
      })
    })
  })
})
