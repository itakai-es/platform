import { it, expect, vi, beforeAll, afterAll, beforeEach, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * El alumnado de una clase visto desde el profesorado: dar de alta varias
 * cuentas de una vez (con revisión previa de la lista), cambiar el alias de un
 * alumno en la clase y quitarlo de ella sin tocar lo que tenga en otras.
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
import { deleteUpload } from '../../src/modules/storage/storage.service.js'
import { recordRateLimit, resetRateLimits } from '../../src/utils/rate-limit.js'

describeWithDatabase('alumnado de una clase', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  /** Usuarios creados aquí, fuera de la fixture. */
  const extraUsers = new Set<string>()

  type Who = { id: string; role: string | null }
  const send = (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    actor?: Who,
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: actor ? { authorization: `Bearer ${app.jwt.sign(actor)}` } : {},
    })

  const importUrl = (classId: string, dryRun = false) =>
    `/teacher/classes/${classId}/students/import${dryRun ? '?dryRun=true' : ''}`

  /** Da al otro profesor un nivel en la clase del propietario, y lo quita al acabar. */
  const withOtherAt = async (access: 'read' | 'edit' | 'admin', run: () => Promise<void>) => {
    await prisma.classTeacher.create({
      data: {
        classId: f.classId,
        userId: f.users.other.id,
        access,
        profile: 'sustituto',
        addedById: f.users.owner.id,
      },
    })
    try {
      await run()
    } finally {
      await prisma.classTeacher.delete({
        where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
      })
    }
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)
  })

  beforeEach(() => {
    resetRateLimits()
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: [...extraUsers] } } })
    await app?.close()
  })

  // ==================== VARIAS ALTAS ====================

  describe('alta de varias cuentas', () => {
    it('la revisión dice el estado de cada fila y no crea nada', async () => {
      const taken = `ocupado.${tag.slice(0, 5)}`
      const existing = await prisma.user.create({
        data: { username: taken, passwordHash: 'x', name: 'Ya existe', role: 'student' },
      })
      extraUsers.add(existing.id)
      const before = await prisma.user.count({ where: { createdById: f.users.owner.id } })

      const response = await send('POST', importUrl(f.classId, true), f.users.owner, {
        students: [
          { name: `Ana Gómez ${tag}` },
          { name: '   ' },
          { name: `  ana   gómez ${tag.toUpperCase()} ` },
          { name: `Luis Pérez ${tag}`, username: taken.toUpperCase() },
          { name: `Marta ${tag}`, username: 'marta gómez' },
          { name: 'M' },
          { name: `Otro ${tag}`, username: `libre.${tag.slice(0, 5)}` },
          { name: `Repite usuario ${tag}`, username: `libre.${tag.slice(0, 5)}` },
        ],
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.dryRun).toBe(true)
      expect(body.canCreate).toBe(false)
      expect(body.rows.map((r: { status: string }) => r.status)).toEqual([
        'ok',
        'empty_name',
        'duplicate',
        'username_taken',
        'invalid_username',
        'invalid_name',
        'ok',
        'duplicate',
      ])

      // Sin usuario escrito, se propone uno libre.
      expect(body.rows[0].username).toMatch(/^ana\.g\.[a-z0-9]{2}$/)
      // Con el escrito ocupado, se propone el mismo con un sufijo.
      expect(body.rows[3].requestedUsername).toBe(taken)
      expect(body.rows[3].username.startsWith(`${taken}.`)).toBe(true)
      // Los que no se pueden crear no llevan usuario.
      expect(body.rows[1].username).toBe('')

      expect(await prisma.user.count({ where: { createdById: f.users.owner.id } })).toBe(before)
    })

    it('crea todas las cuentas de una vez, matriculadas y con su contraseña temporal', async () => {
      const names = [`Uno ${tag}`, `Dos ${tag}`, `Tres ${tag}`]
      const chosen = `tres.${tag.slice(0, 5)}`
      const response = await send('POST', importUrl(f.classId), f.users.owner, {
        students: [{ name: names[0] }, { name: names[1] }, { name: names[2], username: chosen }],
      })
      expect(response.statusCode).toBe(201)
      const created = response.json().created as {
        student: { id: string; name: string; username: string }
        temporaryPassword: string
      }[]
      expect(created.map(c => c.student.name)).toEqual(names)
      expect(created[2].student.username).toBe(chosen)
      for (const account of created) {
        expect(account.temporaryPassword).toHaveLength(8)
        const user = await prisma.user.findUniqueOrThrow({
          where: { id: account.student.id },
          include: { enrollments: true },
        })
        expect(user).toMatchObject({
          email: null,
          accountType: 'managed',
          mustChangePassword: true,
          homeClassId: f.classId,
          createdById: f.users.owner.id,
        })
        expect(user.enrollments.map(e => e.classId)).toEqual([f.classId])
        expect(user.passwordHash).not.toContain(account.temporaryPassword)
      }
      expect(
        await prisma.classActionLog.count({
          where: {
            classId: f.classId,
            action: 'student.account_created',
            targetUserId: { in: created.map(c => c.student.id) },
          },
        })
      ).toBe(3)
    })

    it('un usuario que se ocupa entre la revisión y el alta se cambia por otro con sufijo', async () => {
      const wanted = `carrera.${tag.slice(0, 5)}`
      const review = await send('POST', importUrl(f.classId, true), f.users.owner, {
        students: [{ name: `Carrera ${tag}`, username: wanted }],
      })
      expect(review.json().rows[0]).toMatchObject({ status: 'ok', username: wanted })

      const thief = await prisma.user.create({
        data: { username: wanted, passwordHash: 'x', name: 'Se adelanta', role: 'student' },
      })
      extraUsers.add(thief.id)

      const response = await send('POST', importUrl(f.classId), f.users.owner, {
        students: [{ name: `Carrera ${tag}`, username: wanted }],
      })
      expect(response.statusCode).toBe(201)
      expect(response.json().created[0].student.username.startsWith(`${wanted}.`)).toBe(true)
    })

    it('una lista con filas que no se pueden crear se rechaza entera, con su revisión', async () => {
      const before = await prisma.user.count({ where: { createdById: f.users.owner.id } })
      const response = await send('POST', importUrl(f.classId), f.users.owner, {
        students: [{ name: `Bien ${tag}` }, { name: '' }, { name: `Bien ${tag}` }],
      })
      expect(response.statusCode).toBe(400)
      expect(response.json().code).toBe('ROWS_WITH_ERRORS')
      expect(response.json().rows.map((r: { status: string }) => r.status)).toEqual([
        'ok',
        'empty_name',
        'duplicate',
      ])
      expect(await prisma.user.count({ where: { createdById: f.users.owner.id } })).toBe(before)
    })

    it('los nombres se guardan sin caracteres de control ni invisibles', async () => {
      const review = await send('POST', importUrl(f.classId, true), f.users.owner, {
        students: [
          { name: `Ana\u0000Bea ${tag}` },
          { name: '\u200b\u200b\u200b' },
          { name: `\u200eLuis\u200b  Pérez ${tag}` },
        ],
      })
      expect(review.statusCode).toBe(200)
      expect(
        review.json().rows.map((r: { name: string; status: string }) => [r.name, r.status])
      ).toEqual([
        [`AnaBea ${tag}`, 'ok'],
        ['', 'invalid_name'],
        [`Luis Pérez ${tag}`, 'ok'],
      ])

      const created = await send('POST', importUrl(f.classId), f.users.owner, {
        students: [{ name: `Ana\u0000Bea ${tag}` }],
      })
      expect(created.statusCode).toBe(201)
      const student = created.json().created[0].student
      expect(student.name).toBe(`AnaBea ${tag}`)
      extraUsers.add(student.id)
    })

    it('una lista rechazada gasta del cupo de revisiones, porque enseña la misma revisión', async () => {
      const payload = { students: [{ name: '' }, { name: `Sondeo ${tag}` }] }
      let last = 400
      for (let i = 0; i < 35 && last === 400; i++) {
        last = (await send('POST', importUrl(f.classId), f.users.owner, payload)).statusCode
      }
      expect(last).toBe(429)
      // Agotado por esta vía, tampoco se revisa en modo de prueba.
      expect(
        (await send('POST', importUrl(f.classId, true), f.users.owner, payload)).statusCode
      ).toBe(429)
    })

    it('el cupo de altas se aparta antes de crear y se devuelve si la lista no se crea', async () => {
      const key = `managed-student-create:${f.users.owner.id}`
      const limit = { max: 200, windowMs: 60 * 60 * 1000 }
      const list = (label: string, size: number) =>
        Array.from({ length: size }, (_, i) => ({ name: `${label} ${i} ${tag}` }))

      // Casi lleno: una lista rechazada no se queda con el hueco que apartó.
      recordRateLimit(key, limit, 170)
      const rejected = await send('POST', importUrl(f.classId), f.users.owner, {
        students: [...list('Rechazada', 29), { name: '' }],
      })
      expect(rejected.statusCode).toBe(400)

      // Dos listas a la vez que no caben juntas: entra una y la otra no.
      const responses = await Promise.all([
        send('POST', importUrl(f.classId), f.users.owner, { students: list('Primera', 20) }),
        send('POST', importUrl(f.classId), f.users.owner, { students: list('Segunda', 20) }),
      ])
      const codes = responses.map(r => r.statusCode).sort()
      expect(codes).toEqual([201, 429])
      for (const response of responses) {
        if (response.statusCode !== 201) continue
        for (const { student } of response.json().created) extraUsers.add(student.id)
      }
    })

    it('no admite una lista vacía ni de más de 50', async () => {
      expect(
        (await send('POST', importUrl(f.classId), f.users.owner, { students: [] })).statusCode
      ).toBe(400)
      const many = Array.from({ length: 51 }, (_, i) => ({ name: `Alumno ${i} ${tag}` }))
      expect(
        (await send('POST', importUrl(f.classId, true), f.users.owner, { students: many }))
          .statusCode
      ).toBe(400)
    })

    it('hace falta administración en la clase, que exista para quien pide y que no esté archivada', async () => {
      const payload = { students: [{ name: `Permisos ${tag}` }] }
      const before = await prisma.user.count({ where: { createdById: f.users.other.id } })

      expect((await send('POST', importUrl(f.classId), undefined, payload)).statusCode).toBe(401)
      expect((await send('POST', importUrl(f.classId), f.users.student, payload)).statusCode).toBe(
        403
      )
      // Clase ajena: como si no existiera.
      expect((await send('POST', importUrl(f.classId), f.users.other, payload)).statusCode).toBe(
        404
      )
      expect(
        (await send('POST', importUrl(f.classId, true), f.users.other, payload)).statusCode
      ).toBe(404)

      // Con edición no basta; con administración sí.
      await withOtherAt('edit', async () => {
        expect((await send('POST', importUrl(f.classId), f.users.other, payload)).statusCode).toBe(
          403
        )
      })
      await withOtherAt('admin', async () => {
        const created = await send('POST', importUrl(f.classId), f.users.other, payload)
        expect(created.statusCode).toBe(201)
        extraUsers.add(created.json().created[0].student.id)
      })
      expect(await prisma.user.count({ where: { createdById: f.users.other.id } })).toBe(before + 1)

      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      try {
        const archived = await send('POST', importUrl(f.classId), f.users.owner, payload)
        expect(archived.statusCode).toBe(400)
        expect(archived.json().code).toBe('CLASS_ARCHIVED')
        const review = await send('POST', importUrl(f.classId, true), f.users.owner, payload)
        expect(review.json().code).toBe('CLASS_ARCHIVED')
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      }
    })

    it('la revisión tiene límite de peticiones', async () => {
      const payload = { students: [{ name: `Límite ${tag}` }] }
      let last = 200
      for (let i = 0; i < 35 && last === 200; i++) {
        last = (await send('POST', importUrl(f.classId, true), f.users.owner, payload)).statusCode
      }
      expect(last).toBe(429)
    })
  })

  // ==================== LISTADO ====================

  it('el listado de la clase dice qué cuentas son sin correo y cuáles puede restablecer quien pregunta', async () => {
    const created = await send('POST', importUrl(f.classId), f.users.owner, {
      students: [{ name: `Listado ${tag}` }],
    })
    const managedId = created.json().created[0].student.id

    const rows = (await send('GET', `/teacher/classes/${f.classId}/students`, f.users.owner)).json()
      .students as { id: string; accountType: string; canResetPassword: boolean }[]
    expect(rows.find(r => r.id === managedId)).toMatchObject({
      accountType: 'managed',
      canResetPassword: true,
    })
    expect(rows.find(r => r.id === f.users.student.id)).toMatchObject({
      accountType: 'self',
      canResetPassword: false,
    })

    const detail = (await send('GET', `/teacher/students/${managedId}`, f.users.owner)).json()
      .student
    expect(detail).toMatchObject({
      accountType: 'managed',
      homeClassId: f.classId,
      canResetPassword: true,
    })
    expect(detail.classes[0]).toMatchObject({
      id: f.classId,
      archived: false,
      myAccess: { access: 'admin', isOwner: true },
    })
  })

  // ==================== ALIAS ====================

  describe('alias en la clase', () => {
    const url = (studentId: string, classId = f.classId) =>
      `/teacher/classes/${classId}/students/${studentId}`

    it('quien administra la clase lo cambia y queda registrado sin el alias', async () => {
      const response = await send('PATCH', url(f.users.student.id), f.users.owner, {
        nickname: '  Guardián   del Faro ',
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().nickname).toBe('Guardián del Faro')

      const enrollment = await prisma.classEnrollment.findUniqueOrThrow({
        where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
      })
      expect(enrollment.nickname).toBe('Guardián del Faro')

      const entry = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'student.nickname_changed' },
        orderBy: { createdAt: 'desc' },
      })
      expect(entry.targetUserId).toBe(f.users.student.id)
      expect(JSON.stringify(entry.metadata ?? {})).not.toContain('Guardián')
    })

    it('rechaza un alias vacío, invisible o demasiado largo', async () => {
      for (const nickname of ['   ', '\u200b\u200b', 'x'.repeat(21)]) {
        const response = await send('PATCH', url(f.users.student.id), f.users.owner, { nickname })
        expect(response.statusCode).toBe(400)
      }
      // Los caracteres de control se quitan: no llegan a la base.
      const cleaned = await send('PATCH', url(f.users.student.id), f.users.owner, {
        nickname: 'Ana\u0000Bea',
      })
      expect(cleaned.statusCode).toBe(200)
      expect(cleaned.json().nickname).toBe('AnaBea')
    })

    it('sin administración, en clase ajena o con quien no está en la clase, no cambia nada', async () => {
      const payload = { nickname: 'Intruso' }
      expect((await send('PATCH', url(f.users.student.id), undefined, payload)).statusCode).toBe(
        401
      )
      expect(
        (await send('PATCH', url(f.users.student.id), f.users.student, payload)).statusCode
      ).toBe(403)
      expect(
        (await send('PATCH', url(f.users.student.id), f.users.other, payload)).statusCode
      ).toBe(404)
      await withOtherAt('edit', async () => {
        expect(
          (await send('PATCH', url(f.users.student.id), f.users.other, payload)).statusCode
        ).toBe(403)
      })
      // Alumno que no está en la clase.
      expect(
        (await send('PATCH', url(f.users.outsider.id), f.users.owner, payload)).statusCode
      ).toBe(404)

      const enrollment = await prisma.classEnrollment.findUniqueOrThrow({
        where: { studentId_classId: { studentId: f.users.student.id, classId: f.classId } },
      })
      expect(enrollment.nickname).not.toBe('Intruso')
    })
  })

  // ==================== QUITAR DE LA CLASE ====================

  describe('quitar de la clase', () => {
    /**
     * Un alumno matriculado en la clase del propietario y en la del otro
     * profesor, con algo de todo en cada una. Devuelve cómo contar lo que tiene
     * en cada clase.
     */
    const studentWithHistory = async () => {
      const created = await send('POST', importUrl(f.classId), f.users.owner, {
        students: [{ name: `Historial ${tag}` }],
      })
      const studentId: string = created.json().created[0].student.id
      await prisma.classEnrollment.create({ data: { classId: f.otherClassId, studentId } })

      const seed = async (classId: string, teacherId: string) => {
        const missionId = await f.newMission(classId)
        const enigmaId = await f.newEnigma(missionId)
        const submission = await prisma.enigmaSubmission.create({
          data: { enigmaId, studentId, fileUrl: `/uploads/submissions/${randomUUID()}.pdf` },
        })
        await prisma.studentEnigmaProgress.create({ data: { studentId, enigmaId, xpEarned: 10 } })
        await prisma.studentMissionProgress.create({
          data: { studentId, missionId, progress: 100 },
        })
        const badge = await prisma.badge.create({
          data: { name: 'De misión', teacherId, missionId },
        })
        await prisma.studentBadge.create({ data: { studentId, badgeId: badge.id } })
        await prisma.shopPurchase.create({
          data: { classId, studentId, itemName: 'Premio', price: 5 },
        })
        await prisma.shopItemUse.create({
          data: { classId, studentId, itemName: 'Poder', manaCost: 3 },
        })
        await prisma.behaviorApplication.create({
          data: {
            classId,
            teacherId,
            studentId,
            kind: 'positive',
            name: 'Ayuda',
            xpDelta: 5,
            coinDelta: 0,
            lifeDelta: 0,
          },
        })
        await prisma.activity.create({
          data: { userId: studentId, type: 'xp_gained', description: 'XP', classId },
        })
        await prisma.chatConversation.create({
          data: { userId: studentId, assistantId: 'atenea', classId },
        })
        await prisma.notification.create({
          data: {
            userId: studentId,
            type: 'submission_reviewed',
            title: 'Revisada',
            message: 'Revisada',
            metadata: { classId, submissionId: submission.id },
          },
        })
        await prisma.notification.create({
          data: {
            userId: teacherId,
            type: 'submission_received',
            title: 'Nueva',
            message: 'Nueva',
            metadata: { classId, submissionId: submission.id },
          },
        })
        return { missionId, enigmaId, submissionId: submission.id, badgeId: badge.id }
      }

      const here = await seed(f.classId, f.users.owner.id)
      const there = await seed(f.otherClassId, f.users.other.id)

      const count = async (classId: string, ids: typeof here) => ({
        enrollment: await prisma.classEnrollment.count({ where: { studentId, classId } }),
        submissions: await prisma.enigmaSubmission.count({ where: { id: ids.submissionId } }),
        enigmaProgress: await prisma.studentEnigmaProgress.count({
          where: { studentId, enigmaId: ids.enigmaId },
        }),
        missionProgress: await prisma.studentMissionProgress.count({
          where: { studentId, missionId: ids.missionId },
        }),
        badges: await prisma.studentBadge.count({ where: { studentId, badgeId: ids.badgeId } }),
        purchases: await prisma.shopPurchase.count({ where: { studentId, classId } }),
        uses: await prisma.shopItemUse.count({ where: { studentId, classId } }),
        behaviors: await prisma.behaviorApplication.count({ where: { studentId, classId } }),
        activities: await prisma.activity.count({ where: { userId: studentId, classId } }),
        chats: await prisma.chatConversation.count({ where: { userId: studentId, classId } }),
        notifications: await prisma.notification.count({
          where: { metadata: { path: ['submissionId'], equals: ids.submissionId } },
        }),
      })

      return { studentId, here, there, count }
    }

    const url = (studentId: string, classId = f.classId) =>
      `/teacher/classes/${classId}/students/${studentId}`

    it('borra lo que el alumno tenía en esta clase y deja intacto lo de las demás', async () => {
      const { studentId, here, there, count } = await studentWithHistory()
      const before = await count(f.classId, here)
      const elsewhere = await count(f.otherClassId, there)
      // Hay de todo en las dos clases (más de uno donde el alta dejó su propia entrada).
      for (const value of [...Object.values(before), ...Object.values(elsewhere)]) {
        expect(value).toBeGreaterThanOrEqual(1)
      }
      vi.mocked(deleteUpload).mockClear()

      const response = await send('DELETE', url(studentId), f.users.owner)
      expect(response.statusCode).toBe(200)

      const nothing = Object.fromEntries(Object.keys(before).map(k => [k, 0]))
      expect(await count(f.classId, here)).toEqual(nothing)
      expect(await count(f.otherClassId, there)).toEqual(elsewhere)

      // El fichero de la entrega borrada también se va.
      expect(deleteUpload).toHaveBeenCalledTimes(1)

      // La cuenta sigue; como era su clase de origen, se queda sin ella.
      const user = await prisma.user.findUniqueOrThrow({ where: { id: studentId } })
      expect(user.homeClassId).toBeNull()

      const entry = await prisma.classActionLog.findFirstOrThrow({
        where: { classId: f.classId, action: 'student.removed', targetUserId: studentId },
      })
      expect(entry.actorId).toBe(f.users.owner.id)

      // Una segunda vez ya no está en la clase.
      expect((await send('DELETE', url(studentId), f.users.owner)).statusCode).toBe(404)

      // Y la cuenta se puede borrar después sin que nada lo impida.
      await prisma.user.delete({ where: { id: studentId } })
    })

    it('la clase de origen de una cuenta no cambia si se la quita de otra clase', async () => {
      const { studentId } = await studentWithHistory()
      await withOtherAt('admin', async () => {
        // El otro profesor administra las dos; quitarla de la suya no toca el origen.
        const response = await send('DELETE', url(studentId, f.otherClassId), f.users.other)
        expect(response.statusCode).toBe(200)
      })
      const user = await prisma.user.findUniqueOrThrow({ where: { id: studentId } })
      expect(user.homeClassId).toBe(f.classId)
      await prisma.user.delete({ where: { id: studentId } })
    })

    it('hace falta administración: con edición, en clase ajena o sin sesión no quita a nadie', async () => {
      const target = f.users.student.id
      expect((await send('DELETE', url(target), undefined)).statusCode).toBe(401)
      expect((await send('DELETE', url(target), f.users.student)).statusCode).toBe(403)
      expect((await send('DELETE', url(target), f.users.other)).statusCode).toBe(404)
      await withOtherAt('edit', async () => {
        expect((await send('DELETE', url(target), f.users.other)).statusCode).toBe(403)
      })
      expect(
        await prisma.classEnrollment.count({ where: { classId: f.classId, studentId: target } })
      ).toBe(1)
    })

    it('la matrícula de vista previa del profesorado no se quita por aquí', async () => {
      await prisma.classEnrollment.create({
        data: { classId: f.classId, studentId: f.users.owner.id, isPreview: true },
      })
      try {
        expect((await send('DELETE', url(f.users.owner.id), f.users.owner)).statusCode).toBe(404)
      } finally {
        await prisma.classEnrollment.deleteMany({
          where: { classId: f.classId, studentId: f.users.owner.id },
        })
      }
    })
  })

  // ==================== INVITACIONES ANTIGUAS ====================

  it('las invitaciones que queden en la base no impiden borrar al profesor ni al alumno', async () => {
    const mk = (label: string, role: 'teacher' | 'student') =>
      prisma.user.create({
        data: { username: `${label}.${tag}`, passwordHash: 'x', name: label, role },
      })
    const teacher = await mk('profe-inv', 'teacher')
    const student = await mk('alumno-inv', 'student')
    extraUsers.add(teacher.id).add(student.id)

    const invitation = await prisma.invitation.create({
      data: { classId: f.classId, teacherId: teacher.id, studentId: student.id },
    })
    await prisma.user.delete({ where: { id: student.id } })
    expect(await prisma.invitation.count({ where: { id: invitation.id } })).toBe(0)

    await prisma.invitation.create({
      data: { classId: f.classId, teacherId: teacher.id, studentId: f.users.outsider.id },
    })
    await prisma.user.delete({ where: { id: teacher.id } })
    expect(await prisma.invitation.count({ where: { teacherId: teacher.id } })).toBe(0)
  })
})
