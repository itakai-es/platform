import { it, expect, vi, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

/**
 * Quién puede qué en las rutas de profesor que tocan una clase o sus recursos
 * (clases, tienda, comportamientos, misiones y entregas). Para cada ruta: el
 * propietario de la clase lo consigue; otro profesor, un alumno de la clase y
 * una petición sin sesión reciben el rechazo anotado aquí.
 *
 * Los códigos son los que la API da hoy, tal cual, aunque entre rutas no sigan
 * un criterio común (unas responden 403, otras 404 y otras 400 a lo mismo).
 * Esta tabla es la red para cambiar cómo se comprueba el acceso sin cambiar lo
 * que ve cada cual: un cambio de código aquí tiene que ser una decisión. Las
 * rutas que ya comprueban el acceso con la capa común de la clase responden
 * igual todas: 404 a quien no tiene acceso a la clase y 403 a quien lo tiene
 * con un nivel que no llega.
 *
 * Esas rutas llevan además `levels`: lo que consigue un profesor añadido a la
 * clase con cada nivel (lectura, edición, administración).
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

// Solo se simula la escritura: la resolución de claves privadas es la de verdad.
vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
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
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { missionsRoutes } from '../../src/modules/missions/missions.routes.js'
import { submissionsRoutes } from '../../src/modules/submissions/submissions.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

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
  /** Código para un profesor añadido a la clase con cada nivel. */
  levels?: Record<CoLevel, number>
  /** Deshace lo que el caso deja en la clase y cambiaría lo que ven los demás. */
  after?: (f: ClassFixture) => Promise<void>
}

type CoLevel = 'read' | 'edit' | 'admin'
const CO_LEVELS: CoLevel[] = ['read', 'edit', 'admin']

