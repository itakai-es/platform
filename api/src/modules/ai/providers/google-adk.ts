import { createHash } from 'crypto'
import { env } from '../../../config/env.js'
import { BADGE_IMAGE, FALLBACK_IMAGE } from '../prompts/index.js'
import type {
  AIProvider,
  GeneratedImageResult,
  GenerateImageOptions,
  GenerateTextOptions,
} from './provider.interface.js'

// Google AI SDK
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, type FunctionDeclaration, type Part, type Content } from '@google/generative-ai'

function resolveLocale(locale?: string) {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'es'
}

function extractTopic(prompt: string) {
  const lines = prompt
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const labeledPrefixes = [
    'consulta del profesor:',
    'consulta del alumno:',
    'teacher request:',
    'student request:',
    'clase actual:',
    'current class:',
  ]

  for (const line of lines) {
    const normalizedLine = line.toLowerCase()
    const matchedPrefix = labeledPrefixes.find(prefix => normalizedLine.startsWith(prefix))
    if (matchedPrefix) {
      return line.slice(matchedPrefix.length).trim()
    }
  }

  const trimmed = prompt.replace(/\s+/g, ' ').trim()
  const separators = ['sobre:', 'sobre ', 'about:', 'about ']
  const normalized = trimmed.toLowerCase()
  for (const separator of separators) {
    const index = normalized.lastIndexOf(separator)
    if (index !== -1) {
      return trimmed.slice(index + separator.length).trim()
    }
  }

  return trimmed
}

function buildFallbackNarrative(locale: 'es' | 'en', prompt: string) {
  const topic = extractTopic(prompt)
  if (locale === 'en') {
    return [
      `Mission narrative proposal: ${topic}.`,
      'Context: the group receives a clear challenge connected to the topic and must solve it through evidence, collaboration and short milestones.',
      'Suggested structure: opening hook, 3 progressive tasks, final reflection, and one visible reward for completion.',
    ].join(' ')
  }
  return [
    `Propuesta de narrativa para la mision: ${topic}.`,
    'Contexto: el grupo recibe un reto claro vinculado al tema y debe resolverlo con evidencias, colaboracion y pequenos hitos.',
    'Estructura sugerida: gancho inicial, 3 tareas progresivas, reflexion final y una recompensa visible al completarla.',
  ].join(' ')
}

function buildFallbackQuiz(locale: 'es' | 'en', prompt: string) {
  const topic = extractTopic(prompt)
  if (locale === 'en') {
    return [`Chronology challenge about ${topic}`, `Evidence puzzle using key clues from ${topic}`, `Final decision-making quiz focused on ${topic}`].join('\n')
  }
  return [`Reto cronologico sobre ${topic}`, `Enigma de pistas con evidencias clave de ${topic}`, `Quiz final de toma de decisiones sobre ${topic}`].join('\n')
}

function buildFallbackText(prompt: string, options?: GenerateTextOptions) {
  const locale = resolveLocale(options?.locale)
  const normalizedSystem = options?.systemPrompt?.toLowerCase() || ''
  const normalizedPrompt = prompt.toLowerCase()

  if (normalizedSystem.includes('narrative') || normalizedSystem.includes('diseno educativo') || normalizedPrompt.includes('clase actual:')) {
    return buildFallbackNarrative(locale, prompt)
  }
  if (normalizedSystem.includes('enigma') || normalizedPrompt.includes('ideas de enigmas')) {
    return buildFallbackQuiz(locale, prompt)
  }
  if (normalizedPrompt.includes('rol del usuario: profesor')) {
    const topic = extractTopic(prompt)
    return locale === 'en'
      ? `I can help you shape this into a workable classroom flow: ${topic}.\n1. Define the mission objective.\n2. Split into 3 enigmas with increasing difficulty.\n3. Attach support documents before publishing.`
      : `Puedo ayudarte a convertir esto en un flujo de clase util: ${topic}.\n1. Define el objetivo de la mision.\n2. Divide en 3 enigmas con dificultad creciente.\n3. Adjunta documentos de apoyo antes de publicar.`
  }
  if (normalizedPrompt.includes('rol del usuario: alumno')) {
    const topic = extractTopic(prompt)
    return locale === 'en'
      ? `Let's approach this step by step: ${topic}.\n1. Identify what the task is asking.\n2. Write down clues you already have.\n3. Try one small next step.`
      : `Vamos a enfocarlo paso a paso: ${topic}.\n1. Identifica que te pide la actividad.\n2. Anota los datos que ya tienes.\n3. Prueba un siguiente paso pequeno.`
  }
  return locale === 'en'
    ? 'Sorry, I could not process your request right now. Please try again.'
    : 'Lo siento, no he podido procesar tu petición ahora mismo. Inténtalo de nuevo.'
}

