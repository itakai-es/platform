import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { teachersService } from './teachers.service.js'
import { missionsService } from '../missions/missions.service.js'
import { shopService } from '../shop/shop.service.js'
import { behaviorsService } from '../behaviors/behaviors.service.js'
import { z, ZodError } from 'zod'
import { ServiceUnavailableError } from '../../utils/errors.js'

// Schemas
const createClassSchema = z.object({
  name: z.string().min(1),
  narrative: z.string().optional(),
  schedule: z.string().optional(),
  backgroundImage: z.string().optional(),
  // Metadatos de clasificación (opcionales; alimentan los filtros de plantillas).
  subject: z.string().optional(),
  language: z.string().optional(),
  educationLevel: z.string().optional(),
  province: z.string().optional(),
})

const classSettingsSchema = z
  .object({
    shop: z.boolean(),
    coins: z.boolean(),
    mana: z.boolean(),
    rankings: z.boolean(),
    xp: z.boolean(),
    behaviors: z.boolean(),
    lives: z.boolean(),
    visualEffects: z.boolean(),
    sounds: z.boolean(),
  })
  .partial()

const updateClassSchema = z.object({
  name: z.string().optional(),
  narrative: z.string().optional(),
  schedule: z.string().optional(),
  backgroundImage: z.string().optional(),
  // Metadatos de clasificación (cadena vacía = sin especificar).
  subject: z.string().optional(),
  language: z.string().optional(),
  educationLevel: z.string().optional(),
  province: z.string().optional(),
  settings: classSettingsSchema.optional(),
})

const sendInvitationSchema = z.object({
  studentId: z.string(),
  message: z.string().optional(),
})

const rejectRequestSchema = z.object({
  reason: z.string().optional(),
})

const createBadgeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
  missionId: z.string().uuid().optional(),
})

const updateGuideSchema = z.object({
  content: z.string(),
})

const archiveClassSchema = z.object({
  archived: z.boolean(),
})

const shopItemSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  price: z.number().int().min(0),
  active: z.boolean().optional(),
  kind: z.enum(['reward', 'power']).optional(),
  manaCost: z.number().int().min(0).optional(),
  usage: z.enum(['single', 'unlimited']).optional(),
  lifeRestore: z.number().int().min(0).optional(),
})

const shopItemUpdateSchema = shopItemSchema.partial()

const behaviorSchema = z.object({
  kind: z.enum(['positive', 'negative']),
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  xp: z.number().int().min(0).optional(),
  coins: z.number().int().min(0).optional(),
  lives: z.number().int().min(0).optional(),
})

const behaviorUpdateSchema = behaviorSchema.partial()

const applyBehaviorSchema = z.object({
  studentId: z.string().uuid(),
})

const generateStudentAvatarSchema = z.object({
  avatar_id: z.string().min(1),
  wardrobe_prompt: z.string().min(1).max(500),
  background_prompt: z.string().min(1).max(500),
})

