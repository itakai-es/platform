import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Pistas en las misiones (E1, entrega 3): las de % de la recompensa. Restan de
 * lo que la misión aún tiene que pagar a quien la usa (los enigmas sin aprobar
 * y el bonus de rareza), nunca de lo ya cobrado; se multiplican con el % de
 * aprobación y varias se suman con tope en 100. El descuento queda guardado en
 * el progreso de cada enigma, así que subir después su recompensa no lo
 * devuelve. Usarla a la vez que se aprueba la última entrega cuenta entera o
 * no cuenta: las dos operaciones bloquean la misma matrícula.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts).
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { submissionsRoutes } from '../../src/modules/submissions/submissions.routes.js'
import { useHint } from '../../src/modules/missions/mission-hints.service.js'
import { submissionsService } from '../../src/modules/submissions/submissions.service.js'
import { deleteEnrollmentData } from '../../src/modules/teachers/class-students.service.js'

describeWithDatabase('pistas de % de la recompensa', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const extraUsers: string[] = []

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(submissionsRoutes, { prefix: '/submissions' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await app?.close()
  })

  const send = (method: 'GET' | 'POST' | 'PUT', url: string, actor: Actor, payload?: unknown) =>
    app.inject({
      method,
      url,
      ...(payload === undefined ? {} : { payload: payload as object }),
      headers: { authorization: `Bearer ${f.token(actor)}` },
    })

  /** Una misión de la clase con `enigmas` enigmas de 100 XP y 20 monedas, y estas pistas de %. */
  async function mission(opts: { enigmas: number; percents: number[]; rarity?: 'comun' | 'epica' }) {
    const created = await prisma.mission.create({
      data: {
        classId: f.classId,
        title: `Misión ${randomUUID().slice(0, 6)}`,
        rarity: opts.rarity ?? 'epica',
      },
    })
    const enigmaIds: string[] = []
    for (let i = 0; i < opts.enigmas; i++) {
      enigmaIds.push(
        (
          await prisma.missionEnigma.create({
            data: {
              missionId: created.id,
              title: `Enigma ${i + 1}`,
              xpReward: 100,
              coinReward: 20,
              orderIndex: i,
            },
          })
        ).id
      )
    }
    const hintIds: string[] = []
    for (const [i, cost] of opts.percents.entries()) {
      hintIds.push(
        (
          await prisma.missionHint.create({
            data: {
              missionId: created.id,
              content: `Pista ${i + 1}`,
              orderIndex: i,
              costType: 'percent',
              cost,
            },
          })
        ).id
      )
    }
    return { missionId: created.id, enigmaIds, hintIds }
  }

  const newStudent = async () => {
    const user = await prisma.user.create({
      data: {
        email: `pct-${randomUUID().slice(0, 8)}@test.invalid`,
        passwordHash: 'x',
        name: 'Estudiante de %',
        role: 'student',
        isOnboarded: true,
      },
    })
    extraUsers.push(user.id)
    const enrollment = await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: user.id },
    })
    return { id: user.id, enrollmentId: enrollment.id }
  }

  const submit = async (enigmaId: string, studentId: string) =>
    (await prisma.enigmaSubmission.create({ data: { enigmaId, studentId } })).id

  const approve = (submissionId: string, percentage: number) =>
    send('POST', `/submissions/${submissionId}/approve`, 'owner', { percentage })

  const wallet = (enrollmentId: string) =>
    prisma.classEnrollment.findUniqueOrThrow({ where: { id: enrollmentId } })

  it('el ejemplo: −20 % tras el primer enigma deja la misión épica en 404 XP en vez de 480', async () => {
    const student = await newStudent()
    const as = { id: student.id, role: 'student' }
    const { missionId, enigmaIds, hintIds } = await mission({ enigmas: 3, percents: [20] })

    // Enigma 1, aprobado al 100 % antes de la pista: no se toca.
    expect((await approve(await submit(enigmaIds[0], student.id), 100)).json()).toMatchObject({
      xpAwarded: 100,
      coinsAwarded: 20,
      hintPenalty: 0,
    })
    await useHint(as, missionId, hintIds[0])
    // Una entrega pendiente al usar la pista sí queda afectada: aún no se ha cobrado.
    const second = await submit(enigmaIds[1], student.id)
    expect((await approve(second, 80)).json()).toMatchObject({
      xpAwarded: 64,
      coinsAwarded: 13,
      hintPenalty: 20,
    })
    expect((await approve(await submit(enigmaIds[2], student.id), 100)).json()).toMatchObject({
      xpAwarded: 80,
      coinsAwarded: 16,
    })

    expect(await wallet(student.enrollmentId)).toMatchObject({ xp: 404, coins: 49 })
    const progress = await prisma.studentEnigmaProgress.findMany({
      where: { studentId: student.id, enigma: { missionId } },
      orderBy: { enigma: { orderIndex: 'asc' } },
    })
    expect(progress.map(p => [p.percentage, p.hintPenalty, p.xpEarned])).toEqual([
      [100, 0, 100],
      [80, 20, 64],
      [100, 20, 80],
    ])
    const completed = await prisma.activity.findFirstOrThrow({
      where: { userId: student.id, type: 'mission_completed', metadata: { path: ['missionId'], equals: missionId } },
    })
    expect(completed.missionXp).toBe(160)
    const log = await prisma.classActionLog.findFirstOrThrow({
      where: { classId: f.classId, action: 'submission.approved', entityId: second },
    })
    expect(log.metadata).toMatchObject({ percentage: 80, xpAwarded: 64, hintPenalty: 20 })
  })

  it('subir después la recompensa de un enigma no devuelve el descuento', async () => {
    const student = await newStudent()
    const { missionId, enigmaIds, hintIds } = await mission({ enigmas: 2, percents: [20] })
    await useHint({ id: student.id, role: 'student' }, missionId, hintIds[0])
    await approve(await submit(enigmaIds[0], student.id), 100)
    const before = await wallet(student.enrollmentId)
    expect(before).toMatchObject({ xp: 80, coins: 16 })

    const raised = await send('PUT', `/missions/${missionId}/enigmas/${enigmaIds[0]}`, 'owner', {
      title: 'Enigma 1',
      xp: 120,
      coins: 30,
    })
    expect(raised.statusCode).toBe(200)
    // 120 × 0,8 = 96 (16 más), no 120; 30 × 0,8 = 24 (8 más).
    expect(await wallet(student.enrollmentId)).toMatchObject({ xp: 96, coins: 24 })
    expect(
      await prisma.studentEnigmaProgress.findFirstOrThrow({
        where: { studentId: student.id, enigmaId: enigmaIds[0] },
      })
    ).toMatchObject({ xpEarned: 96, coinsEarned: 24, hintPenalty: 20 })
  })

  it('varias pistas de % se suman con tope en 100: entonces la misión no paga nada más', async () => {
    const student = await newStudent()
    const as = { id: student.id, role: 'student' }
    const { missionId, enigmaIds, hintIds } = await mission({
      enigmas: 1,
      percents: [50, 40, 30],
      rarity: 'comun',
    })
    for (const hintId of hintIds) await useHint(as, missionId, hintId)
    const seen = await app.inject({
      method: 'GET',
      url: `/missions/${missionId}`,
      headers: { authorization: `Bearer ${app.jwt.sign(as)}` },
    })
    expect(seen.json().mission.hintState.penalty).toBe(100)

    expect((await approve(await submit(enigmaIds[0], student.id), 100)).json()).toMatchObject({
      xpAwarded: 0,
      coinsAwarded: 0,
      hintPenalty: 100,
    })
    expect(await wallet(student.enrollmentId)).toMatchObject({ xp: 0, coins: 0 })
  })

  it('en una misión por equipos, aprobar a todo el equipo aplica a cada cual su propio descuento', async () => {
    const [a, b] = [await newStudent(), await newStudent()]
    const { missionId, enigmaIds, hintIds } = await mission({ enigmas: 2, percents: [25] })
    const set = await prisma.teamSet.create({ data: { classId: f.classId, title: 'Equipos %' } })
    const team = await prisma.team.create({ data: { setId: set.id, title: 'Los del faro' } })
    for (const s of [a, b]) {
      await prisma.teamMember.create({
        data: { teamId: team.id, setId: set.id, enrollmentId: s.enrollmentId },
      })
    }
    await prisma.mission.update({ where: { id: missionId }, data: { teamSetId: set.id } })
    await useHint({ id: a.id, role: 'student' }, missionId, hintIds[0])

    const fromA = await submit(enigmaIds[0], a.id)
    const fromB = await submit(enigmaIds[0], b.id)
    // La ventana de entregas enseña el descuento de cada persona.
    const listed = (await send('GET', `/submissions/teacher/enigmas/${enigmaIds[0]}`, 'owner')).json()
    const penaltyOf = (id: string) =>
      listed.submissions.find((s: { id: string }) => s.id === id).hintPenalty
    expect([penaltyOf(fromA), penaltyOf(fromB)]).toEqual([25, 0])

    const response = await send('POST', `/submissions/${fromA}/approve-team`, 'owner', {
      percentage: 100,
    })
    expect(response.statusCode).toBe(200)
    // Con el descuento con el que se aprobó a cada cual, para que la ventana avise si cambió.
    expect(
      response
        .json()
        .approved.map((x: { studentId: string; hintPenalty: number }) => [x.studentId, x.hintPenalty])
        .sort()
    ).toEqual(
      [
        [a.id, 25],
        [b.id, 0],
      ].sort()
    )
    expect(await wallet(a.enrollmentId)).toMatchObject({ xp: 75, coins: 15 })
    expect(await wallet(b.enrollmentId)).toMatchObject({ xp: 100, coins: 20 })
  })

  it('aprobar a la vez que se saca a esa persona de la clase: sin interbloqueo, una espera a la otra', async () => {
    const student = await newStudent()
    const { enigmaIds } = await mission({ enigmas: 2, percents: [], rarity: 'comun' })
    const submissionId = await submit(enigmaIds[0], student.id)

    // La matrícula, bloqueada desde fuera: la aprobación se pone en cola primero y la salida después.
    let release!: () => void
    const gate = new Promise<void>(resolve => (release = resolve))
    let locked!: () => void
    const ready = new Promise<void>(resolve => (locked = resolve))
    const holder = prisma.$transaction(
      async tx => {
        await tx.$queryRaw`SELECT id FROM class_enrollments WHERE id = ${student.enrollmentId} FOR UPDATE`
        locked()
        await gate
      },
      { timeout: 20_000 }
    )
    await ready
    const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    const approving = submissionsService.approveSubmission(f.users.owner.id, submissionId, {
      percentage: 100,
    })
    await pause(300)
    const removing = prisma.$transaction(
      tx => deleteEnrollmentData(tx, f.classId, student.id, student.enrollmentId),
      { timeout: 20_000 }
    )
    await pause(300)
    release()
    await holder

    const [approved, removed] = await Promise.allSettled([approving, removing])
    expect(approved.status).toBe('fulfilled')
    expect(removed.status).toBe('fulfilled')
    // La salida fue después y se llevó también lo que dio la aprobación.
    expect(await prisma.classEnrollment.count({ where: { id: student.enrollmentId } })).toBe(0)
    expect(await prisma.enigmaSubmission.count({ where: { id: submissionId } })).toBe(0)
    expect(
      await prisma.studentEnigmaProgress.count({ where: { studentId: student.id } })
    ).toBe(0)
  })

  it('usar una pista a la vez que se aprueba la última entrega: cuenta entera o no cuenta', async () => {
    const outcomes = new Set<string>()
    for (let round = 0; round < 6; round++) {
      const student = await newStudent()
      const { missionId, enigmaIds, hintIds } = await mission({
        enigmas: 1,
        percents: [50],
        rarity: 'comun',
      })
      const submissionId = await submit(enigmaIds[0], student.id)
      const [approval, use] = await Promise.allSettled([
        submissionsService.approveSubmission(f.users.owner.id, submissionId, { percentage: 100 }),
        useHint({ id: student.id, role: 'student' }, missionId, hintIds[0]),
      ])
      expect(approval.status).toBe('fulfilled')
      const progress = await prisma.studentEnigmaProgress.findFirstOrThrow({
        where: { studentId: student.id, enigmaId: enigmaIds[0] },
      })
      const after = await wallet(student.enrollmentId)
      if (use.status === 'fulfilled') {
        // La pista fue antes: la aprobación ya la vio. 50 del enigma y 25 del bonus.
        outcomes.add('pista primero')
        expect(progress).toMatchObject({ hintPenalty: 50, xpEarned: 50 })
        expect(after.xp).toBe(75)
      } else {
        // La aprobación fue antes y completó la misión: la pista ya no hace falta.
        outcomes.add('aprobación primero')
        expect((use.reason as { code?: string }).code).toBe('HINT_MISSION_COMPLETED')
        expect(progress).toMatchObject({ hintPenalty: 0, xpEarned: 100 })
        expect(after.xp).toBe(150)
        expect(await prisma.missionHintUse.count({ where: { missionId } })).toBe(0)
      }
    }
    expect(outcomes.size).toBeGreaterThan(0)
  })
})
