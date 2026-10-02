import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

/**
 * Capa de acceso del profesorado a una clase: qué nivel pide cada acción, qué
 * ve cada nivel, cuándo se responde 404 y cuándo 403, y que un acceso vencido
 * cuenta como no tenerlo. Prisma va simulado: aquí se prueban las reglas, no
 * las consultas (de esas se ocupa tests/utils/class-access.db.test.ts).
 */

const db = vi.hoisted(() => ({
  classTeacher: { findUnique: vi.fn(), findMany: vi.fn() },
  mission: { findUnique: vi.fn() },
  missionEnigma: { findUnique: vi.fn() },
  missionDocument: { findUnique: vi.fn() },
  enigmaSubmission: { findUnique: vi.fn() },
  classEnrollment: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  classActionLog: { create: vi.fn() },
}))

vi.mock('../../src/config/database.js', () => ({ prisma: db }))

import {
  CLASS_ACTION_LEVEL,
  accessibleClassesWhere,
  assertClassAccess,
  assertDocumentAccess,
  assertEnigmaAccess,
  assertEnrollmentAccess,
  assertMissionAccess,
  assertSubmissionAccess,
  classTeacherRecipients,
  getClassAccess,
  hasClassLevel,
  listedClassesWhere,
  recordClassAction,
  requireClassAccess,
  studentEnrollmentsWhere,
  summarizeClassTeachers,
  type ClassAction,
} from '../../src/utils/class-access.js'
import { ForbiddenError, HttpError, NotFoundError } from '../../src/utils/errors.js'

const CLASS = 'class-1'
const USER = 'teacher-1'
const DAY = 24 * 60 * 60 * 1000

type Row = {
  access: 'read' | 'edit' | 'admin'
  profile: string
  isOwner: boolean
  endsAt: Date | null
}

const row = (access: Row['access'], extra: Partial<Row> = {}): Row => ({
  access,
  profile: 'sustituto',
  isOwner: false,
  endsAt: null,
  ...extra,
})

/** Los cuatro tipos de profesor con acceso, de menos a más. */
const ROWS = {
  read: row('read', { profile: 'practicas' }),
  edit: row('edit'),
  admin: row('admin', { profile: 'titular' }),
  owner: row('admin', { profile: 'titular', isOwner: true }),
}

const RANK = { read: 1, edit: 2, admin: 3, owner: 4 } as const

beforeEach(() => {
  vi.clearAllMocks()
  db.classTeacher.findUnique.mockResolvedValue(null)
})

describe('tabla de acciones', () => {
  it('cada acción pide el nivel acordado', () => {
    expect(CLASS_ACTION_LEVEL).toEqual({
      'class.view': 'read',
      'class.duplicate': 'read',
      'class.editContent': 'edit',
      'class.editSettings': 'admin',
      'class.archive': 'admin',
      'class.inviteCode': 'admin',
      'class.publishTemplate': 'owner',
      'class.transfer': 'owner',
      'class.delete': 'owner',
      'class.restore': 'owner',
      'class.purge': 'owner',
      'mission.view': 'read',
      'mission.edit': 'edit',
      'shop.view': 'read',
      'shop.edit': 'edit',
      'behavior.view': 'read',
      'behavior.edit': 'edit',
      'behavior.apply': 'edit',
      'submission.view': 'read',
      'submission.approve': 'edit',
      'student.view': 'read',
      'student.avatar': 'edit',
      'student.manage': 'admin',
      'student.nickname': 'admin',
      'teachers.view': 'read',
      'teachers.manage': 'admin',
      'teachers.leave': 'read',
      'class.history': 'read',
    })
  })

  it('solo el propietario publica la plantilla, traspasa la clase, la envía a la papelera, la saca o la borra para siempre', () => {
    const ownerOnly = Object.entries(CLASS_ACTION_LEVEL)
      .filter(([, level]) => level === 'owner')
      .map(([action]) => action)
    expect(ownerOnly.sort()).toEqual([
      'class.delete',
      'class.publishTemplate',
      'class.purge',
      'class.restore',
      'class.transfer',
    ])
  })
})

