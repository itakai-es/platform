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

/**
 * Red para la migración de la ayuda de E3, entrega 4: el camino del mapa de
 * misiones. La guía del mapa (profesorado) cuenta el tablero, qué ve el
 * alumnado, cómo se apaga y qué pasa al copiar; el camino va en una guía nueva
 * del profesorado (cómo se monta, cuándo se abre cada misión y cómo encaja con
 * el orden), y hay otra guía nueva para el alumnado (por qué una misión sale
 * bloqueada y cómo leer el mapa). Se retocan las que hablan del orden, de
 * completar una misión, de las copias, del historial y de la vista del
 * alumnado. Cada INSERT solo crea lo que no existe y cae al final de su
 * categoría; cada UPDATE solo toca un campo que siga con el texto de serie, así
 * que lo editado desde el panel se respeta. Sin base de datos: se leen los SQL y
 * se aplican sobre filas en memoria, con la misma semántica que el SQL.
 */

const NAME = '20261029109000_e3_help_mission_path'
const migration = readMigration(NAME)
const inserts = parseInserts(migration)
const updates = parseUpdates(migration)

/** Las de ayuda del bloque 5 que van antes, en su orden. */
const BEFORE = [
  '20261024309000_e3_help_mission_order',
  '20261024319000_e3_help_mission_map',
  '20261024329000_e1_help_hints_in_copies',
  '20261024339000_e3_help_map_in_templates',
  '20261024349000_e4_help_avatar_per_class',
]

const MAP = '/ayuda/misiones/el-mapa-de-misiones'
const PATH = '/ayuda/misiones/montar-el-camino-del-mapa'
const STUDENT = '/ayuda/si-eres-alumno/el-mapa-y-las-misiones-cerradas'
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
const mapGuide = () => body(after(), 'misiones', 'el-mapa-de-misiones')
const pathGuide = () => body(after(), 'misiones', 'montar-el-camino-del-mapa')
const words = (text: string) => text.trim().split(/\s+/).length

