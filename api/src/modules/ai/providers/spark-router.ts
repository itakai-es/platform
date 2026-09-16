import type {
  AIProvider,
  GeneratedImageResult,
  GenerateImageOptions,
  GenerateTextOptions,
} from './provider.interface.js'
import { getAiSettings } from '../../settings/settings.service.js'
import { openAiEndpoint } from './openai-endpoint.js'

const DEFAULT_SPARK_ROUTER_BASE_URL = 'http://localhost:8000'
const DEFAULT_SPARK_ROUTER_API_KEY = 'local-testing-key'
const DEFAULT_SPARK_ROUTER_MODEL = 'google/gemma-4-26b-a4b-it'
const DEFAULT_SPARK_ROUTER_IMAGE_MODEL = 'black-forest-labs/flux.2-klein-4b'
const DEFAULT_TEXT_TIMEOUT_MS = 60_000
const DEFAULT_IMAGE_TIMEOUT_MS = 90_000

// ── Sonda de alcanzabilidad con memoria ──────────────────────────────────────
// El endpoint principal va por VPN: si el otro extremo está caído, las
// conexiones no se rechazan, se quedan en el aire hasta agotar el timeout
// (60s texto / 90s imagen) ANTES de caer al respaldo — cada paso del asistente
// tardaba un minuto extra. La sonda detecta una base inaccesible en ~2s y lo
// recuerda un minuto, así que las generaciones van directas al respaldo; cuando
// el endpoint vuelve, se retoma solo en la siguiente ventana.
const REACH_PROBE_TIMEOUT_MS = 2_500
const REACH_RETRY_AFTER_MS = 60_000
const unreachableUntil = new Map<string, number>()

async function isReachable(baseUrl: string): Promise<boolean> {
  const memo = unreachableUntil.get(baseUrl)
  if (memo && Date.now() < memo) return false
  try {
    // Cualquier respuesta HTTP (aunque sea un 404) demuestra que el host
    // atiende conexiones; solo el fallo de red o el timeout marcan inaccesible.
    await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(REACH_PROBE_TIMEOUT_MS) })
    unreachableUntil.delete(baseUrl)
    return true
  } catch {
    unreachableUntil.set(baseUrl, Date.now() + REACH_RETRY_AFTER_MS)
    return false
  }
}

type SparkMessageRole = 'system' | 'user' | 'assistant'

interface SparkChatMessage {
  role: SparkMessageRole
  content: string
}

interface SparkChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}

interface SparkImageGenerationResponse {
  data?: Array<{
    url?: string
  }>
}

function normalizeBaseUrl(baseUrl?: string) {
  // Solo se quita la barra final: la versión (`/v1`, `/v4`…) la resuelve
  // openAiEndpoint, que acepta tanto el host como una base ya versionada.
  return (baseUrl || DEFAULT_SPARK_ROUTER_BASE_URL).replace(/\/+$/, '')
}

// La config se resuelve desde el panel de admin (con .env como default). Son dos
// endpoints compatibles con OpenAI independientes (texto e imágenes): cada uno
// puede apuntar a un proveedor distinto. Ver modules/settings/settings.service.ts.
async function getAiConfig() {
  const ai = await getAiSettings()
  return {
    text: {
      baseUrl: normalizeBaseUrl(ai.text.baseUrl),
      apiKey: ai.text.apiKey || DEFAULT_SPARK_ROUTER_API_KEY,
      model: ai.text.model || DEFAULT_SPARK_ROUTER_MODEL,
    },
    image: {
      baseUrl: normalizeBaseUrl(ai.image.baseUrl),
      apiKey: ai.image.apiKey || DEFAULT_SPARK_ROUTER_API_KEY,
      model: ai.image.model || DEFAULT_SPARK_ROUTER_IMAGE_MODEL,
    },
  }
}

function historyPartToText(part: unknown) {
  if (typeof part === 'string') {
    return part
  }

  if (part && typeof part === 'object' && 'text' in part) {
    const text = (part as { text?: unknown }).text
    return typeof text === 'string' ? text : ''
  }

  return ''
}