describe('niveles × acciones', () => {
  const actions = Object.keys(CLASS_ACTION_LEVEL) as ClassAction[]

  for (const [who, teacherRow] of Object.entries(ROWS) as [keyof typeof ROWS, Row][]) {
    for (const action of actions) {
      const allowed = RANK[who] >= RANK[CLASS_ACTION_LEVEL[action]]
      it(`${who} → ${action}: ${allowed ? 'pasa' : '403'}`, async () => {
        db.classTeacher.findUnique.mockResolvedValue(teacherRow)
        const call = assertClassAccess(CLASS, USER, action)
        if (allowed) {
          await expect(call).resolves.toEqual({
            access: teacherRow.access,
            profile: teacherRow.profile,
            isOwner: teacherRow.isOwner,
          })
        } else {
          await expect(call).rejects.toBeInstanceOf(ForbiddenError)
        }
      })
    }
  }

  it('sin fila de profesorado, toda acción es 404', async () => {
    for (const action of actions) {
      await expect(assertClassAccess(CLASS, USER, action)).rejects.toBeInstanceOf(NotFoundError)
    }
  })
})

describe('propietario', () => {
  it('un administrador que no es propietario no llega al nivel de propietario', () => {
    expect(hasClassLevel({ access: 'admin', profile: 'titular', isOwner: false }, 'owner')).toBe(
      false
    )
    expect(hasClassLevel({ access: 'admin', profile: 'titular', isOwner: true }, 'owner')).toBe(
      true
    )
  })

  it('el propietario llega a todo aunque su nivel guardado sea menor', () => {
    const owner = { access: 'read', profile: 'titular', isOwner: true } as const
    for (const level of ['read', 'edit', 'admin', 'owner'] as const) {
      expect(hasClassLevel(owner, level)).toBe(true)
    }
  })
})

