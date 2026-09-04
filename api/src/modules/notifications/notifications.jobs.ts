import { prisma } from '../../config/database.js'
import { registerJob, type JobContext } from '../../utils/scheduler.js'
import { notifyMany, type NotifyInput } from './notifications.service.js'

/**
 * Tareas periódicas de notificaciones (Fase 3, punto 3).
 *
 * Las registra `registerNotificationJobs()`, que se llama al arrancar el
 * servidor. Son idempotentes: se pueden ejecutar dos veces seguidas sin
 * duplicar avisos, porque cada uno lleva su clave de deduplicación.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Con cuánta antelación se avisa de una fecha de entrega. */
const REMINDER_LEAD_HOURS = 24

/** Cada cuánto se comprueban las fechas límite. */
const REMINDER_INTERVAL_MS = 15 * MINUTE

/** Cuánto se guarda una notificación ya leída antes de barrerla. */
const READ_RETENTION_DAYS = 60

function hoursLeft(deadline: Date, now: Date) {
  return Math.max(1, Math.round((deadline.getTime() - now.getTime()) / HOUR))
}

/**
 * Avisa a cada alumno de las misiones que le vencen en las próximas horas.
 *
 * Solo se avisa a quien todavía puede hacer algo: alumnos matriculados en una
 * clase activa que no han completado la misión y que no han desactivado los
 * recordatorios en su perfil (`UserSettings.missionReminders`, que hasta ahora
 * era un interruptor que no leía nadie).
 */
async function runDeadlineReminders({ now }: JobContext) {
  const until = new Date(now.getTime() + REMINDER_LEAD_HOURS * HOUR)

  const missions = await prisma.mission.findMany({
    where: {
      status: 'activa',
      deadline: { gt: now, lte: until },
      class: { archived: false },
    },
    select: {
      id: true,
      title: true,
      deadline: true,
      classId: true,
      class: { select: { name: true } },
      progress: { select: { studentId: true, completedAt: true } },
    },
  })

  if (missions.length === 0) return { missions: 0, candidates: 0, created: 0 }

  // Las matrículas de todas las clases implicadas, en una sola consulta: varias
  // misiones de la misma clase vencen a la vez, y preguntar por cada una era una
  // consulta por misión cada cuarto de hora.
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      classId: { in: [...new Set(missions.map(m => m.classId))] },
      isPreview: false,
    },
    select: {
      classId: true,
      studentId: true,
      student: { select: { settings: { select: { missionReminders: true } } } },
    },
  })

  const byClass = new Map<string, typeof enrollments>()
  for (const enrollment of enrollments) {
    const list = byClass.get(enrollment.classId)
    if (list) list.push(enrollment)
    else byClass.set(enrollment.classId, [enrollment])
  }

  const avisos: NotifyInput[] = []

  for (const mission of missions) {
    if (!mission.deadline) continue

    const completed = new Set(
      mission.progress.filter(p => p.completedAt !== null).map(p => p.studentId)
    )

    const remaining = hoursLeft(mission.deadline, now)

    for (const enrollment of byClass.get(mission.classId) ?? []) {
      if (completed.has(enrollment.studentId)) continue
      const settings = enrollment.student.settings
      if (settings && !settings.missionReminders) continue

      avisos.push({
        userId: enrollment.studentId,
        type: 'deadline_reminder',
        copy: 'deadline_reminder',
        params: { mission: mission.title, hours: remaining, class: mission.class.name },
        priority: remaining <= 6 ? 'high' : 'medium',
        actionUrl: `/alumno/misiones/${mission.id}`,
        metadata: { missionId: mission.id, classId: mission.classId },
        // La fecha entra en la clave a propósito: si el profesor mueve la
        // entrega, el recordatorio vuelve a mandarse con el plazo nuevo.
        dedupeKey: `deadline:${mission.id}:${mission.deadline.toISOString()}`,
        alsoByEmail: true,
        emailAction: 'view_mission',
        // El aviso deja de tener sentido en cuanto pasa la fecha.
        expiresAt: mission.deadline,
      })
    }
  }

  const created = await notifyMany(avisos)
  return { missions: missions.length, candidates: avisos.length, created }
}

/**
 * Barre notificaciones caducadas y las leídas que ya nadie va a mirar, para
 * que la tabla no crezca sin fin.
 */
async function runNotificationsCleanup({ now }: JobContext) {
  const readCutoff = new Date(now.getTime() - READ_RETENTION_DAYS * 24 * HOUR)

  const { count } = await prisma.notification.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { isRead: true, createdAt: { lt: readCutoff } },
      ],
    },
  })

  return { deleted: count }
}

export function registerNotificationJobs() {
  registerJob({
    name: 'deadline-reminders',
    everyMs: REMINDER_INTERVAL_MS,
    run: runDeadlineReminders,
  })

  registerJob({
    name: 'notifications-cleanup',
    everyMs: 24 * HOUR,
    // La primera pasada tarda más: al arrancar hay cosas más urgentes que hacer.
    firstRunDelayMs: 5 * MINUTE,
    run: runNotificationsCleanup,
  })
}
