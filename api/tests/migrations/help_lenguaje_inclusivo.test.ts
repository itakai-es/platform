import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Red para la migración que pasa la ayuda de serie a un lenguaje que vale para
 * los dos géneros: docente, estudiante, alumnado, profesorado… Cada UPDATE solo
 * toca un campo que siga con el texto de serie, así que lo editado desde el panel
 * se respeta. Sin base de datos: se leen los SQL y se aplican sobre filas en
 * memoria, con la misma semántica que el SQL.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const read = (name: string) => readFileSync(new URL(`${name}/migration.sql`, MIGRATIONS), 'utf8')
const content = read('20260915090000_help_default_content')
const guides = read('20260916090000_help_guides_block1')
const fixes = read('20260916180000_help_content_fixes')
const sharedClasses = read('20260918170000_help_student_accounts_and_shared_classes')
const unusedAccounts = read('20260919120000_help_unused_managed_accounts')
const bloque3 = read('20261002120000_help_content_bloque3')
const migration = read('20261002130000_help_lenguaje_inclusivo')

const LITERAL = String.raw`\$itakai\$([\s\S]*?)\$itakai\$`
const FIELDS = ['slug', 'title', 'summary', 'body'] as const
type Field = (typeof FIELDS)[number]
const CATEGORY_FIELDS = ['name', 'description'] as const
type CategoryField = (typeof CATEGORY_FIELDS)[number]

interface Row extends Record<Field, string> {
  category: string
  locale: string
}

interface Category extends Record<CategoryField, string> {
  slug: string
}

interface Update {
  sql: string
  field: Field
  value: string
  category: string
  slug: string
  guards: [Field, string][]
}

