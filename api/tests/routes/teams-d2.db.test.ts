import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Bloque 4, D2: equipos. Lo que se fija aquí: nadie en dos equipos de la misma
 * agrupación (también en la base de datos), la vista previa fuera, sacar de la
 * clase o purgarla borra la pertenencia, duplicar la clase no copia equipos, el
 * reparto al azar deja fuera a quien falta hoy, premiar a un equipo apunta el
 * marcador y reparte en una transacción (una línea en el historial), lo que ve
 * el alumnado, y las misiones por equipos con «aprobar a todo el equipo».
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Solo se simula lo que sale de la máquina.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendPasswordChangedEmail: vi.fn(async () => {}),
  sendNotificationEmail: vi.fn(async () => {}),
}))

vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  deleteUpload: vi.fn(async () => {}),
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
import { createClassWithOwner } from '../../src/utils/class-owner.js'

describeWithDatabase('equipos', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const extraUsers: string[] = []
  const extraClasses: string[] = []
  let s2: string
  let s3: string
  let s4: string
  /** Cuenta sin correo que aún no ha entrado nunca. */
  let pending: string
  let preview: string

  type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  const send = (method: Method, url: string, token: string, payload?: unknown) =>
    app.inject({
      method,
      url,
      payload: payload as Record<string, unknown> | undefined,
      headers: { authorization: `Bearer ${token}` },
    })
  const owner = () => f.token('owner')
  const c = () => `/teacher/classes/${f.classId}`

  const newStudent = async (
    label: string,
    opts: { classId?: string; isPreview?: boolean; managed?: boolean; level?: number } = {}
  ) => {
    const user = await prisma.user.create({
      data: {
        email: opts.managed ? null : `${label}.${tag}@test.invalid`,
        username: opts.managed ? `${label}-${tag}` : null,
        accountType: opts.managed ? 'managed' : 'self',
        passwordHash: 'x',
        name: `${label} ${tag}`,
        role: 'student',
        isOnboarded: true,
      },
    })
    extraUsers.push(user.id)
    if (opts.classId) {
      await prisma.classEnrollment.create({
        data: {
          classId: opts.classId,
          studentId: user.id,
          isPreview: opts.isPreview ?? false,
          level: opts.level ?? 1,
        },
      })
    }
    return user.id
  }

  const enrollment = (studentId: string) =>
    prisma.classEnrollment.findUniqueOrThrow({
      where: { studentId_classId: { studentId, classId: f.classId } },
    })

  const coTeacher = async (access: 'read' | 'edit') => {
    const user = await prisma.user.create({
      data: {
        email: `co-${access}-${randomUUID().slice(0, 4)}.${tag}@test.invalid`,
        passwordHash: 'x',
        name: `Co ${access} ${tag}`,
        role: 'teacher',
        isOnboarded: true,
      },
    })
    extraUsers.push(user.id)
    await prisma.classTeacher.create({
      data: {
        classId: f.classId,
        userId: user.id,
        access,
        profile: access === 'read' ? 'practicas' : 'sustituto',
        addedById: f.users.owner.id,
      },
    })
    return app.jwt.sign({ id: user.id, role: 'teacher' })
  }

  const createSet = async (
    teams: { title: string; studentIds: string[]; color?: string; emblem?: string }[],
    kind: 'base' | 'temporal' = 'base',
    title = `Casas ${randomUUID().slice(0, 4)}`
  ) => {
    const res = await send('POST', `${c()}/team-sets`, owner(), { title, kind, teams })
    expect(res.statusCode, res.body).toBe(200)
    return res.json() as {
      id: string
      updatedAt: string
      teams: { id: string; title: string; points: number; studentIds: string[] }[]
    }
  }

  beforeAll(async () => {
    app = await buildApp(async a => {
      await a.register(teacherRoutes, { prefix: '/teacher' })
      await a.register(studentsRoutes, { prefix: '/students' })
      await a.register(missionsRoutes, { prefix: '/missions' })
      await a.register(submissionsRoutes, { prefix: '/submissions' })
    })
    f = await createClassFixture(app)
    s2 = await newStudent('s2', { classId: f.classId, level: 5 })
    s3 = await newStudent('s3', { classId: f.classId, level: 3 })
    s4 = await newStudent('s4', { classId: f.classId, level: 1 })
    pending = await newStudent('pending', { classId: f.classId, managed: true })
    preview = await newStudent('preview', { classId: f.classId, isPreview: true })
  })

  afterAll(async () => {
    await prisma.class.deleteMany({ where: { id: { in: extraClasses } } })
    await f.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await app.close()
  })

  describe('agrupaciones', () => {
    it('crea una agrupación con sus equipos y la lista con los integrantes', async () => {
      const set = await createSet([
        { title: 'Rojo', color: 'red', emblem: 'fire', studentIds: [f.users.student.id, s2] },
        { title: 'Azul', color: 'sky', emblem: 'moon', studentIds: [s3, pending] },
      ])
      expect(set.teams.map(t => [t.title, t.studentIds.length, t.points])).toEqual([
        ['Rojo', 2, 0],
        ['Azul', 2, 0],
      ])
      const list = await send('GET', `${c()}/team-sets`, owner())
      expect(list.statusCode).toBe(200)
      expect(list.json().sets.some((s: { id: string }) => s.id === set.id)).toBe(true)
      const log = await prisma.classActionLog.findFirst({
        where: { classId: f.classId, action: 'team.set_created', entityId: set.id },
      })
      expect(log?.metadata).toMatchObject({ kind: 'base', teams: 2, members: 4 })
    })

    it('nadie en dos equipos de la misma agrupación, ni la vista previa, ni cuentas de fuera', async () => {
      const twice = await send('POST', `${c()}/team-sets`, owner(), {
        title: 'Doble',
        teams: [
          { title: 'A', studentIds: [s2] },
          { title: 'B', studentIds: [s2] },
        ],
      })
      expect(twice.statusCode).toBe(400)
      const withPreview = await send('POST', `${c()}/team-sets`, owner(), {
        title: 'Vista previa',
        teams: [{ title: 'A', studentIds: [preview] }],
      })
      expect(withPreview.statusCode).toBe(400)
      const outsider = await send('POST', `${c()}/team-sets`, owner(), {
        title: 'Fuera',
        teams: [{ title: 'A', studentIds: [f.users.outsider.id] }],
      })
      expect(outsider.statusCode).toBe(400)
    })

    it('la base de datos tampoco deja una pertenencia en otra agrupación que la de su equipo', async () => {
      const a = await createSet([{ title: 'A', studentIds: [] }])
      const b = await createSet([{ title: 'B', studentIds: [] }])
      const { id: enrollmentId } = await enrollment(s4)
      await expect(
        prisma.teamMember.create({ data: { teamId: a.teams[0]!.id, setId: b.id, enrollmentId } })
      ).rejects.toThrow()
      await prisma.teamMember.create({ data: { teamId: a.teams[0]!.id, setId: a.id, enrollmentId } })
      await expect(
        prisma.teamMember.create({ data: { teamId: a.teams[0]!.id, setId: a.id, enrollmentId } })
      ).rejects.toThrow()
    })

    it('rehacer el reparto mueve, renombra y quita equipos en una transacción', async () => {
      const set = await createSet([
        { title: 'Uno', studentIds: [s2] },
        { title: 'Dos', studentIds: [s3] },
      ])
      const [uno] = set.teams
      const res = await send('PUT', `${c()}/team-sets/${set.id}/members`, owner(), {
        title: 'Casas bis',
        kind: 'temporal',
        teams: [{ id: uno!.id, title: 'Uno bis', color: 'mint', studentIds: [s2, s3] }],
        updatedAt: set.updatedAt,
      })
      expect(res.statusCode, res.body).toBe(200)
      const after = res.json()
      expect(after).toMatchObject({ title: 'Casas bis', kind: 'temporal' })
      expect(after.teams).toHaveLength(1)
      expect(after.teams[0]).toMatchObject({ id: uno!.id, title: 'Uno bis', color: 'mint' })
      expect(after.teams[0].studentIds.sort()).toEqual([s2, s3].sort())
      // Un equipo de otra agrupación no se cuela por id, y no cambia nada (ni el nombre).
      const other = await createSet([{ title: 'Ajeno', studentIds: [] }])
      const foreign = await send('PUT', `${c()}/team-sets/${set.id}/members`, owner(), {
        title: 'No vale',
        teams: [{ id: other.teams[0]!.id, title: 'X', studentIds: [] }],
        updatedAt: after.updatedAt,
      })
      expect(foreign.statusCode).toBe(400)
      expect((await prisma.teamSet.findUniqueOrThrow({ where: { id: set.id } })).title).toBe('Casas bis')
      const actions = await prisma.classActionLog.findMany({
        where: { classId: f.classId, entityId: set.id },
        orderBy: { createdAt: 'asc' },
        select: { action: true, metadata: true },
      })
      expect(actions.map(a => a.action)).toEqual(['team.set_created', 'team.set_updated', 'team.members_changed'])
      expect(actions[1]!.metadata).toMatchObject({ title: 'Casas bis', renamed: true, kind: 'temporal' })
    })

    it('una copia vieja no pisa lo nuevo: la edición desactualizada da 409 y no borra equipos ni puntos', async () => {
      const set = await createSet([
        { title: 'A', studentIds: [s2] },
        { title: 'B', studentIds: [s3] },
      ])
      const [a, b] = set.teams
      // Otra pestaña añade el equipo C y le da puntos.
      const added = await send('PUT', `${c()}/team-sets/${set.id}/members`, owner(), {
        teams: [
          { id: a!.id, title: 'A', studentIds: [s2] },
          { id: b!.id, title: 'B', studentIds: [s3] },
          { title: 'C', studentIds: [s4] },
        ],
        updatedAt: set.updatedAt,
      })
      expect(added.statusCode, added.body).toBe(200)
      const teamC = added.json().teams[2] as { id: string }
      await send('POST', `${c()}/teams/${teamC.id}/awards`, owner(), { title: 'x', points: 30, distribute: false })
      // La primera pestaña guarda con lo que tenía (solo A y B): no pasa.
      const stale = await send('PUT', `${c()}/team-sets/${set.id}/members`, owner(), {
        teams: [
          { id: a!.id, title: 'A', studentIds: [s2] },
          { id: b!.id, title: 'B', studentIds: [s3] },
        ],
        updatedAt: set.updatedAt,
      })
      expect(stale.statusCode).toBe(409)
      expect(stale.json().code).toBe('TEAM_SET_STALE')
      expect(await prisma.team.count({ where: { setId: set.id } })).toBe(3)
      expect((await prisma.teamAward.aggregate({ where: { teamId: teamC.id }, _sum: { points: true } }))._sum.points).toBe(30)
      // Mover a alguien después también deja la copia de antes sin valer.
      const latest = added.json().updatedAt as string
      const moved = await send('POST', `${c()}/team-sets/${set.id}/moves`, owner(), {
        studentIds: [s2],
        teamId: b!.id,
      })
      expect(moved.statusCode, moved.body).toBe(200)
      const again = await send('PUT', `${c()}/team-sets/${set.id}/members`, owner(), {
        teams: [{ id: a!.id, title: 'A', studentIds: [] }],
        updatedAt: latest,
      })
      expect(again.statusCode).toBe(409)
    })

    it('mover a gente de equipo solo toca la pertenencia, nunca los equipos', async () => {
      const set = await createSet([
        { title: 'Uno', studentIds: [s2, s3] },
        { title: 'Dos', studentIds: [] },
      ])
      const [uno, dos] = set.teams
      // Un equipo que la pestaña no conoce (lo ha creado otra persona), con sus puntos.
      const ajeno = await prisma.team.create({ data: { setId: set.id, title: 'Nuevo', orderIndex: 2 } })
      await prisma.teamAward.create({ data: { teamId: ajeno.id, title: 'x', points: 30 } })

      const res = await send('POST', `${c()}/team-sets/${set.id}/moves`, owner(), {
        studentIds: [s2],
        teamId: dos!.id,
      })
      expect(res.statusCode, res.body).toBe(200)
      const after = res.json() as { teams: { id: string; points: number; studentIds: string[] }[] }
      expect(after.teams.map(t => [t.id, t.studentIds])).toEqual([
        [uno!.id, [s3]],
        [dos!.id, [s2]],
        [ajeno.id, []],
      ])
      expect(after.teams[2]!.points).toBe(30)
      // Sin equipo.
      const out = await send('POST', `${c()}/team-sets/${set.id}/moves`, owner(), { studentIds: [s3], teamId: null })
      expect(out.statusCode).toBe(200)
      expect(out.json().teams[0].studentIds).toEqual([])
      // Un equipo de otra agrupación, o una cuenta de fuera, no valen.
      const other = await createSet([{ title: 'Ajena', studentIds: [] }])
      const foreignTeam = await send('POST', `${c()}/team-sets/${set.id}/moves`, owner(), {
        studentIds: [s3],
        teamId: other.teams[0]!.id,
      })
      expect(foreignTeam.statusCode).toBe(404)
      const outsider = await send('POST', `${c()}/team-sets/${set.id}/moves`, owner(), {
        studentIds: [f.users.outsider.id],
        teamId: dos!.id,
      })
      expect(outsider.statusCode).toBe(400)
      const log = await prisma.classActionLog.findFirst({
        where: { classId: f.classId, action: 'team.members_changed', entityId: set.id },
        orderBy: { createdAt: 'asc' },
      })
      expect(log?.metadata).toMatchObject({ moved: 1, to: 'Dos' })
    })

    it('una agrupación o un equipo de otra clase no se alcanzan desde la URL de la propia', async () => {
      const foreign = await prisma.teamSet.create({
        data: { classId: f.otherClassId, title: 'Ajena', teams: { create: [{ title: 'Fuera' }] } },
        include: { teams: true },
      })
      const url = `${c()}/team-sets/${foreign.id}`
      expect((await send('PATCH', url, owner(), { title: 'Mía' })).statusCode).toBe(404)
      expect(
        (
          await send('PUT', `${url}/members`, owner(), {
            teams: [{ id: foreign.teams[0]!.id, title: 'Mía', studentIds: [] }],
            updatedAt: foreign.updatedAt.toISOString(),
          })
        ).statusCode
      ).toBe(404)
      expect(
        (await send('POST', `${url}/moves`, owner(), { studentIds: [s2], teamId: foreign.teams[0]!.id }))
          .statusCode
      ).toBe(404)
      expect(
        (
          await send('POST', `${c()}/teams/${foreign.teams[0]!.id}/awards`, owner(), {
            title: 'x',
            points: 5,
            distribute: false,
          })
        ).statusCode
      ).toBe(404)
      expect((await send('DELETE', url, owner())).statusCode).toBe(404)
      const still = await prisma.teamSet.findUniqueOrThrow({ where: { id: foreign.id } })
      expect(still.title).toBe('Ajena')
      expect(await prisma.teamAward.count({ where: { teamId: foreign.teams[0]!.id } })).toBe(0)
    })

    it('archivar, renombrar y borrar; una archivada no se reparte', async () => {
      const set = await createSet([{ title: 'T', studentIds: [] }], 'temporal')
      const archived = await send('PATCH', `${c()}/team-sets/${set.id}`, owner(), {
        archived: true,
        title: 'Expertos',
      })
      expect(archived.statusCode).toBe(200)
      expect(archived.json()).toMatchObject({ archived: true, title: 'Expertos', kind: 'temporal' })
      const blocked = await send('PUT', `${c()}/team-sets/${set.id}/members`, owner(), {
        teams: [{ title: 'T', studentIds: [] }],
        updatedAt: archived.json().updatedAt,
      })
      expect(blocked.statusCode).toBe(400)
      const blockedMove = await send('POST', `${c()}/team-sets/${set.id}/moves`, owner(), {
        studentIds: [s2],
        teamId: null,
      })
      expect(blockedMove.statusCode).toBe(400)
      const removed = await send('DELETE', `${c()}/team-sets/${set.id}`, owner())
      expect(removed.statusCode).toBe(200)
      expect(await prisma.teamSet.count({ where: { id: set.id } })).toBe(0)
      const keys = await prisma.classActionLog.findMany({
        where: { classId: f.classId, entityId: set.id },
        orderBy: { createdAt: 'asc' },
        select: { action: true },
      })
      expect(keys.map(k => k.action)).toEqual(['team.set_created', 'team.set_updated', 'team.set_deleted'])
    })

    it('sacar a alguien de la clase borra su pertenencia; duplicar la clase no copia equipos', async () => {
      const gone = await newStudent('gone', { classId: f.classId })
      const set = await createSet([{ title: 'Con baja', studentIds: [gone, s2] }])
      await prisma.classEnrollment.delete({ where: { id: (await enrollment(gone)).id } })
      const after = await prisma.teamMember.findMany({ where: { setId: set.id } })
      expect(after).toHaveLength(1)

      const copy = await send('POST', `${c()}/duplicate`, owner(), {})
      expect(copy.statusCode, copy.body).toBe(200)
      const copyId = (copy.json().class ?? copy.json()).id as string
      extraClasses.push(copyId)
      expect(await prisma.teamSet.count({ where: { classId: copyId } })).toBe(0)
    })

    it('purgar la clase arrastra sus equipos y sus premios', async () => {
      const cls = await prisma.class.create({
        data: { name: `Purga ${tag}`, invitationCode: randomUUID().slice(0, 8), teacherId: f.users.owner.id },
      })
      const set = await prisma.teamSet.create({
        data: { classId: cls.id, title: 'P', teams: { create: [{ title: 'Uno' }] } },
        include: { teams: true },
      })
      await prisma.teamAward.create({ data: { teamId: set.teams[0]!.id, title: 'x', points: 3 } })
      await prisma.class.delete({ where: { id: cls.id } })
      expect(await prisma.teamSet.count({ where: { id: set.id } })).toBe(0)
      expect(await prisma.teamAward.count({ where: { teamId: set.teams[0]!.id } })).toBe(0)
    })
  })

  describe('al azar', () => {
    it('reparte a toda la clase en equipos parejos sin guardar nada', async () => {
      const before = await prisma.teamSet.count({ where: { classId: f.classId } })
      const res = await send('POST', `${c()}/team-sets/shuffle`, owner(), { teams: 2 })
      expect(res.statusCode, res.body).toBe(200)
      const { teams, attendanceTaken } = res.json()
      expect(attendanceTaken).toBe(false)
      const all = teams.flat()
      // La clase sin la vista previa: student, s2, s3, s4 y pending.
      expect(all.sort()).toEqual([f.users.student.id, s2, s3, s4, pending].sort())
      expect(all).not.toContain(preview)
      const sizes = teams.map((t: string[]) => t.length).sort()
      expect(sizes).toEqual([2, 3])
      expect(await prisma.teamSet.count({ where: { classId: f.classId } })).toBe(before)
    })

    it('con la lista de hoy, quien falta queda fuera (ausente o justificada; el retraso entra)', async () => {
      const date = '2026-10-07'
      await prisma.attendanceSession.create({
        data: {
          classId: f.classId,
          date: new Date(`${date}T00:00:00.000Z`),
          startTime: '',
          records: {
            create: [
              { enrollmentId: (await enrollment(s2)).id, status: 'absent' },
              { enrollmentId: (await enrollment(s3)).id, status: 'excused' },
              { enrollmentId: (await enrollment(s4)).id, status: 'late' },
            ],
          },
        },
      })
      const res = await send('POST', `${c()}/team-sets/shuffle`, owner(), { perTeam: 2, date })
      const body = res.json()
      expect(body.attendanceTaken).toBe(true)
      expect(body.excludedStudentIds.sort()).toEqual([s2, s3].sort())
      expect(body.teams.flat().sort()).toEqual([f.users.student.id, s4, pending].sort())
      expect(body.teams).toHaveLength(2)
    })

    it('equilibrado por nivel: los de más nivel caen en equipos distintos', async () => {
      // s2 (5) y s3 (3) son los de más nivel; con dos equipos, en serpiente, nunca juntos.
      for (let i = 0; i < 5; i++) {
        const res = await send('POST', `${c()}/team-sets/shuffle`, owner(), {
          teams: 2,
          balanceByLevel: true,
        })
        const teams = res.json().teams as string[][]
        expect(teams.some(t => t.includes(s2) && t.includes(s3))).toBe(false)
      }
    })

    it('pide cuántos equipos o cuántos por equipo, no las dos cosas', async () => {
      const res = await send('POST', `${c()}/team-sets/shuffle`, owner(), { teams: 2, perTeam: 2 })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('premiar a un equipo', () => {
    it('solo puntos: suma al marcador y no toca a nadie', async () => {
      const set = await createSet([{ title: 'Marcador', studentIds: [s2, s3] }])
      const team = set.teams[0]!
      const xpBefore = (await enrollment(s2)).xp
      const res = await send('POST', `${c()}/teams/${team.id}/awards`, owner(), {
        title: 'Orden en el laboratorio',
        points: 5,
        distribute: false,
      })
      expect(res.statusCode, res.body).toBe(200)
      expect(res.json()).toMatchObject({ teamPoints: 5, batch: null })
      expect((await enrollment(s2)).xp).toBe(xpBefore)
      const again = await send('POST', `${c()}/teams/${team.id}/awards`, owner(), {
        title: 'Ruido',
        points: -2,
        distribute: false,
      })
      expect(again.json().teamPoints).toBe(3)
      const nothing = await send('POST', `${c()}/teams/${team.id}/awards`, owner(), {
        title: 'Nada',
        points: 0,
        distribute: false,
      })
      expect(nothing.statusCode).toBe(400)
    })

    it('con reparto: puntos y comportamiento a cada integrante, en una línea del historial', async () => {
      const set = await createSet([{ title: 'Reparto', studentIds: [s2, s3, s4] }])
      const team = set.teams[0]!
      const behavior = await prisma.behaviorTemplate.create({
        data: { classId: f.classId, kind: 'positive', name: `Equipo ${tag}`, xpDelta: 10, manaDelta: 2 },
      })
      const before = await Promise.all([s2, s3, s4].map(enrollment))
      const res = await send('POST', `${c()}/teams/${team.id}/awards`, owner(), {
        behaviorId: behavior.id,
        points: 10,
        distribute: true,
      })
      expect(res.statusCode, res.body).toBe(200)
      const body = res.json()
      expect(body.teamPoints).toBe(10)
      expect(body.batch).toMatchObject({ count: 3, kind: 'positive', deltas: { xp: 10, mana: 2 } })
      const after = await Promise.all([s2, s3, s4].map(enrollment))
      after.forEach((e, i) => {
        expect(e.xp).toBe(before[i]!.xp + 10)
        expect(e.mana).toBe(before[i]!.mana + 2)
      })
      const award = await prisma.teamAward.findUniqueOrThrow({ where: { id: body.award.id } })
      expect(award).toMatchObject({ points: 10, xpDelta: 10, manaDelta: 2, memberCount: 3, behaviorId: behavior.id })
      expect(await prisma.behaviorApplication.count({ where: { teamAwardId: award.id } })).toBe(3)

      // En el historial: la línea del premio encabeza el lote; las de cada cual van dentro.
      const history = await send('GET', `${c()}/history?type=team`, owner())
      expect(history.statusCode, history.body).toBe(200)
      const line = history
        .json()
        .entries.find((e: { action: string; params: { label?: string } }) => e.action === 'team.awarded' && e.params.label === behavior.name)
      expect(line.batch.size).toBe(3)
      expect(line.batch.targets).toHaveLength(3)
      const behaviors = await send('GET', `${c()}/history?type=behavior`, owner())
      expect(
        behaviors.json().entries.some((e: { params: { title?: string } }) => e.params.title === behavior.name)
      ).toBe(false)
    })

    it('repartir a un equipo de una sola persona también dice a quién en el historial', async () => {
      const set = await createSet([{ title: `Solo ${tag}`, studentIds: [s4] }])
      const res = await send('POST', `${c()}/teams/${set.teams[0]!.id}/awards`, owner(), {
        title: `Solo uno ${tag}`,
        points: 0,
        distribute: true,
        xp: 7,
      })
      expect(res.statusCode, res.body).toBe(200)
      const history = (await send('GET', `${c()}/history?type=team`, owner())).json()
      const line = history.entries.find(
        (e: { action: string; params: { label?: string } }) =>
          e.action === 'team.awarded' && e.params.label === `Solo uno ${tag}`
      )
      expect(line.batch).toMatchObject({ size: 1 })
      expect(line.batch.targets.map((t: { id: string }) => t.id)).toEqual([s4])
    })

    it('recompensa libre repartida, y un equipo vacío no reparte', async () => {
      const set = await createSet([
        { title: 'Libre', studentIds: [s2] },
        { title: 'Vacío', studentIds: [] },
      ])
      const coins = (await enrollment(s2)).coins
      const res = await send('POST', `${c()}/teams/${set.teams[0]!.id}/awards`, owner(), {
        title: 'Ayuda en la feria',
        points: 1,
        distribute: true,
        coins: 4,
      })
      expect(res.statusCode, res.body).toBe(200)
      expect(res.json().batch.kind).toBe('reward')
      expect((await enrollment(s2)).coins).toBe(coins + 4)
      const empty = await send('POST', `${c()}/teams/${set.teams[1]!.id}/awards`, owner(), {
        title: 'Ayuda',
        points: 1,
        distribute: true,
        coins: 4,
      })
      expect(empty.statusCode).toBe(400)
    })

    it('prácticas ve los equipos pero no los forma ni los premia; sustitución sí', async () => {
      const set = await createSet([{ title: 'Permisos', studentIds: [s2] }])
      const read = await coTeacher('read')
      expect((await send('GET', `${c()}/team-sets`, read)).statusCode).toBe(200)
      expect(
        (await send('POST', `${c()}/team-sets`, read, { title: 'X', teams: [{ title: 'A', studentIds: [] }] }))
          .statusCode
      ).toBe(403)
      expect(
        (await send('POST', `${c()}/teams/${set.teams[0]!.id}/awards`, read, { title: 'x', points: 1, distribute: false }))
          .statusCode
      ).toBe(403)
      const edit = await coTeacher('edit')
      expect(
        (await send('POST', `${c()}/teams/${set.teams[0]!.id}/awards`, edit, { title: 'x', points: 1, distribute: false }))
          .statusCode
      ).toBe(200)
      expect((await send('GET', `${c()}/team-sets`, f.token('other'))).statusCode).toBe(404)
      expect((await send('GET', `${c()}/team-sets`, f.token('student'))).statusCode).toBe(403)
    })

    it('en una clase archivada no se forman ni se premian equipos', async () => {
      const set = await createSet([{ title: 'Archivo', studentIds: [s2] }])
      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      try {
        const award = await send('POST', `${c()}/teams/${set.teams[0]!.id}/awards`, owner(), {
          title: 'x',
          points: 1,
          distribute: false,
        })
        expect(award.statusCode).toBe(409)
        const created = await send('POST', `${c()}/team-sets`, owner(), {
          title: 'X',
          teams: [{ title: 'A', studentIds: [] }],
        })
        expect(created.statusCode).toBe(409)
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      }
    })
  })

  describe('lo que ve el alumnado', () => {
    it('su equipo con quien está (sin quien no ha entrado) y la clasificación de base', async () => {
      const base = await createSet(
        [
          { title: 'Fénix', studentIds: [f.users.student.id, s2, pending] },
          { title: 'Dragón', studentIds: [s3] },
        ],
        'base',
        `Base alumnado ${tag}`
      )
      await send('POST', `${c()}/teams/${base.teams[1]!.id}/awards`, owner(), {
        title: 'Punto',
        points: 7,
        distribute: false,
      })
      const res = await send('GET', `/students/classes/${f.classId}/teams`, f.token('student'))
      expect(res.statusCode, res.body).toBe(200)
      const body = res.json()
      const mine = body.myTeams.find((m: { set: { id: string } }) => m.set.id === base.id)
      expect(mine.team.title).toBe('Fénix')
      const ids = mine.members.map((m: { id: string }) => m.id)
      expect(ids[0]).toBe(f.users.student.id)
      expect(ids).toContain(s2)
      expect(ids).not.toContain(pending)
      const standing = body.standings.find((s: { set: { id: string } }) => s.set.id === base.id)
      expect(standing.teams.map((t: { title: string; points: number }) => [t.title, t.points])).toEqual([
        ['Dragón', 7],
        ['Fénix', 0],
      ])
      // Archivada, su equipo sigue saliendo (marcado, para la misión por equipos), sin puntos.
      const temporal = await createSet([{ title: 'Expertos', studentIds: [f.users.student.id] }], 'temporal')
      await send('PATCH', `${c()}/team-sets/${temporal.id}`, owner(), { archived: true })
      await send('PATCH', `${c()}/team-sets/${base.id}`, owner(), { archived: true })
      try {
        const archived = (await send('GET', `/students/classes/${f.classId}/teams`, f.token('student'))).json()
        const expertos = archived.myTeams.find((m: { set: { id: string } }) => m.set.id === temporal.id)
        expect(expertos).toMatchObject({ set: { archived: true }, team: { title: 'Expertos', points: null } })
        const fenix = archived.myTeams.find((m: { set: { id: string } }) => m.set.id === base.id)
        expect(fenix).toMatchObject({ set: { archived: true }, team: { points: null } })
        expect(archived.standings.some((s: { set: { id: string } }) => s.set.id === base.id)).toBe(false)
      } finally {
        await send('PATCH', `${c()}/team-sets/${base.id}`, owner(), { archived: false })
      }

      // Sin la clasificación activada, ni puntos ni equipos de los demás.
      await prisma.class.update({ where: { id: f.classId }, data: { settings: { rankings: false } } })
      try {
        const off = (await send('GET', `/students/classes/${f.classId}/teams`, f.token('student'))).json()
        expect(off.standings).toEqual([])
        expect(off.myTeams.find((m: { set: { id: string } }) => m.set.id === base.id).team.points).toBeNull()
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { settings: {} } })
      }
    })
  })

  describe('misiones por equipos', () => {
    it('la misión dice su agrupación; una de otra clase no vale', async () => {
      const set = await createSet([{ title: 'M', studentIds: [] }])
      const missionId = await f.newMission()
      const ok = await send('PATCH', `/missions/${missionId}`, owner(), { teamSetId: set.id })
      expect(ok.statusCode, ok.body).toBe(200)
      const detail = await send('GET', `/missions/${missionId}`, f.token('student'))
      expect(detail.json().mission.teamSet).toMatchObject({ id: set.id })
      const foreignSet = await prisma.teamSet.create({ data: { classId: f.otherClassId, title: 'Ajena' } })
      const bad = await send('PATCH', `/missions/${missionId}`, owner(), { teamSetId: foreignSet.id })
      expect(bad.statusCode).toBe(400)
      const off = await send('PATCH', `/missions/${missionId}`, owner(), { teamSetId: null })
      expect(off.statusCode).toBe(200)
      expect((await prisma.mission.findUniqueOrThrow({ where: { id: missionId } })).teamSetId).toBeNull()
    })

    it('al mover la misión a otra clase vuelve a ser individual', async () => {
      const set = await createSet([{ title: 'Mueve', studentIds: [] }])
      const missionId = await f.newMission()
      await prisma.mission.update({ where: { id: missionId }, data: { teamSetId: set.id } })
      const target = await prisma.$transaction(tx =>
        createClassWithOwner(
          tx,
          { name: `Destino ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
          f.users.owner.id
        )
      )
      extraClasses.push(target.id)
      const moved = await send('PATCH', `/missions/${missionId}`, owner(), { classId: target.id })
      expect(moved.statusCode, moved.body).toBe(200)
      const after = await prisma.mission.findUniqueOrThrow({ where: { id: missionId } })
      expect(after).toMatchObject({ classId: target.id, teamSetId: null })
    })

    it('aprobar a todo el equipo aprueba con el mismo % la pendiente de cada integrante', async () => {
      const set = await createSet([
        { title: 'Entrega', studentIds: [f.users.student.id, s2, s3] },
        { title: 'Otro', studentIds: [s4] },
      ])
      const missionId = await f.newMission()
      await prisma.mission.update({ where: { id: missionId }, data: { teamSetId: set.id } })
      const enigmaId = await f.newEnigma(missionId)
      const mine = await prisma.enigmaSubmission.create({ data: { studentId: f.users.student.id, enigmaId } })
      await prisma.enigmaSubmission.create({ data: { studentId: s2, enigmaId } })
      await prisma.enigmaSubmission.create({ data: { studentId: s4, enigmaId } })

      const list = await send('GET', `/submissions/teacher/enigmas/${enigmaId}`, owner())
      const subs = list.json().submissions as { student: { id: string }; team: { title: string } | null }[]
      expect(subs.find(s => s.student.id === s2)?.team?.title).toBe('Entrega')
      expect(list.json().enigma.teamSet).toMatchObject({ id: set.id })

      const res = await send('POST', `/submissions/${mine.id}/approve-team`, owner(), { percentage: 50 })
      expect(res.statusCode, res.body).toBe(200)
      const body = res.json()
      expect(body.approved.map((a: { studentId: string }) => a.studentId).sort()).toEqual(
        [f.users.student.id, s2].sort()
      )
      expect(body.withoutSubmission).toBe(1)
      const progress = await prisma.studentEnigmaProgress.findMany({ where: { enigmaId } })
      expect(progress.map(p => p.studentId).sort()).toEqual([f.users.student.id, s2].sort())
      // El otro equipo sigue pendiente.
      expect(
        (await prisma.enigmaSubmission.findFirstOrThrow({ where: { enigmaId, studentId: s4 } })).status
      ).toBe('pendiente')
      const read = await coTeacher('read')
      expect((await send('POST', `/submissions/${mine.id}/approve-team`, read, { percentage: 50 })).statusCode).toBe(
        403
      )
    })
  })
})
