import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Red para la migración que añade dos guías al contenido de serie. Tiene que
 * poder correr sobre una instalación con el contenido ya editado sin pisar
 * nada, caer en categorías que existen de verdad y no depender de ids. Sin base
 * de datos: solo lee los ficheros SQL.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const content = readFileSync(new URL('20260915090000_help_default_content/migration.sql', MIGRATIONS), 'utf8')
const guides = readFileSync(new URL('20260916090000_help_guides_block1/migration.sql', MIGRATIONS), 'utf8')

/** Cada sentencia, sin comentarios ni huecos en blanco. */
const statements = guides
  .replace(/^--.*$/gm, '')
  .split(/;\s*$/m)
  .map(statement => statement.trim())
  .filter(Boolean)

/** Los literales de un INSERT, en el orden en que aparecen. */
function literals(statement: string) {
  return [...statement.matchAll(/\$itakai\$([\s\S]*?)\$itakai\$/g)].map(([, value]) => value)
}

/** Slugs de las categorías que crea el contenido inicial. */
function initialCategories() {
  const chunks = content.split('INSERT INTO "help_categories"').slice(1)
  return new Set(chunks.map(chunk => /VALUES \(gen_random_uuid\(\)::text, \$itakai\$(.*?)\$itakai\$/.exec(chunk)?.[1]))
}

describe('migración help_guides_block1', () => {
  it('solo inserta artículos, dos, y cada uno respeta lo que ya exista', () => {
    expect(statements).toHaveLength(2)
    for (const statement of statements) {
      expect(statement).toMatch(/^INSERT INTO "help_articles" /)
      expect(statement).toMatch(/ON CONFLICT \("category_id", "slug", "locale"\) DO NOTHING$/)
    }
    expect(guides).not.toMatch(/\b(UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/)
  })

  it('cada artículo cae en una categoría del contenido inicial', () => {
    const categories = initialCategories()
    expect(categories.size).toBe(9)
    const targets = statements.map(statement => /WHERE c\."slug" = \$itakai\$(.*?)\$itakai\$/.exec(statement)?.[1])
    expect(targets).toEqual(['ia-y-configuracion', 'primeros-pasos'])
    for (const target of targets) expect(categories.has(target), target).toBe(true)
  })

  it('los slugs son los de las guías y no chocan con el contenido inicial', () => {
    const slugs = statements.map(statement => literals(statement)[0])
    expect(slugs).toEqual(['gestionar-el-centro-de-ayuda', 'donde-encontrar-ayuda'])
    for (const slug of slugs) expect(content).not.toContain(`$itakai$${slug}$itakai$`)
  })

  it('las portadas son ilustraciones de la ayuda', () => {
    const covers = statements.map(statement => literals(statement)[3])
    expect(covers).toEqual(['/app/ayuda/gestionar-ayuda.svg', '/app/ayuda/encontrar-ayuda.svg'])
    for (const cover of covers) expect(cover).toMatch(/^\/app\/ayuda\/[a-z0-9-]+\.svg$/)
  })

  it('salen publicados, al final de su categoría y con su audiencia', () => {
    for (const statement of statements) {
      expect(statement).toContain(`'publicado'::"HelpArticleStatus"`)
      expect(statement).toContain(
        `(SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id")`
      )
      expect(statement).toMatch(/'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP$/m)
    }
    expect(statements[0]).toContain(`'profesor'::"HelpAudience"`)
    expect(statements[1]).toContain(`'ambos'::"HelpAudience"`)
  })

  it('nunca referencia ids, que cambian en cada instalación', () => {
    expect(guides).not.toMatch(/"id" = '/)
    expect(guides).not.toMatch(/"id" IN/)
    expect(guides).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-/)
  })
})
