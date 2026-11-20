import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z, ZodError } from 'zod'
import {
  centerInput, createCenter, getProfessionalProfile, RegistrationError, saveDraft, saveProfile, searchCenters,
} from './teacher-registration.service.js'

export function registrationHandler(handler: (request: FastifyRequest) => Promise<unknown>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(request)
    } catch (error) {
      if (error instanceof RegistrationError) return reply.code(error.status).send({ message: error.message })
      if (error instanceof ZodError) {
        return reply.code(400).send({
          message: 'Revisa las respuestas obligatorias',
          fields: error.issues.map(issue => issue.path.join('.')),
        })
      }
      throw error
    }
  }
}

function ownUserId(request: FastifyRequest) {
  return (request.user as { id: string }).id
}

export async function teacherRegistrationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    await fastify.authenticate(request, reply)
    if (reply.sent) return
    if ((request.user as { role: string | null }).role !== 'teacher') {
      return reply.code(403).send({ message: 'Acceso denegado' })
    }
  })
  fastify.get('/profile', registrationHandler(async request => ({ profile: await getProfessionalProfile(ownUserId(request)) })))
  fastify.patch('/draft', registrationHandler(request => saveDraft(ownUserId(request), request.body)))
  fastify.post('/finish', registrationHandler(request => saveProfile(ownUserId(request), request.body, true)))
  fastify.put('/profile', registrationHandler(request => saveProfile(ownUserId(request), request.body, false)))
  fastify.get('/centers', registrationHandler(request => {
    const { q } = z.object({ q: z.string().trim().max(200).default('') }).parse(request.query)
    return searchCenters(q)
  }))
  fastify.post('/centers', registrationHandler(request => createCenter(centerInput.parse(request.body))))
}
