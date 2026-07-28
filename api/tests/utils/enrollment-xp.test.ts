import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks are hoisted by vi.hoisted so they can be referenced inside vi.mock's
// factory (vi.mock is itself hoisted to the top of the file).
const mocks = vi.hoisted(() => ({
  updateMock: vi.fn(),
  findUniqueMock: vi.fn(),
  // El cálculo de nivel lee la levelConfig de la clase; sin config → DEFAULT.
  classFindUniqueMock: vi.fn(),
  // system-badges dependencies — default to "no eligible badges" so that
  // applyXpDelta tests don't exercise the badge-awarding path.
  studentMissionProgressCountMock: vi.fn(),
  classEnrollmentAggregateMock: vi.fn(),
  badgeFindManyMock: vi.fn(),
  studentBadgeCreateMock: vi.fn(),
  activityCreateMock: vi.fn(),
  notificationCreateMock: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    classEnrollment: {
      update: mocks.updateMock,
      findUnique: mocks.findUniqueMock,
      aggregate: mocks.classEnrollmentAggregateMock,
    },
    class: { findUnique: mocks.classFindUniqueMock },
    studentMissionProgress: { count: mocks.studentMissionProgressCountMock },
    badge: { findMany: mocks.badgeFindManyMock },
    studentBadge: { create: mocks.studentBadgeCreateMock },
    activity: { create: mocks.activityCreateMock },
    notification: { create: mocks.notificationCreateMock },
  },
}))

const { updateMock, findUniqueMock } = mocks

import { applyXpDelta, syncEnrollmentLevel } from '../../src/utils/enrollment-xp.js'
import { getLevelFromXP, getTotalXPForLevel } from '../../src/utils/xp-calculator.js'

const STUDENT = 'student-1'
const CLASS = 'class-1'

beforeEach(() => {
  updateMock.mockReset()
  findUniqueMock.mockReset()
  // Default: the student has no completed missions, no enrollments beyond
  // the one under test, and no system badges ever match. These defaults
  // make applyXpDelta a no-op for system badges in every existing test.
  // Sin levelConfig personalizada → resolveLevelConfig usa el sistema por defecto.
  mocks.classFindUniqueMock.mockReset().mockResolvedValue({ levelConfig: null })
  mocks.studentMissionProgressCountMock.mockReset().mockResolvedValue(0)
  mocks.classEnrollmentAggregateMock.mockReset().mockResolvedValue({ _max: { xp: 0, level: 1 } })
  mocks.badgeFindManyMock.mockReset().mockResolvedValue([])
  mocks.studentBadgeCreateMock.mockReset().mockResolvedValue({})
  mocks.activityCreateMock.mockReset().mockResolvedValue({})
  mocks.notificationCreateMock.mockReset().mockResolvedValue({})
})

describe('applyXpDelta — positive delta', () => {
  it('uses atomic increment and persists the new level if it changed', async () => {
    updateMock.mockResolvedValueOnce({ xp: 100, level: 1 })

    const result = await applyXpDelta({ studentId: STUDENT, classId: CLASS, delta: 100 })

    // First call is the atomic increment.
    expect(updateMock).toHaveBeenNthCalledWith(1, {
      where: { studentId_classId: { studentId: STUDENT, classId: CLASS } },
      data: { xp: { increment: 100 } },
    })

    const expectedLevel = getLevelFromXP(100)
    expect(result.previousXP).toBe(0)
    expect(result.newXP).toBe(100)
    expect(result.newLevel).toBe(expectedLevel)
    // Level 1 → level 2 at 50 XP, so 100 triggers a level change from 1 to 2+.
    expect(result.levelChanged).toBe(true)

    // Level update follows the increment.
    expect(updateMock).toHaveBeenNthCalledWith(2, {
      where: { studentId_classId: { studentId: STUDENT, classId: CLASS } },
      data: { level: expectedLevel },
    })
  })

  it('does not touch level when it does not change', async () => {
    // Start at level 5 with 900 XP; adding 10 XP keeps level 5.
    updateMock.mockResolvedValueOnce({ xp: 910, level: 5 })

    const previousLevel = getLevelFromXP(900)
    const newLevel = getLevelFromXP(910)
    // Sanity: prior belief
    expect(previousLevel).toBe(newLevel)

    const result = await applyXpDelta({ studentId: STUDENT, classId: CLASS, delta: 10 })

    expect(result.levelChanged).toBe(false)
    // Only one update call — the atomic increment. No follow-up level write.
    expect(updateMock).toHaveBeenCalledTimes(1)
  })
})

