import { it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Quién ha completado cada misión, en el mapa del profesorado (E3): el listado
 * de misiones de la clase trae, por misión, quién la ha completado
 * (`completedStudentIds`, primero quien antes) y cuánta gente la lleva en curso
 * (`inProgressCount`: trabajo de verdad, como en el camino, sin completarla).
 * Solo cuenta el alumnado de la clase (ni la vista previa del profesorado ni
 * nadie de fuera), solo lo ve su profesorado y los listados del alumnado no lo
 * traen.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Solo se simula el correo.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

import { buildApp, createClassFixture, prisma, type ClassFixture } from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'

type Actor = 'owner' | 'other' | 'student' | 'outsider'

interface TeacherListed {
  id: string
  title: string
  completedCount: number
  totalStudents: number
  completedStudentIds: string[]
  inProgressCount: number
}

describeWithDatabase('mapa del profesorado: quién ha completado cada misión', () => {
  let app: FastifyInstance
  let f: ClassFixture
  /** Dos estudiantes más de la clase: Ana y Luis. */
  let ana: string
  let luis: string

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
    const tag = randomUUID().slice(0, 8)
    const newStudent = async (label: string) => {
      const user = await prisma.user.create({
        data: {
          email: `${label}.${tag}@test.invalid`,
          passwordHash: 'x',
          name: `${label} ${tag}`,
          role: 'student',
          isOnboarded: true,
        },
      })
      await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: user.id } })
      return user.id
    }
    ana = await newStudent('ana')
    luis = await newStudent('luis')
  })

  afterAll(async () => {
    if (f) {
      await prisma.user.deleteMany({ where: { id: { in: [ana, luis].filter(Boolean) } } })
      await f.cleanup()
    }
    await app?.close()
  })

  beforeEach(async () => {
    await prisma.mission.deleteMany({ where: { classId: f.classId } })
    await prisma.classEnrollment.deleteMany({
      where: { classId: f.classId, studentId: f.users.owner.id },
    })
  })

  const as = (actor: Actor) => ({ authorization: `Bearer ${f.token(actor)}` })

  /** Una misión de un enigma, con su pista. */
  async function mission(title: string) {
    const created = await prisma.mission.create({
      data: { classId: f.classId, title, orderIndex: await prisma.mission.count({ where: { classId: f.classId } }) },
    })
    const enigma = await prisma.missionEnigma.create({
      data: { missionId: created.id, title: `${title} 1`, xpReward: 10 },
    })
    const hint = await prisma.missionHint.create({
      data: { missionId: created.id, content: 'Mira el mapa', costType: 'coins', cost: 5 },
    })
    return { id: created.id, enigmaId: enigma.id, hintId: hint.id }
  }

  type Made = Awaited<ReturnType<typeof mission>>

  /** La ha completado `studentId` (con su enigma aprobado), en `at`. */
  async function complete(m: Made, studentId: string, at: Date) {
    await prisma.studentEnigmaProgress.create({ data: { studentId, enigmaId: m.enigmaId, percentage: 100 } })
    await prisma.studentMissionProgress.create({
      data: { studentId, missionId: m.id, progress: 100, enigmasCompleted: 1, completedAt: at },
    })
  }

  const submit = (m: Made, studentId: string) =>
    prisma.enigmaSubmission.create({ data: { enigmaId: m.enigmaId, studentId } })

  const useHint = (m: Made, studentId: string) =>
    prisma.missionHintUse.create({
      data: { hintId: m.hintId, missionId: m.id, studentId, costType: 'coins', cost: 5 },
    })

  async function teacherList(actor: Actor = 'owner') {
    const res = await app.inject({
      method: 'GET',
      url: `/teacher/classes/${f.classId}/missions`,
      headers: as(actor),
    })
    expect(res.statusCode, res.body).toBe(200)
    return new Map((res.json().missions as TeacherListed[]).map(m => [m.title, m] as const))
  }

  it('cada misión trae quién la ha completado (primero quien antes) y cuántos la llevan en curso', async () => {
    const a = await mission('A')
    const b = await mission('B')
    await mission('C')
    const student = f.users.student.id
    // A: Ana la completa antes que el alumno; Luis tiene una entrega (en curso).
    await complete(a, ana, new Date(Date.now() - 2 * 3600_000))
    await complete(a, student, new Date(Date.now() - 3600_000))
    await submit(a, student)
    await submit(a, luis)
    // B: el alumno con una entrega sin revisar, Ana con una pista usada (dos en
    // curso); Luis solo con una fila de progreso vacía, que no es trabajo.
    await submit(b, student)
    await useHint(b, ana)
    await prisma.studentMissionProgress.create({ data: { studentId: luis, missionId: b.id } })

    const list = await teacherList()
    expect(list.get('A')).toMatchObject({
      completedStudentIds: [ana, student],
      completedCount: 2,
      inProgressCount: 1,
      totalStudents: 3,
    })
    expect(list.get('B')).toMatchObject({ completedStudentIds: [], completedCount: 0, inProgressCount: 2 })
    expect(list.get('C')).toMatchObject({ completedStudentIds: [], completedCount: 0, inProgressCount: 0 })
  })

  it('solo cuenta el alumnado de la clase: ni la vista previa del profesorado ni nadie de fuera', async () => {
    const a = await mission('A')
    const b = await mission('B')
    await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: f.users.owner.id, isPreview: true },
    })
    await complete(a, f.users.owner.id, new Date())
    await complete(a, f.users.outsider.id, new Date())
    await complete(a, luis, new Date())
    await submit(b, f.users.owner.id)
    await useHint(b, f.users.outsider.id)

    const list = await teacherList()
    expect(list.get('A')).toMatchObject({
      completedStudentIds: [luis],
      completedCount: 1,
      inProgressCount: 0,
      totalStudents: 3,
    })
    expect(list.get('B')).toMatchObject({ completedStudentIds: [], inProgressCount: 0 })
  })

  it('solo lo ve el profesorado de la clase; los listados y el detalle del alumnado no lo traen', async () => {
    const a = await mission('A')
    await complete(a, ana, new Date())
    await submit(a, luis)

    // Otro profesor (sin la clase) no la encuentra; el alumnado no entra en las rutas del profesorado.
    const other = await app.inject({
      method: 'GET',
      url: `/teacher/classes/${f.classId}/missions`,
      headers: as('other'),
    })
    expect([403, 404]).toContain(other.statusCode)
    expect(other.body).not.toContain(ana)
    const asStudent = await app.inject({
      method: 'GET',
      url: `/teacher/classes/${f.classId}/missions`,
      headers: as('student'),
    })
    expect(asStudent.statusCode).toBe(403)
    expect(asStudent.body).not.toContain(ana)

    for (const url of [
      `/students/classes/${f.classId}/missions`,
      '/students/missions',
      '/missions',
      `/missions/${a.id}`,
    ]) {
      const res = await app.inject({ method: 'GET', url, headers: as('student') })
      expect(res.statusCode, `${url}: ${res.body}`).toBe(200)
      expect(res.body, url).toContain(a.id)
      expect(res.body, url).not.toContain('completedStudentIds')
      expect(res.body, url).not.toContain('inProgressCount')
      expect(res.body, url).not.toContain(ana)
    }
  })
})
