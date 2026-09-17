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

  it('no existe la búsqueda de alumnos de toda la plataforma', () => {
    expect(read('teachers/teachers.routes.ts')).not.toMatch(/students\/search/)
    expect(read('teachers/teachers.service.ts')).not.toMatch(/searchStudents/)
  })
})
