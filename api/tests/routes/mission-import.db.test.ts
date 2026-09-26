import { it, expect, vi, beforeAll, afterAll, beforeEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Importar una misión de otra clase: una copia independiente en la clase de
 * destino, con sus enigmas, sus documentos (que comparten fichero con el
 * origen) y su insignia, copiada como insignia nueva de quien importa. Llega
 * bloqueada y sin fecha límite, sin progreso ni entregas, y el origen no cambia.
 * Basta con ver la misión de origen; en el destino hace falta editar misiones.
 * Queda en el registro de las dos clases.
 *
 * Duplicar una clase usa la misma copia de misión y sigue como siempre: estado y
 * fecha límite tal cual, sin documentos ni insignia.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Escribe un fichero de verdad en
 * `uploads/documents/`, que borra al acabar; el borrado de ficheros se simula
 * para ver cuándo se pide.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  deleteUpload: vi.fn(async () => {}),
}))

/**
 * El registro de la clase va siempre dentro de la transacción de la acción, así
 * que sirve para tocarla por dentro: hacer que falle una acción (para ver que la
 * importación no deja nada a medias) o retenerla hasta que la prueba la suelte
 * (para cruzar a propósito dos operaciones que van a la vez).
 */
const log = vi.hoisted(() => ({
  /** Acciones cuyo apunte falla. */
  failing: new Set<string>(),
  /** Acciones cuyo apunte espera a `gate`, con su transacción abierta. */
  held: new Set<string>(),
  gate: Promise.resolve(),
  /** Apuntes retenidos que han llegado a `gate`. */
  arrived: 0,
}))

vi.mock('../../src/utils/class-access.js', async importOriginal => {
  const original = await importOriginal<typeof import('../../src/utils/class-access.js')>()
  return {
    ...original,
    recordClassAction: async (...args: Parameters<typeof original.recordClassAction>) => {
      const { action } = args[1]
      if (log.failing.has(action)) throw new Error(`Fallo simulado al apuntar ${action}`)
      if (log.held.has(action)) {
        log.arrived++
        await log.gate
      }
      return original.recordClassAction(...args)
    },
  }
})

