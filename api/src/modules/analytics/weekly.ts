import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import {
  ANALYTICS_TIME_ZONE,
  inPeriod,
  madridWeekStart,
  weeksBetween,
  type Period,
} from './definitions.js'
import { missionCompletions } from './student-progress.js'

/**
 * La actividad de una clase (o de un estudiante en ella) por semanas, de lunes
 * a domingo en hora de Madrid (F1): cuántas entregas, enigmas aprobados,
 * misiones completadas, pistas y comportamientos hubo cada semana, y la XP que
 * se ganó con los enigmas y con los comportamientos y recompensas.
 *
 * Es lo ganado, no el saldo: no hay libro de movimientos (decisión 6 del plan).
 * La XP de los comportamientos va con el signo con que se aplicó, antes del
 * suelo en 0. El bonus de completar una misión no está aquí (solo consta en el
 * muro).
 *
 * Las columnas son `timestamp` sin zona, en UTC: la semana se saca pasando
 * cada fecha a la hora de Madrid (`AT TIME ZONE 'UTC' AT TIME ZONE …`) antes
 * de truncarla al lunes. Solo cuenta el alumnado con matrícula vigente en la
 * clase, sin la vista previa, como en la matriz. Una consulta agrupada; las
 * misiones completadas van aparte, con la definición única (`missionCompletions`),
 * que se aplica en memoria.
 */

type Db = Prisma.TransactionClient

export interface WeekActivity {
  /** El lunes de la semana, `AAAA-MM-DD`. */
  week: string
  submissions: number
  approvals: number
  missionsCompleted: number
  hintsUsed: number
  behaviorsPositive: number
  behaviorsNegative: number
  /** Recompensas libres (sin plantilla) y repartos de premios de equipo. */
  rewards: number
  xpFromEnigmas: number
  xpFromBehaviors: number
}

const emptyWeek = (week: string): WeekActivity => ({
  week,
  submissions: 0,
  approvals: 0,
  missionsCompleted: 0,
  hintsUsed: 0,
  behaviorsPositive: 0,
  behaviorsNegative: 0,
  rewards: 0,
  xpFromEnigmas: 0,
  xpFromBehaviors: 0,
})

interface WeekRow {
  week: string
  kind: string
  events: number
  xp: number
}

/**
 * Semana a semana, de `from` a `to` (las semanas sin nada salen a cero). Sin
 * `from`, desde la primera semana con algo; sin `to`, hasta la última. Con
 * `studentId`, solo lo suyo.
 */
export async function classActivityByWeek(
  classId: string,
  options: { from?: Date | null; to?: Date | null; studentId?: string } = {},
  db: Db = prisma
): Promise<WeekActivity[]> {
  const period: Period = { from: options.from ?? null, to: options.to ?? null }
  const studentId = options.studentId ?? null
  const inRange = (column: Prisma.Sql) =>
    Prisma.sql`(${period.from}::timestamp IS NULL OR ${column} >= ${period.from}::timestamp) AND (${period.to}::timestamp IS NULL OR ${column} <= ${period.to}::timestamp)`
  const week = (column: Prisma.Sql) =>
    Prisma.sql`to_char(date_trunc('week', ${column} AT TIME ZONE 'UTC' AT TIME ZONE ${ANALYTICS_TIME_ZONE}::text), 'YYYY-MM-DD')`

  const eventRows = db.$queryRaw<WeekRow[]>`
    WITH pop AS (
      SELECT student_id FROM class_enrollments
       WHERE class_id = ${classId} AND NOT is_preview
         AND (${studentId}::text IS NULL OR student_id = ${studentId}::text)
    ),
    events AS (
      SELECT 'submission' AS kind, s.submitted_at AS at, 0 AS xp
        FROM missions m
        JOIN mission_enigmas e ON e.mission_id = m.id
        JOIN enigma_submissions s ON s.enigma_id = e.id
       WHERE m.class_id = ${classId} AND s.student_id IN (SELECT student_id FROM pop)
         AND ${inRange(Prisma.sql`s.submitted_at`)}
      UNION ALL
      SELECT 'approval', p.completed_at, p.xp_earned
        FROM missions m
        JOIN mission_enigmas e ON e.mission_id = m.id
        JOIN student_enigma_progress p ON p.enigma_id = e.id
       WHERE m.class_id = ${classId} AND p.student_id IN (SELECT student_id FROM pop)
         AND ${inRange(Prisma.sql`p.completed_at`)}
      UNION ALL
      SELECT 'hint', h.created_at, 0
        FROM missions m
        JOIN mission_hint_uses h ON h.mission_id = m.id
       WHERE m.class_id = ${classId} AND h.student_id IN (SELECT student_id FROM pop)
         AND ${inRange(Prisma.sql`h.created_at`)}
      UNION ALL
      SELECT b.kind, b.created_at, b.xp_delta
        FROM behavior_applications b
       WHERE b.class_id = ${classId} AND b.student_id IN (SELECT student_id FROM pop)
         AND ${inRange(Prisma.sql`b.created_at`)}
    )
    SELECT ${week(Prisma.sql`at`)} AS week, kind,
           count(*)::int AS events, coalesce(sum(xp), 0)::int AS xp
      FROM events
     GROUP BY 1, 2
     ORDER BY 1, 2`

  const [rows, missions, population] = await Promise.all([
    eventRows,
    db.mission.findMany({
      where: { classId },
      select: { id: true, enigmas: { select: { id: true, isOptional: true } } },
    }),
    db.classEnrollment.findMany({
      where: { classId, isPreview: false, ...(studentId ? { studentId } : {}) },
      select: { studentId: true },
    }),
  ])
  const { datesBy } = await missionCompletions(missions, { studentId: studentId ?? undefined, db })
  const completedInWeek = new Map<string, number>()
  for (const { studentId: student } of population) {
    for (const at of datesBy.get(student)?.values() ?? []) {
      if (!inPeriod(at, period)) continue
      const key = madridWeekStart(at)
      completedInWeek.set(key, (completedInWeek.get(key) ?? 0) + 1)
    }
  }

  const byWeek = new Map<string, WeekActivity>()
  const weekOf = (key: string) => {
    let entry = byWeek.get(key)
    if (!entry) {
      entry = emptyWeek(key)
      byWeek.set(key, entry)
    }
    return entry
  }
  // Todas las semanas del periodo, aunque estén vacías (con los dos extremos).
  const seen = [...new Set([...rows.map(row => row.week), ...completedInWeek.keys()])].sort()
  const first = period.from ?? (seen[0] ? new Date(`${seen[0]}T12:00:00Z`) : null)
  const last = period.to ?? (seen.length > 0 ? new Date(`${seen[seen.length - 1]!}T12:00:00Z`) : null)
  if (first && last) for (const key of weeksBetween(first, last)) weekOf(key)

  for (const row of rows) {
    const entry = weekOf(row.week)
    switch (row.kind) {
      case 'submission':
        entry.submissions += row.events
        break
      case 'approval':
        entry.approvals += row.events
        entry.xpFromEnigmas += row.xp
        break
      case 'hint':
        entry.hintsUsed += row.events
        break
      case 'positive':
        entry.behaviorsPositive += row.events
        entry.xpFromBehaviors += row.xp
        break
      case 'negative':
        entry.behaviorsNegative += row.events
        entry.xpFromBehaviors += row.xp
        break
      default:
        // `reward`: recompensas libres y repartos de premios de equipo.
        entry.rewards += row.events
        entry.xpFromBehaviors += row.xp
    }
  }
  for (const [key, count] of completedInWeek) weekOf(key).missionsCompleted = count
  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week))
}