interface CategoryUpdate {
  sql: string
  field: CategoryField
  value: string
  slug: string
  guard: string
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

/** Las categorías de serie: slug, nombre y descripción, en ese orden. */
function seedCategories(sql: string): Category[] {
  return sql
    .split('INSERT INTO "help_categories"')
    .slice(1)
    .map(chunk => {
      const [slug, name, description] = [...chunk.matchAll(new RegExp(LITERAL, 'g'))].map(
        ([, value]) => value
      )
      return { slug, name, description }
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
const COMPACT_STATEMENT = new RegExp(
  String.raw`UPDATE "help_articles" a SET "(\w+)" = ${LITERAL}, "updated_at" = CURRENT_TIMESTAMP\n` +
    String.raw`FROM "help_categories" c\n` +
    String.raw`WHERE a\."category_id" = c\."id" AND c\."slug" = ${LITERAL} AND a\."slug" = ${LITERAL}` +
    GUARDS +
    ';',
  'g'
)

const CATEGORY_STATEMENT = new RegExp(
  String.raw`UPDATE "help_categories"\nSET "(\w+)" = ${LITERAL}, "updated_at" = CURRENT_TIMESTAMP\n` +
    String.raw`WHERE "slug" = ${LITERAL}\n` +
    String.raw`  AND "(\w+)" = ${LITERAL};`,
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

function parseCategoryUpdates(sql: string): CategoryUpdate[] {
  return [...sql.matchAll(CATEGORY_STATEMENT)].map(
    ([statement, field, value, slug, guardField, guard]) => {
      // El guarda va siempre sobre el mismo campo que se cambia.
      expect(guardField).toBe(field)
      return { sql: statement, field: field as CategoryField, value, slug, guard }
    }
  )
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

const updates = parseUpdates(migration)
const categoryUpdates = parseCategoryUpdates(migration)

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

function applyCategories(categories: Category[], list: CategoryUpdate[]) {
  return list.map(update => {
    const targets = categories.filter(
      category => category.slug === update.slug && category[update.field] === update.guard
    )
    for (const category of targets) category[update.field] = update.value
    return targets.length
  })
}

/** ON CONFLICT DO NOTHING por categoría, slug e idioma. */
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
function seed(): { rows: Row[]; categories: Category[] } {
  const rows = [...seedRows(content), ...seedRows(guides)]
  // 20260916180000 también cambia un slug, con un NOT EXISTS que STATEMENT no lee y
  // que en una instalación nueva siempre se cumple: se quita para leer el UPDATE.
  apply(rows, parseUpdates(fixes.replace(/\n  AND NOT EXISTS \([\s\S]*?\n  \);/g, ';')))
  insertAll(rows, parseInserts(sharedClasses))
  apply(rows, parseUpdates(sharedClasses))
  apply(rows, parseUpdates(unusedAccounts, COMPACT_STATEMENT))
  insertAll(rows, parseInserts(bloque3))
  apply(rows, parseUpdates(bloque3))
  return { rows, categories: seedCategories(content) }
}

function migrate(state: { rows: Row[]; categories: Category[] }) {
  return {
    updated: apply(state.rows, updates),
    categories: applyCategories(state.categories, categoryUpdates),
  }
}

const find = (rows: Row[], category: string, slug: string) =>
  rows.find(row => row.category === category && row.slug === slug)!

/** Lo que no es prosa: nombres de botones, pestañas y mensajes citados en negrita, y destinos de enlaces. */
const prose = (text: string) => text.replace(/\]\([^)]*\)/g, ']').replace(/\*\*[^*]+\*\*/g, '')

const OLD_WORDS =
  /\b(profesor(a|es|as)?|alumn(o|a|os|as)|administrador(a|es|as)?|propietario|bienvenid[oa]s?|inscrit[oa]s?)\b/i

describe('migración help_lenguaje_inclusivo', () => {
  it('la cadena de migraciones anteriores se lee entera', () => {
    expect(seedCategories(content)).toHaveLength(9)
    expect(parseInserts(bloque3)).toHaveLength(2)
    expect(parseUpdates(bloque3)).toHaveLength(5)
    expect(seed().rows).toHaveLength(56)
  })

  it('solo son UPDATE de categorías y artículos con la forma esperada, y nada más', () => {
    expect(updates.length).toBeGreaterThan(0)
    expect(categoryUpdates).toHaveLength(3)
    let rest = migration
    for (const statement of [...updates, ...categoryUpdates]) rest = rest.replace(statement.sql, '')
    expect(rest.replace(/^--.*$/gm, '').trim()).toBe('')
    for (const update of updates) {
      expect(FIELDS).toContain(update.field)
      expect(update.field).not.toBe('slug')
      expect(update.guards).toEqual([[update.field, expect.any(String)]])
    }
    for (const update of categoryUpdates) expect(CATEGORY_FIELDS).toContain(update.field)
  })

  it('nunca referencia ids, que cambian en cada instalación', () => {
    expect(migration).not.toMatch(/"id" = '/)
    expect(migration).not.toMatch(/"id" IN/)
    expect(migration).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-/)
  })

  it('cada campo que cambia va protegido por su propio valor de serie, y cambia de verdad', () => {
    const { rows, categories } = seed()
    for (const update of updates) {
      const original = find(rows, update.category, update.slug)
      expect(original, `${update.category}/${update.slug}`).toBeDefined()
      expect(update.guards).toContainEqual([update.field, original[update.field]])
      expect(update.value, `${update.slug}.${update.field}`).not.toBe(original[update.field])
    }
    for (const update of categoryUpdates) {
      const original = categories.find(category => category.slug === update.slug)!
      expect(update.guard).toBe(original[update.field])
      expect(update.value).not.toBe(original[update.field])
    }
  })

  it('un campo no se toca dos veces', () => {
    const keys = updates.map(update => `${update.category}/${update.slug}.${update.field}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('sobre la ayuda de serie sin editar, cada UPDATE toca una fila', () => {
    const state = seed()
    const { updated, categories } = migrate(state)
    expect(updated).toEqual(updates.map(() => 1))
    expect(categories).toEqual([1, 1, 1])
  })

  it('volver a pasarla no cambia nada', () => {
    const state = seed()
    migrate(state)
    const after = JSON.stringify(state)
    const again = migrate(state)
    expect(again.updated.every(count => count === 0)).toBe(true)
    expect(again.categories.every(count => count === 0)).toBe(true)
    expect(JSON.stringify(state)).toBe(after)
  })

  it('un campo editado desde el panel se queda como está', () => {
    for (const update of updates) {
      const state = seed()
      const row = find(state.rows, update.category, update.slug)
      row[update.field] = `${row[update.field]} (editado)`
      const edited = row[update.field]
      migrate(state)
      expect(row[update.field], `${update.slug}.${update.field}`).toBe(edited)
    }
    const state = seed()
    const students = state.categories.find(category => category.slug === 'si-eres-alumno')!
    students.name = 'Para el alumnado'
    migrate(state)
    expect(students.name).toBe('Para el alumnado')
    expect(students.description).toBe('Lo que necesitas saber tú, no tu docente.')
  })

  it('no cambia slugs, enlaces ni imágenes', () => {
    const before = seed().rows
    const state = seed()
    migrate(state)
    const targets = (body: string) => [...body.matchAll(/\]\(([^)]*)\)/g)].map(([, target]) => target)
    for (const [index, row] of state.rows.entries()) {
      expect(row.slug).toBe(before[index].slug)
      expect(targets(row.body), row.slug).toEqual(targets(before[index].body))
    }
    expect(state.categories.map(category => category.slug)).toEqual(
      seed().categories.map(category => category.slug)
    )
  })

  it('después de aplicarla, la prosa de la ayuda de serie ya no usa los masculinos genéricos', () => {
    const state = seed()
    migrate(state)
    for (const row of state.rows) {
      for (const field of ['title', 'summary', 'body'] as const) {
        expect(prose(row[field] ?? ''), `${row.category}/${row.slug}.${field}`).not.toMatch(OLD_WORDS)
      }
    }
    for (const category of state.categories) {
      expect(`${category.name}\n${category.description}`, category.slug).not.toMatch(OLD_WORDS)
    }
  })

  it('tampoco quedan en los botones, pestañas y mensajes citados, que van como salen en pantalla', () => {
    const state = seed()
    migrate(state)
    const quoted = new Set<string>()
    for (const row of state.rows) {
      for (const [label] of row.body.matchAll(/\*\*[^*]+\*\*/g)) {
        if (OLD_WORDS.test(label)) quoted.add(label)
      }
    }
    expect([...quoted]).toEqual([])
    const text = state.rows.map(row => row.body).join('\n')
    for (const label of [
      '**Alumnado**',
      '**Invitar al alumnado**',
      '**Añadir docente**',
      '**Añadir otra fila**',
      '**Lista de estudiantes**',
      '**Volver a Alumnado**',
      '**Docente**',
      '**Ver como estudiante**',
      '**«Esta clase está archivada y no admite más estudiantes»**',
    ]) {
      expect(text, label).toContain(label)
    }
  })

  it('el perfil de sustitución se llama como en la interfaz', () => {
    const state = seed()
    migrate(state)
    const levels = find(state.rows, 'clases', 'niveles-y-perfiles-del-profesorado')
    expect(levels.body).toContain('| **Sustitución** | Edición |')
    expect(levels.body).not.toMatch(/sustituto/i)
  })
})
