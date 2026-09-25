import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../config/database.js'
import { z, ZodError } from 'zod'
import { aiService } from '../ai/ai.service.js'
import { checkRateLimit } from '../ai/middleware/rate-limiter.js'
import { getAIProvider } from '../ai/providers/index.js'
import { ServiceUnavailableError, rethrowHttpError } from '../../utils/errors.js'
import {
  assertClassAccess,
  assertClassMember,
  assertMissionAccess,
  assertMissionMember,
  type ClassUser,
} from '../../utils/class-access.js'

const createConversationSchema = z.object({
  message: z.string().min(1),
  assistantId: z.enum(['atenea', 'odiseo', 'penelope', 'polifemo', 'poseidon']).optional(),
  locale: z.string().optional(),
  missionId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
})

const sendMessageSchema = z.object({
  content: z.string().min(1),
  locale: z.string().optional(),
  skipUserMessage: z.boolean().optional(),
})

const ASSISTANT_IDS = ['atenea', 'odiseo', 'penelope', 'polifemo', 'poseidon'] as const

/**
 * Generate a natural conversation title using Gemini.
 * Style: short, natural, same language as user. Like ChatGPT titles.
 */
async function generateConversationTitle(userMessage: string, locale?: string): Promise<string> {
  try {
    const provider = getAIProvider()
    const lang = locale?.startsWith('en') ? 'English' : 'Spanish'
    const generated = await provider.generateText(
      `Create a very short conversation title (2-5 words) in ${lang} for this message: "${userMessage.substring(0, 150)}"\n\nRules:\n- Same language as the message\n- Natural and descriptive, like ChatGPT sidebar titles\n- No quotes, no periods, no emojis\n- Just the title, nothing else`,
      { temperature: 0.5 }
    )
    const clean = generated.replace(/['".:!?]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50)
    return clean || userMessage.substring(0, 50)
  } catch {
    return userMessage.substring(0, 50)
  }
}

/**
 * Una conversación solo se abre sobre una misión o una clase de quien pregunta:
 * el profesorado, las de sus clases; el resto, aquellas en las que está
 * matriculado. Si no, responde 404, igual que si no existieran.
 */
async function assertConversationContext(
  user: ClassUser,
  context: { missionId?: string; classId?: string }
) {
  const asTeacher = user.role === 'teacher'
  if (context.missionId) {
    await (asTeacher
      ? assertMissionAccess(context.missionId, user.id, 'mission.view')
      : assertMissionMember(context.missionId, user))
  }
  if (context.classId) {
    await (asTeacher
      ? assertClassAccess(context.classId, user.id, 'class.view')
      : assertClassMember(context.classId, user))
  }
}

function pickRandomAssistantId() {
  const randomIndex = Math.floor(Math.random() * ASSISTANT_IDS.length)
  return ASSISTANT_IDS[randomIndex]!
}

function normalizeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined
  }

  const candidate = metadata as {
    sources?: Array<{ title?: string; url: string }>
  }

  if (!candidate.sources || !Array.isArray(candidate.sources)) {
    return undefined
  }

  return {
    sources: candidate.sources
      .filter(source => source && typeof source.url === 'string')
      .map(source => ({
        title: source.title,
        url: source.url,
      })),
  }
}