export async function teacherRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', async (request, reply) => {
    await fastify.authenticate(request, reply)
    if (reply.sent) return

    const user = request.user as { role: string | null }
    if (user.role !== 'teacher') {
      reply.status(403).send({ message: 'Acceso denegado. Solo profesores.' })
    }
  })

  // ==================== STATS ====================

  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const stats = await teachersService.getStats(id)
      return stats
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== CLASSES ====================

  fastify.get('/classes', async (request: FastifyRequest<{ Querystring: { limit?: string; archived?: 'active' | 'archived' | 'all' } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const limit = request.query.limit ? parseInt(request.query.limit) : undefined
      const archived = request.query.archived || 'active'
      const result = await teachersService.getClasses(id, limit, archived)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const cls = await teachersService.getClassById(id, classId)
      return { class: cls }
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = createClassSchema.parse(request.body)
      const result = await teachersService.createClass(id, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== SHOP (teacher) ====================

  fastify.get('/classes/:classId/shop', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      return await shopService.getTeacherShop(id, request.params.classId)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(403).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/shop/items', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = shopItemSchema.parse(request.body)
      const item = await shopService.createItem(id, request.params.classId, data)
      return reply.status(201).send(item)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof Error) {
        return reply.status(403).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/classes/:classId/shop/items/:itemId', async (request: FastifyRequest<{ Params: { classId: string; itemId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = shopItemUpdateSchema.parse(request.body)
      const item = await shopService.updateItem(id, request.params.classId, request.params.itemId, data)
      return item
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.delete('/classes/:classId/shop/items/:itemId', async (request: FastifyRequest<{ Params: { classId: string; itemId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await shopService.deleteItem(id, request.params.classId, request.params.itemId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== BEHAVIORS (teacher) ====================

  fastify.get('/classes/:classId/behaviors', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      return await behaviorsService.getBehaviors(id, request.params.classId)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(403).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/behaviors', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = behaviorSchema.parse(request.body)
      const behavior = await behaviorsService.createBehavior(id, request.params.classId, data)
      return reply.status(201).send(behavior)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof Error) {
        return reply.status(403).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/classes/:classId/behaviors/:behaviorId', async (request: FastifyRequest<{ Params: { classId: string; behaviorId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = behaviorUpdateSchema.parse(request.body)
      const behavior = await behaviorsService.updateBehavior(
        id,
        request.params.classId,
        request.params.behaviorId,
        data,
      )
      return behavior
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.delete('/classes/:classId/behaviors/:behaviorId', async (request: FastifyRequest<{ Params: { classId: string; behaviorId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await behaviorsService.deleteBehavior(
        id,
        request.params.classId,
        request.params.behaviorId,
      )
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/behaviors/:behaviorId/apply', async (request: FastifyRequest<{ Params: { classId: string; behaviorId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { studentId } = applyBehaviorSchema.parse(request.body)
      const result = await behaviorsService.applyBehavior(
        id,
        request.params.classId,
        request.params.behaviorId,
        studentId,
      )
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
  })

  fastify.put('/classes/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const data = updateClassSchema.parse(request.body)
      const result = await teachersService.updateClass(id, classId, data)
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
  })

  // ── Marketplace de plantillas ──
  fastify.post('/classes/:classId/publish-template', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { publish } = z.object({ publish: z.boolean() }).parse(request.body)
      const result = await teachersService.publishTemplate(id, request.params.classId, publish)
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
  })

  fastify.get('/templates', async (request: FastifyRequest<{ Querystring: { subject?: string; educationLevel?: string; language?: string; province?: string; q?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.listTemplates(id, request.query)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(500).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/templates/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.getTemplateDetail(id, request.params.classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/templates/:classId/import', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.importTemplate(id, request.params.classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.patch('/classes/:classId/archive', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const { archived } = archiveClassSchema.parse(request.body)
      const result = await teachersService.setClassArchived(id, classId, archived)
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
  })

  fastify.get('/classes/:classId/invitation-code', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getInvitationCode(id, classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/missions', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getClassMissions(id, classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/ranking', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getClassRanking(id, classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/activities', async (request: FastifyRequest<{ Params: { classId: string }; Querystring: { limit?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const limit = request.query.limit ? parseInt(request.query.limit) : 10
      const result = await teachersService.getClassActivities(id, classId, limit)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Update class guide
  fastify.put('/classes/:classId/guide', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const data = updateGuideSchema.parse(request.body)
      const result = await teachersService.updateClassGuide(id, classId, data.content)
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
  })

  fastify.post('/classes/:classId/students/:studentId/avatar/generate', async (request: FastifyRequest<{ Params: { classId: string; studentId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId, studentId } = request.params
      const data = generateStudentAvatarSchema.parse(request.body)
      const result = await teachersService.generateStudentAvatar(id, classId, studentId, data)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof ServiceUnavailableError) {
        return reply.status(503).send({ message: error.message, code: error.code })
      }
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== STUDENTS ====================

  fastify.get('/students', async (request: FastifyRequest<{ Querystring: { classId?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.query
      const result = await teachersService.getStudents(id, classId)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/students/:studentId', async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { studentId } = request.params
      const result = await teachersService.getStudentById(id, studentId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/students/search', async (request: FastifyRequest<{ Querystring: { q: string; classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { q, classId } = request.query
      if (!q || !classId) {
        return reply.status(400).send({ message: 'Se requieren los parámetros q y classId' })
      }
      const result = await teachersService.searchStudents(id, classId, q)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== ENROLLMENTS ====================

  fastify.get('/classes/:classId/requests', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getPendingRequests(id, classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/classes/:classId/requests/:requestId/accept', async (request: FastifyRequest<{ Params: { classId: string; requestId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId, requestId } = request.params
      const result = await teachersService.acceptJoinRequest(id, classId, requestId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/classes/:classId/requests/:requestId/reject', async (request: FastifyRequest<{ Params: { classId: string; requestId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId, requestId } = request.params
      const body = rejectRequestSchema.parse(request.body || {})
      const result = await teachersService.rejectJoinRequest(id, classId, requestId, body.reason)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/invitations', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const data = sendInvitationSchema.parse(request.body)
      const result = await teachersService.sendInvitation(id, classId, data.studentId, data.message)
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
  })

  fastify.get('/classes/:classId/invitations', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getSentInvitations(id, classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/enrollment-counts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.getTotalPendingRequests(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== MISSIONS ====================

  fastify.get('/missions', async (request: FastifyRequest<{ Querystring: { classIdFilter?: string; limit?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classIdFilter, limit } = request.query
      const result = await teachersService.getMissions(id, classIdFilter, limit ? parseInt(limit) : undefined)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/missions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const body = request.body as any

      // Map frontend field names to backend expected names
      const data = {
        title: body.title,
        description: body.description,
        classId: body.classId,
        status: body.status === 'publicada' ? 'activa' : body.status === 'borrador' ? 'bloqueada' : (body.status || 'activa'),
        rarity: body.rarity,
        deadline: body.dueDate || body.deadline,
        enigmas: body.enigmas,
      }

      const result = await missionsService.createMission(id, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/missions/:missionId', async (request: FastifyRequest<{ Params: { missionId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { missionId } = request.params
      const body = request.body as any

      const data = {
        title: body.title,
        description: body.description,
        classId: body.classId,
        status: body.status === 'publicada' ? 'activa' : body.status === 'borrador' ? 'bloqueada' : (body.status || 'activa'),
        rarity: body.rarity,
        deadline: body.dueDate || body.deadline,
      }

      const result = await missionsService.updateMission(id, missionId, data)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== ACTIVITIES ====================

  fastify.get('/activities', async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const limit = request.query.limit ? parseInt(request.query.limit) : 10
      const result = await teachersService.getActivities(id, limit)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== BADGES ====================

  fastify.get('/badges', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.getBadges(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/badges/:badgeId', async (request: FastifyRequest<{ Params: { badgeId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.getBadges(id)
      const badge = result.badges.find((b) => b.id === request.params.badgeId)
      if (!badge) {
        return reply.status(404).send({ message: 'Insignia no encontrada' })
      }
      return { badge }
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/badges', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = createBadgeSchema.parse(request.body)
      const result = await teachersService.createBadge(id, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/badges/:badgeId', async (request: FastifyRequest<{ Params: { badgeId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { badgeId } = request.params
      const data = createBadgeSchema.partial().parse(request.body)
      const result = await teachersService.updateBadge(id, badgeId, data)
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
  })

  fastify.delete('/badges/:badgeId', async (request: FastifyRequest<{ Params: { badgeId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { badgeId } = request.params
      const result = await teachersService.deleteBadge(id, badgeId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })
}
