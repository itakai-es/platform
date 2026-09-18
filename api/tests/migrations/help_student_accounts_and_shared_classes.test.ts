import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Red para la migración de la ayuda sobre las cuentas de alumnado sin correo y
 * las clases con varios profesores. Los INSERT solo crean lo que no existe y
 * caen al final de su categoría; cada UPDATE solo toca un campo que siga con el
 * texto de serie, así que lo editado desde el panel se respeta. Sin base de
 * datos: se leen los SQL y se aplican sobre filas en memoria, con la misma
 * semántica que el SQL.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const read = (name: string) => readFileSync(new URL(`${name}/migration.sql`, MIGRATIONS), 'utf8')
const content = read('20260915090000_help_default_content')
const guides = read('20260916090000_help_guides_block1')
const fixes = read('20260916180000_help_content_fixes')
const migration = read('20260918170000_help_student_accounts_and_shared_classes')

const LITERAL = String.raw`\$itakai\$([\s\S]*?)\$itakai\$`
const FIELDS = ['slug', 'title', 'summary', 'body'] as const
type Field = (typeof FIELDS)[number]

interface Row extends Record<Field, string> {
  category: string
  locale: string
  cover?: string
  audience?: string
}

interface Update {
  sql: string
  field: Field
  value: string
  category: string
  slug: string
  guards: [Field, string][]
  /** Slug que no puede existir ya en la categoría (solo al cambiar un slug). */
  freeSlug?: string
}

interface Insert extends Row {
  sql: string
}

/** Los artículos que crea un INSERT del contenido anterior, tal cual quedan en una instalación nueva. */
function seedRows(sql: string): Row[] {
  return sql
    .split('INSERT INTO "help_articles"')
    .slice(1)
    .map(chunk => {
      const values = [...chunk.matchAll(new RegExp(LITERAL, 'g'))].map(([, value]) => value)
      const category = new RegExp(`WHERE c\\."slug" = ${LITERAL}`).exec(chunk)![1]
      const [slug, title, summary, cover, body] = values
      return { category, slug, title, summary, cover, body, locale: 'es' }
    })
}

const STATEMENT = new RegExp(
  String.raw`UPDATE "help_articles" a\nSET "(\w+)" = ${LITERAL}, "updated_at" = CURRENT_TIMESTAMP\n` +
    String.raw`FROM "help_categories" c\n` +
    String.raw`WHERE c\."id" = a\."category_id" AND c\."slug" = ${LITERAL} AND a\."locale" = 'es'\n` +
    String.raw`  AND a\."slug" = ${LITERAL}` +
    String.raw`((?:\n  AND a\."\w+" = ${LITERAL})*)` +
    String.raw`(\n  AND NOT EXISTS \(\n    SELECT 1 FROM "help_articles" x\n` +
    String.raw`    WHERE x\."category_id" = a\."category_id" AND x\."locale" = a\."locale" AND x\."slug" = ${LITERAL}\n  \))?;`,
  'g'
)

function parseUpdates(sql: string): Update[] {
  return [...sql.matchAll(STATEMENT)].map(match => {
    const [statement, field, value, category, slug, guardText, , , freeSlug] = match
    const guards = [
      ...guardText.matchAll(new RegExp(String.raw`AND a\."(\w+)" = ${LITERAL}`, 'g')),
    ].map(([, name, guard]) => [name as Field, guard] as [Field, string])
    return { sql: statement, field: field as Field, value, category, slug, guards, freeSlug }
  })
}

const INSERT = new RegExp(
  String.raw`INSERT INTO "help_articles" \("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at"\)\n` +
    String.raw`SELECT gen_random_uuid\(\)::text, c\."id", ${LITERAL}, ${LITERAL}, ${LITERAL}, ${LITERAL}, ${LITERAL}, 'es', 'publicado'::"HelpArticleStatus", ` +
    String.raw`\(SELECT COALESCE\(MAX\(a\."order_index"\), -1\) \+ 1 FROM "help_articles" a WHERE a\."category_id" = c\."id"\), ` +
    String.raw`false, '(\w+)'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\n` +
    String.raw`FROM "help_categories" c WHERE c\."slug" = ${LITERAL}\n` +
    String.raw`ON CONFLICT \("category_id", "slug", "locale"\) DO NOTHING;`,
  'g'
)

const inserts: Insert[] = [...migration.matchAll(INSERT)].map(
  ([sql, slug, title, summary, cover, body, audience, category]) => ({
    sql,
    category,
    slug,
    title,
    summary,
    cover,
    body,
    audience,
    locale: 'es',
  })
)
const updates = parseUpdates(migration)