function mapMessage(message: {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  metadata?: unknown
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.createdAt,
    metadata: normalizeMetadata(message.metadata),
  }
}

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/conversations', async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const limit = Math.min(parseInt(request.query.limit || '20', 10) || 20, 50)
      const offset = parseInt(request.query.offset || '0', 10) || 0

      const [conversations, total] = await Promise.all([
        prisma.chatConversation.findMany({
          where: { userId: id, archived: false },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
          // Don't load messages in listing — only load when opening a conversation
          select: {
            id: true,
            title: true,
            assistantId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.chatConversation.count({ where: { userId: id, archived: false } }),
      ])

      return {
        conversations: conversations.map((c) => ({
          id: c.id,
          title: c.title || 'Nueva conversacion',
          assistantId: c.assistantId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messages: [], // Empty — loaded on demand when conversation is opened
        })),
        total,
        hasMore: offset + limit < total,
      }
    } catch {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/conversations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as { id: string; role: string | null }
      const { id } = user
      const data = createConversationSchema.parse(request.body)
      await assertConversationContext(user, data)
      const assistantId = data.assistantId || pickRandomAssistantId()

      // Create conversation + save user message only. No AI call.
      // Frontend will use the SSE /messages/stream endpoint for the AI response.
      const conversation = await prisma.chatConversation.create({
        data: {
          userId: id,
          assistantId,
          title: data.message.substring(0, 60),
          ...(data.missionId ? { missionId: data.missionId } : {}),
          ...(data.classId ? { classId: data.classId } : {}),
        },
      })

      const userMessage = await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: data.message,
        },
      })

      return reply.status(201).send({
        conversation: {
          id: conversation.id,
          title: conversation.title || 'Nueva conversacion',
          assistantId: conversation.assistantId,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          messages: [mapMessage(userMessage)],
        },
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos invalidos', errors: error.errors })
      }
      rethrowHttpError(error)

      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/conversations/:conversationId', async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { conversationId } = request.params

      const conversation = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId: id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!conversation) {
        return reply.status(404).send({ message: 'Conversacion no encontrada' })
      }

      return {
        conversation: {
          id: conversation.id,
          title: conversation.title || 'Nueva conversacion',
          assistantId: conversation.assistantId,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          messages: conversation.messages.map(mapMessage),
        },
      }
    } catch {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/conversations/:conversationId/messages', async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    try {
      const { id, role } = request.user as { id: string; role: string | null }
      const { conversationId } = request.params
      const data = sendMessageSchema.parse(request.body)

      // Rate limiting
      const rateCheck = checkRateLimit(id)
      if (!rateCheck.allowed) {
        return reply.status(429).send({
          message: 'Has alcanzado el limite de mensajes por hora. Intentalo de nuevo en unos minutos.',
          resetInSeconds: rateCheck.resetInSeconds,
        })
      }

      const conversation = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId: id },
      })

      if (!conversation) {
        return reply.status(404).send({ message: 'Conversacion no encontrada' })
      }

      // Save user message (skip if already saved, e.g. from createConversation)
      let userMessage = null
      if (!data.skipUserMessage) {
        userMessage = await prisma.chatMessage.create({
          data: {
            conversationId,
            role: 'user',
            content: data.content,
          },
        })
      }

      const aiResponse = await aiService.respondInChat({
        userId: id,
        role,
        assistantId: conversation.assistantId,
        message: data.content,
        locale: data.locale,
        conversationId,
        missionId: conversation.missionId ?? undefined,
      })

      const assistantMessage = await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: aiResponse.content,
        },
      })

      // Generate smart title on first exchange
      let title = conversation.title
      if (!title || title === data.content.substring(0, 60)) {
        title = await generateConversationTitle(data.content, data.locale)
      }

      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date(), title },
      })

      return {
        message: userMessage ? mapMessage(userMessage) : null,
        assistantMessage: mapMessage(assistantMessage),
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos invalidos', errors: error.errors })
      }

      if (error instanceof ServiceUnavailableError) {
        return reply.status(503).send({ message: error.message, code: error.code })
      }

      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // SSE streaming endpoint for chat messages
  fastify.post('/conversations/:conversationId/messages/stream', async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    try {
      const { id, role } = request.user as { id: string; role: string | null }
      const { conversationId } = request.params
      const data = sendMessageSchema.parse(request.body)

      // Rate limiting
      const rateCheck = checkRateLimit(id)
      if (!rateCheck.allowed) {
        return reply.status(429).send({
          message: 'Has alcanzado el limite de mensajes por hora.',
          resetInSeconds: rateCheck.resetInSeconds,
        })
      }

      const conversation = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId: id },
      })

      if (!conversation) {
        return reply.status(404).send({ message: 'Conversacion no encontrada' })
      }

      // Save user message (skip if already saved, e.g. from createConversation)
      let userMessage = null
      if (!data.skipUserMessage) {
        userMessage = await prisma.chatMessage.create({
          data: {
            conversationId,
            role: 'user',
            content: data.content,
          },
        })
      }

      // Set SSE headers with CORS for cross-origin streaming
      const origin = request.headers.origin
      const sseHeaders: Record<string, string> = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
      if (origin) {
        sseHeaders['Access-Control-Allow-Origin'] = origin
        sseHeaders['Access-Control-Allow-Credentials'] = 'true'
      }
      reply.raw.writeHead(200, sseHeaders)

      // Send user message event (only if we created one)
      if (userMessage) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'user_message', message: mapMessage(userMessage) })}\n\n`)
      }

      // Stream AI response — all errors after this point must NOT use reply.status() (headers already sent)
      let fullContent = ''
      try {
        const stream = aiService.respondInChatStream({
          userId: id,
          role,
          assistantId: conversation.assistantId,
          message: data.content,
          locale: data.locale,
          conversationId,
          missionId: conversation.missionId ?? undefined,
        })

        for await (const chunk of stream) {
          fullContent += chunk
          if (!reply.raw.destroyed) {
            reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
          }
        }
      } catch {
        if (!fullContent) {
          fullContent = role === 'teacher'
            ? 'Lo siento, no he podido procesar tu consulta en este momento. Intentalo de nuevo.'
            : 'Disculpa, no he podido ayudarte ahora mismo. Vuelve a intentarlo en unos momentos.'
          if (!reply.raw.destroyed) {
            reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: fullContent })}\n\n`)
          }
        }
      }

      // Save + close — errors here logged but don't crash (headers already sent)
      try {
        const assistantMessage = await prisma.chatMessage.create({
          data: { conversationId, role: 'assistant', content: fullContent },
        })

        // Generate smart title on first message
        let title = conversation.title
        if (!title || title === data.content.substring(0, 60)) {
          title = await generateConversationTitle(data.content, data.locale)
        }

        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date(), title },
        })

        if (!reply.raw.destroyed) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessage.id, title })}\n\n`)
        }
      } catch (dbError) {
        console.error('[SSE] DB save failed after stream:', dbError)
      }

      if (!reply.raw.destroyed) {
        reply.raw.end()
      }
    } catch (error) {
      // Only reached if error happens BEFORE SSE headers are written (validation, auth, 404)
      if (!reply.raw.headersSent) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: 'Datos invalidos', errors: error.errors })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
      // Headers already sent — just close the stream
      if (!reply.raw.destroyed) {
        reply.raw.end()
      }
    }
  })

  fastify.delete('/conversations/:conversationId', async (request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { conversationId } = request.params

      const conversation = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId: id },
      })

      if (!conversation) {
        return reply.status(404).send({ message: 'Conversacion no encontrada' })
      }

      await prisma.chatConversation.delete({
        where: { id: conversationId },
      })

      return { message: 'Conversacion eliminada' }
    } catch {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })
}
