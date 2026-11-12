import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

/**
 * Quién entra en las rutas de la analítica (F1): lectura, edición y
 * administración ven las del profesorado; quien no es de la clase recibe 404; el
 * alumnado no entra en ellas y solo ve su propio progreso; y lo que pasa con la
 * clase archivada y en la papelera (404: decisión 8 del plan). Necesita TEST_DATABASE_URL (ver
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
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'

describeWithDatabase('analítica: quién entra', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const coTeachers: string[] = []

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: coTeachers } } })
    await app?.close()
  })

  const get = (url: string, token?: string) =>
    app.inject({
      method: 'GET',
      url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
  const as = (actor: Actor) => f.token(actor)

  /** Un profesor de la clase con ese nivel, y su token. */
  const coTeacher = async (
    access: 'read' | 'edit' | 'admin',
    profile: 'practicas' | 'sustituto' | 'titular',
    endsAt: Date | null = null
  ) => {
    const user = await prisma.user.create({
      data: {
        email: `co-${randomUUID().slice(0, 8)}@test.invalid`,
        passwordHash: 'x',
        name: 'Co',
        role: 'teacher',
        isOnboarded: true,
      },
    })
    coTeachers.push(user.id)
    await prisma.classTeacher.create({
      data: { classId: f.classId, userId: user.id, access, profile, endsAt },
    })
    return app.jwt.sign({ id: user.id, role: 'teacher' })
  }

  const teacherUrls = () => {
    const base = `/teacher/classes/${f.classId}`
    const student = `${base}/students/${f.users.student.id}`
    return [`${base}/analytics`, `${student}/analytics`, `${student}/timeline`]
  }
  const progressUrl = () => `/students/classes/${f.classId}/progress`

  it('lectura, edición, administración y el propietario ven las tres rutas', async () => {
    const tokens = [
      await coTeacher('read', 'practicas'),
      await coTeacher('edit', 'sustituto'),
      await coTeacher('admin', 'titular'),
      as('owner'),
    ]
    for (const token of tokens) {
      for (const url of teacherUrls()) {
        expect((await get(url, token)).statusCode, url).toBe(200)
      }
    }
  })

  it('sin sesión 401; otro profesor y quien tiene el acceso vencido, 404', async () => {
    const expired = await coTeacher('admin', 'titular', new Date(Date.now() - 60_000))
    for (const url of teacherUrls()) {
      expect((await get(url)).statusCode, url).toBe(401)
      expect((await get(url, as('other'))).statusCode, url).toBe(404)
      expect((await get(url, expired)).statusCode, url).toBe(404)
    }
  })

  it('el alumnado no entra en las del profesorado, ni el de la clase', async () => {
    for (const url of teacherUrls()) {
      expect((await get(url, as('student'))).statusCode, url).toBe(403)
      expect((await get(url, as('outsider'))).statusCode, url).toBe(403)
    }
  })

  it('un estudiante que no está en la clase da 404, sin revelar si la cuenta existe', async () => {
    const base = `/teacher/classes/${f.classId}/students`
    const unknown = randomUUID()
    await prisma.classEnrollment.create({
      data: { classId: f.otherClassId, studentId: f.users.outsider.id },
    })
    try {
      for (const suffix of ['analytics', 'timeline']) {
        const missing = await get(`${base}/${unknown}/${suffix}`, as('owner'))
        expect(missing.statusCode).toBe(404)
        // Existe y está en otra clase; un id que no es un id: lo mismo.
        const elsewhere = await get(`${base}/${f.users.outsider.id}/${suffix}`, as('owner'))
        expect(elsewhere.statusCode).toBe(404)
        expect(elsewhere.json()).toEqual(missing.json())
        expect((await get(`${base}/no-es-un-id/${suffix}`, as('owner'))).json()).toEqual(missing.json())
      }
    } finally {
      await prisma.classEnrollment.deleteMany({
        where: { classId: f.otherClassId, studentId: f.users.outsider.id },
      })
    }
  })

  it('la vista previa del profesorado no es un estudiante de la clase', async () => {
    await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: f.users.owner.id, isPreview: true },
    })
    try {
      const base = `/teacher/classes/${f.classId}/students/${f.users.owner.id}`
      expect((await get(`${base}/analytics`, as('owner'))).statusCode).toBe(404)
      expect((await get(`${base}/timeline`, as('owner'))).statusCode).toBe(404)
    } finally {
      await prisma.classEnrollment.deleteMany({
        where: { classId: f.classId, studentId: f.users.owner.id },
      })
    }
  })

  it('«Mi progreso»: solo con matrícula en esa clase', async () => {
    expect((await get(progressUrl())).statusCode).toBe(401)
    expect((await get(progressUrl(), as('student'))).statusCode).toBe(200)
    expect((await get(progressUrl(), as('outsider'))).statusCode).toBe(404)
    // El profesorado sin vista previa, tampoco.
    expect((await get(progressUrl(), as('owner'))).statusCode).toBe(404)
    expect((await get(progressUrl(), as('other'))).statusCode).toBe(404)
    // Un estudiante no ve el progreso de otra clase.
    const other = `/students/classes/${f.otherClassId}/progress`
    expect((await get(other, as('student'))).statusCode).toBe(404)
  })

  it('«Mi progreso»: la vista previa vale mientras se es profesor de la clase', async () => {
    const co = await coTeacher('read', 'practicas')
    const coId = coTeachers[coTeachers.length - 1]!
    await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: coId, isPreview: true },
    })
    try {
      expect((await get(progressUrl(), co)).statusCode).toBe(200)
      await prisma.classTeacher.delete({
        where: { classId_userId: { classId: f.classId, userId: coId } },
      })
      expect((await get(progressUrl(), co)).statusCode).toBe(404)
    } finally {
      await prisma.classEnrollment.deleteMany({ where: { classId: f.classId, studentId: coId } })
    }
  })

  it('clase archivada: el profesorado la ve y el alumnado no, ni con la vista previa', async () => {
    await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: f.users.owner.id, isPreview: true },
    })
    await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
    try {
      for (const url of teacherUrls()) {
        expect((await get(url, as('owner'))).statusCode, url).toBe(200)
      }
      const closed = await get(progressUrl(), as('student'))
      expect(closed.statusCode).toBe(404)
      // El mismo mensaje que la portada de la clase.
      const cover = await get(`/students/classes/${f.classId}`, as('student'))
      expect(cover.statusCode).toBe(404)
      expect(closed.json().message).toBe(cover.json().message)
      expect((await get(progressUrl(), as('owner'))).statusCode).toBe(404)
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      await prisma.classEnrollment.deleteMany({
        where: { classId: f.classId, studentId: f.users.owner.id },
      })
    }
  })

  it('clase en la papelera: nada, ni para quien la imparte ni para el alumnado', async () => {
    const outside = await get(`/teacher/classes/${randomUUID()}/analytics`, as('owner'))
    expect(outside.statusCode).toBe(404)
    await prisma.class.update({ where: { id: f.classId }, data: { deletedAt: new Date() } })
    try {
      for (const url of teacherUrls()) {
        const closed = await get(url, as('owner'))
        expect(closed.statusCode, url).toBe(404)
        // Lo mismo que una clase que no existe: la misma lectura cerrada de siempre.
        expect(closed.json(), url).toEqual(outside.json())
      }
      expect((await get(progressUrl(), as('student'))).statusCode).toBe(404)
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { deletedAt: null } })
    }
  })

  it('lo que no vale en la query da 400', async () => {
    const [analytics, studentAnalytics, timeline] = teacherUrls() as [string, string, string]
    const owner = as('owner')
    expect((await get(`${analytics}?period=siempre`, owner)).statusCode).toBe(400)
    expect((await get(`${studentAnalytics}?period=siempre`, owner)).statusCode).toBe(400)
    expect((await get(`${timeline}?type=nada`, owner)).statusCode).toBe(400)
    expect((await get(`${timeline}?cursor=no-es-un-cursor`, owner)).statusCode).toBe(400)
    // Un cursor bien formado por fuera, con otra cosa dentro.
    const wrong = Buffer.from(JSON.stringify(['no es una fecha', 'x'])).toString('base64url')
    expect((await get(`${timeline}?cursor=${wrong}`, owner)).statusCode).toBe(400)
  })
})
