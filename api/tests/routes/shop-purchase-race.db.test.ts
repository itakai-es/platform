import { it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { describeWithDatabase } from '../helpers/test-db.js'
import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { shopService } from '../../src/modules/shop/shop.service.js'

describeWithDatabase('tienda: dos compras a la vez no gastan el mismo saldo', () => {
  let app: FastifyInstance
  let f: ClassFixture

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

  it('con monedas para una sola compra, solo sale una y el saldo no baja de 0', async () => {
    const itemId = await f.newShopItem() // cuesta 5
    const studentId = f.users.student.id
    const enrollment = await prisma.classEnrollment.findFirstOrThrow({
      where: { classId: f.classId, studentId },
    })
    await prisma.classEnrollment.update({ where: { id: enrollment.id }, data: { coins: 5 } })

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => shopService.purchase(studentId, f.classId, itemId))
    )

    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const after = await prisma.classEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })
    expect(after.coins).toBe(0)
    expect(await prisma.shopPurchase.count({ where: { studentId, itemId } })).toBe(1)
  })
})
