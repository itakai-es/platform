import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Bloque 4, D1: el núcleo de recursos (aplicar un comportamiento a uno o a
 * varios, recompensas libres) y la asistencia. Lo que se fija aquí: saldos
 * atómicos con suelo 0, insignias del sistema al cruzar un umbral, maná, la
 * vista previa y las clases archivadas fuera, el lote todo o nada agrupado en
 * el historial, y la lista de asistencia idempotente, con su ciclo de vida.
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

vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  deleteUpload: vi.fn(async () => {}),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'

describeWithDatabase('aula: recursos en lote y asistencia', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const extraUsers: string[] = []
  const badgeIds: string[] = []
  /** Segundo y tercer estudiante de la clase. */
  let s2: string
  let s3: string

  type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
  const send = (method: Method, url: string, token: string, payload?: unknown) =>
    app.inject({
      method,
      url,
      payload: payload as Record<string, unknown> | undefined,
      headers: { authorization: `Bearer ${token}` },
    })
  const owner = () => f.token('owner')
  const c = () => `/teacher/classes/${f.classId}`

  const newStudent = async (label: string, classId?: string, isPreview = false) => {
    const user = await prisma.user.create({
      data: {
        email: `${label}.${tag}@test.invalid`,
        passwordHash: 'x',
        name: `${label} ${tag}`,
        role: 'student',
        isOnboarded: true,
      },
    })
    extraUsers.push(user.id)
    if (classId) await prisma.classEnrollment.create({ data: { classId, studentId: user.id, isPreview } })
    return user.id
  }

  const enrollment = (studentId: string) =>
    prisma.classEnrollment.findUniqueOrThrow({
      where: { studentId_classId: { studentId, classId: f.classId } },
    })

  /** Un profesor añadido a la clase con un nivel; devuelve su token. */
  const coTokens = new Map<string, string>()
  const coTeacher = async (access: 'read' | 'edit') => {
    const cached = coTokens.get(access)
    if (cached) return cached
    const user = await prisma.user.create({
      data: {
        email: `co-${access}.${tag}@test.invalid`,
        passwordHash: 'x',
        name: `Co ${access} ${tag}`,
        role: 'teacher',
        isOnboarded: true,
      },
    })
    extraUsers.push(user.id)
    await prisma.classTeacher.create({
      data: {
        classId: f.classId,
        userId: user.id,
        access,
        profile: access === 'read' ? 'practicas' : 'sustituto',
        addedById: f.users.owner.id,
      },
    })
    const token = app.jwt.sign({ id: user.id, role: 'teacher' })
    coTokens.set(access, token)
    return token
  }

  beforeAll(async () => {
    app = await buildApp(async a => {
      await a.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)
    s2 = await newStudent('s2', f.classId)
    s3 = await newStudent('s3', f.classId)
  })

  afterAll(async () => {
    await prisma.badge.deleteMany({ where: { id: { in: badgeIds } } })
    await f.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: extraUsers } } })
    await app.close()
  })

  describe('núcleo de recursos', () => {
    it('aplicar suma por incremento: una compra a la vez no se pierde', async () => {
      const behavior = await prisma.behaviorTemplate.create({
        data: { classId: f.classId, kind: 'positive', name: `Coins ${tag}`, coinDelta: 5 },
      })
      await prisma.classEnrollment.update({
        where: { id: (await enrollment(f.users.student.id)).id },
        data: { coins: 10 },
      })
      // La tienda resta con `decrement` dentro de su transacción. Aquí la compra
      // se queda abierta (fila bloqueada, sin confirmar) mientras se aplica: un
      // «leer el saldo y escribir el total» leería 10 y escribiría 15, y la
      // compra se perdería; con `increment`, el UPDATE espera y suma sobre 7.
      let release!: () => void
      const held = new Promise<void>(resolve => (release = resolve))
      let locked!: () => void
      const hasLock = new Promise<void>(resolve => (locked = resolve))
      const purchase = prisma.$transaction(async tx => {
        await tx.classEnrollment.update({
          where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
          data: { coins: { decrement: 3 } },
        })
        locked()
        await held
      })
      await hasLock
      const applying = send('POST', `${c()}/behaviors/${behavior.id}/apply`, owner(), {
        studentId: f.users.student.id,
      })
      await new Promise(resolve => setTimeout(resolve, 300))
      release()
      const [applied] = await Promise.all([applying, purchase])
      expect(applied.statusCode).toBe(200)
      expect((await enrollment(f.users.student.id)).coins).toBe(12)
    })

    it('el maná va con el comportamiento y un negativo se queda en 0', async () => {
      const created = await send('POST', `${c()}/behaviors`, owner(), {
        kind: 'negative',
        name: `Maná ${tag}`,
        mana: 50,
        coins: 50,
      })
      expect(created.statusCode).toBe(201)
      expect(created.json().mana).toBe(50)
      await prisma.classEnrollment.update({
        where: { id: (await enrollment(s2)).id },
        data: { mana: 20, coins: 4 },
      })
      const res = await send('POST', `${c()}/behaviors/${created.json().id}/apply`, owner(), {
        studentId: s2,
      })
      expect(res.statusCode).toBe(200)
      const after = await enrollment(s2)
      expect(after.mana).toBe(0)
      expect(after.coins).toBe(0)
      expect(res.json().application.manaDelta).toBe(-50)
    })

    it('cruzar un umbral de XP da la insignia del sistema', async () => {
      const badge = await prisma.badge.create({
        data: { name: `Umbral ${tag}`, triggerType: 'xp_total', triggerValue: 987_650 },
      })
      badgeIds.push(badge.id)
      const student = await newStudent('umbral', f.classId)
      await prisma.classEnrollment.update({
        where: { studentId_classId: { studentId: student, classId: f.classId } },
        data: { xp: 987_645 },
      })
      const res = await send('POST', `${c()}/rewards`, owner(), {
        studentIds: [student],
        xp: 10,
        reason: 'Gran trabajo',
      })
      expect(res.statusCode).toBe(200)
      expect(
        await prisma.studentBadge.count({ where: { studentId: student, badgeId: badge.id } })
      ).toBe(1)
    })

    it('la vista previa del profesorado no recibe nada', async () => {
      const preview = await newStudent('preview', f.classId, true)
      const behavior = await f.newBehavior()
      const one = await send('POST', `${c()}/behaviors/${behavior}/apply`, owner(), {
        studentId: preview,
      })
      expect(one.statusCode).toBe(400)
      const many = await send('POST', `${c()}/behaviors/${behavior}/apply-many`, owner(), {
        studentIds: [s2, preview],
      })
      expect(many.statusCode).toBe(400)
    })

    it('en una clase archivada no se aplica nada ni se pasa lista', async () => {
      const behavior = await f.newBehavior()
      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      try {
        const res = await send('POST', `${c()}/behaviors/${behavior}/apply`, owner(), {
          studentId: s2,
        })
        expect(res.statusCode).toBe(409)
        const list = await send('PUT', `${c()}/attendance/sessions`, owner(), {
          date: '2026-10-01',
          startTime: '',
          records: [],
        })
        expect(list.statusCode).toBe(409)
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      }
    })
  })

  describe('lote y recompensas', () => {
    it('dos lotes a la vez con la misma gente en otro orden no se bloquean', async () => {
      const behavior = await f.newBehavior()
      const ids = [
        await newStudent('orden1', f.classId),
        await newStudent('orden2', f.classId),
        await newStudent('orden3', f.classId),
        await newStudent('orden4', f.classId),
      ]
      const [a, b] = await Promise.all([
        send('POST', `${c()}/behaviors/${behavior}/apply-many`, owner(), { studentIds: ids }),
        send('POST', `${c()}/behaviors/${behavior}/apply-many`, owner(), {
          studentIds: [...ids].reverse(),
        }),
      ])
      expect([a.statusCode, b.statusCode]).toEqual([200, 200])
      // La respuesta sigue el orden pedido.
      expect(b.json().students.map((r: { studentId: string }) => r.studentId)).toEqual(
        [...ids].reverse()
      )
      for (const id of ids) expect((await enrollment(id)).xp).toBe(10)
    })

    it('aplicar a varios: todo o nada, y una sola línea agrupada en el historial', async () => {
      const behavior = await f.newBehavior()
      const before = await enrollment(s3)
      const outsider = await send('POST', `${c()}/behaviors/${behavior}/apply-many`, owner(), {
        studentIds: [s3, f.users.outsider.id],
      })
      expect(outsider.statusCode).toBe(400)
      expect((await enrollment(s3)).xp).toBe(before.xp)

      const res = await send('POST', `${c()}/behaviors/${behavior}/apply-many`, owner(), {
        studentIds: [f.users.student.id, s2, s3],
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().count).toBe(3)
      expect((await enrollment(s3)).xp).toBe(before.xp + 5)

      const history = await send('GET', `${c()}/history?type=behavior&limit=50`, owner())
      expect(history.statusCode).toBe(200)
      const entries = history.json().entries as {
        params: { batchId?: string }
        batch: { size: number; targets: { name: string | null }[] } | null
      }[]
      const batchId = res.json().batchId
      const ofBatch = entries.filter(e => e.params.batchId === batchId)
      expect(ofBatch).toHaveLength(1)
      expect(ofBatch[0].batch?.size).toBe(3)
      expect(ofBatch[0].batch?.targets).toHaveLength(3)
      // Las entradas sueltas (sin lote) siguen saliendo.
      expect(entries.some(e => !e.params.batchId)).toBe(true)
    })

    it('recompensa libre: da y quita con suelo 0, con motivo y fuera del recuento de comportamientos', async () => {
      await prisma.classEnrollment.update({
        where: { id: (await enrollment(s3)).id },
        data: { coins: 2 },
      })
      const res = await send('POST', `${c()}/rewards`, owner(), {
        studentIds: [s3],
        coins: -5,
        xp: 3,
        reason: 'Material olvidado',
      })
      expect(res.statusCode).toBe(200)
      expect((await enrollment(s3)).coins).toBe(0)
      const log = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'reward.granted', targetUserId: s3 },
        orderBy: { createdAt: 'desc' },
      })
      expect((log.metadata as { title: string }).title).toBe('Material olvidado')

      const list = await send('GET', `${c()}/students`, owner())
      const row = (list.json().students as { id: string; positiveBehaviors: number }[]).find(
        s => s.id === s3
      )
      const behaviors = await prisma.behaviorApplication.count({
        where: { classId: f.classId, studentId: s3, kind: { not: 'reward' } },
      })
      expect(row?.positiveBehaviors).toBe(behaviors)

      // Si solo quita, el muro no lo llama recompensa.
      const taken = await send('POST', `${c()}/rewards`, owner(), {
        studentIds: [s3],
        coins: -1,
        reason: 'Solo quita',
      })
      expect(taken.statusCode).toBe(200)
      const wall = await prisma.activity.findFirstOrThrow({
        where: { classId: f.classId, userId: s3, source: 'Solo quita' },
      })
      expect(wall.description).toBe('Se le quitaron recursos: "Solo quita"')

      const nothing = await send('POST', `${c()}/rewards`, owner(), {
        studentIds: [s3],
        reason: 'Sin nada',
      })
      expect(nothing.statusCode).toBe(400)
    })

    it('prácticas no aplica en lote ni da recompensas', async () => {
      const read = await coTeacher('read')
      const behavior = await f.newBehavior()
      expect(
        (
          await send('POST', `${c()}/behaviors/${behavior}/apply-many`, read, {
            studentIds: [s2],
          })
        ).statusCode
      ).toBe(403)
      expect(
        (await send('POST', `${c()}/rewards`, read, { studentIds: [s2], xp: 1, reason: 'x' }))
          .statusCode
      ).toBe(403)
    })
  })

  describe('asistencia', () => {
    const day = '2026-10-05'
    const save = (token: string, records: { studentId: string; status: string }[], startTime = '') =>
      send('PUT', `${c()}/attendance/sessions`, token, { date: day, startTime, records })

    it('guardar dos veces la misma sesión sin hora no la duplica', async () => {
      const records = [
        { studentId: f.users.student.id, status: 'present' },
        { studentId: s2, status: 'absent' },
        { studentId: s3, status: 'excused' },
      ]
      const first = await save(owner(), records)
      expect(first.statusCode).toBe(200)
      expect(first.json().created).toBe(true)
      const second = await save(owner(), records)
      expect(second.json().created).toBe(false)
      expect(
        await prisma.attendanceSession.count({ where: { classId: f.classId, startTime: '' } })
      ).toBe(1)
      expect(second.json().session.counts).toEqual({ present: 1, absent: 1, late: 0, excused: 1 })

      const current = await send('GET', `${c()}/attendance/current?date=${day}`, owner())
      expect(current.json().absentStudentIds.sort()).toEqual([s2, s3].sort())
      const none = await send('GET', `${c()}/attendance/current?date=2026-10-06`, owner())
      expect(none.json().session).toBeNull()
    })

    it('la vista previa no entra en la lista', async () => {
      const preview = await prisma.classEnrollment.findFirstOrThrow({
        where: { classId: f.classId, isPreview: true },
      })
      const res = await save(owner(), [{ studentId: preview.studentId, status: 'present' }], '09:00')
      expect(res.statusCode).toBe(400)
    })

    it('prácticas ve la asistencia, pero no pasa lista ni descarga el CSV', async () => {
      const read = await coTeacher('read')
      expect((await send('GET', `${c()}/attendance?date=${day}`, read)).statusCode).toBe(200)
      expect(
        (await send('GET', `${c()}/attendance/summary?from=2026-10-01&to=2026-10-31`, read))
          .statusCode
      ).toBe(200)
      expect((await save(read, [])).statusCode).toBe(403)
      expect(
        (await send('GET', `${c()}/attendance/export?from=2026-10-01&to=2026-10-31`, read))
          .statusCode
      ).toBe(403)
    })

    it('histórico por estudiante con recuentos y porcentaje', async () => {
      await save(owner(), [
        { studentId: f.users.student.id, status: 'late' },
        { studentId: s2, status: 'present' },
      ], '12:00')
      const res = await send(
        'GET',
        `${c()}/attendance/summary?from=2026-10-01&to=2026-10-31`,
        owner()
      )
      expect(res.statusCode).toBe(200)
      const s2Row = (res.json().students as { studentId: string; total: number; rate: number }[])
        .find(s => s.studentId === s2)
      expect(s2Row?.total).toBe(2)
      expect(s2Row?.rate).toBe(50)
    })

    it('sacar a alguien de la clase borra su asistencia; borrar la sesión, la lista', async () => {
      const leaving = await newStudent('leaving', f.classId)
      const saved = await save(owner(), [{ studentId: leaving, status: 'absent' }], '15:00')
      const enrollmentId = (
        await prisma.classEnrollment.findUniqueOrThrow({
          where: { studentId_classId: { studentId: leaving, classId: f.classId } },
        })
      ).id
      expect(await prisma.attendanceRecord.count({ where: { enrollmentId } })).toBe(1)
      await prisma.classEnrollment.delete({ where: { id: enrollmentId } })
      expect(await prisma.attendanceRecord.count({ where: { enrollmentId } })).toBe(0)

      const del = await send(
        'DELETE',
        `${c()}/attendance/sessions/${saved.json().session.id}`,
        owner()
      )
      expect(del.statusCode).toBe(200)
      expect(
        await prisma.classActionLog.count({
          where: { classId: f.classId, action: 'attendance.deleted' },
        })
      ).toBe(1)
    })

    it('fechas imposibles fuera', async () => {
      const res = await send('GET', `${c()}/attendance?date=2026-02-30`, owner())
      expect(res.statusCode).toBe(400)
    })
  })
})