describe('getClassAccess', () => {
  it('busca por la pareja clase-usuario y devuelve solo nivel, perfil y propiedad', async () => {
    db.classTeacher.findUnique.mockResolvedValue(ROWS.edit)
    await expect(getClassAccess(CLASS, USER)).resolves.toEqual({
      access: 'edit',
      profile: 'sustituto',
      isOwner: false,
    })
    expect(db.classTeacher.findUnique.mock.calls[0][0].where).toEqual({
      classId_userId: { classId: CLASS, userId: USER },
    })
  })

  it('sin fila devuelve null', async () => {
    await expect(getClassAccess(CLASS, USER)).resolves.toBeNull()
  })

  it('un acceso vencido cuenta como no tenerlo', async () => {
    db.classTeacher.findUnique.mockResolvedValue(
      row('admin', { endsAt: new Date(Date.now() - 1000) })
    )
    await expect(getClassAccess(CLASS, USER)).resolves.toBeNull()
    await expect(assertClassAccess(CLASS, USER, 'class.view')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('un acceso con fin en el futuro sigue valiendo', async () => {
    db.classTeacher.findUnique.mockResolvedValue(
      row('edit', { endsAt: new Date(Date.now() + DAY) })
    )
    await expect(getClassAccess(CLASS, USER)).resolves.toMatchObject({ access: 'edit' })
  })

  it('usa la transacción que se le pasa, no el cliente global', async () => {
    const tx = { classTeacher: { findUnique: vi.fn().mockResolvedValue(ROWS.read) } }
    await expect(getClassAccess(CLASS, USER, tx as any)).resolves.toMatchObject({ access: 'read' })
    expect(db.classTeacher.findUnique).not.toHaveBeenCalled()
  })
})

describe('404 frente a 403', () => {
  it('sin acceso: 404 con el mismo mensaje que una clase que no existe', async () => {
    const error = await assertClassAccess(CLASS, USER, 'class.view').catch(e => e)
    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('Clase no encontrada')
  })

  it('con acceso pero sin nivel: 403', async () => {
    db.classTeacher.findUnique.mockResolvedValue(ROWS.read)
    const error = await assertClassAccess(CLASS, USER, 'class.archive').catch(e => e)
    expect(error).toBeInstanceOf(ForbiddenError)
    expect(error.statusCode).toBe(403)
  })
})

describe('variantes por recurso', () => {
  const variants = [
    {
      name: 'misión',
      assert: assertMissionAccess,
      model: db.mission,
      found: { classId: CLASS },
      notFound: 'Misión no encontrada',
    },
    {
      name: 'enigma',
      assert: assertEnigmaAccess,
      model: db.missionEnigma,
      found: { mission: { classId: CLASS } },
      notFound: 'Enigma no encontrado',
    },
    {
      name: 'documento',
      assert: assertDocumentAccess,
      model: db.missionDocument,
      found: { mission: { classId: CLASS } },
      notFound: 'Documento no encontrado',
    },
    {
      name: 'entrega',
      assert: assertSubmissionAccess,
      model: db.enigmaSubmission,
      found: { enigma: { mission: { classId: CLASS } } },
      notFound: 'Entrega no encontrada',
    },
    {
      name: 'matrícula',
      assert: assertEnrollmentAccess,
      model: db.classEnrollment,
      found: { classId: CLASS },
      notFound: 'Matrícula no encontrada',
    },
  ]

  for (const v of variants) {
    describe(v.name, () => {
      it('resuelve la clase del recurso y devuelve el acceso con ella', async () => {
        v.model.findUnique.mockResolvedValue(v.found)
        db.classTeacher.findUnique.mockResolvedValue(ROWS.edit)

        await expect(v.assert('r1', USER, 'mission.edit')).resolves.toEqual({
          classId: CLASS,
          access: 'edit',
          profile: 'sustituto',
          isOwner: false,
        })
        expect(v.model.findUnique.mock.calls[0][0].where).toEqual({ id: 'r1' })
        expect(db.classTeacher.findUnique.mock.calls[0][0].where).toEqual({
          classId_userId: { classId: CLASS, userId: USER },
        })
      })

      it('el recurso no existe: 404, sin mirar el profesorado', async () => {
        v.model.findUnique.mockResolvedValue(null)
        const error = await v.assert('r1', USER, 'mission.view').catch(e => e)
        expect(error).toBeInstanceOf(NotFoundError)
        expect(error.message).toBe(v.notFound)
        expect(db.classTeacher.findUnique).not.toHaveBeenCalled()
      })

      it('el recurso es de una clase ajena: el mismo 404 que si no existiera', async () => {
        v.model.findUnique.mockResolvedValue(v.found)
        const error = await v.assert('r1', USER, 'mission.view').catch(e => e)
        expect(error).toBeInstanceOf(NotFoundError)
        expect(error.message).toBe(v.notFound)
      })

      it('con acceso pero sin nivel: 403', async () => {
        v.model.findUnique.mockResolvedValue(v.found)
        db.classTeacher.findUnique.mockResolvedValue(ROWS.read)
        await expect(v.assert('r1', USER, 'mission.edit')).rejects.toBeInstanceOf(ForbiddenError)
      })

      it('un acceso vencido: 404', async () => {
        v.model.findUnique.mockResolvedValue(v.found)
        db.classTeacher.findUnique.mockResolvedValue(
          row('admin', { endsAt: new Date(Date.now() - DAY) })
        )
        await expect(v.assert('r1', USER, 'mission.view')).rejects.toBeInstanceOf(NotFoundError)
      })
    })
  }
})

describe('accessibleClassesWhere', () => {
  const some = (level: Parameters<typeof accessibleClassesWhere>[1]) =>
    (accessibleClassesWhere(USER, level) as any).teachers.some

  it('filtra por el usuario y deja fuera los accesos vencidos', () => {
    const where = some('read')
    expect(where.userId).toBe(USER)
    const [active] = where.AND
    expect(active.OR[0]).toEqual({ endsAt: null })
    expect(active.OR[1].endsAt.gt).toBeInstanceOf(Date)
  })

  it('cada nivel mínimo admite ese nivel y los superiores, y siempre al propietario', () => {
    expect(some('read').AND[1]).toEqual({
      OR: [{ isOwner: true }, { access: { in: ['read', 'edit', 'admin'] } }],
    })
    expect(some('edit').AND[1]).toEqual({
      OR: [{ isOwner: true }, { access: { in: ['edit', 'admin'] } }],
    })
    expect(some('admin').AND[1]).toEqual({ OR: [{ isOwner: true }, { access: { in: ['admin'] } }] })
  })

  it('el nivel de propietario filtra por la marca, no por el nivel guardado', () => {
    expect(some('owner').AND[1]).toEqual({ isOwner: true })
  })

  it('por defecto pide lectura', () => {
    expect((accessibleClassesWhere(USER) as any).teachers.some.AND[1].OR[1].access.in).toHaveLength(
      3
    )
  })
})

describe('listados sin la papelera', () => {
  it('listedClassesWhere es el acceso de accessibleClassesWhere sin las clases de la papelera', () => {
    const where = listedClassesWhere(USER, 'admin') as any
    expect(where.deletedAt).toBeNull()
    expect(where.teachers.some.userId).toBe(USER)
    expect(where.teachers.some.AND[1]).toEqual({
      OR: [{ isOwner: true }, { access: { in: ['admin'] } }],
    })
  })

  it('studentEnrollmentsWhere deja fuera las matrículas de clases en la papelera, también en la vista previa', () => {
    expect(studentEnrollmentsWhere({ id: USER, role: 'student' })).toEqual({
      studentId: USER,
      isPreview: false,
      class: { deletedAt: null },
    })
    expect(
      (studentEnrollmentsWhere({ id: USER, role: 'teacher' }) as any).class.deletedAt
    ).toBeNull()
  })
})

describe('classTeacherRecipients', () => {
  it('devuelve los ids de quienes llegan al nivel, sin accesos vencidos', async () => {
    db.classTeacher.findMany.mockResolvedValue([{ userId: 'a' }, { userId: 'b' }])

    await expect(classTeacherRecipients(CLASS, 'edit')).resolves.toEqual(['a', 'b'])

    const { where } = db.classTeacher.findMany.mock.calls[0][0]
    expect(where.classId).toBe(CLASS)
    expect(where.AND[0].OR[0]).toEqual({ endsAt: null })
    expect(where.AND[1]).toEqual({ OR: [{ isOwner: true }, { access: { in: ['edit', 'admin'] } }] })
  })

  it('por defecto deja fuera al nivel de lectura', async () => {
    db.classTeacher.findMany.mockResolvedValue([])
    await classTeacherRecipients(CLASS)
    expect(db.classTeacher.findMany.mock.calls[0][0].where.AND[1].OR[1].access.in).toEqual([
      'edit',
      'admin',
    ])
  })
})

describe('summarizeClassTeachers', () => {
  const rows = [
    {
      userId: 'owner',
      access: 'admin',
      profile: 'titular',
      isOwner: true,
      user: { name: 'Elena' },
    },
    {
      userId: 'sub',
      access: 'edit',
      profile: 'sustituto',
      isOwner: false,
      user: { name: 'Antonio' },
    },
  ] as any

  it('lista al profesorado y saca el acceso de quien pregunta', () => {
    expect(summarizeClassTeachers(rows, 'sub')).toEqual({
      myAccess: { access: 'edit', profile: 'sustituto', isOwner: false },
      teachers: [
        { id: 'owner', name: 'Elena', access: 'admin', profile: 'titular', isOwner: true },
        { id: 'sub', name: 'Antonio', access: 'edit', profile: 'sustituto', isOwner: false },
      ],
    })
  })

  it('sin fila no hay acceso, tampoco para quien figura en Class.teacherId: mismo criterio que getClassAccess', () => {
    expect(summarizeClassTeachers([], 'owner')).toEqual({ myAccess: null, teachers: [] })
  })

  it('quien no tiene fila no tiene acceso', () => {
    expect(summarizeClassTeachers(rows, 'otro').myAccess).toBeNull()
  })
})

describe('recordClassAction', () => {
  const tx = () => ({
    user: { findUnique: vi.fn().mockResolvedValue({ name: 'Elena Sánchez' }) },
    classActionLog: {
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: 'log-1', ...data })),
    },
  })

  it('escribe en la transacción que recibe, con la copia del nombre de quien actúa', async () => {
    const t = tx()
    await recordClassAction(t as any, {
      classId: CLASS,
      actorId: USER,
      action: 'submission.approved',
      entityType: 'submission',
      entityId: 's1',
      targetUserId: 'student-1',
      metadata: { percentage: 80, xpAwarded: 40 },
    })

    expect(t.classActionLog.create).toHaveBeenCalledWith({
      data: {
        classId: CLASS,
        actorId: USER,
        actorName: 'Elena Sánchez',
        actorAvatar: null,
        action: 'submission.approved',
        entityType: 'submission',
        entityId: 's1',
        targetUserId: 'student-1',
        metadata: { percentage: 80, xpAwarded: 40 },
      },
    })
    expect(db.classActionLog.create).not.toHaveBeenCalled()
  })

  it('la acción tiene que ser dominio.verbo', async () => {
    for (const action of [
      'aprobada',
      'Submission.approved',
      'submission.',
      'a.b.c',
      'submission approved',
    ]) {
      await expect(
        recordClassAction(tx() as any, { classId: CLASS, actorId: USER, action })
      ).rejects.toThrow(/dominio\.verbo/)
    }
    for (const action of [
      'student.password_reset',
      'class.ownership_transferred',
      'teacher.added',
    ]) {
      await expect(
        recordClassAction(tx() as any, { classId: CLASS, actorId: USER, action })
      ).resolves.toBeTruthy()
    }
  })

  it('no admite nombres de personas en metadata, tampoco anidados', async () => {
    const bad = [
      { studentName: 'Sofía' },
      { name: 'Sofía' },
      { before: { nickname: 'x' } },
      { list: [{ email: 'a@b.c' }] },
      { displayName: 'Sofía' },
      { firstName: 'Sofía', last_name: 'Ruiz' },
      { apellidos: 'Ruiz' },
      { realName: 'Sofía' },
      { student: 'Sofía' },
    ]
    for (const metadata of bad) {
      const t = tx()
      await expect(
        recordClassAction(t as any, {
          classId: CLASS,
          actorId: USER,
          action: 'student.removed',
          metadata,
        })
      ).rejects.toThrow(/metadata/)
      expect(t.classActionLog.create).not.toHaveBeenCalled()
    }
  })

  describe('recordClassAction en producción', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
      vi.restoreAllMocks()
    })

    it('descarta las claves de nombre y avisa, sin tumbar la transacción de la acción', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const t = tx()

      await recordClassAction(t as any, {
        classId: CLASS,
        actorId: USER,
        action: 'shop.item_updated',
        metadata: {
          before: { name: 'Espada', title: 'Espada', price: 5 },
          list: [{ email: 'a@b.c', n: 1 }],
        },
      })

      expect(t.classActionLog.create.mock.calls[0][0].data.metadata).toEqual({
        before: { title: 'Espada', price: 5 },
        list: [{ n: 1 }],
      })
      expect(warn.mock.calls[0][0]).toMatch(/metadata\.before\.name.*metadata\.list\[0\]\.email/)
    })

    it('una metadata limpia se guarda tal cual', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const t = tx()
      const metadata = {
        before: { title: 'Espada', price: 5 },
        after: { title: 'Espada', price: 8 },
      }
      await recordClassAction(t as any, {
        classId: CLASS,
        actorId: USER,
        action: 'shop.item_updated',
        metadata,
      })
      expect(t.classActionLog.create.mock.calls[0][0].data.metadata).toBe(metadata)
    })
  })
})

