import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Red para la migración de la ayuda de E1: las guías «Pistas en las misiones»
 * (profesorado) y «Usar las pistas de una misión» (alumnado), y los retoques de
 * las que hablan de recompensas, entregas, la tienda y el XP. El INSERT solo
 * crea lo que no existe y cae al final de su categoría; cada UPDATE solo toca un
 * campo que siga con el texto de serie, así que lo editado desde el panel se
 * respeta. Sin base de datos: se leen los SQL y se aplican sobre filas en
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
const inclusive = read('20261002130000_help_lenguaje_inclusivo')
const recommended = read('20261008110000_help_templates_recommended')
const trash = read('20261008130000_help_trash')
const d1 = read('20261009109000_d1_help_attendance')
const d2 = read('20261009209000_d2_help_teams')
const e2 = read('20261009309000_e2_help_roulette')
const migration = read('20261024109000_e1_help_hints')

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
  // 20260916180000 también cambia un slug, con un NOT EXISTS que STATEMENT no lee y
  // que en una instalación nueva siempre se cumple: se quita para leer el UPDATE.
  apply(rows, parseUpdates(fixes.replace(/\n  AND NOT EXISTS \([\s\S]*?\n  \);/g, ';')))
  insertAll(rows, parseInserts(sharedClasses))
  apply(rows, parseUpdates(sharedClasses))
  apply(rows, parseUpdates(unusedAccounts, COMPACT_STATEMENT))
  insertAll(rows, parseInserts(bloque3))
  apply(rows, parseUpdates(bloque3))
  apply(rows, parseUpdates(inclusive))
  insertAll(rows, parseInserts(recommended))
  apply(rows, parseUpdates(recommended))
  insertAll(rows, parseInserts(trash))
  apply(rows, parseUpdates(trash))
  insertAll(rows, parseInserts(d1))
  apply(rows, parseUpdates(d1))
  insertAll(rows, parseInserts(d2))
  apply(rows, parseUpdates(d2))
  insertAll(rows, parseInserts(e2))
  apply(rows, parseUpdates(e2))
  return rows
}

/** La migración entera, en su orden: primero las guías nuevas, después las correcciones. */
function migrate(rows: Row[]) {
  return { inserted: insertAll(rows, inserts), updated: apply(rows, updates) }
}

const find = (rows: Row[], category: string, slug: string) =>
  rows.find(row => row.category === category && row.slug === slug)!

/** Lo que no es prosa: nombres de botones, pestañas y mensajes citados en negrita, y destinos de enlaces. */
const prose = (text: string) => text.replace(/\]\([^)]*\)/g, ']').replace(/\*\*[^*]+\*\*/g, '')

const OLD_WORDS =
  /\b(profesor(a|es|as)?|alumn(o|a|os|as)|administrador(a|es|as)?|propietario|bienvenid[oa]s?|inscrit[oa]s?)\b/i

