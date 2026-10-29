import { it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * El camino del mapa de misiones (E3, entrega 3): lo que pide cada misión para
 * abrirse y el cierre por estudiante que sale de ahí.
 *
 * - Guardar requisitos: como mucho tres, solo de su clase, nunca ella misma,
 *   sin ciclos (tampoco con dos guardados a la vez), y la misión se recoloca
 *   detrás de lo que pide; reordenar no la pone delante.
 * - El cierre: solo con el mapa encendido, por estudiante, calculado al leer,
 *   en todas las vías (listados, detalle, documentos, entregar, pistas,
 *   empezar, el asistente); lo empezado no se cierra; la manual va por encima.
 * - Completar: cuentan los enigmas obligatorios (también para lo ya aprobado).
 * - Encadenar en orden, quitar los requisitos y las copias.
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
import { submissionsRoutes } from '../../src/modules/submissions/submissions.routes.js'
import { filesRoutes } from '../../src/modules/files/files.routes.js'
import { submissionsService } from '../../src/modules/submissions/submissions.service.js'
import { StudentAgent } from '../../src/modules/ai/agents/student-agent.js'
import { TeacherAgent } from '../../src/modules/ai/agents/teacher-agent.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

/** Espera a que se cumpla `condition`, o falla a los cinco segundos. */
async function waitUntil(condition: () => Promise<boolean>, what: string) {
  const until = Date.now() + 5000
  while (!(await condition())) {
    if (Date.now() > until) throw new Error(`No ha llegado a pasar: ${what}`)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

/** Peticiones que esperan a que se suelte el cerrojo del camino de una clase. */
async function pathLockWaits() {
  const [row] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock'
      AND query ILIKE '%FROM classes%' AND query ILIKE '%FOR NO KEY UPDATE%'`
  return row!.n
}

/** Cuerpo multipart con solo campos de texto (una entrega sin fichero). */
function formData(fields: Record<string, string>) {
  const boundary = '----camino'
  const body =
    Object.entries(fields)
      .map(
        ([k, v]) => `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
      )
      .join('') + `--${boundary}--\r\n`
  return { payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

type Actor = 'owner' | 'other' | 'student' | 'outsider'

interface StudentListed {
  id: string
  title: string
  status: string
  lockReason: 'teacher' | 'path' | null
  requires: { id: string; title: string }[]
  prerequisiteIds: string[]
}

describeWithDatabase('camino del mapa de misiones: requisitos y cierre por estudiante', () => {
  let app: FastifyInstance
  let f: ClassFixture

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(submissionsRoutes, { prefix: '/submissions' })
      await instance.register(filesRoutes, { prefix: '/files' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  beforeEach(async () => {
    await prisma.activity.deleteMany({ where: { userId: f.users.student.id } })
    await prisma.mission.deleteMany({ where: { classId: { in: [f.classId, f.otherClassId] } } })
    await prisma.classActionLog.deleteMany({ where: { classId: { in: [f.classId, f.otherClassId] } } })
    await mapOn(true)
  })

  const as = (actor: Actor) => ({ authorization: `Bearer ${f.token(actor)}` })

  /** Enciende o apaga el mapa en la clase. */
  async function mapOn(value: boolean, classId = f.classId) {
    await prisma.class.update({ where: { id: classId }, data: { settings: { missionMap: value } } })
  }

  /** Una misión con sus enigmas (`true` = opcional), en la posición que se diga. */
  async function mission(
    title: string,
    {
      classId = f.classId,
      orderIndex,
      enigmas = [false],
      status = 'activa' as 'activa' | 'bloqueada',
    }: { classId?: string; orderIndex?: number; enigmas?: boolean[]; status?: 'activa' | 'bloqueada' } = {}
  ) {
    const position =
      orderIndex ?? (await prisma.mission.count({ where: { classId } }))
    const created = await prisma.mission.create({
      data: { classId, title, orderIndex: position, status },
    })
    const enigmaIds: string[] = []
    for (const [index, isOptional] of enigmas.entries()) {
      enigmaIds.push(
        (
          await prisma.missionEnigma.create({
            data: { missionId: created.id, title: `${title} ${index + 1}`, xpReward: 10, isOptional, orderIndex: index },
          })
        ).id
      )
    }
    return { id: created.id, enigmaIds }
  }

  const setPrerequisites = (missionId: string, ids: string[], actor: Actor = 'owner') =>
    app.inject({
      method: 'PUT',
      url: `/missions/${missionId}/prerequisites`,
      headers: as(actor),
      payload: { ids },
    })

  const edgesIn = async (classId = f.classId) =>
    (
      await prisma.missionPrerequisite.findMany({
        where: { mission: { classId } },
        select: { mission: { select: { title: true } }, requiredMission: { select: { title: true } } },
      })
    )
      .map(e => `${e.mission.title}<${e.requiredMission.title}`)
      .sort()

  const titlesIn = async (classId = f.classId) =>
    (
      await prisma.mission.findMany({
        where: { classId },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: { title: true },
      })
    ).map(m => m.title)

  /** El listado de la clase que ve el alumno, por título. */
  async function studentList(url = `/students/classes/${f.classId}/missions`) {
    const res = await app.inject({ method: 'GET', url, headers: as('student') })
    expect(res.statusCode, res.body).toBe(200)
    return new Map(
      (res.json().missions as StudentListed[]).map(m => [m.title, m] as const)
    )
  }

  /** Entrega y aprueba (100 %) un enigma para el alumno. */
  async function approve(enigmaId: string) {
    const submission = await prisma.enigmaSubmission.create({
      data: { enigmaId, studentId: f.users.student.id },
    })
    await submissionsService.approveSubmission(f.users.owner.id, submission.id, { percentage: 100 })
  }

  // ---- Guardar requisitos ----

  it('guarda lo que pide, en el orden de la clase, y lo apunta en el historial sin nombres', async () => {
    const a = await mission('A')
    const b = await mission('B')
    const c = await mission('C')

    const res = await setPrerequisites(c.id, [b.id, a.id])
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().prerequisites.map((m: { title: string }) => m.title)).toEqual(['A', 'B'])
    expect(await edgesIn()).toEqual(['C<A', 'C<B'])

    const log = await prisma.classActionLog.findFirstOrThrow({
      where: { classId: f.classId, action: 'mission.updated', entityId: c.id },
    })
    expect(log.metadata).toEqual({ title: 'C', fields: ['prerequisites'], count: 2, moved: 0 })

    // Guardar lo mismo no escribe ni apunta nada.
    expect((await setPrerequisites(c.id, [a.id, b.id])).statusCode).toBe(200)
    expect(
      await prisma.classActionLog.count({ where: { classId: f.classId, action: 'mission.updated' } })
    ).toBe(1)

    // Y vaciarlo lo quita todo.
    expect((await setPrerequisites(c.id, [])).statusCode).toBe(200)
    expect(await edgesIn()).toEqual([])
  })

  it('si iba delante de lo que pide, se recoloca detrás, y con ella lo que la pide a ella', async () => {
    const m = await mission('M')
    const x = await mission('X')
    await mission('Y')
    const a = await mission('A')
    expect((await setPrerequisites(x.id, [m.id])).statusCode).toBe(200)
    expect(await titlesIn()).toEqual(['M', 'X', 'Y', 'A'])

    const res = await setPrerequisites(m.id, [a.id])
    expect(res.statusCode, res.body).toBe(200)
    expect(await titlesIn()).toEqual(['Y', 'A', 'M', 'X'])
    expect(res.json().order).toEqual(
      (await prisma.mission.findMany({ where: { classId: f.classId }, orderBy: { orderIndex: 'asc' } })).map(
        r => r.id
      )
    )
    expect(
      (
        await prisma.mission.findMany({ where: { classId: f.classId }, orderBy: { orderIndex: 'asc' } })
      ).map(r => r.orderIndex)
    ).toEqual([0, 1, 2, 3])
  })

  it('como mucho tres, solo de su clase y nunca ella misma', async () => {
    const target = await mission('Destino', { orderIndex: 9 })
    const four = [await mission('1'), await mission('2'), await mission('3'), await mission('4')]
    const tooMany = await setPrerequisites(target.id, four.map(m => m.id))
    expect(tooMany.statusCode).toBe(400)
    expect(tooMany.json().code).toBe('MISSION_PREREQUISITE_LIMIT')

    const elsewhere = await mission('Fuera', { classId: f.otherClassId })
    const foreign = await setPrerequisites(target.id, [elsewhere.id])
    expect(foreign.statusCode).toBe(400)
    expect(foreign.json().code).toBe('MISSION_PREREQUISITE_INVALID')

    const self = await setPrerequisites(target.id, [target.id])
    expect(self.statusCode).toBe(400)
    expect(self.json().code).toBe('MISSION_PREREQUISITE_SELF')

    expect((await setPrerequisites(target.id, four.slice(0, 3).map(m => m.id))).statusCode).toBe(200)
    expect(await edgesIn()).toHaveLength(3)
  })

  it('solo con edición en la clase: otro profesor no la encuentra y el alumnado no puede', async () => {
    const a = await mission('A')
    const b = await mission('B')
    expect((await setPrerequisites(b.id, [a.id], 'other')).statusCode).toBe(404)
    expect((await setPrerequisites(b.id, [a.id], 'student')).statusCode).toBe(403)
    expect(await edgesIn()).toEqual([])
  })

  it('sin ciclos: ni directo ni indirecto', async () => {
    const a = await mission('A')
    const b = await mission('B')
    const c = await mission('C')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    expect((await setPrerequisites(c.id, [b.id])).statusCode).toBe(200)

    const direct = await setPrerequisites(a.id, [b.id])
    expect(direct.statusCode).toBe(409)
    expect(direct.json().code).toBe('MISSION_PREREQUISITE_CYCLE')
    const indirect = await setPrerequisites(a.id, [c.id])
    expect(indirect.statusCode).toBe(409)
    expect(indirect.json().code).toBe('MISSION_PREREQUISITE_CYCLE')
    expect(await edgesIn()).toEqual(['B<A', 'C<B'])
  })

  it('dos guardados a la vez («A pide B» y «B pide A») no cierran un ciclo: el segundo ve al primero', async () => {
    const a = await mission('A')
    const b = await mission('B')

    // Se retiene el cerrojo del camino hasta que los dos guardados esperan.
    let locked!: () => void
    let release!: () => void
    const isLocked = new Promise<void>(resolve => (locked = resolve))
    const held = new Promise<void>(resolve => (release = resolve))
    const holder = prisma.$transaction(
      async tx => {
        await tx.$queryRaw`SELECT id FROM classes WHERE id = ${f.classId} FOR NO KEY UPDATE`
        locked()
        await held
      },
      { timeout: 15000 }
    )
    await isLocked
    const first = setPrerequisites(a.id, [b.id])
    const second = setPrerequisites(b.id, [a.id])
    await waitUntil(async () => (await pathLockWaits()) >= 2, 'los dos guardados esperan al cerrojo')
    release()
    await holder

    const codes = (await Promise.all([first, second])).map(r => r.statusCode).sort()
    expect(codes).toEqual([200, 409])
    expect(await edgesIn()).toHaveLength(1)
  })

  it('reordenar no pone una misión delante de lo que pide', async () => {
    const a = await mission('A')
    const b = await mission('B')
    const c = await mission('C')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)

    const broken = await app.inject({
      method: 'PUT',
      url: `/teacher/classes/${f.classId}/missions/order`,
      headers: as('owner'),
      payload: { ids: [b.id, a.id, c.id] },
    })
    expect(broken.statusCode).toBe(409)
    expect(broken.json().code).toBe('MISSION_ORDER_BREAKS_PATH')
    expect(broken.json().message).toContain('«B»')
    expect(await titlesIn()).toEqual(['A', 'B', 'C'])

    const fine = await app.inject({
      method: 'PUT',
      url: `/teacher/classes/${f.classId}/missions/order`,
      headers: as('owner'),
      payload: { ids: [c.id, a.id, b.id] },
    })
    expect(fine.statusCode, fine.body).toBe(200)
    expect(await titlesIn()).toEqual(['C', 'A', 'B'])
  })

  // ---- El cierre por estudiante ----

  it('cerrada por el camino en todas las vías: listados, detalle, documentos, entregar, pista y empezar', async () => {
    const a = await mission('A')
    const b = await mission('B')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    const document = await f.newDocument(b.id)
    const hint = await f.newHint(b.id)

    const list = await studentList()
    expect(list.get('A')).toMatchObject({ status: 'activa', lockReason: null, requires: [], prerequisiteIds: [] })
    expect(list.get('B')).toMatchObject({
      status: 'bloqueada',
      lockReason: 'path',
      requires: [{ id: a.id, title: 'A' }],
      prerequisiteIds: [a.id],
    })
    // Los listados que mezclan clases, igual.
    for (const url of ['/students/missions', '/missions']) {
      expect((await studentList(url)).get('B')).toMatchObject({ lockReason: 'path', requires: [{ id: a.id }] })
    }

    // El detalle: existe, dice qué falta y no enseña lo de dentro.
    const detail = await app.inject({ method: 'GET', url: `/missions/${b.id}`, headers: as('student') })
    expect(detail.statusCode, detail.body).toBe(200)
    expect(detail.json().mission).toMatchObject({
      status: 'bloqueada',
      lockReason: 'path',
      requires: [{ id: a.id, title: 'A' }],
      description: null,
      enigmas: [],
      documents: [],
      hints: [],
    })

    const locked = (res: { statusCode: number; json: () => { code?: string } }) => {
      expect(res.statusCode).toBe(409)
      expect(res.json().code).toBe('MISSION_PATH_LOCKED')
    }
    locked(await app.inject({ method: 'GET', url: `/missions/${b.id}/documents`, headers: as('student') }))
    locked(await app.inject({ method: 'GET', url: `/files/documents/${document}`, headers: as('student') }))
    locked(
      await app.inject({
        method: 'POST',
        url: `/submissions/enigmas/${b.enigmaIds[0]}`,
        headers: { ...as('student'), ...formData({ nota: 'hecho' }).headers },
        payload: formData({ nota: 'hecho' }).payload,
      })
    )
    locked(
      await app.inject({
        method: 'POST',
        url: `/missions/${b.id}/hints/${hint}/use`,
        headers: as('student'),
        payload: {},
      })
    )
    locked(await app.inject({ method: 'POST', url: `/missions/${b.id}/start`, headers: as('student') }))
    expect(await prisma.enigmaSubmission.count({ where: { enigmaId: b.enigmaIds[0] } })).toBe(0)
    expect(await prisma.missionHintUse.count({ where: { missionId: b.id } })).toBe(0)

    // A sí se abre y se entrega.
    const submitted = await app.inject({
      method: 'POST',
      url: `/submissions/enigmas/${a.enigmaIds[0]}`,
      headers: { ...as('student'), ...formData({ nota: 'hecho' }).headers },
      payload: formData({ nota: 'hecho' }).payload,
    })
    expect(submitted.statusCode, submitted.body).toBe(201)
  })

  it('completar lo que pide la abre; los enigmas opcionales no hacen falta', async () => {
    // A: un obligatorio y un opcional. Aprobar el obligatorio la completa.
    const a = await mission('A', { enigmas: [false, true] })
    const b = await mission('B')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    expect((await studentList()).get('B')?.lockReason).toBe('path')

    await approve(a.enigmaIds[0]!)
    const progress = await prisma.studentMissionProgress.findUniqueOrThrow({
      where: { studentId_missionId: { studentId: f.users.student.id, missionId: a.id } },
    })
    expect(progress.completedAt).not.toBeNull()
    expect(progress.progress).toBe(50)
    // Con el bonus de completarla y su actividad, una sola vez.
    expect(
      await prisma.activity.count({ where: { userId: f.users.student.id, type: 'mission_completed' } })
    ).toBe(1)

    const after = (await studentList()).get('B')!
    expect(after).toMatchObject({ status: 'activa', lockReason: null, requires: [] })
    const detail = await app.inject({ method: 'GET', url: `/missions/${b.id}`, headers: as('student') })
    expect(detail.json().mission.enigmas).toHaveLength(1)

    // Aprobar luego el opcional no la vuelve a completar (ni a premiar).
    await approve(a.enigmaIds[1]!)
    expect(
      await prisma.activity.count({ where: { userId: f.users.student.id, type: 'mission_completed' } })
    ).toBe(1)
  })

  it('una misión de solo opcionales se completa con el primero', async () => {
    const a = await mission('Solo opcionales', { enigmas: [true, true] })
    await approve(a.enigmaIds[1]!)
    const progress = await prisma.studentMissionProgress.findUniqueOrThrow({
      where: { studentId_missionId: { studentId: f.users.student.id, missionId: a.id } },
    })
    expect(progress.completedAt).not.toBeNull()
  })

  it('lo aprobado antes de la regla nueva (obligatorios hechos, sin completar) ya cuenta como hecho', async () => {
    const a = await mission('A', { enigmas: [false, true] })
    const b = await mission('B')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    // Como quedó con la regla de antes: el obligatorio aprobado y la misión sin completedAt.
    await prisma.studentEnigmaProgress.create({
      data: { studentId: f.users.student.id, enigmaId: a.enigmaIds[0]!, xpEarned: 10, percentage: 100 },
    })
    await prisma.studentMissionProgress.create({
      data: { studentId: f.users.student.id, missionId: a.id, enigmasCompleted: 1, progress: 50 },
    })
    expect((await studentList()).get('B')).toMatchObject({ lockReason: null })
    // No se recalcula: A sigue sin completedAt.
    const progress = await prisma.studentMissionProgress.findUniqueOrThrow({
      where: { studentId_missionId: { studentId: f.users.student.id, missionId: a.id } },
    })
    expect(progress.completedAt).toBeNull()
  })

  it('lo empezado no se cierra: con una entrega o una pista usada antes del requisito, sigue abierta', async () => {
    const a = await mission('A')
    const withSubmission = await mission('Con entrega')
    const withHint = await mission('Con pista')
    const untouched = await mission('Sin empezar')
    await prisma.enigmaSubmission.create({
      data: { enigmaId: withSubmission.enigmaIds[0]!, studentId: f.users.student.id },
    })
    const hint = await f.newHint(withHint.id)
    await prisma.missionHintUse.create({
      data: { hintId: hint, missionId: withHint.id, studentId: f.users.student.id, costType: 'coins', cost: 0 },
    })
    for (const m of [withSubmission, withHint, untouched]) {
      expect((await setPrerequisites(m.id, [a.id])).statusCode).toBe(200)
    }

    const list = await studentList()
    expect(list.get('Con entrega')?.lockReason).toBeNull()
    expect(list.get('Con pista')?.lockReason).toBeNull()
    expect(list.get('Sin empezar')?.lockReason).toBe('path')
    const detail = await app.inject({
      method: 'GET',
      url: `/missions/${withSubmission.id}`,
      headers: as('student'),
    })
    expect(detail.json().mission.lockReason).toBeNull()
  })

  it('con el mapa apagado no cierra nada (y los requisitos se conservan)', async () => {
    const a = await mission('A')
    const b = await mission('B')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    await mapOn(false)

    expect((await studentList()).get('B')).toMatchObject({
      status: 'activa',
      lockReason: null,
      requires: [],
      prerequisiteIds: [],
    })
    const submitted = await app.inject({
      method: 'POST',
      url: `/submissions/enigmas/${b.enigmaIds[0]}`,
      headers: { ...as('student'), ...formData({ nota: 'hecho' }).headers },
      payload: formData({ nota: 'hecho' }).payload,
    })
    expect(submitted.statusCode, submitted.body).toBe(201)
    expect(await edgesIn()).toEqual(['B<A'])
  })

  it('la bloqueada por su docente va por encima: cerrada para toda la clase (404 al abrirla)', async () => {
    const a = await mission('A')
    const b = await mission('B', { status: 'bloqueada' })
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    expect((await studentList()).get('B')).toMatchObject({
      status: 'bloqueada',
      lockReason: 'teacher',
      requires: [],
    })
    expect(
      (await app.inject({ method: 'GET', url: `/missions/${b.id}`, headers: as('student') })).statusCode
    ).toBe(404)
  })

  it('el profesorado la ve entera, con lo que pide, y su listado lleva lo que pide cada una', async () => {
    const a = await mission('A')
    const b = await mission('B')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)

    const detail = await app.inject({ method: 'GET', url: `/missions/${b.id}`, headers: as('owner') })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().mission).toMatchObject({
      lockReason: null,
      prerequisites: [{ id: a.id, title: 'A' }],
    })
    expect(detail.json().mission.enigmas).toHaveLength(1)

    const list = await app.inject({
      method: 'GET',
      url: `/teacher/classes/${f.classId}/missions`,
      headers: as('owner'),
    })
    const byTitle = new Map(
      (list.json().missions as { title: string; prerequisiteIds: string[] }[]).map(m => [m.title, m])
    )
    expect(byTitle.get('A')?.prerequisiteIds).toEqual([])
    expect(byTitle.get('B')?.prerequisiteIds).toEqual([a.id])
  })

  it('encadenar en orden: cada misión pide la anterior; quitar los requisitos lo deja sin camino', async () => {
    const a = await mission('A')
    const b = await mission('B')
    const c = await mission('C')
    expect((await setPrerequisites(c.id, [a.id])).statusCode).toBe(200)

    const chained = await app.inject({
      method: 'POST',
      url: `/teacher/classes/${f.classId}/missions/chain`,
      headers: as('owner'),
    })
    expect(chained.statusCode, chained.body).toBe(200)
    expect(chained.json().prerequisites).toEqual({ [b.id]: [a.id], [c.id]: [b.id] })
    expect(await edgesIn()).toEqual(['B<A', 'C<B'])
    const log = await prisma.classActionLog.findFirstOrThrow({
      where: { classId: f.classId, action: 'mission.chained' },
    })
    expect(log.metadata).toEqual({ count: 3, replaced: 1 })

    // Ya encadenadas: no se apunta otra vez.
    await app.inject({ method: 'POST', url: `/teacher/classes/${f.classId}/missions/chain`, headers: as('owner') })
    expect(await prisma.classActionLog.count({ where: { classId: f.classId, action: 'mission.chained' } })).toBe(1)

    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/teacher/classes/${f.classId}/missions/chain`,
          headers: as('other'),
        })
      ).statusCode
    ).toBe(404)

    const cleared = await app.inject({
      method: 'DELETE',
      url: `/teacher/classes/${f.classId}/missions/prerequisites`,
      headers: as('owner'),
    })
    expect(cleared.statusCode, cleared.body).toBe(200)
    expect(cleared.json().removed).toBe(2)
    expect(await edgesIn()).toEqual([])
    expect(
      await prisma.classActionLog.count({
        where: { classId: f.classId, action: 'mission.prerequisites_cleared' },
      })
    ).toBe(1)
  })

  // ---- Copias ----

  it('duplicar la clase e importar una plantilla copian el camino; importar una suelta llega sin requisitos', async () => {
    const a = await mission('A')
    const b = await mission('B')
    const c = await mission('C')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    expect((await setPrerequisites(c.id, [a.id, b.id])).statusCode).toBe(200)

    const duplicated = await app.inject({
      method: 'POST',
      url: `/teacher/classes/${f.classId}/duplicate`,
      headers: as('owner'),
      payload: {},
    })
    expect(duplicated.statusCode, duplicated.body).toBe(200)
    const copyId: string = duplicated.json().class.id
    expect(await edgesIn(copyId)).toEqual(['B<A', 'C<A', 'C<B'])
    expect(await titlesIn(copyId)).toEqual(['A', 'B', 'C'])
    // Entre las misiones nuevas, no con las del origen.
    const crossing = await prisma.missionPrerequisite.count({
      where: { mission: { classId: copyId }, requiredMission: { classId: { not: copyId } } },
    })
    expect(crossing).toBe(0)

    // La misma clase como plantilla: quien la importa con misiones se lleva el camino.
    await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: true } })
    try {
      const imported = await app.inject({
        method: 'POST',
        url: `/teacher/templates/${f.classId}/import`,
        headers: as('other'),
        payload: { missions: true },
      })
      expect(imported.statusCode, imported.body).toBe(200)
      expect(await edgesIn(imported.json().class.id)).toEqual(['B<A', 'C<A', 'C<B'])
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: false } })
    }

    // Una misión suelta a otra clase: sin requisitos (los suyos eran de la de origen).
    const target = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `Destino ${randomUUID().slice(0, 4)}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    const single = await app.inject({
      method: 'POST',
      url: `/teacher/missions/${c.id}/import`,
      headers: as('owner'),
      payload: { targetClassId: target.id },
    })
    expect(single.statusCode, single.body).toBe(201)
    expect(await edgesIn(target.id)).toEqual([])
    expect(await edgesIn()).toEqual(['B<A', 'C<A', 'C<B'])
  })

  it('mover una misión a otra clase la deja sin requisitos y nadie de su clase de origen la pide', async () => {
    const a = await mission('A')
    const b = await mission('B')
    const c = await mission('C')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    expect((await setPrerequisites(c.id, [b.id])).statusCode).toBe(200)

    const target = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `Destino ${randomUUID().slice(0, 4)}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    const moved = await app.inject({
      method: 'PATCH',
      url: `/missions/${b.id}`,
      headers: as('owner'),
      payload: { classId: target.id },
    })
    expect(moved.statusCode, moved.body).toBe(200)
    expect(await edgesIn()).toEqual([])
    expect(await edgesIn(target.id)).toEqual([])
    expect(
      await prisma.missionPrerequisite.count({
        where: { OR: [{ missionId: b.id }, { requiredMissionId: b.id }] },
      })
    ).toBe(0)
    // C ya no pide nada: se abre para todo el alumnado.
    expect((await studentList()).get('C')?.lockReason).toBeNull()
    void c
  })

  it('borrar una misión borra lo que pedía y lo que la pedía', async () => {
    const a = await mission('A')
    const b = await mission('B')
    const c = await mission('C')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    expect((await setPrerequisites(c.id, [b.id])).statusCode).toBe(200)
    await prisma.mission.delete({ where: { id: b.id } })
    expect(await edgesIn()).toEqual([])
  })

  // ---- El asistente ----

  it('el asistente sabe qué está cerrado por el camino y qué lo abre', async () => {
    const a = await mission('Primera parada')
    const b = await mission('Segunda parada')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)

    const student = new StudentAgent({} as never, 'student')
    const build = (agent: unknown, context: Record<string, unknown>) =>
      (agent as { buildPrompt: (c: unknown) => Promise<string> }).buildPrompt({
        assistantId: 'default',
        message: 'hola',
        locale: 'es',
        ...context,
      })
    const studentPrompt = await build(student, { userId: f.users.student.id, role: 'student' })
    const available = studentPrompt.split('\n').find(l => l.startsWith('Misiones disponibles: '))!
    expect(available).toContain('Primera parada')
    expect(available).not.toContain('Segunda parada')
    expect(studentPrompt).toContain('Segunda parada en ')
    expect(studentPrompt).toContain('se abre al completar «Primera parada»')

    // Sobre la cerrada, solo qué la abre, sin sus enigmas.
    const onLocked = await build(student, {
      userId: f.users.student.id,
      role: 'student',
      missionId: b.id,
    })
    expect(onLocked).toContain('closed by the mission map path')
    expect(onLocked).not.toContain('Segunda parada 1')

    const teacher = new TeacherAgent({} as never, 'teacher')
    const teacherPrompt = await build(teacher, {
      userId: f.users.owner.id,
      role: 'teacher',
      missionId: b.id,
    })
    expect(teacherPrompt).toContain('Opens for each student after completing: «Primera parada»')
    expect(teacherPrompt).toContain('se abre al completar «Primera parada»')
  })
})
