import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import type { FastifyInstance } from 'fastify'

/**
 * Las cifras de progreso que ya se veían, con la definición única (F1): la ficha
 * del estudiante, el detalle de misión, las misiones del profesorado, las
 * clases, el resumen del alumnado, la clasificación y el listado de Alumnado
 * dicen lo mismo que la matriz de la clase, con una misión bloqueada a mano, una
 * sin enigmas, una caducada, una cerrada por el camino, opcionales, la vista
 * previa del profesorado, una entrega atascada y quien hizo la misión en otra
 * clase. Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
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
import { PrismaClient, type Prisma } from '../../src/generated/prisma/client.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { classMatrix, type ClassMatrix } from '../../src/modules/analytics/class-matrix.js'
import {
  countedMissionsByClass,
  studentProgressByClass,
} from '../../src/modules/analytics/student-progress.js'
import { countClassesAwaitingReview } from '../../src/utils/pending-review.js'

const DAY = 24 * 60 * 60 * 1000

describeWithDatabase('las cifras de progreso de las pantallas, con la definición única', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const userIds: string[] = []
  const ids = {} as Record<string, string>
  let matrix: ClassMatrix
  /** La segunda clase del propietario en la que también está la alumna. */
  let secondClassId: string

  const newStudent = async (label: string, managed = false) => {
    const user = await prisma.user.create({
      data: managed
        ? { username: `${label}-${tag}`, accountType: 'managed', passwordHash: 'x', name: label, role: 'student' }
        : { email: `${label}.${tag}@test.invalid`, passwordHash: 'x', name: label, role: 'student', isOnboarded: true },
    })
    userIds.push(user.id)
    ids[label] = user.id
    return user.id
  }

  let order = 0
  const newMission = async (
    classId: string,
    label: string,
    enigmas: { label: string; optional?: boolean }[],
    data: { status?: 'activa' | 'bloqueada'; deadline?: Date } = {}
  ) => {
    const mission = await prisma.mission.create({
      data: { classId, title: label, orderIndex: order++, ...data },
    })
    ids[label] = mission.id
    for (const [index, e] of enigmas.entries()) {
      const enigma = await prisma.missionEnigma.create({
        data: { missionId: mission.id, title: e.label, isOptional: e.optional ?? false, orderIndex: index, xpReward: 10 },
      })
      ids[e.label] = enigma.id
    }
  }

  const newClass = async (name: string) => {
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    return cls.id
  }

  const approve = (student: string, enigma: string) =>
    prisma.studentEnigmaProgress.create({ data: { studentId: student, enigmaId: ids[enigma]! } })
  const complete = (student: string, mission: string, enigmasCompleted = 1) =>
    prisma.studentMissionProgress.create({
      data: { studentId: student, missionId: ids[mission]!, completedAt: new Date(), enigmasCompleted, progress: 100 },
    })
  const submit = (student: string, enigma: string) =>
    prisma.enigmaSubmission.create({ data: { studentId: student, enigmaId: ids[enigma]! } })

  const get = async (actor: Actor, url: string) => {
    const response = await app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${f.token(actor)}` },
    })
    expect(response.statusCode, response.body).toBe(200)
    return response.json()
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
    })
    f = await createClassFixture(app)
    await prisma.class.update({
      where: { id: f.classId },
      data: { settings: { missionMap: true } },
    })
    const alumna = f.users.student.id
    const owner = f.users.owner.id
    const outsider = f.users.outsider.id
    const bea = await newStudent('bea')
    const carla = await newStudent('carla', true)
    await prisma.classEnrollment.createMany({
      data: [
        { classId: f.classId, studentId: bea },
        { classId: f.classId, studentId: carla },
        { classId: f.classId, studentId: owner, isPreview: true },
      ],
    })

    // Cuentan M1, M4, M5 y M6: N = 4, con 5 obligatorios y 1 opcional.
    await newMission(f.classId, 'M1', [{ label: 'm1a' }, { label: 'm1b' }, { label: 'm1o', optional: true }])
    await newMission(f.classId, 'M2 bloqueada', [{ label: 'm2a' }], { status: 'bloqueada' })
    await newMission(f.classId, 'M3 sin enigmas', [])
    await newMission(f.classId, 'M4 caducada', [{ label: 'm4a' }], { deadline: new Date(Date.now() - 3 * DAY) })
    await newMission(f.classId, 'M5 camino', [{ label: 'm5a' }])
    await newMission(f.classId, 'M6', [{ label: 'm6a' }])
    await prisma.missionPrerequisite.create({
      data: { missionId: ids['M5 camino']!, requiredMissionId: ids.M1! },
    })

    // La alumna: M1 entera, con el opcional, y M2, que luego se bloqueó (no cuenta).
    await approve(alumna, 'm1a')
    await approve(alumna, 'm1b')
    await approve(alumna, 'm1o')
    await complete(alumna, 'M1', 3)
    await approve(alumna, 'm2a')
    await complete(alumna, 'M2 bloqueada')
    // Bea: un obligatorio de M1 y una entrega por revisar de M6. Carla, nada.
    await approve(bea, 'm1a')
    await prisma.studentMissionProgress.create({
      data: { studentId: bea, missionId: ids.M1!, enigmasCompleted: 1, progress: 33 },
    })
    await submit(bea, 'm6a')
    // Atascada: pendiente de un enigma que la alumna ya tiene aprobado.
    await submit(alumna, 'm1a')

    // La vista previa y quien la hizo en otra clase no cuentan en nada.
    for (const someone of [owner, outsider]) {
      await approve(someone, 'm1a')
      await approve(someone, 'm1b')
      await complete(someone, 'M1', 2)
      await approve(someone, 'm6a')
      await complete(someone, 'M6')
      await submit(someone, 'm4a')
    }

    // Una segunda clase de la alumna, con el mapa apagado: 1 de 2 misiones y un opcional sin hacer.
    secondClassId = await newClass(`Segunda ${tag}`)
    await prisma.classEnrollment.create({ data: { classId: secondClassId, studentId: alumna } })
    await newMission(secondClassId, 'S1', [{ label: 's1a' }, { label: 's1o', optional: true }])
    await newMission(secondClassId, 'S2', [{ label: 's2a' }])
    await approve(alumna, 's1a')
    await complete(alumna, 'S1')

    matrix = await classMatrix(f.classId)
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await app?.close()
  })

  const inMatrix = (studentId: string) => matrix.students.find(s => s.studentId === studentId)!

  it('el punto de partida: la matriz sin la vista previa ni quien no está en la clase', () => {
    expect(matrix.students.map(s => s.studentId).sort()).toEqual(
      [f.users.student.id, ids.bea!, ids.carla!].sort()
    )
    expect(matrix.summary.missionsCounted).toBe(4)
    expect(inMatrix(f.users.student.id).progress).toMatchObject({
      missionsCompleted: 1,
      missionsCounted: 4,
      requiredApproved: 2,
      requiredTotal: 5,
      percent: 40,
      extraApproved: 1,
      extraTotal: 1,
    })
    expect(inMatrix(ids.bea!).progress).toMatchObject({ missionsCompleted: 0, percent: 20 })
    expect(inMatrix(ids.carla!).progress).toMatchObject({ missionsCompleted: 0, percent: 0 })
    // Las medias, de quienes participan: Carla está sin estrenar.
    expect(matrix.summary.averages).toEqual({ missionsCompleted: 0.5, percent: 30 })
  })

  it('la variante por estudiante da lo mismo que la matriz, también lo pendiente', async () => {
    for (const studentId of [f.users.student.id, ids.bea!, ids.carla!]) {
      const byClass = await studentProgressByClass(studentId, [f.classId])
      expect(byClass.get(f.classId)).toEqual(inMatrix(studentId).progress)
    }
    // Una clase sin nada, en vez de faltar.
    const empty = await studentProgressByClass(f.users.student.id, [f.otherClassId])
    expect(empty.get(f.otherClassId)).toMatchObject({ missionsCounted: 0, percent: null })
    expect((await studentProgressByClass(f.users.student.id, [])).size).toBe(0)
  })

  it('las misiones que cuentan por clase, como la matriz; una clase sin ninguna no sale', async () => {
    const counted = await countedMissionsByClass([f.classId, f.otherClassId])
    expect(counted.get(f.classId)).toBe(matrix.summary.missionsCounted)
    expect(counted.has(f.otherClassId)).toBe(false)
    expect((await countedMissionsByClass([])).size).toBe(0)
  })

  it('ni la variante por estudiante ni las que cuentan lanzan una consulta por clase', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const counted = new PrismaClient({
      adapter: new PrismaPg(pool),
      log: [{ emit: 'event', level: 'query' }],
    })
    let queries = 0
    counted.$on('query', () => {
      queries += 1
    })
    const measure = async (run: (db: Prisma.TransactionClient) => Promise<unknown>) => {
      queries = 0
      await run(counted)
      return queries
    }
    try {
      const student = f.users.student.id
      const oneStudent = await measure(db => studentProgressByClass(student, [f.classId], { db }))
      const twoStudent = await measure(db =>
        studentProgressByClass(student, [f.classId, secondClassId, f.otherClassId], { db })
      )
      expect(twoStudent).toBe(oneStudent)
      expect(oneStudent).toBeLessThanOrEqual(8)

      const oneCounted = await measure(db => countedMissionsByClass([f.classId], db))
      const twoCounted = await measure(db =>
        countedMissionsByClass([f.classId, secondClassId, f.otherClassId], db)
      )
      expect(twoCounted).toBe(oneCounted)
      expect(oneCounted).toBe(1)
    } finally {
      await counted.$disconnect()
      await pool.end()
    }
  })

  it('la ficha es el índice de sus clases: una fila con «X de N» y el nivel, y nada más', async () => {
    const { student } = await get('owner', `/teacher/students/${f.users.student.id}`)
    const cls = student.classes.find((c: { id: string }) => c.id === f.classId)
    expect(cls).toMatchObject({
      archived: false,
      missionsCompleted: 1,
      missionsCounted: 4,
      level: expect.any(Number),
      myAccess: expect.objectContaining({ isOwner: true }),
    })
    expect(Object.keys(cls).sort()).toEqual(
      [
        'archived',
        'avatar',
        'id',
        'level',
        'missionsCompleted',
        'missionsCounted',
        'myAccess',
        'name',
        'nickname',
      ].sort()
    )
    // La otra clase: 1 de 2, con 1 de 2 obligatorios. En total, 3 de 7 obligatorios.
    expect(student.stats).toEqual({
      totalClasses: 2,
      missionsCompleted: 2,
      missionsCounted: 6,
      percent: 43,
    })
    expect(student).not.toHaveProperty('recentMissions')
  })

  it('el detalle de misión: un estado por estudiante, sin negativos ni gente de fuera', async () => {
    const stats = async (mission: string) =>
      (await get('owner', `/missions/${ids[mission]}`)).mission.teacherStats
    // Antes: 4 filas de progreso sobre 3 estudiantes daban «sin empezar» −1.
    expect(await stats('M1')).toEqual({
      totalStudents: 3,
      completed: 1,
      inProgress: 1,
      notStarted: 1,
      expired: 0,
      pathLocked: 0,
      excluded: 0,
      // De quienes participan: 100 y 50, sin la cuenta sin estrenar.
      avgProgress: 75,
    })
    expect(await stats('M6')).toMatchObject({
      completed: 0,
      inProgress: 1,
      notStarted: 2,
      avgProgress: 0,
    })
    expect(await stats('M4 caducada')).toMatchObject({ expired: 3, notStarted: 0 })
    expect(await stats('M5 camino')).toMatchObject({ pathLocked: 2, notStarted: 1 })
    // La bloqueada no le cuenta a nadie, salvo a quien ya la tenía.
    expect(await stats('M2 bloqueada')).toMatchObject({ completed: 1, excluded: 2, avgProgress: 50 })
    expect(await stats('M3 sin enigmas')).toMatchObject({ excluded: 3, avgProgress: null })
  })

  it('el detalle de misión sigue cerrando la rareza si la completó alguien que ya no está', async () => {
    const { mission } = await get('owner', `/missions/${ids.M6}`)
    expect(mission.teacherStats.completed).toBe(0)
    expect(mission.rarityLocked).toBe(true)
  })

  it('el detalle de misión: por revisar, solo de su alumnado y sin las atascadas', async () => {
    const { mission } = await get('owner', `/missions/${ids['M4 caducada']}`)
    // Las dos entregas son de la vista previa y de quien no está.
    expect(mission.enigmas[0].pendingSubmissions).toBe(0)
    const m1 = (await get('owner', `/missions/${ids.M1}`)).mission
    expect(m1.enigmas.find((e: { id: string }) => e.id === ids.m1a).pendingSubmissions).toBe(0)
    const m6 = (await get('owner', `/missions/${ids.M6}`)).mission
    expect(m6.enigmas[0].pendingSubmissions).toBe(1)
  })

  it('/teacher/missions: completadas, sin la vista previa ni otras clases', async () => {
    const { missions } = await get('owner', `/teacher/missions?classIdFilter=${f.classId}`)
    const byId = new Map(missions.map((m: { id: string }) => [m.id, m]))
    expect(byId.get(ids.M1)).toMatchObject({ completedCount: 1, totalStudents: 3 })
    expect(byId.get(ids.M6)).toMatchObject({ completedCount: 0, totalStudents: 3 })
    // Lo mismo que la pestaña de misiones de la clase.
    const tab = await get('owner', `/teacher/classes/${f.classId}/missions`)
    for (const mission of tab.missions) {
      expect(byId.get(mission.id)).toMatchObject({ completedCount: mission.completedCount })
    }
    const counted = tab.missions.filter((m: { counted: boolean }) => m.counted)
    expect(counted).toHaveLength(4)
  })

  it('las clases: las misiones que cuentan, sin medias que nadie pinta', async () => {
    const list = await get('owner', '/teacher/classes')
    const inList = list.classes.find((c: { id: string }) => c.id === f.classId)
    expect(inList.stats).toEqual({ missionsCounted: 4 })
    expect(inList).toMatchObject({ studentCount: 3, missionCount: 6 })

    const detail = await get('owner', `/teacher/classes/${f.classId}`)
    expect(detail.stats ?? detail.class.stats).toEqual({
      missionsCounted: 4,
      // Solo la entrega de Bea: ni la atascada, ni la vista previa, ni quien no está.
      pendingReviews: 1,
    })
    expect(await countClassesAwaitingReview({ id: f.classId })).toBe(matrix.summary.pendingReviews)
  })

  it('«Mi progreso» del alumnado: «X de N» y el %, sin máximo de XP ni el % de antes', async () => {
    const { summary } = await get('student', `/students/classes/${f.classId}/progress`)
    expect(summary).toMatchObject({
      missionsCompleted: 1,
      missionsCounted: 4,
      percent: 40,
      extra: { approved: 1, total: 1 },
    })
    for (const gone of ['completionRate', 'missionsTotal', 'xpTotal', 'enigmasTotal']) {
      expect(summary).not.toHaveProperty(gone)
    }
    // La portada de la clase ya no lleva su resumen: nadie lo leía.
    const { class: cls } = await get('student', `/students/classes/${f.classId}`)
    expect(cls).not.toHaveProperty('studentProgress')
    expect(cls.missionCount).toBe(6)
  })

  it('la tarjeta de cada clase del alumnado: «X de N», lo mismo que «Mi progreso»', async () => {
    const { classes } = await get('student', '/students/classes')
    const card = classes.find((c: { id: string }) => c.id === f.classId)
    const { summary } = await get('student', `/students/classes/${f.classId}/progress`)
    expect(card.progress).toEqual({ missionsCompleted: 1, missionsCounted: 4 })
    expect(card.progress.missionsCompleted).toBe(summary.missionsCompleted)
    expect(card.progress.missionsCounted).toBe(summary.missionsCounted)
  })

  it('la clasificación: N son las que cuentan, X solo de esas, y el % no viaja en las filas', async () => {
    const body = await get('owner', `/teacher/classes/${f.classId}/ranking`)
    const alumna = body.ranking.find((r: { id: string }) => r.id === f.users.student.id)
    expect(alumna).toMatchObject({ missionsCompleted: 1, missionsTotal: 4 })
    expect(alumna).not.toHaveProperty('completionPercent')
    expect(alumna).not.toHaveProperty('percent')
    // La cuenta sin estrenar no participa: las medias son de quienes quedan.
    expect(body.stats).toMatchObject({
      avgProgress: 30,
      avgMissions: 0.5,
      missionsTotal: 4,
      totalStudents: 2,
    })
    // Las medias, solo el profesorado: el alumnado recibe la comparación anónima.
    const asStudent = await get('student', `/students/classes/${f.classId}/ranking`)
    expect(asStudent).not.toHaveProperty('stats')
  })

  it('el listado de Alumnado: los opcionales no cuentan, tampoco en los tramos ni en el orden', async () => {
    const { students } = await get('owner', `/teacher/students?classId=${f.classId}&sort=progress-desc`)
    expect(students.map((s: { id: string }) => s.id)).toEqual([
      f.users.student.id,
      ids.bea,
      ids.carla,
    ])
    const alumna = students[0]
    expect(alumna).toMatchObject({
      totalMissionsCompleted: 1,
      totalMissionsCounted: 4,
      overallProgress: 40,
    })
    expect(alumna.classProgress[0]).toMatchObject({
      missionsCompleted: 1,
      missionsCounted: 4,
      percent: 40,
    })
    for (const gone of ['totalXpAvailable', 'classTotalXp', 'totalMissionsAvailable']) {
      expect(alumna).not.toHaveProperty(gone)
    }
    // Los tramos, con la cifra de la barra: 1 de 4 (25 %) y 0 de 4. El 20 % de enigmas de
    // Bea no la saca del primero, porque no ha completado ninguna misión.
    const good = await get('owner', `/teacher/students?classId=${f.classId}&progress=progress`)
    expect(good.students.map((s: { id: string }) => s.id)).toEqual([f.users.student.id])
    const initial = await get('owner', `/teacher/students?classId=${f.classId}&progress=initial`)
    expect(initial.students.map((s: { id: string }) => s.id).sort()).toEqual([ids.bea, ids.carla].sort())
  })

  it('el listado de Alumnado: al ordenar por progreso, las barras salen escalonadas', async () => {
    // Muchos enigmas y ninguna misión completada, frente a una misión completada: manda
    // lo que dibuja la barra, no el % de enigmas.
    const id = await newClass(`Escalones ${tag}`)
    const [ana, eva] = [await newStudent('ana-esc'), await newStudent('eva-esc')]
    await prisma.classEnrollment.createMany({
      data: [
        { classId: id, studentId: ana },
        { classId: id, studentId: eva },
      ],
    })
    await newMission(id, `E1 ${tag}`, [{ label: 'e1a' }])
    await newMission(id, `E2 ${tag}`, [{ label: 'e2a' }, { label: 'e2b' }, { label: 'e2c' }])
    await prisma.studentEnigmaProgress.createMany({
      data: [
        { studentId: ana, enigmaId: ids.e2a! },
        { studentId: ana, enigmaId: ids.e2b! },
        { studentId: eva, enigmaId: ids.e1a! },
      ],
    })
    await prisma.studentMissionProgress.create({
      data: { studentId: eva, missionId: ids[`E1 ${tag}`]!, enigmasCompleted: 1, completedAt: new Date() },
    })
    const sorted = async (sort: string) =>
      (await get('owner', `/teacher/students?classId=${id}&sort=${sort}`)).students
    const desc = await sorted('progress-desc')
    expect(desc.map((s: { id: string }) => s.id)).toEqual([eva, ana])
    expect(desc[0].overallProgress).toBeLessThan(desc[1].overallProgress)
    expect((await sorted('progress-asc')).map((s: { id: string }) => s.id)).toEqual([ana, eva])
  })

  it('el listado de Alumnado: quien no tiene misiones que cuenten no cae en ningún tramo y va al final', async () => {
    // Una clase sin misiones: nadie tiene cifra, y eso no es un 0.
    const emptyId = await newClass(`Vacía ${tag}`)
    await prisma.classEnrollment.createMany({
      data: [
        { classId: emptyId, studentId: ids.bea! },
        { classId: emptyId, studentId: ids.carla! },
      ],
    })
    const noMissions = await get('owner', `/teacher/students?classId=${emptyId}`)
    expect(noMissions.students.map((s: { overallProgress: number | null }) => s.overallProgress)).toEqual([
      null,
      null,
    ])
    const inRange = await get('owner', `/teacher/students?classId=${emptyId}&progress=initial`)
    expect(inRange.students).toEqual([])

    // Con y sin misiones: quien no las tiene va detrás, en los dos sentidos.
    const dani = await newStudent('dani')
    await prisma.classEnrollment.create({ data: { classId: emptyId, studentId: dani } })
    const daniMission = `D1 ${tag}`
    await newMission(f.classId, daniMission, [{ label: 'd1a' }])
    await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: dani } })
    try {
      for (const sort of ['progress-asc', 'progress-desc']) {
        const { students } = await get('owner', `/teacher/students?archived=active&sort=${sort}&limit=100`)
        const counted = students.map((s: { totalMissionsCounted: number }) => s.totalMissionsCounted)
        const firstEmpty = counted.indexOf(0)
        if (firstEmpty !== -1) {
          expect(counted.slice(firstEmpty).every((n: number) => n === 0)).toBe(true)
        }
      }
    } finally {
      await prisma.classEnrollment.deleteMany({ where: { classId: f.classId, studentId: dani } })
      await prisma.mission.delete({ where: { id: ids[daniMission]! } })
    }
  })

  it('todas las pantallas dicen lo mismo de la misma persona', async () => {
    const id = f.users.student.id
    const { progress } = inMatrix(id)
    const { summary } = await get('student', `/students/classes/${f.classId}/progress`)
    const ranking = await get('student', `/students/classes/${f.classId}/ranking`)
    const row = ranking.me
    const ficha = (await get('owner', `/teacher/students/${id}`)).student.classes.find(
      (c: { id: string }) => c.id === f.classId
    )
    const listed = (await get('owner', `/teacher/students?classId=${f.classId}`)).students.find(
      (s: { id: string }) => s.id === id
    )
    const list = (await get('student', `/students/classes/${f.classId}/missions`)).missions
    const onMap = list.filter((m: { counted: boolean }) => m.counted)
    const completedOnMap = onMap.filter((m: { status: string }) => m.status === 'completada')

    for (const [done, total] of [
      [summary.missionsCompleted, summary.missionsCounted],
      [row.missionsCompleted, row.missionsTotal],
      [ficha.missionsCompleted, ficha.missionsCounted],
      [listed.totalMissionsCompleted, listed.totalMissionsCounted],
      [completedOnMap.length, onMap.length],
    ]) {
      expect([done, total]).toEqual([progress.missionsCompleted, progress.missionsCounted])
    }
    expect([summary.percent, listed.overallProgress]).toEqual([progress.percent, progress.percent])
  })
})
