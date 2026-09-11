import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests de la tarea de recordatorios de entrega (Fase 3, punto 3).
 *
 * Lo que importa aquí es a quién se avisa y a quién no: avisar de más es spam a
 * un aula entera, y avisar de menos deja al alumno sin el recordatorio que
 * justifica el punto.
 */

const mocks = vi.hoisted(() => ({
  missionFindMany: vi.fn(),
  classEnrollmentFindMany: vi.fn(),
  notificationDeleteMany: vi.fn(),
  notifyMany: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    mission: { findMany: mocks.missionFindMany },
    classEnrollment: { findMany: mocks.classEnrollmentFindMany },
    notification: { deleteMany: mocks.notificationDeleteMany },
  },
}))

vi.mock('../../src/modules/notifications/notifications.service.js', () => ({
  notifyMany: mocks.notifyMany,
}))

import { registerNotificationJobs } from '../../src/modules/notifications/notifications.jobs.js'
import { runJobNow } from '../../src/utils/scheduler.js'

registerNotificationJobs()

const NOW = new Date('2026-09-04T10:00:00.000Z')
const in10h = new Date('2026-09-04T20:00:00.000Z')
const in3h = new Date('2026-09-04T13:00:00.000Z')

const mission = (overrides: any = {}) => ({
  id: 'm1',
  title: 'El mapa perdido',
  deadline: in10h,
  classId: 'c1',
  class: { name: '1º ESO' },
  progress: [],
  ...overrides,
})

const enrollment = (studentId: string, missionReminders = true, classId = 'c1') => ({
  classId,
  studentId,
  student: { settings: { missionReminders } },
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.setSystemTime(NOW)
  mocks.notifyMany.mockImplementation((inputs: unknown[]) => Promise.resolve(inputs.length))
})

async function run() {
  return runJobNow('deadline-reminders')
}

describe('deadline-reminders', () => {
  it('no consulta matrículas si no vence ninguna misión', async () => {
    mocks.missionFindMany.mockResolvedValue([])

    expect(await run()).toEqual({ missions: 0, candidates: 0, created: 0 })
    expect(mocks.classEnrollmentFindMany).not.toHaveBeenCalled()
    expect(mocks.notifyMany).not.toHaveBeenCalled()
  })

  it('avisa a cada alumno matriculado', async () => {
    mocks.missionFindMany.mockResolvedValue([mission()])
    mocks.classEnrollmentFindMany.mockResolvedValue([enrollment('s1'), enrollment('s2')])

    expect(await run()).toEqual({ missions: 1, candidates: 2, created: 2 })

    const avisos = mocks.notifyMany.mock.calls[0][0]
    expect(avisos.map((a: any) => a.userId)).toEqual(['s1', 's2'])
    expect(avisos[0].copy).toBe('deadline_reminder')
    expect(avisos[0].params).toEqual({ mission: 'El mapa perdido', hours: 10, class: '1º ESO' })
    expect(avisos[0].actionUrl).toBe('/alumno/misiones/m1')
  })

  it('no avisa a quien ya completó la misión', async () => {
    mocks.missionFindMany.mockResolvedValue([
      mission({ progress: [{ studentId: 's1', completedAt: NOW }, { studentId: 's2', completedAt: null }] }),
    ])
    mocks.classEnrollmentFindMany.mockResolvedValue([enrollment('s1'), enrollment('s2')])

    await run()

    expect(mocks.notifyMany.mock.calls[0][0].map((a: any) => a.userId)).toEqual(['s2'])
  })

  it('no avisa a quien ha apagado los recordatorios', async () => {
    mocks.missionFindMany.mockResolvedValue([mission()])
    mocks.classEnrollmentFindMany.mockResolvedValue([enrollment('s1', false), enrollment('s2', true)])

    await run()

    expect(mocks.notifyMany.mock.calls[0][0].map((a: any) => a.userId)).toEqual(['s2'])
  })

  it('avisa a quien nunca ha tocado sus ajustes', async () => {
    mocks.missionFindMany.mockResolvedValue([mission()])
    mocks.classEnrollmentFindMany.mockResolvedValue([{ classId: 'c1', studentId: 's1', student: { settings: null } }])

    await run()

    expect(mocks.notifyMany.mock.calls[0][0]).toHaveLength(1)
  })

  it('sube la prioridad cuando quedan menos de seis horas', async () => {
    mocks.missionFindMany.mockResolvedValue([mission({ deadline: in3h })])
    mocks.classEnrollmentFindMany.mockResolvedValue([enrollment('s1')])

    await run()

    const aviso = mocks.notifyMany.mock.calls[0][0][0]
    expect(aviso.priority).toBe('high')
    expect(aviso.params.hours).toBe(3)
  })

  it('mete la fecha en la clave de deduplicación, para que moverla vuelva a avisar', async () => {
    mocks.missionFindMany.mockResolvedValue([mission()])
    mocks.classEnrollmentFindMany.mockResolvedValue([enrollment('s1')])

    await run()

    const aviso = mocks.notifyMany.mock.calls[0][0][0]
    expect(aviso.dedupeKey).toBe(`deadline:m1:${in10h.toISOString()}`)
    expect(aviso.expiresAt).toEqual(in10h)
  })

  it('pide las matrículas de todas las clases en una sola consulta', async () => {
    mocks.missionFindMany.mockResolvedValue([
      mission({ id: 'm1', classId: 'c1' }),
      mission({ id: 'm2', classId: 'c1' }),
      mission({ id: 'm3', classId: 'c2', class: { name: '2º ESO' } }),
    ])
    mocks.classEnrollmentFindMany.mockResolvedValue([
      enrollment('s1', true, 'c1'),
      enrollment('s2', true, 'c2'),
    ])

    const result = await run()

    expect(mocks.classEnrollmentFindMany).toHaveBeenCalledTimes(1)
    expect(mocks.classEnrollmentFindMany.mock.calls[0][0].where.classId).toEqual({ in: ['c1', 'c2'] })
    // Dos misiones de c1 para s1, una de c2 para s2.
    expect(result).toEqual({ missions: 3, candidates: 3, created: 3 })
  })

  it('excluye del reparto a las matrículas de prueba del profesor', async () => {
    mocks.missionFindMany.mockResolvedValue([mission()])
    mocks.classEnrollmentFindMany.mockResolvedValue([])

    await run()

    expect(mocks.classEnrollmentFindMany.mock.calls[0][0].where.isPreview).toBe(false)
  })
})

describe('notifications-cleanup', () => {
  it('borra los avisos caducados y los leídos que ya nadie va a mirar', async () => {
    mocks.notificationDeleteMany.mockResolvedValue({ count: 7 })

    expect(await runJobNow('notifications-cleanup')).toEqual({ deleted: 7 })

    const where = mocks.notificationDeleteMany.mock.calls[0][0].where
    expect(where.OR[0].expiresAt.lt).toBeInstanceOf(Date)
    expect(where.OR[1].isRead).toBe(true)
  })
})