describe('migración e3_help_mission_path', () => {
  it('la cadena de migraciones anteriores se lee entera', () => {
    const rows = seed()
    expect(rows.some(row => row.slug === 'el-mapa-de-misiones')).toBe(true)
    expect(body(rows, 'misiones', 'el-mapa-de-misiones')).toMatch(
      /o al importarla como plantilla, el interruptor llega como estaba/
    )
    expect(body(rows, 'si-eres-alumno', 'como-entro-en-mi-clase')).toMatch(
      /Tu avatar y tu alias, en cambio, son de cada clase/
    )
  })

  it('solo son INSERT y UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(inserts).toHaveLength(2)
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

  it('las guías nuevas: el camino para el profesorado y la del alumnado, con slugs libres e ilustraciones que ya existen', () => {
    expect(inserts.map(({ category, slug, audience }) => [category, slug, audience])).toEqual([
      ['misiones', 'montar-el-camino-del-mapa', 'profesor'],
      ['si-eres-alumno', 'el-mapa-y-las-misiones-cerradas', 'alumno'],
    ])
    const rows = seed()
    const covers = new Set(rows.map(row => row.cover))
    for (const guide of inserts) {
      expect(rows.some(row => row.slug === guide.slug)).toBe(false)
      expect(guide.title.trim()).not.toBe('')
      expect(guide.summary.trim()).not.toBe('')
      expect(covers.has(guide.cover)).toBe(true)
    }
    expect(inserts.map(guide => guide.title)).toEqual([
      'Montar el camino del mapa',
      'El mapa de misiones y las misiones bloqueadas',
    ])
  })

  it('la guía del camino va justo detrás de la del mapa en su categoría', () => {
    const misiones = after()
      .filter(row => row.category === 'misiones')
      .map(row => row.slug)
    expect(misiones.slice(-2)).toEqual(['el-mapa-de-misiones', 'montar-el-camino-del-mapa'])
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
      'misiones/el-mapa-de-misiones.summary',
      'misiones/el-mapa-de-misiones.body',
      'misiones/el-orden-de-las-misiones.body',
      'misiones/enigmas-los-pasos-de-una-mision.body',
      'misiones/revisar-entregas.body',
      'misiones/importar-una-mision-de-otra-clase.body',
      'misiones/pistas-en-las-misiones.body',
      'clases/elegir-que-recursos-usa-tu-clase.body',
      'clases/duplicar-una-clase-para-el-curso-siguiente.body',
      'clases/crear-una-clase-desde-cero-o-desde-una-plantilla.body',
      'clases/publicar-tu-clase-como-plantilla.body',
      'clases/el-historial-de-la-clase.body',
      'alumnado/la-vista-del-alumno.body',
      'si-eres-alumno/como-entrego-una-mision.body',
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
    expect(migrate(seed())).toEqual({ inserted: [1, 1], updated: updates.map(() => 1) })
  })

  it('volver a pasarla no cambia nada', () => {
    const rows = after()
    const snapshot = JSON.stringify(rows)
    expect(migrate(rows)).toEqual({ inserted: [0, 0], updated: updates.map(() => 0) })
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

  it('el mapa y el camino quedan en dos guías de un largo como el de sus vecinas', () => {
    const rows = after()
    for (const [category, slug] of [
      ['misiones', 'el-mapa-de-misiones'],
      ['misiones', 'montar-el-camino-del-mapa'],
      ['si-eres-alumno', 'el-mapa-y-las-misiones-cerradas'],
    ] as const) {
      const count = words(body(rows, category, slug))
      expect(count, slug).toBeGreaterThanOrEqual(300)
      expect(count, slug).toBeLessThanOrEqual(650)
    }
  })

  it('la guía del mapa: el resumen y lo de la beta, en pruebas, apagado, quién lo enciende y la ficha', () => {
    expect(findRow(after(), 'misiones', 'el-mapa-de-misiones').summary).toMatch(
      /en un tablero, de la Salida a la Meta: cómo se enciende/
    )
    const map = mapGuide()
    expect(map).not.toMatch(/no abre ni cierra misiones/)
    expect(map).not.toMatch(/zigzag/)
    expect(map).toMatch(/\*\*Beta\*\*/)
    expect(map).toMatch(/\*\*En pruebas\*\*, activa \*\*Mapa de misiones\*\*/)
    expect(map).toMatch(/Va apagado de entrada/)
    expect(map).toMatch(/acceso de administración/)
    expect(map).toMatch(/En el mapa no hay filtros/)
    expect(map).toMatch(/nunca solo con un color/)
    expect(map).toMatch(/La ficha pública de una plantilla no lo enseña/)
    expect(map).toMatch(/\[orden de la clase\]\(\/ayuda\/misiones\/el-orden-de-las-misiones\)/)
  })

  it('la guía del mapa cuenta el tablero de los dos roles, con los senderos y quién ha completado cada misión', () => {
    const map = mapGuide()
    expect(map).toMatch(/de la \*\*Salida\*\* a la \*\*Meta\*\*/)
    expect(map).toMatch(/las ramas que acaban antes llegan a la \*\*Meta\*\* por un sendero más fino/)
    expect(map).toMatch(/\*\*Has completado 3 de 8 misiones\*\*/)
    expect(map).toMatch(/\*\*Estás aquí\*\* con su avatar/)
    expect(map).toMatch(/\*\*Ir a mi misión\*\*/)
    expect(map).toMatch(/un anillo con la parte de la clase que la ha completado/)
    expect(map).toMatch(/Al pulsar una misión se abre su detalle/)
    expect(map).toMatch(/con sus avatares, quién/)
    expect(map).toMatch(/si son más de ocho, el último dice cuántas más/)
    expect(map).toMatch(/\*\*En curso: 2\*\* dice cuántas la han empezado sin terminarla/)
    expect(map).toMatch(/Tu vista previa como estudiante no cuenta/)
    expect(map).toMatch(/\*\*Leyenda\*\*/)
    expect(map).toMatch(/las flechas pasan de una misión a la siguiente/)
  })

  it('la guía del mapa cuenta qué ve el alumnado: «Bloqueada» y el motivo', () => {
    const map = mapGuide()
    expect(map).toMatch(/sale como \*\*Bloqueada\*\*/)
    expect(map).toMatch(/\*\*Bloqueada: se abre al completar «…»\*\*/)
    expect(map).toMatch(/\*\*Bloqueada: cerrada por tu docente por ahora\*\*/)
    expect(map).toMatch(/En las tarjetas lee \*\*Se abre al completar «…»\*\*/)
    expect(map).toMatch(/\*\*Para abrirla, completa antes\*\*/)
    expect(map).toMatch(
      /\*\*Tu docente ha cerrado esta misión por ahora\. Podrás entrar cuando la abra\.\*\*/
    )
    expect(map).toMatch(linkTo(STUDENT))
  })

  it('la guía del mapa cuenta qué pasa al apagarlo y al copiar', () => {
    const map = mapGuide()
    expect(map).toMatch(/Apagar el mapa \*\*lo abre todo al momento\*\*/)
    expect(map).toMatch(/solo siguen cerradas las bloqueadas/)
    expect(map).toMatch(/los requisitos se quedan guardados y vuelven a cerrar/)
    expect(map).toMatch(/con sus misiones, el camino llega igual/)
    expect(map).toMatch(/con las funcionalidades, el interruptor también/)
    expect(map).toMatch(/llega \*\*sin requisitos\*\*, y en la de origen ya no la pide nadie/)
  })

  it('la guía del mapa deja el camino a la suya y enlaza con ella', () => {
    const map = mapGuide()
    expect(map.match(new RegExp(linkTo(PATH), 'g'))?.length).toBeGreaterThanOrEqual(2)
    for (const moved of [
      /Encadenar en orden/,
      /Quitar los requisitos/,
      /\*\*hasta 3\*\*/,
      /Para abrirla, completar antes/,
      /## Montar el camino/,
      /## Cuándo se abre/,
      /\*\*Bloqueada va por encima\.\*\*/,
    ]) {
      expect(map).not.toMatch(moved)
    }
  })

  it('la guía del camino cuenta cómo se monta, con los nombres de la pantalla', () => {
    const path = pathGuide()
    expect(findRow(after(), 'misiones', 'montar-el-camino-del-mapa').summary).toMatch(
      /Que una misión no se abra hasta completar otras/
    )
    expect(path).toMatch(linkTo(MAP))
    expect(path).toMatch(/\*\*hasta 3\*\* misiones de su clase/)
    expect(path).toMatch(/hacen falta \*\*todas\*\*/)
    expect(path).toMatch(
      /ve a \*\*Ajustes\*\*\. En la sección \*\*Camino\*\*, marca en \*\*Para abrirla, completar antes\*\*/
    )
    expect(path).toMatch(/\*\*Guardar cambios\*\*/)
    expect(path).toMatch(/Las atenuadas no se pueden marcar/)
    expect(path).toMatch(/pulsa \*\*Ordenar\*\*/)
    expect(path).toMatch(/en \*\*Camino del mapa\*\*, hay dos botones/)
    expect(path).toMatch(/\*\*Encadenar en orden\*\* hace que cada misión pida la anterior/)
    expect(path).toMatch(/Las bloqueadas se quedan fuera/)
    expect(path).toMatch(/\*\*Quitar los requisitos\*\* los borra todos/)
    expect(path).toMatch(/acceso de \*\*edición\*\*/)
    expect(path).toMatch(/\[historial\]\(\/ayuda\/clases\/el-historial-de-la-clase\)/)
    expect(path).toMatch(/Se puede preparar con el mapa apagado/)
  })

  it('la guía del camino cuenta cuándo se abre cada misión', () => {
    const path = pathGuide()
    expect(path).toMatch(/recorre el camino a su ritmo/)
    expect(path).toMatch(/la ve como \*\*Bloqueada\*\*, con lo que le falta: \*\*Se abre al completar «…»\*\*/)
    expect(path).toMatch(/\*\*Aún no puedes empezar esta misión\*\*/)
    // Los opcionales no cuentan para completar.
    expect(path).toMatch(/aprobados todos sus enigmas obligatorios/)
    expect(path).toMatch(/\[opcionales\]\(\/ayuda\/misiones\/enigmas-los-pasos-de-una-mision\)/)
    // Lo empezado de verdad no se cierra.
    expect(path).toMatch(/una entrega, un enigma aprobado o una pista usada, no se le cierra/)
    // Un requisito caducado o sin enigmas no cierra; alargarle la fecha vuelve a cerrar.
    expect(path).toMatch(/ha caducado o no tiene enigmas, no cierra lo que va detrás/)
    expect(path).toMatch(/Si le alargas la fecha, vuelve a cerrarlo/)
    // La manual va por encima, y el profesorado no tiene cierres.
    expect(path).toMatch(/\*\*Bloqueada va por encima\.\*\*/)
    expect(path).toMatch(/\*\*Se abre al completar «A» \(cerrada por tu docente por ahora\)\*\*/)
    expect(path).toMatch(/también con \*\*Ver como estudiante\*\*/)
    expect(path).toMatch(/No se puede abrir una misión a una sola persona/)
  })

  it('la guía del camino cuenta cómo encaja con el orden', () => {
    const path = pathGuide()
    expect(path).toMatch(/\*\*no puede ir delante de lo que pide\*\*/)
    expect(path).toMatch(/al encenderlo, se recoloca solo lo justo/)
    expect(path).toMatch(linkTo('/ayuda/misiones/el-orden-de-las-misiones'))
  })

  it('la guía del alumnado: los dos motivos del candado, cómo se abre y cómo leer el mapa', () => {
    const guide = inserts.find(insert => insert.audience === 'alumno')!
    expect(guide.summary).toMatch(/con candado, como «Bloqueada»/)
    const text = guide.body
    expect(text).toMatch(/con un \*\*candado\*\* y como \*\*Bloqueada\*\*/)
    // Cerrada por el camino.
    expect(text).toMatch(/En las tarjetas, esas misiones dicen \*\*Se abre al completar «…»\*\*/)
    expect(text).toMatch(/tienes que completarlas \*\*todas\*\*/)
    expect(text).toMatch(/Los que pone \*\*Opcional\*\* no hacen falta/)
    expect(text).toMatch(/Cada persona va a su ritmo/)
    expect(text).toMatch(/ha pasado su fecha, o no tiene enigmas, no te cierra nada/)
    expect(text).toMatch(/hiciste una entrega, te aprobaron un enigma o usaste una pista/)
    expect(text).toMatch(/\*\*Aún no puedes empezar esta misión\*\*/)
    // Cerrada por su docente, con el mismo texto que la pantalla.
    expect(text).toMatch(
      /\*\*Tu docente ha cerrado esta misión por ahora\. Podrás entrar cuando la abra\.\*\*/
    )
    expect(text).toMatch(/\(cerrada por tu docente por ahora\)/)
    // El mapa: el estado se llama «Bloqueada» y dice el motivo.
    expect(text).toMatch(/de la \*\*Salida\*\* a la \*\*Meta\*\*/)
    expect(text).toMatch(/\*\*Has completado 3 de 8 misiones\*\*/)
    expect(text).toMatch(/\*\*Estás aquí\*\*, con tu avatar/)
    expect(text).toMatch(/\*\*Ir a mi misión\*\*/)
    expect(text).toMatch(
      /\*\*Completada\*\*, \*\*En curso\*\*, \*\*Disponible\*\*, \*\*Urgente\*\* \(vence pronto\), \*\*Expirada\*\* o \*\*Bloqueada\*\*/
    )
    expect(text).toMatch(/\*\*Bloqueada: se abre al completar «…»\*\*/)
    expect(text).toMatch(/\*\*Bloqueada: cerrada por tu docente por ahora\*\*/)
    expect(text).toMatch(/Pulsa un estado de la \*\*Leyenda\*\* para resaltar sus misiones/)
    expect(text).toMatch(/se abre su \*\*detalle\*\*/)
    expect(text).toMatch(/\*\*Empezar\*\*, \*\*Continuar\*\* o \*\*Ver misión\*\*/)
    expect(text).toMatch(/en \*\*Para abrirla, completa antes\*\*/)
    expect(text).toMatch(/pone \*\*Beta\*\*/)
    // Para estudiantes: sin jerga.
    expect(text).not.toMatch(/\b(grafo|arista|nodo|dependencia)s?\b/i)
  })

  it('ninguna guía de serie nombra ya el estado «Cerrada» del mapa', () => {
    for (const row of after()) {
      expect(row.body, row.slug).not.toMatch(/\*\*Cerrada\*\*/)
      expect(row.body, row.slug).not.toMatch(/\*\*Cerrada por tu docente\*\*/)
    }
  })

  it('los retoques: orden, enigmas opcionales, revisar, importar y pistas', () => {
    const rows = after()
    const order = body(rows, 'misiones', 'el-orden-de-las-misiones')
    expect(order).toMatch(/El orden no abre ni cierra nada por sí solo/)
    expect(order).toMatch(/\*\*una misión no puede ir delante de lo que pide\*\*/)
    expect(order).toMatch(/\*\*Camino del mapa\*\*/)
    expect(order).toMatch(/\*\*Encadenar en orden\*\*/)
    expect(order).toMatch(linkTo(MAP))
    expect(order).toMatch(linkTo(PATH))
    const enigmas = body(rows, 'misiones', 'enigmas-los-pasos-de-una-mision')
    expect(enigmas).toMatch(/\*\*Este enigma es opcional\*\*/)
    expect(enigmas).toMatch(/\*\*no hace falta para completar la misión\*\*/)
    expect(enigmas).toMatch(/el último enigma obligatorio/)
    expect(enigmas).toMatch(/Si todos los enigmas son opcionales, basta con aprobar uno/)
    expect(enigmas).toMatch(/abre las que la piden en el \[camino del mapa\]/)
    expect(enigmas).toMatch(linkTo(PATH))
    expect(body(rows, 'misiones', 'revisar-entregas')).toMatch(/el último enigma obligatorio/)
    const imported = body(rows, 'misiones', 'importar-una-mision-de-otra-clase')
    expect(imported).toMatch(/Tampoco trae \*\*requisitos\*\* del \[camino del mapa\]/)
    expect(imported).toMatch(linkTo(PATH))
    const hints = body(rows, 'misiones', 'pistas-en-las-misiones')
    expect(hints).toMatch(/cerrada por el \[camino del mapa\]/)
    expect(hints).toMatch(linkTo(PATH))
  })

  it('los retoques: recursos, copias, plantillas, historial, vista del alumnado y entregar', () => {
    const rows = after()
    const features = body(rows, 'clases', 'elegir-que-recursos-usa-tu-clase')
    expect(features).toMatch(/\| \*\*Mapa de misiones\*\* \| En pruebas y apagado de entrada/)
    expect(features).toMatch(/una misión puede pedir que se completen otras antes de abrirse/)
    expect(features).toMatch(/apagado, lo que pide cada misión se queda guardado, pero no cierra nada/)
    for (const [category, slug] of [
      ['clases', 'duplicar-una-clase-para-el-curso-siguiente'],
      ['clases', 'crear-una-clase-desde-cero-o-desde-una-plantilla'],
      ['clases', 'publicar-tu-clase-como-plantilla'],
    ] as const) {
      expect(body(rows, category, slug), slug).toMatch(/lo que pide cada una para abrirse/)
    }
    // Lo que ya contaban los retoques del bloque 5 sigue ahí.
    expect(body(rows, 'clases', 'duplicar-una-clase-para-el-curso-siguiente')).toMatch(
      /enigmas, sus \[pistas\]\(\/ayuda\/misiones\/pistas-en-las-misiones\)/
    )
    const history = body(rows, 'clases', 'el-historial-de-la-clase')
    expect(history).toMatch(/cambios de \[orden\]\(\/ayuda\/misiones\/el-orden-de-las-misiones\)/)
    expect(history).toMatch(/cambios en el \[camino del mapa\]/)
    expect(history).toMatch(linkTo(PATH))
    const view = body(rows, 'alumnado', 'la-vista-del-alumno')
    expect(view).not.toMatch(/las activas primero/)
    expect(view).toMatch(/en el \[orden de la clase\]/)
    expect(view).toMatch(/las ve de entrada en el mapa, con candado las que aún no se le han abierto/)
    expect(view).toMatch(/Con ella lo ves todo abierto: el \[camino del mapa\]/)
    expect(view).toMatch(linkTo(PATH))
    const deliver = body(rows, 'si-eres-alumno', 'como-entrego-una-mision')
    expect(deliver).toMatch(/Los que pone \*\*Opcional\*\* no hacen falta para completarla/)
    expect(deliver).toMatch(/\[el mapa de misiones y las misiones bloqueadas\]/)
    expect(deliver).toMatch(linkTo(STUDENT))
  })

  it('ninguna guía de serie dice ya que el mapa no cierra nada', () => {
    for (const row of after()) {
      expect(row.body, row.slug).not.toMatch(/no abre ni cierra misiones/)
    }
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
