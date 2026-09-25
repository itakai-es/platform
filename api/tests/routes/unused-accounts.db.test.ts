import { it, expect, vi, beforeAll, afterAll, beforeEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Cuentas sin correo que aún no han entrado: la lista de la clase dice cuáles
 * tienen la contraseña temporal sin usar, y quitar de su clase de origen una
 * que no se ha usado nunca la borra del todo en vez de dejarla sin clase. Una
 * que ha entrado alguna vez, o que está en otra clase, solo sale de la clase.
 * Hasta su primera entrada no cuentan en lo que ve el resto de la clase: ni en
 * el ranking ni en su recuento de alumnos.
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
import { resetRateLimits } from '../../src/utils/rate-limit.js'

describeWithDatabase('cuentas sin correo que no se han usado', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)

  type Who = { id: string; role: string | null }
  const send = (
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    actor: Who,
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: { authorization: `Bearer ${app.jwt.sign(actor)}` },
    })

  /** Una cuenta sin correo recién creada en la clase del propietario, como la crea la pantalla. */
  const newManaged = async (name: string) => {
    const response = await send('POST', `/teacher/classes/${f.classId}/students`, f.users.owner, {
      name: `${name} ${tag}`,
    })
    expect(response.statusCode).toBe(201)
    return response.json().student.id as string
  }

  const row = async (studentId: string) => {
    const response = await send('GET', `/teacher/classes/${f.classId}/students`, f.users.owner)
    expect(response.statusCode).toBe(200)
    return response.json().students.find((s: { id: string }) => s.id === studentId)
  }

  const remove = (studentId: string) =>
    send('DELETE', `/teacher/classes/${f.classId}/students/${studentId}`, f.users.owner)

  /** Lo que deja entrar una vez: una sesión, aunque luego se cierre. */
  const signedInOnce = (userId: string) =>
    prisma.refreshToken.create({
      data: {
        token: `sesion-${randomUUID()}`,
        userId,
        isRevoked: true,
        expiresAt: new Date(Date.now() - 1000),
      },
    })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
  })

  beforeEach(() => {
    resetRateLimits()
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  it('la lista marca quién tiene la contraseña temporal sin usar', async () => {
    const id = await newManaged('Pendiente')
    expect(await row(id)).toMatchObject({ pendingSignIn: true, removalDeletesAccount: true })

    // Ya ha entrado y ha cambiado la contraseña: ni pendiente ni se borraría.
    await prisma.user.update({ where: { id }, data: { mustChangePassword: false } })
    await signedInOnce(id)
    expect(await row(id)).toMatchObject({ pendingSignIn: false, removalDeletesAccount: false })

    // Una cuenta con correo nunca sale como pendiente ni se borra desde la clase.
    expect(await row(f.users.student.id)).toMatchObject({
      pendingSignIn: false,
      removalDeletesAccount: false,
    })
  })

  it('quitar una cuenta que no se ha usado nunca la borra, y el historial lo cuenta sin ella', async () => {
    const id = await newManaged('Sin usar')

    const response = await remove(id)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ removed: true, accountDeleted: true })
    expect(await prisma.user.findUnique({ where: { id } })).toBeNull()

    const [entry] = await prisma.classActionLog.findMany({
      where: { classId: f.classId, action: 'student.removed', entityId: id },
    })
    expect(entry).toMatchObject({ targetUserId: null, metadata: { accountDeleted: true } })
  })

  it('una cuenta que ha entrado alguna vez solo sale de la clase y se queda sin clase de origen', async () => {
    const id = await newManaged('Usada')
    await signedInOnce(id)

    const response = await remove(id)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ removed: true, accountDeleted: false })
    expect(await prisma.user.findUnique({ where: { id } })).toMatchObject({ homeClassId: null })
  })

  it('una cuenta sin usar que también está en otra clase no se borra', async () => {
    const id = await newManaged('En dos clases')
    await prisma.classEnrollment.create({ data: { classId: f.otherClassId, studentId: id } })
    expect(await row(id)).toMatchObject({ removalDeletesAccount: false })

    const response = await remove(id)
    expect(response.json()).toEqual({ removed: true, accountDeleted: false })
    const user = await prisma.user.findUnique({
      where: { id },
      include: { enrollments: { select: { classId: true } } },
    })
    expect(user?.enrollments.map(e => e.classId)).toEqual([f.otherClassId])
  })

  it('hasta que entra por primera vez, sus compañeros no la ven en el ranking ni en el recuento', async () => {
    const id = await newManaged('Aún fuera')
    const viewer = f.users.student
    const rankingIds = async (actor: Who, url: string) => {
      const response = await send('GET', url, actor)
      expect(response.statusCode).toBe(200)
      const body = response.json()
      return [...body.podium, ...(body.leaderboard ?? [])].map((s: { id: string }) => s.id)
    }
    const studentCount = async () => {
      const response = await send('GET', '/students/classes', viewer)
      return response.json().classes.find((c: { id: string }) => c.id === f.classId).studentCount
    }
    const studentRanking = `/students/classes/${f.classId}/ranking`
    const teacherRanking = `/teacher/classes/${f.classId}/ranking`

    const countBefore = await studentCount()
    expect(await rankingIds(viewer, studentRanking)).not.toContain(id)
    expect(await rankingIds(viewer, studentRanking)).toContain(viewer.id)
    // El podio del profesorado es el mismo; en su lista sí sale, con la etiqueta.
    expect(await rankingIds(f.users.owner, teacherRanking)).not.toContain(id)
    expect(await row(id)).toMatchObject({ pendingSignIn: true })

    await signedInOnce(id)
    expect(await rankingIds(viewer, studentRanking)).toContain(id)
    expect(await rankingIds(f.users.owner, teacherRanking)).toContain(id)
    expect(await studentCount()).toBe(countBefore + 1)
  })

  describe('desde otra clase que no es la de origen', () => {
    it('quitarla no la borra aunque no se haya usado', async () => {
      const id = await newManaged('Origen en otra')
      // Pasa a tener su origen en la otra clase y está también en esta.
      await prisma.classEnrollment.create({ data: { classId: f.otherClassId, studentId: id } })
      await prisma.user.update({ where: { id }, data: { homeClassId: f.otherClassId } })

      const response = await remove(id)
      expect(response.json()).toEqual({ removed: true, accountDeleted: false })
      expect(await prisma.user.findUnique({ where: { id } })).toMatchObject({
        homeClassId: f.otherClassId,
      })
    })
  })
})
