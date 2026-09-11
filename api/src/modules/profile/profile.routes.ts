import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { profileService } from './profile.service.js'
import { z, ZodError } from 'zod'
import { prisma } from '../../config/database.js'
import { APP_LANGUAGES } from '../settings/settings.types.js'

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token'

// Schemas
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

const changeEmailSchema = z.object({
  newEmail: z.string().email(),
  password: z.string().optional(),
})

const toggleTwoFactorSchema = z.object({
  enabled: z.boolean(),
})

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  missionReminders: z.boolean().optional(),
  language: z.enum(APP_LANGUAGES).optional(),
  theme: z.enum(['college', 'university']).optional(),
  menuDisplay: z.enum(['both', 'icon', 'text']).optional(),
  // Accesibilidad (Fase 3, punto 14)
  fontScale: z.enum(['normal', 'large', 'xlarge']).optional(),
  contrastMode: z.enum(['normal', 'high']).optional(),
  colorVision: z.enum(['default', 'protanopia', 'deuteranopia', 'tritanopia']).optional(),
  reduceMotion: z.boolean().optional(),
})

const deleteAccountSchema = z.object({
  password: z.string().min(1),
})

/**
 * Get the current token family from the refresh token cookie
 */
async function getCurrentTokenFamily(request: FastifyRequest): Promise<string | undefined> {
  const cookieToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME]
  if (!cookieToken) return undefined

  const token = await prisma.refreshToken.findUnique({
    where: { token: cookieToken },
    select: { family: true },
  })

  return token?.family
}

export async function profileRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /profile - Get user profile with security and preferences
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const currentFamily = await getCurrentTokenFamily(request)
      const result = await profileService.getProfile(id, currentFamily)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // POST /profile/change-password
  fastify.post('/change-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = changePasswordSchema.parse(request.body)
      const result = await profileService.changePassword(id, data)
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

  // POST /profile/change-email
  fastify.post('/change-email', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = changeEmailSchema.parse(request.body)
      const result = await profileService.changeEmail(id, data)
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

  // POST /profile/two-factor
  fastify.post('/two-factor', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = toggleTwoFactorSchema.parse(request.body)
      const result = await profileService.toggleTwoFactor(id, data.enabled)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // DELETE /profile/sessions/:id - Close specific session
  fastify.delete('/sessions/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id: userId } = request.user as { id: string }
      const { id: sessionId } = request.params
      const result = await profileService.closeSession(userId, sessionId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // DELETE /profile/sessions - Close all sessions except current
  fastify.delete('/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const currentFamily = await getCurrentTokenFamily(request)
      const result = await profileService.closeAllSessions(id, currentFamily)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // PATCH /profile/preferences
  fastify.patch('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = updatePreferencesSchema.parse(request.body)
      const result = await profileService.updatePreferences(id, data)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // GET /profile/export
  fastify.get('/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await profileService.exportUserData(id)
      const timestamp = new Date().toISOString().slice(0, 10)

      reply.header('Content-Type', 'application/json; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename=\"itakai-profile-export-${timestamp}.json\"`)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // DELETE /profile/delete-account
  fastify.delete('/delete-account', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = deleteAccountSchema.parse(request.body)
      const result = await profileService.deleteAccount(id, data.password)
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
}
