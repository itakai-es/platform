import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

/**
 * Migración de los índices de la analítica (F1, entrega 1). Sin base de datos:
 * lee el SQL y el esquema. Vigila que cree los índices acordados con el nombre
 * que les daría Prisma, que el único parcial de entregas pendientes (que Prisma
 * no modela) se quede en el SQL con su nota en el esquema, que se pare si ya
 * hay pendientes repetidas, y que no toque el buscador de la ayuda ni ninguna
 * fila. Que los índices se usan de verdad lo comprueban las pruebas de la
 * analítica contra Postgres (tests/modules/analytics.*.db.test.ts).
 */

const raw = readFileSync(
  new URL(
    '../../prisma/migrations/20261030100000_f1_analytics_indexes/migration.sql',
    import.meta.url
  ),
  'utf8'
)
// Sin comentarios: una sentencia llevada a un comentario no debe contar.
const sql = raw.replace(/--.*$/gm, '')
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8')

/** El bloque de un modelo del esquema. */
const model = (name: string) => schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? ''

describe('migración f1_analytics_indexes', () => {
  it('crea los índices acordados, con el nombre de Prisma', () => {
    const indexes = [...sql.matchAll(/CREATE INDEX "(\w+)" ON "(\w+)"\(([^)]*)\)/g)].map(
      ([, name, table, columns]) => `${table}(${columns!.replace(/"/g, '')}) ${name}`
    )
    expect(indexes.sort()).toEqual(
      [
        'behavior_applications(class_id, created_at) behavior_applications_class_id_created_at_idx',
        'chat_conversations(mission_id) chat_conversations_mission_id_idx',
        'chat_conversations(user_id) chat_conversations_user_id_idx',
        'chat_messages(conversation_id, created_at) chat_messages_conversation_id_created_at_idx',
        'enigma_submissions(enigma_id, status) enigma_submissions_enigma_id_status_idx',
        'enigma_submissions(student_id, enigma_id) enigma_submissions_student_id_enigma_id_idx',
        'mission_documents(mission_id) mission_documents_mission_id_idx',
        'mission_enigmas(mission_id, order_index) mission_enigmas_mission_id_order_index_idx',
        'student_enigma_progress(enigma_id) student_enigma_progress_enigma_id_idx',
        'student_mission_progress(mission_id) student_mission_progress_mission_id_idx',
      ].sort()
    )
  })

  it('como mucho una entrega pendiente por estudiante y enigma: un único parcial', () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX "enigma_submissions_one_pending_key" ON "enigma_submissions"\("student_id", "enigma_id"\) WHERE "status" = 'pendiente'/
    )
    // Prisma no lo modela: el esquema dice dónde vive.
    expect(model('EnigmaSubmission')).toMatch(/enigma_submissions_one_pending_key/)
  })

  it('se para, diciendo cuáles, si ya hay pendientes repetidas', () => {
    const guard = sql.match(/DO \$\$[\s\S]*?\$\$;/)?.[0]
    expect(guard).toBeTruthy()
    expect(guard).toMatch(/WHERE "status" = 'pendiente'/)
    expect(guard).toMatch(/GROUP BY "student_id", "enigma_id"/)
    expect(guard).toMatch(/HAVING count\(\*\) > 1/)
    expect(guard).toMatch(/RAISE EXCEPTION/)
    // La guarda va antes que el índice: si no, el error sería el de Postgres, sin decir cuáles.
    expect(sql.indexOf('DO $$')).toBeLessThan(sql.indexOf('enigma_submissions_one_pending_key'))
  })

  it('solo sustituye el índice por clase de los comportamientos; no borra ni reescribe nada más', () => {
    expect(sql.match(/DROP INDEX "(\w+)"/g)).toEqual(['DROP INDEX "behavior_applications_class_id_idx"'])
    expect(sql).not.toMatch(/DELETE FROM|TRUNCATE|UPDATE "|ALTER TABLE|DROP TABLE|DROP COLUMN/i)
    expect(sql).not.toMatch(/search_vector|help_articles/)
  })

  it('el esquema lo modela igual', () => {
    expect(model('EnigmaSubmission')).toMatch(/@@index\(\[enigmaId, status\]\)/)
    expect(model('EnigmaSubmission')).toMatch(/@@index\(\[studentId, enigmaId\]\)/)
    expect(model('MissionEnigma')).toMatch(/@@index\(\[missionId, orderIndex\]\)/)
    expect(model('StudentMissionProgress')).toMatch(/@@index\(\[missionId\]\)/)
    expect(model('StudentEnigmaProgress')).toMatch(/@@index\(\[enigmaId\]\)/)
    expect(model('MissionDocument')).toMatch(/@@index\(\[missionId\]\)/)
    expect(model('ChatConversation')).toMatch(/@@index\(\[userId\]\)/)
    expect(model('ChatConversation')).toMatch(/@@index\(\[missionId\]\)/)
    expect(model('ChatMessage')).toMatch(/@@index\(\[conversationId, createdAt\]\)/)
    expect(model('BehaviorApplication')).toMatch(/@@index\(\[classId, createdAt\]\)/)
    expect(model('BehaviorApplication')).not.toMatch(/@@index\(\[classId\]\)/)
  })
})
