import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { studentsService, AvatarServiceUnavailableError } from './students.service.js'
import { shopService } from '../shop/shop.service.js'
import { z, ZodError } from 'zod'
import { rethrowHttpError } from '../../utils/errors.js'
import { requireStudentEnrollment } from '../../utils/class-access.js'
import { PASSWORD_MIN_LENGTH } from '../../utils/password.js'
import { currentTokenFamily } from '../../utils/session-cookie.js'

type RequestUser = { id: string; role: string | null }

// Schemas
const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nickname: z.string().optional(),
  bio: z.string().optional(),
})

const updateAvatarSchema = z.object({
  avatar: z.string(),
})

const generateAvatarSchema = z.object({
  prompt: z.string(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
  confirmPassword: z.string(),
})

const joinClassSchema = z.object({
  code: z.string(),
})

const joinRequestSchema = z.object({
  code: z.string(),
  message: z.string().optional(),
})

const updateClassProfileSchema = z.object({
  nickname: z.string().min(1).max(20).optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
})

const generateClassAvatarSchema = z.union([
  z.object({
    avatar_id: z.string().min(1),
    prompt: z.string().min(1).max(1000),
  }),
  z.object({
    avatar_id: z.string().min(1),
    wardrobe_prompt: z.string().min(1).max(500),
    background_prompt: z.string().min(1).max(500),
  }),
])

export async function studentsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate)

  // Toda ruta con `:classId` exige la matrícula con la que se actúa como alumno en
  // esa clase: la del alumno o, para el profesorado de la clase, la de vista
  // previa. La guía es la excepción: también la lee el profesorado sin matrícula.
  const enrolled = requireStudentEnrollment()
  fastify.addHook('preHandler', async (request, reply) => {
    if (reply.sent) return
    const { classId } = request.params as { classId?: string }
    if (!classId || request.routeOptions.url?.endsWith('/classes/:classId/guide')) return
    await enrolled(request, reply)
  })

  // ==================== PROFILE ====================

  fastify.get('/profile/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const profile = await studentsService.getProfile(id)
      return { profile }
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/profile/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = updateProfileSchema.parse(request.body)
      const profile = await studentsService.updateProfile(id, data)
      return { profile, message: 'Perfil actualizado correctamente' }
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // NOTE: Avatar is per-class, updated via enrollment endpoints

  fastify.post('/profile/me/avatar/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = generateAvatarSchema.parse(request.body)
      const result = await studentsService.generateAvatar(id, data.prompt)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/profile/me/password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = changePasswordSchema.parse(request.body)
      const result = await studentsService.changePassword(
        id,
        data,
        await currentTokenFamily(request)
      )
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== PREVIEW (ver como alumno) ====================

  // El profesor se auto-matricula (oculto) en sus clases para previsualizarlas
  // como alumno. Seguro para cualquier usuario: solo matricula en clases propias.
  fastify.post('/preview/enroll', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await studentsService.ensurePreviewEnrollments(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== CLASSES ====================

  fastify.get('/classes', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await studentsService.getClasses(request.user as RequestUser)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const cls = await studentsService.getClassById(id, classId)
      return { class: cls }
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/guide', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { classId } = request.params
      const result = await studentsService.getClassGuide(request.user as RequestUser, classId)
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
      const result = await studentsService.getClassMissions(id, classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/gamification', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const gamification = await studentsService.getClassGamification(id, classId)
      return { gamification }
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/ranking', async (request: FastifyRequest<{ Params: { classId: string }; Querystring: { filter?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const { filter } = request.query
      const result = await studentsService.getClassRanking(id, classId, filter)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== SHOP (student) ====================

  fastify.get('/classes/:classId/shop', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      return await shopService.getStudentShop(id, classId)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/shop/purchase', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const { itemId } = z.object({ itemId: z.string().min(1) }).parse(request.body)
      return await shopService.purchase(id, classId, itemId)
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

  fastify.post('/classes/:classId/shop/use', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const { itemId } = z.object({ itemId: z.string().min(1) }).parse(request.body)
      return await shopService.usePower(id, classId, itemId)
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

  fastify.post('/classes/:classId/shop/redeem', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const { itemId } = z.object({ itemId: z.string().min(1) }).parse(request.body)
      return await shopService.redeemReward(id, classId, itemId)
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

  fastify.get('/classes/:classId/badges', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await studentsService.getClassBadges(id, classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/activities', async (request: FastifyRequest<{ Params: { classId: string }; Querystring: { offset?: string; limit?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const offset = request.query.offset ? parseInt(request.query.offset) : 0
      const limit = request.query.limit ? parseInt(request.query.limit) : 5
      const result = await studentsService.getClassActivities(id, classId, offset, limit)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/classes/:classId/profile', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const data = updateClassProfileSchema.parse(request.body)
      const result = await studentsService.updateClassProfile(id, classId, data)
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

  fastify.post('/classes/:classId/avatar/generate', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const data = generateClassAvatarSchema.parse(request.body)
      const result = await studentsService.generateClassAvatar(id, classId, data)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof AvatarServiceUnavailableError) {
        return reply.status(503).send({ message: error.message, code: 'AVATAR_SERVICE_UNAVAILABLE' })
      }
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/join', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = joinClassSchema.parse(request.body)
      const result = await studentsService.joinClass(request.user as RequestUser, data.code)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/request', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = joinRequestSchema.parse(request.body)
      const result = await studentsService.createJoinRequest(
        request.user as RequestUser,
        data.code,
        data.message
      )
      return reply.status(201).send(result)
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== ENROLLMENTS ====================

  fastify.get('/join-requests', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await studentsService.getJoinRequests(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/invitations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await studentsService.getInvitations(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/invitations/:invitationId/accept', async (request: FastifyRequest<{ Params: { invitationId: string } }>, reply: FastifyReply) => {
    try {
      const { invitationId } = request.params
      const result = await studentsService.acceptInvitation(
        request.user as RequestUser,
        invitationId
      )
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/invitations/:invitationId/reject', async (request: FastifyRequest<{ Params: { invitationId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { invitationId } = request.params
      const result = await studentsService.rejectInvitation(id, invitationId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/enrollment-counts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await studentsService.getEnrollmentCounts(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== MISSIONS ====================

  fastify.get('/missions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await studentsService.getMissions(request.user as RequestUser)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== BADGES & ACHIEVEMENTS ====================

  fastify.get('/badges', async (request: FastifyRequest<{ Querystring: { filter?: string; category?: string } }>, reply: FastifyReply) => {
    try {
      const { filter, category } = request.query
      const result = await studentsService.getBadges(request.user as RequestUser, filter, category)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/badges/:badgeId', async (request: FastifyRequest<{ Params: { badgeId: string } }>, reply: FastifyReply) => {
    try {
      const result = await studentsService.getBadges(request.user as RequestUser)
      const badge = result.badges.find((b) => b.id === request.params.badgeId)
      if (!badge) {
        return reply.status(404).send({ message: 'Insignia no encontrada' })
      }
      return { badge }
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })


  // ==================== ACTIVITIES ====================

  fastify.get('/activities', async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const limit = request.query.limit ? parseInt(request.query.limit) : 10
      const result = await studentsService.getActivities(id, limit)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })
}