function buildMessages(prompt: string, options?: GenerateTextOptions): SparkChatMessage[] {
  const messages: SparkChatMessage[] = []

  if (options?.systemPrompt) {
    messages.push({
      role: 'system',
      content: options.systemPrompt,
    })
  }

  if (options?.history?.length) {
    for (const item of options.history) {
      const content = item.parts.map(historyPartToText).filter(Boolean).join('\n').trim()
      if (!content) {
        continue
      }

      const role: SparkMessageRole =
        item.role === 'assistant' || item.role === 'model' ? 'assistant' : 'user'

      messages.push({ role, content })
    }
  }

  messages.push({
    role: 'user',
    content: prompt,
  })

  return messages
}

function splitTextIntoChunks(text: string) {
  const normalized = text.replace(/\r\n/g, '\n')
  const chunks = normalized.match(/.{1,80}(\s|$)/g)
  return chunks && chunks.length > 0 ? chunks : [normalized]
}

function inferExtension(contentType: string | null, url: string) {
  if (contentType?.includes('jpeg') || contentType?.includes('jpg') || /\.jpe?g(?:$|\?)/i.test(url)) {
    return 'jpg'
  }

  if (contentType?.includes('webp') || /\.webp(?:$|\?)/i.test(url)) {
    return 'webp'
  }

  return 'png'
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Spark Router ${response.status}: ${detail || response.statusText}`)
  }

  return response.json() as Promise<T>
}

export class SparkRouterProvider implements AIProvider {
  lastUsedProvider: 'spark' | 'gemini' | 'flux' = 'spark'

  // Escotilla temporal: con AI_DISABLE_SPARK=true se salta Spark y va directo
  // al fallback (Gemini/Flux). Útil cuando Spark va lento en pruebas. Quitar la
  // variable y reiniciar para volver a usar Spark.
  private readonly bypass = process.env.AI_DISABLE_SPARK === 'true'

  constructor(private readonly fallbackProvider?: AIProvider) {}

  async generateText(prompt: string, options?: GenerateTextOptions): Promise<string> {
    if (this.bypass && this.fallbackProvider) {
      this.lastUsedProvider = 'gemini'
      return this.fallbackProvider.generateText(prompt, options)
    }
    const { baseUrl, apiKey, model } = (await getAiConfig()).text

    if (this.fallbackProvider && !(await isReachable(baseUrl))) {
      this.lastUsedProvider = 'gemini'
      console.warn('[AI] ⚠️ SparkRouter inaccesible (sonda) → texto con el respaldo Google')
      return this.fallbackProvider.generateText(prompt, options)
    }

    try {
      const payload = await fetchJson<SparkChatCompletionResponse>(
        openAiEndpoint(baseUrl, 'chat/completions'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: buildMessages(prompt, options),
            temperature: options?.temperature ?? 0.7,
          }),
        },
        DEFAULT_TEXT_TIMEOUT_MS
      )

      const content = payload.choices?.[0]?.message?.content?.trim()
      if (!content) {
        throw new Error('Spark Router returned an empty text response')
      }

      this.lastUsedProvider = 'spark'
      console.log(`[AI] ✅ Text generated via SparkRouter (model: ${model})`)
      return content
    } catch (error) {
      if (this.fallbackProvider) {
        this.lastUsedProvider = 'gemini'
        console.warn(`[AI] ⚠️ SparkRouter text failed → falling back to Google:`, (error as Error).message)
        return this.fallbackProvider.generateText(prompt, options)
      }

      throw error
    }
  }

  async *generateTextStream(prompt: string, options?: GenerateTextOptions): AsyncIterable<string> {
    if (this.bypass && this.fallbackProvider) {
      this.lastUsedProvider = 'gemini'
      yield* this.fallbackProvider.generateTextStream(prompt, options)
      return
    }
    const { baseUrl, apiKey, model } = (await getAiConfig()).text

    if (this.fallbackProvider && !(await isReachable(baseUrl))) {
      this.lastUsedProvider = 'gemini'
      console.warn('[AI] ⚠️ SparkRouter inaccesible (sonda) → stream con el respaldo Google')
      yield* this.fallbackProvider.generateTextStream(prompt, options)
      return
    }

    try {
      const response = await fetch(openAiEndpoint(baseUrl, 'chat/completions'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: buildMessages(prompt, options),
          temperature: options?.temperature ?? 0.7,
          stream: true,
        }),
        signal: AbortSignal.timeout(DEFAULT_TEXT_TIMEOUT_MS),
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(`Spark Router ${response.status}: ${detail || response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Spark Router returned no stream body')

      const decoder = new TextDecoder()
      let buffer = ''
      let hasContent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              hasContent = true
              yield content
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      if (!hasContent) throw new Error('Spark Router stream returned no content')

      this.lastUsedProvider = 'spark'
      console.log(`[AI] ✅ Text streamed via SparkRouter (model: ${model})`)
    } catch (error) {
      if (this.fallbackProvider) {
        this.lastUsedProvider = 'gemini'
        console.warn(`[AI] ⚠️ SparkRouter stream failed → falling back to Google:`, (error as Error).message)
        yield* this.fallbackProvider.generateTextStream(prompt, options)
        return
      }

      throw error
    }
  }

  async generateImage(prompt: string, options?: GenerateImageOptions): Promise<GeneratedImageResult> {
    if (this.bypass && this.fallbackProvider) {
      this.lastUsedProvider = 'flux'
      return this.fallbackProvider.generateImage(prompt, options)
    }
    const { baseUrl, apiKey, model: imageModel } = (await getAiConfig()).image

    if (this.fallbackProvider && !(await isReachable(baseUrl))) {
      this.lastUsedProvider = 'flux'
      console.warn('[AI] ⚠️ SparkRouter inaccesible (sonda) → imagen con el respaldo Flux/OpenRouter')
      return this.fallbackProvider.generateImage(prompt, options)
    }

    try {
      console.log(`[AI] 🎨 Image request → SparkRouter (${options?.type || 'image'}, model: ${imageModel})`)
      console.log(`[AI] 🎨 Image prompt → SparkRouter:\n${prompt}`)

      const payload = await fetchJson<SparkImageGenerationResponse>(
        openAiEndpoint(baseUrl, 'images/generations'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: imageModel,
            prompt,
            size: '1024x1024',
          }),
        },
        DEFAULT_IMAGE_TIMEOUT_MS
      )

      const rawImageUrl = payload.data?.[0]?.url
      if (!rawImageUrl) {
        throw new Error('Spark Router did not return an image URL')
      }

      const imageUrl = rawImageUrl.startsWith('http')
        ? rawImageUrl
        : new URL(rawImageUrl, `${baseUrl}/`).toString()

      const imageResponse = await fetch(imageUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(DEFAULT_IMAGE_TIMEOUT_MS),
      })

      if (!imageResponse.ok) {
        const detail = await imageResponse.text().catch(() => '')
        throw new Error(`Spark image download ${imageResponse.status}: ${detail || imageResponse.statusText}`)
      }

      const arrayBuffer = await imageResponse.arrayBuffer()
      const mimeType = imageResponse.headers.get('content-type') || 'image/png'

      this.lastUsedProvider = 'spark'
      console.log(`[AI] ✅ Image generated via SparkRouter (model: ${imageModel}, ${(arrayBuffer.byteLength / 1024).toFixed(0)}KB)`)
      return {
        mimeType,
        buffer: Buffer.from(arrayBuffer),
        extension: inferExtension(mimeType, imageUrl),
      }
    } catch (error) {
      if (this.fallbackProvider) {
        this.lastUsedProvider = 'flux'
        console.warn(`[AI] ⚠️ SparkRouter image failed → falling back to Flux/OpenRouter:`, (error as Error).message)
        return this.fallbackProvider.generateImage(prompt, options)
      }

      throw error
    }
  }
}
