import { it, expect, vi, beforeAll, afterAll, beforeEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Cada matrícula nace con un alias de mitología que no tiene nadie más en la
 * clase, porque varias pantallas del profesorado solo enseñan el alias. Cuando
 * se acaban, se repiten con número («Titan Novato 2»), sin pasar nunca del
 * largo máximo del alias. Vale para el alta por código —con toda un aula
 * entrando a la vez— y para las listas de cuentas sin correo, que se crean en
 * una sola transacción. La matrícula de vista previa del profesorado no ocupa
 * alias, y quien se une mientras se importa una lista espera a que acabe.
 *
 * La parte de base de datos necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
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
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { resetRateLimits } from '../../src/utils/rate-limit.js'
import {
  lockClassNicknames,
  NICKNAME_MAX_LENGTH,
  pickFreeNickname,
} from '../../src/utils/enrollment.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

/** Los alias de mitología: con el primero libre de todos se ven los treinta. */
const allBaseNicknames = () => {
  const bases: string[] = []
  while (bases.length < 100) {
    const next = pickFreeNickname(bases)
    if (/ \d+$/.test(next)) break
    bases.push(next)
  }
  return bases
}

describe('alias libre', () => {
  it('elige uno que no esté cogido, sin fijarse en mayúsculas ni espacios', () => {
    const bases = allBaseNicknames()
    expect(bases).toHaveLength(30)
    expect(new Set(bases).size).toBe(30)

    const last = bases[bases.length - 1]
    const taken = bases.filter(b => b !== last).map(b => `  ${b.toUpperCase()} `)
    for (let i = 0; i < 20; i++) expect(pickFreeNickname(taken)).toBe(last)
  })

  it('con todos cogidos añade un número, y luego el siguiente', () => {
    const bases = allBaseNicknames()
    const second = pickFreeNickname(bases)
    expect(second).toMatch(/ 2$/)
    expect(bases).toContain(second.replace(/ 2$/, ''))

    const third = pickFreeNickname([...bases, ...bases.map(b => `${b} 2`)])
    expect(third).toMatch(/ 3$/)
  })

  it('ninguno pasa del largo máximo del alias, tampoco con número', () => {
    // Cada ronda se agota antes de pasar a la siguiente, así que con cuatrocientos
    // salen todos los candidatos de las rondas sin número, con una cifra y con dos.
    const taken: string[] = []
    while (taken.length < 400) taken.push(pickFreeNickname(taken))

    expect(taken.filter(n => n.length > NICKNAME_MAX_LENGTH)).toEqual([])
    expect(new Set(taken).size).toBe(taken.length)
    expect(taken.some(n => / \d{2}$/.test(n))).toBe(true)
    // Los que ya llenan el alias salen sin número y no vuelven a salir con él.
    expect(taken).toContain('Aprendiz del Destino')
    expect(taken.filter(n => n.startsWith('Aprendiz del Destino '))).toEqual([])
  })
})

describeWithDatabase('alias de la matrícula', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const studentIds: string[] = []

  type Who = { id: string; role: string | null }
  const send = (method: 'POST', url: string, actor: Who, payload?: Record<string, unknown>) =>
    app.inject({
      method,
      url,
      payload,
      headers: { authorization: `Bearer ${app.jwt.sign(actor)}` },
    })

  const newStudents = async (count: number, label: string) => {
    const students = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        prisma.user.create({
          data: {
            email: `${label}${i}.${tag}@test.invalid`,
            passwordHash: 'x',
            name: `${label} ${i} ${tag}`,
            role: 'student',
            isOnboarded: true,
          },
          select: { id: true, role: true },
        })
      )
    )
    studentIds.push(...students.map(s => s.id))
    return students
  }

  const join = async (classId: string, student: Who) => {
    const { invitationCode } = await prisma.class.findUniqueOrThrow({
      where: { id: classId },
      select: { invitationCode: true },
    })
    return send('POST', '/students/classes/join', student, { code: invitationCode })
  }

  const nicknamesIn = async (classId: string) =>
    (
      await prisma.classEnrollment.findMany({
        where: { classId, isPreview: false, nickname: { not: null } },
        select: { nickname: true },
      })
    ).map(e => e.nickname!)

  const newClass = (name: string) =>
    prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: `${name} ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )

  const nicknameOf = async (classId: string, studentId: string) =>
    (
      await prisma.classEnrollment.findUniqueOrThrow({
        where: { studentId_classId: { studentId, classId } },
        select: { nickname: true },
      })
    ).nickname

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
  })

  beforeEach(() => {
    resetRateLimits()
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: studentIds } } })
    await app?.close()
  })

  it('un aula entera entrando a la vez con el código no repite alias', async () => {
    const students = await newStudents(15, 'aula')

    const responses = await Promise.all(students.map(s => join(f.otherClassId, s)))
    expect(responses.map(r => r.statusCode)).toEqual(students.map(() => 200))

    const nicknames = await nicknamesIn(f.otherClassId)
    expect(nicknames).toHaveLength(15)
    expect(new Set(nicknames).size).toBe(15)

    // El historial de cada alumno lleva el alias con el que ha entrado.
    const joined = await prisma.activity.findMany({
      where: { classId: f.otherClassId, type: 'class_joined' },
      select: { username: true },
    })
    expect(joined.map(a => a.username).sort()).toEqual([...nicknames].sort())
  })

  // Treinta contraseñas con su hash: más que los cinco segundos por defecto.
  it('una lista de treinta cuentas usa los treinta alias, y el siguiente lleva número', async () => {
    const response = await send(
      'POST',
      `/teacher/classes/${f.classId}/students/import`,
      f.users.owner,
      {
        students: Array.from({ length: 30 }, (_, i) => ({ name: `Lista ${i} ${tag}` })),
      }
    )
    expect(response.statusCode).toBe(201)

    const listed = await nicknamesIn(f.classId)
    expect(listed).toHaveLength(30)
    expect(new Set(listed).size).toBe(30)
    expect(listed.every(n => !/ \d+$/.test(n))).toBe(true)
    expect(listed.filter(n => n.length > NICKNAME_MAX_LENGTH)).toEqual([])

    const [late] = await newStudents(1, 'tarde')
    expect((await join(f.classId, late)).statusCode).toBe(200)

    const nickname = await nicknameOf(f.classId, late.id)
    expect(nickname).toMatch(/ 2$/)
    expect(nickname!.length).toBeLessThanOrEqual(NICKNAME_MAX_LENGTH)
    expect(listed).toContain(nickname!.replace(/ 2$/, ''))
  }, 60_000)

  it('la vista previa del profesorado no ocupa alias, y se lleva uno libre', async () => {
    const cls = await newClass('Vista previa')
    const [kept, ...rest] = allBaseNicknames()
    const students = await newStudents(rest.length, 'previa')
    await prisma.classEnrollment.createMany({
      data: students.map((s, i) => ({ classId: cls.id, studentId: s.id, nickname: rest[i] })),
    })

    // La vista previa se lleva el único alias libre de la clase…
    expect((await send('POST', '/students/preview/enroll', f.users.owner)).statusCode).toBe(200)
    const preview = await prisma.classEnrollment.findUniqueOrThrow({
      where: { studentId_classId: { studentId: f.users.owner.id, classId: cls.id } },
      select: { isPreview: true, nickname: true },
    })
    expect(preview).toEqual({ isPreview: true, nickname: kept })

    // …y no se lo quita a quien entra después con el código.
    const [late] = await newStudents(1, 'previa-tarde')
    expect((await join(cls.id, late)).statusCode).toBe(200)
    expect(await nicknameOf(cls.id, late.id)).toBe(kept)
  }, 30_000)

  // La importación de una lista retiene la cerradura de alias de la clase hasta
  // que acaba (hasta 30 s): más que los cinco segundos por defecto de Prisma.
  it('quien se une mientras se importa una lista espera a que acabe, sin error', async () => {
    const cls = await newClass('Importando')
    const [student] = await newStudents(1, 'espera')

    let release!: () => void
    const released = new Promise<void>(resolve => {
      release = resolve
    })
    let locked!: () => void
    const lockTaken = new Promise<void>(resolve => {
      locked = resolve
    })
    const importing = prisma.$transaction(
      async tx => {
        await lockClassNicknames(tx, cls.id)
        locked()
        await released
      },
      { timeout: 30_000 }
    )
    await lockTaken

    let joined = false
    const joining = join(cls.id, student).then(response => {
      joined = true
      return response
    })
    await new Promise(resolve => setTimeout(resolve, 6_000))
    expect(joined).toBe(false)

    release()
    await importing
    expect((await joining).statusCode).toBe(200)
    expect(await nicknameOf(cls.id, student.id)).toBeTruthy()
  }, 30_000)
})
