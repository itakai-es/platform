import { randomUUID } from 'crypto'
import type { AIProvider } from '../providers/provider.interface.js'
import { buildCinematicCoverPrompt, generateSceneDescription } from './cover-prompt.js'
import { saveUpload } from '../../storage/storage.service.js'

export interface ImageGenerationRequest {
  prompt: string
  locale: string
  type: 'narratives' | 'badges' | 'avatars' | 'covers'
}

export async function generateImage(provider: AIProvider, request: ImageGenerationRequest) {
  let finalPrompt = request.prompt
  if (request.type === 'covers') {
    const scene = await generateSceneDescription(provider, request.prompt)
    finalPrompt = buildCinematicCoverPrompt(scene)
    console.log(`[AI] 🎨 Cover scene description: ${scene}`)
    console.log(`[AI] 🎨 Cover final prompt sent to provider:\n${finalPrompt}`)
  }

  const result = await provider.generateImage(finalPrompt, {
    locale: request.locale,
    type: request.type,
  })

  const fileName = `${request.type}-${randomUUID()}.${result.extension}`
  const fileUrl = await saveUpload(
    `ai-generated/${request.type}/${fileName}`,
    result.buffer,
    result.mimeType
  )

  return {
    fileName,
    fileUrl,
    mimeType: result.mimeType,
  }
}
