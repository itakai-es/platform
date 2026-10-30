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
 * Red para la migración de la ayuda de E3, entrega 2: la guía «El mapa de
 * misiones (beta)» (profesorado) y su fila en la tabla de las funcionalidades
 * de la clase. El INSERT solo crea lo que no existe y cae al final de su categoría;
 * cada UPDATE solo toca un campo que siga con el texto de serie, así que lo
 * editado desde el panel se respeta. Sin base de datos: se leen los SQL y se
 * aplican sobre filas en memoria, con la misma semántica que el SQL.
 */

const NAME = '20261024319000_e3_help_mission_map'
const migration = readMigration(NAME)
const inserts = parseInserts(migration)
const updates = parseUpdates(migration)

/** La ayuda de serie tal como queda justo antes de esta migración. */
const seed = () => seedThrough(['20261024309000_e3_help_mission_order'])

function migrate(rows: Row[]) {
  return { inserted: insertAll(rows, inserts), updated: apply(rows, updates) }
}

describe('migración e3_help_mission_map', () => {
  it('la cadena de migraciones anteriores se lee entera', () => {
    const rows = seed()
    expect(rows.some(row => row.slug === 'tu-avatar-de-docente')).toBe(true)
    expect(rows.some(row => row.slug === 'el-orden-de-las-misiones')).toBe(true)
  })

  it('solo son INSERT y UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(inserts).toHaveLength(1)
    expect(updates).toHaveLength(1)
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

  it('la guía nueva, para el profesorado, con un slug libre y una ilustración que ya existe', () => {
    expect(inserts.map(({ category, slug, audience }) => [category, slug, audience])).toEqual([
      ['misiones', 'el-mapa-de-misiones', 'profesor'],
    ])
    const rows = seed()
    const covers = new Set(rows.map(row => row.cover))
    for (const guide of inserts) {
      expect(rows.some(row => row.slug === guide.slug)).toBe(false)
      expect(guide.summary.trim()).not.toBe('')
      expect(covers.has(guide.cover)).toBe(true)
    }
  })

  it('una guía que ya exista con ese slug se queda como está', () => {
    const rows = seed()
    const { sql: _sql, ...insert } = inserts[0]!
    const existing: Row = { ...insert, body: 'escrito a mano desde el panel' }
    rows.push(existing)
    expect(migrate(rows).inserted).toEqual([0])
    expect(rows.filter(row => row.slug === insert.slug)).toEqual([existing])
  })

  it('corrige los artículos previstos, cada uno protegido por su propio valor de serie', () => {
    expect(updates.map(update => `${update.category}/${update.slug}.${update.field}`)).toEqual([
      'clases/elegir-que-recursos-usa-tu-clase.body',
    ])
    const rows = seed()
    for (const update of updates) {
      const original = findRow(rows, update.category, update.slug)
      expect(original, `${update.category}/${update.slug}`).toBeDefined()
      expect(update.guards).toContainEqual([update.field, original[update.field]])
      expect(update.value).not.toBe(original[update.field])
    }
  })

  it('sobre la ayuda de serie sin editar, la guía entra y cada corrección toca una fila', () => {
    expect(migrate(seed())).toEqual({ inserted: [1], updated: [1] })
  })

  it('volver a pasarla no cambia nada', () => {
    const rows = seed()
    migrate(rows)
    const after = JSON.stringify(rows)
    expect(migrate(rows)).toEqual({ inserted: [0], updated: [0] })
    expect(JSON.stringify(rows)).toBe(after)
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
    const rows = seed()
    migrate(rows)
    const existing = new Set(rows.map(row => `${row.category}/${row.slug}`))
    for (const row of rows) {
      for (const [, target] of row.body.matchAll(/\]\(\/ayuda\/([a-z0-9-]+\/[a-z0-9-]+)\)/g)) {
        expect(existing.has(target), `${row.slug} → ${target}`).toBe(true)
      }
    }
  })

  it('la guía cuenta lo decidido: en pruebas, apagado, dónde se enciende, qué ve cada cual y lo que no hace', () => {
    const [guide] = inserts.map(i => i.body)
    expect(guide).toMatch(/\*\*Beta\*\*/)
    expect(guide).toMatch(/\*\*En pruebas\*\*, activa \*\*Mapa de misiones\*\*/)
    expect(guide).toMatch(/Va apagado de entrada/)
    expect(guide).toMatch(/acceso de administración/)
    expect(guide).toMatch(/Apagarlo no borra nada/)
    expect(guide).toMatch(/\*\*Mapa\*\*, junto a la cuadrícula y la lista/)
    expect(guide).toMatch(/En el mapa no hay filtros/)
    expect(guide).toMatch(/ve el mapa de entrada/)
    // Los estados con los mismos nombres que en la pantalla.
    expect(guide).toMatch(/disponible, urgente, expirada o cerrada por su docente/)
    expect(guide).not.toMatch(/caducada/)
    expect(guide).toMatch(/al pulsarla, dice por qué/)
    expect(guide).toMatch(/nunca solo con un color/)
    // El camino es lineal: no hay dependencias todavía.
    expect(guide).toMatch(/\*\*no abre ni cierra misiones\*\*/)
    expect(guide).toMatch(/En la ficha pública de una plantilla no sale/)
    expect(guide).toMatch(/quien la importa lo recibe apagado/)
    expect(guide).toMatch(/\[orden de la clase\]\(\/ayuda\/misiones\/el-orden-de-las-misiones\)/)

    const rows = seed()
    migrate(rows)
    expect(findRow(rows, 'clases', 'elegir-que-recursos-usa-tu-clase').body).toMatch(
      /\| \*\*Mapa de misiones\*\* \| En pruebas y apagado de entrada/
    )
  })

  it('lo nuevo usa un lenguaje que vale para todo el mundo', () => {
    for (const { title, summary, body } of [
      ...inserts,
      ...updates.map(u => ({ title: '', summary: '', body: u.value })),
    ]) {
      for (const text of [title, summary, body]) expect(prose(text)).not.toMatch(OLD_WORDS)
    }
  })
})
