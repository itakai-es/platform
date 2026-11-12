import { describe, it, expect } from 'vitest'
import {
  OLD_WORDS,
  apply,
  findRow,
  insertAll,
  parseInserts,
  parseUpdates,
  prose,
  readMigration,
  seedThrough,
  type Row,
} from '../helpers/help-migration.js'
import {
  HINTS_IN_MISSION,
  INACTIVE_DAYS,
  LOW_ATTENDANCE_PERCENT,
  LOW_AVERAGE_MIN_APPROVALS,
  LOW_AVERAGE_PERCENT,
  LOW_GRADE_PERCENT,
  MISSION_HINTS_PER_STUDENT,
  MISSION_LOW_AVERAGE_MIN_APPROVALS,
  MISSION_LOW_AVERAGE_PERCENT,
  MISSION_UNFINISHED_PERCENT,
} from '../../src/modules/analytics/signals.js'
import { BAND_MARGIN, MIN_OTHERS, ROUND_STEP } from '../../src/utils/anonymous-stats.js'
import {
  DEFAULT_RANKING_CONFIG,
  RANKING_TOP_SIZES,
} from '../../src/utils/ranking-config.js'

/**
 * Red para la ayuda del bloque 6 (F1, entrega 9): cuatro guías nuevas (la
 * analítica de la clase y los tipos de ranking, para el profesorado; «Mi progreso
 * y mis resultados» y «Comparar con tu clase», para el alumnado), las dos del
 * ranking que se reescriben y las correcciones de lo que el bloque dejó viejo. Cada
 * INSERT solo crea lo que no existe y cae al final de su categoría; cada UPDATE
 * solo toca un campo que siga con el texto de serie, así que lo editado desde el
 * panel se respeta. Sin base de datos: se leen los SQL y se aplican sobre filas en
 * memoria, con la misma semántica que el SQL.
 *
 * Los umbrales y las reglas que cuentan las guías se comprueban contra las
 * constantes del código: si cambian, esta prueba avisa de que la ayuda miente.
 */

const NAME = '20261112109000_f1_help_analytics'
const migration = readMigration(NAME)
const inserts = parseInserts(migration)
const updates = parseUpdates(migration)

/** Las de ayuda que van antes, desde el bloque 5, en su orden. */
const BEFORE = [
  '20261024309000_e3_help_mission_order',
  '20261024319000_e3_help_mission_map',
  '20261024329000_e1_help_hints_in_copies',
  '20261024339000_e3_help_map_in_templates',
  '20261024349000_e4_help_avatar_per_class',
  '20261029109000_e3_help_mission_path',
]

const ANALYTICS = '/ayuda/alumnado/la-analitica-de-la-clase'
const RANKING = '/ayuda/gamificacion/tipos-de-ranking-y-quien-los-ve'
const PROGRESS = '/ayuda/si-eres-alumno/mi-progreso-y-mis-resultados'
const COMPARE = '/ayuda/si-eres-alumno/comparar-con-tu-clase'
/** Un enlace en markdown a `target`, con cualquier texto. */
const linkTo = (target: string) => new RegExp(`\\]\\(${target.replace(/\//g, '\\/')}\\)`)

/** La ayuda de serie tal como queda justo antes de esta migración. */
const seed = () => seedThrough(BEFORE)

function migrate(rows: Row[]) {
  return { inserted: insertAll(rows, inserts), updated: apply(rows, updates) }
}

/** La ayuda de serie después de esta migración. */
function after() {
  const rows = seed()
  migrate(rows)
  return rows
}

const body = (rows: Row[], category: string, slug: string) => findRow(rows, category, slug).body
const guide = (slug: string) => inserts.find(insert => insert.slug === slug)!.body
const words = (text: string) => text.trim().split(/\s+/).length

