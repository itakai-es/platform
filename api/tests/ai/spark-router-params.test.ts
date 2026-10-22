import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Un endpoint de OpenAI con un GPT que razona: rechaza `temperature` mientras el
// razonamiento está activo, como dice su guía de migración.
const OPENAI = 'https://api.openai.com/v1'
let model = 'gpt-6-luna'
let effort = 'low'

vi.mock('../../src/modules/settings/settings.service.js', () => ({
  getAiSettings: async () => ({
    text: { baseUrl: OPENAI, apiKey: 'sk-prueba', model, reasoningEffort: effort },
    image: { baseUrl: OPENAI, apiKey: 'sk-prueba', model: 'sin-imagenes' },
  }),
}))

const { SparkRouterProvider, chatBody, learnRejectedParam } = await import(
  '../../src/modules/ai/providers/spark-router.js'
)

function okResponse(text: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: { message, type: 'invalid_request_error' } }), {
    status: 400,
  })
}

describe('parámetros opcionales que un endpoint rechaza', () => {
  const bodies: Record<string, unknown>[] = []

  beforeEach(() => {
    bodies.length = 0
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('con un GPT de OpenAI deja de mandar temperature y sigue pidiendo el razonamiento en low', async () => {
    model = 'gpt-6-luna'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).endsWith('/health')) return new Response('', { status: 404 })
        const body = JSON.parse(String(init?.body))
        bodies.push(body)
        return 'temperature' in body
          ? badRequest("Unsupported parameter: 'temperature' is not supported with this model.")
          : okResponse('Hola')
      })
    )

    const provider = new SparkRouterProvider()
    await expect(provider.generateText('Saluda')).resolves.toBe('Hola')
    expect(bodies).toHaveLength(2)
    expect(bodies[1]).toMatchObject({ model: 'gpt-6-luna', reasoning_effort: 'low' })
    expect(bodies[1]).not.toHaveProperty('temperature')

    // Se recuerda: la siguiente petición ya sale bien a la primera.
    await expect(provider.generateText('Otra vez')).resolves.toBe('Hola')
    expect(bodies).toHaveLength(3)
    expect(bodies[2]).not.toHaveProperty('temperature')
  })

  it('un endpoint que no conoce reasoning_effort lo deja de recibir y conserva la temperatura', () => {
    const base = 'http://otro-endpoint:8000'
    expect(learnRejectedParam(base, 'gemma', 'low', "Unknown field 'reasoning_effort'")).toBe(true)
    const body = JSON.parse(chatBody(base, 'gemma', 'low', 'Hola', undefined, false))
    expect(body).not.toHaveProperty('reasoning_effort')
    expect(body.temperature).toBe(0.7)
  })

  it('un 400 que no nombra ningún parámetro quita el razonamiento, como antes, y después ya no reintenta', () => {
    const base = 'http://antiguo:8000'
    expect(learnRejectedParam(base, 'glm', 'low', 'Bad Request')).toBe(true)
    expect(learnRejectedParam(base, 'glm', 'low', 'Bad Request')).toBe(false)
  })

  it('lo aprendido es por endpoint y modelo: otro modelo del mismo endpoint sigue con todo', () => {
    learnRejectedParam(OPENAI, 'gpt-6-luna', 'low', "'temperature' is not supported")
    const body = JSON.parse(chatBody(OPENAI, 'otro-modelo', 'low', 'Hola', undefined, false))
    expect(body.temperature).toBe(0.7)
    expect(body.reasoning_effort).toBe('low')
  })

  it('manda el nivel de razonamiento elegido en el panel; con «off» no lo manda', () => {
    const medium = JSON.parse(chatBody('http://glm:8000', 'glm-5', 'medium', 'Hola', undefined, false))
    expect(medium.reasoning_effort).toBe('medium')
    const off = JSON.parse(chatBody('http://glm:8000', 'glm-5', 'off', 'Hola', undefined, false))
    expect(off).not.toHaveProperty('reasoning_effort')
    expect(off.temperature).toBe(0.7)
  })
})
