import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Las claves de `invitations` hacia `users` pasan a borrar en cascada. Sin base
 * de datos: lee el SQL y el esquema. Que el borrado funcione de verdad lo
 * comprueba tests/routes/class-students.db.test.ts contra Postgres.
 */

const raw = readFileSync(
  new URL(
    '../../prisma/migrations/20260918090000_invitations_cascade_on_user_delete/migration.sql',
    import.meta.url
  ),
  'utf8'
)
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')

/** Sin comentarios: una sentencia llevada a un comentario no debe contar. */
const sql = raw.replace(/--.*$/gm, '')

describe('migración de las claves de las invitaciones', () => {
  it('las dos claves hacia users borran en cascada', () => {
    for (const column of ['teacher_id', 'student_id']) {
      expect(sql).toMatch(
        new RegExp(`ALTER TABLE "invitations" DROP CONSTRAINT "invitations_${column}_fkey";`)
      )
      expect(sql).toMatch(
        new RegExp(
          `ADD CONSTRAINT "invitations_${column}_fkey" FOREIGN KEY \\("${column}"\\) REFERENCES "users"\\("id"\\) ON DELETE CASCADE ON UPDATE CASCADE`
        )
      )
    }
  })

  it('solo cambia esas dos claves: ni borra filas ni tablas', () => {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
    expect(statements).toHaveLength(4)
    for (const statement of statements) {
      expect(statement).toMatch(/^ALTER TABLE "invitations" (DROP|ADD) CONSTRAINT /)
    }
  })

  it('el esquema dice lo mismo', () => {
    expect(schema).toMatch(
      /teacher User\s+@relation\("SentInvitations", fields: \[teacherId\], references: \[id\], onDelete: Cascade\)/
    )
    expect(schema).toMatch(
      /student User\s+@relation\("ReceivedInvitations", fields: \[studentId\], references: \[id\], onDelete: Cascade\)/
    )
  })
})