// --- SDK-based generation ---

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
]

// Singleton GenAI instance — created once on first use.
// Proveedor de RESPALDO (env-driven): si el endpoint principal falla, se usa
// Gemini/OpenRouter configurados por variables de entorno.
let _genAI: GoogleGenerativeAI | null | undefined

function getGenAI() {
  if (_genAI !== undefined) return _genAI
  const apiKey = process.env.GOOGLE_API_KEY
  _genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null
  return _genAI
}

function getModelName() {
  return process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
}

// Model instance cache — keyed by systemPrompt hash.
// Avoids recreating the model on every message for the same agent.
const _modelCache = new Map<string, ReturnType<GoogleGenerativeAI['getGenerativeModel']>>()

function getCachedModel(genAI: GoogleGenerativeAI, systemPrompt?: string, tools?: FunctionDeclaration[]) {
  // Hash-based key avoids collisions from prompt content containing separators
  const raw = `${getModelName()}|${systemPrompt || ''}|${tools?.map(t => t.name).join(',') || ''}`
  const cacheKey = createHash('sha256').update(raw).digest('hex').slice(0, 16)
  let model = _modelCache.get(cacheKey)
  if (!model) {
    model = genAI.getGenerativeModel({
      model: getModelName(),
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: systemPrompt || undefined,
      tools: tools?.length ? [{ functionDeclarations: tools }] : undefined,
    })
    _modelCache.set(cacheKey, model)
    // Cap cache size to prevent memory leaks
    if (_modelCache.size > 20) {
      const firstKey = _modelCache.keys().next().value
      if (firstKey) _modelCache.delete(firstKey)
    }
  }
  return model
}

const MAX_TOOL_ITERATIONS = 5