import {
  buildApp,
  createClassFixture,
  prisma,
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { filesRoutes } from '../../src/modules/files/files.routes.js'
import { deleteUpload } from '../../src/modules/storage/storage.service.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { deleteUserAccount } from '../../src/modules/profile/account-deletion.service.js'

const UPLOADS_ROOT = join(process.cwd(), 'uploads')
const DEADLINE = new Date('2031-05-20T10:00:00.000Z')
const COVER = '/uploads/covers/mision-origen.png'
const BADGE_IMAGE = '/uploads/badges/insignia-origen.png'
const LINK = 'https://example.invalid/lectura'

/** Retiene los apuntes de `actions` hasta llamar a la función que devuelve. */
function holdLog(...actions: string[]) {
  let open!: () => void
  log.gate = new Promise<void>(resolve => {
    open = resolve
  })
  log.arrived = 0
  for (const action of actions) log.held.add(action)
  return () => {
    log.held.clear()
    open()
  }
}

/** Espera a que se cumpla `condition`, o falla a los cinco segundos. */
async function waitUntil(condition: () => boolean | Promise<boolean>, what: string) {
  const until = Date.now() + 5000
  while (!(await condition())) {
    if (Date.now() > until) throw new Error(`No ha llegado a pasar: ${what}`)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

/** Consultas sobre documentos de misión que están esperando a que se suelte un bloqueo. */
async function documentLockWaits() {
  const [row] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock'
      AND query ILIKE '%mission_documents%'`
  return row.n
}

describeWithDatabase('importar una misión de otra clase', () => {
  let app: FastifyInstance
  let f: ClassFixture
  /** Clase del propietario de la que salen las misiones; se importan a `f.classId`. */
  let sourceClassId: string
  const written: string[] = []

  const send = (
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    actor?: Actor,
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: actor ? { authorization: `Bearer ${f.token(actor)}` } : {},
    })

  const importMission = (missionId: string, actor: Actor | undefined, payload: object) =>
    send('POST', `/teacher/missions/${missionId}/import`, actor, payload as Record<string, unknown>)

  /** Una clase nueva del profesor `owner`; la fixture la borra con las suyas. */
  const newClass = async (actor: Actor, name: string) =>
    (
      await prisma.$transaction(tx =>
        createClassWithOwner(
          tx,
          {
            name: `${name} ${randomUUID().slice(0, 4)}`,
            invitationCode: randomUUID().slice(0, 6).toUpperCase(),
          },
          f.users[actor].id
        )
      )
    ).id

  /**
   * Misión completa en la clase de origen: activa y con fecha límite, dos
   * enigmas (desordenados al crearlos), un documento con fichero y otro que es
   * un enlace, su insignia, y progreso, entrega e insignia ganada de un alumno.
   */
  const newSourceMission = async (classId = sourceClassId) => {
    const key = `documents/${randomUUID()}.txt`
    await mkdir(join(UPLOADS_ROOT, 'documents'), { recursive: true })
    await writeFile(join(UPLOADS_ROOT, key), 'apuntes compartidos')
    written.push(key)
    const fileUrl = `/uploads/${key}`

    const mission = await prisma.mission.create({
      data: {
        classId,
        title: `Misión de origen ${randomUUID().slice(0, 4)}`,
        description: 'Descubre quién se llevó el mapa',
        status: 'activa',
        rarity: 'epica',
        deadline: DEADLINE,
        backgroundImage: COVER,
      },
    })
    const second = await prisma.missionEnigma.create({
      data: {
        missionId: mission.id,
        title: 'Segundo',
        objectives: ['Leer', 'Resumir'],
        xpReward: 30,
        coinReward: 4,
        manaReward: 2,
        orderIndex: 1,
      },
    })
    const first = await prisma.missionEnigma.create({
      data: {
        missionId: mission.id,
        title: 'Primero',
        description: 'Empieza aquí',
        isOptional: true,
        xpReward: 10,
        orderIndex: 0,
      },
    })
    const file = await prisma.missionDocument.create({
      data: {
        missionId: mission.id,
        name: 'Apuntes',
        description: 'Para el primer enigma',
        fileUrl,
        fileName: 'apuntes.txt',
        fileSize: 19,
        mimeType: 'text/plain',
        tags: ['lectura'],
        orderIndex: 0,
        // Una fecha que no es la de ahora: la copia tiene que conservarla.
        uploadedAt: new Date('2030-01-15T08:30:00.000Z'),
      },
    })
    const link = await prisma.missionDocument.create({
      data: {
        missionId: mission.id,
        name: 'Lectura',
        fileUrl: LINK,
        fileName: 'Lectura',
        fileSize: 0,
        mimeType: 'text/html',
        orderIndex: 1,
      },
    })
    const badge = await prisma.badge.create({
      data: {
        name: 'Cartógrafa',
        description: 'Encontró el mapa',
        imageUrl: BADGE_IMAGE,
        rarity: 'epic',
        // Una categoría que no es la de por defecto: la copia tiene que llevarla.
        category: 'social',
        teacherId: f.users.owner.id,
        missionId: mission.id,
      },
    })

    // Lo que ha hecho un alumno con la misión de origen: nada de esto viaja.
    await prisma.studentMissionProgress.create({
      data: { studentId: f.users.student.id, missionId: mission.id, progress: 50 },
    })
    await prisma.studentEnigmaProgress.create({
      data: { studentId: f.users.student.id, enigmaId: first.id, xpEarned: 10 },
    })
    await prisma.enigmaSubmission.create({
      data: { enigmaId: second.id, studentId: f.users.student.id },
    })
    await prisma.studentBadge.create({
      data: { studentId: f.users.student.id, badgeId: badge.id },
    })

    return { mission, first, second, file, link, badge, fileUrl, key }
  }

  const copyOf = (missionId: string) =>
    prisma.mission.findUniqueOrThrow({
      where: { id: missionId },
      include: {
        enigmas: { orderBy: { orderIndex: 'asc' }, include: { progress: true, submissions: true } },
        documents: { orderBy: { orderIndex: 'asc' } },
        badges: { include: { students: true } },
        progress: true,
      },
    })

  const missionCount = (classId: string) => prisma.mission.count({ where: { classId } })

  /** Mete a `userId` en `classId` con `access` (hasta `endsAt`), o le cambia el que tenga. */
  const shareWith = async (
    classId: string,
    userId: string,
    access: 'read' | 'edit' | 'admin',
    endsAt: Date | null = null
  ) => {
    await prisma.classTeacher.upsert({
      where: { classId_userId: { classId, userId } },
      create: {
        classId,
        userId,
        access,
        profile: access === 'read' ? 'practicas' : 'sustituto',
        addedById: f.users.owner.id,
        endsAt,
      },
      update: { access, endsAt },
    })
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(filesRoutes, { prefix: '/files' })
    })
    f = await createClassFixture(app)
    sourceClassId = await newClass('owner', 'Origen')
  })

  beforeEach(() => {
    vi.mocked(deleteUpload).mockClear()
    log.failing.clear()
    log.held.clear()
  })

  afterAll(async () => {
    await Promise.all(written.map(key => rm(join(UPLOADS_ROOT, key), { force: true })))
    await f?.cleanup()
    await app?.close()
  })

  describe('la copia', () => {
    it('lleva misión, enigmas, documentos e insignia, bloqueada, sin fecha límite y sin progreso', async () => {
      const src = await newSourceMission()

      const response = await importMission(src.mission.id, 'owner', { targetClassId: f.classId })
      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.mission).toMatchObject({
        classId: f.classId,
        title: src.mission.title,
        status: 'bloqueada',
        deadline: null,
      })
      expect(body.copied).toEqual({
        enigmas: 2,
        documents: 2,
        badges: [{ id: expect.any(String), name: 'Cartógrafa' }],
      })

      const copy = await copyOf(body.mission.id)
      expect(copy.id).not.toBe(src.mission.id)
      expect(copy).toMatchObject({
        classId: f.classId,
        title: src.mission.title,
        description: 'Descubre quién se llevó el mapa',
        status: 'bloqueada',
        rarity: 'epica',
        deadline: null,
        backgroundImage: COVER,
      })

      // Enigmas: filas nuevas, en el mismo orden y con las mismas recompensas.
      expect(copy.enigmas.map(e => e.id)).not.toContain(src.first.id)
      expect(
        copy.enigmas.map(
          ({
            title,
            description,
            objectives,
            isOptional,
            xpReward,
            coinReward,
            manaReward,
            orderIndex,
          }) => ({
            title,
            description,
            objectives,
            isOptional,
            xpReward,
            coinReward,
            manaReward,
            orderIndex,
          })
        )
      ).toEqual([
        {
          title: 'Primero',
          description: 'Empieza aquí',
          objectives: [],
          isOptional: true,
          xpReward: 10,
          coinReward: 0,
          manaReward: 0,
          orderIndex: 0,
        },
        {
          title: 'Segundo',
          description: null,
          objectives: ['Leer', 'Resumir'],
          isOptional: false,
          xpReward: 30,
          coinReward: 4,
          manaReward: 2,
          orderIndex: 1,
        },
      ])

      // Documentos: filas nuevas que apuntan al mismo fichero (o al mismo enlace),
      // con la fecha en que se subió el original.
      expect(copy.documents.map(d => d.id)).not.toContain(src.file.id)
      expect(copy.documents).toEqual([
        expect.objectContaining({
          name: 'Apuntes',
          description: 'Para el primer enigma',
          fileUrl: src.fileUrl,
          fileName: 'apuntes.txt',
          fileSize: 19,
          mimeType: 'text/plain',
          tags: ['lectura'],
          orderIndex: 0,
          uploadedAt: src.file.uploadedAt,
        }),
        expect.objectContaining({ name: 'Lectura', fileUrl: LINK, orderIndex: 1 }),
      ])

      // Insignia: nueva, de quien importa, vinculada a la copia y sin nadie que la tenga.
      expect(copy.badges).toHaveLength(1)
      expect(copy.badges[0].id).not.toBe(src.badge.id)
      expect(copy.badges[0]).toMatchObject({
        name: 'Cartógrafa',
        description: 'Encontró el mapa',
        imageUrl: BADGE_IMAGE,
        rarity: 'epic',
        category: 'social',
        teacherId: f.users.owner.id,
        missionId: copy.id,
      })
      expect(copy.badges[0].students).toEqual([])

      // Nada de lo que hizo el alumnado con el origen.
      expect(copy.progress).toEqual([])
      for (const enigma of copy.enigmas) {
        expect(enigma.progress).toEqual([])
        expect(enigma.submissions).toEqual([])
      }

      // El origen sigue igual: activa, con su fecha, sus documentos y su insignia.
      const source = await copyOf(src.mission.id)
      expect(source).toMatchObject({ classId: sourceClassId, status: 'activa', deadline: DEADLINE })
      expect(source.documents.map(d => d.id)).toEqual([src.file.id, src.link.id])
      expect(source.badges.map(b => b.id)).toEqual([src.badge.id])
      expect(source.badges[0].students).toHaveLength(1)
      expect(source.progress).toHaveLength(1)
    })

    it('una misión solo con enigmas y sin opciones llega con sus enigmas y nada más', async () => {
      const mission = await prisma.mission.create({
        data: { classId: sourceClassId, title: 'Solo enigmas', status: 'activa' },
      })
      await prisma.missionEnigma.create({
        data: { missionId: mission.id, title: 'Único', xpReward: 15 },
      })

      const response = await importMission(mission.id, 'owner', { targetClassId: f.classId })
      expect(response.statusCode).toBe(201)
      expect(response.json().copied).toEqual({ enigmas: 1, documents: 0, badges: [] })

      const copy = await copyOf(response.json().mission.id)
      expect(copy.enigmas.map(e => [e.title, e.xpReward])).toEqual([['Único', 15]])
      expect(copy.documents).toEqual([])
      expect(copy.badges).toEqual([])
      const entry = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'mission.imported', entityId: copy.id },
      })
      expect(entry.metadata).toMatchObject({ enigmas: 1, documents: 0, badges: 0 })
    })

    it('queda en el registro de las dos clases: en el destino de dónde vino, en el origen adónde fue', async () => {
      const src = await newSourceMission()
      const response = await importMission(src.mission.id, 'owner', { targetClassId: f.classId })
      expect(response.statusCode).toBe(201)
      const copyId = response.json().mission.id

      const imported = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'mission.imported', entityId: copyId },
      })
      expect(imported).toMatchObject({ actorId: f.users.owner.id, entityType: 'mission' })
      expect(imported.metadata).toEqual({
        title: src.mission.title,
        fromClassId: sourceClassId,
        fromMissionId: src.mission.id,
        enigmas: 2,
        documents: 2,
        badges: 1,
      })

      const exported = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: sourceClassId, action: 'mission.exported', entityId: src.mission.id },
      })
      expect(exported).toMatchObject({ actorId: f.users.owner.id, entityType: 'mission' })
      expect(exported.metadata).toEqual({
        title: src.mission.title,
        toClassId: f.classId,
        toMissionId: copyId,
        enigmas: 2,
        documents: 2,
        badges: 1,
      })
      // Cada clase con su entrada: la importación no se apunta en el origen.
      expect(
        await prisma.classActionLog.count({
          where: { classId: sourceClassId, action: 'mission.imported' },
        })
      ).toBe(0)
    })

    it('con copyBadge: false llega sin insignia, con todo lo demás', async () => {
      const src = await newSourceMission()
      const badgesBefore = await prisma.badge.count({ where: { teacherId: f.users.owner.id } })

      const response = await importMission(src.mission.id, 'owner', {
        targetClassId: f.classId,
        copyBadge: false,
      })
      expect(response.statusCode).toBe(201)
      expect(response.json().copied).toEqual({ enigmas: 2, documents: 2, badges: [] })

      const copy = await copyOf(response.json().mission.id)
      expect(copy.badges).toEqual([])
      expect(copy.enigmas).toHaveLength(2)
      expect(copy.documents).toHaveLength(2)
      expect(await prisma.badge.count({ where: { teacherId: f.users.owner.id } })).toBe(
        badgesBefore
      )
      // La insignia original sigue en su misión.
      expect(
        (await prisma.badge.findUniqueOrThrow({ where: { id: src.badge.id } })).missionId
      ).toBe(src.mission.id)
    })

    it('se puede importar en la misma clase: otra misión con otra insignia, el origen intacto', async () => {
      const src = await newSourceMission()
      const before = await missionCount(sourceClassId)

      const response = await importMission(src.mission.id, 'owner', {
        targetClassId: sourceClassId,
      })
      expect(response.statusCode).toBe(201)
      const copy = await copyOf(response.json().mission.id)
      expect(copy.id).not.toBe(src.mission.id)
      expect(await missionCount(sourceClassId)).toBe(before + 1)
      expect(
        (await prisma.mission.findUniqueOrThrow({ where: { id: src.mission.id } })).status
      ).toBe('activa')

      // La copia lleva una insignia suya; la original sigue en su misión.
      expect(copy.badges).toHaveLength(1)
      expect(copy.badges[0].id).not.toBe(src.badge.id)
      expect(
        (await prisma.badge.findUniqueOrThrow({ where: { id: src.badge.id } })).missionId
      ).toBe(src.mission.id)

      // Una sola entrada en el registro: es la misma clase.
      expect(
        await prisma.classActionLog.count({
          where: { classId: sourceClassId, action: 'mission.imported', entityId: copy.id },
        })
      ).toBe(1)
      expect(
        await prisma.classActionLog.count({
          where: { classId: sourceClassId, action: 'mission.exported', entityId: src.mission.id },
        })
      ).toBe(0)
    })

    it('a una clase archivada también se importa, como se crea una misión en ella', async () => {
      const src = await newSourceMission()
      const archived = await newClass('owner', 'Archivada')
      await prisma.class.update({ where: { id: archived }, data: { archived: true } })

      const response = await importMission(src.mission.id, 'owner', { targetClassId: archived })
      expect(response.statusCode).toBe(201)
      expect(await missionCount(archived)).toBe(1)
    })

    it('si algo falla al copiar, no queda nada a medias en ninguna de las dos clases', async () => {
      const src = await newSourceMission()
      const counts = async () => ({
        missions: await missionCount(f.classId),
        badges: await prisma.badge.count({ where: { teacherId: f.users.owner.id } }),
        documents: await prisma.missionDocument.count({ where: { fileUrl: src.fileUrl } }),
        log: await prisma.classActionLog.count({
          where: {
            classId: { in: [f.classId, sourceClassId] },
            action: { in: ['mission.imported', 'mission.exported'] },
          },
        }),
      })
      const before = await counts()

      // Falla lo primero que se apunta y lo último que se escribe.
      for (const action of ['mission.imported', 'mission.exported']) {
        log.failing.add(action)
        const response = await importMission(src.mission.id, 'owner', { targetClassId: f.classId })
        log.failing.clear()
        expect(response.statusCode).toBeGreaterThanOrEqual(400)
        expect(await counts()).toEqual(before)
      }
    })
  })

  describe('el fichero compartido', () => {
    it('la copia bloqueada sale en la lista del alumnado pero no se abre; abierta, su documento sí', async () => {
      const src = await newSourceMission()
      const response = await importMission(src.mission.id, 'owner', { targetClassId: f.classId })
      const copy = await copyOf(response.json().mission.id)
      const copyDocument = copy.documents.find(d => d.fileUrl === src.fileUrl)!

      // Bloqueada, como cualquier misión bloqueada: el alumnado del destino la ve
      // en su lista, pero ni la abre ni abre sus documentos.
      const list = await send('GET', '/missions', 'student')
      expect(list.statusCode).toBe(200)
      expect(
        (list.json().missions as { id: string; status: string }[]).find(m => m.id === copy.id)
      ).toMatchObject({ status: 'bloqueada' })
      expect((await send('GET', `/missions/${copy.id}`, 'student')).statusCode).toBe(404)
      expect((await send('GET', `/files/documents/${copyDocument.id}`, 'student')).statusCode).toBe(
        404
      )

      // Al abrirla, el documento sale, con el fichero del original.
      await prisma.mission.update({ where: { id: copy.id }, data: { status: 'activa' } })
      const opened = await send('GET', `/files/documents/${copyDocument.id}`, 'student')
      expect(opened.statusCode).toBe(200)
      expect(opened.body).toBe('apuntes compartidos')

      // El alumno no está en la clase de origen: su documento no se le abre.
      expect((await send('GET', `/files/documents/${src.file.id}`, 'student')).statusCode).toBe(404)
    })

    it('borrar el documento copiado o el original no borra el fichero mientras el otro lo use', async () => {
      const src = await newSourceMission()
      const response = await importMission(src.mission.id, 'owner', { targetClassId: f.classId })
      const copy = await copyOf(response.json().mission.id)
      const copyDocument = copy.documents.find(d => d.fileUrl === src.fileUrl)!

      const removeCopy = await send(
        'DELETE',
        `/missions/${copy.id}/documents/${copyDocument.id}`,
        'owner'
      )
      expect(removeCopy.statusCode).toBe(200)
      expect(deleteUpload).not.toHaveBeenCalled()
      expect(await readFile(join(UPLOADS_ROOT, src.key), 'utf8')).toBe('apuntes compartidos')

      // Una segunda copia, y se borra el original: el fichero sigue siendo de la copia.
      const again = await importMission(src.mission.id, 'owner', { targetClassId: f.classId })
      const secondCopy = await copyOf(again.json().mission.id)
      const removeOriginal = await send(
        'DELETE',
        `/missions/${src.mission.id}/documents/${src.file.id}`,
        'owner'
      )
      expect(removeOriginal.statusCode).toBe(200)
      expect(deleteUpload).not.toHaveBeenCalled()

      // Al quitar la última fila que lo usa, ahora sí se borra.
      const last = secondCopy.documents.find(d => d.fileUrl === src.fileUrl)!
      const removeLast = await send(
        'DELETE',
        `/missions/${secondCopy.id}/documents/${last.id}`,
        'owner'
      )
      expect(removeLast.statusCode).toBe(200)
      expect(deleteUpload).toHaveBeenCalledTimes(1)
      expect(deleteUpload).toHaveBeenCalledWith(src.fileUrl)
    })

    it('borrar el documento original mientras se importa no deja la copia sin fichero', async () => {
      const src = await newSourceMission()

      // La importación copia los documentos y se queda sin confirmar.
      const release = holdLog('mission.imported')
      try {
        const importing = importMission(src.mission.id, 'owner', { targetClassId: f.classId })
        await waitUntil(() => log.arrived === 1, 'la importación llega al registro')

        // El borrado del original tiene que esperar a que la importación acabe.
        let deleteDone = false
        const deleting = send(
          'DELETE',
          `/missions/${src.mission.id}/documents/${src.file.id}`,
          'owner'
        ).then(response => {
          deleteDone = true
          return response
        })
        await waitUntil(
          async () => deleteDone || (await documentLockWaits()) > 0,
          'el borrado espera o acaba'
        )
        release()

        const [imported, removed] = await Promise.all([importing, deleting])
        expect(imported.statusCode).toBe(201)
        expect(removed.statusCode).toBe(200)

        // La copia tiene su documento, y su fichero no se ha borrado.
        const copy = await copyOf(imported.json().mission.id)
        expect(copy.documents.map(d => d.fileUrl)).toContain(src.fileUrl)
        expect(deleteUpload).not.toHaveBeenCalled()
      } finally {
        release()
      }
    })

    it('borrar a la vez el documento original y el copiado sí borra el fichero', async () => {
      const src = await newSourceMission()
      const response = await importMission(src.mission.id, 'owner', { targetClassId: f.classId })
      const copy = await copyOf(response.json().mission.id)
      const copyDocument = copy.documents.find(d => d.fileUrl === src.fileUrl)!

      // Los dos borrados quitan su fila y esperan, sin confirmar, a que el otro
      // haya hecho lo mismo: ninguno ve todavía que el otro se va.
      const release = holdLog('document.deleted')
      try {
        const both = Promise.all([
          send('DELETE', `/missions/${src.mission.id}/documents/${src.file.id}`, 'owner'),
          send('DELETE', `/missions/${copy.id}/documents/${copyDocument.id}`, 'owner'),
        ])
        await waitUntil(() => log.arrived === 2, 'los dos borrados llegan al registro')
        release()

        expect((await both).map(r => r.statusCode)).toEqual([200, 200])
        expect(await prisma.missionDocument.count({ where: { fileUrl: src.fileUrl } })).toBe(0)
        expect(deleteUpload).toHaveBeenCalledWith(src.fileUrl)
      } finally {
        release()
      }
    })
  })

  describe('quién puede importar', () => {
    /** Mete a `actor` en `classId` con `access`, o le cambia el que tenga. */
    const share = (classId: string, actor: Actor, access: 'read' | 'edit' | 'admin') =>
      shareWith(classId, f.users[actor].id, access)
    const unshare = (classId: string, actor: Actor) =>
      prisma.classTeacher.deleteMany({ where: { classId, userId: f.users[actor].id } })

    it('sin acceso a la clase de la misión: 404, y no se crea nada', async () => {
      const src = await newSourceMission()
      const before = await missionCount(f.otherClassId)

      const response = await importMission(src.mission.id, 'other', {
        targetClassId: f.otherClassId,
      })
      expect(response.statusCode).toBe(404)
      expect(await missionCount(f.otherClassId)).toBe(before)
    })

    it('con el acceso al origen vencido: 404, y no se crea nada', async () => {
      const src = await newSourceMission()
      await shareWith(sourceClassId, f.users.other.id, 'admin', new Date(Date.now() - 1000))
      try {
        const before = await missionCount(f.otherClassId)
        const response = await importMission(src.mission.id, 'other', {
          targetClassId: f.otherClassId,
        })
        expect(response.statusCode).toBe(404)
        expect(await missionCount(f.otherClassId)).toBe(before)
      } finally {
        await unshare(sourceClassId, 'other')
      }
    })

    it('una misión que no existe: 404', async () => {
      const response = await importMission(randomUUID(), 'owner', { targetClassId: f.classId })
      expect(response.statusCode).toBe(404)
    })

    it('con lectura en el origen basta: la copia y su insignia son de quien importa', async () => {
      const src = await newSourceMission()
      await share(sourceClassId, 'other', 'read')
      try {
        const response = await importMission(src.mission.id, 'other', {
          targetClassId: f.otherClassId,
        })
        expect(response.statusCode).toBe(201)
        const copy = await copyOf(response.json().mission.id)
        expect(copy.classId).toBe(f.otherClassId)
        expect(copy.badges.map(b => b.teacherId)).toEqual([f.users.other.id])
        // En el historial del origen queda quién se la llevó.
        expect(
          await prisma.classActionLog.count({
            where: {
              classId: sourceClassId,
              action: 'mission.exported',
              entityId: src.mission.id,
              actorId: f.users.other.id,
            },
          })
        ).toBe(1)
      } finally {
        await unshare(sourceClassId, 'other')
      }
    })

    it('si quien importó a una clase ajena borra su cuenta, la insignia copiada pasa al propietario', async () => {
      const src = await newSourceMission()
      const teacher = await prisma.user.create({
        data: {
          email: `importa.${randomUUID().slice(0, 8)}@test.invalid`,
          passwordHash: 'x',
          name: 'Profesora que importa',
          role: 'teacher',
          isOnboarded: true,
        },
      })
      try {
        await shareWith(sourceClassId, teacher.id, 'read')
        await shareWith(f.classId, teacher.id, 'edit')
        const response = await app.inject({
          method: 'POST',
          url: `/teacher/missions/${src.mission.id}/import`,
          payload: { targetClassId: f.classId },
          headers: {
            authorization: `Bearer ${app.jwt.sign({ id: teacher.id, role: 'teacher' })}`,
          },
        })
        expect(response.statusCode).toBe(201)
        const [badge] = response.json().copied.badges as { id: string }[]
        const copyId = response.json().mission.id
        expect((await prisma.badge.findUniqueOrThrow({ where: { id: badge.id } })).teacherId).toBe(
          teacher.id
        )

        await deleteUserAccount(teacher.id, { actorId: teacher.id, bySelf: true })

        expect(await prisma.badge.findUniqueOrThrow({ where: { id: badge.id } })).toMatchObject({
          teacherId: f.users.owner.id,
          missionId: copyId,
        })
      } finally {
        // Si la prueba se corta antes de borrar la cuenta, que no quede nada suyo.
        await prisma.badge.deleteMany({ where: { teacherId: teacher.id } })
        await prisma.user.deleteMany({ where: { id: teacher.id } })
      }
    })

    it('en el destino: sin acceso 404, con lectura 403, con edición 201', async () => {
      const src = await newSourceMission()
      const target = f.otherClassId
      const before = await missionCount(target)
      const attempt = () => importMission(src.mission.id, 'owner', { targetClassId: target })

      try {
        expect((await attempt()).statusCode).toBe(404)
        await share(target, 'owner', 'read')
        expect((await attempt()).statusCode).toBe(403)
        expect(await missionCount(target)).toBe(before)

        await share(target, 'owner', 'edit')
        const response = await attempt()
        expect(response.statusCode).toBe(201)
        expect(await missionCount(target)).toBe(before + 1)
        // Quien importa con edición en el destino deja constancia allí.
        expect(
          await prisma.classActionLog.count({
            where: {
              classId: target,
              action: 'mission.imported',
              entityId: response.json().mission.id,
              actorId: f.users.owner.id,
            },
          })
        ).toBe(1)
      } finally {
        await unshare(target, 'owner')
      }
    })

    it('alumnado 403 y sin sesión 401', async () => {
      const src = await newSourceMission()
      const before = await missionCount(f.classId)
      expect(
        (await importMission(src.mission.id, 'student', { targetClassId: f.classId })).statusCode
      ).toBe(403)
      expect(
        (await importMission(src.mission.id, undefined, { targetClassId: f.classId })).statusCode
      ).toBe(401)
      expect(await missionCount(f.classId)).toBe(before)
    })

    it('sin clase de destino válida, o con opciones que no existen: 400, y no se crea nada', async () => {
      const src = await newSourceMission()
      const before = await missionCount(f.classId)
      const invalid = [
        {},
        { targetClassId: 'no-es-un-id' },
        { targetClassId: f.classId, copyBadge: 'no' },
        // Otros nombres para las opciones no se descartan en silencio.
        { targetClassId: f.classId, withBadge: false },
        { targetClassId: f.classId, withDocuments: false },
      ]
      for (const payload of invalid) {
        expect((await importMission(src.mission.id, 'owner', payload)).statusCode).toBe(400)
      }
      expect(await missionCount(f.classId)).toBe(before)
    })
  })

  describe('duplicar una clase', () => {
    it('copia sus misiones como siempre: estado y fecha tal cual, sin documentos ni insignia', async () => {
      const classId = await newClass('owner', 'Para duplicar')
      const src = await newSourceMission(classId)
      await prisma.mission.create({
        data: { classId, title: 'Bloqueada de antes', status: 'bloqueada' },
      })

      const response = await send('POST', `/teacher/classes/${classId}/duplicate`, 'owner', {})
      expect(response.statusCode).toBe(200)
      const duplicateId = response.json().class.id

      const missions = await prisma.mission.findMany({
        where: { classId: duplicateId },
        include: {
          enigmas: { orderBy: { orderIndex: 'asc' } },
          documents: true,
          badges: true,
          progress: true,
        },
        orderBy: { title: 'asc' },
      })
      expect(missions.map(m => [m.title, m.status])).toEqual([
        ['Bloqueada de antes', 'bloqueada'],
        [src.mission.title, 'activa'],
      ])
      const copy = missions[1]
      expect(copy).toMatchObject({
        description: 'Descubre quién se llevó el mapa',
        rarity: 'epica',
        deadline: DEADLINE,
        backgroundImage: COVER,
      })
      expect(
        copy.enigmas.map(e => [e.title, e.orderIndex, e.xpReward, e.coinReward, e.manaReward])
      ).toEqual([
        ['Primero', 0, 10, 0, 0],
        ['Segundo', 1, 30, 4, 2],
      ])
      expect(copy.documents).toEqual([])
      expect(copy.badges).toEqual([])
      expect(copy.progress).toEqual([])

      // Sin misiones marcadas, no se copia ninguna.
      const without = await send('POST', `/teacher/classes/${classId}/duplicate`, 'owner', {
        missions: false,
      })
      expect(without.statusCode).toBe(200)
      expect(await missionCount(without.json().class.id)).toBe(0)
    })
  })
})
