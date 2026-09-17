import './test-db.js'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { randomUUID } from 'node:crypto'
import { ZodError } from 'zod'
import { prisma } from '../../src/config/database.js'
import { HttpError } from '../../src/utils/errors.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

/**
 * Datos y aplicación para probar rutas contra la base de pruebas: dos
 * profesores con una clase cada uno, dos alumnos (uno matriculado en la clase
 * del primero) y fábricas para los recursos de esa clase. Todo con ids nuevos,
 * y `cleanup` borra lo creado.
 */

export type Actor = 'owner' | 'other' | 'student' | 'outsider'

export interface ClassFixture {
  users: Record<Actor, { id: string; role: 'teacher' | 'student' }>
  classId: string
  otherClassId: string
  token: (actor: Actor) => string
  newShopItem: () => Promise<string>
  newBehavior: () => Promise<string>
  newMission: (classId?: string) => Promise<string>
  newEnigma: (missionId: string) => Promise<string>
  newDocument: (missionId: string) => Promise<string>
  newSubmission: (enigmaId: string) => Promise<string>
  newJoinRequest: () => Promise<string>
  newBadge: (actor?: Actor) => Promise<string>
  cleanup: () => Promise<void>
}

/** Fastify con el mismo `authenticate` y el mismo criterio de errores que index.ts, y JWT de verdad. */
export async function buildApp(register: (app: FastifyInstance) => Promise<void>) {
  const app = Fastify()
  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ message: error.message, code: error.code })
    }
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send({ message: error.errors[0]?.message || 'Datos inválidos', code: 'VALIDATION_ERROR' })
    }
    const status = (error as { statusCode?: number }).statusCode
    if (status && status >= 400 && status < 500)
      return reply.status(status).send({ code: `HTTP_${status}` })
    return reply.status(500).send({ message: 'Error' })
  })
  await app.register(multipart)
  await app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET! })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ message: 'No autorizado' })
    }
  })
  await register(app)
  await app.ready()
  return app
}

export async function createClassFixture(app: FastifyInstance): Promise<ClassFixture> {
  const tag = randomUUID().slice(0, 8)
  const userIds: string[] = []
  const classIds: string[] = []

  const newUser = async (role: 'teacher' | 'student', label: string) => {
    const user = await prisma.user.create({
      data: {
        email: `${label}.${tag}@test.invalid`,
        passwordHash: 'x',
        name: `${label} ${tag}`,
        role,
        isOnboarded: true,
      },
    })
    userIds.push(user.id)
    return { id: user.id, role }
  }

  const newClass = async (ownerId: string, name: string) => {
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `${name} ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        ownerId
      )
    )
    classIds.push(cls.id)
    return cls.id
  }

  const users = {
    owner: await newUser('teacher', 'owner'),
    other: await newUser('teacher', 'other'),
    student: await newUser('student', 'student'),
    outsider: await newUser('student', 'outsider'),
  }
  const classId = await newClass(users.owner.id, 'Clase')
  const otherClassId = await newClass(users.other.id, 'Otra clase')
  await prisma.classEnrollment.create({ data: { classId, studentId: users.student.id } })

  const fixture: ClassFixture = {
    users,
    classId,
    otherClassId,
    token: actor => app.jwt.sign({ id: users[actor].id, role: users[actor].role }),
    newShopItem: async () =>
      (await prisma.shopItem.create({ data: { classId, name: 'Premio', price: 5 } })).id,
    newBehavior: async () =>
      (
        await prisma.behaviorTemplate.create({
          data: { classId, kind: 'positive', name: 'Participa', xpDelta: 5 },
        })
      ).id,
    newMission: async (inClass = classId) =>
      (
        await prisma.mission.create({
          data: { classId: inClass, title: `Misión ${randomUUID().slice(0, 4)}` },
        })
      ).id,
    newEnigma: async missionId =>
      (await prisma.missionEnigma.create({ data: { missionId, title: 'Enigma', xpReward: 10 } }))
        .id,
    newDocument: async missionId =>
      (
        await prisma.missionDocument.create({
          data: {
            missionId,
            name: 'Apuntes',
            fileUrl: 'https://example.invalid/apuntes',
            fileName: 'Apuntes',
            fileSize: 0,
            mimeType: 'text/html',
          },
        })
      ).id,
    newSubmission: async enigmaId =>
      (await prisma.enigmaSubmission.create({ data: { enigmaId, studentId: users.student.id } }))
        .id,
    newJoinRequest: async () => {
      await prisma.joinRequest.deleteMany({ where: { classId, studentId: users.outsider.id } })
      await prisma.classEnrollment.deleteMany({ where: { classId, studentId: users.outsider.id } })
      return (await prisma.joinRequest.create({ data: { classId, studentId: users.outsider.id } }))
        .id
    },
    newBadge: async (actor = 'owner') =>
      (await prisma.badge.create({ data: { name: 'Insignia', teacherId: users[actor].id } })).id,
    cleanup: async () => {
      // Las clases creadas por las propias rutas (duplicar, importar, crear) también son de estos profesores.
      const teacherIds = [users.owner.id, users.other.id]
      await prisma.studentBadge.deleteMany({ where: { badge: { teacherId: { in: teacherIds } } } })
      await prisma.badge.deleteMany({ where: { teacherId: { in: teacherIds } } })
      await prisma.class.deleteMany({ where: { teacherId: { in: teacherIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    },
  }
  return fixture
}

export { prisma }
