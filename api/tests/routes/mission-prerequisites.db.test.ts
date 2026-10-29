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
 *   en todas las vías (listados, detalle, documentos, entregar, pistas, el
 *   asistente, los recordatorios); lo empezado de verdad no se cierra; la
 *   manual va por encima; un requisito caducado o sin enigmas no cierra; al
 *   profesorado (vista previa) no se le cierra nada.
 * - Lo que se enseña de una cerrada: sin su historia, ni para buscar.
 * - Completar: cuentan los enigmas obligatorios (también para lo ya aprobado).
 * - Encadenar en orden, quitar los requisitos, el orden con el mapa apagado y
 *   al encenderlo, y las copias.
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
import { registerNotificationJobs } from '../../src/modules/notifications/notifications.jobs.js'
import { runJobNow } from '../../src/utils/scheduler.js'

registerNotificationJobs()

const HOUR = 3600_000

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
  description: string | null
  status: string
  lockReason: 'teacher' | 'path' | null
  requires: { id: string; title: string; state: 'open' | 'teacher' }[]
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
  async function studentList(url = `/students/classes/${f.classId}/missions`, actor: Actor = 'student') {
    const res = await app.inject({ method: 'GET', url, headers: as(actor) })
    expect(res.statusCode, res.body).toBe(200)
    return new Map(
      (res.json().missions as StudentListed[]).map(m => [m.title, m] as const)
    )
  }

  /** Entrega un enigma (sin fichero), como `actor`. */
  const submit = (enigmaId: string, actor: Actor = 'student') =>
    app.inject({
      method: 'POST',
      url: `/submissions/enigmas/${enigmaId}`,
      headers: { ...as(actor), ...formData({ nota: 'hecho' }).headers },
      payload: formData({ nota: 'hecho' }).payload,
    })

  /** El detalle de una misión, como `actor`. */
  async function detailOf(missionId: string, actor: Actor = 'student') {
    const res = await app.inject({ method: 'GET', url: `/missions/${missionId}`, headers: as(actor) })
    expect(res.statusCode, res.body).toBe(200)
    return res.json().mission
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

  it('cerrada por el camino en todas las vías: listados, detalle, documentos, entregar y pista', async () => {
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
      requires: [{ id: a.id, title: 'A', state: 'open' }],
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
    // La descarga del documento, como cualquier fichero sin acceso: 404, sin decir qué falta.
    for (const download of [
      { method: 'GET' as const, url: `/files/documents/${document}` },
      { method: 'POST' as const, url: `/files/documents/${document}/link` },
    ]) {
      const res = await app.inject({ ...download, headers: as('student') })
      expect(res.statusCode, download.url).toBe(404)
      expect(res.json().code).not.toBe('MISSION_PATH_LOCKED')
      expect(res.body).not.toContain('«')
    }
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

  it('encadenar en orden deja fuera las bloqueadas: cada abierta pide la abierta anterior', async () => {
    const a = await mission('A')
    const borrador = await mission('Borrador', { status: 'bloqueada' })
    const c = await mission('C')
    const d = await mission('D')
    // Lo que pedía el borrador, y lo que lo pedía, se va.
    expect((await setPrerequisites(borrador.id, [a.id])).statusCode).toBe(200)
    expect((await setPrerequisites(c.id, [borrador.id])).statusCode).toBe(200)

    const chained = await app.inject({
      method: 'POST',
      url: `/teacher/classes/${f.classId}/missions/chain`,
      headers: as('owner'),
    })
    expect(chained.statusCode, chained.body).toBe(200)
    expect(chained.json().prerequisites).toEqual({ [c.id]: [a.id], [d.id]: [c.id] })
    expect(await edgesIn()).toEqual(['C<A', 'D<C'])
    // El orden no cambia: el borrador sigue en su sitio.
    expect(await titlesIn()).toEqual(['A', 'Borrador', 'C', 'D'])
    const log = await prisma.classActionLog.findFirstOrThrow({
      where: { classId: f.classId, action: 'mission.chained' },
    })
    expect(log.metadata).toEqual({ count: 3, replaced: 2 })

    // El alumno no tiene el borrador delante de C: C se abre al completar A.
    const listed = await studentList()
    expect(listed.get('C')?.requires.map(r => r.title)).toEqual(['A'])
    expect(listed.get('D')?.requires.map(r => r.title)).toEqual(['C'])

    // Ya encadenadas así: no se apunta otra vez.
    await app.inject({ method: 'POST', url: `/teacher/classes/${f.classId}/missions/chain`, headers: as('owner') })
    expect(await prisma.classActionLog.count({ where: { classId: f.classId, action: 'mission.chained' } })).toBe(1)
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

  // ---- Lo que cuenta como empezada ----

  it('empezar es trabajo de verdad: una fila de progreso vacía no abre nada; un enigma aprobado o completado, sí', async () => {
    const studentId = f.users.student.id
    const a = await mission('A')
    const empty = await mission('Fila vacía')
    const counted = await mission('Con progreso')
    const approved = await mission('Con aprobado', { enigmas: [false, false] })
    await prisma.studentMissionProgress.create({
      data: { studentId, missionId: empty.id, progress: 0, enigmasCompleted: 0 },
    })
    await prisma.studentMissionProgress.create({
      data: { studentId, missionId: counted.id, progress: 50, enigmasCompleted: 1 },
    })
    await prisma.studentEnigmaProgress.create({
      data: { studentId, enigmaId: approved.enigmaIds[0]!, xpEarned: 10, percentage: 100 },
    })
    for (const m of [empty, counted, approved]) {
      expect((await setPrerequisites(m.id, [a.id])).statusCode).toBe(200)
    }

    const list = await studentList()
    expect(list.get('Fila vacía')?.lockReason).toBe('path')
    expect(list.get('Con progreso')?.lockReason).toBeNull()
    expect(list.get('Con aprobado')?.lockReason).toBeNull()
    // Ni entregar en la de la fila vacía.
    expect((await submit(empty.enigmaIds[0]!)).statusCode).toBe(409)

    // La ruta que creaba esa fila vacía ya no existe.
    const start = await app.inject({
      method: 'POST',
      url: `/missions/${empty.id}/start`,
      headers: as('student'),
    })
    expect(start.statusCode).toBe(404)
  })

  // ---- Requisitos que no se pueden cumplir ----

  it('un requisito caducado no cierra (listado, detalle y entrega); alargarle la fecha vuelve a cerrar, salvo a quien ya empezó', async () => {
    const a = await mission('A')
    const b = await mission('B')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    await prisma.mission.update({ where: { id: a.id }, data: { deadline: new Date(Date.now() - HOUR) } })

    const list = await studentList()
    expect(list.get('A')?.status).toBe('expirada')
    expect(list.get('B')).toMatchObject({ status: 'activa', lockReason: null, requires: [] })
    for (const url of ['/students/missions', '/missions']) {
      expect((await studentList(url)).get('B')?.lockReason, url).toBeNull()
    }
    const detail = await detailOf(b.id)
    expect(detail).toMatchObject({ lockReason: null, requires: [] })
    expect(detail.enigmas).toHaveLength(1)
    // El profesorado ve en el editor que lo que pide ha caducado.
    expect((await detailOf(b.id, 'owner')).prerequisites).toEqual([
      { id: a.id, title: 'A', status: 'expirada' },
    ])
    const submitted = await submit(b.enigmaIds[0]!)
    expect(submitted.statusCode, submitted.body).toBe(201)

    // Con la fecha alargada, A vuelve a cerrar B. No a quien ya la ha empezado
    // (acaba de entregar), sí a quien no la ha tocado.
    await prisma.mission.update({ where: { id: a.id }, data: { deadline: new Date(Date.now() + 48 * HOUR) } })
    expect((await studentList()).get('B')?.lockReason).toBeNull()
    await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: f.users.outsider.id } })
    try {
      expect((await studentList(undefined, 'outsider')).get('B')).toMatchObject({
        lockReason: 'path',
        requires: [{ id: a.id, state: 'open' }],
      })
      expect((await submit(b.enigmaIds[0]!, 'outsider')).statusCode).toBe(409)
    } finally {
      await prisma.classEnrollment.deleteMany({
        where: { classId: f.classId, studentId: f.users.outsider.id },
      })
    }
  })

  it('un requisito sin enigmas no cierra; uno bloqueado a mano sí, con su estado, salvo que además haya caducado', async () => {
    const empty = await mission('Vacía', { enigmas: [] })
    const blocked = await mission('Cerrada a mano', { status: 'bloqueada' })
    const b = await mission('Pide la vacía')
    const c = await mission('Pide la cerrada')
    expect((await setPrerequisites(b.id, [empty.id])).statusCode).toBe(200)
    expect((await setPrerequisites(c.id, [blocked.id])).statusCode).toBe(200)

    const list = await studentList()
    expect(list.get('Pide la vacía')).toMatchObject({ lockReason: null, requires: [] })
    // «Ir a «Cerrada a mano»» no llevaría a nada: el requisito dice que lo ha cerrado su docente.
    expect(list.get('Pide la cerrada')).toMatchObject({
      lockReason: 'path',
      requires: [{ id: blocked.id, title: 'Cerrada a mano', state: 'teacher' }],
    })
    for (const url of ['/students/missions', '/missions']) {
      expect((await studentList(url)).get('Pide la cerrada')?.requires, url).toEqual([
        { id: blocked.id, title: 'Cerrada a mano', state: 'teacher' },
      ])
    }
    expect((await detailOf(c.id)).requires).toEqual([
      { id: blocked.id, title: 'Cerrada a mano', state: 'teacher' },
    ])
    expect((await detailOf(c.id, 'owner')).prerequisites).toEqual([
      { id: blocked.id, title: 'Cerrada a mano', status: 'bloqueada' },
    ])

    // Bloqueada y caducada: ya no cierra.
    await prisma.mission.update({ where: { id: blocked.id }, data: { deadline: new Date(Date.now() - HOUR) } })
    expect((await studentList()).get('Pide la cerrada')).toMatchObject({ lockReason: null, requires: [] })
    expect((await detailOf(c.id)).lockReason).toBeNull()
  })

  // ---- Lo que se enseña de una cerrada ----

  it('los listados no enseñan la historia de las cerradas, y buscar por ella no las encuentra', async () => {
    const a = await mission('A')
    const b = await mission('Ruta cerrada')
    const c = await mission('Bloqueada a mano', { status: 'bloqueada' })
    await prisma.mission.updateMany({
      where: { id: { in: [a.id, b.id, c.id] } },
      data: { description: 'El secreto del laberinto' },
    })
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)

    for (const url of [`/students/classes/${f.classId}/missions`, '/students/missions', '/missions']) {
      const list = await studentList(url)
      expect(list.get('A')?.description, url).toBe('El secreto del laberinto')
      expect(list.get('Ruta cerrada')?.description, url).toBeNull()
      expect(list.get('Bloqueada a mano')?.description, url).toBeNull()
    }

    const found = async (search: string) =>
      [...(await studentList(`/missions?search=${encodeURIComponent(search)}`)).keys()].sort()
    expect(await found('laberinto')).toEqual(['A'])
    // Por el título, sí.
    expect(await found('cerrada')).toEqual(['Ruta cerrada'])
    expect(await found('a mano')).toEqual(['Bloqueada a mano'])

    // Abierta la ruta (A completada), su historia ya se ve y se encuentra.
    await approve(a.enigmaIds[0]!)
    expect((await studentList()).get('Ruta cerrada')?.description).toBe('El secreto del laberinto')
    expect(await found('laberinto')).toEqual(['A', 'Ruta cerrada'])
  })

  // ---- El profesorado ----

  it('al profesorado no se le cierra nada: en la vista previa lo ve todo abierto, con su camino, y entrega', async () => {
    const a = await mission('A')
    const b = await mission('B')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    const preview = await app.inject({ method: 'POST', url: '/students/preview/enroll', headers: as('owner') })
    expect(preview.statusCode, preview.body).toBe(200)
    try {
      // Por id: la vista previa mezcla otras clases suyas (las copias de antes también tienen «B»).
      for (const url of [`/students/classes/${f.classId}/missions`, '/students/missions', '/missions']) {
        const res = await app.inject({ method: 'GET', url, headers: as('owner') })
        expect(res.statusCode, res.body).toBe(200)
        expect((res.json().missions as StudentListed[]).find(m => m.id === b.id), url).toMatchObject({
          status: 'activa',
          lockReason: null,
          requires: [],
          prerequisiteIds: [a.id],
        })
      }
      const submitted = await submit(b.enigmaIds[0]!, 'owner')
      expect(submitted.statusCode, submitted.body).toBe(201)
    } finally {
      await prisma.enigmaSubmission.deleteMany({ where: { studentId: f.users.owner.id } })
      await prisma.activity.deleteMany({ where: { userId: f.users.owner.id } })
      await prisma.classEnrollment.deleteMany({ where: { studentId: f.users.owner.id } })
    }
  })

  // ---- Recordatorios ----

  it('recordatorios: a quien la tiene cerrada por el camino no se le avisa; al completar lo que pide, sí', async () => {
    const studentId = f.users.student.id
    const a = await mission('A')
    const b = await mission('B')
    await prisma.mission.updateMany({
      where: { id: { in: [a.id, b.id] } },
      data: { deadline: new Date(Date.now() + 10 * HOUR) },
    })
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    const reminded = async () =>
      (
        await prisma.notification.findMany({
          where: { userId: studentId, type: 'deadline_reminder' },
          select: { metadata: true },
        })
      )
        .map(n => (n.metadata as { missionId: string }).missionId)
        .filter(id => id === a.id || id === b.id)
        .sort()
    try {
      await runJobNow('deadline-reminders')
      expect(await reminded()).toEqual([a.id])

      await approve(a.enigmaIds[0]!)
      await runJobNow('deadline-reminders')
      expect(await reminded()).toEqual([a.id, b.id].sort())
    } finally {
      await prisma.notification.deleteMany({ where: { userId: studentId } })
    }
  })

  // ---- Mover y editar ----

  it('mover una misión exige edición en las dos clases', async () => {
    const m = await mission('Viajera')
    // El propietario de la clase entra en la otra solo con lectura.
    await prisma.classTeacher.create({
      data: { classId: f.otherClassId, userId: f.users.owner.id, access: 'read', profile: 'practicas' },
    })
    const move = () =>
      app.inject({
        method: 'PATCH',
        url: `/missions/${m.id}`,
        headers: as('owner'),
        payload: { classId: f.otherClassId },
      })
    try {
      expect((await move()).statusCode).toBe(403)
      expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).classId).toBe(f.classId)

      await prisma.classTeacher.update({
        where: { classId_userId: { classId: f.otherClassId, userId: f.users.owner.id } },
        data: { access: 'edit' },
      })
      const moved = await move()
      expect(moved.statusCode, moved.body).toBe(200)
      expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).classId).toBe(f.otherClassId)
    } finally {
      await prisma.classTeacher.deleteMany({
        where: { classId: f.otherClassId, userId: f.users.owner.id },
      })
    }
  })

  it('editar una misión que se va a otra clase mientras espera el cerrojo: 404, sin tocarla', async () => {
    const m = await mission('Viajera')

    let locked!: () => void
    let release!: () => void
    const isLocked = new Promise<void>(resolve => (locked = resolve))
    const held = new Promise<void>(resolve => (release = resolve))
    const holder = prisma.$transaction(
      async tx => {
        await tx.$queryRaw`SELECT id FROM classes WHERE id = ${f.classId} FOR NO KEY UPDATE`
        locked()
        await held
        // Otra persona se la lleva a la otra clase antes de soltar el cerrojo.
        await tx.mission.update({ where: { id: m.id }, data: { classId: f.otherClassId } })
      },
      { timeout: 15000 }
    )
    await isLocked
    const edit = app.inject({
      method: 'PATCH',
      url: `/missions/${m.id}`,
      headers: as('owner'),
      payload: { title: 'Cambiada' },
    })
    await waitUntil(async () => (await pathLockWaits()) >= 1, 'la edición espera al cerrojo')
    release()
    await holder

    const res = await edit
    expect(res.statusCode, res.body).toBe(404)
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({
      classId: f.otherClassId,
      title: 'Viajera',
    })
  })

  // ---- El orden con el mapa apagado ----

  it('con el mapa apagado, reordenar no mira el camino; al encenderlo se recoloca lo justo', async () => {
    const a = await mission('A')
    const b = await mission('B')
    const c = await mission('C')
    expect((await setPrerequisites(b.id, [a.id])).statusCode).toBe(200)
    await mapOn(false)

    const order = (ids: string[]) =>
      app.inject({
        method: 'PUT',
        url: `/teacher/classes/${f.classId}/missions/order`,
        headers: as('owner'),
        payload: { ids },
      })
    const reordered = await order([b.id, c.id, a.id])
    expect(reordered.statusCode, reordered.body).toBe(200)
    expect(await titlesIn()).toEqual(['B', 'C', 'A'])
    // Guardar requisitos tampoco mueve nada con el mapa apagado.
    const saved = await setPrerequisites(c.id, [a.id])
    expect(saved.statusCode, saved.body).toBe(200)
    expect(saved.json().moved).toBe(0)
    expect(await titlesIn()).toEqual(['B', 'C', 'A'])

    const turnOn = () =>
      app.inject({
        method: 'PUT',
        url: `/teacher/classes/${f.classId}`,
        headers: as('owner'),
        payload: { settings: { missionMap: true } },
      })
    const on = await turnOn()
    expect(on.statusCode, on.body).toBe(200)
    expect(on.json().class.settings.missionMap).toBe(true)
    expect(await titlesIn()).toEqual(['A', 'B', 'C'])
    const logs = await prisma.classActionLog.findMany({
      where: { classId: f.classId, action: 'mission.reordered' },
      orderBy: { createdAt: 'asc' },
    })
    expect(logs.map(l => l.metadata)).toEqual([
      { count: 3, moved: 3 },
      { count: 3, moved: 3 },
    ])

    // Ya en orden, encenderlo otra vez no escribe ni apunta nada; y con el mapa
    // encendido, reordenar contra el camino vuelve a rechazarse.
    expect((await turnOn()).statusCode).toBe(200)
    expect(
      await prisma.classActionLog.count({ where: { classId: f.classId, action: 'mission.reordered' } })
    ).toBe(2)
    const broken = await order([b.id, a.id, c.id])
    expect(broken.statusCode).toBe(409)
    expect(broken.json().code).toBe('MISSION_ORDER_BREAKS_PATH')
  })
})
