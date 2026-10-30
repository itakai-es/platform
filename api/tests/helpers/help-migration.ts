import { readFileSync } from 'fs'

/**
 * Lo que comparten las pruebas de las migraciones de ayuda de E3: leer los SQL
 * del contenido de serie y aplicarlos sobre filas en memoria, con la misma
 * semántica que el SQL (el INSERT solo entra si no hay otro artículo con esa
 * categoría, slug e idioma; cada UPDATE solo toca la fila que siga con el valor
 * de su guarda). Es la misma lectura que hacen, cada una por su cuenta, las
 * pruebas de d1, d2, e1 y e4.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
export const readMigration = (name: string) =>
  readFileSync(new URL(`${name}/migration.sql`, MIGRATIONS), 'utf8')

export const LITERAL = String.raw`\$itakai\$([\s\S]*?)\$itakai\$`
const FIELDS = ['slug', 'title', 'summary', 'body'] as const
export type Field = (typeof FIELDS)[number]

export interface Row extends Record<Field, string> {
  category: string
  locale: string
  cover?: string
  audience?: string
}

export interface Update {
  sql: string
  field: Field
  value: string
  category: string
  slug: string
  guards: [Field, string][]
}

export interface Insert extends Row {
  sql: string
}

/** Los artículos que crea un INSERT del contenido de serie, tal cual quedan en una instalación nueva. */
export function seedRows(sql: string): Row[] {
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
export const COMPACT_STATEMENT = new RegExp(
  String.raw`UPDATE "help_articles" a SET "(\w+)" = ${LITERAL}, "updated_at" = CURRENT_TIMESTAMP\n` +
    String.raw`FROM "help_categories" c\n` +
    String.raw`WHERE a\."category_id" = c\."id" AND c\."slug" = ${LITERAL} AND a\."slug" = ${LITERAL}` +
    GUARDS +
    ';',
  'g'
)

export function parseUpdates(sql: string, pattern = STATEMENT): Update[] {
  return [...sql.matchAll(pattern)].map(match => {
    const [statement, field, value, category, slug, guardText] = match
    const guards = [
      ...guardText.matchAll(new RegExp(String.raw`AND a\."(\w+)" = ${LITERAL}`, 'g')),
    ].map(([, name, guard]) => [name as Field, guard] as [Field, string])
    return {
      sql: statement,
      field: field as Field,
      value,
      category,
      slug,
      guards,
    }
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

export function parseInserts(sql: string): Insert[] {
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


/** Aplica UPDATE en orden, con la semántica de su WHERE; devuelve cuántas filas tocó cada uno. */
export function apply(rows: Row[], list: Update[]) {
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
export function insertAll(rows: Row[], list: Insert[]) {
  return list.map(({ sql: _sql, ...insert }) => {
    const taken = rows.some(
      row =>
        row.category === insert.category && row.slug === insert.slug && row.locale === insert.locale
    )
    if (!taken) rows.push({ ...insert })
    return taken ? 0 : 1
  })
}


/** Lo que no es prosa: nombres de botones, pestañas y mensajes citados en negrita, y destinos de enlaces. */
export const prose = (text: string) => text.replace(/\]\([^)]*\)/g, ']').replace(/\*\*[^*]+\*\*/g, '')

export const OLD_WORDS =
  /\b(profesor(a|es|as)?|alumn(o|a|os|as)|administrador(a|es|as)?|propietario|bienvenid[oa]s?|inscrit[oa]s?)\b/i

/** Las migraciones de ayuda de serie, en su orden, hasta la de E4 incluida. */
const CHAIN_E4 = [
  '20261009109000_d1_help_attendance',
  '20261009209000_d2_help_teams',
  '20261009309000_e2_help_roulette',
  '20261024109000_e1_help_hints',
  '20261024209000_e4_help_avatars',
]

/**
 * La ayuda de serie tal como queda en una instalación nueva después de las
 * migraciones `CHAIN_E4` y de las de `then`, en ese orden.
 */
export function seedThrough(then: string[] = []): Row[] {
  const rows = [
    ...seedRows(readMigration('20260915090000_help_default_content')),
    ...seedRows(readMigration('20260916090000_help_guides_block1')),
  ]
  // 20260916180000 también cambia un slug, con un NOT EXISTS que STATEMENT no lee y
  // que en una instalación nueva siempre se cumple: se quita para leer el UPDATE.
  apply(
    rows,
    parseUpdates(
      readMigration('20260916180000_help_content_fixes').replace(
        /\n  AND NOT EXISTS \([\s\S]*?\n  \);/g,
        ';'
      )
    )
  )
  const shared = readMigration('20260918170000_help_student_accounts_and_shared_classes')
  insertAll(rows, parseInserts(shared))
  apply(rows, parseUpdates(shared))
  apply(
    rows,
    parseUpdates(readMigration('20260919120000_help_unused_managed_accounts'), COMPACT_STATEMENT)
  )
  for (const name of [
    '20261002120000_help_content_bloque3',
    '20261002130000_help_lenguaje_inclusivo',
    '20261008110000_help_templates_recommended',
    '20261008130000_help_trash',
    ...CHAIN_E4,
    ...then,
  ]) {
    const sql = readMigration(name)
    insertAll(rows, parseInserts(sql))
    apply(rows, parseUpdates(sql))
  }
  return rows
}

export const findRow = (rows: Row[], category: string, slug: string) =>
  rows.find(row => row.category === category && row.slug === slug)!
