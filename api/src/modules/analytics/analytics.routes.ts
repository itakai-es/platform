import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { ClassUser } from '../../utils/class-access.js'
import { wallLimit } from '../../utils/activity.js'
import {
  TIMELINE_TYPES,
  getClassAnalytics,
  getMyProgress,
  getStudentAnalytics,
  getStudentTimeline,
  type TimelineType,
} from './analytics.service.js'

/**
 * La analítica de una clase (ver analytics.service.ts). Las del profesorado se
 * registran dentro de sus rutas, que ya exigen sesión y papel; el acceso a la
 * clase (`analytics.view`) lo comprueba el servicio y los errores los traduce
 * el manejador global. «Mi progreso» va dentro de las del alumnado, detrás de
 * su comprobación de matrícula.
 */

const periodQuery = z.object({
  period: z.enum(['course', 'last30', 'last7']).default('course'),
})

/** Lo que más da una página del historial, y lo que da sin `limit`. */
const TIMELINE_DEFAULT_LIMIT = 25

const timelineQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.string().max(10).optional(),
  // Uno o varios tipos, separados por comas: `enigma_completed,attendance`.
  type: z
    .string()
    .max(500)
    .optional()
    .transform(raw => (raw ?? '').split(',').map(t => t.trim()).filter(Boolean))
    .pipe(z.array(z.enum(TIMELINE_TYPES as unknown as [TimelineType, ...TimelineType[]], {
      errorMap: () => ({ message: 'Tipo de entrada no válido' }),
    }))),
})

type ClassParams = { Params: { classId: string } }
type StudentParams = { Params: { classId: string; studentId: string } }

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/classes/:classId/analytics', async (request: FastifyRequest<ClassParams>) => {
    const { id } = request.user as { id: string }
    const { period } = periodQuery.parse(request.query)
    return getClassAnalytics(id, request.params.classId, period)
  })

  fastify.get(
    '/classes/:classId/students/:studentId/analytics',
    async (request: FastifyRequest<StudentParams>) => {
      const { id } = request.user as { id: string }
      const { period } = periodQuery.parse(request.query)
      const { classId, studentId } = request.params
      return getStudentAnalytics(id, classId, studentId, period)
    }
  )

  fastify.get(
    '/classes/:classId/students/:studentId/timeline',
    async (request: FastifyRequest<StudentParams>) => {
      const { id } = request.user as { id: string }
      const query = timelineQuery.parse(request.query)
      const { classId, studentId } = request.params
      return getStudentTimeline(id, classId, studentId, {
        cursor: query.cursor || undefined,
        limit: wallLimit(query.limit, TIMELINE_DEFAULT_LIMIT),
        types: query.type,
      })
    }
  )
}

export async function studentAnalyticsRoutes(fastify: FastifyInstance) {
  // La matrícula la deja `requireStudentEnrollment`, en las rutas de alumno.
  fastify.get('/classes/:classId/progress', async (request: FastifyRequest<ClassParams>) => {
    return getMyProgress(request.user as ClassUser, request.studentEnrollment!, request.params.classId)
  })
}
