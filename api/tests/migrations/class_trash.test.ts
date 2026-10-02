import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * La migración de la papelera de clases solo añade cuándo y quién la envió.
 * Se escribe a mano porque `migrate dev` propone siempre, además, borrar el
 * índice GIN de la búsqueda y el valor por defecto de `search_vector` (Prisma
 * no los modela): aceptarlo dejaría la ayuda y el blog sin buscador. Sin base
 * de datos: solo lee el SQL y el esquema. Lo que hace de verdad lo comprueba
 * tests/routes/class-trash.db.test.ts contra Postgres.
 */

const raw = readFileSync(
  new URL('../../prisma/migrations/20261002140000_class_trash/migration.sql', import.meta.url),
  'utf8'
)
// Sin comentarios: una sentencia llevada a un comentario no debe contar.
const sql = raw.replace(/--.*$/gm, '')
const statements = sql
  .split(';')
  .map(s => s.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')

describe('migración class_trash', () => {
  it('añade dos columnas nulas y la referencia a quien la envió, que se queda en null al borrar su cuenta', () => {
    expect(statements).toEqual([
      'ALTER TABLE "classes" ADD COLUMN "deleted_at" TIMESTAMP(3), ADD COLUMN "deleted_by_id" TEXT',
      'ALTER TABLE "classes" ADD CONSTRAINT "classes_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    ])
  })

  it('no borra ni reescribe nada, ni toca el buscador', () => {
    expect(sql).not.toMatch(/DROP|DELETE FROM|TRUNCATE|UPDATE "/i)
    expect(sql).not.toMatch(/search_vector|help_articles/)
  })

  it('el esquema lo modela igual', () => {
    expect(schema).toMatch(/deletedAt\s+DateTime\?\s+@map\("deleted_at"\)/)
    expect(schema).toMatch(/deletedById\s+String\?\s+@map\("deleted_by_id"\)/)
    expect(schema).toMatch(
      /deletedBy\s+User\?\s+@relation\("TrashedClasses", fields: \[deletedById\], references: \[id\], onDelete: SetNull\)/
    )
    expect(schema).toMatch(/trashedClasses\s+Class\[\]\s+@relation\("TrashedClasses"\)/)
  })
})
