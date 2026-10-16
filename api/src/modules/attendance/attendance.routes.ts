import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { BATCH_MAX } from '../behaviors/behaviors.service.js'
import { ATTENDANCE_STATUSES, attendanceService } from './attendance.service.js'

/**
 * Asistencia de una clase (ver attendance.service.ts). Se registra dentro de las
 * rutas de profesorado, que ya exigen sesión y papel; el acceso a la clase lo
 * comprueba el servicio y los errores los traduce el manejador global.
 */

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora no válida')

const dayQuery = z.object({ date: dateKey })
const rangeQuery = z.object({ from: dateKey, to: dateKey, studentId: z.string().uuid().optional() })

const saveSchema = z.object({
  date: dateKey,
  // "" es la sesión sin horario («Sesión de hoy»).
  startTime: z.union([z.literal(''), time]),
  endTime: z.union([z.literal(''), time]).nullish(),
  source: z.enum(['schedule', 'manual']).default('manual'),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(ATTENDANCE_STATUSES),
        note: z.string().max(200).nullish(),
      })
    )
    .max(BATCH_MAX),
})

type ClassParams = { Params: { classId: string } }

export async function attendanceRoutes(fastify: FastifyInstance) {
  fastify.get('/classes/:classId/attendance', async (request: FastifyRequest<ClassParams>) => {
    const { id } = request.user as { id: string }
    const { date } = dayQuery.parse(request.query)
    return attendanceService.getDay(id, request.params.classId, date)
  })

  fastify.get(
    '/classes/:classId/attendance/current',
    async (request: FastifyRequest<ClassParams>) => {
      const { id } = request.user as { id: string }
      const { date } = dayQuery.parse(request.query)
      return attendanceService.getCurrent(id, request.params.classId, date)
    }
  )

  fastify.get(
    '/classes/:classId/attendance/summary',
    async (request: FastifyRequest<ClassParams>) => {
      const { id } = request.user as { id: string }
      const { from, to, studentId } = rangeQuery.parse(request.query)
      return attendanceService.getSummary(id, request.params.classId, from, to, studentId)
    }
  )

  // Los datos del CSV; el fichero lo compone el navegador, como el de credenciales.
  fastify.get(
    '/classes/:classId/attendance/export',
    async (request: FastifyRequest<ClassParams>) => {
      const { id } = request.user as { id: string }
      const { from, to } = rangeQuery.parse(request.query)
      return attendanceService.getExport(id, request.params.classId, from, to)
    }
  )

  fastify.put(
    '/classes/:classId/attendance/sessions',
    async (request: FastifyRequest<ClassParams>) => {
      const { id } = request.user as { id: string }
      const input = saveSchema.parse(request.body)
      return attendanceService.saveSession(id, request.params.classId, input)
    }
  )

  fastify.delete(
    '/classes/:classId/attendance/sessions/:sessionId',
    async (request: FastifyRequest<{ Params: { classId: string; sessionId: string } }>) => {
      const { id } = request.user as { id: string }
      return attendanceService.deleteSession(id, request.params.classId, request.params.sessionId)
    }
  )
}