describe('migración f1_help_analytics', () => {
  it('la cadena de migraciones anteriores se lee entera', () => {
    const rows = seed()
    expect(body(rows, 'misiones', 'montar-el-camino-del-mapa')).toMatch(/\*\*Bloqueada va por encima\.\*\*/)
    expect(body(rows, 'alumnado', 'clasificacion-y-progreso')).toMatch(/al abrir una ficha tienes todo lo suyo/)
  })

  it('solo son INSERT y UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(inserts).toHaveLength(4)
    let rest = migration
    for (const statement of [...inserts, ...updates]) rest = rest.replace(statement.sql, '')
    expect(rest.replace(/^--.*$/gm, '').trim()).toBe('')
    for (const update of updates) {
      expect(update.guards).toEqual([[update.field, expect.any(String)]])
      expect(update.field).not.toBe('slug')
    }
  })

  it('nunca referencia ids, que cambian en cada instalación', () => {
    expect(migration).not.toMatch(/"id" = '/)
    expect(migration).not.toMatch(/"id" IN/)
    expect(migration).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-/)
  })

  it('las guías nuevas: dos del profesorado y dos del alumnado, con slugs libres e ilustraciones que ya existen', () => {
    expect(inserts.map(({ category, slug, audience }) => [category, slug, audience])).toEqual([
      ['alumnado', 'la-analitica-de-la-clase', 'profesor'],
      ['gamificacion', 'tipos-de-ranking-y-quien-los-ve', 'profesor'],
      ['si-eres-alumno', 'mi-progreso-y-mis-resultados', 'alumno'],
      ['si-eres-alumno', 'comparar-con-tu-clase', 'alumno'],
    ])
    expect(inserts.map(insert => insert.title)).toEqual([
      'La analítica de la clase',
      'Tipos de ranking y quién los ve',
      'Mi progreso y mis resultados',
      'Comparar con tu clase',
    ])
    const rows = seed()
    const covers = new Set(rows.map(row => row.cover))
    for (const insert of inserts) {
      expect(rows.some(row => row.slug === insert.slug)).toBe(false)
      expect(insert.summary.trim()).not.toBe('')
      expect(covers.has(insert.cover), insert.cover).toBe(true)
    }
  })

  it('cada guía nueva va al final de su categoría, y las del alumnado en su orden', () => {
    const rows = after()
    const last = (category: string, n = 1) =>
      rows.filter(row => row.category === category).map(row => row.slug).slice(-n)
    expect(last('alumnado')).toEqual(['la-analitica-de-la-clase'])
    expect(last('gamificacion')).toEqual(['tipos-de-ranking-y-quien-los-ve'])
    expect(last('si-eres-alumno', 2)).toEqual(['mi-progreso-y-mis-resultados', 'comparar-con-tu-clase'])
  })

  it('una guía que ya exista con ese slug se queda como está', () => {
    inserts.forEach(({ sql: _sql, ...insert }, index) => {
      const rows = seed()
      const existing: Row = { ...insert, body: 'escrito a mano desde el panel' }
      rows.push(existing)
      expect(migrate(rows).inserted[index]).toBe(0)
      expect(rows.filter(row => row.slug === insert.slug)).toEqual([existing])
    })
  })

  it('corrige los artículos previstos, cada uno protegido por su propio valor de serie', () => {
    expect(updates.map(update => `${update.category}/${update.slug}.${update.field}`)).toEqual([
      'alumnado/clasificacion-y-progreso.summary',
      'alumnado/clasificacion-y-progreso.body',
      'si-eres-alumno/la-clasificacion-de-la-clase.body',
      'clases/elegir-que-recursos-usa-tu-clase.body',
      'gamificacion/premiar-a-un-equipo-y-ver-la-clasificacion.body',
      'si-eres-alumno/mi-equipo.body',
      'alumnado/la-vista-del-alumno.body',
      'gamificacion/insignias.summary',
      'gamificacion/insignias.body',
      'misiones/enigmas-los-pasos-de-una-mision.body',
      'misiones/revisar-entregas.body',
      'misiones/el-mapa-de-misiones.body',
      'misiones/montar-el-camino-del-mapa.body',
      'si-eres-alumno/el-mapa-y-las-misiones-cerradas.body',
      'cuando-algo-falla/las-recompensas-no-cuadran.body',
      'alumnado/pasar-lista-y-consultar-la-asistencia.body',
      'gamificacion/comportamientos-y-puntos-de-vida.body',
      'gamificacion/niveles-y-rangos.body',
      'gamificacion/aplicar-a-varios-estudiantes.body',
      'alumnado/formar-equipos.body',
      'clases/niveles-y-perfiles-del-profesorado.body',
      'clases/el-historial-de-la-clase.body',
    ])
    const rows = seed()
    for (const update of updates) {
      const original = findRow(rows, update.category, update.slug)
      expect(original, `${update.category}/${update.slug}`).toBeDefined()
      expect(update.guards).toContainEqual([update.field, original[update.field]])
      expect(update.value).not.toBe(original[update.field])
    }
  })

  it('sobre la ayuda de serie sin editar, las guías entran y cada corrección toca una fila', () => {
    expect(migrate(seed())).toEqual({ inserted: [1, 1, 1, 1], updated: updates.map(() => 1) })
  })

  it('volver a pasarla no cambia nada', () => {
    const rows = after()
    const snapshot = JSON.stringify(rows)
    expect(migrate(rows)).toEqual({ inserted: [0, 0, 0, 0], updated: updates.map(() => 0) })
    expect(JSON.stringify(rows)).toBe(snapshot)
  })

  it('un artículo editado desde el panel se queda como está', () => {
    for (const update of updates) {
      const rows = seed()
      const row = findRow(rows, update.category, update.slug)
      row[update.field] = `${row[update.field]} (editado)`
      const edited = row[update.field]
      migrate(rows)
      expect(row[update.field], `${update.slug}.${update.field}`).toBe(edited)
    }
  })

  it('después de aplicarla, todos los enlaces entre artículos llevan a uno que existe', () => {
    const rows = after()
    const existing = new Set(rows.map(row => `${row.category}/${row.slug}`))
    for (const row of rows) {
      for (const [, target] of row.body.matchAll(/\]\(\/ayuda\/([a-z0-9-]+\/[a-z0-9-]+)\)/g)) {
        expect(existing.has(target), `${row.slug} → ${target}`).toBe(true)
      }
    }
  })

  it('las guías nuevas tienen un largo de guía, no de manual', () => {
    for (const insert of inserts) {
      const count = words(insert.body)
      expect(count, insert.slug).toBeGreaterThanOrEqual(300)
      expect(count, insert.slug).toBeLessThanOrEqual(800)
    }
  })

  it('la analítica: dónde está, qué cuenta cada cifra, el periodo y las misiones', () => {
    const text = guide('la-analitica-de-la-clase')
    expect(text).toMatch(/el \*\*Resumen\*\* te enseña cómo va y dónde se atasca/)
    expect(text).toMatch(/\*\*Estadísticas de la clase\*\*/)
    for (const label of ['Misiones de media', 'Progreso medio', 'Entregas por revisar', 'Ir a Misiones', 'Asistencia media', 'XP media']) {
      expect(text, label).toContain(`**${label}**`)
    }
    // «X de N»: lo bloqueado a mano y lo que no tiene enigmas no cuenta.
    expect(text).toMatch(/\*\*2,8 de 7\*\*/)
    expect(text).toMatch(/Las que has bloqueado a mano y las que no tienen enigmas no cuentan/)
    expect(text).toMatch(/puede salir «de 7» aunque la clase tenga 8/)
    expect(text).toMatch(/enigmas obligatorios aprobados/)
    expect(text).toMatch(/nunca «sobre un máximo»/)
    // El periodo y lo que es de hoy.
    expect(text).toMatch(/\*\*Este curso\*\* \(desde el 1 de septiembre\), \*\*Últimos 30 días\*\* o \*\*Últimos 7 días\*\*/)
    expect(text).toMatch(/Lo que lleva \*\*Hoy\*\* es la foto de ahora/)
    // Los estados de la barra y la tabla.
    expect(text).toMatch(
      /\*\*Completada\*\*, \*\*Por revisar\*\*[^.]*\*\*En curso\*\*[^.]*\*\*Sin empezar\*\*, \*\*Expirada\*\*[^.]*\*\*Cerrada por el camino\*\*/
    )
    expect(text).toMatch(/\*\*Ver como tabla\*\*/)
    expect(text).toMatch(linkTo('/ayuda/misiones/montar-el-camino-del-mapa'))
  })

  it('la analítica: las dificultades, con los umbrales del código', () => {
    const text = guide('la-analitica-de-la-clase')
    expect(text).toMatch(/## Dificultades detectadas\n\nAquí salen los avisos del periodo, cada uno con su motivo/)
    expect(text).toContain(`menos de un ${LOW_GRADE_PERCENT} %`)
    expect(text).toContain(`no llega al ${LOW_AVERAGE_PERCENT} %, con al menos ${LOW_AVERAGE_MIN_APPROVALS} enigmas`)
    expect(text).toContain(`usó ${HINTS_IN_MISSION} o más pistas en una misión, o una que resta un % de la recompensa`)
    expect(text).toContain(`lleva ${INACTIVE_DAYS} días o más sin actividad, con misiones que puede hacer`)
    expect(text).toContain(`su asistencia no llega al ${LOW_ATTENDANCE_PERCENT} %`)
    expect(text).toContain(`el ${MISSION_UNFINISHED_PERCENT} % o más de quien la empezó no la completó`)
    expect(text).toContain(
      `no llega al ${MISSION_LOW_AVERAGE_PERCENT} %, con al menos ${MISSION_LOW_AVERAGE_MIN_APPROVALS} enigmas aprobados`
    )
    expect(text).toContain(`${MISSION_HINTS_PER_STUDENT} o más pistas de media por estudiante que la empezó`)
    // Avisos con motivo, no notas; solo del profesorado; no deciden.
    expect(text).toMatch(/\*\*No son notas ni una puntuación\*\*/)
    expect(text).toMatch(/no deciden nada/)
    expect(text).toMatch(/Solo los ve el profesorado/)
    expect(text).toMatch(/Las entregas sin revisar no son una dificultad de nadie/)
  })

  it('la analítica: la página de cada estudiante, quién la ve y por qué no se proyecta', () => {
    const text = guide('la-analitica-de-la-clase')
    for (const label of ['Sus cifras', 'Media de la clase', 'Todas', 'Pendientes', 'Hechas', '% por enigma', 'Historial', 'Cargar más', 'Ver todas sus clases']) {
      expect(text, label).toContain(`**${label}**`)
    }
    expect(text).toMatch(/también con acceso de \*\*lectura\*\*, el perfil de \*\*Prácticas\*\* incluido/)
    expect(text).toMatch(/en la papelera, no/)
    expect(text).toMatch(/## No es para proyectar/)
    expect(text).toMatch(/lleva nombres reales/)
    expect(text).toMatch(/usa \*\*Ver como estudiante\*\*/)
  })

  it('el ranking: dónde se configura, el interruptor, los modos y la sugerencia para menores', () => {
    const text = guide('tipos-de-ranking-y-quien-los-ve')
    expect(text).toMatch(/en \*Ajustes\*, sección \*\*Funcionalidades\*\*/)
    expect(text).toMatch(/acceso de administración/)
    expect(text).toMatch(/Apagado, solo lo ve el profesorado/)
    expect(text).toMatch(/pestaña \*\*Alumnado\*\*, vista \*\*Ranking\*\*/)
    expect(text).toMatch(/\*\*Tu alumnado ve: los 5 primeros puestos y el suyo\.\*\*/)
    expect(text).toMatch(/\*\*Opciones del ranking\*\*/)
    expect(text).toMatch(/\*\*Qué ve el alumnado\*\*/)
    expect(text).toMatch(/\*\*La clasificación completa\*\*/)
    expect(text).toMatch(/\*\*Los N primeros puestos y el suyo\*\*/)
    expect(text).toMatch(/\*\*Solo su puesto\*\*/)
    expect(text).toMatch(/\*\*Cuántos puestos se ven\*\*/)
    expect(text).toContain(`eliges ${RANKING_TOP_SIZES.slice(0, -1).join(', ')} o ${RANKING_TOP_SIZES.at(-1)}`)
    expect(text).toMatch(/\*\*Los 5 primeros puestos y el suyo \(sugerencia\)\*\*/)
    // Lo de serie es una sugerencia; las clases empiezan como siempre.
    expect(DEFAULT_RANKING_CONFIG.mode).toBe('full')
    expect(text).toMatch(/Es una sugerencia, no una regla: las clases empiezan con \*\*La clasificación completa\*\*/)
    expect(text).toMatch(/\*\*no llega a su navegador\*\*/)
  })

  it('el ranking: los tipos, lo que pide cada uno, los periodos, la temporada y la comparación', () => {
    const text = guide('tipos-de-ranking-y-quien-los-ve')
    expect(text).toMatch(/\*\*Tipos de ranking\*\*/)
    expect(text).toMatch(/\| \*\*XP\*\* \| La XP acumulada en la clase \| Que la clase use la experiencia \(XP\) \|/)
    expect(text).toMatch(/\| \*\*Misiones completadas\*\* \|[^|]+\| Nada \|/)
    expect(text).toMatch(/\| \*\*Equipos\*\* \|[^|]+\| Una agrupación de base en \*\*Alumnado → Equipos\*\* \|/)
    expect(DEFAULT_RANKING_CONFIG.types).toEqual(['xp', 'teams'])
    expect(text).toMatch(/De entrada van encendidos \*\*XP\*\* y \*\*Equipos\*\*, y hace falta al menos un tipo/)
    expect(text).toMatch(/1, 2, 2, 4/)
    expect(text).toMatch(/\*\*XP\*\* solo tiene \*\*Siempre\*\*/)
    expect(text).toMatch(/\*\*Esta semana\*\*, desde el lunes, y \*\*Temporada\*\*/)
    expect(text).toMatch(/\*\*Empezar temporada\*\*/)
    expect(text).toMatch(/No borra nada y la XP no cambia/)
    expect(text).toMatch(/\*\*Empezar otra temporada\*\* sustituye a la anterior/)
    expect(text).toMatch(/\*\*Comparar con la media\*\*, con su propio interruptor/)
    expect(text).toMatch(/Funciona aunque apagues el ranking/)
    expect(text).toMatch(linkTo(COMPARE))
    expect(text).toMatch(/La temporada no: es de cada clase/)
  })

  it('«Mi progreso y mis resultados»: las cifras, los estados, el % de cada enigma y el bonus', () => {
    const text = guide('mi-progreso-y-mis-resultados')
    for (const label of ['Mi progreso', 'Mis resultados', 'Misiones completadas', 'XP total', 'Insignias obtenidas', 'Pendientes', 'Hechas', '% de cada enigma', 'Sin entregar', '(opcional)', '1 en revisión', 'Bloqueada']) {
      expect(text, label).toContain(`**${label}**`)
    }
    expect(text).toMatch(/todos sus enigmas obligatorios/)
    expect(text).toMatch(/si tu docente ha bloqueado una misión o aún no tiene enigmas, no entra en la cuenta/)
    expect(text).toMatch(/\*\*Bloqueada\*\* quiere decir que todavía no puedes entrar: se abre al completar otra misión/)
    expect(text).toMatch(/\*\*No incluye el bonus por completar la misión\*\*/)
    expect(text).toMatch(linkTo('/ayuda/si-eres-alumno/el-mapa-y-las-misiones-cerradas'))
    expect(text).toMatch(linkTo(COMPARE))
  })

  it('«Comparar con tu clase»: el resto de la clase, redondeado y en palabras, el umbral y el interruptor', () => {
    const text = guide('comparar-con-tu-clase')
    expect(text).toMatch(/\*\*Tú y tu clase\*\*/)
    expect(text).toMatch(/\*\*Vas por encima de la media del resto de tu clase\.\*\*/)
    expect(text).toMatch(/\*\*Estás en la media del resto de tu clase\.\*\*/)
    expect(text).toMatch(/\*\*Vas por debajo de la media del resto de tu clase\.\*\*/)
    expect(text).toContain(`a un ${BAND_MARGIN * 100} % o menos`)
    expect(text).toMatch(/\*\*sin contarte a ti\*\*/)
    // El redondeo y el umbral, los del código.
    expect(ROUND_STEP).toMatchObject({ xp: 10, missions: 1 })
    expect(text).toMatch(/la XP, a la decena, y las misiones, a la unidad/)
    expect(MIN_OTHERS).toBe(5)
    expect(text).toMatch(/al menos cinco personas además de ti, seis en total/)
    expect(text).toMatch(/\*\*Tu clase aún es pequeña para comparar\.\*\*/)
    expect(text).toMatch(/Tiene su propio interruptor, aparte del ranking/)
    expect(text).toMatch(/Nunca tus notas ni tu asistencia/)
    expect(text).toMatch(/cada cual ve solo lo suyo/)
    expect(text).toMatch(linkTo(PROGRESS))
  })

  it('las guías del alumnado hablan de tú y sin jerga', () => {
    for (const slug of ['mi-progreso-y-mis-resultados', 'comparar-con-tu-clase']) {
      const text = guide(slug)
      expect(text, slug).toMatch(/\b(tienes|ves|llevas)\b/)
      expect(text, slug).not.toMatch(/\b(API|servidor|navegador|umbral|matrícula|anonimidad)\b/i)
    }
  })

  it('«Clasificación y progreso» cuenta lo que hay, y no lo que prometía la ficha', () => {
    const rows = after()
    const row = findRow(rows, 'alumnado', 'clasificacion-y-progreso')
    expect(row.summary).toMatch(/la vista Ranking, el panel del Resumen, su página en la clase y su ficha/)
    expect(row.body).not.toMatch(/al abrir una ficha tienes todo lo suyo/)
    expect(row.body).not.toMatch(/historial de comportamientos aplicados/)
    expect(row.body).not.toMatch(/experiencia acumulada en esa clase/)
    expect(row.body).toMatch(/por XP, por misiones completadas o por los puntos de los equipos/)
    expect(row.body).toMatch(/es el índice de sus clases/)
    expect(row.body).toMatch(/\*\*Ver en la clase\*\*/)
    expect(row.body).toMatch(linkTo(RANKING))
    expect(row.body).toMatch(linkTo(ANALYTICS))
  })

  it('el ranking del alumnado: los tipos, los periodos, qué se ve y la comparación', () => {
    const text = body(after(), 'si-eres-alumno', 'la-clasificacion-de-la-clase')
    expect(text).toMatch(/- \*\*XP\*\*:/)
    expect(text).toMatch(/- \*\*Misiones\*\*:/)
    expect(text).toMatch(/- \*\*Equipos\*\*:/)
    expect(text).toMatch(/\*\*Siempre\*\*, \*\*Esta semana\*\*/)
    expect(text).toMatch(/\*\*Puesto 4 de 8\*\*/)
    expect(text).toMatch(/nunca el nombre real/)
    expect(text).toMatch(/\*\*Nadie ve tus entregas ni tus porcentajes\*\*/)
    expect(text).toMatch(linkTo(COMPARE))
  })

  it('el barrido: ninguna guía de serie repite lo que el bloque ha dejado viejo', () => {
    for (const row of after()) {
      const where = `${row.category}/${row.slug}`
      // El ranking ya no pide XP ni es un interruptor sin más.
      expect(row.body, where).not.toMatch(/tiene (la clasificación activada|activada la clasificación)/)
      expect(row.body, where).not.toMatch(/encima del podio/)
      // La ficha es un índice: lo de cada estudiante está en su página de la clase.
      expect(row.body, where).not.toMatch(/en la ficha de cada estudiante/)
      expect(row.body, where).not.toMatch(/la ficha de cada estudiante reúne/)
      // La actividad ya no lleva la XP de cada entrega.
      expect(row.body, where).not.toMatch(/\*\*Actividad Reciente\*\*/)
      // Los opcionales no cuentan en el progreso.
      expect(row.body, where).not.toMatch(/cuenta en el avance/)
      // «Ver entregas» y «Editar» están a la vista.
      expect(row.body, where).not.toMatch(/en el móvil está en el menú \*\*⋮\*\*/)
      expect(row.body, where).not.toMatch(/\*\*Entregas por Revisar\*\*/)
      // La pestaña es «Alumnado».
      expect(row.body, where).not.toMatch(/\*\*Alumnos( → [^*]+)?\*\*/)
      // Delante del alumnado, «bloqueada»: lo que dice la pantalla.
      expect(row.body, where).not.toMatch(/cerrada por tu docente por ahora/)
      expect(row.body, where).not.toMatch(/## Cerrada por tu docente/)
      expect(row.body, where).not.toMatch(/cómo va la clase en el recorrido/)
    }
  })

  it('las correcciones: recursos, equipos, vista del alumnado, insignias, enigmas y entregas', () => {
    const rows = after()
    const features = body(rows, 'clases', 'elegir-que-recursos-usa-tu-clase')
    expect(features).toMatch(/\| \*\*Comparar con la media\*\* \|/)
    expect(features).toMatch(/El ranking no necesita la XP/)
    expect(features).toMatch(linkTo(RANKING))
    const teams = body(rows, 'gamificacion', 'premiar-a-un-equipo-y-ver-la-clasificacion')
    expect(teams).toMatch(/Los equipos son uno de los \[tipos de ranking\]/)
    expect(teams).toMatch(/\*\*Alumnado → Ranking\*\*, en su pestaña \*\*Equipos\*\*/)
    expect(body(rows, 'si-eres-alumno', 'mi-equipo')).toMatch(/en la pestaña \*\*Ranking\*\*, en \*\*Equipos\*\*/)
    const view = body(rows, 'alumnado', 'la-vista-del-alumno')
    expect(view).toMatch(/\*\*4 de 8 misiones\*\*/)
    expect(view).toMatch(/\*\*Mi progreso\*\*/)
    expect(view).toMatch(/\*\*Tú y tu clase\*\*/)
    expect(view).toMatch(/\*\*Mis resultados\*\*/)
    expect(view).toMatch(/ni en la analítica/)
    expect(view).toMatch(linkTo(PROGRESS))
    expect(findRow(rows, 'gamificacion', 'insignias').summary).toMatch(/las tuyas y las de ITAKAI/)
    const badges = body(rows, 'gamificacion', 'insignias')
    expect(badges).toMatch(/todos sus enigmas obligatorios aprobados/)
    expect(badges).toMatch(/\*\*Tus insignias\*\*/)
    expect(badges).toMatch(/\*\*Insignias de ITAKAI\*\*/)
    expect(badges).toMatch(/No se pueden editar/)
    expect(badges).toMatch(/\*\*Crear una parecida\*\*/)
    const enigmas = body(rows, 'misiones', 'enigmas-los-pasos-de-una-mision')
    expect(enigmas).toMatch(/ni cuenta en el progreso: sale aparte, como \*\*Extra\*\*/)
    expect(enigmas).toMatch(/a la vista \*\*Ver entregas \(N\)\*\*/)
    expect(enigmas).toMatch(/\*\*Eliminar\*\* está en su menú \*\*⋮\*\*/)
    const review = body(rows, 'misiones', 'revisar-entregas')
    expect(review).toMatch(/a la vista su botón \*\*Ver entregas \(N\)\*\*/)
    expect(review).toMatch(linkTo(ANALYTICS))
  })

  it('las correcciones: el mapa, las recompensas, la asistencia, los niveles y el profesorado', () => {
    const rows = after()
    expect(body(rows, 'misiones', 'el-mapa-de-misiones')).toMatch(/\*\*Bloqueada por tu docente por ahora\*\*/)
    expect(body(rows, 'misiones', 'el-mapa-de-misiones')).toMatch(/\*\*De media, 3 de 8 misiones completadas\*\*/)
    expect(body(rows, 'misiones', 'montar-el-camino-del-mapa')).toMatch(/\(bloqueada por tu docente por ahora\)\*\*/)
    const student = body(rows, 'si-eres-alumno', 'el-mapa-y-las-misiones-cerradas')
    expect(student).toMatch(/## Bloqueada por tu docente/)
    expect(student).toMatch(/\*\*Bloqueada por tu docente por ahora\*\*/)
    const rewards = body(rows, 'cuando-algo-falla', 'las-recompensas-no-cuadran')
    expect(rewards).toMatch(/\*\*% por enigma\*\*/)
    expect(rewards).toMatch(/no lleva el bonus por completarla; el saldo, sí/)
    expect(body(rows, 'alumnado', 'pasar-lista-y-consultar-la-asistencia')).toMatch(
      /En la página de cada estudiante en la clase tienes además su asistencia del periodo/
    )
    const access = body(rows, 'clases', 'niveles-y-perfiles-del-profesorado')
    expect(access).toMatch(/historial y la \[analítica\]/)
    expect(access).toMatch(/las opciones del ranking y sus temporadas/)
    expect(body(rows, 'clases', 'el-historial-de-la-clase')).toMatch(/cada temporada del ranking que se empieza/)
  })

  it('lo nuevo usa un lenguaje que vale para todo el mundo', () => {
    for (const { title, summary, body: text } of [
      ...inserts,
      ...updates.map(u => ({ title: '', summary: '', body: u.value })),
    ]) {
      for (const value of [title, summary, text]) expect(prose(value)).not.toMatch(OLD_WORDS)
    }
  })
})