describe('migración e1_help_hints', () => {
  it('la cadena de migraciones anteriores se lee entera', () => {
    // Si alguna cambiara de forma, seed() dejaría de reflejar la instalación nueva sin avisar.
    expect(parseInserts(e2)).toHaveLength(1)
    expect(parseUpdates(e2)).toHaveLength(3)
    const rows = seed()
    expect(rows.some(row => row.slug === 'usar-la-ruleta-en-clase')).toBe(true)
  })

  it('solo son INSERT y UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(inserts).toHaveLength(2)
    expect(updates).toHaveLength(6)
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

  it('las dos guías nuevas, con su público, un slug libre y una ilustración que ya existe', () => {
    expect(inserts.map(({ category, slug, audience }) => [category, slug, audience])).toEqual([
      ['misiones', 'pistas-en-las-misiones', 'profesor'],
      ['si-eres-alumno', 'usar-las-pistas-de-una-mision', 'alumno'],
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
    for (const [index, guide] of inserts.entries()) {
      const rows = seed()
      const { sql: _sql, ...insert } = guide
      const existing: Row = { ...insert, body: 'escrito a mano desde el panel' }
      rows.push(existing)
      const { inserted } = migrate(rows)
      expect(inserted[index]).toBe(0)
      expect(rows.filter(row => row.slug === insert.slug)).toEqual([existing])
    }
  })

  it('corrige los artículos previstos, cada uno protegido por su propio valor de serie', () => {
    expect(updates.map(update => `${update.category}/${update.slug}.${update.field}`)).toEqual([
      'misiones/recompensas-xp-monedas-y-mana.body',
      'misiones/revisar-entregas.body',
      'gamificacion/monedas-y-tienda-de-clase.body',
      'si-eres-alumno/que-son-el-xp-las-monedas-y-el-mana.body',
      'si-eres-alumno/como-entrego-una-mision.body',
      'cuando-algo-falla/las-recompensas-no-cuadran.body',
    ])
    const rows = seed()
    for (const update of updates) {
      const original = find(rows, update.category, update.slug)
      expect(original, `${update.category}/${update.slug}`).toBeDefined()
      expect(update.guards).toContainEqual([update.field, original[update.field]])
      expect(update.value).not.toBe(original[update.field])
      // Solo añade o corrige: lo que no tiene que ver con las pistas sigue ahí.
      expect(update.value.length).toBeGreaterThan(original[update.field].length)
    }
  })

  it('sobre la ayuda de serie sin editar, las guías entran y cada corrección toca una fila', () => {
    const rows = seed()
    expect(migrate(rows)).toEqual({ inserted: [1, 1], updated: [1, 1, 1, 1, 1, 1] })
  })

  it('volver a pasarla no cambia nada', () => {
    const rows = seed()
    migrate(rows)
    const after = JSON.stringify(rows)
    expect(migrate(rows)).toEqual({ inserted: [0, 0], updated: [0, 0, 0, 0, 0, 0] })
    expect(JSON.stringify(rows)).toBe(after)
  })

  it('un artículo editado desde el panel se queda como está', () => {
    for (const update of updates) {
      const rows = seed()
      const row = find(rows, update.category, update.slug)
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

  it('después de aplicarla, cada artículo retocado enlaza una de las guías de pistas', () => {
    const rows = seed()
    migrate(rows)
    for (const update of updates) {
      expect(find(rows, update.category, update.slug).body).toMatch(
        /\(\/ayuda\/(misiones\/pistas-en-las-misiones|si-eres-alumno\/usar-las-pistas-de-una-mision)\)/
      )
    }
  })

  it('las guías cuentan lo que se decidió: en orden, % sobre lo que queda, gratis sin el recurso y sin borrar una usada', () => {
    const [teacher, student] = inserts.map(i => i.body)
    expect(teacher).toMatch(/\*\*solo se puede usar la siguiente\*\*/)
    expect(teacher).toMatch(/lo que la misión aún tiene que pagar a esa persona/)
    expect(teacher).toMatch(/un enigma aprobado al 80 % con un −20 % de pistas paga el 64 %/)
    expect(teacher).toMatch(/\*\*salen gratis\*\*/)
    expect(teacher).toMatch(/\*\*Una pista que alguien ha usado no se puede borrar\*\*/)
    expect(teacher).toMatch(/cada estudiante usa y paga las suyas/)
    // Al crear una pista el botón es otro: la guía nombra los dos.
    expect(teacher).toMatch(/Junto a \*\*Guardar\*\* \(o \*\*Añadir la pista\*\*, si es nueva\)/)
    expect(student).toMatch(/\*\*su texto solo aparece cuando la usas\*\*/)
    expect(student).toMatch(/\*\*en orden\*\*/)
    expect(student).toMatch(/Junto al botón \*\*Usar la pista\*\* ves lo que cuesta y lo que tienes/)
    expect(student).toMatch(/Lo que ya has cobrado no cambia/)
  })

  it('el XP ya no se cuenta como algo que no baja nunca', () => {
    const rows = seed()
    const before = find(rows, 'si-eres-alumno', 'que-son-el-xp-las-monedas-y-el-mana').body
    expect(before).toMatch(/no baja nunca/)
    migrate(rows)
    const after = find(rows, 'si-eres-alumno', 'que-son-el-xp-las-monedas-y-el-mana').body
    expect(after).not.toMatch(/no baja nunca/)
    expect(after).toMatch(/se paga con XP/)
  })

  it('el artículo de recompensas no se contradice: el XP no se gasta en la tienda, y el total depende de quién lo mire', () => {
    const rows = seed()
    migrate(rows)
    const body = find(rows, 'misiones', 'recompensas-xp-monedas-y-mana').body
    // Con pistas de XP, «no se gasta» a secas ya no es verdad.
    expect(body).not.toMatch(/no se gasta[,.]/)
    expect(body).toMatch(/el XP sube de nivel y no se gasta en la tienda/)
    expect(body).not.toMatch(/El total que se enseña es el de la misión sin pistas/)
    expect(body).toMatch(/quien ha usado pistas de % ve el bonus ya descontado/)
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
