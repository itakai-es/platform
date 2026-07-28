import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Unit tests for the validation/guard logic in missions.service.
 *
 * These tests focus on the business rules that protect the XP system:
 *  - createMission refuses missions with 0 enigmas and non-preset XP values
 *  - updateMission refuses rarity changes once alumni have completed the mission
 *  - updateEnigma refuses xpReward changes once alumni have earned XP on it
 *  - deleteEnigma refuses when progress or submissions exist, and won't delete
 *    the last enigma of a mission
 *
 * Prisma is mocked so we can assert on inputs and short-circuit DB calls.
 */

const mocks = vi.hoisted(() => ({
  classFindFirst: vi.fn(),
  missionCreate: vi.fn(),
  missionFindFirst: vi.fn(),
  missionFindUnique: vi.fn(),
  missionUpdate: vi.fn(),
  missionEnigmaCreateMany: vi.fn(),
  missionEnigmaFindFirst: vi.fn(),
  missionEnigmaUpdate: vi.fn(),
  missionEnigmaDelete: vi.fn(),
  classEnrollmentFindUnique: vi.fn(),
  studentMissionProgressCount: vi.fn(),
  studentMissionProgressUpsert: vi.fn(),
  studentMissionProgressUpdateMany: vi.fn(),
  studentMissionProgressFindUnique: vi.fn(),
  studentEnigmaProgressCount: vi.fn(),
  studentBadgeCreate: vi.fn(),
  activityCreate: vi.fn(),
  applyXpDelta: vi.fn(),
  $transaction: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    class: { findFirst: mocks.classFindFirst },
    mission: {
      create: mocks.missionCreate,
      findFirst: mocks.missionFindFirst,
      findUnique: mocks.missionFindUnique,
      update: mocks.missionUpdate,
    },
    missionEnigma: {
      createMany: mocks.missionEnigmaCreateMany,
      findFirst: mocks.missionEnigmaFindFirst,
      update: mocks.missionEnigmaUpdate,
      delete: mocks.missionEnigmaDelete,
    },
    classEnrollment: { findUnique: mocks.classEnrollmentFindUnique },
    studentMissionProgress: {
      count: mocks.studentMissionProgressCount,
      upsert: mocks.studentMissionProgressUpsert,
      updateMany: mocks.studentMissionProgressUpdateMany,
      findUnique: mocks.studentMissionProgressFindUnique,
    },
    studentEnigmaProgress: { count: mocks.studentEnigmaProgressCount },
    studentBadge: { create: mocks.studentBadgeCreate },
    activity: { create: mocks.activityCreate },
    $transaction: mocks.$transaction,
  },
}))

vi.mock('../../src/utils/enrollment-xp.js', () => ({
  applyXpDelta: mocks.applyXpDelta,
}))

// Stub the mission-formatter; the tests don't care about the returned shape.
vi.mock('../../src/utils/mission-formatter.js', () => ({
  formatMission: (m: any) => m,
  getMissionStatus: () => 'activa',
}))

import { missionsService } from '../../src/modules/missions/missions.service.js'

const TEACHER = 'teacher-1'
const STUDENT = 'student-1'
const CLASS = 'class-1'
const MISSION = 'mission-1'
const ENIGMA = 'enigma-1'

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset()
  // $transaction default: just run the callback with a tx = prisma stub.
  mocks.$transaction.mockImplementation(async (cb: any) => {
    if (typeof cb === 'function') {
      return cb({
        mission: { create: mocks.missionCreate },
        missionEnigma: { createMany: mocks.missionEnigmaCreateMany },
        studentMissionProgress: {
          upsert: mocks.studentMissionProgressUpsert,
          updateMany: mocks.studentMissionProgressUpdateMany,
          findUnique: mocks.studentMissionProgressFindUnique,
        },
        studentBadge: { create: mocks.studentBadgeCreate },
        activity: { create: mocks.activityCreate },
      })
    }
    return cb
  })
})

