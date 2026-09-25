import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Listados del panel de administración (usuarios, clases y misiones): la API
 * pagina en la consulta y aplica ahí la búsqueda, los filtros y el orden, para
 * que en una instancia con miles de filas no se quede nada fuera. Y lo que
 * pinta cada tarjeta de usuario: cuántas clases imparte un profesor aunque no
 * sea el propietario, y la tarjeta entera al suspender o activar. Además, la
 * clase de origen de una cuenta no puede pasar a una clase archivada.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Todo lo que se busca lleva la etiqueta de
 * esta ejecución, así que lo que haya en la base de otras pruebas no cuenta.
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
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

describeWithDatabase('listados del panel de administración', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  /** Cuentas creadas aquí o por las rutas, que la fixture no conoce. */
  const createdIds = new Set<string>()
  let adminId: string

  const admin = () => ({ id: adminId, role: 'admin' as const })

  const send = (
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    payload?: Record<string, unknown>
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: { authorization: `Bearer ${app.jwt.sign(admin())}` },
    })

  const get = async (url: string) => {
    const response = await send('GET', url)
    expect(response.statusCode).toBe(200)
    return response.json()
  }

  /** Una cuenta con la etiqueta de esta ejecución y la fecha de alta que se le diga. */
  const newUser = async (
    name: string,
    data: {
      role: 'student' | 'teacher'
      status?: 'active' | 'suspended'
      managed?: boolean
      createdAt: Date
    }
  ) => {
    const slug = name.toLowerCase()
    const user = await prisma.user.create({
      data: {
        name: `${name} ${tag}`,
        passwordHash: 'x',
        role: data.role,
        status: data.status ?? 'active',
        isOnboarded: true,
        createdAt: data.createdAt,
        ...(data.managed
          ? { accountType: 'managed', username: `${slug}.${tag}` }
          : { email: `${slug}.${tag}@test.invalid` }),
      },
    })
    createdIds.add(user.id)
    return user.id
  }

  /** Una clase más del propietario de la fixture (su limpieza la borra). */
  const newClass = async (name: string) => {
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        {
          name: `${name} ${tag}`,
          invitationCode: randomUUID().slice(0, 6).toUpperCase(),
        },
        f.users.owner.id
      )
    )
    return cls
  }

  const names = (list: { name?: string; title?: string }[]) =>
    list.map(item => (item.name ?? item.title ?? '').replace(` ${tag}`, ''))

  // Usuarios con la etiqueta (y el administrador que consulta, «Admin <tag>»).
  let zeta: string
  let alfa: string
  let beta: string
  let gamma: string

  // Clases y misiones con la etiqueta.
  let uno: { id: string; invitationCode: string }
  let dos: { id: string }
  let tres: { id: string }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
    f = await createClassFixture(app)

    const adminUser = await prisma.user.create({
      data: {
        email: `admin.${tag}@test.invalid`,
        passwordHash: 'x',
        name: `Admin ${tag}`,
        role: 'admin',
        isOnboarded: true,
        createdAt: new Date('2020-01-01T00:00:00Z'),
      },
    })
    adminId = adminUser.id
    createdIds.add(adminId)

    zeta = await newUser('Zeta', { role: 'teacher', createdAt: new Date('2020-01-05T00:00:00Z') })
    alfa = await newUser('Alfa', {
      role: 'student',
      status: 'suspended',
      createdAt: new Date('2020-01-02T00:00:00Z'),
    })
    beta = await newUser('Beta', {
      role: 'student',
      managed: true,
      createdAt: new Date('2020-01-03T00:00:00Z'),
    })
    gamma = await newUser('Gamma', {
      role: 'student',
      managed: true,
      createdAt: new Date('2020-01-04T00:00:00Z'),
    })
    // Beta está en una clase; Gamma se ha quedado sin ninguna.
    await prisma.classEnrollment.create({ data: { classId: f.classId, studentId: beta } })

    // Uno: un alumno de verdad y dos vistas previas de profesores. Dos: dos
    // alumnos. Tres: ninguno, pero con dos misiones.
    uno = await newClass('Aula Uno')
    dos = await newClass('Aula Dos')
    tres = await newClass('Aula Tres')
    await prisma.classEnrollment.createMany({
      data: [
        { classId: uno.id, studentId: alfa },
        { classId: uno.id, studentId: f.users.owner.id, isPreview: true },
        { classId: uno.id, studentId: zeta, isPreview: true },
        { classId: dos.id, studentId: alfa },
        { classId: dos.id, studentId: beta },
      ],
    })

    // Misiones: A (común, 2 enigmas de 100 → 250 XP), B (legendaria, bloqueada,
    // sin enigmas → 400 XP) y C (rara, 1 enigma de 10 → 110 XP).
    const a = await prisma.mission.create({
      data: { classId: tres.id, title: `Reto A ${tag}`, rarity: 'comun', status: 'activa' },
    })
    await prisma.mission.create({
      data: { classId: tres.id, title: `Reto B ${tag}`, rarity: 'legendaria', status: 'bloqueada' },
    })
    const c = await prisma.mission.create({
      data: { classId: dos.id, title: `Reto C ${tag}`, rarity: 'rara', status: 'activa' },
    })
    await prisma.missionEnigma.createMany({
      data: [
        { missionId: a.id, title: 'Uno', xpReward: 100 },
        { missionId: a.id, title: 'Dos', xpReward: 100 },
        { missionId: c.id, title: 'Uno', xpReward: 10 },
      ],
    })
  })

  afterAll(async () => {
    await f?.cleanup()
    await prisma.user.deleteMany({ where: { id: { in: [...createdIds] } } })
    await app?.close()
  })

  // ==================== USUARIOS ====================

  describe('usuarios', () => {
    it('pagina en la consulta: página, tamaño, total y número de páginas', async () => {
      const first = await get(`/admin/users?search=${tag}&sort=name-asc&limit=2`)
      expect(first).toMatchObject({ total: 5, page: 1, limit: 2, totalPages: 3 })
      expect(names(first.users)).toEqual(['Admin', 'Alfa'])

      const last = await get(`/admin/users?search=${tag}&sort=name-asc&limit=2&page=3`)
      expect(names(last.users)).toEqual(['Zeta'])

      // Más allá de la última página no hay nada, pero el total sigue ahí.
      const beyond = await get(`/admin/users?search=${tag}&limit=2&page=9`)
      expect(beyond).toMatchObject({ users: [], total: 5, page: 9 })
    })

    it('ordena por nombre en los dos sentidos y por fecha de alta', async () => {
      expect(names((await get(`/admin/users?search=${tag}&sort=name-desc`)).users)).toEqual([
        'Zeta',
        'Gamma',
        'Beta',
        'Alfa',
        'Admin',
      ])
      // Sin orden, las más recientes primero.
      expect(names((await get(`/admin/users?search=${tag}`)).users)).toEqual([
        'Zeta',
        'Gamma',
        'Beta',
        'Alfa',
        'Admin',
      ])
      expect(names((await get(`/admin/users?search=${tag}&sort=recent&limit=1`)).users)).toEqual([
        'Zeta',
      ])
    })

    it('filtra por rol, por estado y por tipo de cuenta, con el total ya filtrado', async () => {
      const byRole = await get(`/admin/users?search=${tag}&role=teacher`)
      expect(byRole.total).toBe(1)
      expect(byRole.users[0].id).toBe(zeta)

      const byStatus = await get(`/admin/users?search=${tag}&status=suspended`)
      expect(byStatus.users.map((u: { id: string }) => u.id)).toEqual([alfa])

      const managed = await get(`/admin/users?search=${tag}&accountType=managed&sort=name-asc`)
      expect(managed.users.map((u: { id: string }) => u.id)).toEqual([beta, gamma])

      // Sin correo ni clase: la gestionada que no está en ninguna clase.
      const orphan = await get(`/admin/users?search=${tag}&accountType=orphan`)
      expect(orphan.total).toBe(1)
      expect(orphan.users[0]).toMatchObject({ id: gamma, classCount: 0, homeClassId: null })

      const self = await get(`/admin/users?search=${tag}&accountType=self&sort=name-asc`)
      expect(names(self.users)).toEqual(['Admin', 'Alfa', 'Zeta'])

      // Se combinan: alumnado activo sin correo.
      const combined = await get(
        `/admin/users?search=${tag}&role=student&status=active&accountType=managed`
      )
      expect(combined.total).toBe(2)
    })

    it('un filtro vacío no filtra, uno que no existe es un error y el tamaño se recorta', async () => {
      expect((await get(`/admin/users?search=${tag}&role=&status=`)).total).toBe(5)
      expect((await send('GET', `/admin/users?role=superadmin`)).statusCode).toBe(400)
      expect((await send('GET', `/admin/users?sort=shoe-size`)).statusCode).toBe(400)
      expect((await get(`/admin/users?search=${tag}&limit=1000`)).limit).toBe(100)
    })

    it('una página por encima del tope es un error de la consulta, no un fallo del servidor', async () => {
      // Hasta el tope, una página vacía con su total.
      expect(await get(`/admin/users?search=${tag}&page=100000`)).toMatchObject({
        users: [],
        total: 5,
        page: 100000,
      })
      for (const list of ['users', 'classes', 'missions']) {
        for (const page of ['100001', '1e20', '100000000000000000000']) {
          const response = await send('GET', `/admin/${list}?page=${page}`)
          expect(response.statusCode, `${list} ?page=${page}`).toBe(400)
        }
      }
      // Lo que no es un número sigue siendo la primera página.
      expect((await get(`/admin/users?search=${tag}&page=abc`)).page).toBe(1)
    })

    it('las clases de un profesor son las que imparte hoy, sea propietario o no', async () => {
      // «other» es propietario de su clase y además imparte la del propietario.
      await prisma.classTeacher.create({
        data: { classId: f.classId, userId: f.users.other.id, access: 'edit', profile: 'titular' },
      })
      // Y tuvo acceso a otra, que ya ha vencido: no cuenta.
      await prisma.classTeacher.create({
        data: {
          classId: uno.id,
          userId: f.users.other.id,
          access: 'read',
          profile: 'sustituto',
          endsAt: new Date(Date.now() - 60_000),
        },
      })
      const other = await prisma.user.findUniqueOrThrow({ where: { id: f.users.other.id } })

      const response = await get(`/admin/users?search=${other.email}`)
      expect(response.users).toHaveLength(1)
      expect(response.users[0]).toMatchObject({ id: other.id, role: 'teacher', classCount: 2 })
    })

    it('las clases de un alumno son sus matrículas, sin la vista previa', async () => {
      // Alfa está en Uno y en Dos; una vista previa suya en la clase de la fixture no cuenta.
      await prisma.classEnrollment.create({
        data: { classId: f.classId, studentId: alfa, isPreview: true },
      })
      const response = await get(`/admin/users?search=alfa.${tag}`)
      expect(response.users[0]).toMatchObject({ id: alfa, classCount: 2 })
    })

    it('suspender y activar devuelven la tarjeta entera, como en el listado', async () => {
      const listed = (await get(`/admin/users?search=beta.${tag}`)).users[0]

      const suspended = await send('PUT', `/admin/users/${beta}/suspend`)
      expect(suspended.statusCode).toBe(200)
      expect(suspended.json().user).toEqual({ ...listed, status: 'suspended' })

      const activated = await send('PUT', `/admin/users/${beta}/activate`)
      expect(activated.statusCode).toBe(200)
      expect(activated.json().user).toEqual({ ...listed, status: 'active' })

      expect((await send('PUT', `/admin/users/${randomUUID()}/activate`)).statusCode).toBe(404)
    })
  })

  // ==================== CLASES ====================

  describe('clases', () => {
    it('pagina y ordena por nombre', async () => {
      const all = await get(`/admin/classes?search=${tag}&sort=name-asc`)
      expect(all.total).toBe(3)
      expect(names(all.classes)).toEqual(['Aula Dos', 'Aula Tres', 'Aula Uno'])

      const second = await get(`/admin/classes?search=${tag}&sort=name-desc&limit=2&page=2`)
      expect(second).toMatchObject({ total: 3, page: 2, limit: 2, totalPages: 2 })
      expect(names(second.classes)).toEqual(['Aula Dos'])
    })

    it('ordena por alumnos sin contar la vista previa, y por misiones', async () => {
      // Uno tiene tres matrículas, pero dos son vistas previas: va detrás de Dos.
      const byStudents = await get(`/admin/classes?search=${tag}&sort=students-desc`)
      expect(names(byStudents.classes)).toEqual(['Aula Dos', 'Aula Uno', 'Aula Tres'])
      expect(byStudents.classes.map((c: { studentCount: number }) => c.studentCount)).toEqual([
        2, 1, 0,
      ])

      const byMissions = await get(`/admin/classes?search=${tag}&sort=missions-desc`)
      expect(names(byMissions.classes)).toEqual(['Aula Tres', 'Aula Dos', 'Aula Uno'])
      expect(byMissions.classes.map((c: { missionCount: number }) => c.missionCount)).toEqual([
        2, 1, 0,
      ])
    })

    it('busca por el código de invitación exacto y por el propietario', async () => {
      const byCode = await get(`/admin/classes?search=${uno.invitationCode.toLowerCase()}`)
      expect(byCode.classes.map((c: { id: string }) => c.id)).toEqual([uno.id])

      const owner = await prisma.user.findUniqueOrThrow({ where: { id: f.users.owner.id } })
      const byOwner = await get(`/admin/classes?search=${encodeURIComponent(owner.name)}`)
      // La clase de la fixture y las tres de aquí; la de «other» no.
      expect(byOwner.total).toBe(4)
      expect(byOwner.classes.map((c: { id: string }) => c.id)).not.toContain(f.otherClassId)
    })
  })

  // ==================== MISIONES ====================

  describe('misiones', () => {
    it('ordena por XP total (rareza más enigmas) y por número de enigmas', async () => {
      const byXp = await get(`/admin/missions?search=${tag}&sort=xp-desc`)
      expect(names(byXp.missions)).toEqual(['Reto B', 'Reto A', 'Reto C'])
      expect(byXp.missions.map((m: { xpReward: number }) => m.xpReward)).toEqual([400, 250, 110])

      const byEnigmas = await get(`/admin/missions?search=${tag}&sort=enigmas-desc`)
      expect(names(byEnigmas.missions)).toEqual(['Reto A', 'Reto C', 'Reto B'])
    })

    it('filtra por estado y por rareza, y busca también por el nombre de la clase', async () => {
      expect(names((await get(`/admin/missions?search=${tag}&status=bloqueada`)).missions)).toEqual(
        ['Reto B']
      )
      expect(names((await get(`/admin/missions?search=${tag}&rarity=rara`)).missions)).toEqual([
        'Reto C',
      ])
      const combined = await get(`/admin/missions?search=${tag}&status=activa&rarity=comun`)
      expect(combined.total).toBe(1)
      expect(names(combined.missions)).toEqual(['Reto A'])

      const byClass = await get(`/admin/missions?search=${encodeURIComponent(`Aula Dos ${tag}`)}`)
      expect(names(byClass.missions)).toEqual(['Reto C'])
      expect(byClass.missions[0]).toMatchObject({ className: `Aula Dos ${tag}` })
    })

    it('pagina, y los comodines de la búsqueda se buscan tal cual', async () => {
      const page = await get(`/admin/missions?search=${tag}&sort=name-asc&limit=1&page=2`)
      expect(page).toMatchObject({ total: 3, page: 2, limit: 1, totalPages: 3 })
      expect(names(page.missions)).toEqual(['Reto B'])

      // «_» casaría con cualquier carácter si no se escapara.
      expect((await get(`/admin/missions?search=Reto_A_${tag}`)).total).toBe(0)
      expect((await send('GET', `/admin/missions?rarity=mitica`)).statusCode).toBe(400)
    })
  })

  // ==================== CLASE DE ORIGEN ====================

  describe('clase de origen', () => {
    it('no pasa a una clase archivada, igual que no se crea una cuenta en ella', async () => {
      const created = await send('POST', '/admin/users/managed', {
        classId: f.classId,
        name: `Traslado ${tag}`,
      })
      expect(created.statusCode).toBe(201)
      const id = created.json().student.id as string
      createdIds.add(id)

      const archived = await newClass('Aula Archivada')
      await prisma.class.update({ where: { id: archived.id }, data: { archived: true } })

      const moved = await send('PUT', `/admin/users/${id}/home-class`, { classId: archived.id })
      expect(moved.statusCode).toBe(400)
      expect(moved.json()).toMatchObject({
        code: 'CLASS_ARCHIVED',
        message: 'Esta clase está archivada y no admite nuevas cuentas',
      })
      // Ni se mueve ni se matricula.
      expect(await prisma.user.findUniqueOrThrow({ where: { id } })).toMatchObject({
        homeClassId: f.classId,
      })
      expect(
        await prisma.classEnrollment.findFirst({ where: { studentId: id, classId: archived.id } })
      ).toBeNull()

      // El mismo mensaje que al crear una cuenta en esa clase.
      const createdThere = await send('POST', '/admin/users/managed', {
        classId: archived.id,
        name: `Otra ${tag}`,
      })
      expect(createdThere.statusCode).toBe(400)
      expect(createdThere.json().message).toBe(moved.json().message)
    })

    it('guardar sin cambios la clase de origen que se archivó después no es un error', async () => {
      const created = await send('POST', '/admin/users/managed', {
        classId: f.classId,
        name: `Se queda ${tag}`,
      })
      const id = created.json().student.id as string
      createdIds.add(id)

      const later = await newClass('Aula Luego Archivada')
      await prisma.user.update({ where: { id }, data: { homeClassId: later.id } })
      await prisma.class.update({ where: { id: later.id }, data: { archived: true } })

      const saved = await send('PUT', `/admin/users/${id}/home-class`, { classId: later.id })
      expect(saved.statusCode).toBe(200)
      expect(saved.json().user).toMatchObject({ homeClassId: later.id })
      // Tampoco matricula en ella.
      expect(
        await prisma.classEnrollment.findFirst({ where: { studentId: id, classId: later.id } })
      ).toBeNull()
    })
  })
})
