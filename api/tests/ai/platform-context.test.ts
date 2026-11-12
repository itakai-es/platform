import { describe, it, expect } from 'vitest'
import { getPlatformContext } from '../../src/modules/ai/platform-context.js'
import {
  HINTS_IN_MISSION,
  INACTIVE_DAYS,
  LOW_ATTENDANCE_MIN_SESSIONS,
  LOW_ATTENDANCE_PERCENT,
  LOW_AVERAGE_MIN_APPROVALS,
  LOW_AVERAGE_PERCENT,
  LOW_GRADE_PERCENT,
  MISSION_HINTS_PER_STUDENT,
  MISSION_LOW_AVERAGE_MIN_APPROVALS,
  MISSION_LOW_AVERAGE_PERCENT,
  MISSION_UNFINISHED_PERCENT,
} from '../../src/modules/analytics/signals.js'
import { MIN_OTHERS } from '../../src/utils/anonymous-stats.js'
import { RANKING_TOP_SIZES } from '../../src/utils/ranking-config.js'

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

  it('al profesorado le cuenta la analítica, con los umbrales de las dificultades del código', () => {
    const es = getPlatformContext('teacher', 'es')
    for (const label of [
      'Resumen de la clase',
      'Estadísticas de la clase',
      'Misiones de media',
      'Este curso',
      'Ver como tabla',
      'Cerrada por el camino',
      'Dificultades detectadas',
      'no son notas, no deciden nada',
      'Ver como estudiante',
      'Sus cifras',
      'índice de sus clases',
    ]) {
      expect(es, label).toContain(label)
    }
    expect(es).toContain(`menos del ${LOW_GRADE_PERCENT} %`)
    expect(es).toContain(`bajo el ${LOW_AVERAGE_PERCENT} % (con ${LOW_AVERAGE_MIN_APPROVALS} o más)`)
    expect(es).toContain(`${HINTS_IN_MISSION} o más pistas en una misión`)
    expect(es).toContain(`${INACTIVE_DAYS} días sin actividad`)
    expect(es).toContain(
      `asistencia bajo el ${LOW_ATTENDANCE_PERCENT} % (con ${LOW_ATTENDANCE_MIN_SESSIONS} sesiones con lista o más)`
    )
    expect(es).toContain(`el ${MISSION_UNFINISHED_PERCENT} % o más de quien la empezó`)
    expect(es).toContain(`bajo el ${MISSION_LOW_AVERAGE_PERCENT} % (con ${MISSION_LOW_AVERAGE_MIN_APPROVALS} o más)`)
    expect(es).toContain(`${MISSION_HINTS_PER_STUDENT} o más pistas por estudiante`)

    const en = getPlatformContext('teacher', 'en')
    for (const label of ['Class statistics', 'View as table', 'Difficulties detected', 'View as student']) {
      expect(en, label).toContain(label)
    }
  })

  it('al profesorado le cuenta el ranking que hay, y no le deja proponer el que no hay', () => {
    const es = getPlatformContext('teacher', 'es')
    for (const label of [
      'Ajustes>Funcionalidades',
      'apagado, solo lo ve el profesorado',
      'Alumnado>Ranking',
      'Opciones del ranking',
      'La clasificación completa',
      'Los N primeros puestos y el suyo',
      'Solo su puesto',
      `N = ${RANKING_TOP_SIZES.slice(0, -1).join(', ')} o ${RANKING_TOP_SIZES.at(-1)}`,
      'Misiones completadas',
      'Equipos',
      'Esta semana',
      'Empezar temporada',
      'Comparar con la media',
      `solo con ${MIN_OTHERS + 1} personas o más`,
      'no propongas ajustes que no existen',
    ]) {
      expect(es, label).toContain(label)
    }
    // El ranking ya no pide la XP: solo el tipo XP la pide.
    expect(es).toContain('XP (pide que la clase use XP')
    // La XP solo desempata las misiones si el alumnado ve el ranking de XP.
    expect(es).toContain('en los empates decide la XP solo si el alumnado ve también el ranking de XP')
    expect(es).not.toContain('empate por XP')
    expect(es).not.toMatch(/ranking (requiere|necesita) (la )?XP/i)
    // «Ver entregas» ya no está escondido en el menú del móvil.
    expect(es).not.toContain('(móvil: menú ⋮)')

    const en = getPlatformContext('teacher', 'en')
    for (const label of [
      'Settings>Features',
      'Ranking options',
      'The full ranking',
      'Only their own position',
      'Completed missions',
      'Start season',
      'Compare with the average',
      'do not suggest settings that do not exist',
    ]) {
      expect(en, label).toContain(label)
    }
    expect(en).not.toContain('(mobile: ⋮ menu)')
  })

  it('al profesorado le cuenta «Mis insignias» y dónde están Editar y Eliminar', () => {
    const es = getPlatformContext('teacher', 'es')
    expect(es).toContain('Tus insignias')
    expect(es).toContain('Insignias de ITAKAI')
    expect(es).toContain('Crear una parecida')
    expect(es).toContain('Eliminar está en su menú ⋮')
    const en = getPlatformContext('teacher', 'en')
    expect(en).toContain('ITAKAI badges')
    expect(en).toContain('Create a similar one')
  })

  it('al alumnado le cuenta «Mi progreso», la comparación y su ranking, sin lo del profesorado', () => {
    const es = getPlatformContext('student', 'es')
    for (const label of [
      'Mi progreso',
      'Tú y tu clase',
      'Mis resultados',
      'Tu clase aún es pequeña para comparar',
      `menos de ${MIN_OTHERS + 1} personas`,
      'no incluye el bonus por completar la misión',
      'Esta semana',
      'Solo salen alias y avatares',
      'Bloqueada por tu docente por ahora',
    ]) {
      expect(es, label).toContain(label)
    }
    for (const teacherOnly of ['Dificultades detectadas', 'Opciones del ranking', 'Comparar con la media']) {
      expect(es, teacherOnly).not.toContain(teacherOnly)
    }
    const en = getPlatformContext('student', 'en')
    for (const label of ['My progress', 'You and your class', 'My results', 'Your class is still too small to compare']) {
      expect(en, label).toContain(label)
    }
    expect(en).not.toContain('Difficulties detected')
  })
})