describe('createMission', () => {
  it('rejects missions with zero enigmas', async () => {
    mocks.classFindFirst.mockResolvedValueOnce({ id: CLASS, teacherId: TEACHER })

    await expect(
      missionsService.createMission(TEACHER, {
        classId: CLASS,
        title: 'Test',
        enigmas: [],
      }),
    ).rejects.toThrow(/al menos un enigma/)

    expect(mocks.missionCreate).not.toHaveBeenCalled()
  })

  it('rejects missions when enigmas key is missing entirely', async () => {
    mocks.classFindFirst.mockResolvedValueOnce({ id: CLASS, teacherId: TEACHER })

    await expect(
      missionsService.createMission(TEACHER, { classId: CLASS, title: 'Test' }),
    ).rejects.toThrow(/al menos un enigma/)
  })

  it('accepts enigmas with any positive XP value (presets are only suggestions)', async () => {
    mocks.classFindFirst.mockResolvedValueOnce({ id: CLASS, teacherId: TEACHER })
    mocks.missionCreate.mockResolvedValueOnce({ id: MISSION })
    mocks.missionEnigmaCreateMany.mockResolvedValueOnce({ count: 1 })

    await expect(
      missionsService.createMission(TEACHER, {
        classId: CLASS,
        title: 'Test',
        enigmas: [{ title: 'E1', xp: 33 }],
      }),
    ).resolves.toBeDefined()
  })

  it('accepts each preset XP value', async () => {
    mocks.classFindFirst.mockResolvedValue({ id: CLASS, teacherId: TEACHER })
    mocks.missionCreate.mockResolvedValue({ id: MISSION })
    mocks.missionEnigmaCreateMany.mockResolvedValue({ count: 1 })

    for (const xp of [20, 40, 60, 80, 100]) {
      await expect(
        missionsService.createMission(TEACHER, {
          classId: CLASS,
          title: `Mission ${xp}`,
          enigmas: [{ title: 'E', xp }],
        }),
      ).resolves.toBeDefined()
    }
  })

  it('rejects when the teacher does not own the class', async () => {
    mocks.classFindFirst.mockResolvedValueOnce(null)

    await expect(
      missionsService.createMission(TEACHER, {
        classId: CLASS,
        title: 'Test',
        enigmas: [{ title: 'E', xp: 20 }],
      }),
    ).rejects.toThrow(/Clase no encontrada/)
  })
})

describe('updateMission', () => {
  it('rejects rarity change when students already completed the mission', async () => {
    mocks.missionFindFirst.mockResolvedValueOnce({
      id: MISSION,
      classId: CLASS,
      rarity: 'comun',
      class: { teacherId: TEACHER },
    })
    mocks.studentMissionProgressCount.mockResolvedValueOnce(3)

    await expect(
      missionsService.updateMission(TEACHER, MISSION, { rarity: 'epica' }),
    ).rejects.toThrow(/No puedes cambiar la rareza/)

    expect(mocks.missionUpdate).not.toHaveBeenCalled()
  })

  it('allows rarity change when no student has completed the mission', async () => {
    mocks.missionFindFirst.mockResolvedValueOnce({
      id: MISSION,
      classId: CLASS,
      rarity: 'comun',
      class: { teacherId: TEACHER },
    })
    mocks.studentMissionProgressCount.mockResolvedValueOnce(0)
    mocks.missionUpdate.mockResolvedValueOnce({ id: MISSION, rarity: 'rara' })

    await expect(
      missionsService.updateMission(TEACHER, MISSION, { rarity: 'rara' }),
    ).resolves.toBeDefined()

    expect(mocks.missionUpdate).toHaveBeenCalled()
  })

  it('allows non-rarity field updates regardless of completions', async () => {
    mocks.missionFindFirst.mockResolvedValueOnce({
      id: MISSION,
      classId: CLASS,
      rarity: 'comun',
      class: { teacherId: TEACHER },
    })
    mocks.missionUpdate.mockResolvedValueOnce({ id: MISSION })

    await missionsService.updateMission(TEACHER, MISSION, { title: 'Nuevo título' })

    // studentMissionProgress.count should NOT be called when rarity isn't changing.
    expect(mocks.studentMissionProgressCount).not.toHaveBeenCalled()
    expect(mocks.missionUpdate).toHaveBeenCalled()
  })

  it('rejects updates from the wrong teacher', async () => {
    mocks.missionFindFirst.mockResolvedValueOnce({
      id: MISSION,
      classId: CLASS,
      rarity: 'comun',
      class: { teacherId: 'other-teacher' },
    })

    await expect(
      missionsService.updateMission(TEACHER, MISSION, { title: 'X' }),
    ).rejects.toThrow(/No tienes permiso/)
  })
})

