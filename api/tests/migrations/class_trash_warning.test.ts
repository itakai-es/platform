import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Las dos migraciones del aviso de la papelera de clases: el tipo de
 * notificación nuevo, solo en la suya (un valor nuevo de un enum no se puede
 * usar en la misma transacción que lo añade), y la columna que dice cuándo se
 * avisó, escrita a mano para no aceptar lo que `migrate dev` propone siempre
 * sobre el buscador de la ayuda. Sin base de datos: solo lee el SQL y el
 * esquema. Lo que hacen de verdad lo comprueba
 * tests/routes/class-trash-remate.db.test.ts contra Postgres.
 */

const read = (name: string) => {
  const raw = readFileSync(
    new URL(`../../prisma/migrations/${name}/migration.sql`, import.meta.url),
    'utf8'
  )
  // Sin comentarios: una sentencia llevada a un comentario no debe contar.
  const sql = raw.replace(/--.*$/gm, '')
  const statements = sql
    .split(';')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return { sql, statements }
}

const notification = read('20261008120000_trash_notification')
const warned = read('20261008121000_class_trash_warned')
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')

describe('migraciones del aviso de la papelera', () => {
  it('el tipo de notificación nuevo va solo en su migración', () => {
    expect(notification.statements).toEqual([
      `ALTER TYPE "NotificationType" ADD VALUE 'class_purge_soon'`,
    ])
  })

  it('la marca del aviso es una columna nula, sin más', () => {
    expect(warned.statements).toEqual([
      'ALTER TABLE "classes" ADD COLUMN "trash_warned_at" TIMESTAMP(3)',
    ])
  })

  it('ninguna borra ni reescribe nada, ni toca el buscador', () => {
    for (const { sql } of [notification, warned]) {
      expect(sql).not.toMatch(/DROP|DELETE FROM|TRUNCATE|UPDATE "/i)
      expect(sql).not.toMatch(/search_vector|help_articles/)
    }
  })

  it('el esquema lo modela igual', () => {
    expect(schema).toMatch(/enum NotificationType \{[^}]*\bclass_purge_soon\b[^}]*\}/)
    expect(schema).toMatch(/trashWarnedAt\s+DateTime\?\s+@map\("trash_warned_at"\)/)
  })
})