describe('applyXpDelta — negative delta', () => {
  it('decrements XP and recalculates level downward', async () => {
    // Student at 1000 XP → after -800, they should drop down a level.
    updateMock.mockResolvedValueOnce({ xp: 200, level: 5 })

    const result = await applyXpDelta({ studentId: STUDENT, classId: CLASS, delta: -800 })

    expect(updateMock).toHaveBeenNthCalledWith(1, {
      where: { studentId_classId: { studentId: STUDENT, classId: CLASS } },
      data: { xp: { increment: -800 } },
    })
    expect(result.previousXP).toBe(1000)
    expect(result.newXP).toBe(200)
    expect(result.newLevel).toBe(getLevelFromXP(200))
    expect(result.levelChanged).toBe(true)
  })

  it('floors XP at 0 when the delta would push it negative', async () => {
    // increment call returns a negative xp; the helper must clamp via a follow-up update.
    updateMock
      .mockResolvedValueOnce({ xp: -50, level: 2 })
      .mockResolvedValueOnce({ xp: 0, level: 1 })

    const result = await applyXpDelta({ studentId: STUDENT, classId: CLASS, delta: -100 })

    // First update: atomic increment.
    expect(updateMock.mock.calls[0][0].data).toEqual({ xp: { increment: -100 } })
    // Second update: clamp to 0.
    expect(updateMock.mock.calls[1][0].data).toEqual({ xp: 0 })

    expect(result.newXP).toBe(0)
    expect(result.newLevel).toBe(1)
  })
})

describe('applyXpDelta — validation', () => {
  it('throws when delta is not an integer', async () => {
    await expect(applyXpDelta({ studentId: STUDENT, classId: CLASS, delta: 10.5 })).rejects.toThrow(/integer/)
    await expect(applyXpDelta({ studentId: STUDENT, classId: CLASS, delta: NaN })).rejects.toThrow(/integer/)
    await expect(applyXpDelta({ studentId: STUDENT, classId: CLASS, delta: Infinity })).rejects.toThrow(/integer/)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('rethrows as a friendly message when the enrollment does not exist', async () => {
    updateMock.mockRejectedValueOnce(new Error('Record to update not found'))

    await expect(
      applyXpDelta({ studentId: STUDENT, classId: CLASS, delta: 50 }),
    ).rejects.toThrow(/No estás inscrito/)
  })
})

describe('syncEnrollmentLevel', () => {
  it('updates the level when it has drifted from the XP', async () => {
    findUniqueMock.mockResolvedValueOnce({ xp: getTotalXPForLevel(10), level: 5 })

    await syncEnrollmentLevel(STUDENT, CLASS)

    expect(updateMock).toHaveBeenCalledWith({
      where: { studentId_classId: { studentId: STUDENT, classId: CLASS } },
      data: { level: 10 },
    })
  })

  it('does nothing when the level is already correct', async () => {
    const xp = getTotalXPForLevel(7)
    findUniqueMock.mockResolvedValueOnce({ xp, level: 7 })

    await syncEnrollmentLevel(STUDENT, CLASS)

    expect(updateMock).not.toHaveBeenCalled()
  })

  it('does nothing when the enrollment is missing', async () => {
    findUniqueMock.mockResolvedValueOnce(null)

    await expect(syncEnrollmentLevel(STUDENT, CLASS)).resolves.toBeUndefined()
    expect(updateMock).not.toHaveBeenCalled()
  })
})
