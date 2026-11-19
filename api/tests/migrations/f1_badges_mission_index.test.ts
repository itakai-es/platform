import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * El índice de las insignias por misión (F1, revisión final). Sin base de datos: lee
 * el SQL y el esquema. Vigila que cree solo ese índice, con el nombre que le daría
 * Prisma, y que no toque el buscador de la ayuda ni ninguna fila.
 */

const raw = readFileSync(
  new URL('../../prisma/migrations/20261112120000_f1_badges_mission_index/migration.sql', import.meta.url),
  'utf8'
)
// Sin comentarios: una sentencia llevada a un comentario no debe contar.
const sql = raw.replace(/--.*$/gm, '').trim()
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')
const badge = schema.match(/model Badge \{[\s\S]*?\n\}/)?.[0] ?? ''

describe('migración f1_badges_mission_index', () => {
  it('crea solo el índice de badges por misión, con el nombre de Prisma', () => {
    expect(sql).toBe('CREATE INDEX "badges_mission_id_idx" ON "badges"("mission_id");')
  })

  it('no toca el buscador de la ayuda ni ninguna fila', () => {
    expect(raw).not.toMatch(/^\s*(DROP|ALTER|DELETE|UPDATE|INSERT)/im)
    expect(sql).not.toMatch(/search_vector|help_articles/)
  })

  it('el esquema lo modela igual', () => {
    expect(badge).toMatch(/@@index\(\[missionId\]\)/)
  })
})
