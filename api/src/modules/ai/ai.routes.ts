import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z, ZodError } from 'zod'
import { prisma } from '../../config/database.js'
import { aiService } from './ai.service.js'
import { ensureSafeEducationalPrompt } from './ai-safety.js'
import { getAIProvider, getLastUsedProvider } from './providers/index.js'
import { checkRateLimit } from './middleware/rate-limiter.js'
import * as Prompts from './prompts/index.js'
import { ServiceUnavailableError } from '../../utils/errors.js'
import { getAiSettings } from '../settings/settings.service.js'

const narrativeSchema = z.object({
  prompt: z.string().min(1),
  locale: z.string().optional(),
  classId: z.string().optional(),
})

const imageSchema = z.object({
  prompt: z.string().min(1),
  locale: z.string().optional(),
  type: z.enum(['narratives', 'badges', 'avatars', 'covers']).default('covers'),
})

const quizSchema = z.object({
  prompt: z.string().min(1),
  locale: z.string().optional(),
  count: z.number().int().min(1).max(7).optional(),
})

const classAssistantSchema = z.object({
  message: z.string().min(1),
  locale: z.string().optional(),
  teacherName: z.string().optional(),
})

const classCoverSchema = z.object({
  prompt: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  locale: z.string().optional(),
})

const missionAssistantSchema = z.object({
  message: z.string().min(1),
  classId: z.string().optional(),
  assistantId: z.string().optional(),
  locale: z.string().optional(),
})

function resolveLocale(locale?: string) {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'es'
}

function handleAiRouteError(error: unknown, reply: FastifyReply, locale: string) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: locale === 'en' ? 'Invalid data' : 'Datos invalidos',
      errors: error.errors,
    })
  }

  if (error instanceof ServiceUnavailableError) {
    const message = locale === 'en'
      ? 'The AI service is temporarily unavailable. Please try again in a few minutes.'
      : error.message
    return reply.status(503).send({ message, code: error.code })
  }

  if (error instanceof Error) {
    return reply.status(400).send({ message: error.message })
  }

  return reply.status(500).send({ message: locale === 'en' ? 'Internal error' : 'Error interno' })
}

function sseHeaders(request: FastifyRequest) {
  const origin = request.headers.origin
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  return headers
}

type SparkTimingStats = {
  count?: number
  inflight?: number
  avg_latency_ms?: number
  last_latency_ms?: number | null
  min_latency_ms?: number | null
}

