import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * La lista general de alumnos del profesorado (`GET /teacher/students`): busca
 * por nombre, correo o usuario sin distinguir mayúsculas, filtra por una clase
 * accesible (una ajena da 404), pagina en el servidor y trae también el
 * alumnado de las clases compartidas con quien pregunta.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Solo se simula lo que sale de la máquina.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendPasswordChangedEmail: vi.fn(async () => {}),
  sendNotificationEmail: vi.fn(async () => {}),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import {
  STUDENT_LIST_DEFAULT_LIMIT,
  STUDENT_LIST_MAX_LIMIT,
  STUDENT_LIST_MAX_PAGE,
} from '../../src/modules/teachers/student-list.service.js'

interface ListedStudent {
  id: string
  name: string
  accountType: string
  overallProgress: number
  classIds: string[]
  archived: boolean
}

interface StudentList {
  students: ListedStudent[]
  total: number
  page: number
  limit: number
  totalPages: number
  counts: { active: number; archived: number }
}

describeWithDatabase('lista general de alumnos del profesorado', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const studentIds: string[] = []
  /** Segunda clase del propietario, con cinco alumnos para paginar. */
  let pagedClassId: string
  let paged: string[] = []
  /** Cuenta sin correo de la clase de la fixture, que entra con usuario. */
  let managedId: string

  const list = async (query: string, actor: 'owner' | 'other' = 'owner') => {
    const response = await app.inject({
      method: 'GET',
      url: `/teacher/students${query}`,
      headers: { authorization: `Bearer ${f.token(actor)}` },
    })
    return response
  }

  const listed = async (query: string, actor: 'owner' | 'other' = 'owner') => {
    const response = await list(query, actor)
    expect(response.statusCode, response.body).toBe(200)
    return response.json() as StudentList
  }

  const newStudent = async (name: string, data: { username?: string; email?: string } = {}) => {
    const user = await prisma.user.create({
      data: {
        name: `${name} ${tag}`,
        passwordHash: 'x',
        role: 'student',
        isOnboarded: true,
        ...(data.username
          ? { username: data.username, accountType: 'managed' as const }
          : { email: data.email ?? `${name.toLowerCase()}.${tag}@test.invalid` }),
      },
    })
    studentIds.push(user.id)
    return user.id
  }

  const enroll = (classId: string, studentId: string) =>
    prisma.classEnrollment.create({ data: { classId, studentId } })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)

    managedId = await newStudent('Usuaria', { username: `lista_${tag}` })
    await enroll(f.classId, managedId)

    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `Paginada ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    pagedClassId = cls.id
    // Los nombres empiezan por una letra distinta: el orden por nombre es fijo.
    paged = []
    for (const name of ['Ana', 'Bea', 'Carla', 'Dani', 'Eva']) {
      const id = await newStudent(name)
      await enroll(pagedClassId, id)
      paged.push(id)
    }
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: studentIds } } })
    await app?.close()
  })

  it('busca por usuario, correo o nombre sin distinguir mayúsculas', async () => {
    const byUsername = await listed(`?search=${encodeURIComponent(`LISTA_${tag.toUpperCase()}`)}`)
    expect(byUsername.students.map(s => s.id)).toEqual([managedId])
    expect(byUsername.total).toBe(1)
    // La cuenta sin correo sale marcada como tal.
    expect(byUsername.students[0].accountType).toBe('managed')

    const byEmail = await listed(`?search=${encodeURIComponent(`EVA.${tag}@TEST`)}`)
    expect(byEmail.students.map(s => s.id)).toEqual([paged[4]])

    const byName = await listed(`?search=${encodeURIComponent(`carla ${tag}`)}`)
    expect(byName.students.map(s => s.id)).toEqual([paged[2]])

    const none = await listed(`?search=${encodeURIComponent(`nadie-${tag}`)}`)
    expect(none).toMatchObject({ students: [], total: 0, totalPages: 1 })
  })

  it('filtra por una clase accesible y da 404 con una ajena', async () => {
    const own = await listed(`?classId=${f.classId}`)
    expect(own.students.map(s => s.id).sort()).toEqual([f.users.student.id, managedId].sort())
    expect(own.students.every(s => s.classIds.length === 1 && s.classIds[0] === f.classId)).toBe(
      true
    )

    // La búsqueda se combina con la clase.
    const combined = await listed(`?classId=${pagedClassId}&search=${encodeURIComponent(`BEA ${tag}`)}`)
    expect(combined.students.map(s => s.id)).toEqual([paged[1]])

    // Sin clase, salen las dos del propietario.
    const all = await listed('?limit=100')
    const allIds = all.students.map(s => s.id)
    expect(allIds).toEqual(expect.arrayContaining([f.users.student.id, managedId, ...paged]))
    expect(all.total).toBe(7)
    expect(all.counts).toEqual({ active: 7, archived: 0 })

    expect((await list(`?classId=${f.otherClassId}`)).statusCode).toBe(404)
    // Un valor fuera de lo previsto no se cuela: 400.
    expect((await list('?limit=1000')).statusCode).toBe(400)
    expect((await list('?sort=raro')).statusCode).toBe(400)
  })

  it('pagina en el servidor, por nombre y por progreso', async () => {
    const pages = await Promise.all(
      [1, 2, 3].map(page => listed(`?classId=${pagedClassId}&limit=2&page=${page}`))
    )
    expect(pages.map(p => p.students.length)).toEqual([2, 2, 1])
    expect(pages[0]).toMatchObject({ total: 5, page: 1, limit: 2, totalPages: 3 })
    expect(pages.flatMap(p => p.students.map(s => s.id))).toEqual(paged)

    const desc = await listed(`?classId=${pagedClassId}&limit=2&sort=name-desc`)
    expect(desc.students.map(s => s.id)).toEqual([paged[4], paged[3]])

    // Más allá de la última página no sale nadie, pero el total sigue.
    const beyond = await listed(`?classId=${pagedClassId}&limit=2&page=9`)
    expect(beyond).toMatchObject({ students: [], total: 5, totalPages: 3 })

    // Dani resuelve el único enigma de la clase: 100 %, el primero por progreso.
    const missionId = await f.newMission(pagedClassId)
    const enigmaId = await f.newEnigma(missionId)
    await prisma.studentEnigmaProgress.create({ data: { studentId: paged[3], enigmaId } })

    const byProgress = await listed(`?classId=${pagedClassId}&limit=2&sort=progress-desc`)
    expect(byProgress).toMatchObject({ total: 5, totalPages: 3 })
    expect(byProgress.students.map(s => s.id)).toEqual([paged[3], paged[0]])
    expect(byProgress.students[0].overallProgress).toBe(100)

    const excellent = await listed(`?classId=${pagedClassId}&progress=excellent&limit=2`)
    expect(excellent).toMatchObject({ total: 1, totalPages: 1 })
    expect(excellent.students.map(s => s.id)).toEqual([paged[3]])

    const initial = await listed(`?classId=${pagedClassId}&progress=initial&page=2&limit=2`)
    expect(initial).toMatchObject({ total: 4, page: 2, totalPages: 2 })
    expect(initial.students.map(s => s.id)).toEqual([paged[2], paged[4]])
  })

  it('separa activos y archivados según sus clases', async () => {
    await prisma.class.update({ where: { id: pagedClassId }, data: { archived: true } })
    try {
      const active = await listed('?limit=100')
      expect(active.students.map(s => s.id).sort()).toEqual(
        [f.users.student.id, managedId].sort()
      )
      expect(active.counts).toEqual({ active: 2, archived: 5 })

      const archived = await listed('?archived=archived&limit=2')
      expect(archived).toMatchObject({ total: 5, totalPages: 3 })
      expect(archived.students.map(s => s.id)).toEqual(paged.slice(0, 2))
      expect(archived.students.every(s => s.archived)).toBe(true)

      // Por clase salen todos, cada uno con su estado.
      const byClass = await listed(`?classId=${pagedClassId}`)
      expect(byClass.total).toBe(5)
      expect(byClass.students.every(s => s.archived)).toBe(true)
    } finally {
      await prisma.class.update({ where: { id: pagedClassId }, data: { archived: false } })
    }
  })

  it('en la lista general, la clase elegida solo acota quién sale: los números son los de la pestaña', async () => {
    // Ana también está en otra clase, donde lo ha resuelto todo.
    const extra = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `Extra ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    try {
      await enroll(extra.id, paged[0])
      const missionId = await f.newMission(extra.id)
      for (let i = 0; i < 4; i++) {
        const enigmaId = await f.newEnigma(missionId)
        await prisma.studentEnigmaProgress.create({ data: { studentId: paged[0], enigmaId } })
      }
      const ana = (list: StudentList) => list.students.find(s => s.id === paged[0])

      // Con la clase en el filtro, su tarjeta es la misma que sin filtro: las dos clases.
      const unfiltered = ana(await listed('?archived=active&limit=100'))
      const filtered = ana(await listed(`?archived=active&classId=${pagedClassId}&limit=100`))
      expect(filtered).toEqual(unfiltered)
      expect(filtered?.classIds.sort()).toEqual([pagedClassId, extra.id].sort())
      // Lo hecho en la otra clase pesa: entre el 80 y el 100 %, según la primera tenga enigma.
      expect(filtered?.overallProgress).toBeGreaterThanOrEqual(80)

      // El filtro de progreso también mira la pestaña, no solo la clase elegida.
      const excellent = await listed(
        `?archived=active&classId=${pagedClassId}&progress=excellent&limit=100`
      )
      expect(excellent.students.map(s => s.id)).toContain(paged[0])

      // La vista de la clase (sin pestaña) sigue con los números de esa clase.
      const classView = await listed(`?classId=${pagedClassId}`)
      expect(ana(classView)?.classIds).toEqual([pagedClassId])
      expect(ana(classView)?.overallProgress).toBe(0)
      const classExcellent = await listed(`?classId=${pagedClassId}&progress=excellent`)
      expect(classExcellent.students.map(s => s.id)).not.toContain(paged[0])
    } finally {
      await prisma.class.delete({ where: { id: extra.id } })
    }
  })

  it('sin límite, solo sale entero el alumnado de una clase; si no, una página', async () => {
    // Seis más en otra clase: trece en total, una más de las que caben en una página.
    const crowd = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `Multitud ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    try {
      for (const name of ['Fede', 'Gala', 'Hugo', 'Inés', 'Juan', 'Kira']) {
        await enroll(crowd.id, await newStudent(name))
      }

      const firstPage = await listed('')
      expect(firstPage).toMatchObject({
        total: 13,
        page: 1,
        limit: STUDENT_LIST_DEFAULT_LIMIT,
        totalPages: 2,
      })
      expect(firstPage.students).toHaveLength(STUDENT_LIST_DEFAULT_LIMIT)
      // Por progreso se calcula todo, pero también viaja solo la página.
      expect((await listed('?sort=progress-desc')).students).toHaveLength(
        STUDENT_LIST_DEFAULT_LIMIT
      )

      // Con clase, sin límite sale entera.
      const whole = await listed(`?classId=${crowd.id}`)
      expect(whole).toMatchObject({ total: 6, limit: 6, totalPages: 1 })
      expect(whole.students).toHaveLength(6)
    } finally {
      await prisma.class.delete({ where: { id: crowd.id } })
    }
  })

  it('no admite páginas fuera de rango', async () => {
    // Antes daba 500: el salto no cabía en la consulta.
    expect((await list('?page=1e17&limit=100')).statusCode).toBe(400)
    expect((await list(`?page=${STUDENT_LIST_MAX_PAGE + 1}`)).statusCode).toBe(400)
    expect((await list('?page=0')).statusCode).toBe(400)

    const last = await listed(`?page=${STUDENT_LIST_MAX_PAGE}&limit=${STUDENT_LIST_MAX_LIMIT}`)
    expect(last).toMatchObject({ students: [], page: STUDENT_LIST_MAX_PAGE, total: 7 })
    const lastByProgress = await listed(`?page=${STUDENT_LIST_MAX_PAGE}&sort=progress-desc`)
    expect(lastByProgress).toMatchObject({ students: [], total: 7 })
  })

  describe('profesorado compartido', () => {
    it('quien comparte la clase ve su alumnado, y deja de verlo al salir', async () => {
      // Antes de compartirla, al otro profesor no le sale nadie de la clase.
      expect((await listed('', 'other')).students.map(s => s.id)).not.toContain(
        f.users.student.id
      )

      await prisma.classTeacher.create({
        data: {
          classId: f.classId,
          userId: f.users.other.id,
          access: 'read',
          profile: 'practicas',
          addedById: f.users.owner.id,
        },
      })
      try {
        // Sus clases son la suya, vacía, y la compartida.
        const shared = await listed('', 'other')
        expect(shared.students.map(s => s.id).sort()).toEqual(
          [f.users.student.id, managedId].sort()
        )
        // Solo la clase compartida: la otra del propietario no.
        expect(shared.students.map(s => s.id)).not.toContain(paged[0])

        const byClass = await listed(`?classId=${f.classId}&limit=1`, 'other')
        expect(byClass).toMatchObject({ total: 2, totalPages: 2 })
        expect((await list(`?classId=${pagedClassId}`, 'other')).statusCode).toBe(404)
      } finally {
        await prisma.classTeacher.deleteMany({
          where: { classId: f.classId, userId: f.users.other.id },
        })
      }

      expect((await listed('', 'other')).students.map(s => s.id)).not.toContain(
        f.users.student.id
      )
    })
  })
})
