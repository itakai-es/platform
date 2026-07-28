import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { missionsService } from './missions.service.js'
import { z, ZodError } from 'zod'

const createMissionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  classId: z.string(),
  status: z.enum(['activa', 'bloqueada']).optional(),
  rarity: z.enum(['comun', 'rara', 'epica', 'legendaria']).optional(),
  deadline: z.string().optional(),
  backgroundImage: z.string().optional(),
  enigmas: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        xp: z.number().int().min(0).optional(),
        coins: z.number().int().min(0).optional(),
        mana: z.number().int().min(0).optional(),
        objectives: z.array(z.string()).optional(),
      })
    )
    .optional(),
})

const updateMissionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  classId: z.string().optional(),
  status: z.enum(['activa', 'bloqueada']).optional(),
  rarity: z.enum(['comun', 'rara', 'epica', 'legendaria']).optional(),
  deadline: z.string().nullable().optional(),
  backgroundImage: z.string().nullable().optional(),
})

const uploadDocumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

const enigmaSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  xp: z.number().int().min(0).optional(),
  coins: z.number().int().min(0).optional(),
  mana: z.number().int().min(0).optional(),
  objectives: z.array(z.string()).optional(),
  isOptional: z.boolean().optional(),
})

const reorderSchema = z.object({
  ids: z.array(z.string()),
})

