import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'

/**
 * Quién entra en las rutas de alumno. Las de una clase piden la matrícula con
 * la que se actúa como alumno en ella: la del alumno o, para el profesorado de
 * la clase, la de vista previa («Ver como alumno»). Matricularse es cosa de
 * alumnos. Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

// Solo se simula la escritura: la resolución de claves privadas es la de verdad.
vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  saveUpload: vi.fn(async (path: string) => `/uploads/${path}`),
  deleteUpload: vi.fn(),
}))

vi.mock('../../src/modules/ai/generators/avatar-firered.js', () => ({
  generateFireRedAvatar: vi.fn(async () => ({ fileUrl: '/uploads/avatars/test.png' })),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'

describeWithDatabase('acceso a las rutas de alumno', () => {
  let app: FastifyInstance
  let f: ClassFixture

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  const send = (
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    actor?: Actor,
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: actor ? { authorization: `Bearer ${f.token(actor)}` } : {},
    })

  const status = async (...args: Parameters<typeof send>) => (await send(...args)).statusCode

  const enroll = (actor: Actor, classId: string, isPreview: boolean) =>
    prisma.classEnrollment.create({
      data: { classId, studentId: f.users[actor].id, isPreview },
    })

  const unenroll = (actor: Actor, classId: string) =>
    prisma.classEnrollment.deleteMany({ where: { classId, studentId: f.users[actor].id } })

  const CLASS_READS = [
    '',
    '/missions',
    '/gamification',
    '/ranking',
    '/shop',
    '/badges',
    '/activities',
  ]

  for (const suffix of CLASS_READS) {
    it(`GET /students/classes/:classId${suffix} → alumno de la clase 200; alumno ajeno y profesorado sin vista previa 404; sin sesión 401`, async () => {
      const url = `/students/classes/${f.classId}${suffix}`

      expect(await status('GET', url)).toBe(401)
      expect(await status('GET', url, 'outsider')).toBe(404)
      expect(await status('GET', url, 'other')).toBe(404)
      expect(await status('GET', url, 'owner')).toBe(404)
      expect(await status('GET', url, 'student')).toBe(200)
    })
  }

  it('las rutas que escriben en una clase tampoco funcionan sin matrícula', async () => {
    const c = `/students/classes/${f.classId}`
    const itemId = await f.newShopItem()

    expect(await status('PUT', `${c}/profile`, 'outsider', { nickname: 'Intruso' })).toBe(404)
    for (const action of ['purchase', 'use', 'redeem']) {
      expect(await status('POST', `${c}/shop/${action}`, 'outsider', { itemId })).toBe(404)
    }
    expect(
      await status('POST', `${c}/avatar/generate`, 'outsider', {
        avatar_id: 'avatar-1',
        prompt: 'capa roja',
      })
    ).toBe(404)

    expect(await status('PUT', `${c}/profile`, 'student', { nickname: 'Ulises' })).toBe(200)
  })

  it('el ranking de una clase solo lo ve quien está en ella', async () => {
    const ranking = await send('GET', `/students/classes/${f.classId}/ranking`, 'student')
    expect(ranking.statusCode).toBe(200)
    expect(ranking.body).toContain(f.users.student.id)

    const foreign = await send('GET', `/students/classes/${f.otherClassId}/ranking`, 'student')
    expect(foreign.statusCode).toBe(404)
  })

  it('la guía la leen el alumnado matriculado y el profesorado de la clase, sin matrícula', async () => {
    const url = `/students/classes/${f.classId}/guide`

    expect(await status('GET', url)).toBe(401)
    expect(await status('GET', url, 'student')).toBe(200)
    expect(await status('GET', url, 'owner')).toBe(200)
    expect(await status('GET', url, 'other')).toBe(404)
    expect(await status('GET', url, 'outsider')).toBe(404)
  })

  it('unirse a una clase con su código es solo para alumnos', async () => {
    const { invitationCode } = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
    const enrollments = (actor: Actor) =>
      prisma.classEnrollment.count({
        where: { classId: f.classId, studentId: f.users[actor].id },
      })

    expect(await status('POST', '/students/classes/join', 'other', { code: invitationCode })).toBe(
      403
    )
    expect(await enrollments('other')).toBe(0)

    try {
      expect(
        await status('POST', '/students/classes/join', 'outsider', { code: invitationCode })
      ).toBe(200)
      expect(await enrollments('outsider')).toBe(1)
      expect(await status('GET', `/students/classes/${f.classId}/ranking`, 'outsider')).toBe(200)
    } finally {
      await unenroll('outsider', f.classId)
    }
  })

  it('una matrícula corriente de quien no es alumno no abre la clase ni sale en sus listados', async () => {
    const missionId = await f.newMission()
    await enroll('other', f.classId, false)
    try {
      expect(await status('GET', `/students/classes/${f.classId}`, 'other')).toBe(404)
      expect(await status('GET', `/students/classes/${f.classId}/ranking`, 'other')).toBe(404)
      expect((await send('GET', '/students/classes', 'other')).body).not.toContain(f.classId)
      expect((await send('GET', '/students/missions', 'other')).body).not.toContain(missionId)
    } finally {
      await unenroll('other', f.classId)
    }
  })

  it('ver como alumno: el profesor entra en sus clases con la matrícula de vista previa', async () => {
    const missionId = await f.newMission()
    const c = `/students/classes/${f.classId}`

    const enrolled = await send('POST', '/students/preview/enroll', 'owner')
    expect(enrolled.statusCode).toBe(200)
    expect(enrolled.json()).toEqual({ enrolled: 1 })
    // Es idempotente.
    expect((await send('POST', '/students/preview/enroll', 'owner')).json()).toEqual({
      enrolled: 0,
    })

    for (const suffix of CLASS_READS) {
      expect(await status('GET', `${c}${suffix}`, 'owner')).toBe(200)
    }
    expect(await status('PUT', `${c}/profile`, 'owner', { nickname: 'Profe' })).toBe(200)
    expect((await send('GET', '/students/classes', 'owner')).body).toContain(f.classId)
    expect((await send('GET', '/students/missions', 'owner')).body).toContain(missionId)

    // La vista previa no lo mete en el ranking ni le abre las clases de otros.
    expect((await send('GET', `${c}/ranking`, 'student')).body).not.toContain(f.users.owner.id)
    expect(await status('GET', `/students/classes/${f.otherClassId}`, 'owner')).toBe(404)
  })

  it('la matrícula de vista previa vale mientras se sigue siendo profesor de la clase', async () => {
    const url = `/students/classes/${f.classId}`
    const teacherRow = { classId_userId: { classId: f.classId, userId: f.users.other.id } }
    await prisma.classTeacher.create({
      data: {
        classId: f.classId,
        userId: f.users.other.id,
        access: 'read',
        profile: 'practicas',
        addedById: f.users.owner.id,
      },
    })
    await enroll('other', f.classId, true)
    try {
      expect(await status('GET', url, 'other')).toBe(200)
      expect((await send('GET', '/students/classes', 'other')).body).toContain(f.classId)

      await prisma.classTeacher.delete({ where: teacherRow })
      expect(await status('GET', url, 'other')).toBe(404)
      expect((await send('GET', '/students/classes', 'other')).body).not.toContain(f.classId)
    } finally {
      await prisma.classTeacher.deleteMany({
        where: { classId: f.classId, userId: f.users.other.id },
      })
      await unenroll('other', f.classId)
    }
  })

  it('ver como alumno no toca la matrícula que el profesor ya tenía en su clase', async () => {
    await unenroll('other', f.otherClassId)
    await enroll('other', f.otherClassId, false)
    // Quien imparte la clase la mira como alumno con la matrícula que tenga.
    expect(await status('GET', `/students/classes/${f.otherClassId}`, 'other')).toBe(200)

    expect(await status('POST', '/students/preview/enroll', 'other')).toBe(200)

    // La fila sigue como estaba: es la que cuenta en el ranking y en los
    // listados de la clase, y entrar a mirar no saca a nadie de ahí.
    const row = await prisma.classEnrollment.findUniqueOrThrow({
      where: { studentId_classId: { studentId: f.users.other.id, classId: f.otherClassId } },
    })
    expect(row.isPreview).toBe(false)
    expect(await status('GET', `/students/classes/${f.otherClassId}`, 'other')).toBe(200)
    expect(
      (await send('GET', `/students/classes/${f.otherClassId}/ranking`, 'other')).body
    ).toContain(f.users.other.id)
  })
})
