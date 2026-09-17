import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'

/**
 * Quién puede qué en las rutas de profesor que tocan una clase o sus recursos
 * (clases, tienda, comportamientos, misiones y entregas). Para cada ruta: el
 * propietario de la clase lo consigue; otro profesor, un alumno de la clase y
 * una petición sin sesión reciben el rechazo anotado aquí.
 *
 * Los códigos son los que la API da hoy, tal cual, aunque entre rutas no sigan
 * un criterio común (unas responden 403, otras 404 y otras 400 a lo mismo).
 * Esta tabla es la red para cambiar cómo se comprueba el acceso sin cambiar lo
 * que ve cada cual: un cambio de código aquí tiene que ser una decisión.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Solo se simula lo que sale de la máquina:
 * correo, almacenamiento de ficheros y el generador de avatares.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

vi.mock('../../src/modules/storage/storage.service.js', () => ({
  saveUpload: vi.fn(async (path: string) => `/uploads/${path}`),
  deleteUpload: vi.fn(),
}))

vi.mock('../../src/modules/ai/generators/avatar-firered.js', () => ({
  generateFireRedAvatar: vi.fn(async () => ({ fileUrl: '/uploads/avatars/test.png' })),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { submissionsRoutes } from '../../src/modules/submissions/submissions.routes.js'

interface RouteRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  payload?: unknown
  headers?: Record<string, string>
}

interface RouteCase {
  route: string
  /** Prepara lo que haga falta y devuelve la petición; la misma se repite con cada actor. */
  request: (f: ClassFixture) => Promise<RouteRequest> | RouteRequest
  /** Código para: propietario, otro profesor, alumno de la clase. Sin sesión siempre es 401. */
  owner: number
  other: number
  student: number
}