export async function missionsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate)

  // Get all missions for current user
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { subject?: string; search?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { subject, search } = request.query
      const result = await missionsService.getMissions(id, { subject, search })
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Get enhanced missions (same as regular for now)
  fastify.get('/enhanced', async (request: FastifyRequest<{ Querystring: { category?: string; status?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await missionsService.getMissions(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Get mission filters
  fastify.get('/filters', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await missionsService.getFilters()
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Get mission stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await missionsService.getStats(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Get mission by ID
  fastify.get('/:missionId', async (request: FastifyRequest<{ Params: { missionId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { missionId } = request.params
      const result = await missionsService.getMissionById(id, missionId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Start mission
  fastify.post('/:missionId/start', async (request: FastifyRequest<{ Params: { missionId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { missionId } = request.params
      const result = await missionsService.startMission(id, missionId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Submit enigma (student submits work for review)
  fastify.post(
    '/:missionId/enigmas/:enigmaId/complete',
    async (
      request: FastifyRequest<{
        Params: { missionId: string; enigmaId: string }
        Body: { fileName?: string; fileSize?: number; submissionType?: string }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.user as { id: string }
        const { missionId, enigmaId } = request.params
        const body = request.body as { fileName?: string; fileSize?: number }
        const result = await missionsService.submitEnigma(id, missionId, enigmaId, body)
        return result
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Create mission
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id, role } = request.user as { id: string; role: string }
      if (role !== 'teacher') {
        return reply.status(403).send({ message: 'Solo profesores pueden crear misiones' })
      }
      const data = createMissionSchema.parse(request.body)
      const result = await missionsService.createMission(id, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: error.errors[0]?.message || 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Teacher: Update mission
  fastify.patch(
    '/:missionId',
    async (
      request: FastifyRequest<{ Params: { missionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden modificar misiones' })
        }
        const { missionId } = request.params
        const data = updateMissionSchema.parse(request.body)
        const result = await missionsService.updateMission(id, missionId, data)
        return result
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: error.errors[0]?.message || 'Datos inválidos', errors: error.errors })
        }
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Get mission documents
  fastify.get(
    '/:missionId/documents',
    async (request: FastifyRequest<{ Params: { missionId: string } }>, reply: FastifyReply) => {
      try {
        const { missionId } = request.params
        const result = await missionsService.getMissionDocuments(missionId)
        return result
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(404).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Upload document to mission (multipart form data)
  fastify.post(
    '/:missionId/documents',
    async (request: FastifyRequest<{ Params: { missionId: string } }>, reply: FastifyReply) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden subir documentos' })
        }
        const { missionId } = request.params

        // Handle multipart form data
        const parts = request.parts()
        let file: { buffer: Buffer; filename: string; mimetype: string } | undefined
        let name = ''
        let description = ''
        let tags: string[] = []
        let url = ''
        let type = ''

        for await (const part of parts) {
          if (part.type === 'file') {
            const buffer = await part.toBuffer()
            file = {
              buffer,
              filename: part.filename,
              mimetype: part.mimetype,
            }
          } else {
            // Field
            const value = part.value as string
            if (part.fieldname === 'name') {
              name = value
            } else if (part.fieldname === 'description') {
              description = value
            } else if (part.fieldname === 'url') {
              url = value
            } else if (part.fieldname === 'type') {
              type = value
            } else if (part.fieldname === 'tags') {
              try {
                tags = JSON.parse(value)
              } catch {
                tags = value.split(',').map((t) => t.trim()).filter(Boolean)
              }
            }
          }
        }

        // Validate name
        if (!name) {
          return reply.status(400).send({ message: 'El nombre del documento es requerido' })
        }

        const result = await missionsService.uploadMissionDocument(
          id,
          missionId,
          { name, description, tags, url, type },
          file
        )
        return reply.status(201).send(result)
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Update document metadata
  fastify.put(
    '/:missionId/documents/:documentId',
    async (
      request: FastifyRequest<{ Params: { missionId: string; documentId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden editar documentos' })
        }
        const { documentId } = request.params
        const body = request.body as { title?: string; name?: string; description?: string; tags?: string[] }

        const result = await missionsService.updateMissionDocument(id, documentId, {
          name: body.title || body.name, // Accept both 'title' and 'name'
          description: body.description,
          tags: body.tags,
        })
        return result
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Delete document from mission
  fastify.delete(
    '/:missionId/documents/:documentId',
    async (
      request: FastifyRequest<{ Params: { missionId: string; documentId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden eliminar documentos' })
        }
        const { documentId } = request.params
        const result = await missionsService.deleteMissionDocument(id, documentId)
        return result
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(404).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Create enigma
  fastify.post(
    '/:missionId/enigmas',
    async (
      request: FastifyRequest<{ Params: { missionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden crear enigmas' })
        }
        const { missionId } = request.params
        const data = enigmaSchema.parse(request.body)
        const result = await missionsService.createEnigma(id, missionId, data)
        return reply.status(201).send(result)
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
        }
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Reorder enigmas (must be before parametric /:enigmaId routes)
  fastify.put(
    '/:missionId/enigmas/reorder',
    async (
      request: FastifyRequest<{ Params: { missionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden reordenar enigmas' })
        }
        const { missionId } = request.params
        const { ids } = reorderSchema.parse(request.body)
        const result = await missionsService.reorderEnigmas(id, missionId, ids)
        return result
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
        }
        if (error instanceof Error) {
          return reply.status(404).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Update enigma
  fastify.put(
    '/:missionId/enigmas/:enigmaId',
    async (
      request: FastifyRequest<{ Params: { missionId: string; enigmaId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden editar enigmas' })
        }
        const { enigmaId } = request.params
        const data = enigmaSchema.parse(request.body)
        const result = await missionsService.updateEnigma(id, enigmaId, data)
        return result
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
        }
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Delete enigma
  fastify.delete(
    '/:missionId/enigmas/:enigmaId',
    async (
      request: FastifyRequest<{ Params: { missionId: string; enigmaId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden eliminar enigmas' })
        }
        const { enigmaId } = request.params
        const result = await missionsService.deleteEnigma(id, enigmaId)
        return result
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('ya tiene entregas')) {
            return reply.status(409).send({ message: error.message })
          }
          return reply.status(404).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Reorder documents
  fastify.put(
    '/:missionId/documents/reorder',
    async (
      request: FastifyRequest<{ Params: { missionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden reordenar documentos' })
        }
        const { missionId } = request.params
        const { ids } = reorderSchema.parse(request.body)
        const result = await missionsService.reorderDocuments(id, missionId, ids)
        return result
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
        }
        if (error instanceof Error) {
          return reply.status(404).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Teacher: Update mission rewards (assign/remove badge)
  fastify.put(
    '/:missionId/rewards',
    async (
      request: FastifyRequest<{ Params: { missionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, role } = request.user as { id: string; role: string }
        if (role !== 'teacher') {
          return reply.status(403).send({ message: 'Solo profesores pueden modificar recompensas' })
        }
        const { missionId } = request.params
        const { badgeId } = request.body as { badgeId: string | null }
        const result = await missionsService.updateMissionRewards(id, missionId, badgeId)
        return result
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )
}
