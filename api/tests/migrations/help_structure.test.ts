import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Red contra un slug mal escrito en la migración de estructura del centro de
 * ayuda. Sus UPDATE etiquetan el contenido inicial por slug de categoría y de
 * artículo; en Postgres, un slug que no existe es un UPDATE silencioso de cero
 * filas, así que aquí se cruzan las tuplas con la migración de contenido. Sin
 * base de datos: solo lee los dos ficheros SQL.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const content = readFileSync(new URL('20260915090000_help_default_content/migration.sql', MIGRATIONS), 'utf8')
const structure = readFileSync(new URL('20260915120000_help_structure/migration.sql', MIGRATIONS), 'utf8')

const LITERAL = /\$itakai\$(.*?)\$itakai\$/s

/** Pares (categoría, slug) que el contenido inicial inserta de verdad. */
function initialArticles() {
  const pairs = new Set<string>()
  const chunks = content.split('INSERT INTO "help_articles"').slice(1)
  for (const chunk of chunks) {
    const slug = LITERAL.exec(chunk)?.[1]
    const category = /WHERE c\."slug" = \$itakai\$(.*?)\$itakai\$/.exec(chunk)?.[1]
    expect(slug, 'cada INSERT de artículo lleva su slug').toBeTruthy()
    expect(category, 'cada INSERT de artículo apunta a una categoría').toBeTruthy()
    pairs.add(`${category}/${slug}`)
  }
  return pairs
}

/** Sin comentarios: una condición llevada a un comentario no debe contar. */
const sql = structure.replace(/--.*$/gm, '')

/** Las tuplas ('categoría', 'slug') del UPDATE que fija `columna = valor`. */
function pairsFor(assignment: string) {
  const start = sql.indexOf(`SET ${assignment}`)
  expect(start, `hay un UPDATE con SET ${assignment}`).toBeGreaterThan(-1)
  const statement = sql.slice(start, sql.indexOf(';', start))
  expect(statement).toMatch(/\) AS v\(category_slug, slug\)\s+JOIN "help_categories" c ON c\."slug" = v\.category_slug/)
  expect(statement).toMatch(/WHERE a\."category_id" = c\."id" AND a\."slug" = v\.slug(\s|$)/)
  const values = /FROM \(VALUES([\s\S]*?)\) AS v/.exec(statement)?.[1] ?? ''
  return [...values.matchAll(/\(\s*'([^']+)',\s*'([^']+)'\s*\)/g)].map(([, category, slug]) => `${category}/${slug}`)
}

describe('migración help_structure', () => {
  it('crea los tres enums', () => {
    expect(structure).toMatch(/CREATE TYPE "HelpAudience" AS ENUM \('profesor', 'alumno', 'ambos'\)/)
    expect(structure).toMatch(/CREATE TYPE "HelpArticleKind" AS ENUM \('guia', 'tutorial', 'faq', 'video'\)/)
    expect(structure).toMatch(/CREATE TYPE "HelpArea" AS ENUM \('ayuda', 'blog'\)/)
    expect(structure.match(/^CREATE TYPE/gm)).toHaveLength(3)
  })

  it('añade las cuatro columnas con sus valores por defecto', () => {
    expect(structure.match(/\bADD COLUMN\b/g)).toHaveLength(4)
    expect(structure).toMatch(/ADD COLUMN\s+"area" "HelpArea" NOT NULL DEFAULT 'ayuda'/)
    expect(structure).toMatch(/ADD COLUMN\s+"audience" "HelpAudience" NOT NULL DEFAULT 'profesor'/)
    expect(structure).toMatch(/ADD COLUMN\s+"kind" "HelpArticleKind" NOT NULL DEFAULT 'guia'/)
    expect(structure).toMatch(/ADD COLUMN\s+"video_url" TEXT/)
  })

  it('no hay rastro de la clave de contexto', () => {
    expect(structure).not.toMatch(/context/i)
  })

  it('crea solo el índice de área', () => {
    expect(structure).toMatch(
      /CREATE INDEX "help_categories_area_order_index_idx" ON "help_categories"\("area", "order_index"\)/
    )
    expect(structure.match(/^CREATE INDEX/gm)).toHaveLength(1)
  })

  it('no toca el índice de búsqueda a texto completo', () => {
    expect(structure).not.toMatch(/DROP INDEX/)
    expect(structure).not.toMatch(/search_vector/)
  })

  it('el acento nace en stats y lo que no sea de la lista pasa a stats', () => {
    expect(sql).toMatch(/ALTER COLUMN "accent" SET DEFAULT 'stats'/)
    expect(sql).toMatch(
      /UPDATE "help_categories" SET "accent" = 'stats'\s+WHERE "accent" NOT IN \('ia', 'stats', 'clases', 'pending'\);/
    )
  })

  it('cambia a alumno solo la categoría del alumno', () => {
    const updates = sql.match(/SET "audience" = 'alumno'/g)
    expect(updates).toHaveLength(1)
    expect(sql).toMatch(/SET "audience" = 'alumno'[\s\S]*?c\."slug" = 'si-eres-alumno';/)
    expect(sql).not.toMatch(/SET "audience" = 'profesor'/)
  })

  it('marca como de ambos los cinco artículos de cuenta y acceso', () => {
    expect(sql.match(/SET "audience" = 'ambos'/g)).toHaveLength(1)
    expect(pairsFor(`"audience" = 'ambos'`).sort()).toEqual([
      'cuando-algo-falla/no-puedo-entrar-en-mi-cuenta',
      'cuando-algo-falla/no-puedo-subir-un-archivo',
      'tu-cuenta/accesibilidad',
      'tu-cuenta/avisos-y-recordatorios',
      'tu-cuenta/seguridad-de-tu-cuenta',
    ])
  })

  it('destaca los dos artículos del alumnado', () => {
    expect(sql.match(/SET "featured"/g)).toHaveLength(1)
    expect(sql).not.toMatch(/SET "featured" = false/)
    expect(pairsFor(`"featured" = true`).sort()).toEqual([
      'si-eres-alumno/como-entrego-una-mision',
      'si-eres-alumno/como-entro-en-mi-clase',
    ])
  })

  it('no repone destacados si el alumnado ya tiene alguno elegido', () => {
    const start = sql.indexOf('SET "featured" = true')
    const statement = sql.slice(start, sql.indexOf(';', start))
    expect(statement).toMatch(
      /AND NOT EXISTS \(\s*SELECT 1 FROM "help_articles" x\s+JOIN "help_categories" xc ON xc\."id" = x\."category_id"\s+WHERE xc\."slug" = 'si-eres-alumno' AND x\."featured"\s*\)$/,
    )
  })

  it('nunca referencia ids, que cambian en cada instalación', () => {
    expect(structure).not.toContain(`"id" = '`)
    expect(structure).not.toMatch(/"id" IN/)
  })

  it('cada par categoría/slug existe en el contenido inicial', () => {
    const existing = initialArticles()
    expect(existing.size).toBe(40)

    const targets = [...pairsFor(`"audience" = 'ambos'`), ...pairsFor(`"featured" = true`)]
    expect(targets).toHaveLength(7)
    for (const target of targets) expect(existing.has(target), target).toBe(true)
  })

  it('los artículos para ambos no se repiten y ninguno es de si-eres-alumno', () => {
    const ambos = pairsFor(`"audience" = 'ambos'`)
    expect(new Set(ambos).size).toBe(ambos.length)
    for (const target of ambos) expect(target.startsWith('si-eres-alumno/'), target).toBe(false)
  })
})
