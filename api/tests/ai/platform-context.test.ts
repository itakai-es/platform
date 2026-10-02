import { describe, it, expect } from 'vitest'
import { getPlatformContext } from '../../src/modules/ai/platform-context.js'

/**
 * El contexto fijo del asistente cuenta lo que hay de verdad en la interfaz: con
 * sus etiquetas, sin entradas de menú que ya no existen, y a cada rol lo suyo.
 */

describe('contexto fijo del asistente', () => {
  it('al profesorado le cuenta las clases compartidas, el historial y las cuentas sin correo', () => {
    const es = getPlatformContext('teacher', 'es')
    for (const label of [
      'Ajustes>Profesorado>Añadir docente',
      'Titular|Sustitución|Prácticas',
      'Pasar la propiedad',
      'Salir de la clase',
      'Historial',
      'Invitar>Crear cuentas',
      'Hoja de credenciales',
      'Pendiente de entrar',
      'Restablecer contraseña',
      'Cambia tu contraseña',
    ]) {
      expect(es, label).toContain(label)
    }
    expect(es).not.toContain('|Asistente IA')

    const en = getPlatformContext('teacher', 'en-GB')
    for (const label of [
      'Settings>Teachers>Add teacher',
      'Hand over ownership',
      'History',
      'Invite>Create accounts',
      'Credentials sheet',
      'Not signed in yet',
      'Change your password',
    ]) {
      expect(en, label).toContain(label)
    }
    expect(en).not.toContain('|AI Assistant')
  })

  it('al alumnado no le cuenta lo del profesorado, y el resto de idiomas van en español', () => {
    const student = getPlatformContext('student', 'ca')
    expect(student).toContain('Menú de estudiante')
    expect(student).toContain('Cambia tu contraseña')
    expect(student).not.toContain('Añadir docente')
    expect(student).not.toContain('Menú docente')
  })
})
