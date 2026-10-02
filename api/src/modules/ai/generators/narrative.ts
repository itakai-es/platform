import type { AIProvider } from '../providers/provider.interface.js'
import { INCLUSIVE_LANGUAGE_ES } from '../prompts/index.js'

export interface NarrativeRequest {
  prompt: string
  locale: string
  className?: string
}

const MD_RULES_EN = 'FORMAT: Return well-structured markdown. Use blank lines between paragraphs. Use "# " for main title, "## " for sections. Use "- " for bullet lists, "1. " for numbered lists. Use **bold** and *italic*. Always separate blocks with double line breaks.'
const MD_RULES_ES = 'FORMATO: Devuelve markdown bien estructurado. Usa lineas en blanco entre parrafos. Usa "# " para titulo principal, "## " para secciones. Usa "- " para listas, "1. " para listas numeradas. Usa **negrita** y *cursiva*. Siempre separa bloques con doble salto de linea.'

export async function generateNarrative(provider: AIProvider, request: NarrativeRequest) {
  const locale = request.locale.toLowerCase().startsWith('en') ? 'en' : 'es'
  const systemPrompt = locale === 'en'
    ? `You are Atenea, an educational design assistant for teachers. Return practical classroom narrative content. ${MD_RULES_EN}`
    : `Eres Atenea, una asistente de diseño educativo para profesorado. Devuelve contenido narrativo práctico para clase. ${MD_RULES_ES} ${INCLUSIVE_LANGUAGE_ES}`

  const enrichedPrompt = request.className
    ? `${request.prompt}\n\nClase actual: ${request.className}`
    : request.prompt

  const text = await provider.generateText(enrichedPrompt, {
    locale,
    systemPrompt,
    temperature: 0.7,
  })

  return {
    text,
  }
}

export function streamNarrative(provider: AIProvider, request: NarrativeRequest) {
  const locale = request.locale.toLowerCase().startsWith('en') ? 'en' : 'es'
  const systemPrompt = locale === 'en'
    ? `You are Atenea, an educational design assistant for teachers. Return practical classroom narrative content. ${MD_RULES_EN}`
    : `Eres Atenea, una asistente de diseño educativo para profesorado. Devuelve contenido narrativo práctico para clase. ${MD_RULES_ES} ${INCLUSIVE_LANGUAGE_ES}`

  const enrichedPrompt = request.className
    ? `${request.prompt}\n\nClase actual: ${request.className}`
    : request.prompt

  return provider.generateTextStream(enrichedPrompt, {
    locale,
    systemPrompt,
    temperature: 0.7,
  })
}
