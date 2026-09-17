import { prisma } from '../../config/database.js'
import { TeacherAgent } from './agents/teacher-agent.js'
import { StudentAgent } from './agents/student-agent.js'
import { getAIProvider, getLastUsedProvider } from './providers/index.js'
import { generateNarrative, streamNarrative } from './generators/narrative.js'
import { generateImage } from './generators/image.js'
import { generateQuiz } from './generators/quiz.js'
import { initializeTools, getToolDeclarations, getTool } from './tools/index.js'
import { wrapAICall, AIServiceUnavailableError } from '../../utils/errors.js'
import { assertClassAccess } from '../../utils/class-access.js'

function resolveLocale(locale?: string) {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'es'
}

export class AIService {
  private readonly provider = getAIProvider()
  private readonly teacherAgent = new TeacherAgent(this.provider, 'teacher')
  private readonly studentAgent = new StudentAgent(this.provider, 'student')

  constructor() {
    initializeTools()
  }

  /**
   * Build a tool executor that injects userId into tool args.
   * This lets tools like create_class access the authenticated teacher's ID.
   */
  private buildToolExecutor(userId: string) {
    return async (name: string, args: Record<string, unknown>): Promise<string> => {
      const tool = getTool(name)
      if (!tool) {
        console.warn('[AIService] Tool not found: %s', name)
        return `Error: herramienta "${name}" no disponible.`
      }
      // Strip _userId from model args (prevent injection), then inject server-side userId
      const { _userId: _ignored, ...safeArgs } = args
      return tool.execute({ ...safeArgs, _userId: userId })
    }
  }

  async respondInChat(input: {
    userId: string
    role: string | null
    assistantId: string
    message: string
    locale?: string
    conversationId?: string
    missionId?: string
  }) {
    const locale = resolveLocale(input.locale)

    // Load conversation history for multi-turn context
    const history = input.conversationId
      ? await prisma.chatMessage.findMany({
          where: { conversationId: input.conversationId },
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true },
          take: 20,
        }).then(msgs => msgs.reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 500) })))
      : undefined

    // Chat is conversational only (FR63b). No function calling tools.
    // Teachers create classes/missions via dedicated forms, not chat.
    // Tools remain available via /ai/generate/* REST endpoints for form buttons.
    const agent = input.role === 'teacher' ? this.teacherAgent : this.studentAgent
    const content = await wrapAICall(() => agent.respond({
      ...input,
      locale,
      history,
      tools: undefined,
      executeToolCall: undefined,
    }))

    return { content }
  }

  async *respondInChatStream(input: {
    userId: string
    role: string | null
    assistantId: string
    message: string
    locale?: string
    conversationId?: string
    missionId?: string
  }): AsyncGenerator<string> {
    const locale = resolveLocale(input.locale)

    // Load conversation history
    const history = input.conversationId
      ? await prisma.chatMessage.findMany({
          where: { conversationId: input.conversationId },
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true },
          take: 20,
        }).then(msgs => msgs.reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 500) })))
      : undefined

    // Chat is conversational only — no tools, pure streaming
    const agent = input.role === 'teacher' ? this.teacherAgent : this.studentAgent
    let stream: AsyncIterable<string>
    try {
      stream = agent.respondStream({
        ...input,
        locale,
        history,
        tools: undefined,
        executeToolCall: undefined,
      })
    } catch (err) {
      console.error('[AI] Stream init failed:', err)
      throw new AIServiceUnavailableError()
    }
    try {
      for await (const chunk of stream) {
        yield chunk
      }
    } catch (err) {
      console.error('[AI] Stream chunk failed:', err)
      throw new AIServiceUnavailableError()
    }
  }

  /**
   * Nombre de la clase para la que se genera, o undefined si no se pidió para
   * ninguna. Generar para una clase exige ser de su profesorado: si no, 404.
   */
  async resolveClassName(userId: string, classId?: string) {
    if (!classId) return undefined
    await assertClassAccess(classId, userId, 'class.view')
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } })
    return cls?.name
  }

  /** `className` llega ya resuelto con `resolveClassName`, antes de pedir nada al proveedor. */
  async createNarrative(input: {
    prompt: string
    locale?: string
    className?: string
  }) {
    return wrapAICall(() => generateNarrative(this.provider, {
      prompt: input.prompt,
      locale: resolveLocale(input.locale),
      className: input.className,
    }))
  }

  /** Igual que `createNarrative`: la comprobación va antes de abrir el flujo. */
  async *streamNarrative(input: {
    prompt: string
    locale?: string
    className?: string
  }): AsyncGenerator<string> {
    let stream: AsyncIterable<string>
    try {
      stream = streamNarrative(this.provider, {
        prompt: input.prompt,
        locale: resolveLocale(input.locale),
        className: input.className,
      })
    } catch (err) {
      console.error('[AI] Narrative stream init failed:', err)
      throw new AIServiceUnavailableError()
    }
    try {
      for await (const chunk of stream) {
        yield chunk
      }
    } catch (err) {
      console.error('[AI] Narrative stream chunk failed:', err)
      throw new AIServiceUnavailableError()
    }
  }

  async createImage(input: {
    prompt: string
    locale?: string
    type: 'narratives' | 'badges' | 'avatars' | 'covers'
  }) {
    return wrapAICall(() => generateImage(this.provider, {
      prompt: input.prompt,
      locale: resolveLocale(input.locale),
      type: input.type,
    }))
  }

  async createQuiz(input: {
    prompt: string
    locale?: string
    count?: number
  }) {
    return wrapAICall(() => generateQuiz(this.provider, {
      prompt: input.prompt,
      locale: resolveLocale(input.locale),
      count: input.count || 3,
    }))
  }

  async generateRawText(prompt: string, systemPrompt?: string) {
    return wrapAICall(() => this.provider.generateText(prompt, {
      locale: 'es',
      systemPrompt: systemPrompt || 'You are a helpful assistant. Follow instructions exactly.',
      temperature: 0.7,
    }))
  }
}

export const aiService = new AIService()
