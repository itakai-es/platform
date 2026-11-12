import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Arreglos de producción de la entrega 0 del bloque 6: el ranking apagado y el
 * de la clase archivada, el orden y los empates, el alias del alumnado, las
 * entregas de un enigma ya aprobado, los `limit` de los muros, las cifras del
 * inicio del alumnado y las filas viejas del aviso de seguridad. Necesita
 * TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
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
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { submissionsRoutes } from '../../src/modules/submissions/submissions.routes.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'

/** Cuerpo multipart con solo campos de texto (una entrega sin fichero). */
function formData(fields: Record<string, string>) {
  const boundary = '----b6'
  const body =
    Object.entries(fields)
      .map(([k, v]) => `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`)
      .join('') + `--${boundary}--\r\n`
  return { payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

interface Row {
  id: string
  username: string
  rank: number | null
  xp: number
  isCurrentUser?: boolean
}

describeWithDatabase('arreglos de producción del bloque 6', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const extraUsers: string[] = []

  type Method = 'GET' | 'POST' | 'PUT' | 'PATCH'
  const send = (method: Method, url: string, token: string, payload?: unknown) =>
    app.inject({
      method,
      url,
      payload: payload as Record<string, unknown> | undefined,
      headers: { authorization: `Bearer ${token}` },
    })
  const tokenOf = (id: string, role: 'student' | 'teacher' | 'admin' = 'student') =>
    app.jwt.sign({ id, role })
  const student = () => f.token('student')
  const owner = () => f.token('owner')

  /** Una cuenta de alumno matriculada en la clase, con su XP y su alias. */
  const newStudent = async (label: string, xp: number, nickname: string | null) => {
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
    await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: user.id, xp, nickname },
    })
    return user.id
  }

  const setSettings = (settings: Record<string, boolean>) =>
    prisma.class.update({ where: { id: f.classId }, data: { settings } })

  /** Al alumnado le llega el id de cada matrícula, no el de la cuenta. */
  const enrollmentIdOf = async (studentId: string) =>
    (
      await prisma.classEnrollment.findUniqueOrThrow({
        where: { studentId_classId: { studentId, classId: f.classId } },
        select: { id: true },
      })
    ).id

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(submissionsRoutes, { prefix: '/submissions' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await prisma.activity.deleteMany({ where: { userId: { in: [...extraUsers, f.users.student.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await f?.cleanup()
    await app?.close()
  })

  describe('la clasificación', () => {
    let zeta: string
    let beta: string
    let alfa: string
    let delta: string
    let sinAlias: string

    beforeAll(async () => {
      // La del fixture: 50 XP, «Gamma».
      await prisma.classEnrollment.update({
        where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
        data: { xp: 50, nickname: 'Gamma' },
      })
      zeta = await newStudent('zeta', 100, 'Zeta')
      beta = await newStudent('beta', 80, 'Beta')
      alfa = await newStudent('alfa', 80, 'alfa')
      delta = await newStudent('delta', 0, 'Delta')
      sinAlias = await newStudent('sinalias', 0, null)
    })

    afterAll(async () => {
      await prisma.classEnrollment.deleteMany({
        where: { classId: f.classId, studentId: { in: [zeta, beta, alfa, delta, sinAlias] } },
      })
      await prisma.classEnrollment.update({
        where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
        data: { xp: 0, nickname: null },
      })
    })

    it('empates: puesto de competición (1, 2, 2, 4), orden estable por alias y nadie con 0 XP en el podio', async () => {
      const first = await send('GET', `/students/classes/${f.classId}/ranking`, student())
      expect(first.statusCode, first.body).toBe(200)
      const body = first.json()
      expect(body.podium.map((r: Row) => [r.id, r.rank])).toEqual([
        [await enrollmentIdOf(zeta), 1],
        [await enrollmentIdOf(alfa), 2],
        [await enrollmentIdOf(beta), 2],
      ])
      // Quien no tiene alias va detrás de quien lo tiene.
      expect(body.leaderboard.map((r: Row) => [r.id, r.rank])).toEqual([
        [await enrollmentIdOf(f.users.student.id), 4],
        [await enrollmentIdOf(delta), null],
        [await enrollmentIdOf(sinAlias), null],
      ])
      // La misma respuesta en otra petición: el orden no baila.
      const again = (await send('GET', `/students/classes/${f.classId}/ranking`, student())).json()
      expect(again.podium.map((r: Row) => r.id)).toEqual(body.podium.map((r: Row) => r.id))
      expect(again.leaderboard.map((r: Row) => r.id)).toEqual(body.leaderboard.map((r: Row) => r.id))
      // «Tú» en su fila; sin filtros muertos.
      expect(body.leaderboard[0].isCurrentUser).toBe(true)
      expect(body.filters).toBeUndefined()
    })

    it('la barra de la portada da el mismo puesto que la lista, y ninguno con 0 XP', async () => {
      const gamification = (who: string) =>
        send('GET', `/students/classes/${f.classId}/gamification`, tokenOf(who))
      expect((await send('GET', `/students/classes/${f.classId}/gamification`, student())).json().gamification.rank).toBe(4)
      expect((await gamification(beta)).json().gamification.rank).toBe(2)
      expect((await gamification(alfa)).json().gamification.rank).toBe(2)
      expect((await gamification(delta)).json().gamification.rank).toBeNull()
    })

    it('el alumnado nunca ve el nombre real: alias o «Estudiante»', async () => {
      const res = await send('GET', `/students/classes/${f.classId}/ranking`, student())
      expect(res.body).not.toContain('Nombre real')
      const sinAliasId = await enrollmentIdOf(sinAlias)
      const row = res.json().leaderboard.find((r: Row) => r.id === sinAliasId)
      expect(row.username).toBe('Estudiante')
      expect(row.name).toBeUndefined()
    })

    it('el profesorado recibe lo mismo, con el nombre real, la XP total y las misiones sobre el total', async () => {
      await f.newMission()
      const res = await send('GET', `/teacher/classes/${f.classId}/ranking`, owner())
      expect(res.statusCode, res.body).toBe(200)
      const body = res.json()
      const students = (await send('GET', `/students/classes/${f.classId}/ranking`, student())).json()
      // El mismo orden y los mismos puestos; él recibe el id de la cuenta y el
      // alumnado, el de la matrícula.
      const asEnrollment = async (rows: Row[]) =>
        Promise.all(rows.map(async r => [await enrollmentIdOf(r.id), r.rank]))
      expect(await asEnrollment(body.podium)).toEqual(
        students.podium.map((r: Row) => [r.id, r.rank])
      )
      expect(await asEnrollment(body.leaderboard)).toEqual(
        students.leaderboard.map((r: Row) => [r.id, r.rank])
      )
      // Las mismas medias; la XP total y el progreso medio, solo el profesorado
      // (la suma o la media, menos lo propio, es lo de los demás).
      const { totalXp, avgProgress: _avgProgress, ...sharedStats } = body.stats
      expect(sharedStats).toEqual(students.stats)
      expect(students.stats).not.toHaveProperty('totalXp')
      expect(students.stats).not.toHaveProperty('avgProgress')
      expect(totalXp).toBe(100 + 80 + 80 + 50)
      // Misiones de media (con un decimal), de las N que cuentan: las de la
      // definición única (ver progress-figures.db.test.ts).
      expect(typeof body.stats.avgMissions).toBe('number')
      expect(typeof body.stats.missionsTotal).toBe('number')
      expect(body.stats.participation).toBeUndefined()
      expect(body.ranking.find((r: { id: string }) => r.id === sinAlias).name).toContain('Nombre real')
    })

    it('ranking apagado: 404 al alumnado, puesto nulo en la portada y el profesorado lo sigue viendo', async () => {
      await setSettings({ rankings: false })
      try {
        const off = await send('GET', `/students/classes/${f.classId}/ranking`, student())
        expect(off.statusCode).toBe(404)
        expect(off.json().code).toBe('RANKING_DISABLED')
        const bar = (await send('GET', `/students/classes/${f.classId}/gamification`, student())).json()
        expect(bar.gamification.rank).toBeNull()
        expect((await send('GET', `/teacher/classes/${f.classId}/ranking`, owner())).statusCode).toBe(200)
      } finally {
        await setSettings({})
      }
    })

    it('ver como alumno: la vista previa no tiene puesto', async () => {
      await send('POST', '/students/preview/enroll', owner())
      try {
        const bar = (await send('GET', `/students/classes/${f.classId}/gamification`, owner())).json()
        expect(bar.gamification.rank).toBeNull()
      } finally {
        await prisma.classEnrollment.deleteMany({
          where: { studentId: f.users.owner.id, isPreview: true },
        })
      }
    })
  })

  describe('el alias del alumnado', () => {
    let mate: string
    beforeAll(async () => {
      mate = await newStudent('mate', 0, 'Rayo de Luz')
    })
    afterAll(async () => {
      await prisma.classEnrollment.deleteMany({ where: { classId: f.classId, studentId: mate } })
      await prisma.classEnrollment.update({
        where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
        data: { nickname: null },
      })
    })
    const profile = (payload: unknown, token = student()) =>
      send('PUT', `/students/classes/${f.classId}/profile`, token, payload)

    it('se limpia como el del profesorado', async () => {
      const res = await profile({ nickname: '  Titán​   Veloz  ' })
      expect(res.statusCode, res.body).toBe(200)
      expect(res.json().nickname).toBe('Titán Veloz')
    })

    it('no puede repetir el de otra persona de la clase (409), ni cambiando mayúsculas o espacios', async () => {
      const res = await profile({ nickname: '  rayo   DE luz ' })
      expect(res.statusCode).toBe(409)
      expect(res.json().code).toBe('NICKNAME_TAKEN')
    })

    it('el suyo se puede volver a guardar, también cambiando las mayúsculas', async () => {
      expect((await profile({ nickname: 'Rayo de luz' }, tokenOf(mate))).statusCode).toBe(200)
      expect((await profile({ nickname: 'Rayo de luz', avatarUrl: undefined }, tokenOf(mate))).statusCode).toBe(200)
    })

    it('no puede quedar vacío, sin letras, largo ni null', async () => {
      for (const nickname of ['', '   ', '​', '!!!', 'x'.repeat(21)]) {
        const res = await profile({ nickname })
        expect(res.statusCode, nickname).toBe(400)
        expect(res.json().code).toBe('INVALID_NICKNAME')
      }
      expect((await profile({ nickname: null })).statusCode).toBe(400)
      const row = await prisma.classEnrollment.findUniqueOrThrow({
        where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
      })
      expect(row.nickname).toBe('Titán Veloz')
    })
  })

  describe('la clase archivada', () => {
    it('cierra al alumnado el ranking, la gamificación, los equipos y el muro, como la portada', async () => {
      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      try {
        for (const suffix of ['', '/ranking', '/gamification', '/teams', '/activities']) {
          const res = await send('GET', `/students/classes/${f.classId}${suffix}`, student())
          expect(res.statusCode, suffix).toBe(404)
          expect(res.json().message).toBe('Esta clase está archivada y ya no está disponible')
        }
        // El profesorado la sigue viendo.
        expect((await send('GET', `/teacher/classes/${f.classId}/ranking`, owner())).statusCode).toBe(200)
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      }
      expect((await send('GET', `/students/classes/${f.classId}/teams`, student())).statusCode).toBe(200)
    })
  })

  describe('entregas de un enigma ya aprobado', () => {
    let missionId: string
    let approvedEnigma: string
    let openEnigma: string

    beforeAll(async () => {
      missionId = await f.newMission()
      approvedEnigma = await f.newEnigma(missionId)
      openEnigma = await f.newEnigma(missionId)
      await prisma.studentEnigmaProgress.create({
        data: { studentId: f.users.student.id, enigmaId: approvedEnigma, xpEarned: 10 },
      })
    })

    it('no se puede volver a entregar: 409 con su código', async () => {
      const form = formData({ nota: 'otra vez' })
      const res = await app.inject({
        method: 'POST',
        url: `/submissions/enigmas/${approvedEnigma}`,
        headers: { authorization: `Bearer ${student()}`, ...form.headers },
        payload: form.payload,
      })
      expect(res.statusCode, res.body).toBe(409)
      expect(res.json().code).toBe('ENIGMA_ALREADY_APPROVED')
      expect(await prisma.enigmaSubmission.count({ where: { enigmaId: approvedEnigma } })).toBe(0)
    })

    it('una pendiente atascada de antes no cuenta por revisar, ni se borra', async () => {
      const stuck = await f.newSubmission(approvedEnigma)
      await f.newSubmission(openEnigma)

      const cls = (await send('GET', `/teacher/classes/${f.classId}`, owner())).json().class
      expect(cls.stats.pendingReviews).toBe(1)

      const detail = (await send('GET', `/missions/${missionId}`, owner())).json().mission
      const perEnigma = Object.fromEntries(
        detail.enigmas.map((e: { id: string; pendingSubmissions: number }) => [e.id, e.pendingSubmissions])
      )
      expect(perEnigma[approvedEnigma]).toBe(0)
      expect(perEnigma[openEnigma]).toBe(1)

      const review = (await send('GET', `/submissions/teacher/enigmas/${approvedEnigma}`, owner())).json()
      expect(review.pending).toBe(0)
      expect(review.submissions.map((s: { id: string }) => s.id)).not.toContain(stuck)

      const admin = await prisma.user.create({
        data: {
          email: `admin.${tag}@test.invalid`,
          passwordHash: 'x',
          name: `Admin ${tag}`,
          role: 'admin',
          isOnboarded: true,
        },
      })
      extraUsers.push(admin.id)
      const stats = await send('GET', '/admin/stats', tokenOf(admin.id, 'admin'))
      expect(stats.statusCode, stats.body).toBe(200)
      const pendingInDb = await prisma.enigmaSubmission.count({ where: { status: 'pendiente' } })
      expect(stats.json().stats.pendingSubmissions).toBeLessThan(pendingInDb)

      expect(await prisma.enigmaSubmission.count({ where: { id: stuck } })).toBe(1)
    })

    it('el detalle de misión del alumnado no dice cuántos compañeros tienen cada enigma; el del profesorado sí', async () => {
      const asStudent = (await send('GET', `/missions/${missionId}`, student())).json().mission
      for (const enigma of asStudent.enigmas) expect(enigma.completedCount).toBeUndefined()
      const asTeacher = (await send('GET', `/missions/${missionId}`, owner())).json().mission
      const approved = asTeacher.enigmas.find((e: { id: string }) => e.id === approvedEnigma)
      expect(approved.completedCount).toBe(1)
    })

    it('varias entregas a la vez del mismo enigma (doble clic): una se guarda y las otras dan 409', async () => {
      const enigmaId = await f.newEnigma(missionId)
      const submit = () => {
        const form = formData({ nota: 'a la vez' })
        return app.inject({
          method: 'POST',
          url: `/submissions/enigmas/${enigmaId}`,
          headers: { authorization: `Bearer ${student()}`, ...form.headers },
          payload: form.payload,
        })
      }
      const results = await Promise.all([submit(), submit(), submit()])
      expect(results.map(r => r.statusCode).sort()).toEqual([201, 409, 409])
      for (const res of results.filter(r => r.statusCode === 409)) {
        expect(res.json().code).toBe('SUBMISSION_PENDING')
      }
      expect(
        await prisma.enigmaSubmission.count({ where: { enigmaId, status: 'pendiente' } })
      ).toBe(1)
    })
  })

  describe('los muros', () => {
    beforeAll(async () => {
      await prisma.activity.createMany({
        data: Array.from({ length: 55 }, (_, i) => ({
          userId: f.users.student.id,
          classId: f.classId,
          type: 'enigma_submitted' as const,
          description: `Entrada ${i}`,
        })),
      })
    })

    it('el limit se acota de 1 a 50 y, si no es un número, va el de por defecto', async () => {
      const count = async (url: string, token: string) => {
        const res = await send('GET', url, token)
        expect(res.statusCode, `${url} ${res.body}`).toBe(200)
        return res.json().activities.length
      }
      const studentWall = `/students/classes/${f.classId}/activities`
      expect(await count(`${studentWall}?limit=100000`, student())).toBe(50)
      expect(await count(`${studentWall}?limit=abc`, student())).toBe(5)
      expect(await count(`${studentWall}?limit=0`, student())).toBe(1)
      expect(await count(`${studentWall}?limit=3&offset=abc`, student())).toBe(3)
      expect(await count(`/students/activities?limit=500`, student())).toBe(50)
      expect(await count(`/students/activities?limit=abc`, student())).toBe(10)

      const teacherWall = `/teacher/classes/${f.classId}/activities`
      expect(await count(`${teacherWall}?limit=100000`, owner())).toBe(50)
      expect(await count(`${teacherWall}?limit=abc`, owner())).toBe(10)
      expect(await count(`/teacher/activities?limit=100000`, owner())).toBe(50)
      expect(await count(`/teacher/activities?limit=abc`, owner())).toBe(10)
    })

    it('las filas viejas del aviso de seguridad (xp_gained sin clase) no salen en los muros ni en la ficha', async () => {
      const legacy = await prisma.activity.create({
        data: {
          userId: f.users.student.id,
          type: 'xp_gained',
          description: 'Sesión comprometida detectada',
          createdAt: new Date(Date.now() + 60_000),
        },
      })
      const ids = async (url: string, token: string) => {
        const res = await send('GET', url, token)
        expect(res.statusCode, res.body).toBe(200)
        const body = res.json()
        const list = body.activities ?? body.student?.recentActivity ?? body.recentActivity ?? []
        return JSON.stringify(list)
      }
      expect(await ids('/students/activities?limit=50', student())).not.toContain(legacy.id)
      expect(await ids('/teacher/activities?limit=50', owner())).not.toContain(legacy.id)
      const ficha = await send('GET', `/teacher/students/${f.users.student.id}`, owner())
      expect(ficha.statusCode, ficha.body).toBe(200)
      expect(ficha.body).not.toContain(legacy.id)
    })
  })

  describe('el inicio del alumnado', () => {
    it('cuenta las misiones completadas de sus clases (sin las de clases ajenas ni las sin terminar) y sus insignias', async () => {
      const done = await f.newMission()
      // Con enigmas: una sin ninguno no cuenta (ver analytics/definitions.ts).
      await f.newEnigma(done)
      const open = await f.newMission()
      const foreign = await f.newMission(f.otherClassId)
      const now = new Date()
      await prisma.studentMissionProgress.createMany({
        data: [
          { studentId: f.users.student.id, missionId: done, completedAt: now },
          { studentId: f.users.student.id, missionId: open },
          { studentId: f.users.student.id, missionId: foreign, completedAt: now },
        ],
      })
      const badgeId = await f.newBadge()
      await prisma.studentBadge.create({ data: { studentId: f.users.student.id, badgeId } })

      const res = await send('GET', '/students/profile/me', student())
      expect(res.statusCode, res.body).toBe(200)
      const { stats } = res.json().profile
      expect(stats.classesEnrolled).toBe(1)
      expect(stats.missionsCompleted).toBe(
        await prisma.studentMissionProgress.count({
          where: {
            studentId: f.users.student.id,
            completedAt: { not: null },
            mission: { classId: f.classId, status: { not: 'bloqueada' }, enigmas: { some: {} } },
          },
        })
      )
      expect(stats.missionsCompleted).toBeGreaterThanOrEqual(1)
      expect(stats.badgesEarned).toBe(1)
    })
  })
})
