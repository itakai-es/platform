import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests del servicio central de avisos (Fase 3, punto 3).
 *
 * Invariantes que sostienen todo lo demás:
 *  - el aviso interno se crea SIEMPRE; el correo es opcional y no puede tumbarlo
 *  - la deduplicación evita que una tarea cada 15 minutos acribille a nadie
 *  - el texto se compone en el idioma del destinatario, no en castellano fijo
 *  - `notifyMany` carga los destinatarios de una sola consulta
 */

const mocks = vi.hoisted(() => ({
  notificationFindFirst: vi.fn(),
  notificationCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  sendNotificationEmail: vi.fn(),
  toAbsoluteAppUrl: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    notification: { findFirst: mocks.notificationFindFirst, create: mocks.notificationCreate },
    user: { findUnique: mocks.userFindUnique, findMany: mocks.userFindMany },
  },
}))

vi.mock('../../src/utils/email.js', () => ({
  sendNotificationEmail: mocks.sendNotificationEmail,
}))

vi.mock('../../src/utils/app-url.js', () => ({
  toAbsoluteAppUrl: mocks.toAbsoluteAppUrl,
}))

import { notify, notifyMany } from '../../src/modules/notifications/notifications.service.js'

const USER = 'user-1'

const userRow = (overrides: any = {}) => ({
  id: USER,
  email: 'alumna@example.com',
  settings: { language: 'es', emailNotifications: true },
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.notificationFindFirst.mockResolvedValue(null)
  mocks.notificationCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'n1', ...data }))
  mocks.userFindUnique.mockResolvedValue(userRow())
  mocks.userFindMany.mockResolvedValue([userRow()])
  mocks.toAbsoluteAppUrl.mockImplementation((path: string) => Promise.resolve(`https://itakai.es${path}`))
  mocks.sendNotificationEmail.mockResolvedValue(true)
})