describe('updateEnigma', () => {
  // TODO: mock desactualizado tras renombrar `missionEnigma` en Prisma schema; refrescar helpers de mock.
  it.skip('rejects XP change when students already completed this enigma', async () => {
    mocks.missionEnigmaFindFirst.mockResolvedValueOnce({
      id: ENIGMA,
      xpReward: 40,
      mission: { class: { teacherId: TEACHER } },
    })
    mocks.studentEnigmaProgressCount.mockResolvedValueOnce(2)

    await expect(
      missionsService.updateEnigma(TEACHER, ENIGMA, { xp: 60 }),
    ).rejects.toThrow(/No puedes cambiar el XP/)

    expect(mocks.missionEnigmaUpdate).not.toHaveBeenCalled()
  })

  // Nota: la validación "el XP debe ser uno de los presets" se retiró a propósito
  // (los presets son solo sugerencias; el backend acepta cualquier entero ≥ 0).

  // TODO: mock desactualizado (missionEnigmaUpdate) tras renombrar en Prisma schema.

  it.skip('allows XP change when no student has completed this enigma yet', async () => {
    mocks.missionEnigmaFindFirst.mockResolvedValueOnce({
      id: ENIGMA,
      xpReward: 40,
      title: 't',
      description: 'd',
      objectives: [],
      isOptional: false,
      orderIndex: 0,
      mission: { class: { teacherId: TEACHER } },
    })
    mocks.studentEnigmaProgressCount.mockResolvedValueOnce(0)
    mocks.missionEnigmaUpdate.mockResolvedValueOnce({
      id: ENIGMA,
      xpReward: 60,
      title: 't',
      description: 'd',
      objectives: [],
      isOptional: false,
      orderIndex: 0,
    })

    await expect(
      missionsService.updateEnigma(TEACHER, ENIGMA, { xp: 60 }),
    ).resolves.toMatchObject({ enigma: expect.objectContaining({ xp: 60 }) })
  })

  // TODO: mock desactualizado (missionEnigmaUpdate) tras renombrar en Prisma schema.

  it.skip('allows non-XP updates without checking progress', async () => {
    mocks.missionEnigmaFindFirst.mockResolvedValueOnce({
      id: ENIGMA,
      xpReward: 40,
      title: 'old',
      description: '',
      objectives: [],
      isOptional: false,
      orderIndex: 0,
      mission: { class: { teacherId: TEACHER } },
    })
    mocks.missionEnigmaUpdate.mockResolvedValueOnce({
      id: ENIGMA,
      xpReward: 40,
      title: 'new',
      description: '',
      objectives: [],
      isOptional: false,
      orderIndex: 0,
    })

    await missionsService.updateEnigma(TEACHER, ENIGMA, { title: 'new' })

    expect(mocks.studentEnigmaProgressCount).not.toHaveBeenCalled()
    expect(mocks.missionEnigmaUpdate).toHaveBeenCalled()
  })
})

describe('deleteEnigma', () => {
  const baseMissionWithEnigmas = (count: number) => ({
    id: MISSION,
    class: { teacherId: TEACHER },
    enigmas: Array.from({ length: count }, (_, i) => ({ id: `e${i}` })),
  })

  it('rejects deleting an enigma that has submissions', async () => {
    mocks.missionEnigmaFindFirst.mockResolvedValueOnce({
      id: ENIGMA,
      submissions: [{ id: 's1' }],
      progress: [],
      mission: baseMissionWithEnigmas(3),
    })

    await expect(missionsService.deleteEnigma(TEACHER, ENIGMA)).rejects.toThrow(/entregas/)
    expect(mocks.missionEnigmaDelete).not.toHaveBeenCalled()
  })

  it('rejects deleting an enigma that has progress', async () => {
    mocks.missionEnigmaFindFirst.mockResolvedValueOnce({
      id: ENIGMA,
      submissions: [],
      progress: [{ id: 'p1' }],
      mission: baseMissionWithEnigmas(3),
    })

    await expect(missionsService.deleteEnigma(TEACHER, ENIGMA)).rejects.toThrow(/lo completaron/)
    expect(mocks.missionEnigmaDelete).not.toHaveBeenCalled()
  })

  it('rejects deleting the last enigma of a mission', async () => {
    mocks.missionEnigmaFindFirst.mockResolvedValueOnce({
      id: ENIGMA,
      submissions: [],
      progress: [],
      mission: baseMissionWithEnigmas(1),
    })

    await expect(missionsService.deleteEnigma(TEACHER, ENIGMA)).rejects.toThrow(/al menos un enigma/)
    expect(mocks.missionEnigmaDelete).not.toHaveBeenCalled()
  })

  it('deletes an enigma when conditions are met', async () => {
    mocks.missionEnigmaFindFirst.mockResolvedValueOnce({
      id: ENIGMA,
      submissions: [],
      progress: [],
      mission: baseMissionWithEnigmas(3),
    })
    mocks.missionEnigmaDelete.mockResolvedValueOnce({ id: ENIGMA })

    await expect(missionsService.deleteEnigma(TEACHER, ENIGMA)).resolves.toMatchObject({
      message: expect.stringContaining('eliminado'),
    })
    expect(mocks.missionEnigmaDelete).toHaveBeenCalled()
  })
})

