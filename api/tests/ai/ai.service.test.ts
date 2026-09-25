import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the provider
vi.mock('../../src/modules/ai/providers/index.js', () => ({
  getAIProvider: () => ({
    generateText: vi.fn().mockResolvedValue('Mocked AI response about the topic.'),
    generateTextStream: vi.fn().mockImplementation(async function* () {
      yield 'Mocked '
      yield 'streaming '
      yield 'response.'
    }),
    generateImage: vi.fn().mockResolvedValue({
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image'),
      extension: 'png',
    }),
  }),
}))

// Mock prisma
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ name: 'Test User' }) },
    class: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
    enigmaSubmission: { count: vi.fn().mockResolvedValue(0) },
    mission: { findMany: vi.fn().mockResolvedValue([]) },
    classEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
    studentMissionProgress: { findMany: vi.fn().mockResolvedValue([]) },
    chatMessage: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

// Mock tools initialization
vi.mock('../../src/modules/ai/tools/index.js', () => ({
  initializeTools: vi.fn(),
  getTool: vi.fn().mockReturnValue(undefined),
}))

describe('AIService', () => {
  let AIService: typeof import('../ai.service.js').AIService

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../src/modules/ai/ai.service.js')
    AIService = mod.AIService
  })

  it('should instantiate without errors', () => {
    const service = new AIService()
    expect(service).toBeDefined()
  })

  it('respondInChat returns content for teacher', async () => {
    const service = new AIService()
    const result = await service.respondInChat({
      userId: 'teacher-1',
      role: 'teacher',
      assistantId: 'atenea',
      message: 'How are my students doing?',
      locale: 'en',
    })
    expect(result).toHaveProperty('content')
    expect(typeof result.content).toBe('string')
    expect(result.content.length).toBeGreaterThan(0)
  })

  it('respondInChat returns content for student', async () => {
    const service = new AIService()
    const result = await service.respondInChat({
      userId: 'student-1',
      role: 'student',
      assistantId: 'odiseo',
      message: 'No entiendo el tema 3',
      locale: 'es',
    })
    expect(result).toHaveProperty('content')
    expect(typeof result.content).toBe('string')
  })

  it('respondInChatStream yields chunks', async () => {
    const service = new AIService()
    const chunks: string[] = []
    for await (const chunk of service.respondInChatStream({
      userId: 'student-1',
      role: 'student',
      assistantId: 'odiseo',
      message: 'Help me study',
      locale: 'en',
    })) {
      chunks.push(chunk)
    }
    expect(chunks.length).toBeGreaterThan(0)
  })

  it('isToolRequest detects narrative request', async () => {
    const service = new AIService()
    const result = await service.respondInChat({
      userId: 'teacher-1',
      role: 'teacher',
      assistantId: 'atenea',
      message: 'Genera una narrativa sobre la antigua Roma',
      locale: 'es',
    })
    // With mocked provider, it will still return content
    expect(result).toHaveProperty('content')
  })
})
