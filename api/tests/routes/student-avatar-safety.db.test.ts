import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { describeWithDatabase } from '../helpers/test-db.js'

// El servidor de imágenes no está en las pruebas: falla con un detalle interno
// que nunca debe llegar al estudiante.
vi.mock('../../src/modules/ai/generators/avatar-firered.js', () => ({
  generateFireRedAvatar: vi.fn(async () => {
    throw new Error('connect ECONNREFUSED 10.0.0.7:8000 (detalle interno)')
  }),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'

describeWithDatabase('avatar del alumnado: solo del catálogo y generador con filtro y tope', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const profile = (payload: object) =>
    app.inject({
      method: 'PUT',
      url: `/students/classes/${f.classId}/profile`,
      headers: { authorization: `Bearer ${f.token('student')}` },
      payload,
    })
  const generate = (payload: object) =>
    app.inject({
      method: 'POST',
      url: `/students/classes/${f.classId}/avatar/generate`,
      headers: { authorization: `Bearer ${f.token('student')}` },
      payload,
    })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f.cleanup()
    await app.close()
  })

  it('una dirección externa se rechaza y el avatar no cambia', async () => {
    const before = await prisma.classEnrollment.findFirstOrThrow({
      where: { classId: f.classId, studentId: f.users.student.id },
    })
    const res = await profile({ avatarUrl: 'https://ejemplo.com/foto.png' })
    expect(res.statusCode).toBe(400)
    const after = await prisma.classEnrollment.findFirstOrThrow({ where: { id: before.id } })
    expect(after.avatarUrl).toBe(before.avatarUrl)
  })

  it('uno del catálogo se acepta, y también volver a guardar el que ya tiene (el generado)', async () => {
    expect((await profile({ avatarUrl: '/app/avatars/odiseo.svg' })).statusCode).toBe(200)

    const enrollment = await prisma.classEnrollment.findFirstOrThrow({
      where: { classId: f.classId, studentId: f.users.student.id },
    })
    await prisma.classEnrollment.update({
      where: { id: enrollment.id },
      data: { avatarUrl: '/uploads/ai-generated/avatars/mio.png' },
    })
    expect((await profile({ avatarUrl: '/uploads/ai-generated/avatars/mio.png' })).statusCode).toBe(200)
    expect((await profile({ avatarUrl: '/uploads/ai-generated/avatars/de-otra.png' })).statusCode).toBe(400)
  })

  it('el generador pasa el filtro de contenido y no enseña el error interno', async () => {
    const blocked = await generate({
      avatar_id: 'atenea',
      wardrobe_prompt: 'ropa con violencia',
      background_prompt: 'un templo',
    })
    expect(blocked.statusCode).toBe(400)

    const down = await generate({
      avatar_id: 'atenea',
      wardrobe_prompt: 'túnica azul',
      background_prompt: 'un templo',
    })
    expect(down.statusCode).toBe(503)
    expect(down.body).not.toContain('ECONNREFUSED')
    expect(down.body).not.toContain('detalle interno')
  })

  it('tiene un tope de peticiones por estudiante', async () => {
    const codes: number[] = []
    for (let i = 0; i < 6; i++) {
      codes.push(
        (
          await generate({
            avatar_id: 'atenea',
            wardrobe_prompt: `túnica ${i}`,
            background_prompt: 'un templo',
          })
        ).statusCode
      )
    }
    expect(codes).toContain(429)
  })
})
