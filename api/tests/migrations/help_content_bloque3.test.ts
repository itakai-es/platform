import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Red para la migración de la ayuda del bloque 3: importar una misión de otra
 * clase y el catálogo público de plantillas, que ahora enseña sus misiones y deja
 * importarlas. Los INSERT solo crean lo que no existe y caen al final de su
 * categoría; cada UPDATE solo toca un campo que siga con el texto de serie, así
 * que lo editado desde el panel se respeta. Sin base de datos: se leen los SQL y
 * se aplican sobre filas en memoria, con la misma semántica que el SQL.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const read = (name: string) => readFileSync(new URL(`${name}/migration.sql`, MIGRATIONS), 'utf8')
const content = read('20260915090000_help_default_content')
const guides = read('20260916090000_help_guides_block1')
const fixes = read('20260916180000_help_content_fixes')
const sharedClasses = read('20260918170000_help_student_accounts_and_shared_classes')
const unusedAccounts = read('20260919120000_help_unused_managed_accounts')
const migration = read('20261002120000_help_content_bloque3')

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
}

interface Insert extends Row {
  sql: string
}

/** Los artículos que crea un INSERT del contenido de serie, tal cual quedan en una instalación nueva. */
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

const GUARDS = String.raw`((?:\n  AND a\."\w+" = ${LITERAL})*)`

/** La forma de los UPDATE de esta migración y de las anteriores que la comparten. */
const STATEMENT = new RegExp(
  String.raw`UPDATE "help_articles" a\nSET "(\w+)" = ${LITERAL}, "updated_at" = CURRENT_TIMESTAMP\n` +
    String.raw`FROM "help_categories" c\n` +
    String.raw`WHERE c\."id" = a\."category_id" AND c\."slug" = ${LITERAL} AND a\."locale" = 'es'\n` +
    String.raw`  AND a\."slug" = ${LITERAL}` +
    GUARDS +
    ';',
  'g'
)

/** La de 20260919120000, que escribe el UPDATE en otro orden y sin el idioma. */
const COMPACT_STATEMENT = new RegExp(
  String.raw`UPDATE "help_articles" a SET "(\w+)" = ${LITERAL}, "updated_at" = CURRENT_TIMESTAMP\n` +
    String.raw`FROM "help_categories" c\n` +
    String.raw`WHERE a\."category_id" = c\."id" AND c\."slug" = ${LITERAL} AND a\."slug" = ${LITERAL}` +
    GUARDS +
    ';',
  'g'
)