/** Lo que consigue cada nivel: `ok` si le basta con `min`, 403 si no llega. */
function levels(min: CoLevel, ok: number): Record<CoLevel, number> {
  const rank = CO_LEVELS.indexOf(min)
  return { read: rank <= 0 ? ok : 403, edit: rank <= 1 ? ok : 403, admin: ok }
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

/** Cuentas de profesorado que crean los casos del profesorado de la clase; se borran al final. */
const routeTeachers: string[] = []

/** Una cuenta de profesorado nueva y, con `classId`, en esa clase con lectura (en prácticas). */
async function newRouteTeacher(classId?: string) {
  const email = `ruta-${randomUUID().slice(0, 8)}@test.invalid`
  const user = await prisma.user.create({
    data: { email, passwordHash: 'x', name: 'Profe de ruta', role: 'teacher', isOnboarded: true },
  })
  routeTeachers.push(user.id)
  if (classId) {
    await prisma.classTeacher.create({
      data: { classId, userId: user.id, access: 'read', profile: 'practicas' },
    })
  }
  return { id: user.id, email }
}

/** Saca de la clase al profesorado que han metido los casos: los demás cuentan con el de la fixture. */
async function dropRouteTeachers(f: ClassFixture) {
  await prisma.classTeacher.deleteMany({
    where: { classId: f.classId, userId: { in: routeTeachers } },
  })
}

// ---------------------------------------------------------------- /teacher

const TEACHER_CLASS: RouteCase[] = [
  {
    route: 'GET /teacher/classes/:classId',
    request: f => ({ method: 'GET', url: c(f) }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'PUT /teacher/classes/:classId',
    request: f => ({ method: 'PUT', url: c(f), payload: { narrative: 'Nueva narrativa' } }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
  },
  {
    route: 'PUT /teacher/classes/:classId (ajustes)',
    request: f => ({ method: 'PUT', url: c(f), payload: { settings: { shop: true } } }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
  },
  {
    route: 'PUT /teacher/classes/:classId (metadatos)',
    request: f => ({
      method: 'PUT',
      url: c(f),
      // Un valor nuevo en cada petición: cambiar los metadatos es un ajuste.
      payload: { subject: `asignatura-${randomUUID().slice(0, 4)}` },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
  },
  {
    route: 'PUT /teacher/classes/:classId (formulario general con los metadatos sin cambiar)',
    request: async f => {
      // El formulario general manda siempre los metadatos: si no cambian, es contenido.
      const cls = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
      return {
        method: 'PUT',
        url: c(f),
        payload: {
          name: cls.name,
          subject: cls.subject ?? '',
          language: cls.language ?? '',
          educationLevel: cls.educationLevel ?? '',
          province: cls.province ?? '',
        },
      }
    },
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
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
    other: 404,
    student: 403,
    // Publicar o retirar la plantilla es solo del propietario.
    levels: { read: 403, edit: 403, admin: 403 },
  },
  {
    route: 'PATCH /teacher/classes/:classId/archive',
    request: f => ({ method: 'PATCH', url: `${c(f)}/archive`, payload: { archived: false } }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
  },
  {
    // A la papelera: solo el propietario. Después se saca a mano, para que la
    // clase siga igual en el resto de casos.
    route: 'DELETE /teacher/classes/:classId',
    request: f => ({ method: 'DELETE', url: c(f) }),
    owner: 200,
    other: 404,
    student: 403,
    levels: { read: 403, edit: 403, admin: 403 },
    after: async f => {
      await prisma.class.update({
        where: { id: f.classId },
        data: { deletedAt: null, deletedById: null, archived: false },
      })
    },
  },
  {
    // Restaurar también es solo del propietario. Esta clase no está en la
    // papelera: el propietario pasa el acceso y se queda en el 409. La que se
    // restaura de verdad está en tests/routes/class-trash.db.test.ts.
    route: 'POST /teacher/classes/:classId/restore',
    request: f => ({ method: 'POST', url: `${c(f)}/restore` }),
    owner: 409,
    other: 404,
    student: 403,
    levels: { read: 403, edit: 403, admin: 403 },
  },
  {
    // Borrar ya, para siempre: solo el propietario y solo desde la papelera.
    // Esta clase no está en ella: el propietario pasa el acceso y se queda en
    // el 409. La purga de verdad está en tests/routes/class-purge.db.test.ts.
    route: 'POST /teacher/classes/:classId/purge',
    request: f => ({ method: 'POST', url: `${c(f)}/purge` }),
    owner: 409,
    other: 404,
    student: 403,
    levels: { read: 403, edit: 403, admin: 403 },
  },
  {
    route: 'GET /teacher/classes/:classId/deletion-impact',
    request: f => ({ method: 'GET', url: `${c(f)}/deletion-impact` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: { read: 403, edit: 403, admin: 403 },
  },
  {
    route: 'POST /teacher/classes/:classId/duplicate',
    request: f => ({ method: 'POST', url: `${c(f)}/duplicate`, payload: {} }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'GET /teacher/classes/:classId/invitation-code',
    request: f => ({ method: 'GET', url: `${c(f)}/invitation-code` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
  },
  {
    route: 'GET /teacher/classes/:classId/missions',
    request: f => ({ method: 'GET', url: `${c(f)}/missions` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'GET /teacher/classes/:classId/ranking',
    request: f => ({ method: 'GET', url: `${c(f)}/ranking` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'GET /teacher/classes/:classId/students',
    request: f => ({ method: 'GET', url: `${c(f)}/students` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'POST /teacher/classes/:classId/students',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/students`,
      payload: { name: 'Alumno sin correo' },
    }),
    owner: 201,
    other: 404,
    student: 403,
    levels: levels('admin', 201),
  },
  {
    // No lleva clase en el camino: se decide por la clase de origen de la cuenta.
    // La del alumno de la fixture tiene correo, así que el propietario recibe un
    // 400: no es una cuenta que restablezca su profesorado.
    route: 'POST /teacher/students/:studentId/reset-password',
    request: f => ({
      method: 'POST',
      url: `/teacher/students/${f.users.student.id}/reset-password`,
    }),
    owner: 400,
    other: 404,
    student: 403,
    // Sin administración en una clase del alumno no se le encuentra (404); con ella,
    // el 400 del propietario: la cuenta tiene correo.
    levels: { read: 404, edit: 404, admin: 400 },
  },
  {
    route: 'GET /teacher/classes/:classId/students/username-proposal',
    request: f => ({
      method: 'GET',
      url: `${c(f)}/students/username-proposal?name=Ana%20G%C3%B3mez`,
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
  },
  {
    route: 'POST /teacher/classes/:classId/students/import?dryRun=true',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/students/import?dryRun=true`,
      payload: { students: [{ name: 'Lista revisada' }] },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
  },
  {
    route: 'POST /teacher/classes/:classId/students/import',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/students/import`,
      payload: { students: [{ name: 'Lista creada' }] },
    }),
    owner: 201,
    other: 404,
    student: 403,
    levels: levels('admin', 201),
  },
  {
    route: 'PATCH /teacher/classes/:classId/students/:studentId',
    request: f => ({
      method: 'PATCH',
      url: `${c(f)}/students/${f.users.student.id}`,
      payload: { nickname: 'Nuevo alias' },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
  },
  {
    route: 'DELETE /teacher/classes/:classId/students/:studentId',
    request: async f => {
      // Un alumno propio para esta ruta: el de la fixture lo usan las demás.
      const student = await prisma.user.create({
        data: {
          username: `quitar.${Date.now().toString(36)}`,
          passwordHash: 'x',
          name: 'Para quitar',
          role: 'student',
          createdById: f.users.owner.id,
        },
      })
      await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: student.id } })
      return { method: 'DELETE', url: `${c(f)}/students/${student.id}` }
    },
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
  },
  {
    route: 'GET /teacher/classes/:classId/activities',
    request: f => ({ method: 'GET', url: `${c(f)}/activities` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'GET /teacher/classes/:classId/history',
    request: f => ({ method: 'GET', url: `${c(f)}/history?page=1&limit=5` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'GET /teacher/classes/:classId/teachers',
    request: f => ({ method: 'GET', url: `${c(f)}/teachers` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'POST /teacher/classes/:classId/teachers',
    request: async f => ({
      method: 'POST',
      url: `${c(f)}/teachers`,
      payload: { email: (await newRouteTeacher()).email, profile: 'practicas' },
    }),
    owner: 201,
    other: 404,
    student: 403,
    levels: levels('admin', 201),
    after: dropRouteTeachers,
  },
  {
    route: 'PATCH /teacher/classes/:classId/teachers/:userId',
    request: async f => ({
      method: 'PATCH',
      url: `${c(f)}/teachers/${(await newRouteTeacher(f.classId)).id}`,
      payload: { access: 'edit' },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
    after: dropRouteTeachers,
  },
  {
    route: 'DELETE /teacher/classes/:classId/teachers/:userId',
    request: async f => ({
      method: 'DELETE',
      url: `${c(f)}/teachers/${(await newRouteTeacher(f.classId)).id}`,
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('admin', 200),
    after: dropRouteTeachers,
  },
  {
    // Al propietario no lo cambia ni lo quita nadie: ni él mismo por esta vía.
    route: 'PATCH /teacher/classes/:classId/teachers/:userId (el propietario)',
    request: f => ({
      method: 'PATCH',
      url: `${c(f)}/teachers/${f.users.owner.id}`,
      payload: { access: 'read' },
    }),
    owner: 403,
    other: 404,
    student: 403,
    levels: { read: 403, edit: 403, admin: 403 },
  },
  {
    route: 'DELETE /teacher/classes/:classId/teachers/:userId (el propietario)',
    request: f => ({ method: 'DELETE', url: `${c(f)}/teachers/${f.users.owner.id}` }),
    owner: 403,
    other: 404,
    student: 403,
    levels: { read: 403, edit: 403, admin: 403 },
  },
  {
    // Pasar la clase es solo del propietario. Aquí a alguien con lectura, que no
    // puede recibirla: el propietario pasa el acceso y se queda en el 400, y la
    // clase de la matriz no cambia de manos. El traspaso que sale bien está en
    // tests/routes/class-teachers.db.test.ts.
    route: 'POST /teacher/classes/:classId/transfer',
    request: async f => ({
      method: 'POST',
      url: `${c(f)}/transfer`,
      payload: { userId: (await newRouteTeacher(f.classId)).id },
    }),
    owner: 400,
    other: 404,
    student: 403,
    levels: { read: 403, edit: 403, admin: 403 },
    after: dropRouteTeachers,
  },
  {
    // El propietario no sale de su clase: antes la pasa. Lo que consigue cada
    // nivel está en su propio caso, más abajo, con profesorado de usar y tirar.
    route: 'POST /teacher/classes/:classId/leave',
    request: f => ({ method: 'POST', url: `${c(f)}/leave` }),
    owner: 403,
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
    levels: levels('edit', 200),
  },
  {
    route: 'POST /teacher/classes/:classId/students/:studentId/avatar/generate',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/students/${f.users.student.id}/avatar/generate`,
      payload: { avatar_id: 'avatar-1', wardrobe_prompt: 'capa', background_prompt: 'bosque' },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
  },
  {
    route: 'GET /teacher/students?classId=',
    request: f => ({ method: 'GET', url: `/teacher/students?classId=${f.classId}` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'GET /teacher/students/:studentId',
    request: f => ({ method: 'GET', url: `/teacher/students/${f.users.student.id}` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'GET /teacher/missions?classIdFilter=',
    request: f => ({ method: 'GET', url: `/teacher/missions?classIdFilter=${f.classId}` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'POST /teacher/missions',
    request: f => ({
      method: 'POST',
      url: '/teacher/missions',
      payload: { title: 'Misión nueva', classId: f.classId, enigmas: [{ title: 'Enigma' }] },
    }),
    owner: 201,
    other: 404,
    student: 403,
    levels: levels('edit', 201),
  },
  {
    route: 'PUT /teacher/missions/:missionId',
    request: async f => ({
      method: 'PUT',
      url: `/teacher/missions/${await f.newMission()}`,
      payload: { title: 'Otro título' },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
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
    owner: 404,
    other: 404,
    student: 403,
    // El profesorado añadido tampoco llega a la misión, que es de la otra clase.
    levels: { read: 404, edit: 404, admin: 404 },
  },
  {
    route: 'PUT /teacher/missions/:missionId (sacar de la clase a una ajena)',
    request: async f => ({
      method: 'PUT',
      url: `/teacher/missions/${await f.newMission()}`,
      payload: { title: 'Fuera', classId: f.otherClassId },
    }),
    // El propietario tiene la misión, pero no la clase de destino.
    owner: 404,
    other: 404,
    student: 403,
    // Lectura se queda en la misión; edición y administración, en el destino.
    levels: { read: 403, edit: 404, admin: 404 },
  },
]

const SHOP: RouteCase[] = [
  {
    route: 'GET /teacher/classes/:classId/shop',
    request: f => ({ method: 'GET', url: `${c(f)}/shop` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'POST /teacher/classes/:classId/shop/items',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/shop/items`,
      payload: { name: 'Comodín', price: 10 },
    }),
    owner: 201,
    other: 404,
    student: 403,
    levels: levels('edit', 201),
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
    levels: levels('edit', 200),
  },
  {
    route: 'DELETE /teacher/classes/:classId/shop/items/:itemId',
    request: async f => ({ method: 'DELETE', url: `${c(f)}/shop/items/${await f.newShopItem()}` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
  },
]

const BEHAVIORS: RouteCase[] = [
  {
    route: 'GET /teacher/classes/:classId/behaviors',
    request: f => ({ method: 'GET', url: `${c(f)}/behaviors` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'POST /teacher/classes/:classId/behaviors',
    request: f => ({
      method: 'POST',
      url: `${c(f)}/behaviors`,
      payload: { kind: 'positive', name: 'Ayuda', xp: 5 },
    }),
    owner: 201,
    other: 404,
    student: 403,
    levels: levels('edit', 201),
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
    levels: levels('edit', 200),
  },
  {
    route: 'DELETE /teacher/classes/:classId/behaviors/:behaviorId',
    request: async f => ({ method: 'DELETE', url: `${c(f)}/behaviors/${await f.newBehavior()}` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
  },
  {
    route: 'POST /teacher/classes/:classId/behaviors/:behaviorId/apply',
    request: async f => ({
      method: 'POST',
      url: `${c(f)}/behaviors/${await f.newBehavior()}/apply`,
      payload: { studentId: f.users.student.id },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
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
    other: 404,
    student: 403,
    levels: levels('edit', 201),
  },
  {
    route: 'PATCH /missions/:missionId',
    request: async f => ({
      method: 'PATCH',
      url: `/missions/${await f.newMission()}`,
      payload: { title: 'Cambiada' },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
  },
  {
    route: 'POST /missions/:missionId/documents',
    request: async f => ({
      method: 'POST',
      url: `/missions/${await f.newMission()}/documents`,
      ...formData({ name: 'Enlace', url: 'https://example.invalid/doc', type: 'link' }),
    }),
    owner: 201,
    other: 404,
    student: 403,
    levels: levels('edit', 201),
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
    other: 404,
    student: 403,
    levels: levels('edit', 200),
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
    levels: levels('edit', 200),
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
    levels: levels('edit', 200),
  },
  {
    route: 'POST /missions/:missionId/enigmas',
    request: async f => ({
      method: 'POST',
      url: `/missions/${await f.newMission()}/enigmas`,
      payload: { title: 'Enigma nuevo', xp: 10 },
    }),
    owner: 201,
    other: 404,
    student: 403,
    levels: levels('edit', 201),
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
    levels: levels('edit', 200),
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
    other: 404,
    student: 403,
    levels: levels('edit', 200),
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
    levels: levels('edit', 200),
  },
  {
    route: 'PUT /missions/:missionId/rewards',
    request: async f => ({
      method: 'PUT',
      url: `/missions/${await f.newMission()}/rewards`,
      payload: { badgeId: await f.newBadge('owner') },
    }),
    owner: 200,
    other: 404,
    student: 403,
    // La insignia es suelta y del propietario: nadie más la usa, aunque edite la clase.
    levels: { read: 403, edit: 404, admin: 404 },
  },
  {
    route: 'PUT /missions/:missionId/rewards (quitar la insignia)',
    request: async f => ({
      method: 'PUT',
      url: `/missions/${await f.newMission()}/rewards`,
      payload: { badgeId: null },
    }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
  },
  {
    route: 'PUT /missions/:missionId/rewards (insignia de otra misión de la clase)',
    request: async f => {
      // Vinculada a una misión de la clase: la usa quien edita la clase, la creara quien la creara.
      const badge = await prisma.badge.create({
        data: { name: 'De la clase', teacherId: f.users.owner.id, missionId: await f.newMission() },
      })
      return {
        method: 'PUT',
        url: `/missions/${await f.newMission()}/rewards`,
        payload: { badgeId: badge.id },
      }
    },
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('edit', 200),
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
    other: 404,
    student: 403,
    levels: levels('read', 200),
  },
  {
    route: 'GET /submissions/classes/:classId',
    request: f => ({ method: 'GET', url: `/submissions/classes/${f.classId}` }),
    owner: 200,
    other: 404,
    student: 403,
    levels: levels('read', 200),
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
    other: 404,
    student: 403,
    levels: levels('edit', 200),
  },
]

const groups: [string, RouteCase[]][] = [
  ['clase', TEACHER_CLASS],
  ['tienda', SHOP],
  ['comportamientos', BEHAVIORS],
  ['misiones, enigmas y documentos', MISSIONS],
  ['entregas', SUBMISSIONS],
]

const CO_PROFILE = { read: 'practicas', edit: 'sustituto', admin: 'titular' } as const

/** Espera a que `read` cumpla `done`: para lo que la API hace sin esperar (los avisos). */
async function eventually<T>(read: () => Promise<T>, done: (value: T) => boolean): Promise<T> {
  for (let i = 0; i < 50; i++) {
    const value = await read()
    if (done(value)) return value
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  return read()
}

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
    await prisma.user.deleteMany({ where: { id: { in: routeTeachers } } })
    await app?.close()
  })

  const send = (req: RouteRequest, actor?: Actor) =>
    app.inject({
      method: req.method,
      url: req.url,
      payload: req.payload as any,
      headers: { ...req.headers, ...(actor ? { authorization: `Bearer ${f.token(actor)}` } : {}) },
    })

  for (const [group, cases] of groups) {
    for (const routeCase of cases) {
      it(`${group} · ${routeCase.route} → propietario ${routeCase.owner}, otro profesor ${routeCase.other}, alumno ${routeCase.student}, sin sesión 401`, async () => {
        const req = await routeCase.request(f)

        // Primero los rechazos: si alguno pasara, el propietario ya no encontraría lo mismo.
        const anonymous = await send(req)
        const student = await send(req, 'student')
        const other = await send(req, 'other')
        const owner = await send(req, 'owner')
        await routeCase.after?.(f)

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
    const owner = await send({ method: 'GET', url }, 'owner')
    expect(owner.statusCode).toBe(200)
    expect(owner.json().mission).toMatchObject({ isTeacher: true, canEdit: true })
    const student = await send({ method: 'GET', url }, 'student')
    expect(student.statusCode).toBe(200)
    expect(student.json().mission).toMatchObject({
      isTeacher: false,
      canEdit: false,
      teacherStats: null,
    })
    expect((await send({ method: 'GET', url }, 'other')).statusCode).toBe(404)
    const outsider = await app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${tokenOutsider}` },
    })
    expect(outsider.statusCode).toBe(404)
  })

  it('GET /missions/:missionId/documents → propietario y alumno de la clase 200; otro profesor y alumno ajeno 404; sin sesión 401', async () => {
    const missionId = await f.newMission()
    await f.newDocument(missionId)
    const url = `/missions/${missionId}/documents`

    expect((await send({ method: 'GET', url })).statusCode).toBe(401)
    expect((await send({ method: 'GET', url }, 'owner')).statusCode).toBe(200)
    expect((await send({ method: 'GET', url }, 'student')).statusCode).toBe(200)
    expect((await send({ method: 'GET', url }, 'other')).statusCode).toBe(404)
    expect((await send({ method: 'GET', url }, 'outsider')).statusCode).toBe(404)
  })

  it('GET /missions/:missionId/documents → al alumno se le cierran con la misión bloqueada o la clase archivada; al propietario no', async () => {
    const missionId = await f.newMission()
    await f.newDocument(missionId)
    const url = `/missions/${missionId}/documents`

    await prisma.mission.update({ where: { id: missionId }, data: { status: 'bloqueada' } })
    expect((await send({ method: 'GET', url }, 'student')).statusCode).toBe(404)
    expect((await send({ method: 'GET', url }, 'owner')).statusCode).toBe(200)
    await prisma.mission.update({ where: { id: missionId }, data: { status: 'activa' } })

    await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
    try {
      expect((await send({ method: 'GET', url }, 'student')).statusCode).toBe(404)
      expect((await send({ method: 'GET', url }, 'owner')).statusCode).toBe(200)
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
    }
  })

  it('reordenar solo cambia el orden de lo que es de esa misión', async () => {
    const propia = await f.newMission()
    const ajena = await f.newMission(f.otherClassId)
    const documentoAjeno = await f.newDocument(ajena)
    const enigmaAjeno = await f.newEnigma(ajena)
    const orden = async (table: 'missionDocument' | 'missionEnigma', id: string) =>
      table === 'missionDocument'
        ? (await prisma.missionDocument.findUnique({ where: { id } }))?.orderIndex
        : (await prisma.missionEnigma.findUnique({ where: { id } }))?.orderIndex

    const antesDocumento = await orden('missionDocument', documentoAjeno)
    const antesEnigma = await orden('missionEnigma', enigmaAjeno)

    const reordena = (recurso: 'documents' | 'enigmas', ids: string[]) =>
      send(
        {
          method: 'PUT',
          url: `/missions/${propia}/${recurso}/reorder`,
          payload: { ids },
        },
        'owner'
      )

    expect(
      (await reordena('documents', [await f.newDocument(propia), documentoAjeno])).statusCode
    ).toBe(200)
    expect((await reordena('enigmas', [await f.newEnigma(propia), enigmaAjeno])).statusCode).toBe(
      200
    )

    expect(await orden('missionDocument', documentoAjeno)).toBe(antesDocumento)
    expect(await orden('missionEnigma', enigmaAjeno)).toBe(antesEnigma)
  })

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
    // Con ?classId= de una clase ajena, 404 como el resto de rutas de la clase.
    expect(
      (await send({ method: 'GET', url: `/teacher/students?classId=${f.classId}` }, 'other'))
        .statusCode
    ).toBe(404)

    // El propietario cuenta el alumnado de su clase (el de la fixture y el que
    // hayan dado de alta las rutas de más arriba); el otro profesor, ninguno.
    expect(JSON.parse(await get('/teacher/stats', 'owner')).totalStudents).toBeGreaterThanOrEqual(1)
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

      // Con la clase archivada la plantilla deja de estar disponible: ni listado, ni detalle, ni importación.
      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      expect((await send(list, 'other')).body).not.toContain(f.classId)
      expect((await send(detail, 'other')).statusCode).toBe(404)
      expect((await send(importIt, 'other')).statusCode).toBe(404)
      expect(await countOthers()).toBe(before)
    } finally {
      await prisma.class.update({
        where: { id: f.classId },
        data: { isTemplate: false, archived: false },
      })
    }
  })

  // ---- Insignias: las sueltas son del profesor; las de una misión, de quien edita su clase ----

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
  it('insignias → solo se vinculan a una misión de una clase donde se puede editar el contenido', async () => {
    const mine = await f.newMission()
    const foreign = await f.newMission(f.otherClassId)
    const post = (missionId: string) =>
      ({
        method: 'POST',
        url: '/teacher/badges',
        payload: { name: 'Con misión', missionId },
      }) as const
    const linkedTo = (missionId: string) => prisma.badge.count({ where: { missionId } })

    // La misión de una clase ajena no se acepta y no queda nada vinculado a ella.
    expect((await send(post(foreign), 'owner')).statusCode).toBe(404)
    expect(await linkedTo(foreign)).toBe(0)

    const created = await send(post(mine), 'owner')
    expect(created.statusCode).toBe(201)
    expect(await linkedTo(mine)).toBe(1)

    const badgeId = created.json().badge.id
    const put = (missionId: string) =>
      ({ method: 'PUT', url: `/teacher/badges/${badgeId}`, payload: { missionId } }) as const
    expect((await send(put(foreign), 'owner')).statusCode).toBe(404)
    expect(await linkedTo(foreign)).toBe(0)
    expect((await send(put(mine), 'owner')).statusCode).toBe(200)
    expect(await linkedTo(mine)).toBe(1)

    // Con lectura en la clase no basta: vincular una insignia es editar su contenido.
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
      expect((await send(post(mine), 'other')).statusCode).toBe(403)
      expect(await linkedTo(mine)).toBe(1)
      await prisma.classTeacher.update({
        where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
        data: { access: 'edit' },
      })
      expect((await send(post(mine), 'other')).statusCode).toBe(201)
      expect(await linkedTo(mine)).toBe(2)
    } finally {
      await prisma.classTeacher.delete({
        where: { classId_userId: { classId: f.classId, userId: f.users.other.id } },
      })
    }
  })

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

/**
 * Profesorado añadido a una clase: con su propia clase de pruebas, para que las
 * filas de profesorado de estos casos no cambien lo que comprueban los de arriba.
 */
describeWithDatabase('matriz de acceso del profesorado añadido a una clase', () => {
  let app: FastifyInstance
  let f: ClassFixture
  /** Profesores añadidos a la clase del propietario, uno por nivel. */
  const co = {} as Record<CoLevel, { id: string; name: string; token: string }>
  /** Los que crea cada test para sí, con `newTeacher`. */
  const extraTeachers: string[] = []

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(missionsRoutes, { prefix: '/missions' })
      await instance.register(submissionsRoutes, { prefix: '/submissions' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)

    const tag = f.classId.slice(0, 8)
    for (const level of CO_LEVELS) {
      const user = await prisma.user.create({
        data: {
          email: `co-${level}.${tag}@test.invalid`,
          passwordHash: 'x',
          name: `Co ${level} ${tag}`,
          role: 'teacher',
          isOnboarded: true,
        },
      })
      await prisma.classTeacher.create({
        data: {
          classId: f.classId,
          userId: user.id,
          access: level,
          profile: CO_PROFILE[level],
          addedById: f.users.owner.id,
        },
      })
      co[level] = {
        id: user.id,
        name: user.name,
        token: app.jwt.sign({ id: user.id, role: 'teacher' }),
      }
    }
  })

  afterAll(async () => {
    const coIds = [...Object.values(co).map(u => u.id), ...extraTeachers]
    // Sus insignias no se borran con la cuenta (quedarían sin autor): se quitan antes.
    await prisma.badge.deleteMany({ where: { teacherId: { in: coIds } } })
    // Y lo que han creado por las rutas: copias de la clase y cuentas de alumnado.
    await prisma.class.deleteMany({ where: { teacherId: { in: coIds } } })
    await prisma.user.deleteMany({ where: { createdById: { in: coIds } } })
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: [...coIds, ...routeTeachers] } } })
    await app?.close()
  })

  /** Un profesor nuevo con fila en la clase (por defecto la del propietario) con ese nivel. */
  const newTeacher = async (
    level: CoLevel,
    { classId = f.classId, endsAt = null }: { classId?: string; endsAt?: Date | null } = {}
  ) => {
    const user = await prisma.user.create({
      data: {
        email: `co-${randomUUID().slice(0, 8)}@test.invalid`,
        passwordHash: 'x',
        name: `Co ${level} extra`,
        role: 'teacher',
        isOnboarded: true,
      },
    })
    extraTeachers.push(user.id)
    await prisma.classTeacher.create({
      data: {
        classId,
        userId: user.id,
        access: level,
        profile: CO_PROFILE[level],
        addedById: f.users.owner.id,
        endsAt,
      },
    })
    return { id: user.id, token: app.jwt.sign({ id: user.id, role: 'teacher' }) }
  }

  /** Cambia el nivel de un profesor en una clase, o lo quita (null). */
  const setLevel = async (userId: string, level: CoLevel | null, classId = f.classId) => {
    const where = { classId_userId: { classId, userId } }
    if (level) await prisma.classTeacher.update({ where, data: { access: level } })
    else await prisma.classTeacher.delete({ where })
  }

  const sendAs = (req: RouteRequest, token: string) =>
    app.inject({
      method: req.method,
      url: req.url,
      payload: req.payload as any,
      headers: { ...req.headers, authorization: `Bearer ${token}` },
    })

  const send = (req: RouteRequest, actor?: Actor) =>
    app.inject({
      method: req.method,
      url: req.url,
      payload: req.payload as any,
      headers: { ...req.headers, ...(actor ? { authorization: `Bearer ${f.token(actor)}` } : {}) },
    })

  for (const [group, cases] of groups) {
    for (const routeCase of cases) {
      const expected = routeCase.levels
      if (!expected) continue
      it(`${group} · ${routeCase.route} → profesorado añadido: lectura ${expected.read}, edición ${expected.edit}, administración ${expected.admin}`, async () => {
        const got = {} as Record<CoLevel, number>
        // Una petición nueva por nivel: la que borra o aprueba no deja nada al siguiente.
        for (const level of CO_LEVELS) {
          got[level] = (await sendAs(await routeCase.request(f), co[level].token)).statusCode
        }
        await routeCase.after?.(f)
        expect(got).toEqual(expected)
      })
    }
  }

  it('entregas → el aviso de una entrega nueva llega una vez a quien puede aprobarla y, al aprobarla, queda leído para todos', async () => {
    const enigmaId = await f.newEnigma(await f.newMission())
    const submitted = await send(
      { method: 'POST', url: `/submissions/enigmas/${enigmaId}`, ...formData({ nota: 'hecho' }) },
      'student'
    )
    expect(submitted.statusCode).toBe(201)
    const submissionId: string = submitted.json().submission.id

    const notices = () =>
      prisma.notification.findMany({
        where: {
          type: 'submission_received',
          metadata: { path: ['submissionId'], equals: submissionId },
        },
        select: { userId: true, isRead: true },
      })
    const reviewers = [f.users.owner.id, co.edit.id, co.admin.id]
    const received = await eventually(notices, rows => rows.length >= reviewers.length)
    // Ni el nivel de lectura ni un profesor ajeno: solo quien puede aprobarla, una vez cada uno.
    expect(received.map(n => n.userId).sort()).toEqual([...reviewers].sort())
    expect(received.every(n => !n.isRead)).toBe(true)

    const approve = {
      method: 'POST',
      url: `/submissions/${submissionId}/approve`,
      payload: { percentage: 50 },
    } as const
    expect((await sendAs(approve, co.read.token)).statusCode).toBe(403)
    expect(
      (await prisma.enigmaSubmission.findUniqueOrThrow({ where: { id: submissionId } })).status
    ).toBe('pendiente')

    expect((await sendAs(approve, co.edit.token)).statusCode).toBe(200)
    const after = await eventually(notices, rows => rows.every(n => n.isRead))
    expect(after.every(n => n.isRead)).toBe(true)

    // En el feed del alumno figura quien la aprobó, no el propietario de la clase.
    const feed = await prisma.activity.findFirst({
      where: { userId: f.users.student.id, type: 'enigma_completed', enigmaTitle: 'Enigma' },
      orderBy: { createdAt: 'desc' },
      select: { teacherName: true },
    })
    expect(feed?.teacherName).toBe(co.edit.name)
  })

  it('comportamientos → lo aplicado por un profesor añadido queda a su nombre', async () => {
    const behaviorId = await f.newBehavior()
    const applied = await sendAs(
      {
        method: 'POST',
        url: `${c(f)}/behaviors/${behaviorId}/apply`,
        payload: { studentId: f.users.student.id },
      },
      co.edit.token
    )
    expect(applied.statusCode).toBe(200)
    const application = await prisma.behaviorApplication.findUniqueOrThrow({
      where: { id: applied.json().application.id },
    })
    expect(application.teacherId).toBe(co.edit.id)
  })

  it('profesorado → sale de la clase con cualquier nivel; su fila y su vista previa se van', async () => {
    for (const level of CO_LEVELS) {
      const teacher = await newTeacher(level)
      await prisma.classEnrollment.create({
        data: { classId: f.classId, studentId: teacher.id, isPreview: true },
      })
      const left = await sendAs({ method: 'POST', url: `${c(f)}/leave` }, teacher.token)
      expect(left.statusCode, level).toBe(200)
      expect(
        await prisma.classTeacher.count({ where: { classId: f.classId, userId: teacher.id } })
      ).toBe(0)
      expect(
        await prisma.classEnrollment.count({ where: { classId: f.classId, studentId: teacher.id } })
      ).toBe(0)
      // Fuera de la clase ya no la encuentra.
      expect((await sendAs({ method: 'GET', url: c(f) }, teacher.token)).statusCode).toBe(404)
    }
  })

  // ---- Misiones ----

  it('GET /missions/:missionId → el profesorado añadido la ve como profesor, también bloqueada o archivada; solo edita desde edición', async () => {
    const missionId = await f.newMission()
    await f.newDocument(missionId)
    const view = (token: string) => sendAs({ method: 'GET', url: `/missions/${missionId}` }, token)
    const documents = (token: string) =>
      sendAs({ method: 'GET', url: `/missions/${missionId}/documents` }, token)

    const check = async () => {
      for (const level of CO_LEVELS) {
        const response = await view(co[level].token)
        expect(response.statusCode).toBe(200)
        expect(response.json().mission).toMatchObject({
          isTeacher: true,
          canEdit: level !== 'read',
          teacherStats: expect.objectContaining({ totalStudents: expect.any(Number) }),
        })
        expect((await documents(co[level].token)).statusCode).toBe(200)
      }
    }

    await check()
    await prisma.mission.update({ where: { id: missionId }, data: { status: 'bloqueada' } })
    await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
    try {
      await check()
      expect(
        (await send({ method: 'GET', url: `/missions/${missionId}` }, 'student')).statusCode
      ).toBe(404)
    } finally {
      await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
    }
  })

  it('misiones → con lectura no se cambia nada: ni la misión, ni sus enigmas, documentos o insignia', async () => {
    const missionId = await f.newMission()
    const enigmaId = await f.newEnigma(missionId)
    await f.newEnigma(missionId)
    const documentId = await f.newDocument(missionId)
    const badgeId = await f.newBadge('owner')
    await prisma.badge.update({ where: { id: badgeId }, data: { missionId } })
    const token = co.read.token

    const attempts: RouteRequest[] = [
      {
        method: 'PATCH',
        url: `/missions/${missionId}`,
        payload: { title: 'Lectura', status: 'bloqueada' },
      },
      { method: 'PUT', url: `/teacher/missions/${missionId}`, payload: { title: 'Lectura' } },
      {
        method: 'PUT',
        url: `/missions/${missionId}/enigmas/${enigmaId}`,
        payload: { title: 'Lectura', xp: 99 },
      },
      { method: 'DELETE', url: `/missions/${missionId}/enigmas/${enigmaId}` },
      {
        method: 'PUT',
        url: `/missions/${missionId}/documents/${documentId}`,
        payload: { name: 'Lectura' },
      },
      { method: 'DELETE', url: `/missions/${missionId}/documents/${documentId}` },
      { method: 'PUT', url: `/missions/${missionId}/rewards`, payload: { badgeId: null } },
    ]
    for (const attempt of attempts) {
      const route = `${attempt.method} ${attempt.url}`
      expect((await sendAs(attempt, token)).statusCode, route).toBe(403)
    }

    expect(await prisma.mission.findUniqueOrThrow({ where: { id: missionId } })).toMatchObject({
      title: expect.stringMatching(/^Misión /),
      status: 'activa',
    })
    expect(await prisma.missionEnigma.findUniqueOrThrow({ where: { id: enigmaId } })).toMatchObject(
      {
        title: 'Enigma',
        xpReward: 10,
      }
    )
    expect(
      await prisma.missionDocument.findUniqueOrThrow({ where: { id: documentId } })
    ).toMatchObject({
      name: 'Apuntes',
    })
    expect((await prisma.badge.findUniqueOrThrow({ where: { id: badgeId } })).missionId).toBe(
      missionId
    )
  })

  it('misiones → se mueve a otra clase solo con edición en las dos', async () => {
    // Una segunda clase del propietario, en la que el profesor de edición entra con lectura.
    const target = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: 'Destino', invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    await prisma.classTeacher.create({
      data: {
        classId: target.id,
        userId: co.edit.id,
        access: 'read',
        profile: 'practicas',
        addedById: f.users.owner.id,
      },
    })
    const move = async () => {
      const missionId = await f.newMission()
      const response = await sendAs(
        { method: 'PATCH', url: `/missions/${missionId}`, payload: { classId: target.id } },
        co.edit.token
      )
      const { classId } = await prisma.mission.findUniqueOrThrow({ where: { id: missionId } })
      return { status: response.statusCode, classId }
    }

    try {
      expect(await move()).toEqual({ status: 403, classId: f.classId })
      await prisma.classTeacher.update({
        where: { classId_userId: { classId: target.id, userId: co.edit.id } },
        data: { access: 'edit' },
      })
      expect(await move()).toEqual({ status: 200, classId: target.id })
    } finally {
      await prisma.class.delete({ where: { id: target.id } })
    }
  })

  // ---- Insignias ----

  it('insignias → una suelta sigue siendo solo de quien la creó, aunque se comparta la clase', async () => {
    const badgeId = await f.newBadge('owner')
    for (const level of CO_LEVELS) {
      const token = co[level].token
      expect((await sendAs({ method: 'GET', url: '/teacher/badges' }, token)).body).not.toContain(
        badgeId
      )
      expect(
        (await sendAs({ method: 'GET', url: `/teacher/badges/${badgeId}` }, token)).statusCode
      ).toBe(404)
      expect(
        (
          await sendAs(
            { method: 'PUT', url: `/teacher/badges/${badgeId}`, payload: { name: 'Mía' } },
            token
          )
        ).statusCode
      ).toBe(404)
      expect(
        (await sendAs({ method: 'DELETE', url: `/teacher/badges/${badgeId}` }, token)).statusCode
      ).toBe(404)
    }
    expect(await prisma.badge.findUnique({ where: { id: badgeId } })).toMatchObject({
      name: 'Insignia',
    })
  })

  it('insignias → la vinculada a una misión la ve, cambia y borra quien tiene edición en su clase; lectura y ajenos no', async () => {
    const missionId = await f.newMission()
    const linked = async () =>
      (
        await prisma.badge.create({
          data: { name: 'De la misión', teacherId: f.users.owner.id, missionId },
        })
      ).id

    const badgeId = await linked()
    const get = (token: string) =>
      sendAs({ method: 'GET', url: `/teacher/badges/${badgeId}` }, token)
    const put = (token: string, name: string) =>
      sendAs({ method: 'PUT', url: `/teacher/badges/${badgeId}`, payload: { name } }, token)

    // Lectura y un profesor ajeno: ni la ven en su biblioteca ni la tocan.
    expect(
      (await sendAs({ method: 'GET', url: '/teacher/badges' }, co.read.token)).body
    ).not.toContain(badgeId)
    expect((await get(co.read.token)).statusCode).toBe(404)
    expect((await put(co.read.token, 'Lectura')).statusCode).toBe(404)
    expect(
      (await send({ method: 'GET', url: `/teacher/badges/${badgeId}` }, 'other')).statusCode
    ).toBe(404)
    expect(
      (
        await send(
          { method: 'PUT', url: `/teacher/badges/${badgeId}`, payload: { name: 'Ajena' } },
          'other'
        )
      ).statusCode
    ).toBe(404)

    for (const level of ['edit', 'admin'] as const) {
      expect(
        (await sendAs({ method: 'GET', url: '/teacher/badges' }, co[level].token)).body
      ).toContain(badgeId)
      expect((await get(co[level].token)).statusCode).toBe(200)
      expect((await put(co[level].token, `Cambiada ${level}`)).statusCode).toBe(200)
    }
    expect((await prisma.badge.findUniqueOrThrow({ where: { id: badgeId } })).name).toBe(
      'Cambiada admin'
    )

    // Sin acceso a la clase de destino no se la lleva a otra misión.
    const foreign = await f.newMission(f.otherClassId)
    expect(
      (
        await sendAs(
          { method: 'PUT', url: `/teacher/badges/${badgeId}`, payload: { missionId: foreign } },
          co.edit.token
        )
      ).statusCode
    ).toBe(404)
    expect((await prisma.badge.findUniqueOrThrow({ where: { id: badgeId } })).missionId).toBe(
      missionId
    )

    expect(
      (await sendAs({ method: 'DELETE', url: `/teacher/badges/${badgeId}` }, co.read.token))
        .statusCode
    ).toBe(404)
    expect(
      (await sendAs({ method: 'DELETE', url: `/teacher/badges/${badgeId}` }, co.edit.token))
        .statusCode
    ).toBe(200)
    expect(await prisma.badge.findUnique({ where: { id: badgeId } })).toBeNull()
  })

  it('insignias → su autor pierde la vinculada a una misión si deja de poder editar la clase', async () => {
    const author = await newTeacher('edit')
    const missionId = await f.newMission()
    const created = await sendAs(
      { method: 'POST', url: '/teacher/badges', payload: { name: 'Del autor', missionId } },
      author.token
    )
    expect(created.statusCode).toBe(201)
    const badgeId: string = created.json().badge.id

    const library = async () =>
      (await sendAs({ method: 'GET', url: '/teacher/badges' }, author.token)).body
    const attempts = async () => ({
      put: (
        await sendAs(
          { method: 'PUT', url: `/teacher/badges/${badgeId}`, payload: { name: 'Cambiada' } },
          author.token
        )
      ).statusCode,
      del: (await sendAs({ method: 'DELETE', url: `/teacher/badges/${badgeId}` }, author.token))
        .statusCode,
    })
    // Una clase suya en la que llevársela a otra misión.
    const own = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: 'Del autor', invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        author.id
      )
    )
    const ownMission = await f.newMission(own.id)
    const takeIt = async () =>
      (
        await sendAs(
          { method: 'PUT', url: `/missions/${ownMission}/rewards`, payload: { badgeId } },
          author.token
        )
      ).statusCode

    try {
      expect(await library()).toContain(badgeId)

      for (const level of ['read', null] as const) {
        await setLevel(author.id, level)
        expect(await library(), `${level}`).not.toContain(badgeId)
        expect(await attempts(), `${level}`).toEqual({ put: 404, del: 404 })
        expect(await takeIt(), `${level}`).toBe(404)
      }
      expect(await prisma.badge.findUniqueOrThrow({ where: { id: badgeId } })).toMatchObject({
        name: 'Del autor',
        missionId,
      })
    } finally {
      await prisma.class.delete({ where: { id: own.id } })
    }
  })

  it('insignias → la de una misión no se saca de su clase, salvo su autor a otra clase donde edita', async () => {
    const coEdit = await newTeacher('edit')
    // Otra clase del propietario en la que el profesor añadido también edita.
    const second = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: 'Segunda', invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    await prisma.classTeacher.create({
      data: {
        classId: second.id,
        userId: coEdit.id,
        access: 'edit',
        profile: 'sustituto',
        addedById: f.users.owner.id,
      },
    })
    const sourceMission = await f.newMission(second.id)
    const targetMission = await f.newMission()
    const badgeId = (
      await prisma.badge.create({
        data: { name: 'De la segunda', teacherId: f.users.owner.id, missionId: sourceMission },
      })
    ).id
    const where = async () =>
      (await prisma.badge.findUniqueOrThrow({ where: { id: badgeId } })).missionId

    try {
      // Quien no es su autor no se la lleva, ni desde la misión ni desde la insignia.
      expect(
        (
          await sendAs(
            { method: 'PUT', url: `/missions/${targetMission}/rewards`, payload: { badgeId } },
            coEdit.token
          )
        ).statusCode
      ).toBe(404)
      expect(
        (
          await sendAs(
            {
              method: 'PUT',
              url: `/teacher/badges/${badgeId}`,
              payload: { missionId: targetMission },
            },
            coEdit.token
          )
        ).statusCode
      ).toBe(404)
      expect(await where()).toBe(sourceMission)

      // Dentro de su clase sí la cambia de misión.
      const sibling = await f.newMission(second.id)
      expect(
        (
          await sendAs(
            { method: 'PUT', url: `/missions/${sibling}/rewards`, payload: { badgeId } },
            coEdit.token
          )
        ).statusCode
      ).toBe(200)
      expect(await where()).toBe(sibling)

      // Su autor, el propietario de las dos clases, sí se la lleva a la otra.
      expect(
        (
          await send(
            { method: 'PUT', url: `/missions/${targetMission}/rewards`, payload: { badgeId } },
            'owner'
          )
        ).statusCode
      ).toBe(200)
      expect(await where()).toBe(targetMission)
    } finally {
      await prisma.badge.delete({ where: { id: badgeId } })
      await prisma.class.delete({ where: { id: second.id } })
      await setLevel(coEdit.id, null)
    }
  })

  it('insignias → crear una vinculada a una misión pide edición en su clase', async () => {
    const missionId = await f.newMission()
    const create = (token: string) =>
      sendAs(
        { method: 'POST', url: '/teacher/badges', payload: { name: 'Nueva', missionId } },
        token
      )
    expect((await create(co.read.token)).statusCode).toBe(403)
    expect(await prisma.badge.count({ where: { missionId } })).toBe(0)
    expect((await create(co.edit.token)).statusCode).toBe(201)
    expect(await prisma.badge.count({ where: { missionId } })).toBe(1)
    const expired = await newTeacher('admin', { endsAt: new Date(Date.now() - 60_000) })
    expect((await create(expired.token)).statusCode).toBe(404)
    await setLevel(expired.id, null)
  })

  // ---- Clase y listados ----

  it('clase → el profesorado añadido la ve con su nivel; el código de invitación, solo con administración', async () => {
    const { invitationCode } = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
    for (const level of CO_LEVELS) {
      const token = co[level].token
      const code = level === 'admin' ? invitationCode : null
      const myAccess = { access: level, profile: CO_PROFILE[level], isOwner: false }

      const detail = (await sendAs({ method: 'GET', url: c(f) }, token)).json().class
      expect(detail).toMatchObject({ id: f.classId, invitationCode: code, myAccess })
      expect(detail.teachers).toHaveLength(1 + CO_LEVELS.length)

      const list = (
        await sendAs({ method: 'GET', url: '/teacher/classes?archived=all' }, token)
      ).json().classes
      expect(list.find((cls: { id: string }) => cls.id === f.classId)).toMatchObject({
        invitationCode: code,
        myAccess,
      })

      // Lo que devuelve al guardar el contenido tampoco lleva el código si no llega.
      if (level !== 'read') {
        const saved = await sendAs(
          { method: 'PUT', url: c(f), payload: { narrative: `Narrativa de ${level}` } },
          token
        )
        expect(saved.json().class.invitationCode).toBe(code)
      }
    }
  })

  it('listados → el profesorado añadido encuentra la clase, sus misiones, alumnos y actividad, con cualquier nivel', async () => {
    const missionId = await f.newMission()
    const here = await prisma.activity.create({
      data: {
        userId: f.users.student.id,
        type: 'class_joined',
        description: 'Se une a la clase',
        classId: f.classId,
      },
    })
    // Lo que el mismo alumno hace en una clase ajena no sale en la actividad de nadie más.
    const elsewhere = await prisma.activity.create({
      data: {
        userId: f.users.student.id,
        type: 'class_joined',
        description: 'Se une a otra clase',
        classId: f.otherClassId,
      },
    })

    for (const level of CO_LEVELS) {
      const token = co[level].token
      const get = async (url: string) => {
        const response = await sendAs({ method: 'GET', url }, token)
        expect(response.statusCode, `${level} ${url}`).toBe(200)
        return response.body
      }
      expect(await get('/teacher/missions')).toContain(missionId)
      expect(await get('/teacher/students')).toContain(f.users.student.id)
      expect(await get(`/teacher/students?classId=${f.classId}`)).toContain(f.users.student.id)
      expect(JSON.parse(await get('/teacher/stats')).totalStudents).toBeGreaterThanOrEqual(1)
      const activities = await get('/teacher/activities?limit=50')
      expect(activities).toContain(here.id)
      expect(activities).not.toContain(elsewhere.id)
      const student = JSON.parse(await get(`/teacher/students/${f.users.student.id}`)).student
      expect(student.classes.map((cls: { id: string }) => cls.id)).toEqual([f.classId])
      expect(student.classes[0].myAccess).toMatchObject({ access: level })
    }
  })

  it('PUT /teacher/classes/:classId → con edición, contenido y ajustes juntos se rechazan enteros', async () => {
    const before = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
    const response = await sendAs(
      {
        method: 'PUT',
        url: c(f),
        payload: { narrative: 'Con ajustes', levelConfig: { baseXp: 999 } },
      },
      co.edit.token
    )
    expect(response.statusCode).toBe(403)
    const after = await prisma.class.findUniqueOrThrow({ where: { id: f.classId } })
    expect(after.narrative).toBe(before.narrative)
    expect(after.levelConfig).toEqual(before.levelConfig)
  })

  it('duplicar → la copia es de quien duplica, con él como único profesor', async () => {
    const response = await sendAs(
      { method: 'POST', url: `${c(f)}/duplicate`, payload: {} },
      co.read.token
    )
    expect(response.statusCode).toBe(200)
    const copy = await prisma.class.findUniqueOrThrow({
      where: { id: response.json().class.id },
      include: { teachers: true },
    })
    expect(copy.teacherId).toBe(co.read.id)
    expect(copy.teachers).toEqual([
      expect.objectContaining({ userId: co.read.id, isOwner: true, access: 'admin' }),
    ])
  })

  it('vista previa → matrícula en las clases compartidas, sin tocar la que ya había ni entrar donde el acceso venció', async () => {
    // Una clase del propietario donde el profesor de lectura tuvo acceso, ya vencido.
    const expired = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { name: 'Vencida', invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )
    await prisma.classTeacher.create({
      data: {
        classId: expired.id,
        userId: co.read.id,
        access: 'admin',
        profile: 'titular',
        addedById: f.users.owner.id,
        endsAt: new Date(Date.now() - 60_000),
      },
    })
    // El de edición ya tenía una matrícula en la clase: se queda como estaba.
    await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: co.edit.id, isPreview: false, xp: 42 },
    })
    const enrollment = (userId: string, classId: string) =>
      prisma.classEnrollment.findUnique({
        where: { studentId_classId: { studentId: userId, classId } },
        select: { isPreview: true, xp: true },
      })
    const preview = (token: string) =>
      sendAs({ method: 'POST', url: '/students/preview/enroll' }, token)

    try {
      expect((await preview(co.read.token)).statusCode).toBe(200)
      expect(await enrollment(co.read.id, f.classId)).toMatchObject({ isPreview: true })
      expect(await enrollment(co.read.id, expired.id)).toBeNull()
      // Con el acceso vencido la clase tampoco se ve ni se lista.
      expect(
        (await sendAs({ method: 'GET', url: `/teacher/classes/${expired.id}` }, co.read.token))
          .statusCode
      ).toBe(404)
      expect(
        (await sendAs({ method: 'GET', url: '/teacher/classes?archived=all' }, co.read.token)).body
      ).not.toContain(expired.id)

      expect((await preview(co.edit.token)).statusCode).toBe(200)
      expect(await enrollment(co.edit.id, f.classId)).toEqual({ isPreview: false, xp: 42 })

      // Otra vez: no crea nada nuevo.
      expect((await preview(co.read.token)).json()).toEqual({ enrolled: 0 })
    } finally {
      await prisma.classEnrollment.deleteMany({
        where: { classId: f.classId, studentId: { in: [co.read.id, co.edit.id] } },
      })
      await prisma.class.delete({ where: { id: expired.id } })
    }
  })

  it('vista previa → la matrícula que queda tras perder el acceso no abre las misiones de la clase', async () => {
    const missionId = await f.newMission()
    const enigmaId = await f.newEnigma(missionId)
    const former = await newTeacher('read', { endsAt: new Date(Date.now() - 60_000) })
    await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: former.id, isPreview: true },
    })
    const as = (req: RouteRequest) => sendAs(req, former.token)
    const submit = () =>
      as({ method: 'POST', url: `/submissions/enigmas/${enigmaId}`, ...formData({ nota: 'x' }) })

    expect((await as({ method: 'GET', url: '/missions' })).body).not.toContain(missionId)
    expect((await as({ method: 'GET', url: '/missions/enhanced' })).body).not.toContain(missionId)
    expect((await as({ method: 'GET', url: '/missions/stats' })).json().total).toBe(0)
    expect((await as({ method: 'POST', url: `/missions/${missionId}/start` })).statusCode).toBe(404)
    expect(
      (
        await as({
          method: 'POST',
          url: `/missions/${missionId}/enigmas/${enigmaId}/complete`,
          payload: {},
        })
      ).statusCode
    ).toBe(404)
    expect((await submit()).statusCode).toBe(404)
    expect(await prisma.enigmaSubmission.count({ where: { studentId: former.id } })).toBe(0)
    expect(await prisma.studentMissionProgress.count({ where: { studentId: former.id } })).toBe(0)

    // Con el acceso vigente, la misma matrícula vale para mirar la clase como alumno.
    await prisma.classTeacher.update({
      where: { classId_userId: { classId: f.classId, userId: former.id } },
      data: { endsAt: null },
    })
    expect((await as({ method: 'GET', url: '/missions' })).body).toContain(missionId)
    expect((await as({ method: 'POST', url: `/missions/${missionId}/start` })).statusCode).toBe(200)
    expect((await submit()).statusCode).toBe(201)
    // Sin fila ni matrícula, para no contar en los tests que siguen.
    await setLevel(former.id, null)
    await prisma.classEnrollment.deleteMany({ where: { studentId: former.id } })
  })

  it('vista previa → el detalle de la clase del lado del alumno no trae el código de invitación', async () => {
    try {
      for (const level of CO_LEVELS) {
        expect(
          (await sendAs({ method: 'POST', url: '/students/preview/enroll' }, co[level].token))
            .statusCode
        ).toBe(200)
        const detail = await sendAs(
          { method: 'GET', url: `/students/classes/${f.classId}` },
          co[level].token
        )
        expect(detail.statusCode).toBe(200)
        expect(detail.json().class).not.toHaveProperty('invitationCode')
      }
      const own = await send({ method: 'GET', url: `/students/classes/${f.classId}` }, 'student')
      expect(own.statusCode).toBe(200)
      expect(own.json().class).not.toHaveProperty('invitationCode')
    } finally {
      await prisma.classEnrollment.deleteMany({
        where: { classId: f.classId, studentId: { in: CO_LEVELS.map(l => co[l].id) } },
      })
    }
  })
})