/** Aplica UPDATE en orden, con la semántica de su WHERE; devuelve cuántas filas tocó cada uno. */
function apply(rows: Row[], list: Update[]) {
  return list.map(update => {
    const targets = rows.filter(
      row =>
        row.category === update.category &&
        row.locale === 'es' &&
        row.slug === update.slug &&
        update.guards.every(([field, value]) => row[field] === value) &&
        !(
          update.freeSlug &&
          rows.some(
            other =>
              other.category === row.category &&
              other.locale === row.locale &&
              other.slug === update.freeSlug
          )
        )
    )
    for (const row of targets) row[update.field] = update.value
    return targets.length
  })
}

/** Aplica los INSERT: ON CONFLICT DO NOTHING por categoría, slug e idioma. Devuelve cuántos entraron. */
function insertAll(rows: Row[]) {
  return inserts.map(({ sql: _sql, ...insert }) => {
    const taken = rows.some(
      row =>
        row.category === insert.category && row.slug === insert.slug && row.locale === insert.locale
    )
    if (!taken) rows.push({ ...insert })
    return taken ? 0 : 1
  })
}

/** La ayuda de serie tal como queda justo antes de esta migración. */
function seed(): Row[] {
  const rows = [...seedRows(content), ...seedRows(guides)]
  apply(rows, parseUpdates(fixes))
  return rows
}

/** La migración entera, en su orden: primero los artículos nuevos, después las correcciones. */
function migrate(rows: Row[]) {
  return { inserted: insertAll(rows), updated: apply(rows, updates) }
}

const find = (rows: Row[], category: string, slug: string) =>
  rows.find(row => row.category === category && row.slug === slug)!