function parseUpdates(sql: string, pattern = STATEMENT): Update[] {
  return [...sql.matchAll(pattern)].map(match => {
    const [statement, field, value, category, slug, guardText] = match
    const guards = [
      ...guardText.matchAll(new RegExp(String.raw`AND a\."(\w+)" = ${LITERAL}`, 'g')),
    ].map(([, name, guard]) => [name as Field, guard] as [Field, string])
    return { sql: statement, field: field as Field, value, category, slug, guards }
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

function parseInserts(sql: string): Insert[] {
  return [...sql.matchAll(INSERT)].map(
    ([statement, slug, title, summary, cover, body, audience, category]) => ({
      sql: statement,
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
}

const inserts = parseInserts(migration)
const updates = parseUpdates(migration)

/** Aplica UPDATE en orden, con la semántica de su WHERE; devuelve cuántas filas tocó cada uno. */
function apply(rows: Row[], list: Update[]) {
  return list.map(update => {
    const targets = rows.filter(
      row =>
        row.category === update.category &&
        row.locale === 'es' &&
        row.slug === update.slug &&
        update.guards.every(([field, value]) => row[field] === value)
    )
    for (const row of targets) row[update.field] = update.value
    return targets.length
  })
}

/** Aplica los INSERT: ON CONFLICT DO NOTHING por categoría, slug e idioma. Devuelve cuántos entraron. */
function insertAll(rows: Row[], list: Insert[]) {
  return list.map(({ sql: _sql, ...insert }) => {
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
  insertAll(rows, parseInserts(sharedClasses))
  apply(rows, parseUpdates(sharedClasses))
  apply(rows, parseUpdates(unusedAccounts, COMPACT_STATEMENT))
  return rows
}

/** La migración entera, en su orden: primero los artículos nuevos, después las correcciones. */
function migrate(rows: Row[]) {
  return { inserted: insertAll(rows, inserts), updated: apply(rows, updates) }
}

const find = (rows: Row[], category: string, slug: string) =>
  rows.find(row => row.category === category && row.slug === slug)!

describe('migración help_content_bloque3', () => {
  it('la cadena de migraciones anteriores se lee entera', () => {
    // Si alguna cambiara de forma, seed() dejaría de reflejar la instalación nueva sin avisar.
    expect(parseInserts(sharedClasses)).toHaveLength(12)
    expect(parseUpdates(sharedClasses).length).toBeGreaterThan(0)
    expect(parseUpdates(unusedAccounts, COMPACT_STATEMENT)).toHaveLength(
      unusedAccounts.match(/^UPDATE /gm)!.length
    )
  })

  it('solo son INSERT y UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(inserts).toHaveLength(2)
    expect(updates).toHaveLength(5)
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

  it('las guías nuevas caen en su categoría, para el profesorado y con un slug libre', () => {
    expect(inserts.map(({ category, slug, audience }) => [category, slug, audience])).toEqual([
      ['misiones', 'importar-una-mision-de-otra-clase', 'profesor'],
      ['clases', 'el-catalogo-publico-de-plantillas', 'profesor'],
    ])
    const rows = seed()
    for (const insert of inserts) {
      expect(
        rows.some(row => row.category === insert.category),
        insert.category
      ).toBe(true)
      expect(
        rows.some(row => row.slug === insert.slug),
        insert.slug
      ).toBe(false)
      expect(insert.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(insert.title.trim()).not.toBe('')
      expect(insert.summary.trim()).not.toBe('')
      expect(insert.body).toMatch(/^\*\*[^*]+\*\*/)
    }
  })

  it('las portadas son ilustraciones que la ayuda ya usa', () => {
    const covers = new Set(seed().map(row => row.cover))
    for (const insert of inserts) {
      expect(insert.cover).toMatch(/^\/app\/ayuda\/[a-z0-9-]+\.svg$/)
      expect(covers.has(insert.cover), insert.cover).toBe(true)
    }
  })

  it('una guía nueva que ya exista con ese slug se queda como está', () => {
    for (const [index, { sql: _sql, ...insert }] of inserts.entries()) {
      const rows = seed()
      const existing: Row = { ...insert, body: 'escrito a mano desde el panel' }
      rows.push(existing)
      const { inserted } = migrate(rows)
      expect(inserted[index]).toBe(0)
      expect(rows.filter(row => row.slug === insert.slug)).toEqual([existing])
    }
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

  it('sobre la ayuda de serie sin editar, cada guía nueva entra y cada corrección toca una fila', () => {
    const rows = seed()
    const { inserted, updated } = migrate(rows)
    expect(inserted).toEqual([1, 1])
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

  it('un campo editado desde el panel se queda como está, y el resto del artículo se corrige', () => {
    for (const update of updates) {
      const rows = seed()
      const row = find(rows, update.category, update.slug)
      row[update.field] = `${row[update.field]} (editado)`
      const edited = row[update.field]
      migrate(rows)
      expect(row[update.field], `${update.slug}.${update.field}`).toBe(edited)
    }
    // En «publicar» cambian dos campos: editar el resumen no frena la corrección del cuerpo.
    const rows = seed()
    const publish = find(rows, 'clases', 'publicar-tu-clase-como-plantilla')
    publish.summary = 'Resumen escrito desde el panel.'
    migrate(rows)
    expect(publish.summary).toBe('Resumen escrito desde el panel.')
    expect(publish.body).toBe(
      updates.find(u => u.slug === 'publicar-tu-clase-como-plantilla' && u.field === 'body')!.value
    )
  })

  it('corrige los artículos previstos', () => {
    expect(updates.map(update => `${update.category}/${update.slug}.${update.field}`)).toEqual([
      'clases/publicar-tu-clase-como-plantilla.summary',
      'clases/publicar-tu-clase-como-plantilla.body',
      'clases/crear-una-clase-desde-cero-o-desde-una-plantilla.body',
      'clases/el-historial-de-la-clase.body',
      'misiones/crear-una-mision.body',
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
      // Las misiones viajan con la plantilla si quien la importa quiere.
      /Las misiones no vienen en la importación/,
      /Las misiones y la guía de clase no se copian/,
      // El catálogo de plantillas ya no es solo del profesorado de la instancia.
      /todo lo publicado en tu instancia/,
      /Compartir tu trabajo con el resto del profesorado/,
      // El historial de la clase de origen no dice a qué clase fue la copia.
      /se llevó una copia y adónde/,
      // La casilla dice cuántas misiones trae: su texto no es este, literal.
      /\*\*Importar también sus misiones\*\*/,
    ]) {
      expect(text, String(phrase)).not.toMatch(phrase)
    }
  })

  it('la guía de importar dice qué botón sale al duplicar', () => {
    const guide = inserts.find(insert => insert.slug === 'importar-una-mision-de-otra-clase')!
    expect(guide.body).toMatch(/se duplicará\*\*, el botón pasa a ser \*\*Duplicar\*\*/)
  })
})
