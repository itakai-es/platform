import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Rutas antiguas que ninguna pantalla usaba y se retiraron. Si alguna vuelve,
 * que sea a propósito y con su comprobación de acceso.
 */

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../src/modules/${rel}`, import.meta.url)), 'utf8')

describe('rutas retiradas', () => {
  it('no existe la entrada por alias', () => {
    expect(read('auth/auth.routes.ts')).not.toMatch(/login-alias/)
    expect(read('auth/auth.service.ts')).not.toMatch(/loginWithAlias/)
  })

  it('no existe ninguna clasificación fuera de la clase', () => {
    expect(read('students/students.routes.ts')).not.toMatch(/leaderboard/i)
    expect(read('students/students.service.ts')).not.toMatch(/getGlobalLeaderboard/)
  })

  it('no existen las solicitudes para unirse ni las invitaciones personales', () => {
    // Con el código de clase se entra directamente: nadie tiene que aceptar nada.
    const teacherRoutes = read('teachers/teachers.routes.ts')
    expect(teacherRoutes).not.toMatch(/\/requests/)
    expect(teacherRoutes).not.toMatch(/['/]invitations/)
    expect(teacherRoutes).not.toMatch(/enrollment-counts/)

    const studentRoutes = read('students/students.routes.ts')
    expect(studentRoutes).not.toMatch(/classes\/request/)
    expect(studentRoutes).not.toMatch(/join-requests/)
    expect(studentRoutes).not.toMatch(/['/]invitations/)
    expect(studentRoutes).not.toMatch(/enrollment-counts/)

    for (const service of ['teachers/teachers.service.ts', 'students/students.service.ts']) {
      const code = read(service)
      expect(code).not.toMatch(/prisma\.(joinRequest|invitation)\b/)
      expect(code).not.toMatch(/JoinRequest|Invitation\(/)
    }
  })

  it('no existe la búsqueda de alumnos de toda la plataforma', () => {
    expect(read('teachers/teachers.routes.ts')).not.toMatch(/students\/search/)
    expect(read('teachers/teachers.service.ts')).not.toMatch(/searchStudents/)
  })
})