/** Cuerpo multipart con solo campos de texto (un documento que es un enlace). */
function formData(fields: Record<string, string>) {
  const boundary = '----matrix'
  const body =
    Object.entries(fields)
      .map(
        ([k, v]) => `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
      )
      .join('') + `--${boundary}--\r\n`
  return { payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

const c = (f: ClassFixture) => `/teacher/classes/${f.classId}`

// ---------------------------------------------------------------- /teacher

const TEACHER_CLASS: RouteCase[] = [
  {
    route: 'GET /teacher/classes/:classId',
    request: f => ({ method: 'GET', url: c(f) }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'PUT /teacher/classes/:classId',
    request: f => ({ method: 'PUT', url: c(f), payload: { narrative: 'Nueva narrativa' } }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'PUT /teacher/classes/:classId (ajustes)',
    request: f => ({ method: 'PUT', url: c(f), payload: { settings: { shop: true } } }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'POST /teacher/classes/:classId/publish-template',
    request: async f => {
      await prisma.class.update({
        where: { id: f.classId },
        data: { subject: 'informatica', educationLevel: 'fp_medio', language: 'es' },
      })
      return { method: 'POST', url: `${c(f)}/publish-template`, payload: { publish: false } }
    },
    owner: 200,
    other: 400,
    student: 403,
  },
  {
    route: 'PATCH /teacher/classes/:classId/archive',
    request: f => ({ method: 'PATCH', url: `${c(f)}/archive`, payload: { archived: false } }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'POST /teacher/classes/:classId/duplicate',
    request: f => ({ method: 'POST', url: `${c(f)}/duplicate`, payload: {} }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'GET /teacher/classes/:classId/invitation-code',
    request: f => ({ method: 'GET', url: `${c(f)}/invitation-code` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'GET /teacher/classes/:classId/missions',
    request: f => ({ method: 'GET', url: `${c(f)}/missions` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'GET /teacher/classes/:classId/ranking',
    request: f => ({ method: 'GET', url: `${c(f)}/ranking` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'GET /teacher/classes/:classId/students',
    request: f => ({ method: 'GET', url: `${c(f)}/students` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'GET /teacher/classes/:classId/activities',
    request: f => ({ method: 'GET', url: `${c(f)}/activities` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'PUT /teacher/classes/:classId/guide',
    request: f => ({
      method: 'PUT',
      url: `${c(f)}/guide`,
      payload: { content: 'Guía de la clase' },
    }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'POST /teacher/classes/:classId/students/:studentId/avatar/generate',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/students/${f.users.student.id}/avatar/generate`,
      payload: { avatar_id: 'avatar-1', wardrobe_prompt: 'capa', background_prompt: 'bosque' },
    }),
    owner: 200,
    other: 400,
    student: 403,
  },
  {
    route: 'GET /teacher/students?classId=',
    request: f => ({ method: 'GET', url: `/teacher/students?classId=${f.classId}` }),
    owner: 200,
    other: 200,
    student: 403,
  },
  {
    route: 'GET /teacher/students/:studentId',
    request: f => ({ method: 'GET', url: `/teacher/students/${f.users.student.id}` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'GET /teacher/classes/:classId/requests',
    request: f => ({ method: 'GET', url: `${c(f)}/requests` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'PUT /teacher/classes/:classId/requests/:requestId/accept',
    request: async f => ({
      method: 'PUT',
      url: `${c(f)}/requests/${await f.newJoinRequest()}/accept`,
    }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'PUT /teacher/classes/:classId/requests/:requestId/reject',
    request: async f => ({
      method: 'PUT',
      url: `${c(f)}/requests/${await f.newJoinRequest()}/reject`,
      payload: {},
    }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'POST /teacher/classes/:classId/invitations',
    request: async f => {
      await prisma.classEnrollment.deleteMany({
        where: { classId: f.classId, studentId: f.users.outsider.id },
      })
      await prisma.invitation.deleteMany({ where: { classId: f.classId } })
      return {
        method: 'POST',
        url: `${c(f)}/invitations`,
        payload: { studentId: f.users.outsider.id },
      }
    },
    owner: 201,
    other: 400,
    student: 403,
  },
  {
    route: 'GET /teacher/classes/:classId/invitations',
    request: f => ({ method: 'GET', url: `${c(f)}/invitations` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'GET /teacher/missions?classIdFilter=',
    request: f => ({ method: 'GET', url: `/teacher/missions?classIdFilter=${f.classId}` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'POST /teacher/missions',
    request: f => ({
      method: 'POST',
      url: '/teacher/missions',
      payload: { title: 'Misión nueva', classId: f.classId, enigmas: [{ title: 'Enigma' }] },
    }),
    owner: 201,
    other: 400,
    student: 403,
  },
  {
    route: 'PUT /teacher/missions/:missionId',
    request: async f => ({
      method: 'PUT',
      url: `/teacher/missions/${await f.newMission()}`,
      payload: { title: 'Otro título' },
    }),
    owner: 200,
    other: 400,
    student: 403,
  },
  {
    route: 'PUT /teacher/missions/:missionId (mover a una clase ajena)',
    request: async f => ({
      method: 'PUT',
      url: `/teacher/missions/${await f.newMission(f.otherClassId)}`,
      payload: { title: 'Mía', classId: f.classId },
    }),
    // Aquí los papeles se cruzan: la misión es del otro profesor y el destino, del propietario.
    // Ninguno de los dos puede: a uno le falta la misión y al otro, la clase de destino.
    owner: 400,
    other: 400,
    student: 403,
  },
]

const SHOP: RouteCase[] = [
  {
    route: 'GET /teacher/classes/:classId/shop',
    request: f => ({ method: 'GET', url: `${c(f)}/shop` }),
    owner: 200,
    other: 403,
    student: 403,
  },
  {
    route: 'POST /teacher/classes/:classId/shop/items',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/shop/items`,
      payload: { name: 'Comodín', price: 10 },
    }),
    owner: 201,
    other: 403,
    student: 403,
  },
  {
    route: 'PUT /teacher/classes/:classId/shop/items/:itemId',
    request: async f => ({
      method: 'PUT',
      url: `${c(f)}/shop/items/${await f.newShopItem()}`,
      payload: { price: 20 },
    }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'DELETE /teacher/classes/:classId/shop/items/:itemId',
    request: async f => ({ method: 'DELETE', url: `${c(f)}/shop/items/${await f.newShopItem()}` }),
    owner: 200,
    other: 404,
    student: 403,
  },
]

const BEHAVIORS: RouteCase[] = [
  {
    route: 'GET /teacher/classes/:classId/behaviors',
    request: f => ({ method: 'GET', url: `${c(f)}/behaviors` }),
    owner: 200,
    other: 403,
    student: 403,
  },
  {
    route: 'POST /teacher/classes/:classId/behaviors',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/behaviors`,
      payload: { kind: 'positive', name: 'Ayuda', xp: 5 },
    }),
    owner: 201,
    other: 403,
    student: 403,
  },
  {
    route: 'PUT /teacher/classes/:classId/behaviors/:behaviorId',
    request: async f => ({
      method: 'PUT',
      url: `${c(f)}/behaviors/${await f.newBehavior()}`,
      payload: { xp: 8 },
    }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'DELETE /teacher/classes/:classId/behaviors/:behaviorId',
    request: async f => ({ method: 'DELETE', url: `${c(f)}/behaviors/${await f.newBehavior()}` }),
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'POST /teacher/classes/:classId/behaviors/:behaviorId/apply',
    request: async f => ({
      method: 'POST',
      url: `${c(f)}/behaviors/${await f.newBehavior()}/apply`,
      payload: { studentId: f.users.student.id },
    }),
    owner: 200,
    other: 400,
    student: 403,
  },
]

// ---------------------------------------------------------------- /missions

const MISSIONS: RouteCase[] = [
  {
    route: 'POST /missions',
    request: f => ({
      method: 'POST',
      url: '/missions',
      payload: { title: 'Misión', classId: f.classId, enigmas: [{ title: 'Enigma' }] },
    }),
    owner: 201,
    other: 400,
    student: 403,
  },
  {
    route: 'PATCH /missions/:missionId',
    request: async f => ({
      method: 'PATCH',
      url: `/missions/${await f.newMission()}`,
      payload: { title: 'Cambiada' },
    }),
    owner: 200,
    other: 400,
    student: 403,
  },
  {
    route: 'POST /missions/:missionId/documents',
    request: async f => ({
      method: 'POST',
      url: `/missions/${await f.newMission()}/documents`,
      ...formData({ name: 'Enlace', url: 'https://example.invalid/doc', type: 'link' }),
    }),
    owner: 201,
    other: 400,
    student: 403,
  },
  {
    route: 'PUT /missions/:missionId/documents/:documentId',
    request: async f => {
      const missionId = await f.newMission()
      return {
        method: 'PUT',
        url: `/missions/${missionId}/documents/${await f.newDocument(missionId)}`,
        payload: { name: 'Renombrado' },
      }
    },
    owner: 200,
    other: 400,
    student: 403,
  },
  {
    route: 'DELETE /missions/:missionId/documents/:documentId',
    request: async f => {
      const missionId = await f.newMission()
      return {
        method: 'DELETE',
        url: `/missions/${missionId}/documents/${await f.newDocument(missionId)}`,
      }
    },
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'PUT /missions/:missionId/documents/reorder',
    request: async f => {
      const missionId = await f.newMission()
      const ids = [await f.newDocument(missionId), await f.newDocument(missionId)]
      return {
        method: 'PUT',
        url: `/missions/${missionId}/documents/reorder`,
        payload: { ids: ids.reverse() },
      }
    },
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'POST /missions/:missionId/enigmas',
    request: async f => ({
      method: 'POST',
      url: `/missions/${await f.newMission()}/enigmas`,
      payload: { title: 'Enigma nuevo', xp: 10 },
    }),
    owner: 201,
    other: 400,
    student: 403,
  },
  {
    route: 'PUT /missions/:missionId/enigmas/reorder',
    request: async f => {
      const missionId = await f.newMission()
      const ids = [await f.newEnigma(missionId), await f.newEnigma(missionId)]
      return {
        method: 'PUT',
        url: `/missions/${missionId}/enigmas/reorder`,
        payload: { ids: ids.reverse() },
      }
    },
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'PUT /missions/:missionId/enigmas/:enigmaId',
    request: async f => {
      const missionId = await f.newMission()
      return {
        method: 'PUT',
        url: `/missions/${missionId}/enigmas/${await f.newEnigma(missionId)}`,
        payload: { title: 'Enigma cambiado' },
      }
    },
    owner: 200,
    other: 400,
    student: 403,
  },
  {
    route: 'DELETE /missions/:missionId/enigmas/:enigmaId',
    request: async f => {
      // Una misión no puede quedarse sin enigmas: hace falta otro además del que se borra.
      const missionId = await f.newMission()
      await f.newEnigma(missionId)
      return {
        method: 'DELETE',
        url: `/missions/${missionId}/enigmas/${await f.newEnigma(missionId)}`,
      }
    },
    owner: 200,
    other: 404,
    student: 403,
  },
  {
    route: 'PUT /missions/:missionId/rewards',
    request: async f => ({
      method: 'PUT',
      url: `/missions/${await f.newMission()}/rewards`,
      payload: { badgeId: await f.newBadge('owner') },
    }),
    owner: 200,
    other: 400,
    student: 403,
  },
]

// ---------------------------------------------------------------- /submissions

const SUBMISSIONS: RouteCase[] = [
  {
    route: 'GET /submissions/teacher/enigmas/:enigmaId',
    request: async f => ({
      method: 'GET',
      url: `/submissions/teacher/enigmas/${await f.newEnigma(await f.newMission())}`,
    }),
    owner: 200,
    other: 400,
    student: 403,
  },
  {
    route: 'GET /submissions/classes/:classId',
    request: f => ({ method: 'GET', url: `/submissions/classes/${f.classId}` }),
    owner: 200,
    other: 400,
    student: 403,
  },
  {
    route: 'POST /submissions/:submissionId/approve',
    request: async f => {
      const enigmaId = await f.newEnigma(await f.newMission())
      return {
        method: 'POST',
        url: `/submissions/${await f.newSubmission(enigmaId)}/approve`,
        payload: { percentage: 100 },
      }
    },
    owner: 200,
    other: 400,
    student: 403,
  },
]

describeWithDatabase('matriz de acceso de las rutas de profesor', () => {
  let app: FastifyInstance
  let f: ClassFixture

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(submissionsRoutes, { prefix: '/submissions' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  const send = (req: RouteRequest, actor?: 'owner' | 'other' | 'student') =>
    app.inject({
      method: req.method,
      url: req.url,
      payload: req.payload as any,
      headers: { ...req.headers, ...(actor ? { authorization: `Bearer ${f.token(actor)}` } : {}) },
    })

  const groups: [string, RouteCase[]][] = [
    ['clase', TEACHER_CLASS],
    ['tienda', SHOP],
    ['comportamientos', BEHAVIORS],
    ['misiones, enigmas y documentos', MISSIONS],
    ['entregas', SUBMISSIONS],
  ]

  for (const [group, cases] of groups) {
    for (const routeCase of cases) {
      it(`${group} · ${routeCase.route} → propietario ${routeCase.owner}, otro profesor ${routeCase.other}, alumno ${routeCase.student}, sin sesión 401`, async () => {
        const req = await routeCase.request(f)

        // Primero los rechazos: si alguno pasara, el propietario ya no encontraría lo mismo.
        const anonymous = await send(req)
        const student = await send(req, 'student')
        const other = await send(req, 'other')
        const owner = await send(req, 'owner')

        expect({
          anonymous: anonymous.statusCode,
          student: student.statusCode,
          other: other.statusCode,
          owner: owner.statusCode,
        }).toEqual({
          anonymous: 401,
          student: routeCase.student,
          other: routeCase.other,
          owner: routeCase.owner,
        })
      })
    }
  }

  // ---- Rutas mixtas: las usan el profesor de la clase y sus alumnos ----

  it('GET /missions/:missionId → propietario y alumno de la clase 200; otro profesor y alumno ajeno 404; sin sesión 401', async () => {
    const missionId = await f.newMission()
    const tokenOutsider = f.token('outsider')
    const url = `/missions/${missionId}`

    expect((await send({ method: 'GET', url })).statusCode).toBe(401)
    expect((await send({ method: 'GET', url }, 'owner')).statusCode).toBe(200)
    expect((await send({ method: 'GET', url }, 'student')).statusCode).toBe(200)
    expect((await send({ method: 'GET', url }, 'other')).statusCode).toBe(404)
    const outsider = await app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${tokenOutsider}` },
    })
    expect(outsider.statusCode).toBe(404)
  })

  it('GET /missions/:missionId/documents → propietario y alumno de la clase 200; sin sesión 401', async () => {
    const missionId = await f.newMission()
    await f.newDocument(missionId)
    const url = `/missions/${missionId}/documents`

    expect((await send({ method: 'GET', url })).statusCode).toBe(401)
    expect((await send({ method: 'GET', url }, 'owner')).statusCode).toBe(200)
    expect((await send({ method: 'GET', url }, 'student')).statusCode).toBe(200)
  })
  it.todo(
    'GET /missions/:missionId/documents → otro profesor y alumno ajeno: hoy no se comprueba nada'
  )

  // ---- Listados: no rechazan a nadie, pero cada profesor ve solo lo suyo ----

  it('los listados del otro profesor no traen nada de la clase del propietario', async () => {
    const missionId = await f.newMission()
    const get = async (url: string, actor: 'owner' | 'other') => {
      const response = await send({ method: 'GET', url }, actor)
      expect(response.statusCode).toBe(200)
      return response.body
    }

    expect(await get('/teacher/classes?archived=all', 'owner')).toContain(f.classId)
    expect(await get('/teacher/classes?archived=all', 'other')).not.toContain(f.classId)

    expect(await get('/teacher/missions', 'owner')).toContain(missionId)
    expect(await get('/teacher/missions', 'other')).not.toContain(missionId)

    expect(await get('/teacher/students', 'owner')).toContain(f.users.student.id)
    expect(await get('/teacher/students', 'other')).not.toContain(f.users.student.id)
    // Con ?classId= de una clase ajena no hay rechazo: la lista sale vacía.
    expect(await get(`/teacher/students?classId=${f.classId}`, 'other')).not.toContain(
      f.users.student.id
    )

    expect(JSON.parse(await get('/teacher/stats', 'owner')).totalStudents).toBe(1)
    expect(JSON.parse(await get('/teacher/stats', 'other')).totalStudents).toBe(0)

    const activity = await prisma.activity.create({
      data: {
        userId: f.users.student.id,
        type: 'class_joined',
        description: 'Se une a la clase',
        classId: f.classId,
      },
    })
    expect(await get('/teacher/activities', 'owner')).toContain(activity.id)
    expect(await get('/teacher/activities', 'other')).not.toContain(activity.id)

    await f.newJoinRequest()
    expect(JSON.parse(await get('/teacher/enrollment-counts', 'owner')).pendingRequests).toBe(1)
    expect(JSON.parse(await get('/teacher/enrollment-counts', 'other')).pendingRequests).toBe(0)
  })

  // ---- Plantillas: una clase ajena solo se ve y se importa si está publicada ----

  it('plantillas → una clase ajena sin publicar no se lista, no se ve y no se importa (404)', async () => {
    const list = { method: 'GET', url: '/teacher/templates' } as const
    const detail = { method: 'GET', url: `/teacher/templates/${f.classId}` } as const
    const importIt = { method: 'POST', url: `/teacher/templates/${f.classId}/import` } as const

    for (const req of [list, detail, importIt]) {
      expect((await send(req)).statusCode).toBe(401)
      expect((await send(req, 'student')).statusCode).toBe(403)
    }

    // Sin publicar: ni su propietario la encuentra por esta vía.
    expect((await send(list, 'other')).body).not.toContain(f.classId)
    expect((await send(detail, 'other')).statusCode).toBe(404)
    expect((await send(detail, 'owner')).statusCode).toBe(404)
    const countOthers = () => prisma.class.count({ where: { teacherId: f.users.other.id } })
    const before = await countOthers()
    expect((await send(importIt, 'other')).statusCode).toBe(404)
    expect(await countOthers()).toBe(before)

    // Publicada: cualquier profesor la lista y la ve.
    await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: true } })
    try {
      const listed = await send(list, 'other')
      expect(listed.statusCode).toBe(200)
      expect(listed.body).toContain(f.classId)
      expect((await send(detail, 'other')).statusCode).toBe(200)
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: false } })
    }
  })

  // ---- Insignias: son del profesor, no de la clase ----

  it('insignias → cada profesor gestiona las suyas: la de otro da 404', async () => {
    const badgeId = await f.newBadge('owner')
    const put = {
      method: 'PUT',
      url: `/teacher/badges/${badgeId}`,
      payload: { name: 'Renombrada' },
    } as const
    const del = { method: 'DELETE', url: `/teacher/badges/${badgeId}` } as const

    expect((await send(put)).statusCode).toBe(401)
    expect((await send(put, 'student')).statusCode).toBe(403)
    expect((await send(put, 'other')).statusCode).toBe(404)
    expect((await send(del, 'other')).statusCode).toBe(404)
    expect(
      (await send({ method: 'GET', url: `/teacher/badges/${badgeId}` }, 'other')).statusCode
    ).toBe(404)
    expect((await send(put, 'owner')).statusCode).toBe(200)
    expect((await send(del, 'owner')).statusCode).toBe(200)
  })
  it.todo(
    'POST y PUT /teacher/badges con missionId de una misión ajena: hoy no se comprueba de quién es la misión'
  )

  // ---- Las clases que nacen por una ruta llevan a su propietario en el profesorado ----

  it('crear, duplicar e importar dejan una fila de propietario que coincide con Class.teacherId', async () => {
    const created = await send(
      { method: 'POST', url: '/teacher/classes', payload: { name: 'Recién creada' } },
      'other'
    )
    expect(created.statusCode).toBe(201)

    const duplicated = await send(
      { method: 'POST', url: `${c(f)}/duplicate`, payload: {} },
      'owner'
    )
    expect(duplicated.statusCode).toBe(200)

    await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: true } })
    const imported = await send(
      { method: 'POST', url: `/teacher/templates/${f.classId}/import` },
      'other'
    )
    await prisma.class.update({ where: { id: f.classId }, data: { isTemplate: false } })
    expect(imported.statusCode).toBe(200)

    const classes = await prisma.class.findMany({
      where: { teacherId: { in: [f.users.owner.id, f.users.other.id] } },
      include: { teachers: true },
    })
    expect(classes.length).toBeGreaterThanOrEqual(5)
    for (const cls of classes) {
      expect(cls.teachers).toHaveLength(1)
      expect(cls.teachers[0]).toMatchObject({
        userId: cls.teacherId,
        access: 'admin',
        profile: 'titular',
        isOwner: true,
      })
    }
  })

  it('GET /teacher/classes y /teacher/classes/:classId traen myAccess y teachers', async () => {
    const expected = {
      myAccess: { access: 'admin', profile: 'titular', isOwner: true },
      teachers: [
        {
          id: f.users.owner.id,
          name: expect.any(String),
          access: 'admin',
          profile: 'titular',
          isOwner: true,
        },
      ],
    }

    const detail = (await send({ method: 'GET', url: c(f) }, 'owner')).json().class
    expect(detail).toMatchObject(expected)

    const list = (
      await send({ method: 'GET', url: '/teacher/classes?archived=all' }, 'owner')
    ).json().classes
    expect(list.find((cls: { id: string }) => cls.id === f.classId)).toMatchObject(expected)
  })
})