type SparkTimingSummary = {
  chat_queue_depth?: number
  image_queue_depth?: number
  avatar_queue_depth?: number
  by_kind?: Record<string, SparkTimingStats>
  by_key?: Record<string, SparkTimingStats>
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function secondsFromStats(
  stats: SparkTimingStats | undefined,
  fallbackSeconds: number,
  options: { preferRecent?: boolean; maxTrustedMs?: number; maxSeconds?: number } = {},
) {
  const values = [
    positiveNumber(stats?.last_latency_ms),
    positiveNumber(stats?.min_latency_ms),
    positiveNumber(stats?.avg_latency_ms),
  ].filter((value): value is number => value !== null)

  const trustedValues = options.maxTrustedMs
    ? values.filter(value => value <= options.maxTrustedMs!)
    : values

  const selectedMs = trustedValues.length > 0
    ? (options.preferRecent ? trustedValues[0] : Math.min(...trustedValues))
    : fallbackSeconds * 1000

  const rounded = Math.max(1, Math.round(selectedMs / 1000))
  return options.maxSeconds ? Math.min(options.maxSeconds, rounded) : rounded
}

async function streamNarrativeResponse(
  reply: FastifyReply,
  stream: AsyncIterable<string>
) {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  for await (const chunk of stream) {
    reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`)
  }

  reply.raw.write('event: done\ndata: {}\n\n')
  reply.raw.end()
  return reply
}

/**
 * Parse a JSON block from Gemini text output.
 * Gemini often wraps JSON in ```json ... ``` markers.
 */
function extractJson<T>(text: string): T | null {
  // Try raw parse first
  try { return JSON.parse(text) } catch { /* continue */ }

  // Try extracting from markdown code block
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch?.[1]) {
    try { return JSON.parse(jsonMatch[1].trim()) } catch { /* continue */ }
  }

  // Try finding first { ... } block
  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]) } catch { /* continue */ }
  }

  return null
}

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url === '/timings' || request.url === '/ai/timings') return
    await fastify.authenticate(request, reply)
  })

  // --- Suggest class names (for wizard step 1) ---

  fastify.post('/suggest-class-names', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.user as { id: string }
    const rateCheck = checkRateLimit(id)
    if (!rateCheck.allowed) {
      return reply.status(429).send({ message: 'Limite de peticiones alcanzado', resetInSeconds: rateCheck.resetInSeconds })
    }
    const data = z.object({
      locale: z.string().optional(),
      context: z.string().max(2000).optional(),
      feedback: z.string().max(500).optional(),
    }).parse(request.body)
    const locale = resolveLocale(data.locale)

    try {
      const provider = getAIProvider()

      const contextPart = data.context
        ? (locale === 'en'
          ? `Context about the class the teacher wants to create: ${data.context}`
          : `Contexto sobre la clase que el profesor quiere crear: ${data.context}`)
        : ''
      const feedbackPart = data.feedback
        ? (locale === 'en'
          ? `The teacher says about the titles: "${data.feedback}". Take their feedback into account.`
          : `El profesor dice sobre los titulos: "${data.feedback}". Ten en cuenta su feedback.`)
        : ''

      const prompt = locale === 'en'
        ? `${contextPart} ${feedbackPart} Generate exactly 6 class title options. They should be real class names suitable for a school, with the topic and level when relevant. Return ONLY a JSON array of strings. No extra text.`
        : `${contextPart} ${feedbackPart} Genera exactamente 6 opciones de titulo para la clase. Deben ser nombres reales adecuados para un centro educativo, con la asignatura y nivel cuando sea relevante. Devuelve SOLO un array JSON de strings. Sin texto extra.`

      const text = await provider.generateText(prompt, { locale, temperature: 0.9 })
      const parsed = extractJson<string[]>(text)

      if (Array.isArray(parsed) && parsed.length > 0) {
        return { names: parsed.slice(0, 6).map(n => String(n).slice(0, 80)) }
      }

      const lines = text.split(/[\n,]/).map(l => l.replace(/^[-•*\d.)""\[\]\s]+/, '').replace(/[""\[\]]/g, '').trim()).filter(l => l.length > 2 && l.length < 80)
      return { names: lines.slice(0, 6) }
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  // --- Generator endpoints (for form buttons) ---

  fastify.post('/generate/narrative', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const data = narrativeSchema.parse(request.body)
      const safePrompt = ensureSafeEducationalPrompt(data.prompt)
      const stream = aiService.streamNarrative({
        prompt: safePrompt,
        locale,
        classId: data.classId,
      })

      return streamNarrativeResponse(reply, stream)
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  fastify.post('/generate/image', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const data = imageSchema.parse(request.body)
      const safePrompt = ensureSafeEducationalPrompt(data.prompt)
      const result = await aiService.createImage({
        prompt: safePrompt,
        locale,
        type: data.type,
      })

      return result
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  fastify.post('/generate/quiz', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const data = quizSchema.parse(request.body)
      const safePrompt = ensureSafeEducationalPrompt(data.prompt)
      const result = await aiService.createQuiz({
        prompt: safePrompt,
        locale,
        count: data.count,
      })

      return result
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  // --- Form assistant endpoints (Gemini-powered) ---

  fastify.post('/class-assistant', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const data = classAssistantSchema.parse(request.body)
      const safeMessage = ensureSafeEducationalPrompt(data.message)
      const provider = getAIProvider()
      // Sanitize teacherName to prevent prompt injection — only allow alphanumeric + spaces
      const rawName = data.teacherName || (locale === 'en' ? 'teacher' : 'profesor')
      const teacherName = rawName.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s]/g, '').trim().slice(0, 50) || 'profesor'

      const systemPrompt = locale === 'en'
        ? `You are Atenea, a class creation assistant helping ${teacherName}. Generate a class proposal based on their request. Respond ONLY with a JSON object: { "name": "class name", "description": "2-3 sentence description", "schedule": "suggested schedule", "message": "brief explanation addressing ${teacherName} by name" }. No markdown, no extra text — pure JSON only.`
        : `Eres Atenea, asistente de creacion de clases ayudando a ${teacherName}. Genera una propuesta de clase basada en su peticion. Responde SOLO con un objeto JSON: { "name": "nombre de la clase", "description": "descripcion de 2-3 frases", "schedule": "horario sugerido", "message": "explicacion breve dirigida a ${teacherName} por su nombre" }. Sin markdown, sin texto extra — solo JSON puro.`

      const text = await provider.generateText(safeMessage, {
        systemPrompt,
        locale,
        temperature: 0.7,
      })

      const parsed = extractJson<{ name?: string; description?: string; schedule?: string; message?: string }>(text)

      if (parsed?.name) {
        return {
          message: parsed.message || (locale === 'en' ? 'Here is my class proposal.' : 'Aqui tienes mi propuesta de clase.'),
          suggestions: locale === 'en'
            ? ['Make it harder', 'Give me another idea', 'Suggest a cover']
            : ['Hazla mas dificil', 'Dame otra idea', 'Sugiere una portada'],
          formData: {
            name: parsed.name,
            description: parsed.description || '',
            schedule: parsed.schedule || '',
          },
        }
      }

      // Gemini didn't return valid JSON — return text as message without formData
      return {
        message: text.slice(0, 500),
        suggestions: locale === 'en'
          ? ['Math class', 'History class', 'Science class']
          : ['Clase de matematicas', 'Clase de historia', 'Clase de ciencias'],
      }
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  // Truncate at the last sentence boundary (period, newline) before maxLen,
  // so the AI never receives a half-cut sentence.
  function truncateClean(text: string | undefined, maxLen = 1500): string | undefined {
    if (!text) return undefined
    const trimmed = text.trim()
    if (trimmed.length <= maxLen) return trimmed
    const slice = trimmed.slice(0, maxLen)
    const lastBoundary = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.\n'), slice.lastIndexOf('\n'))
    return (lastBoundary > maxLen * 0.5 ? slice.slice(0, lastBoundary + 1) : slice).trim()
  }

  fastify.post('/class-cover', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const data = classCoverSchema.parse(request.body)
      const title = data.name?.trim()
      const description = truncateClean(data.description)
      const compact = [title && `Title: ${title}`, description && `Description: ${description}`]
        .filter(Boolean)
        .join('\n')
      const fallback = data.prompt?.trim() || (locale === 'en' ? 'educational class cover' : 'portada educativa de clase')

      const result = await aiService.createImage({
        prompt: ensureSafeEducationalPrompt(compact || fallback),
        locale,
        type: 'covers',
      })

      return {
        imageUrl: result.fileUrl,
        prompt: data.name || data.prompt || (locale === 'en' ? 'class cover' : 'portada de clase'),
        provider: getLastUsedProvider(),
      }
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  // Mission cover generation
  const missionCoverSchema = z.object({
    prompt: z.string().optional(),
    title: z.string().optional(),
    narrative: z.string().optional(),
    locale: z.string().optional(),
  })

  fastify.post('/mission-cover', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const data = missionCoverSchema.parse(request.body)
      const title = data.title?.trim()
      const narrative = truncateClean(data.narrative)
      const compact = [title && `Title: ${title}`, narrative && `Narrative: ${narrative}`]
        .filter(Boolean)
        .join('\n')
      const fallback = data.prompt?.trim() || (locale === 'en' ? 'educational mission cover' : 'portada de misión educativa')

      const result = await aiService.createImage({
        prompt: ensureSafeEducationalPrompt(compact || fallback),
        locale,
        type: 'covers',
      })

      return {
        imageUrl: result.fileUrl,
        prompt: data.title || data.prompt || (locale === 'en' ? 'mission cover' : 'portada de misión'),
        provider: getLastUsedProvider(),
      }
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  // Badge image generation
  const badgeImageSchema = z.object({
    prompt: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    locale: z.string().optional(),
  })

  fastify.post('/badge-image', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const data = badgeImageSchema.parse(request.body)
      const badgeName = data.name || data.prompt || 'badge'
      const badgeDesc = data.description || ''
      const context = data.prompt || ''

      // Generate SVG badge using text AI to match existing badge style
      const svgPrompt = `Generate an SVG badge icon for a gamified educational platform.

Badge: "${badgeName}"
Description: ${badgeDesc}
Context: ${context}

Design an icon that visually represents the badge theme. For example: a quill for writing, a shield for defense, a gear for engineering, a flask for science, a scroll for history, etc.

STRICT SVG RULES:
- viewBox="0 0 100 100", xmlns="http://www.w3.org/2000/svg"
- Background: <circle cx="50" cy="50" r="45" fill="url(#bg)"/> with a linearGradient x1="0%" y1="0%" x2="100%" y2="100%". Then <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-width="2" opacity="0.3"/>
- Use a UNIQUE gradient ID prefix (e.g. "b${Date.now()}-bg")
- Center icon: simple flat vector shapes (paths, circles, rects, polygons)
- Use 2-3 linearGradients max. Icon details in gold (#FFD700/#FFC338/#DAA520) or white highlights
- DO NOT use: <text>, <image>, <clipPath>, <mask>, <filter>, <foreignObject>, <use>, <symbol>
- Keep it under 50 lines of SVG
- AVOID these background colors (already used): #667EEA/#764BA2, #FF9A56/#FF6B35, #43CEA2/#185A9D, #667EEA/#3B82F6, #F093FB/#F5576C, #0077B6/#03045E, #FFD700/#FF8C00, #8B5CF6/#6D28D9
- Pick a fresh, unique color pair for the background

Return ONLY the raw SVG code. No markdown, no backticks, no explanation.`

      const rawSvg = await aiService.generateRawText(svgPrompt, 'You are an SVG icon designer. Return ONLY valid SVG code, nothing else.')

      // Extract SVG from response
      let svg = rawSvg || ''
      svg = svg.replace(/```(?:xml|svg|html)?\s*/gi, '').replace(/```/g, '').trim()
      const svgMatch = svg.match(/<svg[\s\S]*<\/svg>/)
      if (!svgMatch) {
        throw new Error('Failed to generate SVG badge')
      }
      svg = svgMatch[0]

      // Save SVG file
      const { randomUUID } = await import('crypto')
      const { saveUpload } = await import('../storage/storage.service.js')
      const fileName = `badge-${randomUUID()}.svg`
      const imageUrl = await saveUpload(`badges/${fileName}`, svg, 'image/svg+xml')

      return {
        imageUrl,
        prompt: badgeName,
        provider: getLastUsedProvider(),
      }
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  // --- Centralized prompt streaming endpoint ---
  // Frontend sends intent type + params, backend builds the prompt from centralized templates

  const promptSchema = z.object({
    type: z.string(),
    locale: z.string().optional(),
    params: z.record(z.string()).optional(),
  })

  fastify.post('/prompt/stream', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.user as { id: string }
    const rateCheck = checkRateLimit(id)
    if (!rateCheck.allowed) {
      return reply.status(429).send({ message: 'Rate limit exceeded' })
    }

    const data = promptSchema.parse(request.body)
    const locale = resolveLocale(data.locale)
    const p = data.params || {}

    // Build prompt from centralized templates
    let prompt: string
    switch (data.type) {
      case 'class.narrative.generate':
        prompt = Prompts.CLASS_NARRATIVE.generate(p.idea || '', locale)
        break
      case 'class.narrative.modify':
        prompt = Prompts.CLASS_NARRATIVE.modify(p.idea || '', p.current || '', p.feedback || '', locale)
        break
      case 'class.titles.generate':
        prompt = Prompts.CLASS_TITLES.generate(p.context || '', locale)
        break
      case 'class.titles.regenerate':
        prompt = Prompts.CLASS_TITLES.regenerate(p.context || '', p.feedback || '', locale)
        break
      case 'mission.narrative.generate':
        prompt = Prompts.MISSION_NARRATIVE.generate(p.idea || '', p.className || '', locale)
        break
      case 'mission.narrative.modify':
        prompt = Prompts.MISSION_NARRATIVE.modify(p.idea || '', p.current || '', p.feedback || '', locale)
        break
      case 'mission.titles.generate':
        prompt = Prompts.MISSION_TITLES.generate(p.context || '', locale)
        break
      case 'mission.titles.regenerate':
        prompt = Prompts.MISSION_TITLES.regenerate(p.context || '', p.feedback || '', locale)
        break
      case 'mission.enigmas.generate':
        prompt = Prompts.MISSION_ENIGMAS.generate(p.idea || '', p.narrative || '', p.title || '', p.className || '', locale)
        break
      case 'mission.enigmas.regenerate':
        prompt = Prompts.MISSION_ENIGMAS.regenerate(p.context || '', p.currentEnigmas || '', p.feedback || '', p.className || '', locale)
        break
      case 'class.guide.generate':
        prompt = Prompts.CLASS_GUIDE.generate(p.title || '', p.context || '', locale)
        break
      case 'mission.guide.generate':
        prompt = Prompts.MISSION_GUIDE.generate(p.title || '', p.narrative || '', p.enigmasSummary || '', Number(p.totalXp) || 0, locale)
        break
      case 'badge.generate':
        prompt = Prompts.BADGE_GENERATE.nameAndDescription(p.context || '', locale)
        break
      case 'editor.assist':
        prompt = Prompts.EDITOR_ASSIST.generate(p.content || '', p.request || '', p.systemContext || '', locale)
        break
      case 'enigma.assist':
        prompt = Prompts.ENIGMA_ASSIST.modify(p.currentEnigma || '', p.missionContext || '', p.request || '', locale)
        break
      default:
        return reply.status(400).send({ message: `Unknown prompt type: ${data.type}` })
    }

    // Stream response
    reply.raw.writeHead(200, sseHeaders(request))

    let streamError: { message: string; code: string } | null = null
    let receivedAnyChunk = false
    try {
      const stream = aiService.streamNarrative({ prompt, locale })
      for await (const chunk of stream) {
        receivedAnyChunk = true
        if (!reply.raw.destroyed) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
        }
      }
      if (!receivedAnyChunk) {
        streamError = {
          message: locale === 'en'
            ? 'The AI returned no content. Please try again.'
            : 'La IA no devolvió contenido. Inténtalo de nuevo.',
          code: 'AI_EMPTY_RESPONSE',
        }
      }
    } catch (err) {
      const code = (err as { code?: string }).code || 'AI_SERVICE_UNAVAILABLE'
      const message = err instanceof Error
        ? err.message
        : (locale === 'en'
          ? 'The AI service is temporarily unavailable. Please try again in a few minutes.'
          : 'El servicio de IA no está disponible. Inténtalo de nuevo en unos minutos.')
      streamError = { message, code }
      request.log.error({ err, type: data.type }, 'AI stream failed')
    }

    if (!reply.raw.destroyed) {
      if (streamError) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message, code: streamError.code })}\n\n`)
      }
      reply.raw.write(`data: ${JSON.stringify({ type: 'done', provider: getLastUsedProvider(), error: streamError ? true : false })}\n\n`)
      reply.raw.end()
    }
  })

  // SSE streaming version of mission assistant (legacy — kept for backwards compatibility)
  fastify.post('/mission-assistant/stream', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const { id } = request.user as { id: string }
      const data = missionAssistantSchema.parse(request.body)
      const safeMessage = ensureSafeEducationalPrompt(data.message)

      // Resolve class name if classId provided
      let classContext = ''
      if (data.classId) {
        const cls = await prisma.class.findFirst({ where: { id: data.classId, teacherId: id }, select: { name: true } })
        if (cls) classContext = ` para la clase "${cls.name}"`
      }
      const enrichedMessage = safeMessage + classContext

      // Set SSE headers
      reply.raw.writeHead(200, sseHeaders(request))

      // Stream narrative token by token
      let fullNarrative = ''
      try {
        const stream = aiService.streamNarrative({
          prompt: enrichedMessage,
          locale,
          // Don't pass classId — enrichedMessage already has the class name
        })

        for await (const chunk of stream) {
          fullNarrative += chunk
          if (!reply.raw.destroyed) {
            reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
          }
        }
      } catch {
        if (!fullNarrative) {
          fullNarrative = 'No he podido generar la narrativa. Intenta de nuevo.'
          if (!reply.raw.destroyed) {
            reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: fullNarrative })}\n\n`)
          }
        }
      }

      // Generate quiz after narrative (title derived from prompt — no extra Gemini call)
      let formData: Record<string, unknown> = {}
      try {
        const quiz = await aiService.createQuiz({ prompt: enrichedMessage, locale, count: 3 })
        // Simple title from user's request — no extra API call
        const simpleTitle = safeMessage.substring(0, 50).replace(/['".:!?]/g, '').trim()

        formData = {
          title: simpleTitle ? `Misión: ${simpleTitle}` : 'Misión Educativa',
          description: fullNarrative,
          rarity: 'comun',
          enigmas: quiz.enigmas,
        }
      } catch {
        formData = {
          title: 'Misión Educativa',
          description: fullNarrative,
          rarity: 'comun',
          enigmas: [],
        }
      }

      // Send done event with formData
      const suggestions = locale === 'en'
        ? ['Make it harder', 'Generate more enigmas', 'Focus on practice']
        : ['Hazla mas dificil', 'Genera mas enigmas', 'Enfocala en practica']

      if (!reply.raw.destroyed) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'done', formData, suggestions })}\n\n`)
        reply.raw.end()
      }
    } catch (error) {
      if (!reply.raw.headersSent) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: 'Datos invalidos' })
        }
        return reply.status(500).send({ message: 'Error interno' })
      }
      if (!reply.raw.destroyed) reply.raw.end()
    }
  })

  fastify.post('/mission-assistant', async (request: FastifyRequest, reply: FastifyReply) => {
    const locale = resolveLocale((request.body as { locale?: string } | undefined)?.locale)

    try {
      const { id } = request.user as { id: string }
      const data = missionAssistantSchema.parse(request.body)
      const safeMessage = ensureSafeEducationalPrompt(data.message)

      const [narrative, quiz] = await Promise.all([
        aiService.createNarrative({
          prompt: safeMessage,
          locale,
          classId: data.classId,
          userId: id,
        }),
        aiService.createQuiz({
          prompt: safeMessage,
          locale,
          count: 3,
        }),
      ])

      // Use Gemini to generate a proper mission title
      const provider = getAIProvider()
      const titlePrompt = locale === 'en'
        ? `Generate a short, creative mission title (max 6 words) for a gamified educational mission about: ${safeMessage}. Respond with ONLY the title, nothing else.`
        : `Genera un titulo corto y creativo (maximo 6 palabras) para una mision educativa gamificada sobre: ${safeMessage}. Responde SOLO con el titulo, nada mas.`

      const title = await provider.generateText(titlePrompt, { locale, temperature: 0.8 })
      const cleanTitle = title.replace(/['"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)

      return {
        message: narrative.text,
        suggestions: locale === 'en'
          ? ['Make it harder', 'Generate more enigmas', 'Focus on practice']
          : ['Hazla mas dificil', 'Genera mas enigmas', 'Enfocala en practica'],
        formData: {
          title: cleanTitle || (locale === 'en' ? 'Knowledge Quest' : 'Mision de Conocimiento'),
          description: narrative.text,
          rarity: 'comun',
          tags: safeMessage.split(' ').filter(Boolean).slice(0, 3),
          enigmas: quiz.enigmas,
        },
      }
    } catch (error) {
      return handleAiRouteError(error, reply, locale)
    }
  })

  // --- AI generation timings from Spark Router /v1/timings ---

  fastify.get('/timings', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ai = await getAiSettings()
      const baseUrl = (ai.text.baseUrl || 'http://localhost:8000').replace(/\/+$/, '')
      const apiKey = ai.text.apiKey || 'local-testing-key'
      const imageModel = ai.image.model || 'black-forest-labs/flux.2-klein-4b'
      const chatModel = ai.text.model || 'google/gemma-4-26b-a4b-it'

      const response = await fetch(`${baseUrl}/v1/timings`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5_000),
      })

      if (!response.ok) {
        return reply.status(502).send({ message: 'Spark no disponible' })
      }

      const timings = await response.json() as SparkTimingSummary
      const byKind = timings.by_kind ?? {}
      const byKey = timings.by_key ?? {}

      const chatStats = byKey[chatModel] ?? byKind.chat
      const imageStats = byKey[imageModel] ?? byKind.image
      const avatarStats = byKind.avatar

      // Chat streams measure full response duration, not first-token latency. Treat very
      // long samples as non-actionable for progress UI and keep chat effectively instant.
      const chatSeconds = secondsFromStats(chatStats, 1, { preferRecent: true, maxTrustedMs: 10_000, maxSeconds: 1 })
      const imageSeconds = secondsFromStats(imageStats, 3, { maxSeconds: 3 })
      const avatarSeconds = avatarStats?.count ? secondsFromStats(avatarStats, 60) : 60

      const chatQueue = (timings.chat_queue_depth ?? 0) + (byKind.chat?.inflight ?? 0)
      const imageQueue = (timings.image_queue_depth ?? 0) + (byKind.image?.inflight ?? 0)
      const avatarQueue = (timings.avatar_queue_depth ?? 0) + (byKind.avatar?.inflight ?? 0)

      return {
        chat_avg_seconds: chatSeconds,
        image_avg_seconds: imageSeconds,
        avatar_avg_seconds: avatarSeconds,
        chat_queue: chatQueue,
        image_queue: imageQueue,
        avatar_queue: avatarQueue,
        chat_estimated_seconds: chatSeconds * (chatQueue + 1),
        image_estimated_seconds: (imageSeconds * (imageQueue + 1)) + (avatarSeconds * avatarQueue),
        avatar_estimated_seconds: (avatarSeconds * (avatarQueue + 1)) + (imageSeconds * imageQueue),
        avg_seconds: avatarSeconds * (avatarQueue + 1),
        average_seconds: avatarSeconds * (avatarQueue + 1),
      }
    } catch {
      return reply.status(502).send({ message: 'Spark no disponible' })
    }
  })
}
