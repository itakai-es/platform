import { it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * El orden de la progresión de una clase (E3, entrega 1): el relleno de la
 * migración, las misiones nuevas, importadas y movidas al final, la ruta de
 * ordenar (con una sola entrada en el registro) y los listados y las copias que
 * lo respetan.
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
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { publicTemplateRoutes } from '../../src/modules/templates/templates.routes.js'
import { mergeMissionOrder, sortByClassOrder } from '../../src/utils/mission-order.js'
import { TeacherAgent } from '../../src/modules/ai/agents/teacher-agent.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

const MIGRATION = new URL(
  '../../prisma/migrations/20261024300000_e3_mission_order/migration.sql',
  import.meta.url
)

/** Lo que se lanza dentro de una transacción para deshacerla a propósito. */
const ROLLBACK = new Error('rollback')

/** Espera a que se cumpla `condition`, o falla a los cinco segundos. */
async function waitUntil(condition: () => Promise<boolean>, what: string) {
  const until = Date.now() + 5000
  while (!(await condition())) {
    if (Date.now() > until) throw new Error(`No ha llegado a pasar: ${what}`)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

/** Escrituras del orden de las misiones que esperan a que se suelte una fila. */
async function orderLockWaits() {
  const [row] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock'
      AND query ILIKE '%order_index%' AND query ILIKE '%missions%'`
  return row!.n
}

describeWithDatabase('orden de las misiones de una clase', () => {
  let app: FastifyInstance
  let f: ClassFixture

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(publicTemplateRoutes, { prefix: '/templates' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  beforeEach(async () => {
    await prisma.mission.deleteMany({ where: { classId: { in: [f.classId, f.otherClassId] } } })
    await prisma.classActionLog.deleteMany({ where: { classId: { in: [f.classId, f.otherClassId] } } })
  })

  const as = (actor: 'owner' | 'other' | 'student') => ({
    authorization: `Bearer ${f.token(actor)}`,
  })

  /** Una misión con un enigma (crear por la ruta lo exige), creada por la ruta. */
  async function createByRoute(title: string, classId = f.classId) {
    const res = await app.inject({
      method: 'POST',
      url: '/teacher/missions',
      headers: as('owner'),
      payload: { title, classId, enigmas: [{ title: 'Primer paso', xp: 10 }] },
    })
    expect(res.statusCode, res.body).toBe(201)
    return res.json().mission as { id: string; orderIndex: number }
  }

  /** Una misión directa en la base, con su posición y su fecha de creación. */
  async function newMission(
    title: string,
    { classId = f.classId, orderIndex = 0, createdAt }: { classId?: string; orderIndex?: number; createdAt?: Date } = {}
  ) {
    const mission = await prisma.mission.create({
      data: { classId, title, orderIndex, ...(createdAt ? { createdAt } : {}) },
    })
    await prisma.missionEnigma.create({ data: { missionId: mission.id, title: 'Paso', xpReward: 10 } })
    return mission.id
  }

  /** Otra clase del propietario (la borra `cleanup`, con las suyas). */
  const ownClass = (name: string) =>
    prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        {
          name: `${name} ${randomUUID().slice(0, 4)}`,
          invitationCode: randomUUID().slice(0, 6).toUpperCase(),
        },
        f.users.owner.id
      )
    )

  const titlesIn = async (classId: string) =>
    (
      await prisma.mission.findMany({
        where: { classId },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: { title: true },
      })
    ).map(m => m.title)

  const reorder = (ids: string[], actor: 'owner' | 'other' | 'student' = 'owner') =>
    app.inject({
      method: 'PUT',
      url: `/teacher/classes/${f.classId}/missions/order`,
      headers: as(actor),
      payload: { ids },
    })

  it('el relleno de la migración numera cada clase por orden de creación, desde 0', async () => {
    const update = /UPDATE "missions" m[\s\S]*?;/.exec(readFileSync(MIGRATION, 'utf8'))![0]
    const t = Date.parse('2026-01-10T10:00:00Z')
    await newMission('Tercera', { orderIndex: 9, createdAt: new Date(t + 2000) })
    await newMission('Primera', { orderIndex: 9, createdAt: new Date(t) })
    await newMission('Segunda', { orderIndex: 9, createdAt: new Date(t + 1000) })
    await newMission('Sola en la otra', { classId: f.otherClassId, orderIndex: 5 })

    let rows: { title: string; orderIndex: number; classId: string }[] = []
    await prisma
      .$transaction(async tx => {
        await tx.$executeRawUnsafe(update)
        rows = await tx.mission.findMany({
          where: { classId: { in: [f.classId, f.otherClassId] } },
          select: { title: true, orderIndex: true, classId: true },
          orderBy: { orderIndex: 'asc' },
        })
        throw ROLLBACK
      })
      .catch(error => {
        if (error !== ROLLBACK) throw error
      })

    expect(rows.filter(r => r.classId === f.classId).map(r => [r.title, r.orderIndex])).toEqual([
      ['Primera', 0],
      ['Segunda', 1],
      ['Tercera', 2],
    ])
    expect(rows.filter(r => r.classId === f.otherClassId).map(r => r.orderIndex)).toEqual([0])
  })

  it('una misión nueva va al final, también si se crean varias a la vez', async () => {
    await newMission('Ya estaba', { orderIndex: 4 })
    const first = await createByRoute('Nueva')
    expect(first.orderIndex).toBe(5)

    const together = await Promise.all(['A', 'B', 'C', 'D'].map(t => createByRoute(t)))
    expect(together.map(m => m.orderIndex).sort()).toEqual([6, 7, 8, 9])
  })

  it('ordenar deja el orden pedido, que siguen el listado del profesorado y el del alumnado', async () => {
    const a = await newMission('A', { orderIndex: 0 })
    const b = await newMission('B', { orderIndex: 1 })
    const c = await newMission('C', { orderIndex: 2 })

    const res = await reorder([c, a, b])
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().order).toEqual([c, a, b])

    const teacher = await app.inject({
      method: 'GET',
      url: `/teacher/classes/${f.classId}/missions`,
      headers: as('owner'),
    })
    expect(teacher.json().missions.map((m: { title: string }) => m.title)).toEqual(['C', 'A', 'B'])
    expect(teacher.json().missions.map((m: { orderIndex: number }) => m.orderIndex)).toEqual([0, 1, 2])

    const student = await app.inject({
      method: 'GET',
      url: `/students/classes/${f.classId}/missions`,
      headers: as('student'),
    })
    expect(student.statusCode).toBe(200)
    expect(student.json().missions.map((m: { title: string }) => m.title)).toEqual(['C', 'A', 'B'])

    // El listado de todas sus misiones las da por clase y en ese orden.
    const all = await app.inject({ method: 'GET', url: '/missions', headers: as('student') })
    expect(
      all
        .json()
        .missions.filter((m: { classId: string }) => m.classId === f.classId)
        .map((m: { title: string }) => m.title)
    ).toEqual(['C', 'A', 'B'])

    // Y el del profesorado filtrado por la clase.
    const filtered = await app.inject({
      method: 'GET',
      url: `/teacher/missions?classIdFilter=${f.classId}`,
      headers: as('owner'),
    })
    expect(filtered.json().missions.map((m: { title: string }) => m.title)).toEqual(['C', 'A', 'B'])
  })

  it('una sola entrada en el registro, sin títulos, y ninguna si el orden no cambia', async () => {
    const a = await newMission('A', { orderIndex: 0 })
    const b = await newMission('B', { orderIndex: 1 })

    expect((await reorder([b, a])).statusCode).toBe(200)
    expect((await reorder([b, a])).statusCode).toBe(200)

    const logs = await prisma.classActionLog.findMany({
      where: { classId: f.classId, action: 'mission.reordered' },
    })
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      entityType: 'class',
      entityId: f.classId,
      actorId: f.users.owner.id,
      metadata: { count: 2, moved: 2 },
    })
    expect(JSON.stringify(logs[0]!.metadata)).not.toMatch(/"A"|"B"/)
  })

  it('un id de otra clase no cuenta, los repetidos tampoco, y las que faltan quedan detrás', async () => {
    const a = await newMission('A', { orderIndex: 0 })
    const b = await newMission('B', { orderIndex: 1 })
    const c = await newMission('C', { orderIndex: 2 })
    const foreign = await newMission('Ajena', { classId: f.otherClassId, orderIndex: 3 })

    const res = await reorder([foreign, c, c, randomUUID(), a])
    expect(res.statusCode, res.body).toBe(200)
    expect(await titlesIn(f.classId)).toEqual(['C', 'A', 'B'])
    expect(
      (await prisma.mission.findUniqueOrThrow({ where: { id: foreign } })).orderIndex
    ).toBe(3)
    expect(res.json().order).toEqual([c, a, b])
  })

  it('ordenar pide edición en la clase: ni otro profesor ni el alumnado', async () => {
    const a = await newMission('A', { orderIndex: 0 })
    const b = await newMission('B', { orderIndex: 1 })
    expect((await reorder([b, a], 'other')).statusCode).toBe(404)
    expect((await reorder([b, a], 'student')).statusCode).toBe(403)
    expect(await titlesIn(f.classId)).toEqual(['A', 'B'])
    // Una lista que no es de ids, rechazada antes de mirar nada.
    const bad = await app.inject({
      method: 'PUT',
      url: `/teacher/classes/${f.classId}/missions/order`,
      headers: as('owner'),
      payload: { ids: 'A,B' },
    })
    expect(bad.statusCode).toBe(400)
  })

  it('una misión importada de otra clase llega al final', async () => {
    await newMission('A', { orderIndex: 0 })
    await newMission('B', { orderIndex: 3 })
    // La de origen es del propietario: otra clase suya.
    const source = await ownClass('Origen')
    const imported = await newMission('Importada', { classId: source.id, orderIndex: 0 })

    const res = await app.inject({
      method: 'POST',
      url: `/teacher/missions/${imported}/import`,
      headers: as('owner'),
      payload: { targetClassId: f.classId },
    })
    expect(res.statusCode, res.body).toBe(201)
    const copy = await prisma.mission.findUniqueOrThrow({ where: { id: res.json().mission.id } })
    expect(copy.orderIndex).toBe(4)
    expect(await titlesIn(f.classId)).toEqual(['A', 'B', 'Importada'])
  })

  it('una misión que pasa a otra clase va al final de esa clase', async () => {
    const target = await ownClass('Destino')
    await newMission('Ya en destino', { classId: target.id, orderIndex: 2 })
    const moving = await newMission('Viajera', { orderIndex: 0 })

    const res = await app.inject({
      method: 'PATCH',
      url: `/missions/${moving}`,
      headers: as('owner'),
      payload: { classId: target.id },
    })
    expect(res.statusCode, res.body).toBe(200)
    const moved = await prisma.mission.findUniqueOrThrow({ where: { id: moving } })
    expect(moved).toMatchObject({ classId: target.id, orderIndex: 3 })

    // Editarla sin cambiar de clase no la mueve en el orden.
    await app.inject({
      method: 'PATCH',
      url: `/missions/${moving}`,
      headers: as('owner'),
      payload: { title: 'Viajera, ya en casa' },
    })
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: moving } })).orderIndex).toBe(3)
  })

  it('una misión que sale a otra clase mientras se ordena la suya llega igualmente al final de la nueva', async () => {
    const target = await ownClass('Destino')
    for (const [index, title] of ['T0', 'T1', 'T2'].entries()) {
      await newMission(title, { classId: target.id, orderIndex: index })
    }
    const leaving = await newMission('Viajera', { orderIndex: 0 })
    const b = await newMission('B', { orderIndex: 1 })
    const c = await newMission('C', { orderIndex: 2 })

    // Se sujeta la fila de la viajera; ordenar lee la clase con ella dentro y se
    // queda esperando al llegar a su fila. Entonces se va a la otra clase, al
    // final, como hace mover, y se suelta.
    let pending: ReturnType<typeof reorder> | undefined
    await prisma.$transaction(
      async tx => {
        await tx.$queryRaw`SELECT id FROM missions WHERE id = ${leaving} FOR UPDATE`
        pending = reorder([c, b, leaving])
        await waitUntil(async () => (await orderLockWaits()) > 0, 'ordenar espera a la viajera')
        const { _max } = await tx.mission.aggregate({
          where: { classId: target.id },
          _max: { orderIndex: true },
        })
        await tx.mission.update({
          where: { id: leaving },
          data: { classId: target.id, orderIndex: (_max.orderIndex ?? -1) + 1 },
        })
      },
      { timeout: 10000 }
    )
    const res = await pending!
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().order).toEqual([c, b])

    expect(await prisma.mission.findUniqueOrThrow({ where: { id: leaving } })).toMatchObject({
      classId: target.id,
      orderIndex: 3,
    })
    expect(await titlesIn(target.id)).toEqual(['T0', 'T1', 'T2', 'Viajera'])
    expect(await titlesIn(f.classId)).toEqual(['C', 'B'])
    const [log] = await prisma.classActionLog.findMany({
      where: { classId: f.classId, action: 'mission.reordered' },
    })
    expect(log?.metadata).toEqual({ count: 2, moved: 2 })
  })

  it('el asistente docente habla de las misiones recientes, en el orden de su clase, aunque haya clases viejas', async () => {
    const teacher = await prisma.user.create({
      data: {
        email: `agente.${randomUUID().slice(0, 8)}@test.invalid`,
        passwordHash: 'x',
        name: 'Agente',
        role: 'teacher',
        isOnboarded: true,
      },
    })
    const classOf = (name: string) =>
      prisma.$transaction(tx =>
        createClassWithOwner(
          tx,
          { name, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
          teacher.id
        )
      )
    try {
      // Seis clases del curso pasado, cada una con su primera misión.
      for (let i = 0; i < 6; i++) {
        const old = await classOf(`Vieja ${i}`)
        await newMission(`Vieja ${i}`, {
          classId: old.id,
          orderIndex: 0,
          createdAt: new Date(Date.parse('2025-09-01T10:00:00Z') + i * 1000),
        })
      }
      // Y la de ahora, con el orden cambiado respecto al de creación.
      const current = await classOf('Actual')
      const t = Date.now()
      for (const [offset, [title, orderIndex]] of (
        [['Tercera', 2], ['Primera', 0], ['Quinta', 4], ['Segunda', 1], ['Cuarta', 3]] as const
      ).entries()) {
        await newMission(title, { classId: current.id, orderIndex, createdAt: new Date(t + offset * 1000) })
      }

      const agent = new TeacherAgent({} as never, 'teacher')
      const prompt: string = await (
        agent as unknown as { buildPrompt: (c: unknown) => Promise<string> }
      ).buildPrompt({
        userId: teacher.id,
        role: 'teacher',
        assistantId: 'default',
        message: 'hola',
        locale: 'es',
      })
      const line = prompt.split('\n').find(l => l.startsWith('Misiones: '))!
      expect(line.slice('Misiones: '.length).split('; ').map(m => m.split(' en ')[0])).toEqual([
        'Primera',
        'Segunda',
        'Tercera',
        'Cuarta',
        'Quinta',
      ])
    } finally {
      await prisma.class.deleteMany({ where: { teacherId: teacher.id } })
      await prisma.user.delete({ where: { id: teacher.id } })
    }
  })

  it('duplicar la clase conserva el orden de la progresión, numerado desde 0', async () => {
    const t = Date.parse('2026-01-10T10:00:00Z')
    // El orden no es el de creación: la copia tiene que seguir el de la clase.
    await newMission('Segunda', { orderIndex: 5, createdAt: new Date(t) })
    await newMission('Primera', { orderIndex: 2, createdAt: new Date(t + 1000) })
    await newMission('Tercera', { orderIndex: 9, createdAt: new Date(t + 2000) })

    const res = await app.inject({
      method: 'POST',
      url: `/teacher/classes/${f.classId}/duplicate`,
      headers: as('owner'),
      payload: { missions: true },
    })
    expect(res.statusCode, res.body).toBe(200)
    const copyId = res.json().class.id as string
    const copies = await prisma.mission.findMany({
      where: { classId: copyId },
      orderBy: { orderIndex: 'asc' },
      select: { title: true, orderIndex: true },
    })
    expect(copies).toEqual([
      { title: 'Primera', orderIndex: 0 },
      { title: 'Segunda', orderIndex: 1 },
      { title: 'Tercera', orderIndex: 2 },
    ])
  })

  it('una plantilla lleva sus misiones en su orden: en la ficha y al importarla', async () => {
    await prisma.class.update({
      where: { id: f.classId },
      data: { isTemplate: true, subject: 'historia', educationLevel: 'eso', language: 'es' },
    })
    try {
      const t = Date.parse('2026-01-10T10:00:00Z')
      await newMission('Segunda', { orderIndex: 1, createdAt: new Date(t) })
      await newMission('Primera', { orderIndex: 0, createdAt: new Date(t + 1000) })

      const detail = await app.inject({ method: 'GET', url: `/templates/${f.classId}` })
      expect(detail.statusCode, detail.body).toBe(200)
      expect(detail.json().missions.map((m: { title: string }) => m.title)).toEqual([
        'Primera',
        'Segunda',
      ])

      const res = await app.inject({
        method: 'POST',
        url: `/teacher/templates/${f.classId}/import`,
        headers: as('other'),
        payload: { missions: true },
      })
      expect(res.statusCode, res.body).toBe(200)
      expect(await titlesIn(res.json().class.id)).toEqual(['Primera', 'Segunda'])
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: false } })
    }
  })
})

it('mergeMissionOrder: las de la clase una vez cada una, en el orden pedido y las que faltan detrás', () => {
  expect(mergeMissionOrder(['a', 'b', 'c', 'd'], ['c', 'x', 'a', 'c'])).toEqual(['c', 'a', 'b', 'd'])
  expect(mergeMissionOrder(['a', 'b'], [])).toEqual(['a', 'b'])
  expect(mergeMissionOrder([], ['a'])).toEqual([])
})

it('sortByClassOrder: por clase y, dentro, en el orden de la progresión', () => {
  const at = (s: number) => new Date(Date.parse('2026-01-10T10:00:00Z') + s * 1000)
  const m = (id: string, classId: string, name: string, orderIndex: number, created: number) => ({
    id,
    classId,
    orderIndex,
    createdAt: at(created),
    class: { name },
  })
  const sorted = sortByClassOrder([
    m('b2', 'b', 'Biología', 1, 0),
    m('a1', 'a', 'Arte', 0, 5),
    m('b1', 'b', 'Biología', 0, 9),
    m('a0', 'a', 'Arte', 0, 1),
  ])
  expect(sorted.map(x => x.id)).toEqual(['a0', 'a1', 'b1', 'b2'])
})
