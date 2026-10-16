import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { AttendanceStatus } from '../../generated/prisma/enums.js'
import { assertClassAccess, recordClassAction } from '../../utils/class-access.js'
import { assertClassWritable } from '../../utils/class-writable.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'

/**
 * Asistencia de una clase. Una sesión es cada vez que se da la clase (clase +
 * fecha + tramo) y se crea al guardar la lista: nada se genera por adelantado.
 * La fecha es el día local de quien pasa lista y la manda el navegador; aquí
 * nunca se deriva del reloj del servidor, que va en UTC.
 *
 * Es un dato personal de menores: lo ve el profesorado de la clase, lo cambia
 * quien edita y el CSV solo sale con edición. No va al muro del estudiante ni
 * a nada que vea el alumnado, y nunca mueve recursos por sí sola: premiar o
 * penalizar es siempre una acción aparte y confirmada.
 */

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const

/** Quien no está en el aula: queda fuera de la ruleta y de los equipos al azar de ese día. */
const MISSING: AttendanceStatus[] = ['absent', 'excused']

/** Tope del histórico y del CSV: un curso con margen. */
const MAX_RANGE_DAYS = 400

type Tx = Prisma.TransactionClient

export interface SaveSessionInput {
  date: string
  startTime: string
  endTime?: string | null
  source: 'schedule' | 'manual'
  records: { studentId: string; status: AttendanceStatus; note?: string | null }[]
}

/** `YYYY-MM-DD` → la fecha que guarda la columna `@db.Date`. */
function toDbDate(dateKey: string): Date {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new ValidationError('Fecha no válida')
  }
  return date
}

/**
 * La lista que cuenta un día: la sesión de ese día guardada más recientemente.
 * La comparten `getCurrent` (la selección «solo presentes» y la ruleta) y los
 * equipos al azar, para que todos dejen fuera a las mismas personas.
 */
function dayListQuery(classId: string, date: string) {
  return { where: { classId, date: toDbDate(date) }, orderBy: { updatedAt: 'desc' as const } }
}

/**
 * Quién falta un día (ausente o con falta justificada en la lista que cuenta),
 * sin leer la lista entera. Sin lista ese día, `taken` es false y no falta nadie.
 */
export async function missingStudentIdsOn(db: Tx, classId: string, date: string) {
  const session = await db.attendanceSession.findFirst({
    ...dayListQuery(classId, date),
    select: {
      records: {
        where: { status: { in: MISSING } },
        select: { enrollment: { select: { studentId: true } } },
      },
    },
  })
  return {
    taken: !!session,
    missing: new Set(session?.records.map(r => r.enrollment.studentId) ?? []),
  }
}

function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function emptyCounts() {
  return { present: 0, absent: 0, late: 0, excused: 0 }
}

type Counts = ReturnType<typeof emptyCounts>

function countStatuses(statuses: AttendanceStatus[]): Counts {
  const counts = emptyCounts()
  for (const s of statuses) counts[s] += 1
  return counts
}

const sessionSelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  source: true,
  updatedAt: true,
  takenBy: { select: { name: true } },
  records: {
    select: { status: true, note: true, enrollment: { select: { studentId: true } } },
  },
} satisfies Prisma.AttendanceSessionSelect

type SessionRow = Prisma.AttendanceSessionGetPayload<{ select: typeof sessionSelect }>

function formatSession(s: SessionRow) {
  const statuses = s.records.map(r => r.status)
  return {
    id: s.id,
    date: fromDbDate(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    source: s.source,
    takenBy: s.takenBy?.name ?? null,
    updatedAt: s.updatedAt.toISOString(),
    counts: countStatuses(statuses),
    records: s.records.map(r => ({
      studentId: r.enrollment.studentId,
      status: r.status,
      note: r.note,
    })),
  }
}

/** Matrículas reales (sin la vista previa del profesorado) de la clase, por estudiante. */
async function enrollmentsByStudent(tx: Tx, classId: string) {
  const rows = await tx.classEnrollment.findMany({
    where: { classId, isPreview: false },
    select: { id: true, studentId: true },
  })
  return new Map(rows.map(r => [r.studentId, r.id]))
}

/** Rango de fechas del histórico: los dos extremos incluidos y con tope. */
function rangeOf(from: string, to: string) {
  const start = toDbDate(from)
  const end = toDbDate(to)
  if (end < start) throw new ValidationError('El rango de fechas está al revés')
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
    throw new ValidationError('El rango de fechas es demasiado largo')
  }
  return { gte: start, lte: end }
}

class AttendanceService {
  /** Sesiones guardadas de un día, con el estado de cada estudiante. */
  async getDay(userId: string, classId: string, date: string) {
    await assertClassAccess(classId, userId, 'attendance.view')
    const sessions = await prisma.attendanceSession.findMany({
      where: { classId, date: toDbDate(date) },
      orderBy: { startTime: 'asc' },
      select: sessionSelect,
    })
    return { date, sessions: sessions.map(formatSession) }
  }

