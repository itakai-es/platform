import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * La biblioteca de insignias del profesorado (`/profesor/insignias`): qué sale,
 * cuáles dice que se pueden editar (`canEdit`, la misma regla que aceptan el
 * cambio y el borrado) y cómo se gana una del sistema. Y que se puede crear una
 * propia a partir de una del sistema, con su imagen pública. Necesita
 * TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

import { buildApp, createClassFixture, prisma, type ClassFixture } from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'

interface LibraryBadge {
  id: string
  name: string
  rarity: string
  imageUrl: string | null
  isSystem: boolean
  canEdit: boolean
  trigger: { type: string; value: number } | null
}

describeWithDatabase('biblioteca de insignias del profesorado', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  let systemId: string

  const send = (
    token: string,
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    payload?: Record<string, unknown>
  ) => app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } })

  const library = async (token: string) => {
    const response = await send(token, 'GET', '/teacher/badges')
    expect(response.statusCode).toBe(200)
    return response.json().badges as LibraryBadge[]
  }
  const find = (badges: LibraryBadge[], id: string) => badges.find(b => b.id === id)

  /** Comparte la clase del fixture con el otro profesor, con ese acceso. */
  const shareWithOther = (access: 'read' | 'edit') =>
    prisma.classTeacher.upsert({
      where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
      create: {
        classId: f.classId,
        userId: f.users.other.id,
        access,
        profile: 'practicas',
        addedById: f.users.owner.id,
      },
      update: { access },
    })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)
    // Una del sistema propia de la prueba: sin autor y con un umbral que nadie alcanza.
    systemId = (
      await prisma.badge.create({
        data: {
          name: `Sistema ${tag}`,
          description: 'Alcanza el nivel 9999 en una clase',
          imageUrl: '/badges/trono-olimpo.svg',
          rarity: 'legendary',
          triggerType: 'level_reached',
          triggerValue: 9999,
        },
      })
    ).id
  })

  afterAll(async () => {
    await prisma.badge.deleteMany({ where: { id: systemId } })
    await f?.cleanup()
    await app?.close()
  })

  it('las del sistema salen sin poder editarse y dicen cómo se ganan; las propias, editables', async () => {
    const own = await f.newBadge('owner')
    const badges = await library(f.token('owner'))

    expect(find(badges, systemId)).toMatchObject({
      isSystem: true,
      canEdit: false,
      trigger: { type: 'level_reached', value: 9999 },
    })
    expect(find(badges, own)).toMatchObject({ isSystem: false, canEdit: true, trigger: null })
    // Ninguna del sistema se puede editar, ni las sembradas.
    expect(badges.filter(b => b.isSystem).every(b => !b.canEdit)).toBe(true)
  })

  it('canEdit dice exactamente lo que acepta el cambio: 200 si se puede, 404 si no', async () => {
    const missionId = await f.newMission()
    const linked = (
      await prisma.badge.create({
        data: { name: 'De la misión', teacherId: f.users.owner.id, missionId },
      })
    ).id

    for (const access of ['read', 'edit'] as const) {
      await shareWithOther(access)
      const token = f.token('other')
      const badges = await library(token)
      // Con lectura no sale; con edición sale y se puede cambiar.
      expect(find(badges, linked)?.canEdit).toBe(access === 'edit' ? true : undefined)
      for (const badge of badges) {
        // El mismo nombre: si alguna se colara, no cambiaría nada.
        const put = await send(token, 'PUT', `/teacher/badges/${badge.id}`, { name: badge.name })
        expect([badge.name, put.statusCode]).toEqual([badge.name, badge.canEdit ? 200 : 404])
      }
    }
    await prisma.classTeacher.deleteMany({
      where: { classId: f.classId, userId: f.users.other.id },
    })
  })

  it('«crear una parecida»: una propia con el nombre, la rareza y la imagen pública de una del sistema', async () => {
    const system = find(await library(f.token('owner')), systemId)!
    const created = await send(f.token('owner'), 'POST', '/teacher/badges', {
      name: system.name,
      rarity: system.rarity,
      imageUrl: system.imageUrl!,
    })
    expect(created.statusCode).toBe(201)
    const copyId: string = created.json().badge.id

    // Se guarda la misma ruta, sin tocar la del sistema.
    expect(
      await prisma.badge.findUniqueOrThrow({
        where: { id: copyId },
        select: { teacherId: true, imageUrl: true, rarity: true, triggerType: true },
      })
    ).toEqual({
      teacherId: f.users.owner.id,
      imageUrl: '/badges/trono-olimpo.svg',
      rarity: 'legendary',
      triggerType: null,
    })
    expect(find(await library(f.token('owner')), copyId)).toMatchObject({
      isSystem: false,
      canEdit: true,
      trigger: null,
    })
    expect(
      await prisma.badge.findUniqueOrThrow({ where: { id: systemId }, select: { teacherId: true } })
    ).toEqual({ teacherId: null })
  })
})
