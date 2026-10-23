import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Pistas en las misiones (E1, entregas 1 y 2). El profesorado las escribe, las
 * ordena y les pone un coste en monedas o XP; viajan con la misión al importarla,
 * al duplicar la clase y al importar una plantilla, nunca con sus usos. El
 * alumnado ve cuántas hay y lo que cuestan, el texto solo de las que ha usado, y
 * las usa en orden pagando al momento: el cobro es condicional y va con su
 * matrícula bloqueada, así que no hay carreras ni saldos negativos.
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
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { useHint } from '../../src/modules/missions/mission-hints.service.js'
import { deleteEnrollmentData } from '../../src/modules/teachers/class-students.service.js'
import { HINT_LIMITS } from '../../src/utils/mission-hints.js'
import { getLevelFromXP } from '../../src/utils/xp-calculator.js'

type Cost = ['coins' | 'xp' | 'percent', number]

describeWithDatabase('pistas en las misiones', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const extraUsers: string[] = []

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await app?.close()
  })

  const send = (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    actor: Actor,
    payload?: unknown
  ) =>
    app.inject({
      method,
      url,
      ...(payload === undefined ? {} : { payload: payload as object }),
      headers: { authorization: `Bearer ${f.token(actor)}` },
    })

  /** Una misión de la clase con un enigma y estas pistas, en este orden. */
  async function missionWithHints(costs: Cost[], data: Record<string, unknown> = {}) {
    const mission = await prisma.mission.create({
      data: { classId: f.classId, title: `Misión ${randomUUID().slice(0, 6)}`, ...data },
    })
    await prisma.missionEnigma.create({
      data: { missionId: mission.id, title: 'Enigma', xpReward: 50, coinReward: 10 },
    })
    const hintIds: string[] = []
    for (const [index, [costType, cost]] of costs.entries()) {
      const hint = await prisma.missionHint.create({
        data: {
          missionId: mission.id,
          content: `Pista ${index + 1} de ${mission.title}`,
          orderIndex: index,
          costType,
          cost,
        },
      })
      hintIds.push(hint.id)
    }
    return { missionId: mission.id, title: mission.title, hintIds }
  }

  const studentEnrollment = () =>
    prisma.classEnrollment.findFirstOrThrow({
      where: { classId: f.classId, studentId: f.users.student.id },
    })

  async function setWallet(data: { coins?: number; xp?: number; level?: number }) {
    const enrollment = await studentEnrollment()
    await prisma.classEnrollment.update({ where: { id: enrollment.id }, data })
  }

  /** Ajustes de la clase; `null` los deja como de serie (todo activo). */
  const setSettings = (settings: Record<string, boolean> | null) =>
    prisma.class.update({ where: { id: f.classId }, data: { settings: settings ?? {} } })

  const use = (missionId: string, hintId: string, actor: Actor = 'student') =>
    send('POST', `/missions/${missionId}/hints/${hintId}/use`, actor)

  describe('el profesorado: crear, editar, ordenar y borrar', () => {
    it('crear acota el coste y recorta el texto, sin lanzar', async () => {
      const { missionId } = await missionWithHints([])
      const cases: [unknown, unknown, string, number][] = [
        ['coins', -5, 'coins', 0],
        ['percent', 150, 'percent', 100],
        ['xp', 99999, 'xp', HINT_LIMITS.maxCost],
        ['coins', 3.6, 'coins', 4],
        [undefined, undefined, 'coins', 0],
        // Un tipo que no existe pasa a monedas y un número en texto vale como número.
        ['mana', 5, 'coins', 5],
        ['xp', '7', 'xp', 7],
        ['percent', 'mucho', 'percent', 0],
        [null, null, 'coins', 0],
      ]
      for (const [costType, cost, expectedType, expectedCost] of cases) {
        const response = await send('POST', `/missions/${missionId}/hints`, 'owner', {
          content: '  Mira el mapa  ',
          ...(costType === undefined ? {} : { costType }),
          ...(cost === undefined ? {} : { cost }),
        })
        expect(response.statusCode, `${costType} ${cost}`).toBe(201)
        expect(response.json().hint).toMatchObject({
          content: 'Mira el mapa',
          costType: expectedType,
          cost: expectedCost,
          usedCount: 0,
        })
      }

      const long = await send('POST', `/missions/${missionId}/hints`, 'owner', {
        content: 'a'.repeat(HINT_LIMITS.content + 200),
      })
      expect(long.statusCode).toBe(201)
      expect(long.json().hint.content).toHaveLength(HINT_LIMITS.content)
    })

    it('sin texto no se crea: 400', async () => {
      const { missionId } = await missionWithHints([])
      for (const payload of [{ content: '   ' }, {}, { content: 42 }]) {
        const response = await send('POST', `/missions/${missionId}/hints`, 'owner', payload)
        expect(response.statusCode, JSON.stringify(payload)).toBe(400)
      }
      expect(await prisma.missionHint.count({ where: { missionId } })).toBe(0)
    })

    it(`una misión tiene como mucho ${HINT_LIMITS.perMission} pistas`, async () => {
      const { missionId } = await missionWithHints(
        Array.from({ length: HINT_LIMITS.perMission - 1 }, () => ['coins', 1] as Cost)
      )
      const results = await Promise.all(
        [1, 2].map(() =>
          send('POST', `/missions/${missionId}/hints`, 'owner', { content: 'Una más' })
        )
      )
      expect(results.map(r => r.statusCode).sort()).toEqual([201, 409])
      expect(results.find(r => r.statusCode === 409)!.json().code).toBe('HINT_LIMIT')
      expect(await prisma.missionHint.count({ where: { missionId } })).toBe(
        HINT_LIMITS.perMission
      )
    })

    it('la nueva va al final; editar cambia el texto y el coste', async () => {
      const { missionId, hintIds } = await missionWithHints([['coins', 5]])
      const created = await send('POST', `/missions/${missionId}/hints`, 'owner', {
        content: 'La segunda',
        costType: 'xp',
        cost: 15,
      })
      expect(created.json().hint).toMatchObject({ position: 2 })

      const edited = await send('PUT', `/missions/${missionId}/hints/${hintIds[0]}`, 'owner', {
        content: 'La primera, corregida',
        costType: 'percent',
        cost: 20,
      })
      expect(edited.statusCode).toBe(200)
      expect(edited.json().hint).toMatchObject({
        position: 1,
        content: 'La primera, corregida',
        costType: 'percent',
        cost: 20,
      })
      // Solo el coste: el texto se queda.
      const onlyCost = await send('PUT', `/missions/${missionId}/hints/${hintIds[0]}`, 'owner', {
        cost: 250,
      })
      expect(onlyCost.json().hint).toMatchObject({
        content: 'La primera, corregida',
        costType: 'percent',
        cost: 100,
      })
      // Lo raro también se recoloca al editar, sin 400.
      const odd = await send('PUT', `/missions/${missionId}/hints/${hintIds[0]}`, 'owner', {
        costType: 'mana',
        cost: '12',
      })
      expect(odd.statusCode).toBe(200)
      expect(odd.json().hint).toMatchObject({ costType: 'coins', cost: 12 })
    })

    it('la pista de otra misión por la ruta de esta: 404, y no cambia', async () => {
      const a = await missionWithHints([['coins', 5]])
      const b = await missionWithHints([['coins', 5]])
      for (const [method, url, payload] of [
        ['PUT', `/missions/${a.missionId}/hints/${b.hintIds[0]}`, { content: 'Cambiada' }],
        ['DELETE', `/missions/${a.missionId}/hints/${b.hintIds[0]}`, undefined],
      ] as const) {
        expect((await send(method, url, 'owner', payload)).statusCode).toBe(404)
      }
      expect(await prisma.missionHint.findUnique({ where: { id: b.hintIds[0] } })).toMatchObject({
        content: `Pista 1 de ${b.title}`,
      })
    })

    it('reordenar solo cambia el orden de lo que es de esa misión', async () => {
      const a = await missionWithHints([
        ['coins', 1],
        ['coins', 2],
        ['coins', 3],
      ])
      const b = await missionWithHints([['coins', 9]])
      const response = await send('PUT', `/missions/${a.missionId}/hints/reorder`, 'owner', {
        ids: [a.hintIds[2], b.hintIds[0], a.hintIds[0], a.hintIds[1]],
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().hints.map((h: { cost: number }) => h.cost)).toEqual([3, 1, 2])
      expect(
        (await prisma.missionHint.findUniqueOrThrow({ where: { id: b.hintIds[0] } })).missionId
      ).toBe(b.missionId)
    })

    it('el GET de la misión trae al profesorado todas las pistas, con su texto y cuántos la usaron', async () => {
      const { missionId, hintIds } = await missionWithHints([
        ['coins', 0],
        ['xp', 0],
      ])
      await prisma.missionHintUse.create({
        data: {
          hintId: hintIds[0],
          missionId,
          studentId: f.users.student.id,
          costType: 'coins',
          cost: 0,
        },
      })
      const response = await send('GET', `/missions/${missionId}`, 'owner')
      expect(response.statusCode).toBe(200)
      const { hints, hintState } = response.json().mission
      expect(hintState).toBeNull()
      expect(hints).toEqual([
        {
          id: hintIds[0],
          position: 1,
          content: expect.stringContaining('Pista 1'),
          costType: 'coins',
          cost: 0,
          usedCount: 1,
        },
        {
          id: hintIds[1],
          position: 2,
          content: expect.stringContaining('Pista 2'),
          costType: 'xp',
          cost: 0,
          usedCount: 0,
        },
      ])
    })

    it('una pista que alguien ha usado no se borra (409); sin usar, sí', async () => {
      const { missionId, hintIds } = await missionWithHints([
        ['coins', 0],
        ['coins', 0],
      ])
      await prisma.missionHintUse.create({
        data: {
          hintId: hintIds[0],
          missionId,
          studentId: f.users.student.id,
          costType: 'coins',
          cost: 0,
        },
      })
      const blocked = await send('DELETE', `/missions/${missionId}/hints/${hintIds[0]}`, 'owner')
      expect(blocked.statusCode).toBe(409)
      expect(blocked.json().code).toBe('HINT_USED')
      // La base tampoco deja: la clave del uso no tiene cascada desde la pista.
      await expect(prisma.missionHint.delete({ where: { id: hintIds[0] } })).rejects.toMatchObject(
        { code: 'P2003' }
      )

      const free = await send('DELETE', `/missions/${missionId}/hints/${hintIds[1]}`, 'owner')
      expect(free.statusCode).toBe(200)
      expect(await prisma.missionHint.count({ where: { missionId } })).toBe(1)
    })

    it('movida a otra clase, solo cuentan los usos de quien está en esa clase, y la pista se borra', async () => {
      const both = await prisma.user.create({
        data: {
          email: `pistas-${randomUUID().slice(0, 8)}@test.invalid`,
          passwordHash: 'x',
          name: 'Estudiante de dos clases',
          role: 'student',
          isOnboarded: true,
        },
      })
      extraUsers.push(both.id)
      const { createClassWithOwner } = await import('../../src/utils/class-owner.js')
      const target = await prisma.$transaction(tx =>
        createClassWithOwner(
          tx,
          {
            name: `Destino ${randomUUID().slice(0, 6)}`,
            invitationCode: randomUUID().slice(0, 6).toUpperCase(),
          },
          f.users.owner.id
        )
      )
      try {
        await prisma.classEnrollment.createMany({
          data: [
            { classId: f.classId, studentId: both.id },
            { classId: target.id, studentId: both.id },
          ],
        })
        const { missionId, hintIds } = await missionWithHints([
          ['coins', 0],
          ['coins', 0],
        ])
        // La primera la usa quien solo está en la clase de origen; la segunda, quien está en las dos.
        await prisma.missionHintUse.createMany({
          data: [
            { hintId: hintIds[0], missionId, studentId: f.users.student.id, costType: 'coins', cost: 0 },
            { hintId: hintIds[1], missionId, studentId: both.id, costType: 'coins', cost: 0 },
          ],
        })
        await prisma.mission.update({ where: { id: missionId }, data: { classId: target.id } })

        const seen = (await send('GET', `/missions/${missionId}`, 'owner')).json().mission.hints
        expect(seen.map((h: { usedCount: number }) => h.usedCount)).toEqual([0, 1])

        const freed = await send('DELETE', `/missions/${missionId}/hints/${hintIds[0]}`, 'owner')
        expect(freed.statusCode).toBe(200)
        expect(await prisma.missionHintUse.count({ where: { hintId: hintIds[0] } })).toBe(0)

        const kept = await send('DELETE', `/missions/${missionId}/hints/${hintIds[1]}`, 'owner')
        expect(kept.statusCode).toBe(409)
        expect(kept.json().code).toBe('HINT_USED')
      } finally {
        await prisma.class.delete({ where: { id: target.id } })
      }
    })

    it('queda en el historial de la clase, con la misión y la posición y sin nombres', async () => {
      const { missionId, title } = await missionWithHints([])
      const created = await send('POST', `/missions/${missionId}/hints`, 'owner', {
        content: 'Primera',
        costType: 'coins',
        cost: 5,
      })
      const second = await send('POST', `/missions/${missionId}/hints`, 'owner', {
        content: 'Segunda',
      })
      const hintId = created.json().hint.id
      await send('PUT', `/missions/${missionId}/hints/${hintId}`, 'owner', { cost: 8 })
      // Guardar lo mismo no se apunta.
      await send('PUT', `/missions/${missionId}/hints/${hintId}`, 'owner', { cost: 8 })
      await send('PUT', `/missions/${missionId}/hints/reorder`, 'owner', {
        ids: [second.json().hint.id, hintId],
      })
      await send('DELETE', `/missions/${missionId}/hints/${hintId}`, 'owner')

      const rows = await prisma.classActionLog.findMany({
        where: { classId: f.classId, action: { startsWith: 'hint.' }, metadata: { path: ['missionId'], equals: missionId } },
        orderBy: { createdAt: 'asc' },
      })
      expect(rows.map(r => [r.action, r.actorId])).toEqual([
        ['hint.created', f.users.owner.id],
        ['hint.created', f.users.owner.id],
        ['hint.updated', f.users.owner.id],
        ['hint.reordered', f.users.owner.id],
        ['hint.deleted', f.users.owner.id],
      ])
      expect(rows[0].metadata).toEqual({ title, missionId, position: 1, costType: 'coins', cost: 5 })
      expect(rows[2].metadata).toMatchObject({ title, position: 1, fields: ['cost'], cost: 8 })
      expect(rows[4].metadata).toEqual({ title, missionId, position: 2 })
    })
  })

  describe('las copias llevan las pistas, nunca sus usos', () => {
    const hintRows = (missionId: string) =>
      prisma.missionHint.findMany({
        where: { missionId },
        orderBy: { orderIndex: 'asc' },
        select: { content: true, orderIndex: true, costType: true, cost: true },
      })

    it('importar la misión a otra clase', async () => {
      const { missionId, hintIds } = await missionWithHints([
        ['coins', 5],
        ['percent', 20],
      ])
      await prisma.missionHintUse.create({
        data: { hintId: hintIds[0], missionId, studentId: f.users.student.id, costType: 'coins', cost: 5 },
      })
      const response = await send('POST', `/teacher/missions/${missionId}/import`, 'owner', {
        targetClassId: f.classId,
      })
      expect(response.statusCode).toBe(201)
      const copyId = response.json().mission.id
      expect(response.json().copied).toMatchObject({ enigmas: 1, hints: 2 })
      expect(await hintRows(copyId)).toEqual(await hintRows(missionId))
      expect(await prisma.missionHintUse.count({ where: { missionId: copyId } })).toBe(0)
      const imported = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'mission.imported', entityId: copyId },
      })
      expect(imported.metadata).toMatchObject({ hints: 2 })
    })

    it('duplicar la clase e importarla como plantilla', async () => {
      const source = await prisma.$transaction(async tx => {
        const { createClassWithOwner } = await import('../../src/utils/class-owner.js')
        return createClassWithOwner(
          tx,
          {
            name: `Fuente ${randomUUID().slice(0, 6)}`,
            invitationCode: randomUUID().slice(0, 6).toUpperCase(),
            isTemplate: true,
          },
          f.users.owner.id
        )
      })
      const mission = await prisma.mission.create({ data: { classId: source.id, title: 'Con pistas' } })
      await prisma.missionEnigma.create({ data: { missionId: mission.id, title: 'E', xpReward: 10 } })
      await prisma.missionHint.createMany({
        data: [
          { missionId: mission.id, content: 'Segunda', orderIndex: 1, costType: 'xp', cost: 7 },
          { missionId: mission.id, content: 'Primera', orderIndex: 0, costType: 'coins', cost: 3 },
        ],
      })
      const [hint] = await prisma.missionHint.findMany({ where: { missionId: mission.id } })
      await prisma.missionHintUse.create({
        data: { hintId: hint.id, missionId: mission.id, studentId: f.users.student.id, costType: hint.costType, cost: hint.cost },
      })

      const duplicated = await send('POST', `/teacher/classes/${source.id}/duplicate`, 'owner', {
        missions: true,
      })
      expect(duplicated.statusCode).toBe(200)
      const imported = await send('POST', `/teacher/templates/${source.id}/import`, 'other', {
        missions: true,
      })
      expect(imported.statusCode).toBe(200)

      for (const classId of [duplicated.json().class.id, imported.json().class.id]) {
        const copy = await prisma.mission.findFirstOrThrow({ where: { classId } })
        expect(await hintRows(copy.id)).toEqual([
          { content: 'Primera', orderIndex: 0, costType: 'coins', cost: 3 },
          { content: 'Segunda', orderIndex: 1, costType: 'xp', cost: 7 },
        ])
        expect(await prisma.missionHintUse.count({ where: { missionId: copy.id } })).toBe(0)
      }
    })
  })

  describe('el alumnado: ver y usar', () => {
    it('ve cuántas hay, su tipo y su coste; el texto, solo de las que ha usado', async () => {
      await setSettings(null)
      await setWallet({ coins: 100, xp: 0 })
      const { missionId, hintIds } = await missionWithHints([
        ['coins', 10],
        ['xp', 5],
        ['percent', 20],
      ])
      const before = (await send('GET', `/missions/${missionId}`, 'student')).json().mission
      expect(before.hints).toEqual([
        { id: hintIds[0], position: 1, costType: 'coins', cost: 10, used: false, content: null, isNext: true },
        { id: hintIds[1], position: 2, costType: 'xp', cost: 5, used: false, content: null, isNext: false },
        { id: hintIds[2], position: 3, costType: 'percent', cost: 20, used: false, content: null, isNext: false },
      ])
      expect(before.hintState).toEqual({
        penalty: 0,
        canUse: true,
        closedReason: null,
        coins: 100,
        xp: 0,
      })
      // Ni en el GET de la misión de un alumno ajeno, que no la ve.
      expect((await send('GET', `/missions/${missionId}`, 'outsider')).statusCode).toBe(404)
    })

    it('usar la siguiente cobra monedas, abre su texto y la apunta en su muro', async () => {
      await setSettings(null)
      await setWallet({ coins: 25, xp: 0 })
      const { missionId, hintIds, title } = await missionWithHints([
        ['coins', 10],
        ['coins', 10],
      ])
      const response = await use(missionId, hintIds[0])
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.hints[0]).toMatchObject({ used: true, content: `Pista 1 de ${title}`, cost: 10 })
      expect(body.hints[1]).toMatchObject({ used: false, content: null, isNext: true })
      expect(body.hintState).toMatchObject({ coins: 15, canUse: true })
      expect((await studentEnrollment()).coins).toBe(15)

      const activity = await prisma.activity.findFirstOrThrow({
        where: { userId: f.users.student.id, type: 'hint_used', missionTitle: title },
      })
      expect(activity).toMatchObject({ classId: f.classId })
      expect(activity.metadata).toEqual({
        missionId,
        hintId: hintIds[0],
        position: 1,
        costType: 'coins',
        cost: 10,
      })
      // La misma otra vez: ya la tiene, sin cobrar de nuevo.
      const again = await use(missionId, hintIds[0])
      expect(again.statusCode).toBe(409)
      expect(again.json().code).toBe('HINT_ALREADY_USED')
      expect((await studentEnrollment()).coins).toBe(15)
    })

    it('si el coste cambia con la página abierta, no se cobra otro: 409 y el saldo intacto', async () => {
      await setSettings(null)
      await setWallet({ coins: 600, xp: 0 })
      const { missionId, hintIds } = await missionWithHints([['coins', 500]])
      const shown = (await send('GET', `/missions/${missionId}`, 'student')).json().mission.hints[0]
      expect(shown).toMatchObject({ costType: 'coins', cost: 500 })
      const seen = { costType: shown.costType, cost: shown.cost }

      // La docente lo sube a 550 y después lo pasa a %: lo que se veía ya no vale.
      for (const change of [{ cost: 550 }, { costType: 'percent', cost: 10 }]) {
        await send('PUT', `/missions/${missionId}/hints/${hintIds[0]}`, 'owner', change)
        const response = await send(
          'POST',
          `/missions/${missionId}/hints/${hintIds[0]}/use`,
          'student',
          seen
        )
        expect(response.statusCode, JSON.stringify(change)).toBe(409)
        expect(response.json().code).toBe('HINT_COST_CHANGED')
        expect((await studentEnrollment()).coins).toBe(600)
        expect(await prisma.missionHintUse.count({ where: { missionId } })).toBe(0)
      }

      // Con la tienda apagada sale gratis: lo que se veía (500) tampoco vale.
      await send('PUT', `/missions/${missionId}/hints/${hintIds[0]}`, 'owner', {
        costType: 'coins',
        cost: 500,
      })
      await setSettings({ coins: false })
      const off = await send('POST', `/missions/${missionId}/hints/${hintIds[0]}/use`, 'student', seen)
      expect(off.json().code).toBe('HINT_COST_CHANGED')
      await setSettings(null)

      // Con lo que hay ahora, sí.
      const ok = await send('POST', `/missions/${missionId}/hints/${hintIds[0]}/use`, 'student', seen)
      expect(ok.statusCode).toBe(200)
      expect(ok.json().hintState.coins).toBe(100)
    })

    it('en orden: no se salta ninguna, y reordenar después no rompe nada', async () => {
      await setSettings(null)
      await setWallet({ coins: 100 })
      const { missionId, hintIds } = await missionWithHints([
        ['coins', 1],
        ['coins', 2],
        ['coins', 3],
      ])
      const skipped = await use(missionId, hintIds[1])
      expect(skipped.statusCode).toBe(409)
      expect(skipped.json().code).toBe('HINT_NOT_NEXT')
      expect(await prisma.missionHintUse.count({ where: { missionId } })).toBe(0)

      expect((await use(missionId, hintIds[0])).statusCode).toBe(200)
      // El profesorado pone la tercera delante: la siguiente es ahora la tercera.
      await send('PUT', `/missions/${missionId}/hints/reorder`, 'owner', {
        ids: [hintIds[2], hintIds[0], hintIds[1]],
      })
      expect((await use(missionId, hintIds[1])).json().code).toBe('HINT_NOT_NEXT')
      const third = await use(missionId, hintIds[2])
      expect(third.statusCode).toBe(200)
      expect(third.json().hints.map((h: { used: boolean }) => h.used)).toEqual([true, true, false])
    })

    it('sin saldo suficiente no se cobra ni se usa', async () => {
      await setSettings(null)
      await setWallet({ coins: 9, xp: 4 })
      const coins = await missionWithHints([['coins', 10]])
      const xp = await missionWithHints([['xp', 5]])
      const noCoins = await use(coins.missionId, coins.hintIds[0])
      expect(noCoins.statusCode).toBe(409)
      expect(noCoins.json().code).toBe('HINT_NOT_ENOUGH_COINS')
      const noXp = await use(xp.missionId, xp.hintIds[0])
      expect(noXp.statusCode).toBe(409)
      expect(noXp.json().code).toBe('HINT_NOT_ENOUGH_XP')
      expect(await studentEnrollment()).toMatchObject({ coins: 9, xp: 4 })
      expect(
        await prisma.missionHintUse.count({
          where: { missionId: { in: [coins.missionId, xp.missionId] } },
        })
      ).toBe(0)
    })

    it('con XP: baja la XP y, si toca, el nivel', async () => {
      await setSettings(null)
      const start = 400
      const level = getLevelFromXP(start)
      await setWallet({ coins: 0, xp: start, level })
      const cost = start - 1
      const { missionId, hintIds } = await missionWithHints([['xp', cost]])
      const response = await use(missionId, hintIds[0])
      expect(response.statusCode).toBe(200)
      const after = await studentEnrollment()
      expect(after.xp).toBe(1)
      expect(after.level).toBe(getLevelFromXP(1))
      expect(after.level).toBeLessThan(level)
    })

    it('con el recurso apagado en la clase, la pista sale gratis', async () => {
      await setSettings({ shop: false, coins: false, mana: false, xp: false, rankings: false })
      await setWallet({ coins: 3, xp: 3 })
      const { missionId, hintIds } = await missionWithHints([
        ['coins', 50],
        ['xp', 50],
      ])
      const seen = (await send('GET', `/missions/${missionId}`, 'student')).json().mission.hints
      expect(seen.map((h: { cost: number }) => h.cost)).toEqual([0, 0])
      expect((await use(missionId, hintIds[0])).statusCode).toBe(200)
      expect((await use(missionId, hintIds[1])).statusCode).toBe(200)
      expect(await studentEnrollment()).toMatchObject({ coins: 3, xp: 3 })
      const uses = await prisma.missionHintUse.findMany({ where: { missionId } })
      expect(uses.map(u => u.cost)).toEqual([0, 0])
      await setSettings(null)
    })

    it('cuatro usos a la vez con saldo para uno: sale uno y el saldo no baja de 0', async () => {
      await setSettings(null)
      await setWallet({ coins: 10 })
      const { missionId, hintIds } = await missionWithHints([
        ['coins', 10],
        ['coins', 10],
      ])
      const user = { id: f.users.student.id, role: 'student' }
      const results = await Promise.allSettled([
        useHint(user, missionId, hintIds[0]),
        useHint(user, missionId, hintIds[0]),
        useHint(user, missionId, hintIds[1]),
        useHint(user, missionId, hintIds[1]),
      ])
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
      expect((await studentEnrollment()).coins).toBe(0)
      expect(await prisma.missionHintUse.count({ where: { missionId } })).toBe(1)
      expect(
        await prisma.missionHintUse.count({ where: { missionId, hintId: hintIds[0] } })
      ).toBe(1)
    })

    it('desde la vista previa se ven todas abiertas y no se usan', async () => {
      const { missionId, hintIds } = await missionWithHints([['coins', 0]])
      await prisma.classEnrollment.upsert({
        where: { studentId_classId: { studentId: f.users.owner.id, classId: f.classId } },
        update: {},
        create: { studentId: f.users.owner.id, classId: f.classId, isPreview: true },
      })
      const seen = (await send('GET', `/missions/${missionId}`, 'owner')).json().mission.hints
      expect(seen[0].content).toContain('Pista 1')
      const response = await use(missionId, hintIds[0], 'owner')
      expect(response.statusCode).toBe(409)
      expect(response.json().code).toBe('HINT_PREVIEW')
      expect(await prisma.missionHintUse.count({ where: { missionId } })).toBe(0)
    })

    it('quien no está en la clase no la usa: 404', async () => {
      const { missionId, hintIds } = await missionWithHints([['coins', 0]])
      for (const actor of ['outsider', 'other'] as const) {
        expect((await use(missionId, hintIds[0], actor)).statusCode, actor).toBe(404)
      }
    })

    it('con la misión bloqueada o la clase archivada no existe para el alumno (404); completada o caducada, 409', async () => {
      await setSettings(null)
      const blocked = await missionWithHints([['coins', 0]], { status: 'bloqueada' })
      expect((await use(blocked.missionId, blocked.hintIds[0])).statusCode).toBe(404)

      const expired = await missionWithHints([['coins', 0]], {
        deadline: new Date(Date.now() - 60_000),
      })
      const late = await use(expired.missionId, expired.hintIds[0])
      expect(late.statusCode).toBe(409)
      expect(late.json().code).toBe('HINT_MISSION_EXPIRED')
      expect(
        (await send('GET', `/missions/${expired.missionId}`, 'student')).json().mission.hintState
      ).toMatchObject({ canUse: false, closedReason: 'expired' })

      const done = await missionWithHints([['coins', 0]])
      await prisma.studentMissionProgress.create({
        data: {
          studentId: f.users.student.id,
          missionId: done.missionId,
          progress: 100,
          enigmasCompleted: 1,
          completedAt: new Date(),
        },
      })
      const finished = await use(done.missionId, done.hintIds[0])
      expect(finished.statusCode).toBe(409)
      expect(finished.json().code).toBe('HINT_MISSION_COMPLETED')

      const archived = await missionWithHints([['coins', 0]])
      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      try {
        expect((await use(archived.missionId, archived.hintIds[0])).statusCode).toBe(404)
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      }
    })

    /** Bloquea la matrícula desde fuera hasta `release()`, para poner en cola a quien llegue. */
    async function holdEnrollment(enrollmentId: string) {
      let release!: () => void
      const gate = new Promise<void>(resolve => (release = resolve))
      let locked!: () => void
      const ready = new Promise<void>(resolve => (locked = resolve))
      const holder = prisma.$transaction(
        async tx => {
          await tx.$queryRaw`SELECT id FROM class_enrollments WHERE id = ${enrollmentId} FOR UPDATE`
          locked()
          await gate
        },
        { timeout: 20_000 }
      )
      await ready
      return async () => {
        release()
        await holder
      }
    }

    const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    async function enrolledStudent() {
      const student = await prisma.user.create({
        data: {
          email: `pistas-${randomUUID().slice(0, 8)}@test.invalid`,
          passwordHash: 'x',
          name: 'Estudiante de pistas',
          role: 'student',
          isOnboarded: true,
        },
      })
      extraUsers.push(student.id)
      const enrollment = await prisma.classEnrollment.create({
        data: { classId: f.classId, studentId: student.id },
      })
      return { id: student.id, enrollmentId: enrollment.id }
    }

    it('sacar de la clase a quien está usando una pista: espera a que acabe y se lleva el uso', async () => {
      await setSettings(null)
      const student = await enrolledStudent()
      const { missionId, hintIds } = await missionWithHints([['coins', 0]])
      const release = await holdEnrollment(student.enrollmentId)
      const using = useHint({ id: student.id, role: 'student' }, missionId, hintIds[0])
      await pause(300)
      const removing = prisma.$transaction(
        tx => deleteEnrollmentData(tx, f.classId, student.id, student.enrollmentId),
        { timeout: 20_000 }
      )
      await pause(300)
      await release()
      const [used, removed] = await Promise.allSettled([using, removing])
      expect(used.status).toBe('fulfilled')
      expect(removed.status).toBe('fulfilled')
      expect(await prisma.missionHintUse.count({ where: { studentId: student.id } })).toBe(0)
      expect(
        await prisma.activity.count({ where: { userId: student.id, type: 'hint_used' } })
      ).toBe(0)
    })

    it('usar una pista justo después de que te saquen de la clase: 404 y nada se apunta', async () => {
      await setSettings(null)
      const student = await enrolledStudent()
      const { missionId, hintIds } = await missionWithHints([['coins', 0]])
      const release = await holdEnrollment(student.enrollmentId)
      const removing = prisma.$transaction(
        tx => deleteEnrollmentData(tx, f.classId, student.id, student.enrollmentId),
        { timeout: 20_000 }
      )
      await pause(300)
      const using = useHint({ id: student.id, role: 'student' }, missionId, hintIds[0])
      await pause(300)
      await release()
      const [removed, used] = await Promise.allSettled([removing, using])
      expect(removed.status).toBe('fulfilled')
      expect(used.status).toBe('rejected')
      expect((used as PromiseRejectedResult).reason).toMatchObject({ statusCode: 404 })
      expect(await prisma.missionHintUse.count({ where: { studentId: student.id } })).toBe(0)
    })

    it('al sacar a alguien de la clase se borran sus usos; borrar la clase con pistas usadas no falla', async () => {
      const student = await prisma.user.create({
        data: {
          email: `pistas-${randomUUID().slice(0, 8)}@test.invalid`,
          passwordHash: 'x',
          name: 'Estudiante de pistas',
          role: 'student',
          isOnboarded: true,
        },
      })
      extraUsers.push(student.id)
      const enrollment = await prisma.classEnrollment.create({
        data: { classId: f.classId, studentId: student.id },
      })
      const { missionId, hintIds } = await missionWithHints([['coins', 0]])
      await useHint({ id: student.id, role: 'student' }, missionId, hintIds[0])
      expect(await prisma.missionHintUse.count({ where: { studentId: student.id } })).toBe(1)

      await prisma.$transaction(tx =>
        deleteEnrollmentData(tx, f.classId, student.id, enrollment.id)
      )
      expect(await prisma.missionHintUse.count({ where: { studentId: student.id } })).toBe(0)

      // La purga de una clase: los usos se van con sus misiones, sin chocar con la pista.
      const purged = await prisma.$transaction(async tx => {
        const { createClassWithOwner } = await import('../../src/utils/class-owner.js')
        return createClassWithOwner(
          tx,
          { name: `Purga ${randomUUID().slice(0, 6)}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
          f.users.owner.id
        )
      })
      await prisma.classEnrollment.create({ data: { classId: purged.id, studentId: student.id } })
      const m = await prisma.mission.create({ data: { classId: purged.id, title: 'Purga' } })
      const h = await prisma.missionHint.create({ data: { missionId: m.id, content: 'x' } })
      await prisma.missionHintUse.create({
        data: { hintId: h.id, missionId: m.id, studentId: student.id, costType: 'coins', cost: 0 },
      })
      await prisma.class.delete({ where: { id: purged.id } })
      expect(await prisma.missionHintUse.count({ where: { missionId: m.id } })).toBe(0)
    })
  })
})
