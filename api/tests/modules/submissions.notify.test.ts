import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Aviso al profesor de una entrega nueva (submitEnigma).
 *
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
  notify: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    missionEnigma: { findUnique: mocks.enigmaFindUnique },
    classEnrollment: { findUnique: mocks.enrollmentFindUnique },
    enigmaSubmission: { findFirst: mocks.submissionFindFirst, create: mocks.submissionCreate },
    class: { findUnique: mocks.classFindUnique },
    activity: { create: mocks.activityCreate },
  },
}))

vi.mock('../../src/modules/notifications/notifications.service.js', () => ({
  notify: mocks.notify,
}))

vi.mock('../../src/modules/storage/storage.service.js', () => ({
  saveUpload: vi.fn(async (key: string) => `/uploads/${key}`),
}))

import {
  submissionsService,
  submissionReviewUrl,
} from '../../src/modules/submissions/submissions.service.js'

const TEACHER = 'teacher-1'
const STUDENT = 'student-1'
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
  mocks.notify.mockResolvedValue(undefined)
})

describe('submissionReviewUrl', () => {
  it('apunta a la misión con la ventana de entregas del enigma', () => {
    expect(submissionReviewUrl(CLASS, MISSION, ENIGMA)).toBe(
      `/profesor/clases/${CLASS}/misiones/${MISSION}?entregas=${ENIGMA}`
    )
  })
})

describe('submitEnigma — aviso de entrega nueva', () => {
  it('avisa al profesor con el enlace a la misión y el enigma', async () => {
    await submissionsService.submitEnigma(STUDENT, ENIGMA)

    expect(mocks.notify).toHaveBeenCalledTimes(1)
    const payload = mocks.notify.mock.calls[0][0]
    expect(payload).toMatchObject({
      userId: TEACHER,
      type: 'submission_received',
      actionUrl: `/profesor/clases/${CLASS}/misiones/${MISSION}?entregas=${ENIGMA}`,
      params: { student: 'Ana López', enigma: 'El laberinto', class: '3º B' },
      metadata: { submissionId: SUB, enigmaId: ENIGMA, missionId: MISSION, classId: CLASS },
    })
    expect(payload.actionUrl).not.toContain('/entregas')
  })

  it('usa el alias del alumno en la clase si lo tiene', async () => {
    mocks.enrollmentFindUnique.mockResolvedValueOnce({
      avatarUrl: null,
      nickname: 'Ariadna',
      student: { name: 'Ana López' },
    })

    await submissionsService.submitEnigma(STUDENT, ENIGMA)

    expect(mocks.notify.mock.calls[0][0].params.student).toBe('Ariadna')
  })

  it('la entrega se guarda aunque el aviso falle', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.notify.mockRejectedValueOnce(new Error('sin conexión'))

    await expect(submissionsService.submitEnigma(STUDENT, ENIGMA)).resolves.toMatchObject({
      submission: { id: SUB, status: 'pendiente' },
    })
    await new Promise(resolve => setImmediate(resolve))
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
