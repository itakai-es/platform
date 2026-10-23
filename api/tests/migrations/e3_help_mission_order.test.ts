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
 * Red para la migración de la ayuda de E3, entrega 1: la guía «El orden de las
 * misiones» (profesorado) y los retoques de importar una misión y duplicar la
 * clase. El INSERT solo crea lo que no existe y cae al final de su categoría;
 * cada UPDATE solo toca un campo que siga con el texto de serie, así que lo
 * editado desde el panel se respeta. Sin base de datos: se leen los SQL y se
 * aplican sobre filas en memoria, con la misma semántica que el SQL.
 */

const NAME = '20261024309000_e3_help_mission_order'
const migration = readMigration(NAME)
const inserts = parseInserts(migration)
const updates = parseUpdates(migration)

/** La ayuda de serie tal como queda justo antes de esta migración. */
const seed = () => seedThrough()

function migrate(rows: Row[]) {
  return { inserted: insertAll(rows, inserts), updated: apply(rows, updates) }
}

describe('migración e3_help_mission_order', () => {
  it('la cadena de migraciones anteriores se lee entera', () => {
    const rows = seed()
    expect(rows.some(row => row.slug === 'pistas-en-las-misiones')).toBe(true)
    expect(rows.some(row => row.slug === 'tu-avatar-de-docente')).toBe(true)
  })

  it('solo son INSERT y UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(inserts).toHaveLength(1)
    expect(updates).toHaveLength(2)
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
      ['misiones', 'el-orden-de-las-misiones', 'profesor'],
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
      'misiones/importar-una-mision-de-otra-clase.body',
      'clases/duplicar-una-clase-para-el-curso-siguiente.body',
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
    expect(migrate(seed())).toEqual({ inserted: [1], updated: [1, 1] })
  })

  it('volver a pasarla no cambia nada', () => {
    const rows = seed()
    migrate(rows)
    const after = JSON.stringify(rows)
    expect(migrate(rows)).toEqual({ inserted: [0], updated: [0, 0] })
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

  it('la guía cuenta lo decidido: dónde se ordena, que se guarda al momento y dónde llega cada misión', () => {
    const [guide] = inserts.map(i => i.body)
    expect(guide).toMatch(/\*\*Ordenar\*\*/)
    expect(guide).toMatch(/\*\*Orden de la clase\*\*/)
    expect(guide).toMatch(/flechas arriba y abajo/)
    expect(guide).toMatch(/se guarda al momento/)
    expect(guide).toMatch(/\*\*edición\*\*/)
    expect(guide).toMatch(/Una misión \*\*nueva\*\* va al final/)
    expect(guide).toMatch(/\*\*en el mismo orden\*\*/)
    // El orden no es un camino: no abre ni cierra nada.
    expect(guide).toMatch(/no abre ni cierra nada/)

    const rows = seed()
    migrate(rows)
    expect(findRow(rows, 'misiones', 'importar-una-mision-de-otra-clase').body).toMatch(
      /\*\*al final\*\* del \[orden de la clase\]/
    )
    expect(findRow(rows, 'clases', 'duplicar-una-clase-para-el-curso-siguiente').body).toMatch(
      /en el mismo \[orden\]/
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
