import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Autoría y avisos al profesorado. Sin base de datos: lee el SQL y el esquema.
 * Lo que hacen de verdad lo comprueban tests/routes/class-teachers.db.test.ts y
 * la matriz de rutas contra Postgres.
 */

const read = (name: string) =>
  readFileSync(new URL(`../../prisma/migrations/${name}/migration.sql`, import.meta.url), 'utf8')
    // Sin comentarios: una sentencia llevada a un comentario no debe contar.
    .replace(/--.*$/gm, '')

const statements = (sql: string) =>
  sql
    .split(';')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')

describe('tipos de aviso del profesorado', () => {
  const sql = read('20260918150000_class_teacher_notification_types')

  it('solo añade valores al enum, en su propia migración', () => {
    expect(statements(sql)).toEqual([
      `ALTER TYPE "NotificationType" ADD VALUE 'class_teacher_added'`,
      `ALTER TYPE "NotificationType" ADD VALUE 'class_teacher_changed'`,
      `ALTER TYPE "NotificationType" ADD VALUE 'class_teacher_removed'`,
      `ALTER TYPE "NotificationType" ADD VALUE 'class_ownership_received'`,
    ])
  })
})

describe('autoría de las acciones', () => {
  const sql = read('20260918151000_action_authorship')

  it('no borra tablas, columnas ni filas, ni usa los tipos de aviso nuevos', () => {
    expect(sql).not.toMatch(/DROP (TABLE|COLUMN)|DELETE FROM|TRUNCATE|UPDATE "/i)
    expect(sql).not.toMatch(/class_teacher_|class_ownership_/)
  })

  it('añade quién revisó la entrega y quién actuó en el feed, que se quedan en null si se borra la cuenta', () => {
    expect(sql).toContain('ALTER TABLE "enigma_submissions" ADD COLUMN "reviewed_by_id" TEXT')
    expect(sql).toMatch(/ADD COLUMN "actor_id" TEXT,\s*ADD COLUMN "actor_name" TEXT/)
    expect(sql).toContain(
      'FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL'
    )
    expect(sql).toContain('FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL')
  })

  it('indexa el feed por alumno y por clase', () => {
    expect(sql).toContain(
      'CREATE INDEX "activities_user_id_created_at_idx" ON "activities"("user_id", "created_at")'
    )
    expect(sql).toContain(
      'CREATE INDEX "activities_class_id_created_at_idx" ON "activities"("class_id", "created_at")'
    )
  })

  it('los comportamientos aplicados se conservan sin autor y las insignias no se quedan sin él', () => {
    expect(sql).toContain('ALTER COLUMN "teacher_id" DROP NOT NULL')
    expect(sql).toMatch(
      /"behavior_applications_teacher_id_fkey" FOREIGN KEY \("teacher_id"\) REFERENCES "users"\("id"\) ON DELETE SET NULL/
    )
    expect(sql).toMatch(
      /"badges_teacher_id_fkey" FOREIGN KEY \("teacher_id"\) REFERENCES "users"\("id"\) ON DELETE RESTRICT/
    )
  })

  it('el esquema dice lo mismo', () => {
    expect(schema).toMatch(
      /reviewedBy User\?\s+@relation\("SubmissionReviewer", fields: \[reviewedById\], references: \[id\], onDelete: SetNull\)/
    )
    expect(schema).toMatch(
      /actor User\? @relation\("ActivityActor", fields: \[actorId\], references: \[id\], onDelete: SetNull\)/
    )
    expect(schema).toMatch(
      /teacher\s+User\?\s+@relation\("BehaviorTeacher", fields: \[teacherId\], references: \[id\], onDelete: SetNull\)/
    )
    expect(schema).toMatch(
      /teacher\s+User\?\s+@relation\("CreatedBadges", fields: \[teacherId\], references: \[id\], onDelete: Restrict\)/
    )
  })
})