describe('migración help_student_accounts_and_shared_classes', () => {
  it('solo son INSERT y UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(inserts).toHaveLength(12)
    expect(updates.length).toBeGreaterThan(0)
    let rest = migration
    for (const statement of [...inserts, ...updates]) rest = rest.replace(statement.sql, '')
    expect(rest.replace(/^--.*$/gm, '').trim()).toBe('')
    for (const update of updates) {
      expect(update.guards.length, update.sql.slice(0, 120)).toBeGreaterThan(0)
      expect(FIELDS).toContain(update.field)
      expect(update.field).not.toBe('slug')
    }
  })

  it('nunca referencia ids, que cambian en cada instalación', () => {
    expect(migration).not.toMatch(/"id" = '/)
    expect(migration).not.toMatch(/"id" IN/)
    expect(migration).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-/)
  })

  it('los artículos nuevos caen en su categoría, con su audiencia y un slug libre', () => {
    const categories = new Set(
      content
        .split('INSERT INTO "help_categories"')
        .slice(1)
        .map(
          chunk => /VALUES \(gen_random_uuid\(\)::text, \$itakai\$(.*?)\$itakai\$/.exec(chunk)?.[1]
        )
    )
    expect(inserts.map(({ category, slug, audience }) => [category, slug, audience])).toEqual([
      ['alumnado', 'dar-de-alta-alumnos-sin-correo', 'profesor'],
      ['alumnado', 'importar-una-lista-de-alumnos', 'profesor'],
      ['alumnado', 'la-hoja-de-credenciales', 'profesor'],
      ['alumnado', 'restablecer-la-contrasena-de-un-alumno', 'profesor'],
      ['alumnado', 'cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase', 'profesor'],
      ['clases', 'compartir-una-clase-con-otros-profesores', 'profesor'],
      ['clases', 'niveles-y-perfiles-del-profesorado', 'profesor'],
      ['clases', 'traspasar-una-clase', 'profesor'],
      ['clases', 'el-historial-de-la-clase', 'profesor'],
      ['si-eres-alumno', 'entrar-con-usuario-y-contrasena', 'alumno'],
      ['si-eres-alumno', 'cambiar-la-contrasena-la-primera-vez', 'alumno'],
      ['si-eres-alumno', 'he-olvidado-mi-contrasena-y-no-tengo-correo', 'alumno'],
    ])
    const rows = seed()
    for (const insert of inserts) {
      expect(categories.has(insert.category), insert.category).toBe(true)
      expect(
        rows.some(row => row.slug === insert.slug),
        insert.slug
      ).toBe(false)
      expect(insert.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(insert.title.trim()).not.toBe('')
      expect(insert.summary.trim()).not.toBe('')
    }
  })

  it('las portadas son ilustraciones que la ayuda ya usa', () => {
    const covers = new Set(seed().map(row => row.cover))
    for (const insert of inserts) {
      expect(insert.cover).toMatch(/^\/app\/ayuda\/[a-z0-9-]+\.svg$/)
      expect(covers.has(insert.cover), insert.cover).toBe(true)
    }
  })

  it('un artículo nuevo que ya exista con ese slug se queda como está', () => {
    const rows = seed()
    const { sql: _sql, ...insert } = inserts[0]
    const existing: Row = { ...insert, body: 'escrito a mano desde el panel' }
    rows.push(existing)
    const { inserted } = migrate(rows)
    expect(inserted[0]).toBe(0)
    expect(rows.filter(row => row.slug === inserts[0].slug)).toEqual([existing])
  })

  it('cada campo que cambia va protegido por su propio valor de serie', () => {
    const rows = seed()
    for (const update of updates) {
      const original = find(rows, update.category, update.slug)
      expect(original, `${update.category}/${update.slug}`).toBeDefined()
      expect(update.guards, `${update.slug}.${update.field}`).toContainEqual([
        update.field,
        original[update.field],
      ])
      expect(update.value, `${update.slug}.${update.field}`).not.toBe(original[update.field])
    }
  })

  it('sobre la ayuda de serie sin editar, cada artículo nuevo entra y cada corrección toca una fila', () => {
    const rows = seed()
    const { inserted, updated } = migrate(rows)
    expect(inserted).toEqual(inserts.map(() => 1))
    expect(updated).toEqual(updates.map(() => 1))
  })

  it('volver a pasarla no cambia nada', () => {
    const rows = seed()
    migrate(rows)
    const after = JSON.stringify(rows)
    const again = migrate(rows)
    expect(again.inserted.every(count => count === 0)).toBe(true)
    expect(again.updated.every(count => count === 0)).toBe(true)
    expect(JSON.stringify(rows)).toBe(after)
  })

  it('un campo editado desde el panel se queda como está', () => {
    for (const update of updates) {
      const rows = seed()
      const row = find(rows, update.category, update.slug)
      row[update.field] = `${row[update.field]} (editado)`
      const edited = row[update.field]
      migrate(rows)
      expect(row[update.field], `${update.slug}.${update.field}`).toBe(edited)
    }
  })

  it('corrige los artículos previstos', () => {
    expect([...new Set(updates.map(update => update.slug))].sort()).toEqual([
      'avatares-y-alias-por-clase',
      'avisos-y-recordatorios',
      'como-entro-en-mi-clase',
      'comportamientos-y-puntos-de-vida',
      'crear-una-clase-desde-cero-o-desde-una-plantilla',
      'duplicar-una-clase-para-el-curso-siguiente',
      'elegir-que-recursos-usa-tu-clase',
      'he-borrado-algo-sin-querer',
      'insignias',
      'invitar-alumnos-a-una-clase',
      'la-vista-del-alumno',
      'las-recompensas-no-cuadran',
      'mi-alumno-no-aparece-en-la-clase',
      'mi-avatar-y-mi-nombre-en-clase',
      'no-puedo-entrar-en-mi-cuenta',
      'publicar-tu-clase-como-plantilla',
      'que-es-itakai',
      'revisar-entregas',
      'seguridad-de-tu-cuenta',
      'un-alumno-no-ve-la-clase',
    ])
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

  it('después de aplicarla, la ayuda de serie ya no dice lo que ha dejado de ser verdad', () => {
    const rows = seed()
    migrate(rows)
    const text = rows.map(row => `${row.title}\n${row.summary}\n${row.body}`).join('\n')
    for (const phrase of [
      // El código ya no es la única forma de entrar en una clase.
      /El código es el único camino/,
      /ni añadirlo a mano/,
      // Con administración en la clase, el alias se cambia desde la lista.
      /Desde tu lado no se pueden editar/,
      // No hay pestaña de insignias en la clase: están en el menú.
      /pestaña de insignias de la clase/,
      // Ni duplicar ni importar copian la guía de clase.
      /\*\*La narrativa\*\* y la guía de clase/,
      /la narrativa, la guía, los recursos activos/,
      // Duplicar está en los ajustes de la clase, no en un menú.
      /desde el menú de la clase, \*Duplicar\*/,
      // El aviso de cambio de contraseña solo llega a quien tiene correo.
      /Al guardarla, la plataforma te manda un correo/,
      /usuarios, centros,/,
    ]) {
      expect(text, String(phrase)).not.toMatch(phrase)
    }
  })
})
