// @ts-expect-error - pdf-parse v1 se importa por la ruta lib para evitar su
// "debug harness" (que en ESM intenta leer un PDF de test y peta). No trae tipos.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAiSettings } from '../settings/settings.service.js'

/**
 * Extrae texto de los materiales que sube el profesor (PDF, Word, texto plano)
 * y describe las imágenes con un modelo de visión (endpoint OpenAI-compatible).
 * El texto resultante se usa como CONTEXTO para que la IA genere la clase.
 */

const MAX_CHARS_PER_FILE = 8000
const MAX_CHARS_TOTAL = 12000
const VISION_TIMEOUT_MS = 60_000

export interface ExtractedSource {
  name: string
  kind: 'pdf' | 'word' | 'text' | 'image' | 'unsupported'
  chars: number
  note?: string
}

export interface UploadedFile {
  buffer: Buffer
  filename: string
  mimetype: string
}

function clean(text: string, max: number): string {
  const t = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return t.length > max ? t.slice(0, max).trimEnd() + '…' : t
}

const VISION_PROMPT =
  'Eres un asistente educativo. Describe de forma concisa (máx. 120 palabras) el contenido de esta imagen para usarla como material de contexto de una clase: qué muestra, temas y texto visible relevante.'

// (1) Visión vía el endpoint OpenAI-compatible configurado (gpt-4o, Spark, etc.).
async function describeImageOpenAI(buffer: Buffer, mimeType: string): Promise<string> {
  const { text } = await getAiSettings()
  const baseUrl = (text.baseUrl || '').replace(/\/+$/, '')
  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${text.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: text.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
  })

  if (!res.ok) throw new Error(`vision ${res.status}`)
  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
  const out = payload.choices?.[0]?.message?.content?.trim() || ''
  if (!out) throw new Error('vision empty')
  return out
}

// (2) Fallback a Gemini (multimodal), usando GOOGLE_API_KEY — igual que el
// proveedor de respaldo de texto. Hace que las imágenes funcionen aunque el
// endpoint principal no soporte visión.
async function describeImageGemini(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('no gemini key')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash' })
  const result = await model.generateContent([
    { text: VISION_PROMPT },
    { inlineData: { mimeType, data: buffer.toString('base64') } },
  ])
  return (result.response.text() || '').trim()
}

async function describeImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    return await describeImageOpenAI(buffer, mimeType)
  } catch {
    // El endpoint principal no soporta visión o no responde → probamos Gemini.
    return await describeImageGemini(buffer, mimeType)
  }
}

async function extractOne(file: UploadedFile): Promise<{ text: string; source: ExtractedSource }> {
  const name = file.filename || 'archivo'
  const lower = name.toLowerCase()
  const mime = file.mimetype || ''

  try {
    if (mime === 'application/pdf' || lower.endsWith('.pdf')) {
      const data = (await pdfParse(file.buffer)) as { text?: string }
      const text = clean(data.text || '', MAX_CHARS_PER_FILE)
      return { text, source: { name, kind: 'pdf', chars: text.length } }
    }

    if (mime.includes('word') || mime.includes('officedocument.wordprocessing') || lower.endsWith('.docx')) {
      const res = await mammoth.extractRawText({ buffer: file.buffer })
      const text = clean(res.value || '', MAX_CHARS_PER_FILE)
      return { text, source: { name, kind: 'word', chars: text.length } }
    }

    if (mime.startsWith('text/') || /\.(txt|md|csv)$/.test(lower)) {
      const text = clean(file.buffer.toString('utf-8'), MAX_CHARS_PER_FILE)
      return { text, source: { name, kind: 'text', chars: text.length } }
    }

    if (mime.startsWith('image/')) {
      try {
        const text = clean(await describeImage(file.buffer, mime), MAX_CHARS_PER_FILE)
        return { text, source: { name, kind: 'image', chars: text.length } }
      } catch {
        return {
          text: '',
          source: { name, kind: 'image', chars: 0, note: 'no se pudo interpretar (el modelo de IA no soporta visión)' },
        }
      }
    }

    return { text: '', source: { name, kind: 'unsupported', chars: 0, note: 'formato no soportado' } }
  } catch {
    return { text: '', source: { name, kind: 'unsupported', chars: 0, note: 'no se pudo extraer el texto' } }
  }
}

/**
 * Extrae y combina el contexto de varios ficheros. Devuelve el texto (capado)
 * y un resumen por fichero para mostrar en la UI.
 */
export async function extractContext(
  files: UploadedFile[]
): Promise<{ context: string; sources: ExtractedSource[] }> {
  const results = await Promise.all(files.map(extractOne))

  const parts: string[] = []
  const sources: ExtractedSource[] = []
  for (const r of results) {
    sources.push(r.source)
    if (r.text) parts.push(`### ${r.source.name}\n${r.text}`)
  }

  const combined = parts.join('\n\n')
  const context =
    combined.length > MAX_CHARS_TOTAL ? combined.slice(0, MAX_CHARS_TOTAL).trimEnd() + '…' : combined

  return { context, sources }
}
