import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'

/**
 * El interruptor del mapa de misiones (E3, entrega 2): una funcionalidad en
 * pruebas, apagada de entrada también en las clases que ya existían, que
 * enciende quien administra la clase, que ve el alumnado y que viaja con las
 * funcionalidades al duplicar y al importar una plantilla, aunque no sale en su
 * ficha (decisiones 10 y 11 del mapa).
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
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { publicTemplateRoutes } from '../../src/modules/templates/templates.routes.js'
import {
  DEFAULT_CLASS_SETTINGS,
  resolveClassSettings,
  templateFeatures,
} from '../../src/utils/class-settings.js'

describe('missionMap en los ajustes de la clase', () => {
  it('apagado de entrada, también sin ajustes guardados o con un valor raro', () => {
    expect(DEFAULT_CLASS_SETTINGS.missionMap).toBe(false)
    expect(resolveClassSettings(null).missionMap).toBe(false)
    expect(resolveClassSettings({ shop: false }).missionMap).toBe(false)
    expect(resolveClassSettings({ missionMap: 'sí' }).missionMap).toBe(false)
    expect(resolveClassSettings({ missionMap: true }).missionMap).toBe(true)
    // El resto sigue encendido por defecto.
    expect(resolveClassSettings(null)).toMatchObject({ xp: true, shop: true, sounds: true })
  })

  it('la ficha de una plantilla no lo enseña, esté como esté', () => {
    expect(templateFeatures({ missionMap: true })).not.toHaveProperty('missionMap')
    expect(Object.keys(templateFeatures(null)).sort()).toEqual(
      Object.keys(DEFAULT_CLASS_SETTINGS)
        .filter(key => key !== 'missionMap')
        .sort()
    )
  })
})

describeWithDatabase('interruptor del mapa de misiones', () => {
  let app: FastifyInstance
  let f: ClassFixture

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(publicTemplateRoutes, { prefix: '/templates' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  const as = (actor: 'owner' | 'other' | 'student') => ({
    authorization: `Bearer ${f.token(actor)}`,
  })

  const setMap = (value: unknown, headers = as('owner')) =>
    app.inject({
      method: 'PUT',
      url: `/teacher/classes/${f.classId}`,
      headers,
      payload: { settings: { missionMap: value } },
    })

  it('lo enciende quien administra la clase, queda en el registro y lo ve el alumnado', async () => {
    const before = await app.inject({
      method: 'GET',
      url: `/teacher/classes/${f.classId}`,
      headers: as('owner'),
    })
    expect(before.json().class.settings.missionMap).toBe(false)

    const res = await setMap(true)
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().class.settings).toMatchObject({ missionMap: true, xp: true })

    const log = await prisma.classActionLog.findFirst({
      where: { classId: f.classId, action: 'class.settings_changed' },
      orderBy: { createdAt: 'desc' },
    })
    expect(log?.metadata).toEqual({ fields: ['settings'] })

    const student = await app.inject({
      method: 'GET',
      url: `/students/classes/${f.classId}`,
      headers: as('student'),
    })
    expect(student.statusCode).toBe(200)
    expect(JSON.stringify(student.json())).toContain('"missionMap":true')
  })

  it('con edición no basta: es un ajuste de la clase', async () => {
    await prisma.classTeacher.upsert({
      where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
      create: { classId: f.classId, userId: f.users.other.id, access: 'edit', profile: 'sustituto' },
      update: { access: 'edit', profile: 'sustituto' },
    })
    try {
      expect((await setMap(false, as('other'))).statusCode).toBe(403)
    } finally {
      await prisma.classTeacher.delete({
        where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
      })
    }
  })

  it('un valor que no es sí o no se rechaza sin tocar nada', async () => {
    await setMap(true)
    expect((await setMap('quizá')).statusCode).toBe(400)
    const cls = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
    expect(resolveClassSettings(cls.settings).missionMap).toBe(true)
  })

  it('viaja con las funcionalidades al duplicar la clase, y sin ellas vuelve a su valor de entrada', async () => {
    await setMap(true)
    const duplicate = (features: boolean) =>
      app.inject({
        method: 'POST',
        url: `/teacher/classes/${f.classId}/duplicate`,
        headers: as('owner'),
        payload: { features },
      })
    const withFeatures = await duplicate(true)
    const withoutFeatures = await duplicate(false)
    const settingsOf = async (id: string) =>
      resolveClassSettings(
        (await prisma.class.findUniqueOrThrow({ where: { id } })).settings
      ).missionMap
    expect(await settingsOf(withFeatures.json().class.id)).toBe(true)
    expect(await settingsOf(withoutFeatures.json().class.id)).toBe(false)
  })

  it('la ficha pública de una plantilla no lo enseña aunque esté encendido', async () => {
    await setMap(true)
    await prisma.class.update({
      where: { id: f.classId },
      data: { isTemplate: true, subject: 'historia', educationLevel: 'eso', language: 'es' },
    })
    try {
      const detail = await app.inject({ method: 'GET', url: `/templates/${f.classId}` })
      expect(detail.statusCode, detail.body).toBe(200)
      expect(detail.json().features).not.toHaveProperty('missionMap')
      expect(detail.json().features).toMatchObject({ xp: true })
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: false } })
    }
  })

  it('al importar una plantilla, el interruptor llega como estaba, con el resto de funcionalidades', async () => {
    await prisma.class.update({
      where: { id: f.classId },
      data: {
        settings: { ...DEFAULT_CLASS_SETTINGS, sounds: false, missionMap: true },
        isTemplate: true,
        subject: 'historia',
        educationLevel: 'eso',
        language: 'es',
      },
    })
    try {
      const res = await app.inject({
        method: 'POST',
        url: `/teacher/templates/${f.classId}/import`,
        headers: as('other'),
        payload: { missions: false },
      })
      expect(res.statusCode, res.body).toBe(200)
      const copy = await prisma.class.findUniqueOrThrow({ where: { id: res.json().class.id } })
      // Va con las funcionalidades, como al duplicar, aunque la ficha no lo enseñe.
      expect(resolveClassSettings(copy.settings)).toMatchObject({ missionMap: true, sounds: false })

      // Y apagado en la plantilla, llega apagado.
      await prisma.class.update({
        where: { id: f.classId },
        data: { settings: { ...DEFAULT_CLASS_SETTINGS, missionMap: false } },
      })
      const off = await app.inject({
        method: 'POST',
        url: `/teacher/templates/${f.classId}/import`,
        headers: as('other'),
        payload: { missions: false },
      })
      expect(off.statusCode, off.body).toBe(200)
      const offCopy = await prisma.class.findUniqueOrThrow({ where: { id: off.json().class.id } })
      expect(resolveClassSettings(offCopy.settings).missionMap).toBe(false)
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: false } })
    }
  })
})
