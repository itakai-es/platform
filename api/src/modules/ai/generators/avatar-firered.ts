import { randomUUID } from 'crypto'
import { getAiSettings } from '../../settings/settings.service.js'
import { saveUpload } from '../../storage/storage.service.js'

const DEFAULT_BASE_URL = 'http://localhost:8000'
const DEFAULT_API_KEY = 'local-testing-key'
const AVATAR_TIMEOUT_MS = 120_000

export interface FireRedAvatarRequest {
  avatar_id: string
  wardrobe_prompt: string
  background_prompt: string
  background_model?: string
  size?: string
  avatar_steps?: number
  avatar_seed?: number
  avatar_negative_prompt?: string
  background_steps?: number
  background_seed?: number
  background_negative_prompt?: string
}

interface FireRedAvatarResponse {
  data?: Array<{ url?: string }>
}

const AVATAR_ID_ALIASES: Record<string, string> = {
  odisseu: 'odiseo',
  polifem: 'polifemo',
  posido: 'poseidon',
  peseidon: 'poseidon',
}

function normalizeAvatarId(avatarId: string) {
  return AVATAR_ID_ALIASES[avatarId] ?? avatarId
}

async function getSparkConfig() {
  // Los avatares son imágenes → usan el endpoint de imágenes configurado.
  const { image } = await getAiSettings()
  const baseUrl = (image.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  const apiKey = image.apiKey || DEFAULT_API_KEY
  return { baseUrl, apiKey }
}

function inferExtension(contentType: string | null, url: string): string {
  if (contentType?.includes('jpeg') || contentType?.includes('jpg') || /\.jpe?g(?:$|\?)/i.test(url)) {
    return 'jpg'
  }
  if (contentType?.includes('webp') || /\.webp(?:$|\?)/i.test(url)) {
    return 'webp'
  }
  return 'png'
}

export async function generateFireRedAvatar(req: FireRedAvatarRequest): Promise<{ fileUrl: string }> {
  const { baseUrl, apiKey } = await getSparkConfig()
  const avatarId = normalizeAvatarId(req.avatar_id)

  // Only send defined fields to the API
  const body: Record<string, unknown> = {
    avatar_id: avatarId,
    wardrobe_prompt: req.wardrobe_prompt,
    background_prompt: req.background_prompt,
  }
  if (req.background_model) body.background_model = req.background_model
  if (req.size) body.size = req.size
  if (req.avatar_steps != null) body.avatar_steps = req.avatar_steps
  if (req.avatar_seed != null) body.avatar_seed = req.avatar_seed
  if (req.avatar_negative_prompt) body.avatar_negative_prompt = req.avatar_negative_prompt
  if (req.background_steps != null) body.background_steps = req.background_steps
  if (req.background_seed != null) body.background_seed = req.background_seed
  if (req.background_negative_prompt) body.background_negative_prompt = req.background_negative_prompt

  if (avatarId !== req.avatar_id) {
    console.log(`[AI] 🎨 Avatar id alias → SparkRouter: ${req.avatar_id} → ${avatarId}`)
  }
  console.log(`[AI] 🎨 Avatar request → SparkRouter (avatar_id: ${avatarId})`)
  console.log(`[AI] 🎨 Avatar wardrobe_prompt → SparkRouter:\n${req.wardrobe_prompt}`)
  console.log(`[AI] 🎨 Avatar background_prompt → SparkRouter:\n${req.background_prompt}`)

  const response = await fetch(`${baseUrl}/v1/images/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error(`[AI] ❌ Avatar generation failed: ${response.status} ${detail}`)
    throw new Error(`FireRed avatar error ${response.status}: ${detail || response.statusText}`)
  }

  const payload = (await response.json()) as FireRedAvatarResponse
  const rawUrl = payload.data?.[0]?.url
  if (!rawUrl) {
    throw new Error('FireRed did not return an image URL')
  }

  const imageUrl = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, `${baseUrl}/`).toString()

  const imageResponse = await fetch(imageUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS),
  })

  if (!imageResponse.ok) {
    const detail = await imageResponse.text().catch(() => '')
    throw new Error(`FireRed image download ${imageResponse.status}: ${detail || imageResponse.statusText}`)
  }

  const mimeType = imageResponse.headers.get('content-type') || 'image/png'
  const extension = inferExtension(mimeType, imageUrl)
  const buffer = Buffer.from(await imageResponse.arrayBuffer())

  const fileName = `avatar-${randomUUID()}.${extension}`
  const fileUrl = await saveUpload(`ai-generated/avatars/${fileName}`, buffer, mimeType)

  console.log(`[AI] ✅ Avatar generated via SparkRouter (avatar_id: ${avatarId}, ${(buffer.byteLength / 1024).toFixed(0)}KB)`)
  return { fileUrl }
}