  /**
   * Guarda la lista de una sesión: la crea si no existe (por fecha y tramo) o
   * la sustituye entera. Idempotente: guardar dos veces lo mismo deja lo mismo.
   */
  async saveSession(userId: string, classId: string, input: SaveSessionInput) {
    await assertClassAccess(classId, userId, 'attendance.take')
    const date = toDbDate(input.date)
    const seen = new Set<string>()
    for (const r of input.records) {
      if (seen.has(r.studentId)) throw new ValidationError('Hay un estudiante repetido en la lista')
      seen.add(r.studentId)
    }

    return prisma.$transaction(
      async tx => {
        await assertClassWritable(classId, tx)
        const enrollments = await enrollmentsByStudent(tx, classId)
        const rows = input.records.map(r => {
          const enrollmentId = enrollments.get(r.studentId)
          if (!enrollmentId) throw new ValidationError('Alguna de esas cuentas no está en esta clase')
          return { enrollmentId, status: r.status, note: r.note?.trim() || null }
        })

        const key = { classId_date_startTime: { classId, date, startTime: input.startTime } }
        const existing = await tx.attendanceSession.findUnique({ where: key, select: { id: true } })
        const session = await tx.attendanceSession.upsert({
          where: key,
          create: {
            classId,
            date,
            startTime: input.startTime,
            endTime: input.endTime || null,
            source: input.source,
            takenById: userId,
          },
          update: { endTime: input.endTime || null, takenById: userId },
          select: { id: true },
        })

        // La lista va entera: quien no viene en ella deja de constar en la sesión.
        await tx.attendanceRecord.deleteMany({
          where: {
            sessionId: session.id,
            enrollmentId: { notIn: rows.map(r => r.enrollmentId) },
          },
        })
        for (const row of rows) {
          await tx.attendanceRecord.upsert({
            where: {
              sessionId_enrollmentId: { sessionId: session.id, enrollmentId: row.enrollmentId },
            },
            create: { sessionId: session.id, ...row, updatedById: userId },
            update: { status: row.status, note: row.note, updatedById: userId },
          })
        }

        const counts = countStatuses(rows.map(r => r.status))
        await recordClassAction(tx, {
          classId,
          actorId: userId,
          action: existing ? 'attendance.updated' : 'attendance.taken',
          entityType: 'attendance',
          entityId: session.id,
          metadata: { date: input.date, startTime: input.startTime, ...counts },
        })

        const saved = await tx.attendanceSession.findUniqueOrThrow({
          where: { id: session.id },
          select: sessionSelect,
        })
        return { created: !existing, session: formatSession(saved) }
      },
      { timeout: 30_000 }
    )
  }

  /** Borra una sesión pasada por error, con su lista. */
  async deleteSession(userId: string, classId: string, sessionId: string) {
    await assertClassAccess(classId, userId, 'attendance.take')
    await prisma.$transaction(async tx => {
      await assertClassWritable(classId, tx)
      const session = await tx.attendanceSession.findFirst({
        where: { id: sessionId, classId },
        select: { id: true, date: true, startTime: true, records: { select: { status: true } } },
      })
      if (!session) throw new NotFoundError('Esa sesión no existe')
      await tx.attendanceSession.delete({ where: { id: session.id } })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'attendance.deleted',
        entityType: 'attendance',
        entityId: session.id,
        metadata: {
          date: fromDbDate(session.date),
          startTime: session.startTime,
          ...countStatuses(session.records.map(r => r.status)),
        },
      })
    })
    return { success: true }
  }

  /**
   * Quién falta un día: la sesión de ese día guardada más recientemente, con
   * quien está ausente o con falta justificada. Sin lista ese día, `session`
   * es null y no falta nadie. Lo leen la selección «solo presentes», los
   * equipos al azar y la ruleta.
   */
  async getCurrent(userId: string, classId: string, date: string) {
    await assertClassAccess(classId, userId, 'attendance.view')
    const session = await prisma.attendanceSession.findFirst({
      ...dayListQuery(classId, date),
      select: sessionSelect,
    })
    if (!session) return { date, session: null, absentStudentIds: [], statuses: {} }
    const formatted = formatSession(session)
    return {
      date,
      session: {
        id: formatted.id,
        startTime: formatted.startTime,
        endTime: formatted.endTime,
        updatedAt: formatted.updatedAt,
        counts: formatted.counts,
      },
      absentStudentIds: formatted.records
        .filter(r => MISSING.includes(r.status))
        .map(r => r.studentId),
      statuses: Object.fromEntries(formatted.records.map(r => [r.studentId, r.status])),
    }
  }

  /** Histórico de un rango: sesiones y, por estudiante, su estado en cada una y sus recuentos. */
  async getSummary(userId: string, classId: string, from: string, to: string, studentId?: string) {
    await assertClassAccess(classId, userId, 'attendance.view')
    return buildSummary(classId, from, to, studentId)
  }

  /** Lo mismo que el histórico, para el CSV: solo con edición (datos de menores). */
  async getExport(userId: string, classId: string, from: string, to: string) {
    await assertClassAccess(classId, userId, 'attendance.export')
    return buildSummary(classId, from, to)
  }
}

async function buildSummary(classId: string, from: string, to: string, studentId?: string) {
  const [sessions, enrollments] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { classId, date: rangeOf(from, to) },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        records: { select: { status: true, enrollmentId: true } },
      },
    }),
    prisma.classEnrollment.findMany({
      where: { classId, isPreview: false, ...(studentId ? { studentId } : {}) },
      select: { id: true, studentId: true },
    }),
  ])

  const students = enrollments.map(e => {
    const statuses: Record<string, AttendanceStatus> = {}
    for (const s of sessions) {
      const record = s.records.find(r => r.enrollmentId === e.id)
      if (record) statuses[s.id] = record.status
    }
    const counts = countStatuses(Object.values(statuses))
    const total = Object.keys(statuses).length
    // En clase: presente o con retraso.
    const attended = counts.present + counts.late
    return {
      studentId: e.studentId,
      total,
      ...counts,
      rate: total > 0 ? Math.round((attended / total) * 100) : null,
      statuses,
    }
  })

  return {
    from,
    to,
    sessions: sessions.map(s => ({
      id: s.id,
      date: fromDbDate(s.date),
      startTime: s.startTime,
      endTime: s.endTime,
      counts: countStatuses(s.records.map(r => r.status)),
    })),
    students,
  }
}

export const attendanceService = new AttendanceService()
