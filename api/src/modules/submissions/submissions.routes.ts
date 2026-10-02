import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { submissionsService } from './submissions.service.js'
import { rethrowHttpError } from '../../utils/errors.js'

export async function submissionsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate)

  // Student: Submit enigma
  fastify.post(
    '/enigmas/:enigmaId',
    async (request: FastifyRequest<{ Params: { enigmaId: string } }>, reply: FastifyReply) => {
      try {
        const { id, role } = request.user as { id: string; role: string | null }
        const { enigmaId } = request.params

        // Handle multipart form data
        let file: { buffer: Buffer; filename: string; mimetype: string } | undefined

        const data = await request.file()
        if (data) {
          const buffer = await data.toBuffer()
          file = {
            buffer,
            filename: data.filename,
            mimetype: data.mimetype,
          }
        }

        const result = await submissionsService.submitEnigma({ id, role }, enigmaId, file)
        return reply.status(201).send(result)
      } catch (error) {
        rethrowHttpError(error)
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Student: Get my submissions
  fastify.get(
    '/my',
    async (request: FastifyRequest<{ Querystring: { status?: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.user as { id: string }
        const { status } = request.query
        const result = await submissionsService.getMySubmissions(id, status)
        return result
      } catch (error) {
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Student: Get submissions for an enigma
  fastify.get(
    '/enigmas/:enigmaId',
    async (request: FastifyRequest<{ Params: { enigmaId: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.user as { id: string }
        const { enigmaId } = request.params
        const result = await submissionsService.getEnigmaSubmissions(id, enigmaId)
        return result
      } catch (error) {
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Get submissions for an enigma
  fastify.get(
    '/teacher/enigmas/:enigmaId',
    async (
      request: FastifyRequest<{ Params: { enigmaId: string }; Querystring: { status?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo el profesorado puede ver entregas' })
        }
        const { enigmaId } = request.params
        const { status } = request.query
        const result = await submissionsService.getEnigmaSubmissionsForTeacher(id, enigmaId, status)
        return result
      } catch (error) {
        // Sin acceso a la clase, 404; con un nivel que no llega, 403.
        rethrowHttpError(error)
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Get class submissions
  fastify.get(
    '/classes/:classId',
    async (
      request: FastifyRequest<{ Params: { classId: string }; Querystring: { status?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo el profesorado puede ver entregas' })
        }
        const { classId } = request.params
        const { status } = request.query
        const result = await submissionsService.getClassSubmissions(id, classId, status)
        return result
      } catch (error) {
        rethrowHttpError(error)
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Approve submission
  fastify.post(
    '/:submissionId/approve',
    async (
      request: FastifyRequest<{
        Params: { submissionId: string }
        Body: { xpAwarded?: number; percentage?: number }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo el profesorado puede aprobar entregas' })
        }
        const { submissionId } = request.params
        const { xpAwarded, percentage } = request.body || {}
        const result = await submissionsService.approveSubmission(id, submissionId, {
          xpAwarded,
          percentage,
        })
        return result
      } catch (error) {
        rethrowHttpError(error)
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )
}
