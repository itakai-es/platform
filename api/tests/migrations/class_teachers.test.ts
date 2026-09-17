import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Migración del profesorado por clase. Sin base de datos: lee el SQL. Vigila
 * lo que Prisma no sabe expresar (el índice único parcial), que el relleno de
 * propietarios se pueda repetir y que la migración solo añada.
 */

const MIGRATIONS = new URL('../../prisma/migrations/', import.meta.url)
const raw = readFileSync(
  new URL('20260917120000_add_class_teachers_and_action_log/migration.sql', MIGRATIONS),
  'utf8'
)
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')

/** Sin comentarios: una sentencia llevada a un comentario no debe contar. */
const sql = raw.replace(/--.*$/gm, '')

describe('migración del profesorado por clase', () => {
  it('crea los dos enums con sus valores', () => {
    expect(sql).toMatch(/CREATE TYPE "ClassAccessLevel" AS ENUM \('read', 'edit', 'admin'\)/)
    expect(sql).toMatch(
      /CREATE TYPE "ClassTeacherProfile" AS ENUM \('titular', 'sustituto', 'practicas'\)/
    )
    expect(sql.match(/\bCREATE TYPE\b/g)).toHaveLength(2)
  })

  it('crea las dos tablas', () => {
    expect(sql.match(/\bCREATE TABLE\b/g)).toHaveLength(2)
    expect(sql).toMatch(/CREATE TABLE "class_teachers"/)
    expect(sql).toMatch(/CREATE TABLE "class_action_log"/)
  })

  it('un solo propietario por clase: índice único parcial', () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX "class_teachers_one_owner" ON "class_teachers"\("class_id"\) WHERE "is_owner"/
    )
    // Prisma no lo conoce: el esquema tiene que explicar dónde vive.
    expect(schema).toMatch(/class_teachers_one_owner/)
  })

  it('crea el resto de índices, incluido el de classes.teacher_id', () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX "class_teachers_class_id_user_id_key" ON "class_teachers"\("class_id", "user_id"\)/
    )
    expect(sql).toMatch(
      /CREATE INDEX "class_teachers_user_id_idx" ON "class_teachers"\("user_id"\)/
    )
    expect(sql).toMatch(
      /CREATE INDEX "class_action_log_class_id_created_at_idx" ON "class_action_log"\("class_id", "created_at"\)/
    )
    expect(sql).toMatch(
      /CREATE INDEX "class_action_log_target_user_id_created_at_idx" ON "class_action_log"\("target_user_id", "created_at"\)/
    )
    expect(sql).toMatch(/CREATE INDEX "classes_teacher_id_idx" ON "classes"\("teacher_id"\)/)
  })

  it('las claves foráneas borran en cascada o dejan nulo, según el caso', () => {
    const fk = (table: string, column: string) =>
      new RegExp(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${table}_${column}_fkey" FOREIGN KEY \\("${column}"\\) REFERENCES "(\\w+)"\\("id"\\) ON DELETE (CASCADE|SET NULL)`
      ).exec(sql)

    expect(fk('class_teachers', 'class_id')?.slice(1)).toEqual(['classes', 'CASCADE'])
    expect(fk('class_teachers', 'user_id')?.slice(1)).toEqual(['users', 'CASCADE'])
    expect(fk('class_teachers', 'added_by_id')?.slice(1)).toEqual(['users', 'SET NULL'])
    expect(fk('class_action_log', 'class_id')?.slice(1)).toEqual(['classes', 'CASCADE'])
    expect(fk('class_action_log', 'actor_id')?.slice(1)).toEqual(['users', 'SET NULL'])
    expect(fk('class_action_log', 'target_user_id')?.slice(1)).toEqual(['users', 'SET NULL'])
  })

  describe('relleno de propietarios', () => {
    const start = sql.indexOf('INSERT INTO "class_teachers"')
    const insert = sql.slice(start, sql.indexOf(';', start))

    it('hay un único INSERT y sale de todas las clases, sin filtrar archivadas ni plantillas', () => {
      expect(start).toBeGreaterThan(-1)
      expect(sql.match(/\bINSERT INTO\b/g)).toHaveLength(1)
      expect(insert).toMatch(/FROM "classes" c/)
      expect(insert).not.toMatch(/archived|is_template/)
    })

    it('cada fila es el propietario: administración, titular, is_owner', () => {
      expect(insert).toMatch(
        /SELECT gen_random_uuid\(\)::text, c\."id", c\."teacher_id", 'admin', 'titular', true, c\."created_at", CURRENT_TIMESTAMP/
      )
    })

    it('se puede repetir: ni pisa filas ni añade un segundo propietario', () => {
      expect(insert).toMatch(/ON CONFLICT \("class_id", "user_id"\) DO NOTHING/)
      expect(insert).toMatch(
        /WHERE NOT EXISTS \(\s*SELECT 1 FROM "class_teachers" t WHERE t\."class_id" = c\."id" AND t\."is_owner"\s*\)/
      )
    })

    it('va después de crear el índice del único propietario', () => {
      expect(start).toBeGreaterThan(sql.indexOf('"class_teachers_one_owner"'))
    })
  })

  it('solo añade: no borra, no renombra y no cambia columnas que ya existían', () => {
    expect(sql).not.toMatch(/\bDROP\b/i)
    expect(sql).not.toMatch(/\bDELETE\b(?! CASCADE| SET NULL)/i)
    expect(sql).not.toMatch(/\bTRUNCATE\b|\bRENAME\b|\bUPDATE "|ALTER COLUMN/i)
    // Los únicos ALTER TABLE son las claves foráneas de las dos tablas nuevas.
    for (const [, table] of sql.matchAll(/ALTER TABLE "(\w+)"/g)) {
      expect(['class_teachers', 'class_action_log']).toContain(table)
    }
    // No arrastra el borrado del índice de búsqueda de la ayuda que propone `migrate dev`.
    expect(sql).not.toMatch(/help_articles/)
  })

  it('classes.teacher_id se queda, obligatorio, en el esquema', () => {
    expect(schema).toMatch(/teacherId\s+String\s+@map\("teacher_id"\)/)
  })

  it('documenta la consulta de coherencia', () => {
    expect(raw).toMatch(/Debe dar 0/)
    expect(raw).toMatch(/t\."is_owner" AND t\."user_id" = c\."teacher_id"\) <> 1/)
  })
})
