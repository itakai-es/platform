import { it, expect, vi, beforeAll, afterAll, afterEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * La comparación anónima con la media (F1, entrega 7), de punta a punta por las
 * rutas que la sirven: `GET …/progress` y, en los modos que recortan, `GET …/ranking`.
 * El grupo se mueve por prueba y las cifras se pueden sacar a mano. Recorre el JSON
 * para comprobar que no viaja nada de nadie. Necesita TEST_DATABASE_URL (ver
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

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { Prisma } from '../../src/generated/prisma/client.js'
import type { ComparisonMetric } from '../../src/modules/analytics/comparison.js'

interface Person {
  accountId: string
  enrollmentId: string
  alias: string
  name: string
  xp: number
}

/** Todas las hojas y todas las claves de una respuesta. */
function walk(value: unknown, leaves: unknown[] = [], keys: Set<string> = new Set()) {
  if (Array.isArray(value)) value.forEach(item => walk(item, leaves, keys))
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      keys.add(key)
      walk(inner, leaves, keys)
    }
  } else leaves.push(value)
  return { leaves, keys }
}

describeWithDatabase('la comparación anónima con la media', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const people: Person[] = []
  let created = 0
  let me: Person

  const get = async (url: string, token: string) => {
    const res = await app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode, res.body).toBe(200)
    return res.json()
  }
  const tokenOf = (id: string) => app.jwt.sign({ id, role: 'student' })
  const progress = (token = f.token('student')) => get(`/students/classes/${f.classId}/progress`, token)
  const ranking = (query = '', token = f.token('student')) =>
    get(`/students/classes/${f.classId}/ranking${query}`, token)
  const metric = (body: { metrics: ComparisonMetric[] }, key: ComparisonMetric['key']) =>
    body.metrics.find(m => m.key === key)

  const setClass = (data: { settings?: object; rankingConfig?: object | null }) =>
    prisma.class.update({
      where: { id: f.classId },
      data: {
        ...(data.settings ? { settings: data.settings } : {}),
        ...(data.rankingConfig !== undefined
          ? { rankingConfig: data.rankingConfig === null ? Prisma.JsonNull : data.rankingConfig }
          : {}),
      },
    })

  const addPerson = async (xp: number) => {
    const label = `p${++created}`
    const alias = `${label}-${tag}`
    const name = `Nombre real ${label} ${tag}`
    const user = await prisma.user.create({
      data: {
        email: `${label}.${tag}@test.invalid`,
        passwordHash: 'x',
        name,
        role: 'student',
        isOnboarded: true,
      },
    })
    const enrollment = await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: user.id, xp, nickname: alias },
    })
    const person = { accountId: user.id, enrollmentId: enrollment.id, alias, name, xp }
    people.push(person)
    return person
  }

  /** Deja en la clase, además de quien mira, a estas personas con estas XP. */
  const group = async (xps: number[]) => {
    await prisma.classEnrollment.deleteMany({
      where: { classId: f.classId, id: { not: me.enrollmentId } },
    })
    await prisma.user.deleteMany({ where: { id: { in: people.map(p => p.accountId) } } })
    people.length = 0
    return Promise.all(xps.map(addPerson))
  }

  const setMyXp = (xp: number) =>
    prisma.classEnrollment.update({ where: { id: me.enrollmentId }, data: { xp } })

  /** Una misión que cuenta y, para estas personas, completada `at`. */
  const completedMission = async (accounts: string[], at = new Date()) => {
    const mission = await f.newMission()
    await f.newEnigma(mission)
    if (accounts.length) {
      await prisma.studentMissionProgress.createMany({
        data: accounts.map(studentId => ({ studentId, missionId: mission, completedAt: at })),
      })
    }
    return mission
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
    const enrollment = await prisma.classEnrollment.update({
      where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
      data: { xp: 57, nickname: `yo-${tag}` },
    })
    me = {
      accountId: f.users.student.id,
      enrollmentId: enrollment.id,
      alias: `yo-${tag}`,
      name: '',
      xp: 57,
    }
  })

  afterEach(async () => {
    await setClass({ settings: {}, rankingConfig: null })
    await setMyXp(57)
    await prisma.studentMissionProgress.deleteMany({ where: { mission: { classId: f.classId } } })
    await prisma.mission.deleteMany({ where: { classId: f.classId } })
    await prisma.classEnrollment.deleteMany({
      where: { classId: f.classId, studentId: f.users.owner.id },
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: people.map(p => p.accountId) } } })
    await f?.cleanup()
    await app?.close()
  })

  describe('el umbral', () => {
    it('con 5 personas en total no hay media ni banda; con 6, sí', async () => {
      await group([10, 20, 30, 40])
      const five = (await progress()).comparison
      expect(metric(five, 'xp')).toEqual({
        key: 'xp',
        outOf: null,
        value: 57,
        average: null,
        band: null,
        reason: 'small_class',
      })

      await group([10, 20, 30, 40, 50])
      const six = (await progress()).comparison
      expect(metric(six, 'xp')).toEqual({
        key: 'xp',
        outOf: null,
        value: 57,
        average: 30,
        band: 'above',
        reason: null,
      })
    })

    it('la cuenta sin estrenar no cuenta en el grupo, ni la vista previa', async () => {
      const others = await group([10, 20, 30, 40, 50])
      // La quinta pasa a ser una cuenta sin estrenar: quedan cuatro.
      await prisma.user.update({
        where: { id: others[4]!.accountId },
        data: { accountType: 'managed', username: `sin-estrenar-${tag}`, email: null },
      })
      await prisma.classEnrollment.create({
        data: { classId: f.classId, studentId: f.users.owner.id, isPreview: true, xp: 99999 },
      })
      expect(metric((await progress()).comparison, 'xp')!.reason).toBe('small_class')
    })
  })

  describe('la media', () => {
    it('excluye a quien mira', async () => {
      await group([100, 100, 100, 100, 100])
      // Con ella dentro saldría 240; la de los demás es 100.
      await setMyXp(900)
      expect(metric((await progress()).comparison, 'xp')).toMatchObject({
        value: 900,
        average: 100,
        band: 'above',
      })
    })

    it('la XP va a la decena y las misiones a la unidad; lo propio, exacto', async () => {
      const others = await group([41, 42, 43, 44, 45, 46])
      await setMyXp(57)
      await completedMission(others.slice(0, 3).map(p => p.accountId))
      await completedMission(others.slice(0, 2).map(p => p.accountId))
      await completedMission([others[0]!.accountId, me.accountId])
      const { comparison } = await progress()
      // XP: 43,5 → 40. Misiones: (3 + 2 + 1) / 6 = 1 exacta.
      expect(metric(comparison, 'xp')).toMatchObject({ value: 57, average: 40, band: 'above' })
      expect(metric(comparison, 'missions')).toMatchObject({
        value: 1,
        outOf: 3,
        average: 1,
        band: 'at',
      })
    })

    it('las misiones son las de la definición única: bloqueadas y sin enigmas no cuentan', async () => {
      const others = await group([1, 2, 3, 4, 5])
      const everyone = [...others.map(p => p.accountId), me.accountId]
      await completedMission(everyone)
      const blocked = await completedMission(everyone)
      await prisma.mission.update({ where: { id: blocked }, data: { status: 'bloqueada' } })
      const empty = await f.newMission()
      await prisma.studentMissionProgress.createMany({
        data: everyone.map(studentId => ({ studentId, missionId: empty, completedAt: new Date() })),
      })
      const body = await progress()
      expect(metric(body.comparison, 'missions')).toMatchObject({ value: 1, outOf: 1, average: 1 })
      expect(body.summary.missionsCompleted).toBe(1)
      expect(body.summary.missionsCounted).toBe(1)
    })

    it('dos estudiantes restando sus medias no sacan la diferencia exacta de sus valores', async () => {
      const others = await group([117, 40, 55, 60, 75])
      await setMyXp(103)
      const a = metric((await progress()).comparison, 'xp')!
      const b = metric((await progress(tokenOf(others[0]!.accountId))).comparison, 'xp')!
      expect([a.value, b.value]).toEqual([103, 117])
      // Exactas serían 69,4 y 66,6, y (69,4 − 66,6) × 5 = 14, la diferencia. Las dos dan 70.
      expect(a.average).toBe(70)
      expect(b.average).toBe(70)
      expect((a.average! - b.average!) * 5).not.toBe(b.value - a.value)
    })
  })

  describe('la temporada', () => {
    it('sin temporada no sale; con una empezada, cuenta desde entonces', async () => {
      const others = await group([1, 2, 3, 4, 5])
      const before = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      await completedMission(others.map(p => p.accountId), before)
      expect(metric((await progress()).comparison, 'season_missions')).toBeUndefined()

      await setClass({
        rankingConfig: { seasonStartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      })
      await completedMission([...others.slice(0, 3).map(p => p.accountId), me.accountId])
      const { comparison } = await progress()
      // Las dos misiones, para el resto: (2+2+2+1+1) / 5 = 1,6 → 2. Yo, 1.
      expect(metric(comparison, 'missions')).toMatchObject({ value: 1, outOf: 2, average: 2, band: 'below' })
      // Solo la de la temporada: 3 / 5 = 0,6 → 1. Yo, 1.
      expect(metric(comparison, 'season_missions')).toMatchObject({
        value: 1,
        outOf: 2,
        average: 1,
        band: 'at',
      })
    })
  })

  describe('«los N primeros»', () => {
    it('con menos de 5 ocultos solo sale la banda; con 5, también la media', async () => {
      await completedMission([me.accountId])
      await group([10, 20, 30, 40, 50, 60, 70, 80])
      await setMyXp(5)
      await setClass({ rankingConfig: { mode: 'top', topN: 5, types: ['xp'] } })
      // Ocultos: 8 − 5 = 3. Solo la banda.
      const few = (await progress()).comparison
      expect(metric(few, 'xp')).toEqual({
        key: 'xp',
        outOf: null,
        value: 5,
        average: null,
        band: 'below',
        reason: 'band_only',
      })

      // Ocultos: 8 − 3 = 5. La media entera.
      await setClass({ rankingConfig: { mode: 'top', topN: 3, types: ['xp'] } })
      expect(metric((await progress()).comparison, 'xp')).toMatchObject({
        value: 5,
        average: 50,
        band: 'below',
        reason: null,
      })
    })

    it('se cuentan todas las vistas: quien sale entre los primeros por misiones ya no está oculto', async () => {
      const others = await group([10, 20, 30, 40, 50, 60, 70, 80])
      await setClass({ rankingConfig: { mode: 'top', topN: 3, types: ['xp', 'missions'] } })
      // Por XP se ven los tres últimos; por misiones, tres de los otros: ocultos, 8 − 6.
      await completedMission(others.slice(0, 3).map(p => p.accountId))
      expect(metric((await progress()).comparison, 'xp')).toMatchObject({
        average: null,
        reason: 'band_only',
      })
    })

    it('quien mira no cuenta entre los ocultos, salga o no en la lista', async () => {
      await group([10, 20, 30, 40, 50, 60])
      await setMyXp(1000)
      await setClass({ rankingConfig: { mode: 'top', topN: 3, types: ['xp'] } })
      // Yo y dos más arriba: del resto (6) se ven 2 y se ocultan 4.
      expect(metric((await progress()).comparison, 'xp')!.reason).toBe('band_only')
    })

    it('con el ranking apagado no se ve a nadie, y da igual el modo', async () => {
      await group([10, 20, 30, 40, 50])
      await setClass({
        settings: { rankings: false },
        rankingConfig: { mode: 'top', topN: 3, types: ['xp'], compare: true },
      })
      expect(metric((await progress()).comparison, 'xp')).toMatchObject({ average: 30, reason: null })
    })
  })

  describe('el interruptor', () => {
    it('sin guardar, sigue al ranking de la clase', async () => {
      await group([10, 20, 30, 40, 50])
      expect((await progress()).comparison).not.toBeNull()
      await setClass({ settings: { rankings: false } })
      expect((await progress()).comparison).toBeNull()
    })

    it('apagado, no viaja nada, tampoco en el ranking', async () => {
      await group([10, 20, 30, 40, 50])
      await setClass({ rankingConfig: { mode: 'position', compare: false } })
      expect((await progress()).comparison).toBeNull()
      const body = await ranking()
      expect(body.comparison).toBeNull()
      const { keys } = walk(body)
      expect(keys.has('average')).toBe(false)
      expect(keys.has('band')).toBe(false)
    })

    it('es independiente del ranking: con el ranking apagado se puede tener encendida', async () => {
      await group([10, 20, 30, 40, 50])
      await setClass({ settings: { rankings: false }, rankingConfig: { compare: true } })
      expect(metric((await progress()).comparison, 'xp')).toMatchObject({ average: 30 })
      await setClass({ settings: { rankings: true }, rankingConfig: { compare: false } })
      expect((await progress()).comparison).toBeNull()
    })

    it('el profesorado lo guarda, y se queda aunque cambie otra opción', async () => {
      await group([10, 20, 30, 40, 50])
      const put = (rankingConfig: object) =>
        app.inject({
          method: 'PUT',
          url: `/teacher/classes/${f.classId}`,
          payload: { rankingConfig },
          headers: { authorization: `Bearer ${f.token('owner')}` },
        })
      const saved = await put({ compare: false })
      expect(saved.statusCode, saved.body).toBe(200)
      expect(saved.json().class.rankingConfig.compare).toBe(false)
      expect((await put({ mode: 'top' })).json().class.rankingConfig).toMatchObject({
        mode: 'top',
        compare: false,
      })
      expect((await progress()).comparison).toBeNull()
      // Solo verdadero o falso: lo demás no es un valor.
      expect((await put({ compare: 'sí' })).statusCode).toBe(400)
    })
  })

  describe('clases sin XP', () => {
    it('no sale la XP, y sí las misiones', async () => {
      const others = await group([10, 20, 30, 40, 50])
      await completedMission(others.map(p => p.accountId))
      await setClass({ settings: { xp: false, rankings: false }, rankingConfig: { compare: true } })
      const { comparison } = await progress()
      expect(comparison.metrics.map((m: ComparisonMetric) => m.key)).toEqual(['missions'])
      expect(metric(comparison, 'missions')).toMatchObject({ value: 0, outOf: 1, average: 1, band: 'below' })
    })

    it('sin XP ni misiones que cuenten no hay nada que comparar', async () => {
      await group([10, 20, 30, 40, 50])
      await setClass({ settings: { xp: false, rankings: false }, rankingConfig: { compare: true } })
      expect((await progress()).comparison).toEqual({ metrics: [] })
    })
  })

  describe('la vista previa', () => {
    it('ve su propio valor frente al grupo real y no cuenta en la media de nadie', async () => {
      await group([10, 20, 30, 40, 50])
      await setMyXp(30)
      const preview = await prisma.classEnrollment.create({
        data: { classId: f.classId, studentId: f.users.owner.id, isPreview: true, xp: 99999 },
      })
      const own = (await progress(f.token('owner'))).comparison
      // Su valor frente a las 6 de verdad: (10+20+30+40+50+30) / 6 = 30.
      expect(metric(own, 'xp')).toMatchObject({ value: 99999, average: 30, band: 'above' })
      // Y en la de quien mira de verdad, ni rastro de sus 99999.
      expect(metric((await progress()).comparison, 'xp')).toMatchObject({ value: 30, average: 30 })
      await prisma.classEnrollment.delete({ where: { id: preview.id } })
    })
  })

  describe('el ranking del alumnado', () => {
    /** Ninguna media de la clase, en ningún modo: solo la comparación anónima. */
    const NO_STATS = ['stats', 'totalXp', 'avgXp', 'avgProgress', 'avgMissions']

    it('en `full`, sin medias: la misma comparación que en «Mi progreso»', async () => {
      await group([10, 20, 30, 40, 50])
      const body = await ranking()
      for (const key of NO_STATS) expect(walk(body).keys.has(key), key).toBe(false)
      expect(metric(body.comparison, 'xp')).toMatchObject({ value: 57, average: 30, reason: null })
      expect(body.comparison).toEqual((await progress()).comparison)
    })

    it('en `top` y `position`, sin medias ni total, con la comparación', async () => {
      await group([10, 20, 30, 40, 50, 60, 70, 80])
      await setClass({ rankingConfig: { mode: 'position', types: ['xp'] } })
      const position = await ranking()
      for (const key of NO_STATS) expect(walk(position).keys.has(key), key).toBe(false)
      expect(metric(position.comparison, 'xp')).toMatchObject({ average: 50, reason: null })
      expect(position.comparison).toEqual((await progress()).comparison)

      await setClass({ rankingConfig: { mode: 'top', topN: 5, types: ['xp'] } })
      const top = await ranking()
      for (const key of NO_STATS) expect(walk(top).keys.has(key), key).toBe(false)
      expect(metric(top.comparison, 'xp')).toMatchObject({ average: null, reason: 'band_only' })
      expect(top.comparison).toEqual((await progress()).comparison)
    })

    it('con la comparación apagada, null en todos los modos, y tampoco hay medias', async () => {
      await group([10, 20, 30, 40, 50])
      for (const mode of ['full', 'top', 'position']) {
        await setClass({ rankingConfig: { mode, topN: 3, types: ['xp'], compare: false } })
        const body = await ranking()
        expect(body.comparison, mode).toBeNull()
        expect(body, mode).not.toHaveProperty('stats')
      }
      expect((await progress()).comparison).toBeNull()
    })

    it('el profesorado sigue viendo su XP total', async () => {
      await group([10, 20, 30, 40, 50])
      const body = await get(`/teacher/classes/${f.classId}/ranking`, f.token('owner'))
      expect(body.stats.totalXp).toBe(10 + 20 + 30 + 40 + 50 + 57)
      expect(body).not.toHaveProperty('comparison')
    })
  })

  describe('lo que viaja', () => {
    /** Ni ids, ni alias, ni nombres, ni XP exactas de nadie, ni recuentos del grupo. */
    const expectNothingOfOthers = (body: unknown, others: Person[]) => {
      const { leaves, keys } = walk(body)
      const text = JSON.stringify(body)
      for (const person of others) {
        expect(text).not.toContain(person.accountId)
        expect(text).not.toContain(person.enrollmentId)
        expect(text).not.toContain(person.alias)
        expect(text).not.toContain(person.name)
        expect(leaves).not.toContain(person.xp)
      }
      for (const key of ['total', 'totalXp', 'sum', 'count', 'comparedWith', 'others', 'students']) {
        expect(keys.has(key), key).toBe(false)
      }
    }

    it('en «Mi progreso», ninguna cifra de nadie más', async () => {
      const others = await group([11, 22, 33, 44, 55])
      await completedMission(others.map(p => p.accountId))
      const { comparison } = await progress()
      expectNothingOfOthers(comparison, others)
      expect(Object.keys(comparison)).toEqual(['metrics'])
      for (const figure of comparison.metrics) {
        expect(Object.keys(figure).sort()).toEqual(['average', 'band', 'key', 'outOf', 'reason', 'value'])
      }
      // La respuesta entera, sin nombres ni ids de nadie.
      const text = JSON.stringify(await progress())
      for (const person of others) {
        expect(text).not.toContain(person.accountId)
        expect(text).not.toContain(person.enrollmentId)
        expect(text).not.toContain(person.alias)
        expect(text).not.toContain(person.name)
      }
    })

    it('en el ranking `full`, la comparación tampoco, y no van las medias de la clase', async () => {
      const others = await group([11, 22, 33, 44, 55])
      await setClass({ rankingConfig: { mode: 'full', types: ['xp'] } })
      const body = await ranking()
      expectNothingOfOthers(body.comparison, others)
      const { keys } = walk(body)
      for (const key of ['stats', 'totalXp', 'avgXp', 'avgProgress', 'avgMissions']) {
        expect(keys.has(key), key).toBe(false)
      }
    })

    it('en el ranking `position`, tampoco', async () => {
      const others = await group([11, 22, 33, 44, 55])
      await setClass({ rankingConfig: { mode: 'position', types: ['xp'] } })
      const body = await ranking()
      const { total: _total, options: _options, ...rest } = body
      expectNothingOfOthers(rest, others)
    })

    it('con la clase pequeña no se dice ni cuánta gente falta', async () => {
      const others = await group([11, 22])
      const { comparison } = await progress()
      expectNothingOfOthers(comparison, others)
      expect(JSON.stringify(comparison)).not.toMatch(/"(average|band)":[^n]/)
    })
  })
})