describe('notify', () => {
  it('crea el aviso con el texto compuesto en castellano', async () => {
    await notify({
      userId: USER,
      type: 'join_accepted',
      copy: 'join_accepted',
      params: { class: '1º ESO' },
    })

    const { data } = mocks.notificationCreate.mock.calls[0][0]
    expect(data.title).toBe('Solicitud aceptada')
    expect(data.message).toBe('Tu solicitud para unirte a 1º ESO ha sido aceptada.')
    expect(data.priority).toBe('medium')
  })

  it('compone el texto en el idioma del destinatario', async () => {
    mocks.userFindUnique.mockResolvedValue(userRow({ settings: { language: 'el', emailNotifications: true } }))

    await notify({
      userId: USER,
      type: 'submission_received',
      copy: 'submission_received',
      params: { student: 'Sofía', enigma: 'El mapa', class: '1º ESO' },
    })

    const { data } = mocks.notificationCreate.mock.calls[0][0]
    expect(data.title).toBe('Νέα εργασία προς διόρθωση')
    expect(data.message).toBe('Ο/Η Sofía παρέδωσε «El mapa» στο 1º ESO.')
  })

  it('cae al castellano cuando el usuario no tiene ajustes', async () => {
    mocks.userFindUnique.mockResolvedValue(userRow({ settings: null }))

    await notify({ userId: USER, type: 'class_invitation', copy: 'class_invitation', params: { class: 'Historia' } })

    expect(mocks.notificationCreate.mock.calls[0][0].data.title).toBe('Nueva invitación')
  })

  it('respeta el texto libre que escribe una persona', async () => {
    await notify({
      userId: USER,
      type: 'join_rejected',
      copy: 'join_rejected',
      params: { class: '1º ESO' },
      messageOverride: 'Este grupo ya está completo',
    })

    expect(mocks.notificationCreate.mock.calls[0][0].data.message).toBe('Este grupo ya está completo')
  })

  it('no crea nada si ya existe un aviso con la misma clave', async () => {
    mocks.notificationFindFirst.mockResolvedValue({ id: 'ya-existe' })

    const result = await notify({
      userId: USER,
      type: 'deadline_reminder',
      copy: 'deadline_reminder',
      params: { mission: 'M', hours: 5, class: 'C' },
      dedupeKey: 'deadline:m1:2026-09-04',
    })

    expect(result).toBeNull()
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it('guarda la clave de deduplicación junto a los metadatos', async () => {
    await notify({
      userId: USER,
      type: 'deadline_reminder',
      copy: 'deadline_reminder',
      params: { mission: 'M', hours: 5, class: 'C' },
      metadata: { missionId: 'm1' },
      dedupeKey: 'deadline:m1:2026-09-04',
    })

    expect(mocks.notificationCreate.mock.calls[0][0].data.metadata).toEqual({
      missionId: 'm1',
      dedupeKey: 'deadline:m1:2026-09-04',
    })
  })

  it('no manda correo si no se pide', async () => {
    await notify({ userId: USER, type: 'join_accepted', copy: 'join_accepted', params: { class: 'C' } })
    expect(mocks.sendNotificationEmail).not.toHaveBeenCalled()
  })

  it('manda correo en el idioma del destinatario cuando se pide', async () => {
    mocks.userFindUnique.mockResolvedValue(userRow({ settings: { language: 'pt', emailNotifications: true } }))

    await notify({
      userId: USER,
      type: 'join_accepted',
      copy: 'join_accepted',
      params: { class: 'Turma A' },
      actionUrl: '/alumno/clases/c1',
      alsoByEmail: true,
      emailAction: 'go_to_class',
    })

    const [to, language, payload] = mocks.sendNotificationEmail.mock.calls[0]
    expect(to).toBe('alumna@example.com')
    expect(language).toBe('pt')
    expect(payload.title).toBe('Pedido aceite')
    expect(payload.actionUrl).toBe('https://itakai.es/alumno/clases/c1')
    expect(payload.actionLabel).toBe('Ir para a turma')
  })

  it('no manda correo a quien lo ha desactivado, pero sí crea el aviso interno', async () => {
    mocks.userFindUnique.mockResolvedValue(userRow({ settings: { language: 'es', emailNotifications: false } }))

    const result = await notify({
      userId: USER,
      type: 'join_accepted',
      copy: 'join_accepted',
      params: { class: 'C' },
      alsoByEmail: true,
    })

    expect(result).not.toBeNull()
    expect(mocks.sendNotificationEmail).not.toHaveBeenCalled()
  })

  it('no manda correo a una dirección interna no entregable', async () => {
    mocks.userFindUnique.mockResolvedValue(userRow({ email: 'alumno-23@itakai.invalid' }))

    await notify({
      userId: USER,
      type: 'join_accepted',
      copy: 'join_accepted',
      params: { class: 'C' },
      alsoByEmail: true,
    })

    expect(mocks.notificationCreate).toHaveBeenCalledTimes(1)
    expect(mocks.sendNotificationEmail).not.toHaveBeenCalled()
  })

  it('un correo que falla no tumba el aviso', async () => {
    mocks.sendNotificationEmail.mockRejectedValue(new Error('Resend caído'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await notify({
      userId: USER,
      type: 'join_accepted',
      copy: 'join_accepted',
      params: { class: 'C' },
      alsoByEmail: true,
    })

    expect(result).not.toBeNull()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('no crea nada si el destinatario ya no existe', async () => {
    mocks.userFindUnique.mockResolvedValue(null)

    const result = await notify({ userId: USER, type: 'join_accepted', copy: 'join_accepted', params: { class: 'C' } })

    expect(result).toBeNull()
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })
})

describe('notifyMany', () => {
  it('carga todos los destinatarios en una sola consulta', async () => {
    mocks.userFindMany.mockResolvedValue([
      userRow({ id: 'u1', email: 'a@example.com' }),
      userRow({ id: 'u2', email: 'b@example.com', settings: { language: 'gl', emailNotifications: true } }),
    ])

    const created = await notifyMany([
      { userId: 'u1', type: 'deadline_reminder', copy: 'deadline_reminder', params: { mission: 'M', hours: 3, class: 'C' } },
      { userId: 'u2', type: 'deadline_reminder', copy: 'deadline_reminder', params: { mission: 'M', hours: 3, class: 'C' } },
    ])

    expect(created).toBe(2)
    expect(mocks.userFindMany).toHaveBeenCalledTimes(1)
    expect(mocks.userFindUnique).not.toHaveBeenCalled()
    // Cada uno en su idioma.
    expect(mocks.notificationCreate.mock.calls[0][0].data.title).toBe('«M» termina pronto')
    expect(mocks.notificationCreate.mock.calls[1][0].data.title).toBe('«M» remata pronto')
  })

  it('descuenta los duplicados del recuento', async () => {
    mocks.userFindMany.mockResolvedValue([userRow({ id: 'u1' }), userRow({ id: 'u2' })])
    mocks.notificationFindFirst.mockResolvedValueOnce({ id: 'ya-existe' }).mockResolvedValue(null)

    const created = await notifyMany([
      { userId: 'u1', type: 'deadline_reminder', copy: 'deadline_reminder', params: { mission: 'M', hours: 3, class: 'C' }, dedupeKey: 'k1' },
      { userId: 'u2', type: 'deadline_reminder', copy: 'deadline_reminder', params: { mission: 'M', hours: 3, class: 'C' }, dedupeKey: 'k2' },
    ])

    expect(created).toBe(1)
  })

  it('no consulta nada si no hay avisos que mandar', async () => {
    expect(await notifyMany([])).toBe(0)
    expect(mocks.userFindMany).not.toHaveBeenCalled()
  })
})