describe('requireClassAccess', () => {
  /** El mismo criterio que el manejador global de index.ts para los errores de dominio. */
  async function buildApp(userId: string | null = USER) {
    const app = Fastify()
    app.setErrorHandler((error: unknown, _request, reply) => {
      if (error instanceof HttpError) {
        return reply.status(error.statusCode).send({ message: error.message, code: error.code })
      }
      return reply.status(500).send({ message: 'Error' })
    })
    app.addHook('preHandler', async (request: any, reply: any) => {
      if (userId === null) return reply.status(401).send({ message: 'No autorizado' })
      request.user = { id: userId, role: 'teacher' }
    })
    app.get(
      '/classes/:classId/thing',
      { preHandler: requireClassAccess('class.archive') },
      async request => ({
        classAccess: request.classAccess,
      })
    )
    await app.ready()
    return app
  }

  it('con nivel suficiente deja el acceso en request.classAccess', async () => {
    db.classTeacher.findUnique.mockResolvedValue(ROWS.admin)
    const response = await (
      await buildApp()
    ).inject({ method: 'GET', url: `/classes/${CLASS}/thing` })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      classAccess: { access: 'admin', profile: 'titular', isOwner: false },
    })
    expect(db.classTeacher.findUnique.mock.calls[0][0].where).toEqual({
      classId_userId: { classId: CLASS, userId: USER },
    })
  })

  it('sin acceso, el manejador de errores responde 404', async () => {
    const response = await (
      await buildApp()
    ).inject({ method: 'GET', url: `/classes/${CLASS}/thing` })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'Clase no encontrada', code: 'NOT_FOUND' })
  })

  it('sin nivel suficiente, responde 403', async () => {
    db.classTeacher.findUnique.mockResolvedValue(ROWS.edit)
    const response = await (
      await buildApp()
    ).inject({ method: 'GET', url: `/classes/${CLASS}/thing` })
    expect(response.statusCode).toBe(403)
    expect(response.json().code).toBe('FORBIDDEN')
  })

  it('sin sesión no llega a consultarse el acceso', async () => {
    const response = await (
      await buildApp(null)
    ).inject({ method: 'GET', url: `/classes/${CLASS}/thing` })
    expect(response.statusCode).toBe(401)
    expect(db.classTeacher.findUnique).not.toHaveBeenCalled()
  })
})

describe('el manejador global traduce estos errores', () => {
  it('index.ts responde a HttpError con su statusCode y su code', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../../src/index.ts', import.meta.url), 'utf8')
    expect(source).toMatch(
      /if \(error instanceof HttpError\) \{\s*return reply\.status\(error\.statusCode\)\.send\(\{ message: error\.message, code: error\.code \}\)/
    )
    expect(new NotFoundError()).toBeInstanceOf(HttpError)
    expect(new ForbiddenError()).toBeInstanceOf(HttpError)
    expect(new NotFoundError().statusCode).toBe(404)
    expect(new ForbiddenError().statusCode).toBe(403)
  })
})
