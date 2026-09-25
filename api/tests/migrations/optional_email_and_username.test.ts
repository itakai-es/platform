import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Migración del correo opcional y del usuario. Sin base de datos: lee el SQL.
 * Vigila lo que Prisma no sabe expresar (el CHECK de «correo o usuario»), que la
 * normalización del correo no deje ninguna cuenta sin poder entrar y que la
 * migración solo añada y relaje, nunca borre.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const raw = readFileSync(
  new URL('20260917150000_optional_email_and_username/migration.sql', MIGRATIONS),
  'utf8'
)
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')

/** Sin comentarios: una sentencia llevada a un comentario no debe contar. */
const sql = raw.replace(/--.*$/gm, '')

describe('migración del correo opcional y del usuario', () => {
  it('el correo deja de ser obligatorio pero mantiene su unicidad', () => {
    expect(sql).toMatch(/ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL/)
    // La unicidad venía de antes y no se toca: nada la borra aquí.
    expect(sql).not.toMatch(/DROP INDEX[^;]*users_email/)
    expect(schema).toMatch(/email\s+String\?\s+@unique/)
  })

  it('añade el usuario, único, y el resto de columnas con valor para lo que ya existe', () => {
    expect(sql).toMatch(/ADD COLUMN "username" TEXT/)
    expect(sql).toMatch(/CREATE UNIQUE INDEX "users_username_key" ON "users"\("username"\)/)
    expect(sql).toMatch(/ADD COLUMN "account_type" "UserAccountType" NOT NULL DEFAULT 'self'/)
    expect(sql).toMatch(/ADD COLUMN "created_by_id" TEXT/)
    expect(sql).toMatch(/ADD COLUMN "home_class_id" TEXT/)
    expect(sql).toMatch(/ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false/)
    expect(sql).toMatch(/ADD COLUMN "password_changed_at" TIMESTAMP\(3\)/)
  })

  it('crea el tipo de cuenta con sus dos valores', () => {
    expect(sql).toMatch(/CREATE TYPE "UserAccountType" AS ENUM \('self', 'managed'\)/)
    expect(sql.match(/\bCREATE TYPE\b/g)).toHaveLength(1)
  })

  it('las dos claves foráneas dejan la columna en null, no borran la cuenta', () => {
    expect(sql).toMatch(/"users_created_by_id_fkey"[^;]*REFERENCES "users"[^;]*ON DELETE SET NULL/)
    expect(sql).toMatch(
      /"users_home_class_id_fkey"[^;]*REFERENCES "classes"[^;]*ON DELETE SET NULL/
    )
  })

  it('crea los índices de las columnas nuevas', () => {
    expect(sql).toMatch(/CREATE INDEX "users_created_by_id_idx" ON "users"\("created_by_id"\)/)
    expect(sql).toMatch(/CREATE INDEX "users_home_class_id_idx" ON "users"\("home_class_id"\)/)
    expect(sql).toMatch(/CREATE INDEX "users_account_type_idx" ON "users"\("account_type"\)/)
  })

  it('toda cuenta tiene correo o usuario: el CHECK, que Prisma no expresa', () => {
    expect(sql).toMatch(
      /ADD CONSTRAINT "users_email_or_username" CHECK \("email" IS NOT NULL OR "username" IS NOT NULL\)/
    )
    // Prisma no lo conoce: el esquema tiene que explicar dónde vive.
    expect(schema).toMatch(/users_email_or_username/)
  })

  it('se para si dos correos solo se diferencian en las mayúsculas', () => {
    const guard = sql.match(/DO \$\$[\s\S]*?\$\$;/)?.[0]
    expect(guard).toBeTruthy()
    // Los dos lados de la comparación van en minúsculas: comparar solo uno
    // dejaría pasar dos filas escritas ambas con mayúsculas, que al bajarlas
    // chocarían con la unicidad y tumbarían la migración a medias.
    expect(guard).toMatch(/lower\(o\."email"\) = lower\(u\."email"\)/)
    expect(guard).toMatch(/o\."id" <> u\."id"/)
    expect(guard).toMatch(/RAISE EXCEPTION/)
  })

  it('normalizados los choques, baja a minúsculas todos los correos', () => {
    const update = sql.match(/UPDATE "users"[\s\S]*?;/)?.[0]
    expect(update).toBeTruthy()
    expect(update).toMatch(/SET "email" = lower\("email"\)/)
    expect(update).toMatch(/WHERE "email" <> lower\("email"\)/)
    // Ninguna fila se queda con mayúsculas: una que se quedara ya no podría
    // entrar, porque la búsqueda compara siempre en minúsculas.
    expect(update).not.toMatch(/NOT EXISTS/)
  })

  it('no borra ni renombra nada', () => {
    expect(sql).not.toMatch(/\bDROP TABLE\b/)
    expect(sql).not.toMatch(/\bDROP COLUMN\b/)
    expect(sql).not.toMatch(/\bRENAME\b/)
    expect(sql).not.toMatch(/\bDELETE FROM\b/)
  })
})
