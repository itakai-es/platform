import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * La migración de la firma del blog solo añade la columna. Se escribe a mano
 * porque `migrate dev` propone siempre, además, borrar el índice GIN de la
 * búsqueda y el valor por defecto de `search_vector` (Prisma no los modela):
 * aceptarlo dejaría la ayuda y el blog sin buscador. Sin base de datos: solo
 * lee el SQL y el esquema.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const raw = readFileSync(new URL('20260926100000_blog_author/migration.sql', MIGRATIONS), 'utf8')
const sql = raw.replace(/--.*$/gm, '')
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')

describe('migración blog_author', () => {
  it('añade la firma como texto opcional y nada más', () => {
    expect(sql).toMatch(/ALTER TABLE "help_articles" ADD COLUMN "author_name" TEXT;/)
    expect(sql.match(/;/g)).toHaveLength(1)
    expect(schema).toMatch(/authorName\s+String\?\s+@map\("author_name"\)/)
  })

  it('no toca el buscador', () => {
    expect(sql).not.toMatch(/DROP INDEX/i)
    expect(sql).not.toMatch(/search_vector/)
  })
})
