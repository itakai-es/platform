import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { describeWithDatabase } from '../helpers/test-db.js'

/**
 * E4, avatares ampliados: el avatar del profesorado (una clave del catálogo
 * docente, por cuenta), que el profesorado con edición pueda devolver el avatar
 * de un estudiante al catálogo, y que el autor de lo que pasa en la clase salga
 * con su avatar (historial, profesorado de la clase, muro y asistencia).
 *
 * Postgres de verdad; solo se simulan el borrado de ficheros y el servidor de
 * imágenes.
 */

const deleteUpload = vi.hoisted(() => vi.fn(async () => true))
vi.mock('../../src/modules/storage/storage.service.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/modules/storage/storage.service.js')>()),
  deleteUpload,
}))
// El servidor de imágenes no está en las pruebas: cada «generación» da un fichero nuevo.
const generateFireRedAvatar = vi.hoisted(() =>
  vi.fn(async () => ({ fileUrl: `/uploads/ai-generated/avatars/e4-new-${Date.now()}.png` }))
)
vi.mock('../../src/modules/ai/generators/avatar-firered.js', () => ({ generateFireRedAvatar }))

import {
  buildApp,
  createClassFixture,
  prisma,
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { studentsRoutes } from '../../src/modules/students/students.routes.js'
import { profileRoutes } from '../../src/modules/profile/profile.routes.js'
import { authRoutes } from '../../src/modules/auth/auth.routes.js'
import { isTeacherAvatarKey, TEACHER_AVATAR_KEYS } from '../../src/utils/avatars.js'

describe('catálogo docente', () => {
  it('son las claves de la paleta de equipos, y nada más', () => {
    expect([...TEACHER_AVATAR_KEYS]).toEqual(['purple', 'yellow', 'mint', 'sky', 'red', 'peach'])
    expect(isTeacherAvatarKey('mint')).toBe(true)
    for (const value of ['', 'gold', '/app/avatars/atenea.svg', 'https://x.invalid/a.png', null, 3]) {
      expect(isTeacherAvatarKey(value)).toBe(false)
    }
  })
})

describeWithDatabase('E4: avatares del profesorado y atribución con avatar', () => {
  let app: FastifyInstance
  let f: ClassFixture
  /** Cuentas creadas aquí (docentes y alguna de estudiante): `f.cleanup` no las conoce. */
  const coTeacherIds: string[] = []

  const send = (
    actor: Actor | null,
    method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE',
    url: string,
    payload?: object
  ) =>
    app.inject({
      method,
      url,
      payload,
      headers: actor ? { authorization: `Bearer ${f.token(actor)}` } : {},
    })
  const setAvatar = (actor: Actor, avatar: unknown) =>
    send(actor, 'PUT', '/profile/avatar', { avatar })
  const enrollment = () =>
    prisma.classEnrollment.findFirstOrThrow({
      where: { classId: f.classId, studentId: f.users.student.id },
    })
  const studentAvatar = (actor: Actor, avatar: string) =>
    send(actor, 'PUT', `/teacher/classes/${f.classId}/students/${f.users.student.id}/avatar`, {
      avatar,
    })

  /** Un docente de usar y tirar añadido a la clase con `access`. */
  async function coTeacher(access: 'read' | 'edit' | 'admin', avatar: string | null = null) {
    const user = await prisma.user.create({
      data: {
        email: `co.${access}.${Date.now()}.${Math.random()}@test.invalid`,
        passwordHash: 'x',
        name: `Docente ${access}`,
        role: 'teacher',
        isOnboarded: true,
        avatar,
      },
    })
    coTeacherIds.push(user.id)
    await prisma.classTeacher.create({
      data: { classId: f.classId, userId: user.id, profile: 'sustituto', access },
    })
    return { user, token: app.jwt.sign({ id: user.id, role: 'teacher' }) }
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(authRoutes, { prefix: '/auth' })
      await instance.register(profileRoutes, { prefix: '/profile' })
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(studentsRoutes, { prefix: '/students' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: coTeacherIds } } })
    await f.cleanup()
    await app.close()
  })

  // ---- #5: el avatar del profesorado ----

  it('un docente elige un avatar del catálogo, lo ve en su cuenta y lo quita con null', async () => {
    const res = await setAvatar('owner', 'mint')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ avatar: 'mint' })

    const profile = await send('owner', 'GET', '/profile')
    expect(profile.json().profile.avatar).toBe('mint')

    const cleared = await setAvatar('owner', null)
    expect(cleared.json()).toEqual({ avatar: null })
    const user = await prisma.user.findUniqueOrThrow({ where: { id: f.users.owner.id } })
    expect(user.avatar).toBeNull()
  })

  it('lo que no es del catálogo se rechaza y el avatar no cambia', async () => {
    await setAvatar('owner', 'sky')
    for (const avatar of ['gold', '/app/avatars/atenea.svg', 'https://ejemplo.com/foto.png', '']) {
      const res = await setAvatar('owner', avatar)
      expect(res.statusCode, String(avatar)).toBe(400)
    }
    expect((await setAvatar('owner', 42)).statusCode).toBe(400)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: f.users.owner.id } })
    expect(user.avatar).toBe('sky')
  })

  it('el alumnado no tiene avatar de cuenta (el suyo es de cada clase); sin sesión, 401', async () => {
    expect((await setAvatar('student', 'mint')).statusCode).toBe(403)
    const student = await prisma.user.findUniqueOrThrow({ where: { id: f.users.student.id } })
    expect(student.avatar).toBeNull()
    expect((await send(null, 'PUT', '/profile/avatar', { avatar: 'mint' })).statusCode).toBe(401)
  })

  // ---- #4: devolver el avatar de un estudiante al catálogo ----

  it('con edición se devuelve el avatar de un estudiante al catálogo, y queda en el historial', async () => {
    const editor = await coTeacher('edit')
    const res = await app.inject({
      method: 'PUT',
      url: `/teacher/classes/${f.classId}/students/${f.users.student.id}/avatar`,
      headers: { authorization: `Bearer ${editor.token}` },
      payload: { avatar: '/app/avatars/penelope.svg' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ avatarUrl: '/app/avatars/penelope.svg' })
    expect((await enrollment()).avatarUrl).toBe('/app/avatars/penelope.svg')

    const log = await prisma.classActionLog.findFirstOrThrow({
      where: { classId: f.classId, action: 'student.avatar_changed', actorId: editor.user.id },
    })
    expect(log.targetUserId).toBe(f.users.student.id)
    expect(log.metadata).toBeNull()
  })

  it('con lectura no se puede; ni una imagen que no sea del catálogo', async () => {
    const reader = await coTeacher('read')
    const before = (await enrollment()).avatarUrl
    const res = await app.inject({
      method: 'PUT',
      url: `/teacher/classes/${f.classId}/students/${f.users.student.id}/avatar`,
      headers: { authorization: `Bearer ${reader.token}` },
      payload: { avatar: '/app/avatars/atenea.svg' },
    })
    expect(res.statusCode).toBe(403)
    for (const avatar of ['https://ejemplo.com/foto.png', '/uploads/ai-generated/avatars/x.png']) {
      expect((await studentAvatar('owner', avatar)).statusCode).toBe(400)
    }
    expect((await enrollment()).avatarUrl).toBe(before)
  })

  it('el mismo avatar que ya tiene no cambia nada ni deja otra línea en el historial', async () => {
    await studentAvatar('owner', '/app/avatars/odiseo.svg')
    const count = () =>
      prisma.classActionLog.count({ where: { classId: f.classId, action: 'student.avatar_changed' } })
    const before = await count()
    expect((await studentAvatar('owner', '/app/avatars/odiseo.svg')).statusCode).toBe(200)
    expect(await count()).toBe(before)
  })

  it('una imagen generada que se retira se borra si ya no la usa nadie; si otra matrícula la usa, no', async () => {
    const generated = `/uploads/ai-generated/avatars/e4-${Date.now()}.png`
    const row = await enrollment()

    await prisma.classEnrollment.update({ where: { id: row.id }, data: { avatarUrl: generated } })
    deleteUpload.mockClear()
    await studentAvatar('owner', '/app/avatars/atenea.svg')
    expect(deleteUpload).toHaveBeenCalledWith(generated)

    // Otra matrícula con la misma imagen (la del estudiante en otra clase).
    const other = await prisma.classEnrollment.create({
      data: { classId: f.otherClassId, studentId: f.users.student.id, avatarUrl: generated },
    })
    await prisma.classEnrollment.update({ where: { id: row.id }, data: { avatarUrl: generated } })
    deleteUpload.mockClear()
    await studentAvatar('owner', '/app/avatars/poseidon.svg')
    expect(deleteUpload).not.toHaveBeenCalled()
    await prisma.classEnrollment.delete({ where: { id: other.id } })
  })

  it('una ruta antigua que se sale de la carpeta de avatares no borra nada', async () => {
    // Hasta la 0.6.1 el alumnado podía guardar cualquier texto: estas rutas
    // nombran la carpeta de avatares, pero apuntan a una portada o a otra carpeta.
    const row = await enrollment()
    for (const legacy of [
      '/uploads/ai-generated/avatars/../../covers/x.png',
      '/uploads/ai-generated/avatars/../../submissions/entrega.pdf',
      '/uploads/ai-generated/avatars/sub/x.png',
      '/uploads/covers/ai-generated/avatars/x.png',
      'https://ejemplo.com/ai-generated/avatars/x.png',
    ]) {
      await prisma.classEnrollment.update({ where: { id: row.id }, data: { avatarUrl: legacy } })
      deleteUpload.mockClear()
      const res = await studentAvatar('owner', '/app/avatars/atenea.svg')
      expect(res.statusCode, legacy).toBe(200)
      expect(deleteUpload, legacy).not.toHaveBeenCalled()
    }
  })

  it('la imagen que sigue apuntando otra fila (una portada, por ejemplo) no se borra', async () => {
    const generated = `/uploads/ai-generated/avatars/e4-cover-${Date.now()}.png`
    const row = await enrollment()
    await prisma.classEnrollment.update({ where: { id: row.id }, data: { avatarUrl: generated } })
    // La misma imagen, escrita de otra forma, de portada de la otra clase.
    const other = await prisma.class.findUniqueOrThrow({ where: { id: f.otherClassId } })
    await prisma.class.update({
      where: { id: f.otherClassId },
      data: { backgroundImage: generated.replace('/avatars/', '/avatars/./') },
    })
    deleteUpload.mockClear()
    await studentAvatar('owner', '/app/avatars/odiseo.svg')
    expect(deleteUpload).not.toHaveBeenCalled()
    await prisma.class.update({
      where: { id: f.otherClassId },
      data: { backgroundImage: other.backgroundImage },
    })
  })

  it('el estudiante que deja su generado por un personaje lo borra, y también al generar otro', async () => {
    const generated = `/uploads/ai-generated/avatars/e4-own-${Date.now()}.png`
    const row = await enrollment()
    await prisma.classEnrollment.update({ where: { id: row.id }, data: { avatarUrl: generated } })

    // Guardar el mismo (y cambiar solo el alias) no lo toca.
    deleteUpload.mockClear()
    const same = await send('student', 'PUT', `/students/classes/${f.classId}/profile`, {
      avatarUrl: generated,
    })
    expect(same.statusCode).toBe(200)
    expect(deleteUpload).not.toHaveBeenCalled()

    const res = await send('student', 'PUT', `/students/classes/${f.classId}/profile`, {
      avatarUrl: '/app/avatars/polifemo.svg',
    })
    expect(res.statusCode).toBe(200)
    expect(deleteUpload).toHaveBeenCalledWith(generated)

    // Un generado nuevo sustituye al anterior: el anterior se borra.
    await prisma.classEnrollment.update({ where: { id: row.id }, data: { avatarUrl: generated } })
    deleteUpload.mockClear()
    const made = await send('student', 'POST', `/students/classes/${f.classId}/avatar/generate`, {
      avatar_id: 'atenea',
      wardrobe_prompt: 'una túnica azul',
      background_prompt: 'un templo al atardecer',
    })
    expect(made.statusCode).toBe(200)
    expect(made.json().avatarUrl).not.toBe(generated)
    expect(deleteUpload).toHaveBeenCalledWith(generated)
    expect(deleteUpload).toHaveBeenCalledTimes(1)
  })

  it('quitar a un estudiante de la clase borra su avatar generado', async () => {
    const generated = `/uploads/ai-generated/avatars/e4-gone-${Date.now()}.png`
    const leaving = await prisma.user.create({
      data: {
        email: `e4.leaving.${Date.now()}@test.invalid`,
        passwordHash: 'x',
        name: 'Estudiante que sale',
        role: 'student',
        isOnboarded: true,
      },
    })
    coTeacherIds.push(leaving.id)
    await prisma.classEnrollment.create({
      data: { classId: f.classId, studentId: leaving.id, avatarUrl: generated },
    })
    deleteUpload.mockClear()
    const res = await send('owner', 'DELETE', `/teacher/classes/${f.classId}/students/${leaving.id}`)
    expect(res.statusCode).toBe(200)
    expect(deleteUpload).toHaveBeenCalledWith(generated)
  })

  // ---- #6: el autor, con su avatar ----

  it('el registro copia el avatar de quien actúa; el historial da el actual y, sin la cuenta, la copia', async () => {
    const gone = await coTeacher('edit', 'peach')
    await app.inject({
      method: 'PUT',
      url: `/teacher/classes/${f.classId}/students/${f.users.student.id}/avatar`,
      headers: { authorization: `Bearer ${gone.token}` },
      payload: { avatar: '/app/avatars/polifemo.svg' },
    })
    const log = await prisma.classActionLog.findFirstOrThrow({
      where: { classId: f.classId, actorId: gone.user.id },
    })
    expect(log.actorAvatar).toBe('peach')

    // Cambia de avatar: el historial lo reconoce con el de ahora.
    await prisma.user.update({ where: { id: gone.user.id }, data: { avatar: 'yellow' } })
    const history = async () =>
      (await send('owner', 'GET', `/teacher/classes/${f.classId}/history?limit=50`)).json()
        .entries as { id: string; actor: { id: string | null; name: string; avatar: string | null } }[]
    let entry = (await history()).find(e => e.id === log.id)!
    expect(entry.actor).toEqual({ id: gone.user.id, name: 'Docente edit', avatar: 'yellow' })

    // Sin la cuenta, la línea conserva el nombre y el avatar que tenía al hacerlo.
    await prisma.user.delete({ where: { id: gone.user.id } })
    entry = (await history()).find(e => e.id === log.id)!
    expect(entry.actor).toEqual({ id: null, name: 'Docente edit', avatar: 'peach' })
  })

  it('el profesorado de la clase sale con su avatar, en los ajustes y en la vista del alumnado', async () => {
    await setAvatar('owner', 'red')
    const settings = await send('owner', 'GET', `/teacher/classes/${f.classId}/teachers`)
    const owner = settings
      .json()
      .teachers.find((t: { id: string }) => t.id === f.users.owner.id)
    expect(owner.avatar).toBe('red')

    const student = await send('student', 'GET', `/students/classes/${f.classId}`)
    const teachers = student.json().class.teachers as { id: string; avatar: string | null }[]
    expect(teachers.find(t => t.id === f.users.owner.id)?.avatar).toBe('red')
    // Sin correo ni nivel de acceso, como antes.
    expect(Object.keys(teachers[0]!).sort()).toEqual(['avatar', 'id', 'isOwner', 'name', 'profile'])
  })

  it('el muro dice quién dio una recompensa, con su avatar actual', async () => {
    await setAvatar('owner', 'mint')
    const grant = await send('owner', 'POST', `/teacher/classes/${f.classId}/rewards`, {
      studentIds: [f.users.student.id],
      xp: 5,
      reason: 'Ayuda en clase',
    })
    expect(grant.statusCode).toBe(200)

    const feed = await send('student', 'GET', `/students/classes/${f.classId}/activities?limit=5`)
    const entry = (feed.json().activities as { actor: unknown; source: string }[]).find(
      a => a.source === 'Ayuda en clase'
    )
    expect(entry?.actor).toEqual({ id: f.users.owner.id, name: expect.any(String), avatar: 'mint' })

    const teacherFeed = await send('owner', 'GET', `/teacher/classes/${f.classId}/activities`)
    const teacherEntry = (
      teacherFeed.json().activities as { actor: { avatar: string }; classId: string; source: string }[]
    ).find(a => a.source === 'Ayuda en clase')
    expect(teacherEntry?.actor.avatar).toBe('mint')
    expect(teacherEntry?.classId).toBe(f.classId)
  })

  it('la asistencia dice quién la guardó, con su avatar', async () => {
    await setAvatar('owner', 'purple')
    const date = '2026-10-21'
    const saved = await send('owner', 'PUT', `/teacher/classes/${f.classId}/attendance/sessions`, {
      date,
      startTime: '',
      records: [{ studentId: f.users.student.id, status: 'present' }],
    })
    expect(saved.statusCode).toBe(200)
    const day = await send('owner', 'GET', `/teacher/classes/${f.classId}/attendance?date=${date}`)
    const sessions = day.json().sessions as { takenBy: unknown }[]
    expect(sessions[0]?.takenBy).toEqual({
      id: f.users.owner.id,
      name: expect.any(String),
      avatar: 'purple',
    })
  })
})
