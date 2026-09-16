import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Red para la migración que corrige el contenido de serie de la ayuda. Cada
 * UPDATE solo puede tocar un campo que siga con el texto de serie: lo editado
 * desde el panel se respeta. Sin base de datos: se leen los SQL y se aplican las
 * sentencias sobre filas en memoria, con la misma semántica que el WHERE.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const read = (name: string) => readFileSync(new URL(`${name}/migration.sql`, MIGRATIONS), 'utf8')
const content = read('20260915090000_help_default_content')
const guides = read('20260916090000_help_guides_block1')
const fixes = read('20260916180000_help_content_fixes')

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
  /** Slug que no puede existir ya en la categoría (solo al cambiar un slug). */
  freeSlug?: string
}

/** Los artículos que crea un INSERT de contenido, tal cual quedan en una instalación nueva. */
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

const seed = () => [...seedRows(content), ...seedRows(guides)]

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

const updates: Update[] = [...fixes.matchAll(STATEMENT)].map(match => {
  const [sql, field, value, category, slug, guardText, , , freeSlug] = match
  const guards = [
    ...guardText.matchAll(new RegExp(String.raw`AND a\."(\w+)" = ${LITERAL}`, 'g')),
  ].map(([, name, guard]) => [name as Field, guard] as [Field, string])
  return { sql, field: field as Field, value, category, slug, guards, freeSlug }
})

/** Aplica las sentencias en orden; devuelve cuántas filas tocó cada una. */
function apply(rows: Row[], list = updates) {
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

const find = (rows: Row[], slug: string) => rows.find(row => row.slug === slug)!

describe('migración help_content_fixes', () => {
  it('solo son UPDATE de artículos con la forma esperada, y nada más', () => {
    expect(updates.length).toBeGreaterThan(0)
    let rest = fixes
    for (const update of updates) rest = rest.replace(update.sql, '')
    expect(rest.replace(/^--.*$/gm, '').trim()).toBe('')
    for (const update of updates) {
      expect(update.guards.length, update.sql.slice(0, 120)).toBeGreaterThan(0)
      expect(FIELDS).toContain(update.field)
    }
  })

  it('nunca referencia ids, que cambian en cada instalación', () => {
    expect(fixes).not.toMatch(/"id" = '/)
    expect(fixes).not.toMatch(/"id" IN/)
    expect(fixes).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-/)
  })

  it('cada campo que cambia va protegido por su propio valor de serie', () => {
    const rows = seed()
    for (const update of updates) {
      const original = find(rows, update.slug)
      if (update.field === 'slug') continue
      expect(update.guards, `${update.slug}.${update.field}`).toContainEqual([
        update.field,
        original[update.field],
      ])
    }
  })

  it('sobre el contenido de serie sin editar, cada sentencia toca exactamente una fila', () => {
    const rows = seed()
    expect(apply(rows)).toEqual(updates.map(() => 1))
  })

  it('volver a pasarla no cambia nada', () => {
    const rows = seed()
    apply(rows)
    const after = JSON.stringify(rows)
    expect(apply(rows).every(count => count === 0)).toBe(true)
    expect(JSON.stringify(rows)).toBe(after)
  })

  it('un campo editado desde el panel se queda como está', () => {
    for (const update of updates) {
      if (update.field === 'slug') continue
      const rows = seed()
      const row = find(rows, update.slug)
      row[update.field] = `${row[update.field]} (editado)`
      const edited = row[update.field]
      apply(rows)
      expect(row[update.field], `${update.slug}.${update.field}`).toBe(edited)
    }
  })

  it('el artículo que cambia de tema no cambia título, resumen ni slug si su cuerpo está editado', () => {
    const renames = updates.filter(update => update.field === 'slug')
    expect(renames.map(update => [update.slug, update.value])).toEqual([
      ['no-llega-el-correo-de-invitacion', 'mi-alumno-no-aparece-en-la-clase'],
    ])

    const rows = seed()
    const row = find(rows, 'no-llega-el-correo-de-invitacion')
    const before = { ...row, body: `${row.body} (editado)` }
    Object.assign(row, before)
    apply(rows)
    expect(row).toEqual(before)
  })

  it('el slug nuevo no choca con uno que ya exista en la categoría', () => {
    const rows = seed()
    const row = find(rows, 'no-llega-el-correo-de-invitacion')
    rows.push({ ...row, slug: 'mi-alumno-no-aparece-en-la-clase', body: 'otro' })
    apply(rows)
    expect(row.slug).toBe('no-llega-el-correo-de-invitacion')
    expect(row.title).toBe('Mi alumno no aparece en la clase')
  })

  it('toca los artículos previstos', () => {
    expect([...new Set(updates.map(update => update.slug))].sort()).toEqual([
      'avatares-y-alias-por-clase',
      'avisos-y-recordatorios',
      'como-entrego-una-mision',
      'como-entro-en-mi-clase',
      'crear-tu-primera-clase',
      'enigmas-los-pasos-de-una-mision',
      'he-borrado-algo-sin-querer',
      'he-perdido-un-punto-de-vida',
      'invitar-alumnos-a-una-clase',
      'la-vista-del-alumno',
      'las-recompensas-no-cuadran',
      'mi-avatar-y-mi-nombre-en-clase',
      'no-llega-el-correo-de-invitacion',
      'no-puedo-entrar-en-mi-cuenta',
      'no-puedo-subir-un-archivo',
      'revisar-entregas',
      'un-alumno-no-ve-la-clase',
    ])
  })

  it('después de aplicarla, todos los enlaces entre artículos llevan a uno que existe', () => {
    const rows = seed()
    apply(rows)
    const existing = new Set(rows.map(row => `${row.category}/${row.slug}`))
    for (const row of rows) {
      for (const [, target] of row.body.matchAll(/\]\(\/ayuda\/([a-z0-9-]+\/[a-z0-9-]+)\)/g)) {
        expect(existing.has(target), `${row.slug} → ${target}`).toBe(true)
      }
    }
  })

  it('después de aplicarla, la ayuda de serie ya no describe lo que no existe', () => {
    const rows = seed()
    apply(rows)
    const text = rows.map(row => `${row.title}\n${row.summary}\n${row.body}`).join('\n')
    for (const phrase of [
      /invitaci[oó]n/i,
      /solicitud/i,
      /campana/i,
      /p[aá]gina de notificaciones/i,
      /\*Entregas\*/,
      /abre la entrega/i,
      /aceptar o rechazar/i,
      /\bCrear clase\b/,
    ]) {
      expect(text, String(phrase)).not.toMatch(phrase)
    }
  })
})
