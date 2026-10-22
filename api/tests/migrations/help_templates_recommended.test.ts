import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Red para la migración de la ayuda de las plantillas recomendadas y de usar
 * una plantilla sin tener cuenta todavía (bloque 3, E11 y E12). Solo corrige
 * dos artículos: cada UPDATE toca un campo que siga con el texto de serie, así
 * que lo editado desde el panel se respeta. Sin base de datos: se leen los SQL
 * y se aplican sobre filas en memoria, con la misma semántica que el SQL.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const read = (name: string) => readFileSync(new URL(`${name}/migration.sql`, MIGRATIONS), 'utf8')
const content = read('20260915090000_help_default_content')
const guides = read('20260916090000_help_guides_block1')
const fixes = read('20260916180000_help_content_fixes')
const sharedClasses = read('20260918170000_help_student_accounts_and_shared_classes')
const unusedAccounts = read('20260919120000_help_unused_managed_accounts')
const bloque3 = read('20261002120000_help_content_bloque3')
const inclusive = read('20261002130000_help_lenguaje_inclusivo')
const migration = read('20261008110000_help_templates_recommended')

const LITERAL = String.raw`\$itakai\$([\s\S]*?)\$itakai\$`
const FIELDS = ['slug', 'title', 'summary', 'body'] as const
type Field = (typeof FIELDS)[number]

interface Row extends Record<Field, string> {
  category: string
  locale: string
}

interface Update {
  sql: string
  field: Field
  value: string
  category: string
  slug: string
  guards: [Field, string][]
}

/** Los artículos que crea un INSERT del contenido de serie, tal cual quedan en una instalación nueva. */
function seedRows(sql: string): Row[] {
  return sql
    .split('INSERT INTO "help_articles"')
    .slice(1)
    .map(chunk => {
      const values = [...chunk.matchAll(new RegExp(LITERAL, 'g'))].map(([, value]) => value)
      const category = new RegExp(`WHERE c\\."slug" = ${LITERAL}`).exec(chunk)![1]
      const [slug, title, summary, , body] = values
      return { category, slug, title, summary, body, locale: 'es' }
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

function parseInserts(sql: string): Row[] {
  return [...sql.matchAll(INSERT)].map(([, slug, title, summary, , body, , category]) => ({
    category,
    slug,
    title,
    summary,
    body,
    locale: 'es',
  }))
}

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

/** Aplica los INSERT: ON CONFLICT DO NOTHING por categoría, slug e idioma. */
function insertAll(rows: Row[], list: Row[]) {
  for (const insert of list) {
    const taken = rows.some(
      row =>
        row.category === insert.category && row.slug === insert.slug && row.locale === insert.locale
    )
    if (!taken) rows.push({ ...insert })
  }
}

/** La ayuda de serie tal como queda justo antes de esta migración. */
function seed(): Row[] {
  const rows = [...seedRows(content), ...seedRows(guides)]
  // 20260916180000 también cambia un slug, con un NOT EXISTS que STATEMENT no lee y
  // que en una instalación nueva siempre se cumple: se quita para leer el UPDATE.
  apply(rows, parseUpdates(fixes.replace(/\n  AND NOT EXISTS \([\s\S]*?\n  \);/g, ';')))
  insertAll(rows, parseInserts(sharedClasses))
  apply(rows, parseUpdates(sharedClasses))
  apply(rows, parseUpdates(unusedAccounts, COMPACT_STATEMENT))
  insertAll(rows, parseInserts(bloque3))
  apply(rows, parseUpdates(bloque3))
  apply(rows, parseUpdates(inclusive))
  return rows
}

const updates = parseUpdates(migration)
const migrate = (rows: Row[]) => apply(rows, updates)

const find = (rows: Row[], category: string, slug: string) =>
  rows.find(row => row.category === category && row.slug === slug)!

describe('migración help_templates_recommended', () => {
  it('la cadena de migraciones anteriores se lee entera', () => {
    // Si alguna cambiara de forma, seed() dejaría de reflejar la instalación nueva sin avisar.
    expect(parseInserts(sharedClasses)).toHaveLength(12)
    expect(parseInserts(bloque3)).toHaveLength(2)
    expect(parseUpdates(bloque3)).toHaveLength(5)
    expect(parseUpdates(inclusive).length).toBeGreaterThan(0)
  })

  it('solo son UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(updates).toHaveLength(3)
    let rest = migration
    for (const statement of updates) rest = rest.replace(statement.sql, '')
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

  it('corrige los artículos previstos', () => {
    expect(updates.map(update => `${update.category}/${update.slug}.${update.field}`)).toEqual([
      'clases/el-catalogo-publico-de-plantillas.summary',
      'clases/el-catalogo-publico-de-plantillas.body',
      'clases/publicar-tu-clase-como-plantilla.body',
    ])
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

  it('sobre la ayuda de serie sin editar, cada corrección toca una fila', () => {
    expect(migrate(seed())).toEqual(updates.map(() => 1))
  })

  it('volver a pasarla no cambia nada', () => {
    const rows = seed()
    migrate(rows)
    const after = JSON.stringify(rows)
    expect(migrate(rows).every(count => count === 0)).toBe(true)
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
    // En el catálogo cambian dos campos: editar el resumen no frena la corrección del cuerpo.
    const rows = seed()
    const catalog = find(rows, 'clases', 'el-catalogo-publico-de-plantillas')
    catalog.summary = 'Resumen escrito desde el panel.'
    migrate(rows)
    expect(catalog.summary).toBe('Resumen escrito desde el panel.')
    expect(catalog.body).toBe(
      updates.find(u => u.slug === 'el-catalogo-publico-de-plantillas' && u.field === 'body')!.value
    )
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

  it('cuenta las recomendadas y cómo usar una plantilla sin cuenta, y ya no lo de antes', () => {
    const rows = seed()
    migrate(rows)
    const catalog = find(rows, 'clases', 'el-catalogo-publico-de-plantillas').body
    const publish = find(rows, 'clases', 'publicar-tu-clase-como-plantilla').body

    expect(catalog).toMatch(/## Las recomendadas/)
    expect(catalog).toMatch(/\*\*Sin haber entrado\*\*, pulsa \*\*Usar esta plantilla\*\*/)
    expect(catalog).toMatch(/no se importa nada hasta que pulses \*\*Importar\*\*/)
    expect(catalog).toMatch(/eliges el perfil \*\*Estudiante\*\*, la plataforma te avisa antes/)
    expect(publish).toMatch(/## Recomendada/)
    expect(publish).toMatch(/junto al interruptor tienes \*\*Copiar enlace\*\*/)
    expect(publish).toMatch(/pierde también la recomendación/)

    const text = rows.map(row => `${row.title}\n${row.summary}\n${row.body}`).join('\n')
    for (const phrase of [
      // Sin sesión ya no hay que volver a abrir el enlace después de entrar.
      /la ficha lo dice y ofrece \*\*Entrar\*\*/,
      /vuelve a abrir el enlace/,
    ]) {
      expect(text, String(phrase)).not.toMatch(phrase)
    }
  })
})