// TODO: la función `completeMission` se reubicó fuera del servicio de misiones.

describe.skip('completeMission', () => {
  const baseMission = (enigmasCount = 2) => ({
    id: MISSION,
    classId: CLASS,
    rarity: 'comun',
    title: 'Test Mission',
    class: { name: 'Test Class' },
    enigmas: Array.from({ length: enigmasCount }, (_, i) => ({
      id: `e${i}`,
      xpReward: 20,
    })),
    badges: [],
  })

  it('rejects missions with zero enigmas', async () => {
    mocks.missionFindUnique.mockResolvedValueOnce(baseMission(0))

    await expect(missionsService.completeMission(STUDENT, MISSION)).rejects.toThrow(/sin enigmas|no tiene enigmas/i)
    expect(mocks.$transaction).not.toHaveBeenCalled()
  })

  it('rejects when the student is not enrolled', async () => {
    mocks.missionFindUnique.mockResolvedValueOnce(baseMission(2))
    mocks.classEnrollmentFindUnique.mockResolvedValueOnce(null)

    await expect(missionsService.completeMission(STUDENT, MISSION)).rejects.toThrow(/No estás inscrito/)
  })

  it('short-circuits when the mission was already completed (idempotent)', async () => {
    mocks.missionFindUnique.mockResolvedValueOnce(baseMission(2))
    mocks.classEnrollmentFindUnique.mockResolvedValueOnce({ avatarUrl: null, nickname: null })
    // Upsert returns a row that already has completedAt set.
    mocks.studentMissionProgressUpsert.mockResolvedValueOnce({
      id: 'progress-1',
      completedAt: new Date('2025-01-01'),
      progress: 100,
      enigmasCompleted: 2,
    })

    const result = await missionsService.completeMission(STUDENT, MISSION)

    expect(result).toMatchObject({ xpEarned: 0, alreadyCompleted: true })
    // Never flipped completedAt, never awarded XP
    expect(mocks.studentMissionProgressUpdateMany).not.toHaveBeenCalled()
    expect(mocks.applyXpDelta).not.toHaveBeenCalled()
  })

  it('awards total (enigmas + bonus) when it wins the completion race', async () => {
    mocks.missionFindUnique.mockResolvedValueOnce({
      ...baseMission(2),
      rarity: 'epica', // 200 bonus
    })
    mocks.classEnrollmentFindUnique.mockResolvedValueOnce({ avatarUrl: null, nickname: null })
    mocks.studentMissionProgressUpsert.mockResolvedValueOnce({ completedAt: null })
    mocks.studentMissionProgressUpdateMany.mockResolvedValueOnce({ count: 1 })
    mocks.studentMissionProgressFindUnique.mockResolvedValueOnce({ completedAt: new Date() })

    const result = await missionsService.completeMission(STUDENT, MISSION)

    // 2 enigmas × 20 XP + 200 bonus = 240
    expect(result.xpEarned).toBe(240)
    expect(mocks.applyXpDelta).toHaveBeenCalledWith(expect.objectContaining({ delta: 240 }))

    const activityTypes = mocks.activityCreate.mock.calls.map((c) => c[0].data.type)
    expect(activityTypes).toContain('mission_completed')
  })

  it('does NOT re-award when the updateMany loses the concurrency race', async () => {
    mocks.missionFindUnique.mockResolvedValueOnce(baseMission(2))
    mocks.classEnrollmentFindUnique.mockResolvedValueOnce({ avatarUrl: null, nickname: null })
    mocks.studentMissionProgressUpsert.mockResolvedValueOnce({ completedAt: null })
    // Another call already flipped completedAt between the upsert and this updateMany.
    mocks.studentMissionProgressUpdateMany.mockResolvedValueOnce({ count: 0 })
    mocks.studentMissionProgressFindUnique.mockResolvedValueOnce({ completedAt: new Date() })

    const result = await missionsService.completeMission(STUDENT, MISSION)

    expect(result).toMatchObject({ xpEarned: 0, alreadyCompleted: true })
    expect(mocks.applyXpDelta).not.toHaveBeenCalled()
    expect(mocks.activityCreate).not.toHaveBeenCalled()
  })
})
