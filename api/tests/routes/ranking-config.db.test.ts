import { it, expect, vi, beforeAll, afterAll, afterEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * El ranking configurable (entregas 5 y 6 del bloque 6): lo que recibe el
 * alumnado en cada modo, recorriendo el JSON para comprobar que no viaja nada de
 * quien no debe salir; los tipos, los periodos y los empates; y que duplicar e
 * importar llevan la configuración. No hay temporadas: su ruta no existe y la fecha
 * que dejara guardada una versión anterior se ignora. Necesita TEST_DATABASE_URL
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

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { studentAvatarColor } from '../../src/utils/avatars.js'
import { RANKING_TOP_SIZES } from '../../src/utils/ranking-config.js'
import { Prisma } from '../../src/generated/prisma/client.js'

interface Person {
  label: string
  accountId: string
  enrollmentId: string
  alias: string
  xp: number
}

interface Row {
  id: string
  username: string
  rank: number | null
  score: number
  xp?: number
  level?: number
  missionsCompleted: number
  avatarColor: string
  isCurrentUser?: boolean
}

/** Todas las hojas de una respuesta: cadenas y números. */
function leaves(value: unknown, into: unknown[] = []): unknown[] {
  if (Array.isArray(value)) value.forEach(item => leaves(item, into))
  else if (value && typeof value === 'object') {
    Object.values(value).forEach(item => leaves(item, into))
  } else into.push(value)
  return into
}

describeWithDatabase('el ranking configurable', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const extraUsers: string[] = []
  const people: Record<string, Person> = {}
  let me: Person

  type Method = 'GET' | 'POST' | 'PUT' | 'PATCH'
  const send = (method: Method, url: string, token: string, payload?: unknown) =>
    app.inject({
      method,
      url,
      payload: payload as Record<string, unknown> | undefined,
      headers: { authorization: `Bearer ${token}` },
    })
  const tokenOf = (id: string, role: 'student' | 'teacher' = 'student') => app.jwt.sign({ id, role })
  const owner = () => f.token('owner')
  const studentUrl = (query = '') => `/students/classes/${f.classId}/ranking${query}`
  const teacherUrl = (suffix = '') => `/teacher/classes/${f.classId}/ranking${suffix}`
  const asStudent = async (query = '', token = f.token('student')) => {
    const res = await send('GET', studentUrl(query), token)
    expect(res.statusCode, res.body).toBe(200)
    return res.json()
  }
  const asTeacher = async (query = '') => {
    const res = await send('GET', teacherUrl(query), owner())
    expect(res.statusCode, res.body).toBe(200)
    return res.json()
  }

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

  const newPerson = async (label: string, xp: number) => {
    const alias = `${label}-${tag}`
    const user = await prisma.user.create({
      data: {
        email: `${label}.${tag}@test.invalid`,
        passwordHash: 'x',
        name: `Nombre real ${label} ${tag}`,
        role: 'student',
        isOnboarded: true,
      },
    })
    extraUsers.push(user.id)
    const enrollment = await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: user.id, xp, nickname: alias },
    })
    people[label] = { label, accountId: user.id, enrollmentId: enrollment.id, alias, xp }
    return people[label]!
  }

  /** Lo de esta persona no viaja en la respuesta: ni ids, ni alias, ni XP, ni nombre. */
  const expectAbsent = (body: unknown, labels: string[]) => {
    const all = leaves(body)
    for (const label of labels) {
      const person = people[label]!
      expect(all, `id de la matrícula de ${label}`).not.toContain(person.enrollmentId)
      expect(all, `id de la cuenta de ${label}`).not.toContain(person.accountId)
      expect(all, `alias de ${label}`).not.toContain(person.alias)
      // El 0 no dice nada: lo tiene cualquiera.
      if (person.xp > 0) expect(all, `XP de ${label}`).not.toContain(person.xp)
      expect(JSON.stringify(body)).not.toContain(`Nombre real ${label}`)
    }
  }

  const expectNoAccountIds = (body: unknown) => {
    const text = JSON.stringify(body)
    for (const person of Object.values(people)) expect(text).not.toContain(person.accountId)
    expect(text).not.toContain(f.users.student.id)
    expect(text).not.toContain(f.users.owner.id)
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
    // XP con cifras que no se pueden confundir con otras de la respuesta.
    await newPerson('ana', 5101) // 1.º
    await newPerson('bea', 4102) // 2.º
    await newPerson('ciro', 3103) // 3.º
    await newPerson('dani', 3103) // 3.º, empatado
    await newPerson('eva', 2104) // 5.º
    await newPerson('fito', 1105) // 6.º
    await newPerson('cero', 0) // Sin puesto
    const enrollment = await prisma.classEnrollment.update({
      where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
      data: { xp: 57, nickname: `yo-${tag}` },
    })
    me = {
      label: 'yo',
      accountId: f.users.student.id,
      enrollmentId: enrollment.id,
      alias: `yo-${tag}`,
      xp: 57,
    }
  })

  afterEach(async () => {
    await setClass({ settings: {}, rankingConfig: null })
    await prisma.teamSet.deleteMany({ where: { classId: f.classId } })
    await prisma.studentMissionProgress.deleteMany({ where: { mission: { classId: f.classId } } })
    await prisma.mission.deleteMany({ where: { classId: f.classId } })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await f?.cleanup()
    await app?.close()
  })

  describe('sin configuración: como hoy', () => {
    it('XP, completo, con medias; y el profesorado recibe lo mismo con su aviso', async () => {
      const body = await asStudent()
      expect(body.type).toBe('xp')
      expect(body.period).toBe('all')
      expect(body.options).toMatchObject({
        types: ['xp'],
        periods: ['all'],
        mode: 'full',
        usesXp: true,
      })
      expect(body.options).not.toHaveProperty('seasonStartedAt')
      expect(body.podium.map((r: Row) => r.username)).toEqual([
        people.ana!.alias,
        people.bea!.alias,
        people.ciro!.alias,
      ])
      expect(body.leaderboard).toHaveLength(5)
      expect(body.total).toBe(8)
      // Ni en el modo completo van las medias de la clase: solo la comparación.
      expect(body).not.toHaveProperty('stats')
      expect(body.me.id).toBe(me.enrollmentId)
      expect(body.me.rank).toBe(7)

      const teacher = await asTeacher()
      expect(teacher.options.audience).toEqual({
        rankings: true,
        types: ['xp'],
        mode: 'full',
        topN: 5,
      })
      expect(teacher.ranking).toHaveLength(8)
    })

    it('la portada sigue con su puesto y el detalle de la clase dice qué tipos hay', async () => {
      const bar = await send('GET', `/students/classes/${f.classId}/gamification`, f.token('student'))
      expect(bar.json().gamification.rank).toBe(7)
      const detail = await send('GET', `/students/classes/${f.classId}`, f.token('student'))
      expect(detail.json().class.rankingTypes).toEqual(['xp'])
    })

    it('el listado de clases dice lo mismo que el detalle: la portada puede salir de él', async () => {
      const listed = async () =>
        (await send('GET', '/students/classes', f.token('student')))
          .json()
          .classes.find((c: { id: string }) => c.id === f.classId).rankingTypes
      expect(await listed()).toEqual(['xp'])
      await setClass({ rankingConfig: { types: ['missions', 'teams'] } })
      expect(await listed()).toEqual(['missions'])
      const set = await prisma.teamSet.create({
        data: { classId: f.classId, title: 'Base', kind: 'base' },
      })
      await prisma.team.create({ data: { setId: set.id, title: 'Uno' } })
      expect(await listed()).toEqual(['missions', 'teams'])
      await setClass({ settings: { rankings: false } })
      expect(await listed()).toEqual([])
    })

    it('un JSON raro guardado se resuelve a lo de por defecto, sin romper nada', async () => {
      await setClass({ rankingConfig: { types: 'todo', mode: 7, topN: 'mucho', seasonStartedAt: 3 } })
      const body = await asStudent()
      expect(body.options).toMatchObject({ types: ['xp'], mode: 'full', topN: 5 })
      expect(body.leaderboard).toHaveLength(5)
    })
  })

  describe('el id que recibe el alumnado', () => {
    it('es el de la matrícula en todos los modos, con el color del avatar ya hecho', async () => {
      for (const mode of ['full', 'top', 'position']) {
        await setClass({ rankingConfig: { types: ['xp'], mode, topN: 3 } })
        const body = await asStudent()
        expectNoAccountIds(body)
        expect(body.me.avatarColor).toBe(studentAvatarColor(f.classId, f.users.student.id))
      }
      await setClass({ rankingConfig: null })
      const { podium } = await asStudent()
      const ana = podium.find((r: Row) => r.username === people.ana!.alias)
      expect(ana.id).toBe(people.ana!.enrollmentId)
      expect(ana.avatarColor).toBe(studentAvatarColor(f.classId, people.ana!.accountId))
    })

    it('el profesorado sigue recibiendo el id de la cuenta: enlaza a su página', async () => {
      const { ranking } = await asTeacher()
      const ana = ranking.find((r: Row) => r.username === people.ana!.alias)
      expect(ana.id).toBe(people.ana!.accountId)
      expect(ana.name).toContain('Nombre real')
      expect(ana.avatarColor).toBe(studentAvatarColor(f.classId, people.ana!.accountId))
      expect(ana).not.toHaveProperty('enrollmentId')
    })
  })

  describe('los N primeros y su puesto', () => {
    it('solo viajan los puestos hasta N, con los empatados, y su propia fila', async () => {
      await setClass({ rankingConfig: { mode: 'top', topN: 3 } })
      const body = await asStudent()
      expect(body.options).toMatchObject({ mode: 'top', topN: 3 })
      expect([...body.podium, ...body.leaderboard].map((r: Row) => [r.username, r.rank])).toEqual([
        [people.ana!.alias, 1],
        [people.bea!.alias, 2],
        [people.ciro!.alias, 3],
        [people.dani!.alias, 3],
      ])
      expect(body.me).toMatchObject({ id: me.enrollmentId, rank: 7, xp: 57, isCurrentUser: true })
      expect(body.total).toBe(8)
      // Las medias se podrían restar para deducir lo escondido.
      expect(body).not.toHaveProperty('stats')
      expectAbsent(body, ['eva', 'fito', 'cero'])
    })

    it('quien va entre los primeros sale en la lista y también como «me»', async () => {
      await setClass({ rankingConfig: { mode: 'top', topN: 3 } })
      const body = await asStudent('', tokenOf(people.bea!.accountId))
      const row = body.podium.find((r: Row) => r.isCurrentUser)
      expect(row.id).toBe(people.bea!.enrollmentId)
      expect(body.me.id).toBe(people.bea!.enrollmentId)
      expectAbsent(body, ['eva', 'fito', 'cero'])
    })

    it('quien tiene 0 no entra aunque falte gente para N, y su propia fila va sin puesto', async () => {
      await setClass({ rankingConfig: { mode: 'top', topN: 10 } })
      const body = await asStudent('', tokenOf(people.cero!.accountId))
      expect([...body.podium, ...body.leaderboard].every((r: Row) => r.rank !== null)).toBe(true)
      expect(body.me).toMatchObject({ rank: null, id: people.cero!.enrollmentId })
      expect(body.leaderboard.map((r: Row) => r.id)).not.toContain(people.cero!.enrollmentId)
    })

    it('la portada da su puesto: el modo lo deja', async () => {
      await setClass({ rankingConfig: { mode: 'top', topN: 3 } })
      const bar = await send('GET', `/students/classes/${f.classId}/gamification`, f.token('student'))
      expect(bar.json().gamification.rank).toBe(7)
    })
  })

  describe('solo su puesto', () => {
    it('solo su fila y el total: ni podio, ni lista, ni medias, ni nada de nadie más', async () => {
      await setClass({ rankingConfig: { mode: 'position' } })
      const body = await asStudent()
      expect(body.podium).toEqual([])
      expect(body.leaderboard).toEqual([])
      expect(body).not.toHaveProperty('stats')
      expect(body.total).toBe(8)
      expect(body.me).toMatchObject({ rank: 7, id: me.enrollmentId })
      expectAbsent(body, ['ana', 'bea', 'ciro', 'dani', 'eva', 'fito', 'cero'])
    })

    it('también en las misiones', async () => {
      const mission = await f.newMission()
      await f.newEnigma(mission)
      await prisma.studentMissionProgress.create({
        data: { studentId: people.ana!.accountId, missionId: mission, completedAt: new Date() },
      })
      await setClass({ rankingConfig: { mode: 'position', types: ['xp', 'missions'] } })
      const body = await asStudent('?type=missions')
      expect(body.type).toBe('missions')
      expect(body.me).toMatchObject({ rank: null, score: 0 })
      expectAbsent(body, ['ana', 'bea', 'ciro', 'dani', 'eva', 'fito', 'cero'])
    })

    it('la vista previa del profesorado no tiene fila ni entra en el total', async () => {
      await setClass({ rankingConfig: { mode: 'position' } })
      await send('POST', '/students/preview/enroll', owner())
      try {
        await prisma.classEnrollment.upsert({
          where: { studentId_classId: { studentId: f.users.owner.id, classId: f.classId } },
          update: { isPreview: true },
          create: { classId: f.classId, studentId: f.users.owner.id, isPreview: true },
        })
        const body = await asStudent('', owner())
        expect(body.me).toBeNull()
        expect(body.total).toBe(8)
        expect(body.podium).toEqual([])
        const bar = await send('GET', `/students/classes/${f.classId}/gamification`, owner())
        expect(bar.json().gamification.rank).toBeNull()
      } finally {
        await prisma.classEnrollment.deleteMany({
          where: { studentId: f.users.owner.id, classId: f.classId },
        })
      }
    })
  })

  describe('el interruptor apagado', () => {
    it('solo el profesorado: 404 al alumnado, sin pestaña ni puesto, y él lo ve completo con el aviso', async () => {
      await setClass({
        settings: { rankings: false },
        rankingConfig: { mode: 'top', topN: 3, types: ['xp', 'missions'] },
      })
      const res = await send('GET', studentUrl(), f.token('student'))
      expect(res.statusCode).toBe(404)
      expect(res.json().code).toBe('RANKING_DISABLED')
      expect(res.body).not.toContain(people.ana!.alias)
      const detail = await send('GET', `/students/classes/${f.classId}`, f.token('student'))
      expect(detail.json().class.rankingTypes).toEqual([])
      const teacher = await asTeacher()
      expect(teacher.ranking).toHaveLength(8)
      expect(teacher.options.audience).toMatchObject({ rankings: false, types: [] })
      expect(teacher.options.types).toEqual(['xp', 'missions'])
    })
  })

  describe('el profesorado lo ve siempre todo', () => {
    it('en cualquier modo, la lista completa; el aviso dice lo que ve su alumnado', async () => {
      await setClass({ rankingConfig: { mode: 'top', topN: 3 } })
      const body = await asTeacher()
      expect(body.podium.length + body.leaderboard.length).toBe(8)
      expect(body.stats.totalStudents).toBe(8)
      expect(body.options.audience).toMatchObject({ mode: 'top', topN: 3 })
      await setClass({ rankingConfig: { mode: 'position' } })
      expect((await asTeacher()).ranking).toHaveLength(8)
    })

    it('de todos los tipos, aunque su alumnado no los tenga', async () => {
      await setClass({ rankingConfig: { types: ['xp'] } })
      const mission = await f.newMission()
      await f.newEnigma(mission)
      const body = await asTeacher('?type=missions')
      expect(body.type).toBe('missions')
      expect(body.options.audience.types).toEqual(['xp'])
      // Un tipo que su alumnado no tiene no se le sirve aunque lo pida.
      expect((await asStudent('?type=missions')).type).toBe('xp')
    })
  })

  describe('el tipo misiones', () => {
    /** Misión que cuenta, con un enigma, completada por estas personas. */
    const completed = async (labels: string[], when: (i: number) => Date = () => new Date()) => {
      const mission = await f.newMission()
      await f.newEnigma(mission)
      await prisma.studentMissionProgress.createMany({
        data: labels.map((label, i) => ({
          studentId: people[label]!.accountId,
          missionId: mission,
          completedAt: when(i),
        })),
      })
      return mission
    }

    it('X solo de las que cuentan, desempate por XP, empates de competición y nadie con 0 en el podio', async () => {
      await setClass({ rankingConfig: { types: ['xp', 'missions'] } })
      // Dos que cuentan.
      await completed(['eva', 'ana', 'bea', 'ciro', 'dani'])
      await completed(['eva', 'ciro', 'dani'])
      // Una bloqueada a mano y otra sin enigmas: no cuentan.
      const blocked = await completed(['fito'])
      await prisma.mission.update({ where: { id: blocked }, data: { status: 'bloqueada' } })
      const empty = await f.newMission()
      await prisma.studentMissionProgress.create({
        data: { studentId: people.fito!.accountId, missionId: empty, completedAt: new Date() },
      })

      const body = await asStudent('?type=missions')
      expect(body.type).toBe('missions')
      expect(body.options.types).toEqual(['xp', 'missions'])
      expect(body.options.periods).toEqual(['all', 'week'])
      // Eva, Ciro y Dani tienen 2; Ciro y Dani empatan también en XP, más que Eva.
      const rows: Row[] = [...body.podium, ...body.leaderboard]
      expect(rows.map(r => [r.username, r.rank, r.score])).toEqual([
        [people.ciro!.alias, 1, 2],
        [people.dani!.alias, 1, 2],
        [people.eva!.alias, 3, 2],
        [people.ana!.alias, 4, 1],
        [people.bea!.alias, 5, 1],
        [people.cero!.alias, null, 0],
        [people.fito!.alias, null, 0],
        [me.alias, null, 0],
      ])
      expect(body.podium.every((r: Row) => r.rank !== null)).toBe(true)
      expect(rows[0]!.missionsCompleted).toBe(2)
      expect(body.me).toMatchObject({ rank: null, score: 0 })

      // Lo mismo al profesorado, con su nombre real.
      const teacher = await asTeacher('?type=missions')
      expect(teacher.ranking.map((r: Row) => r.rank)).toEqual(rows.map(r => r.rank))
    })

    it('el recorte vale igual: los N primeros de las misiones', async () => {
      // Con el tipo XP a la vista, la XP desempata: 1, 2, 3, 3 y Eva fuera.
      await setClass({ rankingConfig: { types: ['xp', 'missions'], mode: 'top', topN: 3 } })
      await completed(['ana', 'bea', 'ciro', 'dani', 'eva'])
      const body = await asStudent('?type=missions')
      expect(body.type).toBe('missions')
      expect([...body.podium, ...body.leaderboard].map((r: Row) => r.rank)).toEqual([1, 2, 3, 3])
      expectAbsent(body, ['eva', 'fito', 'cero'])

      // Sin él, empatan los cinco en el 1: entran todos, y nadie sin puesto.
      await setClass({ rankingConfig: { types: ['missions'], mode: 'top', topN: 3 } })
      const tied = await asStudent()
      expect(tied.options.types).toEqual(['missions'])
      expect([...tied.podium, ...tied.leaderboard].map((r: Row) => r.rank)).toEqual([1, 1, 1, 1, 1])
      expectAbsent(tied, ['fito', 'cero'])
    })

    it('con el tipo XP apagado, la portada no da puesto', async () => {
      await setClass({ rankingConfig: { types: ['missions'] } })
      const bar = await send('GET', `/students/classes/${f.classId}/gamification`, f.token('student'))
      expect(bar.json().gamification.rank).toBeNull()
    })

    it('«Esta semana» cuenta desde el lunes; la XP solo tiene «Siempre»', async () => {
      await setClass({ rankingConfig: { types: ['xp', 'missions'] } })
      const lastMonth = new Date(Date.now() - 30 * 86_400_000)
      await completed(['ana', 'bea'], () => lastMonth)
      await completed(['bea'])

      const week = await asStudent('?type=missions&period=week')
      expect(week.period).toBe('week')
      const rows: Row[] = [...week.podium, ...week.leaderboard]
      expect(rows.filter(r => r.rank !== null).map(r => [r.username, r.score])).toEqual([
        [people.bea!.alias, 1],
      ])
      // En «Siempre», lo suyo de siempre.
      const beaRow = rows.find(r => r.username === people.bea!.alias)!
      expect(beaRow.missionsCompleted).toBe(2)
      // Al alumnado no le llegan medias, tampoco en un periodo.
      expect(week).not.toHaveProperty('stats')

      const xp = await asStudent('?type=xp&period=week')
      expect(xp.period).toBe('all')
      expect(xp.options.periods).toEqual(['all'])
    })

    it('no hay «Temporada»: pedirla da «Siempre», aunque haya una fecha guardada', async () => {
      // Lo que dejó guardado una versión anterior se lee sin romper nada.
      await setClass({
        rankingConfig: { types: ['missions', 'teams'], seasonStartedAt: new Date().toISOString() },
      })
      await completed(['ana'], () => new Date(Date.now() - 2 * 86_400_000))
      await completed(['bea'])

      const student = await asStudent('?type=missions&period=season')
      expect(student.period).toBe('all')
      expect(student.options.periods).toEqual(['all', 'week'])
      expect(student.options).not.toHaveProperty('seasonStartedAt')
      const ranked = [...student.podium, ...student.leaderboard].filter((r: Row) => r.rank !== null)
      expect(ranked.map((r: Row) => r.username).sort()).toEqual(
        [people.ana!.alias, people.bea!.alias].sort()
      )

      const teacher = await asTeacher('?type=missions&period=season')
      expect(teacher.period).toBe('all')
      expect(teacher.options.periods).toEqual(['all', 'week'])
      expect(teacher.options).not.toHaveProperty('seasonStartedAt')
    })
  })

  describe('el tipo equipos', () => {
    const createTeams = async (points: Record<string, number[]>, when?: () => Date) => {
      const set = await prisma.teamSet.create({
        data: { classId: f.classId, title: `Base ${tag}`, kind: 'base' },
      })
      const teams: Record<string, string> = {}
      let orderIndex = 0
      for (const [title, awards] of Object.entries(points)) {
        const team = await prisma.team.create({ data: { setId: set.id, title, orderIndex: orderIndex++ } })
        teams[title] = team.id
        for (const value of awards) {
          await prisma.teamAward.create({
            data: {
              teamId: team.id,
              title: 'Premio',
              points: value,
              ...(when ? { createdAt: when() } : {}),
            },
          })
        }
      }
      return { set, teams }
    }

    it('empates de competición (1, 2, 2, 4), orden estable y sin puntos, sin puesto', async () => {
      await createTeams({ Delta: [1], Beta: [5], Alfa: [2, 3], Gamma: [9], Cero: [] })
      const body = await asStudent('?type=teams')
      expect(body.type).toBe('teams')
      expect(body.options.types).toEqual(['xp', 'teams'])
      expect(
        body.standings[0].teams.map((t: { title: string; rank: number; points: number }) => [
          t.title,
          t.rank,
          t.points,
        ])
      ).toEqual([
        ['Gamma', 1, 9],
        ['Alfa', 2, 5],
        ['Beta', 2, 5],
        ['Delta', 4, 1],
        ['Cero', null, 0],
      ])
      // Nada de esto viene de la XP de nadie ni lleva integrantes.
      expectNoAccountIds(body)
      expect(JSON.stringify(body)).not.toContain(people.ana!.alias)
    })

    it('el modo no se aplica: en «solo su puesto» se ven todos los equipos', async () => {
      await createTeams({ Uno: [3], Dos: [2], Tres: [1], Cuatro: [] })
      await setClass({ rankingConfig: { mode: 'position' } })
      const body = await asStudent('?type=teams')
      expect(body.standings[0].teams).toHaveLength(4)
    })

    it('«Esta semana» suma los premios por fecha', async () => {
      const old = new Date(Date.now() - 30 * 86_400_000)
      const { teams } = await createTeams({ Viejo: [10], Nuevo: [] }, () => old)
      await prisma.teamAward.create({ data: { teamId: teams.Nuevo!, title: 'Hoy', points: 2 } })

      const pointsOf = (body: { standings: { teams: { title: string; points: number; rank: number | null }[] }[] }) =>
        body.standings[0]!.teams.map(t => [t.title, t.points, t.rank])

      expect(pointsOf(await asStudent('?type=teams'))).toEqual([
        ['Viejo', 10, 1],
        ['Nuevo', 2, 2],
      ])
      expect(pointsOf(await asStudent('?type=teams&period=week'))).toEqual([
        ['Nuevo', 2, 1],
        ['Viejo', 0, null],
      ])
      expect(pointsOf(await asTeacher('?type=teams&period=week'))).toEqual([
        ['Nuevo', 2, 1],
        ['Viejo', 0, null],
      ])
    })

    it('apagado como tipo: ni pestaña, ni clasificación, ni puntos en «Mi equipo»', async () => {
      const created = await createTeams({ Fénix: [4], Dragón: [1] })
      const enrollment = me.enrollmentId
      const { set, teams } = created
      await prisma.teamMember.create({
        data: { teamId: teams.Fénix!, setId: set.id, enrollmentId: enrollment },
      })
      const teamsUrl = `/students/classes/${f.classId}/teams`

      const on = (await send('GET', teamsUrl, f.token('student'))).json()
      expect(on.rankings).toBe(true)
      expect(on.standings[0].teams.map((t: { rank: number }) => t.rank)).toEqual([1, 2])
      expect(on.myTeams[0].team.points).toBe(4)

      await setClass({ rankingConfig: { types: ['xp'] } })
      const off = (await send('GET', teamsUrl, f.token('student'))).json()
      expect(off.rankings).toBe(false)
      expect(off.standings).toEqual([])
      expect(off.myTeams[0].team.points).toBeNull()
      expect((await asStudent('?type=teams')).type).toBe('xp')
    })

    it('sin ninguna agrupación de base no hay pestaña, aunque esté encendido', async () => {
      const body = await asStudent('?type=teams')
      expect(body.type).toBe('xp')
      expect(body.options.types).toEqual(['xp'])
    })
  })

  describe('«el ranking requiere XP» se relaja', () => {
    it('sin XP, las misiones funcionan y no viaja ni XP ni nivel', async () => {
      await setClass({ settings: { xp: false }, rankingConfig: { types: ['xp', 'missions'] } })
      const mission = await f.newMission()
      await f.newEnigma(mission)
      await prisma.studentMissionProgress.create({
        data: { studentId: people.ana!.accountId, missionId: mission, completedAt: new Date() },
      })
      const body = await asStudent('?type=xp')
      expect(body.type).toBe('missions')
      expect(body.options).toMatchObject({ types: ['missions'], usesXp: false })
      expect(body.podium[0]).not.toHaveProperty('xp')
      expect(body.podium[0]).not.toHaveProperty('level')
      expect(body.podium[0]).not.toHaveProperty('levelColor')
      expect(body).not.toHaveProperty('stats')
      for (const person of Object.values(people)) {
        if (person.xp > 0) expect(leaves(body)).not.toContain(person.xp)
      }
      const bar = await send('GET', `/students/classes/${f.classId}/gamification`, f.token('student'))
      expect(bar.json().gamification.rank).toBeNull()

      const teacher = await asTeacher()
      expect(teacher.type).toBe('missions')
      expect(teacher.options.types).toEqual(['missions'])
      expect(teacher.ranking[0]).not.toHaveProperty('xp')
    })

    it('sin XP y sin configuración, con equipos se ven los equipos; sin ellos, nada', async () => {
      await setClass({ settings: { xp: false } })
      expect((await send('GET', studentUrl(), f.token('student'))).statusCode).toBe(404)
      const set = await prisma.teamSet.create({
        data: { classId: f.classId, title: 'Base', kind: 'base' },
      })
      await prisma.team.create({ data: { setId: set.id, title: 'Uno' } })
      const body = await asStudent()
      expect(body.type).toBe('teams')
      expect(body.options.types).toEqual(['teams'])
    })

    it('al guardar, sin ningún tipo disponible el interruptor queda apagado', async () => {
      const url = `/teacher/classes/${f.classId}`
      const onlyXp = await send('PUT', url, owner(), { rankingConfig: { types: ['xp'] } })
      expect(onlyXp.statusCode, onlyXp.body).toBe(200)
      expect(onlyXp.json().class.settings.rankings).toBe(true)

      const noXp = await send('PUT', url, owner(), { settings: { xp: false } })
      expect(noXp.json().class.settings).toMatchObject({ xp: false, rankings: false })

      // Encenderlo sin ningún tipo disponible no lo enciende…
      const stillOff = await send('PUT', url, owner(), { settings: { rankings: true } })
      expect(stillOff.json().class.settings.rankings).toBe(false)
      // …y con uno, sí, sin necesitar la XP.
      const withMissions = await send('PUT', url, owner(), {
        settings: { rankings: true },
        rankingConfig: { types: ['missions'] },
      })
      expect(withMissions.json().class.settings).toMatchObject({ xp: false, rankings: true })
    })
  })

  describe('guardar la configuración', () => {
    const url = () => `/teacher/classes/${f.classId}`

    it('se funde con lo guardado, se apunta en el historial y sale en el detalle', async () => {
      const res = await send('PUT', url(), owner(), { rankingConfig: { mode: 'top', topN: 10 } })
      expect(res.statusCode, res.body).toBe(200)
      expect(res.json().class.rankingConfig).toEqual({
        types: ['xp', 'teams'],
        mode: 'top',
        topN: 10,
        compare: null,
      })
      const again = await send('PUT', url(), owner(), { rankingConfig: { types: ['missions'] } })
      expect(again.json().class.rankingConfig).toMatchObject({ types: ['missions'], mode: 'top', topN: 10 })

      const log = await prisma.classActionLog.findFirst({
        where: { classId: f.classId, action: 'class.settings_changed' },
        orderBy: { createdAt: 'desc' },
      })
      expect(log?.metadata).toMatchObject({ fields: ['rankingConfig'] })

      const detail = await send('GET', url(), owner())
      expect(detail.json().class.rankingConfig.types).toEqual(['missions'])
    })

    it('lo raro se rechaza y no se guarda', async () => {
      await setClass({ rankingConfig: { mode: 'top', topN: 10, types: ['missions'] } })
      for (const rankingConfig of [
        { mode: 'anónimo' },
        { types: ['vidas'] },
        { types: [] },
        { topN: 7 },
        { topN: 500 },
        { topN: '5' },
      ]) {
        const res = await send('PUT', url(), owner(), { rankingConfig })
        expect(res.statusCode, JSON.stringify(rankingConfig)).toBe(400)
      }
      const saved = await prisma.class.findUnique({ where: { id: f.classId } })
      expect(saved!.rankingConfig).toMatchObject({ mode: 'top', topN: 10, types: ['missions'] })
      for (const topN of RANKING_TOP_SIZES) {
        const res = await send('PUT', url(), owner(), { rankingConfig: { topN } })
        expect(res.statusCode, res.body).toBe(200)
        expect(res.json().class.rankingConfig.topN).toBe(topN)
      }
    })

    for (const [label, data, code] of [
      ['archivada', { archived: true }, 'CLASS_ARCHIVED'],
      ['en la papelera', { deletedAt: new Date() }, 'CLASS_IN_TRASH'],
    ] as const) {
      it(`con la clase ${label}: 409, y no se guarda`, async () => {
        await setClass({ rankingConfig: { mode: 'full' } })
        await prisma.class.update({ where: { id: f.classId }, data })
        try {
          const put = await send('PUT', url(), owner(), { rankingConfig: { mode: 'position' } })
          expect([put.statusCode, put.json().code]).toEqual([409, code])
          const saved = await prisma.class.findUnique({ where: { id: f.classId } })
          expect(saved!.rankingConfig).toMatchObject({ mode: 'full' })
          // Lo demás de la clase se sigue pudiendo guardar: solo se cierra el ranking.
          const rename = await send('PUT', url(), owner(), { schedule: 'Lunes' })
          expect(rename.statusCode, rename.body).toBe(200)
        } finally {
          await prisma.class.update({ where: { id: f.classId }, data: { archived: false, deletedAt: null } })
        }
      })
    }

    it('el ranking del profesorado da 404 en la papelera y sigue viéndose archivada', async () => {
      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      try {
        expect((await send('GET', teacherUrl(), owner())).statusCode).toBe(200)
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      }
      await prisma.class.update({ where: { id: f.classId }, data: { deletedAt: new Date() } })
      try {
        const res = await send('GET', teacherUrl(), owner())
        expect(res.statusCode).toBe(404)
        expect(res.json().message).toBe('Clase no encontrada')
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { deletedAt: null } })
      }
    })

    it('es un ajuste: quien tiene edición no la cambia; administración, sí', async () => {
      const row = { classId: f.classId, userId: f.users.other.id, addedById: f.users.owner.id }
      const other = f.token('other')
      await prisma.classTeacher.create({ data: { ...row, access: 'edit', profile: 'sustituto' } })
      try {
        const denied = await send('PUT', url(), other, { rankingConfig: { mode: 'position' } })
        expect(denied.statusCode).toBe(403)
        // Ve el ranking completo con cualquier nivel.
        expect((await send('GET', teacherUrl(), other)).statusCode).toBe(200)
        await prisma.classTeacher.update({
          where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
          data: { access: 'admin' },
        })
        const allowed = await send('PUT', url(), other, { rankingConfig: { mode: 'position' } })
        expect(allowed.statusCode, allowed.body).toBe(200)
      } finally {
        await prisma.classTeacher.delete({
          where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
        })
      }
    })

    it('lo que no es de la configuración, como una temporada, no se guarda', async () => {
      const res = await send('PUT', url(), owner(), {
        rankingConfig: { seasonStartedAt: '2020-01-01T00:00:00.000Z' },
      })
      expect(res.statusCode, res.body).toBe(200)
      expect(res.json().class.rankingConfig).not.toHaveProperty('seasonStartedAt')
      const saved = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
      expect(saved.rankingConfig).not.toHaveProperty('seasonStartedAt')
    })

    it('una fecha de temporada guardada antes se lee sin romper nada y se va al guardar', async () => {
      await setClass({
        rankingConfig: {
          types: ['missions'],
          mode: 'top',
          topN: 3,
          seasonStartedAt: '2026-11-02T07:00:00.000Z',
        },
      })
      const detail = await send('GET', url(), owner())
      expect(detail.statusCode, detail.body).toBe(200)
      expect(detail.json().class.rankingConfig).toEqual({
        types: ['missions'],
        mode: 'top',
        topN: 3,
        compare: null,
      })
      const save = await send('PUT', url(), owner(), { rankingConfig: { topN: 5 } })
      expect(save.statusCode, save.body).toBe(200)
      const saved = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
      expect(saved.rankingConfig).toEqual({ types: ['missions'], mode: 'top', topN: 5, compare: null })
    })
  })

  describe('sin temporadas', () => {
    it('la ruta para empezar una ya no existe: 404, y no toca la clase', async () => {
      await setClass({ rankingConfig: { mode: 'top', topN: 3, types: ['missions'] } })
      const res = await send('POST', teacherUrl('/season'), owner())
      expect(res.statusCode, res.body).toBe(404)
      const saved = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
      expect(saved.rankingConfig).toEqual({ mode: 'top', topN: 3, types: ['missions'] })
    })
  })

  describe('copias', () => {
    const copied: string[] = []
    // Con la fecha de una temporada que dejó guardada una versión anterior: la copia no la lleva.
    const saved = {
      types: ['missions', 'teams'],
      mode: 'position',
      topN: 10,
      seasonStartedAt: '2026-11-02T07:00:00.000Z',
    }
    const expected = {
      types: ['missions', 'teams'],
      mode: 'position',
      topN: 10,
      compare: null,
    }
    const rankingConfigOf = async (id: string) =>
      (await prisma.class.findUniqueOrThrow({ where: { id } })).rankingConfig

    afterAll(async () => {
      await prisma.class.deleteMany({ where: { id: { in: copied } } })
    })

    it('duplicar con funcionalidades la lleva; sin ellas, no', async () => {
      await setClass({ rankingConfig: saved })
      const url = `/teacher/classes/${f.classId}/duplicate`
      const withFeatures = await send('POST', url, owner(), {})
      expect(withFeatures.statusCode, withFeatures.body).toBeLessThan(300)
      copied.push(withFeatures.json().class.id)
      expect(await rankingConfigOf(withFeatures.json().class.id)).toEqual(expected)

      const without = await send('POST', url, owner(), { features: false })
      copied.push(without.json().class.id)
      expect(await rankingConfigOf(without.json().class.id)).toBeNull()
    })

    it('duplicar una clase sin configuración deja la copia sin configuración', async () => {
      const res = await send('POST', `/teacher/classes/${f.classId}/duplicate`, owner(), {})
      copied.push(res.json().class.id)
      expect(await rankingConfigOf(res.json().class.id)).toBeNull()
    })

    it('importar una plantilla la lleva', async () => {
      await prisma.class.update({
        where: { id: f.classId },
        data: { isTemplate: true, subject: 'Lengua', educationLevel: 'ESO', language: 'es' },
      })
      await setClass({ rankingConfig: saved })
      try {
        const res = await send('POST', `/teacher/templates/${f.classId}/import`, f.token('other'), {})
        expect(res.statusCode, res.body).toBeLessThan(300)
        copied.push(res.json().class.id)
        expect(await rankingConfigOf(res.json().class.id)).toEqual(expected)
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: false } })
      }
    })
  })
})
