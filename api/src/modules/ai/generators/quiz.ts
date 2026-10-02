import { z } from 'zod'
import type { AIProvider } from '../providers/provider.interface.js'
import { ENIGMA_XP_PRESETS } from '../../../utils/xp-calculator.js'
import { INCLUSIVE_LANGUAGE_ES } from '../prompts/index.js'

export interface QuizGenerationRequest {
  prompt: string
  locale: string
  count: number
}

// Zod schema for validated quiz output
const enigmaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.literal('quiz'),
  xp: z.number().int().min(10).max(100),
})

const quizOutputSchema = z.object({
  enigmas: z.array(enigmaSchema).min(1),
  rawText: z.string(),
})

function parseQuizLines(text: string, count: number) {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const questions = lines.slice(0, count).map((line, index) => ({
    title: line.replace(/^[-*0-9.)\s]+/, '') || `Enigma ${index + 1}`,
    description: line,
    type: 'quiz',
    xp: ENIGMA_XP_PRESETS[Math.min(index, ENIGMA_XP_PRESETS.length - 1)],
  }))

  return questions.length > 0
    ? questions
    : Array.from({ length: count }, (_, index) => ({
        title: `Enigma ${index + 1}`,
        description: `Reto ${index + 1} generado a partir del tema indicado.`,
        type: 'quiz',
        xp: ENIGMA_XP_PRESETS[Math.min(index, ENIGMA_XP_PRESETS.length - 1)],
      }))
}

export async function generateQuiz(provider: AIProvider, request: QuizGenerationRequest) {
  const locale = request.locale.toLowerCase().startsWith('en') ? 'en' : 'es'
  const systemPrompt = locale === 'en'
    ? 'You are Atenea. Create concise educational enigma proposals for teachers.'
    : `Eres Atenea. Crea propuestas concisas de enigmas educativos para profesorado. ${INCLUSIVE_LANGUAGE_ES}`

  const prompt = locale === 'en'
    ? `Generate ${request.count} educational enigma ideas about: ${request.prompt}`
    : `Genera ${request.count} ideas de enigmas educativos sobre: ${request.prompt}`

  const text = await provider.generateText(prompt, {
    locale,
    systemPrompt,
    temperature: 0.6,
  })

  const result = {
    enigmas: parseQuizLines(text, request.count),
    rawText: text,
  }

  // Validate output with Zod — log warning if invalid but don't throw
  const parsed = quizOutputSchema.safeParse(result)
  if (!parsed.success) {
    console.warn('[QuizGenerator] Output validation warning:', parsed.error.issues)
  }

  return result
}
