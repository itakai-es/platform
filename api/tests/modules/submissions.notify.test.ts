import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Aviso al profesorado de una entrega nueva (submitEnigma).
 *
 *  - llega a quien tiene edición o más en la clase, uno por persona
 *  - sin matrícula válida en la clase no se entrega nada (404)
 *  - quien entrega no se avisa a sí mismo (vista previa de quien imparte la clase)
 *  - lleva a la misión con la ventana de entregas de ese enigma abierta
 *    (`?entregas=<enigmaId>`), no a la antigua página de entregas de la clase
 *  - guarda en metadata la entrega, el enigma, la misión y la clase
 *  - un fallo al avisar no tumba la entrega
 */

const mocks = vi.hoisted(() => ({
  enigmaFindUnique: vi.fn(),
  enrollmentFindUnique: vi.fn(),
  submissionFindFirst: vi.fn(),
  submissionCreate: vi.fn(),
  classFindUnique: vi.fn(),
  activityCreate: vi.fn(),
  notifyMany: vi.fn(),
  recipients: vi.fn(),
  studentEnrollment: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    missionEnigma: { findUnique: mocks.enigmaFindUnique },
    classEnrollment: { findUniqueOrThrow: mocks.enrollmentFindUnique },
    enigmaSubmission: { findFirst: mocks.submissionFindFirst, create: mocks.submissionCreate },
    class: { findUnique: mocks.classFindUnique },
    activity: { create: mocks.activityCreate },
  },
}))

vi.mock('../../src/modules/notifications/notifications.service.js', () => ({
  notify: vi.fn(),
  notifyMany: mocks.notifyMany,
}))

vi.mock('../../src/utils/class-access.js', () => ({
  classTeacherRecipients: mocks.recipients,
  getStudentEnrollment: mocks.studentEnrollment,
}))

vi.mock('../../src/modules/storage/storage.service.js', () => ({
  saveUpload: vi.fn(async (key: string) => `/uploads/${key}`),
}))

import {
  submissionsService,
  submissionReviewUrl,
} from '../../src/modules/submissions/submissions.service.js'
import { NotFoundError } from '../../src/utils/errors.js'

const TEACHER = 'teacher-1'
const CO_TEACHER = 'teacher-2'
const STUDENT = 'student-1'
const STUDENT_USER = { id: STUDENT, role: 'student' }
const CLASS = 'class-1'
const MISSION = 'mission-1'
const ENIGMA = 'enigma-1'
const SUB = 'submission-1'

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset()

  mocks.enigmaFindUnique.mockResolvedValue({
    id: ENIGMA,
    title: 'El laberinto',
    missionId: MISSION,
    mission: {
      id: MISSION,
      classId: CLASS,
      status: 'activa',
      deadline: null,
      class: { id: CLASS, name: '3º B', teacherId: TEACHER, archived: false },
    },
  })
  mocks.studentEnrollment.mockResolvedValue({ id: 'enrollment-1', isPreview: false })
  mocks.enrollmentFindUnique.mockResolvedValue({
    avatarUrl: '/avatar.svg',
    nickname: null,
    student: { name: 'Ana López' },
  })
  mocks.submissionFindFirst.mockResolvedValue(null)
  mocks.submissionCreate.mockResolvedValue({
    id: SUB,
    enigmaId: ENIGMA,
    status: 'pendiente',
    fileName: null,
    submittedAt: new Date('2026-09-16T10:00:00Z'),
    enigma: { title: 'El laberinto', mission: { title: 'Teseo' } },
  })
  mocks.classFindUnique.mockResolvedValue({ name: '3º B' })
  mocks.activityCreate.mockResolvedValue({})
  mocks.notifyMany.mockResolvedValue(1)
  mocks.recipients.mockResolvedValue([TEACHER])
})

/** Avisos que se han pedido crear, uno por destinatario. */
async function sentNotifications() {
  // El aviso sale sin esperar a que se resuelva: se dejan correr sus promesas.
  await new Promise(resolve => setImmediate(resolve))
  expect(mocks.notifyMany).toHaveBeenCalledTimes(1)
  return mocks.notifyMany.mock.calls[0][0] as Array<Record<string, any>>
}

describe('submissionReviewUrl', () => {
  it('apunta a la misión con la ventana de entregas del enigma', () => {
    expect(submissionReviewUrl(CLASS, MISSION, ENIGMA)).toBe(
      `/profesor/clases/${CLASS}/misiones/${MISSION}?entregas=${ENIGMA}`
    )
  })
})

describe('submitEnigma — aviso de entrega nueva', () => {
  it('avisa al profesor con el enlace a la misión y el enigma', async () => {
    await submissionsService.submitEnigma(STUDENT_USER, ENIGMA)

    const [payload] = await sentNotifications()
    expect(payload).toMatchObject({
      userId: TEACHER,
      type: 'submission_received',
      actionUrl: `/profesor/clases/${CLASS}/misiones/${MISSION}?entregas=${ENIGMA}`,
      params: { student: 'Ana López', enigma: 'El laberinto', class: '3º B' },
      metadata: { submissionId: SUB, enigmaId: ENIGMA, missionId: MISSION, classId: CLASS },
    })
    // Cada entrega avisa una sola vez, al crearse: no hace falta clave antiduplicados.
    expect(payload.dedupeKey).toBeUndefined()
    expect(payload.actionUrl).not.toContain('/entregas')
  })

  it('avisa a todo el profesorado con edición o más de la clase, una vez a cada uno', async () => {
    mocks.recipients.mockResolvedValueOnce([TEACHER, CO_TEACHER])

    await submissionsService.submitEnigma(STUDENT_USER, ENIGMA)

    expect(mocks.recipients).toHaveBeenCalledWith(CLASS, 'edit')
    const sent = await sentNotifications()
    expect(sent.map(n => n.userId)).toEqual([TEACHER, CO_TEACHER])
  })

  it('no avisa a quien entrega aunque imparta la clase', async () => {
    mocks.recipients.mockResolvedValueOnce([TEACHER, STUDENT])

    await submissionsService.submitEnigma(STUDENT_USER, ENIGMA)

    expect((await sentNotifications()).map(n => n.userId)).toEqual([TEACHER])
  })

  it('usa el alias del alumno en la clase si lo tiene', async () => {
    mocks.enrollmentFindUnique.mockResolvedValueOnce({
      avatarUrl: null,
      nickname: 'Ariadna',
      student: { name: 'Ana López' },
    })

    await submissionsService.submitEnigma(STUDENT_USER, ENIGMA)

    expect((await sentNotifications())[0].params.student).toBe('Ariadna')
  })

  it('la entrega se guarda aunque el aviso falle', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.notifyMany.mockRejectedValueOnce(new Error('sin conexión'))

    await expect(submissionsService.submitEnigma(STUDENT_USER, ENIGMA)).resolves.toMatchObject({
      submission: { id: SUB, status: 'pendiente' },
    })
    await new Promise(resolve => setImmediate(resolve))
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('sin matrícula válida en la clase responde 404 y no guarda nada', async () => {
    mocks.studentEnrollment.mockResolvedValueOnce(null)

    await expect(submissionsService.submitEnigma(STUDENT_USER, ENIGMA)).rejects.toBeInstanceOf(
      NotFoundError
    )
    expect(mocks.studentEnrollment).toHaveBeenCalledWith(CLASS, STUDENT_USER)
    expect(mocks.submissionCreate).not.toHaveBeenCalled()
    expect(mocks.activityCreate).not.toHaveBeenCalled()
    expect(mocks.recipients).not.toHaveBeenCalled()
  })
})
