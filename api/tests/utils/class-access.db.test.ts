import { it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'
import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import {
  accessibleClassesWhere,
  assertMissionAccess,
  classTeacherRecipients,
  getClassAccess,
  recordClassAction,
} from '../../src/utils/class-access.js'
import { ForbiddenError, NotFoundError } from '../../src/utils/errors.js'

/**
 * La capa de acceso contra Postgres de verdad: que los filtros filtran, que un
 * acceso vencido deja de contar y que la base no admite dos propietarios.
 * Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

describeWithDatabase('acceso a clases, con base de datos', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const DAY = 24 * 60 * 60 * 1000

  /** Pone al otro profesor en la clase del propietario con el nivel dado. */
  const setOther = (access: 'read' | 'edit' | 'admin', endsAt: Date | null = null) =>
    prisma.classTeacher.upsert({
      where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
      create: {
        classId: f.classId,
        userId: f.users.other.id,
        access,
        profile: 'sustituto',
        endsAt,
        addedById: f.users.owner.id,
      },
      update: { access, endsAt },
    })

  const accessibleIds = async (
    userId: string,
    level: Parameters<typeof accessibleClassesWhere>[1]
  ) =>
    (
      await prisma.class.findMany({
        where: accessibleClassesWhere(userId, level),
        select: { id: true },
      })
    ).map(r => r.id)

  beforeAll(async () => {
    app = await buildApp(async () => {})
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  it('el propietario tiene acceso; otro profesor y un alumno matriculado, no', async () => {
    await expect(getClassAccess(f.classId, f.users.owner.id)).resolves.toEqual({
      access: 'admin',
      profile: 'titular',
      isOwner: true,
    })
    await expect(getClassAccess(f.classId, f.users.other.id)).resolves.toBeNull()
    await expect(getClassAccess(f.classId, f.users.student.id)).resolves.toBeNull()
  })

  it('accessibleClassesWhere devuelve solo las clases donde se llega al nivel', async () => {
    await setOther('read')
    expect(await accessibleIds(f.users.other.id, 'read')).toEqual(
      expect.arrayContaining([f.classId, f.otherClassId])
    )
    expect(await accessibleIds(f.users.other.id, 'edit')).toEqual([f.otherClassId])
    expect(await accessibleIds(f.users.other.id, 'owner')).toEqual([f.otherClassId])
    expect(await accessibleIds(f.users.owner.id, 'read')).toEqual([f.classId])

    await setOther('admin')
    expect(await accessibleIds(f.users.other.id, 'admin')).toHaveLength(2)
    expect(await accessibleIds(f.users.other.id, 'owner')).toEqual([f.otherClassId])
  })

  it('un acceso vencido deja de contar en todas partes', async () => {
    await setOther('admin', new Date(Date.now() - DAY))
    await expect(getClassAccess(f.classId, f.users.other.id)).resolves.toBeNull()
    expect(await accessibleIds(f.users.other.id, 'read')).toEqual([f.otherClassId])
    expect(await classTeacherRecipients(f.classId, 'read')).toEqual([f.users.owner.id])

    await setOther('admin', new Date(Date.now() + DAY))
    await expect(getClassAccess(f.classId, f.users.other.id)).resolves.toMatchObject({
      access: 'admin',
    })
  })

  it('classTeacherRecipients respeta el nivel mínimo', async () => {
    await setOther('read')
    expect(await classTeacherRecipients(f.classId, 'read')).toEqual([
      f.users.owner.id,
      f.users.other.id,
    ])
    expect(await classTeacherRecipients(f.classId, 'edit')).toEqual([f.users.owner.id])
  })

  it('las variantes por recurso resuelven la clase de verdad', async () => {
    const missionId = await f.newMission()
    await setOther('read')
    await expect(
      assertMissionAccess(missionId, f.users.other.id, 'mission.view')
    ).resolves.toMatchObject({
      classId: f.classId,
      access: 'read',
    })
    await expect(
      assertMissionAccess(missionId, f.users.other.id, 'mission.edit')
    ).rejects.toBeInstanceOf(ForbiddenError)
    await expect(
      assertMissionAccess(missionId, f.users.student.id, 'mission.view')
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('la base no admite un segundo propietario en la misma clase', async () => {
    await setOther('admin')
    await expect(
      prisma.classTeacher.update({
        where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
        data: { isOwner: true },
      })
    ).rejects.toMatchObject({ code: 'P2002' })
  })

  it('recordClassAction escribe la entrada y se va con la transacción si esta falla', async () => {
    await prisma.$transaction(tx =>
      recordClassAction(tx, {
        classId: f.classId,
        actorId: f.users.owner.id,
        action: 'teacher.added',
        targetUserId: f.users.other.id,
      })
    )
    await prisma
      .$transaction(async tx => {
        await recordClassAction(tx, {
          classId: f.classId,
          actorId: f.users.owner.id,
          action: 'teacher.removed',
        })
        throw new Error('deshacer')
      })
      .catch(() => {})

    const entries = await prisma.classActionLog.findMany({ where: { classId: f.classId } })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      action: 'teacher.added',
      actorId: f.users.owner.id,
      actorName: expect.stringContaining('owner'),
      targetUserId: f.users.other.id,
    })
  })

  it('la consulta de coherencia da 0: cada clase, un propietario, y es Class.teacherId', async () => {
    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM "classes" c
      WHERE (SELECT count(*) FROM "class_teachers" t
             WHERE t."class_id" = c."id" AND t."is_owner" AND t."user_id" = c."teacher_id") <> 1
         OR (SELECT count(*) FROM "class_teachers" t
             WHERE t."class_id" = c."id" AND t."is_owner") <> 1`
    expect(Number(count)).toBe(0)
  })
})