export class GoogleAdkProvider implements AIProvider {
  async generateText(prompt: string, options?: GenerateTextOptions): Promise<string> {
    try {
      const genAI = getGenAI()
      if (!genAI) return buildFallbackText(prompt, options)

      const toolDeclarations = options?.tools as FunctionDeclaration[] | undefined
      const model = getCachedModel(genAI, options?.systemPrompt, toolDeclarations)

      // Build conversation contents
      const contents: Content[] = [
        { role: 'user', parts: [{ text: prompt }] },
      ]

      // Function calling loop
      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const result = await model.generateContent({
          contents,
          generationConfig: { temperature: options?.temperature ?? 0.7 },
        })

        const response = result.response
        const candidate = response.candidates?.[0]
        if (!candidate?.content?.parts) {
          return response.text() || buildFallbackText(prompt, options)
        }

        // Check for function calls
        const functionCalls = candidate.content.parts.filter(
          (part): part is Part & { functionCall: { name: string; args: Record<string, unknown> } } =>
            'functionCall' in part && !!part.functionCall
        )

        if (functionCalls.length === 0) {
          // No function calls — return text
          console.log(`[AI] ✅ Text generated via Google Gemini (model: ${getModelName()})`)
          return response.text() || buildFallbackText(prompt, options)
        }

        // Execute function calls and build response parts
        if (!options?.executeToolCall) {
          // No executor provided — return text as-is
          return response.text() || buildFallbackText(prompt, options)
        }

        // Add model response to conversation
        contents.push({ role: 'model', parts: candidate.content.parts })

        // Execute each function call and collect results
        const functionResponseParts: Part[] = []
        for (const fc of functionCalls) {
          const { name, args } = fc.functionCall
          try {
            const toolResult = await options.executeToolCall(name, args)
            functionResponseParts.push({
              functionResponse: { name, response: { result: toolResult } },
            } as Part)
          } catch (toolError) {
            const errorMsg = toolError instanceof Error ? toolError.message : 'Tool execution failed'
            functionResponseParts.push({
              functionResponse: { name, response: { error: errorMsg } },
            } as Part)
          }
        }

        // Add function results to conversation for next iteration
        contents.push({ role: 'user', parts: functionResponseParts })
      }

      // Max iterations reached — warn and return fallback
      console.warn('[GoogleAdkProvider] Function calling loop reached max iterations (%d)', MAX_TOOL_ITERATIONS)
      return buildFallbackText(prompt, options)
    } catch (error) {
      if (env.NODE_ENV !== 'production') {
        console.error('[GoogleAdkProvider] generateText failed, using fallback:', error)
      }
      return buildFallbackText(prompt, options)
    }
  }

  async *generateTextStream(prompt: string, options?: GenerateTextOptions): AsyncIterable<string> {
    const genAI = getGenAI()
    if (!genAI) {
      yield buildFallbackText(prompt, options)
      return
    }

    try {
      const toolDeclarations = options?.tools as FunctionDeclaration[] | undefined
      const hasTools = toolDeclarations && toolDeclarations.length > 0

      // If tools are present, use non-streaming generateText (function calling needs full response)
      // then yield the result as a single chunk
      if (hasTools) {
        const fullText = await this.generateText(prompt, options)
        yield fullText
        return
      }

      // No tools — stream normally using cached model
      const model = getCachedModel(genAI, options?.systemPrompt)

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: options?.temperature ?? 0.7 },
      })

      console.log(`[AI] ✅ Text stream via Google Gemini (model: ${getModelName()})`)
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) yield text
      }
    } catch (error) {
      if (env.NODE_ENV !== 'production') {
        console.error('[GoogleAdkProvider] stream failed, yielding fallback:', error)
      }
      yield buildFallbackText(prompt, options)
    }
  }

  /**
   * Generate image via OpenRouter (Flux) using chat completions API.
   */
  private async generateImageWithFlux(imagePrompt: string): Promise<GeneratedImageResult> {
    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (!openrouterKey) throw new Error('OPENROUTER_API_KEY not configured')

    const model = process.env.OPENROUTER_IMAGE_MODEL || 'black-forest-labs/flux.2-flex'

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000)

    let response: Response
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: imagePrompt }],
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw new Error(`OpenRouter API ${response.status}: ${errBody}`)
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string | null
          images?: Array<{ type: string; image_url: { url: string } }>
        }
      }>
    }

    // Extract image from choices[0].message.images[0].image_url.url
    const images = data.choices?.[0]?.message?.images
    if (images?.length) {
      const imageUrl = images[0]?.image_url?.url
      if (imageUrl) {
        // Handle data URI (data:image/png;base64,...)
        const dataUriMatch = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (dataUriMatch) {
          const mimeType = dataUriMatch[1]
          const buffer = Buffer.from(dataUriMatch[2], 'base64')
          const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'
          return { mimeType, buffer, extension }
        }

        // Handle regular URL - download it
        const imgResponse = await fetch(imageUrl)
        if (!imgResponse.ok) throw new Error('Failed to download generated image')
        const arrayBuffer = await imgResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const contentType = imgResponse.headers.get('content-type') || 'image/png'
        const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
        return { mimeType: contentType, buffer, extension }
      }
    }

    throw new Error('No image data in OpenRouter response')
  }

  async generateImage(prompt: string, options?: GenerateImageOptions): Promise<GeneratedImageResult> {
    try {
      // Covers arrive already enriched by generators/image.ts (shared with Spark).
      let imagePrompt: string

      if (options?.type === 'covers') {
        imagePrompt = prompt
      } else if (options?.type === 'badges') {
        imagePrompt = BADGE_IMAGE.build(prompt)
      } else {
        imagePrompt = FALLBACK_IMAGE.build(prompt, resolveLocale(options?.locale))
      }

      const result = await this.generateImageWithFlux(imagePrompt)
      const model = process.env.OPENROUTER_IMAGE_MODEL || 'black-forest-labs/flux.2-flex'
      console.log(`[AI] ✅ Image generated via Google/OpenRouter (model: ${model}, ${(result.buffer.byteLength / 1024).toFixed(0)}KB)`)
      return result
    } catch (error) {
      console.error('[AI] ❌ Google/OpenRouter image generation failed:', error)
      throw new Error('No se pudo generar la imagen')
    }
  }
}
